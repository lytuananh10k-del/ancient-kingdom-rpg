using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;

namespace VanGioi.Core
{
    public enum GraphicsTier { Low = 0, Medium = 1, High = 2 }

    /// <summary>
    /// Ba mức đồ hoạ Low / Medium / High. Điều chỉnh: render scale, khoảng cách bóng,
    /// MSAA (URP), LOD bias, sai số địa hình, khoảng nhìn camera và sương mù.
    ///
    /// Các thuộc tính của URP Asset được đặt qua reflection để code không phụ thuộc assembly URP.
    /// Vì URP Asset là asset dùng chung, giá trị gốc được khôi phục khi thoát Play Mode.
    /// </summary>
    public class GraphicsQualityManager : MonoBehaviour
    {
        [Serializable]
        public struct TierSettings
        {
            [Range(0.5f, 1.5f)] public float renderScale;
            public float shadowDistance;
            [Tooltip("1, 2, 4 hoặc 8")] public int msaa;
            public float lodBias;
            [Tooltip("Sai số pixel của terrain – càng lớn càng nhẹ.")] public float terrainPixelError;
            public float terrainBasemapDistance;
            public float cameraFarClip;
            public float fogDensity;
        }

        const string PrefKey = "vg_graphics_tier";

        [SerializeField] GraphicsTier defaultDesktopTier = GraphicsTier.High;
        [SerializeField] GraphicsTier defaultMobileTier = GraphicsTier.Medium;

        [SerializeField] TierSettings low = new TierSettings
        {
            renderScale = 0.7f, shadowDistance = 35f, msaa = 1, lodBias = 0.6f,
            terrainPixelError = 12f, terrainBasemapDistance = 120f, cameraFarClip = 600f, fogDensity = 0.0042f
        };
        [SerializeField] TierSettings medium = new TierSettings
        {
            renderScale = 0.85f, shadowDistance = 70f, msaa = 2, lodBias = 1f,
            terrainPixelError = 6f, terrainBasemapDistance = 250f, cameraFarClip = 1000f, fogDensity = 0.0028f
        };
        [SerializeField] TierSettings high = new TierSettings
        {
            renderScale = 1f, shadowDistance = 140f, msaa = 4, lodBias = 1.6f,
            terrainPixelError = 3f, terrainBasemapDistance = 500f, cameraFarClip = 1500f, fogDensity = 0.0022f
        };

        public GraphicsTier CurrentTier { get; private set; }
        public event Action<GraphicsTier> TierChanged;

        readonly Dictionary<string, object> originalPipelineValues = new Dictionary<string, object>();
        RenderPipelineAsset pipelineAsset;

        void Start()
        {
            pipelineAsset = GraphicsSettings.currentRenderPipeline;
            var fallback = Application.isMobilePlatform ? defaultMobileTier : defaultDesktopTier;
            Apply((GraphicsTier)PlayerPrefs.GetInt(PrefKey, (int)fallback));
        }

        void OnDestroy() => RestorePipelineAsset();
        void OnApplicationQuit() => RestorePipelineAsset();

        public void Cycle() => Apply((GraphicsTier)(((int)CurrentTier + 1) % 3));

        public void Apply(GraphicsTier tier)
        {
            CurrentTier = tier;
            var s = tier == GraphicsTier.Low ? low : tier == GraphicsTier.Medium ? medium : high;

            SetPipelineProperty("renderScale", s.renderScale);
            SetPipelineProperty("shadowDistance", s.shadowDistance);
            SetPipelineProperty("msaaSampleCount", s.msaa);
            QualitySettings.shadowDistance = s.shadowDistance; // dùng khi chạy Built-in
            QualitySettings.lodBias = s.lodBias;

            foreach (var t in Terrain.activeTerrains)
            {
                t.heightmapPixelError = s.terrainPixelError;
                t.basemapDistance = s.terrainBasemapDistance;
            }

            var cam = Camera.main;
            if (cam != null) cam.farClipPlane = s.cameraFarClip;
            if (RenderSettings.fog) RenderSettings.fogDensity = s.fogDensity;

            PlayerPrefs.SetInt(PrefKey, (int)tier);
            TierChanged?.Invoke(tier);
        }

        void SetPipelineProperty(string name, object value)
        {
            if (pipelineAsset == null) return;
            var prop = pipelineAsset.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance);
            if (prop == null || !prop.CanWrite || !prop.CanRead) return;
            try
            {
                if (!originalPipelineValues.ContainsKey(name)) originalPipelineValues[name] = prop.GetValue(pipelineAsset);
                prop.SetValue(pipelineAsset, Convert.ChangeType(value, prop.PropertyType));
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Graphics] Không đặt được {name}: {e.Message}");
            }
        }

        void RestorePipelineAsset()
        {
            if (pipelineAsset == null) return;
            foreach (var kv in originalPipelineValues)
            {
                var prop = pipelineAsset.GetType().GetProperty(kv.Key, BindingFlags.Public | BindingFlags.Instance);
                if (prop != null && prop.CanWrite) prop.SetValue(pipelineAsset, kv.Value);
            }
            originalPipelineValues.Clear();
        }
    }
}
