using System;
using UnityEngine;
using VanGioi.Utils;

namespace VanGioi.World
{
    [Serializable]
    public class TerrainGenerationSettings
    {
        [Header("Kích thước")]
        [Tooltip("Cạnh địa hình (m). Prototype: 500 × 500 m.")]
        public float size = 500f;
        [Tooltip("Độ cao tối đa (m).")]
        public float maxHeight = 160f;
        [Tooltip("Độ phân giải heightmap: 2^n + 1 (257, 513, 1025).")]
        public int heightmapResolution = 513;
        [Tooltip("Độ phân giải splatmap (texture lớp đất).")]
        public int alphamapResolution = 256;
        public int seed = 20261020;

        [Header("Tàn Lão Thôn (khu khởi đầu, giữa bản đồ)")]
        public Vector2 villageCenter = new Vector2(250f, 250f);
        public float villageRadius = 45f;
        public float villageHeight = 18f;

        [Header("Sông & hồ")]
        public float waterLevel = 9f;
        public float riverBaseX = 345f;
        public float riverWidth = 9f;
        public Vector2 lakeCenter = new Vector2(125f, 365f);
        public float lakeRadius = 40f;

        [Header("Cây & đá")]
        public int treeCount = 900;
        public int rockCount = 260;
    }

    /// <summary>
    /// Sinh địa hình 500 × 500 m bằng nhiễu Perlin nhiều tầng:
    /// đồi thấp ở giữa, vòng núi cao quanh rìa (ranh giới tự nhiên), một con sông uốn khúc
    /// chảy qua hẻm núi, một hồ ở phía tây, và nền làng phẳng ở trung tâm.
    /// Sau đó tô 5 lớp đất (cỏ, đất, đá, cát, tuyết) theo độ cao và độ dốc.
    /// </summary>
    public static class ProceduralTerrainGenerator
    {
        public const int LayerGrass = 0, LayerDirt = 1, LayerRock = 2, LayerSand = 3, LayerSnow = 4;

        public static Terrain Generate(TerrainGenerationSettings s, Transform parent = null)
        {
            var data = new TerrainData { name = "TD_VanGioi_Prototype" };
            // Thứ tự quan trọng: đặt resolution TRƯỚC size.
            data.heightmapResolution = s.heightmapResolution;
            data.alphamapResolution = s.alphamapResolution;
            data.baseMapResolution = 512;
            data.SetDetailResolution(256, 16);
            data.size = new Vector3(s.size, s.maxHeight, s.size);

            var noise = new NoiseField(s.seed);
            int res = data.heightmapResolution;
            var heights = new float[res, res];
            for (int z = 0; z < res; z++)
            {
                for (int x = 0; x < res; x++)
                {
                    float wx = (float)x / (res - 1) * s.size;
                    float wz = (float)z / (res - 1) * s.size;
                    heights[z, x] = Mathf.Clamp01(SampleHeightMeters(s, noise, wx, wz) / s.maxHeight);
                }
            }
            data.SetHeights(0, 0, heights);

            data.terrainLayers = CreateLayers(s.seed);
            PaintSplatmap(s, data, noise);

            var go = Terrain.CreateTerrainGameObject(data);
            go.name = "Terrain_TanLaoThon";
            if (parent != null) go.transform.SetParent(parent, false);
            go.transform.position = Vector3.zero;

            var terrain = go.GetComponent<Terrain>();
            terrain.drawInstanced = true;           // GPU instancing cho terrain
            terrain.heightmapPixelError = 4f;
            terrain.basemapDistance = 400f;
            terrain.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            var mat = MaterialFactory.TerrainMaterial();
            if (mat != null) terrain.materialTemplate = mat;
            return terrain;
        }

