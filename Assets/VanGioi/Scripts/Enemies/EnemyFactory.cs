using System.Collections.Generic;
using UnityEngine;
using VanGioi.Data;
using VanGioi.Stats;
using VanGioi.Utils;

namespace VanGioi.Enemies
{
    /// <summary>
    /// Tạo quái từ EnemyData: dùng prefab nếu có, nếu không dựng model placeholder
    /// (sói hoặc lợn rừng) có QuadrupedRig. Gắn CharacterController, CharacterStats, EnemyAI.
    /// </summary>
    public static class EnemyFactory
    {
        static readonly Dictionary<Color, Material> TintCache = new Dictionary<Color, Material>();
        static Material eyeMat, tuskMat, darkMat;

        public static EnemyAI Create(EnemyData data, Vector3 position, Quaternion rotation, Transform parent = null)
        {
            GameObject go;
            if (data.prefab != null)
            {
                go = Object.Instantiate(data.prefab, position, rotation, parent);
                go.name = data.displayName;
            }
            else
            {
                go = new GameObject(data.displayName);
                go.transform.SetParent(parent, false);
                go.transform.SetPositionAndRotation(position, rotation);
                var visual = new GameObject("Visual").transform;
                visual.SetParent(go.transform, false);
                visual.localScale = Vector3.one * data.scale;
                if (data.visual == EnemyVisual.Boar) BuildBoar(visual, data.tint);
                else BuildWolf(visual, data.tint);
            }

            var cc = go.GetComponent<CharacterController>();
            if (cc == null) cc = go.AddComponent<CharacterController>();
            float s = data.scale;
            bool boar = data.visual == EnemyVisual.Boar;
            cc.height = (boar ? 1.1f : 1.0f) * s;
            cc.radius = (boar ? 0.55f : 0.45f) * s;
            cc.center = new Vector3(0f, cc.height * 0.5f + 0.02f, 0f);
            cc.slopeLimit = 50f;
            cc.stepOffset = Mathf.Min(0.4f, cc.height * 0.4f);
            cc.skinWidth = 0.03f;
            cc.minMoveDistance = 0f;

            if (go.GetComponent<CharacterStats>() == null) go.AddComponent<CharacterStats>();
            var ai = go.GetComponent<EnemyAI>();
            if (ai == null) ai = go.AddComponent<EnemyAI>();
            ai.Setup(data, position);
            return ai;
        }

        static Material Tint(Color c)
        {
            if (!TintCache.TryGetValue(c, out var m) || m == null)
                TintCache[c] = m = MaterialFactory.Lit("M_Enemy_" + ColorUtility.ToHtmlStringRGB(c), c, 0.25f);
            return m;
        }

        static void EnsureShared()
        {
            if (eyeMat == null) eyeMat = MaterialFactory.Lit("M_Enemy_Eye", new Color(1f, 0.8f, 0.2f), 0.9f);
            if (tuskMat == null) tuskMat = MaterialFactory.Lit("M_Enemy_Tusk", new Color(0.85f, 0.83f, 0.78f), 0.6f, 0.5f);
            if (darkMat == null) darkMat = MaterialFactory.Lit("M_Enemy_Dark", new Color(0.1f, 0.09f, 0.08f), 0.3f);
        }

        static QuadrupedRig BuildWolf(Transform root, Color tint)
        {
            EnsureShared();
            var fur = Tint(tint);
            var light = Tint(Color.Lerp(tint, Color.white, 0.35f));
            var model = new GameObject("PlaceholderWolf").transform;
            model.SetParent(root, false);

            var body = ObjectUtil.Pivot("Body", model, new Vector3(0, 0.62f, 0));
            var torso = ObjectUtil.Primitive(PrimitiveType.Capsule, "Torso", body, Vector3.zero, new Vector3(0.42f, 0.55f, 0.42f), fur);
            torso.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "Chest", body, new Vector3(0, -0.05f, 0.35f), new Vector3(0.4f, 0.42f, 0.4f), light);

