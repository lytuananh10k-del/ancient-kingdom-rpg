using System.Collections.Generic;
using UnityEngine;

namespace VanGioi.Utils
{
    /// <summary>
    /// Mesh low-poly sinh bằng code (nón cây thông, mái ngói, mái tháp).
    /// Kết quả được cache để mọi cây/nhà dùng chung một mesh (tốt cho batching / instancing).
    /// </summary>
    public static class MeshFactory
    {
        static readonly Dictionary<string, Mesh> Cache = new Dictionary<string, Mesh>();

        public static void ClearCache() => Cache.Clear();

        /// <summary>Hình nón có đáy. sides = 4 cho ra kim tự tháp (mái tháp).</summary>
        public static Mesh Cone(int sides, float radius, float height)
        {
            string key = $"Cone_{sides}_{radius:F2}_{height:F2}";
            if (Cache.TryGetValue(key, out var cached) && cached != null) return cached;

            var b = new Builder(new Vector3(0, height * 0.25f, 0));
            var apex = new Vector3(0, height, 0);
            var center = Vector3.zero;
            float offset = sides == 4 ? Mathf.PI * 0.25f : 0f; // kim tự tháp thẳng hàng trục
            for (int i = 0; i < sides; i++)
            {
                float a0 = offset + i * Mathf.PI * 2f / sides;
                float a1 = offset + (i + 1) * Mathf.PI * 2f / sides;
                var p0 = new Vector3(Mathf.Cos(a0) * radius, 0, Mathf.Sin(a0) * radius);
                var p1 = new Vector3(Mathf.Cos(a1) * radius, 0, Mathf.Sin(a1) * radius);
                b.Tri(apex, p0, p1);
                b.Tri(center, p0, p1);
            }
            return Cache[key] = b.Build(key);
        }

        /// <summary>Lăng trụ tam giác: mái nhà hai mái kiểu cổ (dọc theo trục Z).</summary>
        public static Mesh GableRoof(float width, float height, float depth)
        {
            string key = $"Roof_{width:F2}_{height:F2}_{depth:F2}";
            if (Cache.TryGetValue(key, out var cached) && cached != null) return cached;

            var b = new Builder(new Vector3(0, height * 0.3f, 0));
            float hw = width * 0.5f, hd = depth * 0.5f;
            var lf = new Vector3(-hw, 0, -hd); var rf = new Vector3(hw, 0, -hd); var tf = new Vector3(0, height, -hd);
            var lb = new Vector3(-hw, 0, hd); var rb = new Vector3(hw, 0, hd); var tb = new Vector3(0, height, hd);
            b.Tri(lf, rf, tf);              // đầu hồi trước
            b.Tri(lb, rb, tb);              // đầu hồi sau
            b.Quad(lf, tf, tb, lb);         // mái trái
            b.Quad(rf, tf, tb, rb);         // mái phải
            b.Quad(lf, rf, rb, lb);         // đáy
            return Cache[key] = b.Build(key);
        }

        /// <summary>
        /// Dải vòng cung nằm trong mặt phẳng XZ, tâm cung hướng +Z (dùng cho vệt kiếm khí).
        /// Vertex color: alpha tăng từ mép trong ra mép ngoài và từ đầu cung tới cuối cung.
        /// </summary>
        public static Mesh Arc(float innerRadius, float outerRadius, float degrees, int segments)
        {
            string key = $"Arc_{innerRadius:F2}_{outerRadius:F2}_{degrees:F0}_{segments}";
            if (Cache.TryGetValue(key, out var cached) && cached != null) return cached;

            var verts = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            float start = -degrees * 0.5f * Mathf.Deg2Rad;
            float step = degrees * Mathf.Deg2Rad / segments;
            for (int i = 0; i <= segments; i++)
            {
                float a = start + step * i;
                float u = (float)i / segments;
                var dir = new Vector3(Mathf.Sin(a), 0f, Mathf.Cos(a));
                float lead = Mathf.SmoothStep(0f, 1f, u);
                verts.Add(dir * innerRadius); colors.Add(new Color(1, 1, 1, 0f)); uvs.Add(new Vector2(u, 0));
                verts.Add(dir * outerRadius); colors.Add(new Color(1, 1, 1, lead)); uvs.Add(new Vector2(u, 1));
                if (i == segments) continue;
                int v = i * 2;
                tris.Add(v); tris.Add(v + 1); tris.Add(v + 3);
                tris.Add(v); tris.Add(v + 3); tris.Add(v + 2);
            }
            var mesh = new Mesh { name = "M_" + key };
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return Cache[key] = mesh;
        }

        /// <summary>
        /// Gom tam giác flat-shaded và tự lật mặt để pháp tuyến luôn hướng ra ngoài
        /// (chỉ đúng với khối lồi – đủ cho các khối placeholder).
        /// </summary>
        sealed class Builder
        {
            readonly Vector3 interior;
            readonly List<Vector3> verts = new List<Vector3>();
            readonly List<int> tris = new List<int>();

            public Builder(Vector3 interiorPoint) { interior = interiorPoint; }

            public void Tri(Vector3 a, Vector3 b, Vector3 c)
            {
                var normal = Vector3.Cross(b - a, c - a);
                var centroid = (a + b + c) / 3f;
                if (Vector3.Dot(normal, centroid - interior) < 0f) { var t = b; b = c; c = t; }
                int i = verts.Count;
                verts.Add(a); verts.Add(b); verts.Add(c);
                tris.Add(i); tris.Add(i + 1); tris.Add(i + 2);
            }

            public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
            {
                Tri(a, b, c);
                Tri(a, c, d);
            }

            public Mesh Build(string name)
            {
                var mesh = new Mesh { name = "M_" + name };
                mesh.SetVertices(verts);
                mesh.SetTriangles(tris, 0);
                var uvs = new List<Vector2>(verts.Count);
                foreach (var v in verts) uvs.Add(new Vector2(v.x + v.z, v.y));
                mesh.SetUVs(0, uvs);
                mesh.RecalculateNormals();
                mesh.RecalculateTangents();
                mesh.RecalculateBounds();
                return mesh;
            }
        }
    }
}
