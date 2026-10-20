using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using VanGioi.Utils;
using VanGioi.World;

namespace VanGioi.EditorTools
{
    /// <summary>
    /// Menu "Vân Giới" trên thanh menu Unity:
    ///  • Dựng Scene Prototype – sinh scene Giai đoạn 1 và lưu toàn bộ asset sinh ra
    ///    (TerrainData, TerrainLayer, texture, material, mesh) vào Assets/VanGioi/Generated/Phase1.
    ///  • Kiểm tra / áp dụng cấu hình dự án cho Windows & Android.
    /// </summary>
    public static class PrototypeSceneBuilder
    {
        const string GeneratedFolder = "Assets/VanGioi/Generated/Phase1";
        const string ScenesFolder = "Assets/VanGioi/Scenes";
        const string ScenePath = ScenesFolder + "/Phase1_Prototype.unity";

        [MenuItem("Vân Giới/Giai đoạn 1/Dựng Scene Prototype (500×500 m)", priority = 1)]
        public static void BuildPrototypeScene()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                EditorUtility.DisplayDialog("Vân Giới", "Hãy thoát Play Mode trước khi dựng scene.", "OK");
                return;
            }
            if (!MaterialFactory.IsUrpActive &&
                !EditorUtility.DisplayDialog("Vân Giới – URP chưa bật",
                    "Dự án đang dùng Built-in Render Pipeline. Scene vẫn dựng được nhưng vật liệu sẽ dùng shader Standard.\n\n" +
                    "Khuyến nghị: tạo dự án bằng template \"Universal 3D\" hoặc gán URP Asset trong " +
                    "Project Settings > Graphics và Quality rồi dựng lại.", "Vẫn dựng (Built-in)", "Huỷ"))
                return;
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;