            var head = ObjectUtil.Pivot("Head", body, new Vector3(0, 0.18f, 0.6f));
            ObjectUtil.Primitive(PrimitiveType.Cube, "Skull", head, new Vector3(0, 0, 0.05f), new Vector3(0.28f, 0.26f, 0.3f), fur);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Snout", head, new Vector3(0, -0.05f, 0.25f), new Vector3(0.14f, 0.12f, 0.24f), light);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Nose", head, new Vector3(0, -0.01f, 0.37f), new Vector3(0.06f, 0.05f, 0.04f), darkMat);
            ObjectUtil.Primitive(PrimitiveType.Cube, "EarL", head, new Vector3(-0.09f, 0.18f, -0.02f), new Vector3(0.06f, 0.14f, 0.05f), fur);
            ObjectUtil.Primitive(PrimitiveType.Cube, "EarR", head, new Vector3(0.09f, 0.18f, -0.02f), new Vector3(0.06f, 0.14f, 0.05f), fur);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeL", head, new Vector3(-0.08f, 0.05f, 0.19f), Vector3.one * 0.04f, eyeMat);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeR", head, new Vector3(0.08f, 0.05f, 0.19f), Vector3.one * 0.04f, eyeMat);

            var rig = model.gameObject.AddComponent<QuadrupedRig>();
            rig.body = body;
            rig.head = head;
            rig.legFL = Leg("LegFL", model, new Vector3(-0.13f, 0.52f, 0.32f), 0.5f, 0.09f, fur);
            rig.legFR = Leg("LegFR", model, new Vector3(0.13f, 0.52f, 0.32f), 0.5f, 0.09f, fur);
            rig.legBL = Leg("LegBL", model, new Vector3(-0.13f, 0.52f, -0.35f), 0.5f, 0.1f, fur);
            rig.legBR = Leg("LegBR", model, new Vector3(0.13f, 0.52f, -0.35f), 0.5f, 0.1f, fur);
            var tail = ObjectUtil.Pivot("Tail", body, new Vector3(0, 0.08f, -0.55f));
            var tailMesh = ObjectUtil.Primitive(PrimitiveType.Capsule, "TailMesh", tail, new Vector3(0, -0.12f, -0.18f), new Vector3(0.1f, 0.22f, 0.1f), fur);
            tailMesh.transform.localRotation = Quaternion.Euler(-55f, 0, 0);
            rig.tail = tail;
            return rig;
        }

        static QuadrupedRig BuildBoar(Transform root, Color tint)
        {
            EnsureShared();
            var hide = Tint(tint);
            var bristle = Tint(Color.Lerp(tint, Color.black, 0.45f));
            var model = new GameObject("PlaceholderBoar").transform;
            model.SetParent(root, false);

            var body = ObjectUtil.Pivot("Body", model, new Vector3(0, 0.66f, 0));
            var torso = ObjectUtil.Primitive(PrimitiveType.Capsule, "Torso", body, Vector3.zero, new Vector3(0.75f, 0.68f, 0.7f), hide);
            torso.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Mane", body, new Vector3(0, 0.33f, 0.15f), new Vector3(0.12f, 0.16f, 0.8f), bristle);

            var head = ObjectUtil.Pivot("Head", body, new Vector3(0, 0.02f, 0.62f));
            ObjectUtil.Primitive(PrimitiveType.Cube, "Skull", head, new Vector3(0, 0, 0.12f), new Vector3(0.45f, 0.42f, 0.42f), hide);
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Snout", head, new Vector3(0, -0.08f, 0.38f), new Vector3(0.22f, 0.07f, 0.2f), bristle)
                .transform.localRotation = Quaternion.Euler(90f, 0, 0);
            var tuskL = ObjectUtil.Primitive(PrimitiveType.Cube, "TuskL", head, new Vector3(-0.14f, -0.08f, 0.38f), new Vector3(0.04f, 0.04f, 0.22f), tuskMat);
            tuskL.transform.localRotation = Quaternion.Euler(-35f, -15f, 0);
            var tuskR = ObjectUtil.Primitive(PrimitiveType.Cube, "TuskR", head, new Vector3(0.14f, -0.08f, 0.38f), new Vector3(0.04f, 0.04f, 0.22f), tuskMat);
            tuskR.transform.localRotation = Quaternion.Euler(-35f, 15f, 0);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeL", head, new Vector3(-0.15f, 0.09f, 0.3f), Vector3.one * 0.05f, eyeMat);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeR", head, new Vector3(0.15f, 0.09f, 0.3f), Vector3.one * 0.05f, eyeMat);
            ObjectUtil.Primitive(PrimitiveType.Cube, "EarL", head, new Vector3(-0.17f, 0.24f, 0.02f), new Vector3(0.1f, 0.12f, 0.04f), hide);
            ObjectUtil.Primitive(PrimitiveType.Cube, "EarR", head, new Vector3(0.17f, 0.24f, 0.02f), new Vector3(0.1f, 0.12f, 0.04f), hide);

            var rig = model.gameObject.AddComponent<QuadrupedRig>();
            rig.body = body;
            rig.head = head;
            rig.legFL = Leg("LegFL", model, new Vector3(-0.2f, 0.42f, 0.38f), 0.42f, 0.14f, bristle);
            rig.legFR = Leg("LegFR", model, new Vector3(0.2f, 0.42f, 0.38f), 0.42f, 0.14f, bristle);
            rig.legBL = Leg("LegBL", model, new Vector3(-0.2f, 0.42f, -0.4f), 0.42f, 0.15f, bristle);
            rig.legBR = Leg("LegBR", model, new Vector3(0.2f, 0.42f, -0.4f), 0.42f, 0.15f, bristle);
            var tail = ObjectUtil.Pivot("Tail", body, new Vector3(0, 0.15f, -0.7f));
            ObjectUtil.Primitive(PrimitiveType.Cube, "TailMesh", tail, new Vector3(0, -0.08f, -0.03f), new Vector3(0.04f, 0.18f, 0.04f), bristle);
            rig.tail = tail;
            return rig;
        }

        static Transform Leg(string name, Transform parent, Vector3 hip, float length, float thickness, Material m)
        {
            var pivot = ObjectUtil.Pivot(name, parent, hip);
            ObjectUtil.Primitive(PrimitiveType.Capsule, "Mesh", pivot, new Vector3(0, -length * 0.5f, 0),
                new Vector3(thickness, length * 0.5f, thickness), m);
            return pivot;
        }
    }
}
