using UnityEngine;

namespace VanGioi.Utils
{
    /// <summary>
    /// Sinh texture placeholder (tileable) bằng code để không phụ thuộc tài nguyên có sẵn.
    /// Khi có texture thật, chỉ cần thay TerrainLayer / Material trong thư mục Generated.
    /// </summary>
    public static class ProceduralTextures
    {
        /// <summary>Texture nhiễu 2 màu, lặp liền mạch (seamless).</summary>
        public static Texture2D TileableNoise(string name, int size, Color dark, Color light,
            float frequency, int seed, float contrast = 1f, int octaves = 4)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, true)
            {
                name = name,
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear,
                anisoLevel = 4
            };
            var rng = new System.Random(seed);
            float ox = (float)rng.NextDouble() * 500f;
            float oy = (float)rng.NextDouble() * 500f;
            var pixels = new Color[size * size];

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float n = SeamlessFbm(x, y, size, frequency, ox, oy, octaves);
                    n = Mathf.Clamp01((n - 0.5f) * contrast + 0.5f);
                    // Hạt li ti để bề mặt bớt "nhựa".
                    float grain = (float)rng.NextDouble() * 0.08f - 0.04f;
                    var c = Color.Lerp(dark, light, n);
                    pixels[y * size + x] = new Color(c.r + grain, c.g + grain, c.b + grain, 1f);
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(true);
            return tex;
        }

        static float SeamlessFbm(int x, int y, int size, float frequency, float ox, float oy, int octaves)
        {
            // Trộn 4 mẫu nhiễu dịch chu kỳ để texture lặp không có đường nối.
            float u = (float)x / size, v = (float)y / size;
            float a = Fbm(x, y, frequency, ox, oy, octaves);
            float b = Fbm(x - size, y, frequency, ox, oy, octaves);
            float c = Fbm(x, y - size, frequency, ox, oy, octaves);
            float d = Fbm(x - size, y - size, frequency, ox, oy, octaves);
            return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
        }

        static float Fbm(float x, float y, float frequency, float ox, float oy, int octaves)
        {
            float sum = 0f, amp = 0.5f, norm = 0f, f = frequency;
            for (int i = 0; i < octaves; i++)
            {
                sum += amp * Mathf.PerlinNoise(x * f + ox, y * f + oy);
                norm += amp;
                amp *= 0.5f;
                f *= 2f;
            }
            return sum / norm;
        }

        /// <summary>Sprite hình tròn (hoặc vành tròn) cho joystick / nút cảm ứng.</summary>
        public static Sprite CircleSprite(int size, float ringThickness01 = 0f)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false)
            {
                name = ringThickness01 > 0 ? "T_UI_Ring" : "T_UI_Circle",
                wrapMode = TextureWrapMode.Clamp,
                filterMode = FilterMode.Bilinear
            };
            float r = size * 0.5f;
            float inner = r * (1f - ringThickness01);
            var pixels = new Color[size * size];
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(r, r));
                    float outerA = Mathf.Clamp01(r - d);                          // khử răng cưa mép ngoài
                    float innerA = ringThickness01 > 0 ? Mathf.Clamp01(d - inner) : 1f;
                    pixels[y * size + x] = new Color(1, 1, 1, outerA * innerA);
                }
            }
            tex.SetPixels(pixels);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f);
        }
    }
}
