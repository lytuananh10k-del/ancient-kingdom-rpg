using UnityEngine;

namespace VanGioi.Utils
{
    /// <summary>
    /// Tiện ích dùng chung cho cả Edit Mode (công cụ dựng scene) và Play Mode.
    /// </summary>
    public static class ObjectUtil
    {
        /// <summary>Destroy an toàn: Play Mode dùng Destroy, Edit Mode dùng DestroyImmediate.</summary>
        public static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Object.Destroy(obj);
            else Object.DestroyImmediate(obj);
        }

        /// <summary>Tạo primitive và (tuỳ chọn) bỏ collider mặc định của nó.</summary>
        public static GameObject Primitive(PrimitiveType type, string name, Transform parent,
            Vector3 localPosition, Vector3 localScale, Material material, bool keepCollider = false)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = localScale;
            if (material != null) go.GetComponent<Renderer>().sharedMaterial = material;
            if (!keepCollider)
            {
                SafeDestroy(go.GetComponent<Collider>());
            }
            else if (type == PrimitiveType.Cylinder)
            {
                // CapsuleCollider mặc định của Cylinder sai hình khi bị dẹt (thành quả cầu) →
                // thay bằng MeshCollider convex khớp đúng hình trụ ở mọi tỉ lệ.
                SafeDestroy(go.GetComponent<Collider>());
                var mc = go.AddComponent<MeshCollider>();
                mc.sharedMesh = go.GetComponent<MeshFilter>().sharedMesh;
                mc.convex = true;
            }
            return go;
        }

        /// <summary>Tạo GameObject rỗng làm khớp (pivot) cho hệ xương placeholder.</summary>
        public static Transform Pivot(string name, Transform parent, Vector3 localPosition)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            t.localPosition = localPosition;
            return t;
        }

        /// <summary>Đặt layer cho toàn bộ cây con.</summary>
        public static void SetLayerRecursively(GameObject go, int layer)
        {
            go.layer = layer;
            foreach (Transform child in go.transform) SetLayerRecursively(child.gameObject, layer);
        }

        public static float SmoothStep01(float edge0, float edge1, float x)
        {
            float t = Mathf.Clamp01((x - edge0) / (edge1 - edge0));
            return t * t * (3f - 2f * t);
        }
    }
}
