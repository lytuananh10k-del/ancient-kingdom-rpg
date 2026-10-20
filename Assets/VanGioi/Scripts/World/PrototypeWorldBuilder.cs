using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using VanGioi.CameraSystem;
using VanGioi.Core;
using VanGioi.Input;
using VanGioi.Player;
using VanGioi.UI;
using VanGioi.Utils;

namespace VanGioi.World
{
    /// <summary>
    /// Dựng toàn bộ scene prototype Giai đoạn 1 bằng code:
    /// Systems (GameManager, Input, Graphics, HUD) → Môi trường (mặt trời, bầu trời, sương)
    /// → Địa hình → Làng Tàn Lão Thôn, cây, đá, nước, ranh giới → Nhân vật → Camera.
    ///
    /// Dùng được ở Edit Mode (menu "Vân Giới/…", sau đó lưu asset) lẫn Play Mode (PrototypeBootstrap).
    /// </summary>
    public static class PrototypeWorldBuilder
    {
        public sealed class Result
        {
            public GameObject Systems;
            public GameObject Environment;
            public Terrain Terrain;
            public GameObject Props;
            public PlayerController Player;
            public ThirdPersonCamera Camera;
            public Vector3 SpawnPoint;
            public float WaterLevel;
        }

        sealed class Mats
        {
            public Material Plaster, Wood, DarkWood, RoofTile, Stone, Water, Bark, Leaf, LeafDark, Pine, Crate, Lantern, Gold;
        }

        public static Result Build(TerrainGenerationSettings settings)
        {
            MeshFactory.ClearCache();
            var result = new Result { WaterLevel = settings.waterLevel };
            var mats = CreateMaterials(settings.seed);

            result.Systems = BuildSystems();
            result.Environment = BuildEnvironment();

            result.Terrain = ProceduralTerrainGenerator.Generate(settings);
            var terrain = result.Terrain;

            result.Props = new GameObject("World_Props");
            var rng = new System.Random(settings.seed);
            BuildWater(settings, result.Props.transform, mats);
            BuildBounds(settings, result.Props.transform);
            var center = new Vector3(settings.villageCenter.x, 0, settings.villageCenter.y);
            BuildVillage(terrain, center, result.Props.transform, mats);
            BuildTrees(settings, terrain, result.Props.transform, mats, rng);
            BuildRocks(settings, terrain, result.Props.transform, mats, rng);

            var spawn = center + new Vector3(0, 0, -20f);
            spawn.y = Height(terrain, spawn) + 0.1f;
            result.SpawnPoint = spawn;

            result.Player = BuildPlayer(spawn, Quaternion.identity);
            result.Camera = BuildCamera(result.Player.transform);
            result.Player.SetCameraTransform(result.Camera.transform);
            result.Player.SetRespawnPoint(spawn);
            return result;
        }

        // ------------------------------------------------------------------ Systems

        static GameObject BuildSystems()
        {
            var go = new GameObject("_Systems");
            go.AddComponent<GraphicsQualityManager>();
            go.AddComponent<DebugHUD>();
            var mobile = new GameObject("MobileInput").AddComponent<MobileInputController>();
            mobile.transform.SetParent(go.transform, false);
            go.AddComponent<PlayerInputHub>();
            go.AddComponent<GameManager>();
            return go;
        }

        // ------------------------------------------------------------------ Environment

        static GameObject BuildEnvironment()
        {
            var root = new GameObject("Environment");

            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root.transform, false);
            sunGo.transform.rotation = Quaternion.Euler(42f, -35f, 0f);
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.95f, 0.86f);
            sun.intensity = MaterialFactory.IsUrpActive ? 1.6f : 1.15f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.85f;
            RenderSettings.sun = sun;

            var sky = MaterialFactory.ProceduralSkybox();
            if (sky != null) RenderSettings.skybox = sky;

