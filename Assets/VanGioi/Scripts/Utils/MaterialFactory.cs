using UnityEngine;
using UnityEngine.Rendering;

namespace VanGioi.Utils
{
    /// <summary>
    /// Tạo vật liệu placeholder chạy được cả trên URP lẫn Built-in.
    /// Không tham chiếu trực tiếp assembly URP nên dự án vẫn biên dịch khi chưa cài URP.
    /// </summary>
    public static class MaterialFactory
    {
        public const string UrpLit = "Universal Render Pipeline/Lit";
        public const string UrpTerrainLit = "Universal Render Pipeline/Terrain/Lit";

        public static bool IsUrpActive
        {
            get
            {
                var rp = GraphicsSettings.currentRenderPipeline;
                return rp != null && rp.GetType().Name.Contains("Universal");
            }
        }

        static Shader LitShader()
        {
            if (IsUrpActive)
            {
                var urp = Shader.Find(UrpLit);
                if (urp != null) return urp;
            }
            return Shader.Find("Standard");
        }

        /// <summary>Vật liệu PBR đục (opaque).</summary>
        public static Material Lit(string name, Color color, float smoothness = 0.2f, float metallic = 0f,
            Texture2D albedo = null, Vector2? tiling = null)
        {
            var mat = new Material(LitShader()) { name = name, enableInstancing = true };
            SetColor(mat, color);
            if (albedo != null)
            {
                if (mat.HasProperty("_BaseMap")) mat.SetTexture("_BaseMap", albedo);
                if (mat.HasProperty("_MainTex")) mat.SetTexture("_MainTex", albedo);
                if (tiling.HasValue)
                {
                    if (mat.HasProperty("_BaseMap")) mat.SetTextureScale("_BaseMap", tiling.Value);
                    if (mat.HasProperty("_MainTex")) mat.SetTextureScale("_MainTex", tiling.Value);
                }
            }
            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", smoothness);
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metallic);
            return mat;
        }

        /// <summary>Vật liệu trong suốt (nước, kết giới...).</summary>
        public static Material Transparent(string name, Color color, float smoothness = 0.9f)
        {
            var mat = Lit(name, color, smoothness);
            if (IsUrpActive && mat.HasProperty("_Surface"))
            {
                mat.SetFloat("_Surface", 1f); // Transparent
                mat.SetFloat("_Blend", 0f);   // Alpha
                mat.SetOverrideTag("RenderType", "Transparent");
                mat.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
                mat.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
                if (mat.HasProperty("_SrcBlendAlpha")) mat.SetFloat("_SrcBlendAlpha", (float)BlendMode.One);
                if (mat.HasProperty("_DstBlendAlpha")) mat.SetFloat("_DstBlendAlpha", (float)BlendMode.OneMinusSrcAlpha);
                mat.SetFloat("_ZWrite", 0f);
                mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                mat.DisableKeyword("_ALPHATEST_ON");
            }
            else if (mat.HasProperty("_Mode"))
            {
                mat.SetFloat("_Mode", 3f); // Standard shader: Transparent
                mat.SetOverrideTag("RenderType", "Transparent");
                mat.SetInt("_SrcBlend", (int)BlendMode.One);
                mat.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                mat.SetInt("_ZWrite", 0);
                mat.DisableKeyword("_ALPHATEST_ON");
                mat.DisableKeyword("_ALPHABLEND_ON");
                mat.EnableKeyword("_ALPHAPREMULTIPLY_ON");
            }
            mat.renderQueue = (int)RenderQueue.Transparent;
            return mat;
        }

        /// <summary>
        /// Vật liệu không chiếu sáng, trong suốt, dùng màu đỉnh (vertex color) – cho vệt kiếm,
        /// tia lửa, vệt khí. "Sprites/Default" chạy được trên cả URP lẫn Built-in.
        /// </summary>
        public static Material UnlitTransparent(string name, Color color, Texture texture = null)
        {
            var shader = Shader.Find("Sprites/Default");
            if (shader == null) shader = Shader.Find("Unlit/Transparent");
            var mat = new Material(shader) { name = name };
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            if (texture != null) mat.mainTexture = texture;
            return mat;
        }

        /// <summary>Vật liệu terrain. Trả về null với Built-in (Unity tự dùng vật liệu mặc định).</summary>
        public static Material TerrainMaterial()
        {
            if (!IsUrpActive) return null;
            var shader = Shader.Find(UrpTerrainLit);
            return shader != null ? new Material(shader) { name = "M_Terrain_URP" } : null;
        }

        /// <summary>Bầu trời procedural (hoạt động trên cả URP và Built-in).</summary>
        public static Material ProceduralSkybox()
        {
            var shader = Shader.Find("Skybox/Procedural");
            if (shader == null) return null;
            var mat = new Material(shader) { name = "M_Sky_Procedural" };
            mat.SetFloat("_SunSize", 0.035f);
            mat.SetFloat("_SunSizeConvergence", 6f);
            mat.SetFloat("_AtmosphereThickness", 0.85f);
            mat.SetColor("_SkyTint", new Color(0.55f, 0.62f, 0.75f));
            mat.SetColor("_GroundColor", new Color(0.38f, 0.37f, 0.35f));
            mat.SetFloat("_Exposure", 1.25f);
            return mat;
        }

        public static void SetColor(Material mat, Color color)
        {
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
        }
    }
}