        /// <summary>Độ cao (m) tại toạ độ thế giới (x, z). Dùng chung cho sinh terrain và đặt vật thể.</summary>
        public static float SampleHeightMeters(TerrainGenerationSettings s, NoiseField n, float x, float z)
        {
            // Đồi thấp.
            float hills = n.Fbm(x * 0.006f, z * 0.006f, 4) * 14f;
            float h = 11f + hills;

            // Vòng núi quanh rìa: trộn khoảng cách tròn + vuông, rìa gồ ghề bằng nhiễu.
            float cx = (x / s.size - 0.5f) * 2f, cz = (z / s.size - 0.5f) * 2f;
            float r = Mathf.Lerp(Mathf.Sqrt(cx * cx + cz * cz), Mathf.Max(Mathf.Abs(cx), Mathf.Abs(cz)), 0.5f);
            r += (n.Fbm(x * 0.01f + 31f, z * 0.01f + 17f, 3) - 0.5f) * 0.25f;
            float ring = ObjectUtil.SmoothStep01(0.62f, 1.0f, r);
            float ridged = n.Ridged(x * 0.009f, z * 0.009f, 5);
            h += ring * (35f + ridged * 95f);

            // Một ngọn tiên sơn đơn độc ở đông bắc.
            float peak = Gaussian(x, z, s.size * 0.74f, s.size * 0.76f, 38f);
            h += peak * (55f + ridged * 10f);

            // Sông uốn khúc bắc → nam, khoét lòng sông và bờ thoải.
            float riverX = RiverCenterX(s, z);
            float d = Mathf.Abs(x - riverX);
            float riverMask = 1f - ObjectUtil.SmoothStep01(s.riverWidth, s.riverWidth + 24f, d);
            float bed = s.waterLevel - 2.5f - (1f - Mathf.Clamp01(d / s.riverWidth)) * 1.5f;
            h = Mathf.Lerp(h, bed, riverMask);

            // Hồ phía tây.
            float ld = Vector2.Distance(new Vector2(x, z), s.lakeCenter) + (n.Fbm(x * 0.03f, z * 0.03f, 2) - 0.5f) * 18f;
            float lakeMask = 1f - ObjectUtil.SmoothStep01(s.lakeRadius * 0.7f, s.lakeRadius * 1.6f, ld);
            float lakeBed = s.waterLevel - 6f * (1f - Mathf.Clamp01(ld / s.lakeRadius));
            h = Mathf.Lerp(h, Mathf.Min(h, lakeBed), lakeMask);

            // Nền làng phẳng (Tàn Lão Thôn).
            float vd = Vector2.Distance(new Vector2(x, z), s.villageCenter);
            float villageMask = 1f - ObjectUtil.SmoothStep01(s.villageRadius * 0.75f, s.villageRadius * 1.5f, vd);
            h = Mathf.Lerp(h, s.villageHeight, villageMask);

            return Mathf.Clamp(h, 0f, s.maxHeight);
        }

        public static float RiverCenterX(TerrainGenerationSettings s, float z)
            => s.riverBaseX + Mathf.Sin(z * 0.011f) * 45f + Mathf.Sin(z * 0.027f + 1.3f) * 15f;

        static float Gaussian(float x, float z, float cx, float cz, float sigma)
        {
            float dx = x - cx, dz = z - cz;
            return Mathf.Exp(-(dx * dx + dz * dz) / (2f * sigma * sigma));
        }

        static TerrainLayer[] CreateLayers(int seed)
        {
            return new[]
            {
                Layer("TL_Grass", ProceduralTextures.TileableNoise("T_Grass", 256, new Color(0.20f, 0.31f, 0.12f), new Color(0.36f, 0.48f, 0.20f), 0.05f, seed + 1, 1.4f), 6f, 0.05f),
                Layer("TL_Dirt", ProceduralTextures.TileableNoise("T_Dirt", 256, new Color(0.30f, 0.23f, 0.16f), new Color(0.50f, 0.41f, 0.29f), 0.07f, seed + 2, 1.2f), 5f, 0.08f),
                Layer("TL_Rock", ProceduralTextures.TileableNoise("T_Rock", 256, new Color(0.25f, 0.25f, 0.27f), new Color(0.52f, 0.50f, 0.48f), 0.03f, seed + 3, 1.8f, 5), 12f, 0.2f),
                Layer("TL_Sand", ProceduralTextures.TileableNoise("T_Sand", 256, new Color(0.48f, 0.43f, 0.32f), new Color(0.66f, 0.60f, 0.46f), 0.09f, seed + 4, 0.8f), 4f, 0.1f),
                Layer("TL_Snow", ProceduralTextures.TileableNoise("T_Snow", 256, new Color(0.80f, 0.83f, 0.88f), new Color(0.97f, 0.98f, 1f), 0.04f, seed + 5, 0.6f), 10f, 0.45f),
            };
        }