            // Ánh sáng môi trường 3 màu: không cần bake Lighting để có kết quả ổn định.
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.70f, 0.82f);
            RenderSettings.ambientEquatorColor = new Color(0.52f, 0.56f, 0.54f);
            RenderSettings.ambientGroundColor = new Color(0.26f, 0.24f, 0.20f);

            // Sương mù xa – tạo chiều sâu cho núi non (aerial perspective).
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogColor = new Color(0.70f, 0.77f, 0.84f);
            RenderSettings.fogDensity = 0.0022f;
            return root;
        }

        // ------------------------------------------------------------------ Materials

        static Mats CreateMaterials(int seed)
        {
            var bark = ProceduralTextures.TileableNoise("T_Bark", 128, new Color(0.18f, 0.12f, 0.08f), new Color(0.36f, 0.26f, 0.17f), 0.12f, seed + 11, 1.5f);
            var stone = ProceduralTextures.TileableNoise("T_Stone", 128, new Color(0.38f, 0.37f, 0.36f), new Color(0.62f, 0.60f, 0.57f), 0.06f, seed + 12, 1.6f);
            return new Mats
            {
                Plaster = MaterialFactory.Lit("M_Plaster", new Color(0.84f, 0.80f, 0.70f), 0.1f),
                Wood = MaterialFactory.Lit("M_Wood_Red", new Color(0.50f, 0.17f, 0.12f), 0.35f),
                DarkWood = MaterialFactory.Lit("M_Wood_Dark", new Color(0.22f, 0.15f, 0.10f), 0.3f),
                RoofTile = MaterialFactory.Lit("M_RoofTile", new Color(0.17f, 0.20f, 0.24f), 0.35f),
                Stone = MaterialFactory.Lit("M_Stone", Color.white, 0.15f, 0f, stone, new Vector2(2, 2)),
                Water = MaterialFactory.Transparent("M_Water", new Color(0.10f, 0.28f, 0.30f, 0.72f), 0.93f),
                Bark = MaterialFactory.Lit("M_Bark", Color.white, 0.1f, 0f, bark, new Vector2(1, 3)),
                Leaf = MaterialFactory.Lit("M_Leaf", new Color(0.24f, 0.40f, 0.16f), 0.15f),
                LeafDark = MaterialFactory.Lit("M_Leaf_Dark", new Color(0.15f, 0.29f, 0.12f), 0.15f),
                Pine = MaterialFactory.Lit("M_Pine", new Color(0.10f, 0.24f, 0.14f), 0.12f),
                Crate = MaterialFactory.Lit("M_Crate", new Color(0.55f, 0.40f, 0.24f), 0.2f),
                Lantern = MaterialFactory.Lit("M_Lantern", new Color(0.85f, 0.20f, 0.12f), 0.4f),
                Gold = MaterialFactory.Lit("M_Gold", new Color(0.85f, 0.65f, 0.25f), 0.7f, 1f),
            };
        }

        // ------------------------------------------------------------------ Water & bounds

        static void BuildWater(TerrainGenerationSettings s, Transform parent, Mats m)
        {
            // Một mặt phẳng nước duy nhất phủ cả bản đồ: chỉ lộ ra ở nơi địa hình thấp hơn mực nước.
            var water = ObjectUtil.Primitive(PrimitiveType.Plane, "Water", parent,
                new Vector3(s.size * 0.5f, s.waterLevel, s.size * 0.5f), new Vector3(s.size / 10f, 1f, s.size / 10f), m.Water);
            var r = water.GetComponent<Renderer>();
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = true;
        }

        static void BuildBounds(TerrainGenerationSettings s, Transform parent)
        {
            var root = new GameObject("WorldBounds").transform;
            root.SetParent(parent, false);
            float half = s.size * 0.5f, h = 400f, t = 10f;
            AddWall(root, new Vector3(half, h * 0.5f, -t * 0.5f), new Vector3(s.size + 2 * t, h, t));
            AddWall(root, new Vector3(half, h * 0.5f, s.size + t * 0.5f), new Vector3(s.size + 2 * t, h, t));
            AddWall(root, new Vector3(-t * 0.5f, h * 0.5f, half), new Vector3(t, h, s.size + 2 * t));
            AddWall(root, new Vector3(s.size + t * 0.5f, h * 0.5f, half), new Vector3(t, h, s.size + 2 * t));
        }

        static void AddWall(Transform parent, Vector3 center, Vector3 size)
        {
            var go = new GameObject("Wall");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = center;
            go.AddComponent<BoxCollider>().size = size;
        }

        // ------------------------------------------------------------------ Village

        static void BuildVillage(Terrain terrain, Vector3 center, Transform parent, Mats m)
        {
            var root = new GameObject("TanLaoThon_Village").transform;
            root.SetParent(parent, false);
            float baseY = Height(terrain, center);

            // Quảng trường đá + giếng cổ.
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Plaza", root, new Vector3(center.x, baseY - 0.15f, center.z),
                new Vector3(26f, 0.2f, 26f), m.Stone, true);
            var well = ObjectUtil.Primitive(PrimitiveType.Cylinder, "Well", root, new Vector3(center.x, baseY + 0.45f, center.z),
                new Vector3(2.2f, 0.45f, 2.2f), m.Stone, true);
            ObjectUtil.Primitive(PrimitiveType.Cube, "WellBeam", well.transform, new Vector3(0, 2.6f, 0), new Vector3(1.1f, 0.12f, 0.08f), m.DarkWood);
            ObjectUtil.Primitive(PrimitiveType.Cube, "WellPostL", well.transform, new Vector3(-0.5f, 1.4f, 0), new Vector3(0.06f, 2.6f, 0.06f), m.DarkWood);
            ObjectUtil.Primitive(PrimitiveType.Cube, "WellPostR", well.transform, new Vector3(0.5f, 1.4f, 0), new Vector3(0.06f, 2.6f, 0.06f), m.DarkWood);

            // Nhà cổ quanh quảng trường (chừa lối vào phía nam, nơi có cổng và bãi thử nhảy).
            float[] angles = { 35f, 80f, 125f, 235f, 280f, 325f };
            for (int i = 0; i < angles.Length; i++)
            {
                float a = angles[i] * Mathf.Deg2Rad;
                var pos = center + new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)) * 27f;
                pos.y = Height(terrain, pos);
                var rot = Quaternion.LookRotation(new Vector3(center.x - pos.x, 0, center.z - pos.z));
                BuildHouse(root, pos, rot, m, i);
            }

            // Cổng làng (bài lâu) ở lối vào phía nam.
            var gatePos = center + new Vector3(0, 0, -44f);
            gatePos.y = Height(terrain, gatePos);
            BuildGate(root, gatePos, m);

            // Tháp cổ ba tầng phía bắc.
            var pagodaPos = center + new Vector3(0, 0, 36f);
            pagodaPos.y = Height(terrain, pagodaPos);
            BuildPagoda(root, pagodaPos, m);

            // Bãi thử nhảy: bậc thang, thùng hàng, thùng đẩy được.
            var test = new GameObject("JumpTestArea").transform;
            test.SetParent(root, false);
            var testOrigin = center + new Vector3(5f, 0, -32f);
            // Bậc 1 bước lên được (≤ Step Offset), các bậc sau phải nhảy; bậc cuối chỉ tới được từ bậc kề.
            float[] stepHeights = { 0.35f, 1.0f, 1.8f, 2.6f, 3.6f };
            for (int i = 0; i < stepHeights.Length; i++)
            {
                float h = stepHeights[i];
                var p = testOrigin + new Vector3(i * 1.6f, 0, 0);
                p.y = Height(terrain, p) + h * 0.5f - 0.05f;
                ObjectUtil.Primitive(PrimitiveType.Cube, $"Step_{h:0.0}m", test, p, new Vector3(1.5f, h, 2f), m.Stone, true);
            }
            for (int i = 0; i < 4; i++)
            {
                var p = testOrigin + new Vector3(-3f - i * 1.3f, 0, 3f + (i % 2) * 1.2f);
                p.y = Height(terrain, p) + 0.5f;
                var crate = ObjectUtil.Primitive(PrimitiveType.Cube, "Crate_Pushable", test, p, Vector3.one, m.Crate, true);
                var rb = crate.AddComponent<Rigidbody>();
                rb.mass = 20f;
                rb.interpolation = RigidbodyInterpolation.Interpolate;
            }
        }

        static void BuildHouse(Transform parent, Vector3 pos, Quaternion rot, Mats m, int index)
        {
            var house = new GameObject($"House_{index:00}").transform;
            house.SetParent(parent, false);
            house.SetPositionAndRotation(pos, rot);
            float w = 7f, d = 5.5f, h = 3.2f;

            ObjectUtil.Primitive(PrimitiveType.Cube, "Foundation", house, new Vector3(0, 0.2f, 0), new Vector3(w + 0.8f, 0.6f, d + 0.8f), m.Stone, true);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Walls", house, new Vector3(0, 0.5f + h * 0.5f, 0), new Vector3(w, h, d), m.Plaster, true);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Door", house, new Vector3(0, 0.5f + 1.1f, d * 0.5f + 0.02f), new Vector3(1.4f, 2.2f, 0.05f), m.DarkWood);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Beam", house, new Vector3(0, 0.5f + h - 0.15f, d * 0.5f + 0.05f), new Vector3(w + 0.3f, 0.3f, 0.12f), m.Wood);
            foreach (float x in new[] { -w * 0.5f, w * 0.5f })
            foreach (float z in new[] { -d * 0.5f, d * 0.5f })
                ObjectUtil.Primitive(PrimitiveType.Cylinder, "Pillar", house, new Vector3(x, 0.5f + h * 0.5f, z + Mathf.Sign(z) * 0.1f),
                    new Vector3(0.3f, h * 0.5f, 0.3f), m.Wood, true);

            // Mái ngói hai mái (dọc theo bề ngang nhà).
            var roof = new GameObject("Roof", typeof(MeshFilter), typeof(MeshRenderer));
            roof.transform.SetParent(house, false);
            roof.transform.localPosition = new Vector3(0, 0.5f + h, 0);
            roof.transform.localRotation = Quaternion.Euler(0, 90f, 0);
            roof.GetComponent<MeshFilter>().sharedMesh = MeshFactory.GableRoof(d + 2.2f, 2.1f, w + 1.6f);
            roof.GetComponent<MeshRenderer>().sharedMaterial = m.RoofTile;

            // Đèn lồng đỏ trước cửa.
            ObjectUtil.Primitive(PrimitiveType.Sphere, "Lantern", house, new Vector3(1.3f, 0.5f + h - 0.6f, d * 0.5f + 0.35f),
                new Vector3(0.35f, 0.45f, 0.35f), m.Lantern);
        }

        static void BuildGate(Transform parent, Vector3 pos, Mats m)
        {
            var gate = new GameObject("VillageGate").transform;
            gate.SetParent(parent, false);
            gate.position = pos;
            foreach (float x in new[] { -3.2f, 3.2f })
            {
                ObjectUtil.Primitive(PrimitiveType.Cylinder, "Pillar", gate, new Vector3(x, 3f, 0), new Vector3(0.55f, 3f, 0.55f), m.Wood, true);
                ObjectUtil.Primitive(PrimitiveType.Cube, "Base", gate, new Vector3(x, 0.3f, 0), new Vector3(1.1f, 0.6f, 1.1f), m.Stone, true);
            }
            ObjectUtil.Primitive(PrimitiveType.Cube, "BeamLow", gate, new Vector3(0, 4.9f, 0), new Vector3(7.6f, 0.35f, 0.45f), m.Wood, true);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Plaque", gate, new Vector3(0, 5.5f, -0.25f), new Vector3(2.2f, 0.8f, 0.08f), m.Gold);
            ObjectUtil.Primitive(PrimitiveType.Cube, "BeamTop", gate, new Vector3(0, 6.2f, 0), new Vector3(9.2f, 0.4f, 0.6f), m.Wood, true);
            var roof = new GameObject("GateRoof", typeof(MeshFilter), typeof(MeshRenderer));
            roof.transform.SetParent(gate, false);
            roof.transform.localPosition = new Vector3(0, 6.4f, 0);
            roof.transform.localRotation = Quaternion.Euler(0, 90f, 0);
            roof.GetComponent<MeshFilter>().sharedMesh = MeshFactory.GableRoof(2.0f, 1.0f, 10.5f);
            roof.GetComponent<MeshRenderer>().sharedMaterial = m.RoofTile;
        }

        static void BuildPagoda(Transform parent, Vector3 pos, Mats m)
        {
            var pagoda = new GameObject("AncientPagoda").transform;
            pagoda.SetParent(parent, false);
            pagoda.position = pos;
            ObjectUtil.Primitive(PrimitiveType.Cube, "Platform", pagoda, new Vector3(0, 0.4f, 0), new Vector3(10f, 0.8f, 10f), m.Stone, true);
            float y = 0.8f;
            float size = 6f;
            for (int tier = 0; tier < 3; tier++)
            {
                float h = 3.2f - tier * 0.4f;
                ObjectUtil.Primitive(PrimitiveType.Cube, $"Body_{tier}", pagoda, new Vector3(0, y + h * 0.5f, 0), new Vector3(size, h, size), tier == 0 ? m.Wood : m.Plaster, true);
                var roof = new GameObject($"Roof_{tier}", typeof(MeshFilter), typeof(MeshRenderer));
                roof.transform.SetParent(pagoda, false);
                roof.transform.localPosition = new Vector3(0, y + h, 0);
                roof.GetComponent<MeshFilter>().sharedMesh = MeshFactory.Cone(4, size * 0.95f, 1.6f);
                roof.GetComponent<MeshRenderer>().sharedMaterial = m.RoofTile;
                y += h + 0.9f;
                size *= 0.75f;
            }
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Spire", pagoda, new Vector3(0, y + 1f, 0), new Vector3(0.18f, 1.6f, 0.18f), m.Gold);
        }

        // ------------------------------------------------------------------ Vegetation & rocks

        static void BuildTrees(TerrainGenerationSettings s, Terrain terrain, Transform parent, Mats m, System.Random rng)
        {
            var root = new GameObject("Trees").transform;
            root.SetParent(parent, false);
            var data = terrain.terrainData;
            var forestNoise = new NoiseField(s.seed + 99);
            int placed = 0;
            for (int attempt = 0; attempt < s.treeCount * 6 && placed < s.treeCount; attempt++)
            {
                float x = (float)rng.NextDouble() * s.size, z = (float)rng.NextDouble() * s.size;
                float u = x / s.size, v = z / s.size;
                float h = data.GetInterpolatedHeight(u, v);
                float steep = data.GetSteepness(u, v);
                if (h < s.waterLevel + 1.2f || h > 105f || steep > 28f) continue;
                if (Vector2.Distance(new Vector2(x, z), s.villageCenter) < s.villageRadius + 8f) continue;
                // Mật độ theo nhiễu → có rừng rậm và trảng cỏ.
                if (forestNoise.Fbm(x * 0.012f, z * 0.012f, 3) < 0.45f + (float)rng.NextDouble() * 0.1f) continue;

                bool pine = h > 40f || rng.NextDouble() < 0.35;
                bool ancient = rng.NextDouble() < 0.04; // cổ thụ khổng lồ
                float scale = (0.8f + (float)rng.NextDouble() * 0.6f) * (ancient ? 2.4f : 1f);
                var pos = new Vector3(x, h - 0.2f, z);
                var rot = Quaternion.Euler(0, (float)rng.NextDouble() * 360f, 0);
                if (pine) BuildPine(root, pos, rot, scale, m);
                else BuildBroadleaf(root, pos, rot, scale, m, rng);
                placed++;
            }
        }

        static void BuildPine(Transform parent, Vector3 pos, Quaternion rot, float scale, Mats m)
        {
            var tree = NewTreeRoot("Pine", parent, pos, rot, scale);
            var renderers = new List<Renderer>();
            renderers.Add(ObjectUtil.Primitive(PrimitiveType.Cylinder, "Trunk", tree, new Vector3(0, 1.5f, 0), new Vector3(0.35f, 1.5f, 0.35f), m.Bark, true).GetComponent<Renderer>());
            for (int i = 0; i < 3; i++)
            {
                var cone = new GameObject($"Needles_{i}", typeof(MeshFilter), typeof(MeshRenderer));
                cone.transform.SetParent(tree, false);
                cone.transform.localPosition = new Vector3(0, 2.2f + i * 1.6f, 0);
                cone.GetComponent<MeshFilter>().sharedMesh = MeshFactory.Cone(7, 2.1f - i * 0.5f, 2.8f - i * 0.3f);
                var r = cone.GetComponent<MeshRenderer>();
                r.sharedMaterial = m.Pine;
                renderers.Add(r);
            }
            AddLod(tree, renderers);
        }

        static void BuildBroadleaf(Transform parent, Vector3 pos, Quaternion rot, float scale, Mats m, System.Random rng)
        {
            var tree = NewTreeRoot("Broadleaf", parent, pos, rot, scale);
            var renderers = new List<Renderer>();
            renderers.Add(ObjectUtil.Primitive(PrimitiveType.Cylinder, "Trunk", tree, new Vector3(0, 1.6f, 0), new Vector3(0.45f, 1.6f, 0.45f), m.Bark, true).GetComponent<Renderer>());
            int blobs = 3 + rng.Next(3);
            for (int i = 0; i < blobs; i++)
            {
                var offset = new Vector3((float)rng.NextDouble() * 2.4f - 1.2f, 3.6f + (float)rng.NextDouble() * 1.6f, (float)rng.NextDouble() * 2.4f - 1.2f);
                float size = 2.2f + (float)rng.NextDouble() * 1.4f;
                var blob = ObjectUtil.Primitive(PrimitiveType.Sphere, $"Canopy_{i}", tree, offset, new Vector3(size, size * 0.8f, size), i % 2 == 0 ? m.Leaf : m.LeafDark);
                renderers.Add(blob.GetComponent<Renderer>());
            }
            AddLod(tree, renderers);
        }

        static Transform NewTreeRoot(string name, Transform parent, Vector3 pos, Quaternion rot, float scale)
        {
            var tree = new GameObject(name).transform;
            tree.SetParent(parent, false);
            tree.SetPositionAndRotation(pos, rot);
            tree.localScale = Vector3.one * scale;
            return tree;
        }

        /// <summary>LOD Group: ẩn cây khi chiếm dưới ~2.5% chiều cao màn hình (đã nhân LOD Bias của mức đồ hoạ).</summary>
        static void AddLod(Transform tree, List<Renderer> renderers)
        {
            var lod = tree.gameObject.AddComponent<LODGroup>();
            lod.SetLODs(new[] { new LOD(0.025f, renderers.ToArray()) });
            lod.RecalculateBounds();
        }

        static void BuildRocks(TerrainGenerationSettings s, Terrain terrain, Transform parent, Mats m, System.Random rng)
        {
            var root = new GameObject("Rocks").transform;
            root.SetParent(parent, false);
            var data = terrain.terrainData;
            int placed = 0;
            for (int attempt = 0; attempt < s.rockCount * 5 && placed < s.rockCount; attempt++)
            {
                float x = (float)rng.NextDouble() * s.size, z = (float)rng.NextDouble() * s.size;
                float h = data.GetInterpolatedHeight(x / s.size, z / s.size);
                if (Vector2.Distance(new Vector2(x, z), s.villageCenter) < s.villageRadius) continue;
                float steep = data.GetSteepness(x / s.size, z / s.size);
                if (steep > 45f) continue;

                float size = 0.6f + (float)rng.NextDouble() * (steep > 20f ? 4f : 1.8f);
                var rock = ObjectUtil.Primitive(PrimitiveType.Sphere, "Rock", root, new Vector3(x, h - size * 0.15f, z),
                    new Vector3(size * (1f + (float)rng.NextDouble()), size * (0.5f + (float)rng.NextDouble() * 0.4f), size), m.Stone);
                rock.transform.rotation = Quaternion.Euler((float)rng.NextDouble() * 20f, (float)rng.NextDouble() * 360f, (float)rng.NextDouble() * 20f);
                var col = rock.AddComponent<MeshCollider>();
                col.convex = true;
                var lod = rock.AddComponent<LODGroup>();
                lod.SetLODs(new[] { new LOD(0.006f, new[] { rock.GetComponent<Renderer>() }) });
                placed++;
            }
        }

        // ------------------------------------------------------------------ Player & camera

        /// <summary>
        /// Player
        ///  ├─ CharacterController + PlayerController + PlayerAnimationController
        ///  └─ Visual            ← thay model ở đây
        ///      └─ PlaceholderModel (PlaceholderRig)
        /// </summary>
        public static PlayerController BuildPlayer(Vector3 position, Quaternion rotation)
        {
            var go = new GameObject("Player");
            go.tag = "Player";
            go.transform.SetPositionAndRotation(position, rotation);

            var visual = new GameObject("Visual").transform;
            visual.SetParent(go.transform, false);
            PlaceholderCharacterBuilder.Build(visual);

            var cc = go.AddComponent<CharacterController>();
            cc.height = 1.85f;
            cc.radius = 0.32f;
            cc.center = new Vector3(0, 0.925f + 0.02f, 0);
            cc.slopeLimit = 45f;
            cc.stepOffset = 0.4f;
            cc.skinWidth = 0.02f;
            cc.minMoveDistance = 0f;

            var controller = go.AddComponent<PlayerController>();
            go.AddComponent<PlayerAnimationController>();
            return controller;
        }

        public static ThirdPersonCamera BuildCamera(Transform target)
        {
            var existing = Camera.main;
            if (existing != null) ObjectUtil.SafeDestroy(existing.gameObject);

            var go = new GameObject("Main Camera");
            go.tag = "MainCamera";
            var cam = go.AddComponent<Camera>();
            cam.fieldOfView = 60f;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 1500f;
            cam.allowHDR = true;
            go.AddComponent<AudioListener>();
            go.transform.position = target.position + new Vector3(0, 2.5f, -5f);
            go.transform.LookAt(target.position + Vector3.up * 1.5f);

            var tpc = go.AddComponent<ThirdPersonCamera>();
            tpc.SetTarget(target, false);
            return tpc;
        }

        static float Height(Terrain terrain, Vector3 worldPos) => terrain.SampleHeight(worldPos) + terrain.transform.position.y;
    }
}