            try
            {
                EditorUtility.DisplayProgressBar("Vân Giới", "Tạo scene mới…", 0.05f);
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

                if (AssetDatabase.IsValidFolder(GeneratedFolder)) AssetDatabase.DeleteAsset(GeneratedFolder);
                EnsureFolder(GeneratedFolder);
                EnsureFolder(ScenesFolder);

                EditorUtility.DisplayProgressBar("Vân Giới", "Sinh địa hình, làng Tàn Lão Thôn, rừng cây…", 0.25f);
                var result = PrototypeWorldBuilder.Build(new TerrainGenerationSettings());

                EditorUtility.DisplayProgressBar("Vân Giới", "Lưu asset sinh ra…", 0.7f);
                var saver = new GeneratedAssetSaver(GeneratedFolder);
                saver.SaveTerrain(result.Terrain);
                foreach (var go in scene.GetRootGameObjects()) saver.SaveHierarchy(go);
                if (RenderSettings.skybox != null) saver.SaveMaterial(RenderSettings.skybox);
                AssetDatabase.SaveAssets();

                EditorUtility.DisplayProgressBar("Vân Giới", "Lưu scene…", 0.9f);
                EditorSceneManager.SaveScene(scene, ScenePath);
                AddSceneToBuildSettings(ScenePath);

                Selection.activeGameObject = result.Player.gameObject;
                if (SceneView.lastActiveSceneView != null) SceneView.lastActiveSceneView.FrameSelected();
                Debug.Log($"[Vân Giới] Đã dựng {ScenePath} ({saver.Count} asset). Bấm Play để chơi thử. Điểm xuất phát: {result.SpawnPoint}");
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }
        }

        [MenuItem("Vân Giới/Giai đoạn 1/Mở Scene Prototype", priority = 2)]
        public static void OpenPrototypeScene()
        {
            if (!File.Exists(ScenePath))
            {
                if (EditorUtility.DisplayDialog("Vân Giới", "Chưa có scene prototype. Dựng ngay?", "Dựng", "Huỷ"))
                    BuildPrototypeScene();
                return;
            }
            if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath);
        }

        [MenuItem("Vân Giới/Giai đoạn 1/Thêm PrototypeBootstrap vào Scene hiện tại", priority = 3)]
        public static void AddBootstrap()
        {
            var go = new GameObject("PrototypeBootstrap");
            go.AddComponent<PrototypeBootstrap>();
            Undo.RegisterCreatedObjectUndo(go, "Add PrototypeBootstrap");
            Selection.activeGameObject = go;
        }

        [MenuItem("Vân Giới/Kiểm tra cấu hình dự án", priority = 20)]
        public static void ValidateProject()
        {
            var report = new System.Text.StringBuilder("[Vân Giới] Kiểm tra cấu hình:\n");
            void Line(bool ok, string text) => report.AppendLine((ok ? "  ✔ " : "  ✘ ") + text);

            Line(MaterialFactory.IsUrpActive, "Universal Render Pipeline đang hoạt động");
            Line(Shader.Find(MaterialFactory.UrpLit) != null, "Tìm thấy shader URP/Lit");
            Line(Shader.Find(MaterialFactory.UrpTerrainLit) != null, "Tìm thấy shader URP/Terrain/Lit");
            Line(PlayerSettings.colorSpace == ColorSpace.Linear, "Color Space = Linear (cần cho PBR)");
#if ENABLE_INPUT_SYSTEM
            Line(true, "Input System Package đang bật");
#else
            Line(true, "Đang dùng Input Manager cũ (vẫn hỗ trợ đầy đủ)");
#endif
            Line(File.Exists(ScenePath), "Đã có scene " + ScenePath);
            Line(PlayerSettings.GetScriptingBackend(NamedBuildTarget.Android) == ScriptingImplementation.IL2CPP,
                "Android dùng IL2CPP (bắt buộc cho ARM64)");
            Line((PlayerSettings.Android.targetArchitectures & AndroidArchitecture.ARM64) != 0, "Android có ARM64");
            Debug.Log(report.ToString());
        }

        [MenuItem("Vân Giới/Áp dụng Player Settings đề xuất (Windows + Android)", priority = 21)]
        public static void ApplyRecommendedSettings()
        {
            if (!EditorUtility.DisplayDialog("Vân Giới",
                    "Sẽ đặt: Color Space Linear, tên sản phẩm, Android IL2CPP + ARM64, màn hình ngang, " +
                    "package id com.vangioi.truyenky3d. Tiếp tục?", "Áp dụng", "Huỷ"))
                return;

            PlayerSettings.companyName = "VanGioi Studio";
            PlayerSettings.productName = "Van Gioi Truyen Ky 3D";
            PlayerSettings.colorSpace = ColorSpace.Linear;

            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.vangioi.truyenky3d");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;

            PlayerSettings.fullScreenMode = FullScreenMode.FullScreenWindow;

            AssetDatabase.SaveAssets();
            Debug.Log("[Vân Giới] Đã áp dụng Player Settings đề xuất.");
        }

        // ------------------------------------------------------------------

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            if (!string.IsNullOrEmpty(parent) && !AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        static void AddSceneToBuildSettings(string path)
        {
            var scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            scenes.RemoveAll(s => s.path == path);
            scenes.Insert(0, new EditorBuildSettingsScene(path, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }

        /// <summary>
        /// Lưu các object sinh lúc dựng (chưa phải asset) thành file trong thư mục Generated,
        /// để scene tham chiếu được và build ra máy thật không bị thiếu shader / texture.
        /// </summary>
        sealed class GeneratedAssetSaver
        {
            readonly string folder;
            readonly HashSet<Object> saved = new HashSet<Object>();

            public GeneratedAssetSaver(string folder) { this.folder = folder; }
            public int Count => saved.Count;

            bool NeedsSave(Object o) => o != null && !EditorUtility.IsPersistent(o) && !saved.Contains(o);

            string PathFor(string name, string ext)
            {
                foreach (char c in Path.GetInvalidFileNameChars()) name = name.Replace(c, '_');
                return AssetDatabase.GenerateUniqueAssetPath($"{folder}/{name}.{ext}");
            }

            void Create(Object o, string ext)
            {
                AssetDatabase.CreateAsset(o, PathFor(string.IsNullOrEmpty(o.name) ? o.GetType().Name : o.name, ext));
                saved.Add(o);
            }

            public void SaveTexture(Texture t)
            {
                if (NeedsSave(t)) Create(t, "asset");
            }

            public void SaveMesh(Mesh m)
            {
                if (NeedsSave(m)) Create(m, "asset");
            }

            public void SaveMaterial(Material m)
            {
                if (!NeedsSave(m)) return;
                foreach (var prop in m.GetTexturePropertyNames()) SaveTexture(m.GetTexture(prop));
                Create(m, "mat");
            }

            public void SaveTerrain(Terrain terrain)
            {
                var data = terrain.terrainData;
                foreach (var layer in data.terrainLayers)
                {
                    if (layer == null) continue;
                    SaveTexture(layer.diffuseTexture);
                    SaveTexture(layer.normalMapTexture);
                    SaveTexture(layer.maskMapTexture);
                    if (NeedsSave(layer)) Create(layer, "terrainlayer");
                }
                if (terrain.materialTemplate != null) SaveMaterial(terrain.materialTemplate);
                if (NeedsSave(data)) Create(data, "asset");
            }

            public void SaveHierarchy(GameObject root)
            {
                foreach (var mf in root.GetComponentsInChildren<MeshFilter>(true)) SaveMesh(mf.sharedMesh);
                foreach (var mc in root.GetComponentsInChildren<MeshCollider>(true)) SaveMesh(mc.sharedMesh);
                foreach (var r in root.GetComponentsInChildren<Renderer>(true))
                    foreach (var m in r.sharedMaterials) SaveMaterial(m);
            }
        }
    }
}