        static TerrainLayer Layer(string name, Texture2D tex, float tile, float smoothness)
        {
            return new TerrainLayer
            {
                name = name,
                diffuseTexture = tex,
                tileSize = new Vector2(tile, tile),
                smoothness = smoothness,
                metallic = 0f
            };
        }

        static void PaintSplatmap(TerrainGenerationSettings s, TerrainData data, NoiseField n)
        {
            int res = data.alphamapResolution;
            int layers = data.terrainLayers.Length;
            var maps = new float[res, res, layers];
            var w = new float[layers];

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float u = (float)x / (res - 1), v = (float)y / (res - 1);
                    float h = data.GetInterpolatedHeight(u, v);
                    float steep = data.GetSteepness(u, v);
                    float wx = u * s.size, wz = v * s.size;

                    float vd = Vector2.Distance(new Vector2(wx, wz), s.villageCenter);
                    float patch = ObjectUtil.SmoothStep01(0.6f, 0.75f, n.Fbm(wx * 0.02f + 70f, wz * 0.02f + 11f, 3));
                    float dirt = Mathf.Max((1f - ObjectUtil.SmoothStep01(s.villageRadius * 0.45f, s.villageRadius * 0.9f, vd)) * 0.85f, patch * 0.6f);
                    float sand = 1f - ObjectUtil.SmoothStep01(s.waterLevel + 0.4f, s.waterLevel + 2.5f, h);
                    float rock = ObjectUtil.SmoothStep01(26f, 38f, steep);
                    float snow = ObjectUtil.SmoothStep01(108f, 128f, h) * (1f - ObjectUtil.SmoothStep01(38f, 52f, steep));

                    Array.Clear(w, 0, layers);
                    w[LayerGrass] = 1f;
                    Blend(w, LayerDirt, dirt);
                    Blend(w, LayerSand, sand);
                    Blend(w, LayerRock, rock);
                    Blend(w, LayerSnow, snow);
                    for (int l = 0; l < layers; l++) maps[y, x, l] = w[l];
                }
            }
            data.SetAlphamaps(0, 0, maps);
        }

        static void Blend(float[] w, int layer, float amount)
        {
            amount = Mathf.Clamp01(amount);
            for (int i = 0; i < w.Length; i++) w[i] *= 1f - amount;
            w[layer] += amount;
        }
    }

    /// <summary>Nhiễu Perlin có seed (Mathf.PerlinNoise + offset).</summary>
    public sealed class NoiseField
    {
        readonly float ox, oz;

        public NoiseField(int seed)
        {
            var rng = new System.Random(seed);
            ox = (float)rng.NextDouble() * 2000f + 100f;
            oz = (float)rng.NextDouble() * 2000f + 100f;
        }

        public float Fbm(float x, float z, int octaves)
        {
            float sum = 0f, amp = 0.5f, freq = 1f, norm = 0f;
            for (int i = 0; i < octaves; i++)
            {
                sum += amp * Mathf.PerlinNoise(x * freq + ox, z * freq + oz);
                norm += amp;
                amp *= 0.5f;
                freq *= 2.03f;
            }
            return sum / norm;
        }

        public float Ridged(float x, float z, int octaves)
        {
            float sum = 0f, amp = 0.5f, freq = 1f, norm = 0f;
            for (int i = 0; i < octaves; i++)
            {
                float v = 1f - Mathf.Abs(Mathf.PerlinNoise(x * freq + ox * 0.7f, z * freq + oz * 1.3f) * 2f - 1f);
                sum += amp * v * v;
                norm += amp;
                amp *= 0.5f;
                freq *= 2.1f;
            }
            return sum / norm;
        }
    }
}
