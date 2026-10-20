using System.Collections.Generic;
using UnityEngine;
using VanGioi.CameraSystem;
using VanGioi.Core;
using VanGioi.Data;
using VanGioi.Utils;

namespace VanGioi.Combat
{
    /// <summary>
    /// "Cảm giác đánh": hit-stop (khựng hình), rung camera, tia lửa khi trúng, vệt kiếm khí.
    /// Mọi hiệu ứng dùng Object Pool. Gọi qua các hàm static để không cần giữ tham chiếu.
    /// </summary>
    public class CombatFeedback : MonoBehaviour
    {
        public static CombatFeedback Instance { get; private set; }

        [SerializeField] bool enableHitStop = true;
        [SerializeField, Range(0f, 0.2f)] float maxHitStop = 0.12f;
        [SerializeField, Range(0.01f, 0.5f)] float hitStopTimeScale = 0.05f;
        [SerializeField] bool enableCameraShake = true;

        struct Timed<T> { public T Item; public float ReleaseAt; }

        ComponentPool<ParticleSystem> sparkPool;
        ComponentPool<MeshRenderer> slashPool;
        readonly List<Timed<ParticleSystem>> liveSparks = new List<Timed<ParticleSystem>>();
        readonly List<Timed<MeshRenderer>> liveSlashes = new List<Timed<MeshRenderer>>();
        readonly Dictionary<MeshRenderer, (float start, float duration, Color color, Vector3 baseScale)> slashInfo =
            new Dictionary<MeshRenderer, (float, float, Color, Vector3)>();
        MaterialPropertyBlock mpb;
        Material sparkMaterial, slashMaterial;
        Mesh arcMesh, ringMesh;
        ThirdPersonCamera cam;
        float hitStopUntil;
        bool hitStopping;

        static readonly int ColorId = Shader.PropertyToID("_Color");

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(this); return; }
            Instance = this;
            mpb = new MaterialPropertyBlock();
            var dot = ProceduralTextures.CircleSprite(32).texture;
            sparkMaterial = MaterialFactory.UnlitTransparent("M_VFX_Spark", Color.white, dot);
            slashMaterial = MaterialFactory.UnlitTransparent("M_VFX_Slash", Color.white);
            arcMesh = MeshFactory.Arc(0.55f, 1f, 200f, 24);
            ringMesh = MeshFactory.Arc(0.55f, 1f, 360f, 40);
            sparkPool = new ComponentPool<ParticleSystem>(CreateSpark, 6, 24);
            slashPool = new ComponentPool<MeshRenderer>(CreateSlash, 4, 12);
        }

        void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
                if (hitStopping) Time.timeScale = 1f;
            }
        }

        // ------------------------------------------------------------------ API tĩnh

        public static void HitStop(float duration) { if (Instance != null) Instance.DoHitStop(duration); }
        public static void Shake(float amplitude, float duration = 0.18f) { if (Instance != null) Instance.DoShake(amplitude, duration); }
        public static void Spark(Vector3 position, Color color, int count = 14) { if (Instance != null) Instance.DoSpark(position, color, count); }
        public static void Slash(Transform owner, SwingStyle style, Color color, float radius)
        {
            if (Instance != null) Instance.DoSlash(owner, style, color, radius);
        }

        // ------------------------------------------------------------------

        void DoHitStop(float duration)
        {
            if (!enableHitStop || duration <= 0f) return;
            if (!hitStopping && Time.timeScale < 0.99f) return; // đang pause / slow-mo khác
            hitStopUntil = Mathf.Max(hitStopUntil, Time.unscaledTime + Mathf.Min(duration, maxHitStop));
            if (hitStopping) return;
            hitStopping = true;
            Time.timeScale = hitStopTimeScale;
        }

        void DoShake(float amplitude, float duration)
        {
            if (!enableCameraShake) return;
            if (cam == null) cam = FindFirstObjectByType<ThirdPersonCamera>();
            if (cam != null) cam.AddShake(amplitude, duration);
        }

        void Update()
        {
            if (hitStopping && Time.unscaledTime >= hitStopUntil)
            {
                hitStopping = false;
                var gm = GameManager.Instance;
                if (gm == null || gm.State != GameState.Paused) Time.timeScale = 1f;
            }

            float now = Time.unscaledTime;
            for (int i = liveSparks.Count - 1; i >= 0; i--)
            {
                if (now < liveSparks[i].ReleaseAt) continue;
                sparkPool.Release(liveSparks[i].Item);
                liveSparks.RemoveAt(i);
            }

            for (int i = liveSlashes.Count - 1; i >= 0; i--)
            {
                var r = liveSlashes[i].Item;
                var info = slashInfo[r];
                float t = Mathf.Clamp01((now - info.start) / info.duration);
                var c = info.color;
                c.a *= 1f - t * t;
                mpb.SetColor(ColorId, c);
                r.SetPropertyBlock(mpb);
                r.transform.localScale = info.baseScale * Mathf.Lerp(0.9f, 1.12f, t);
                if (now < liveSlashes[i].ReleaseAt) continue;
                slashPool.Release(r);
                liveSlashes.RemoveAt(i);
            }
        }

        void DoSpark(Vector3 position, Color color, int count)
        {
            var ps = sparkPool.Get();
            ps.transform.position = position;
            var main = ps.main;
            main.startColor = new ParticleSystem.MinMaxGradient(color, Color.Lerp(color, Color.white, 0.6f));
            ps.Play();
            ps.Emit(count);
            liveSparks.Add(new Timed<ParticleSystem> { Item = ps, ReleaseAt = Time.unscaledTime + 0.6f });
        }

        void DoSlash(Transform owner, SwingStyle style, Color color, float radius)
        {
            var r = slashPool.Get();
            var mf = r.GetComponent<MeshFilter>();
            mf.sharedMesh = style == SwingStyle.Spin ? ringMesh : arcMesh;

            Vector3 center = owner.position + Vector3.up * 1.1f;
            Quaternion rot = owner.rotation;
            Vector3 scale = Vector3.one * radius;
            switch (style)
            {
                case SwingStyle.SlashRight: rot *= Quaternion.Euler(0f, 0f, 8f); break;
                case SwingStyle.SlashLeft: rot *= Quaternion.Euler(0f, 0f, -8f); scale.x = -scale.x; break;
                case SwingStyle.Overhead: rot *= Quaternion.Euler(0f, 0f, 90f); center += owner.forward * 0.2f; break;
                case SwingStyle.Thrust: scale = new Vector3(radius * 0.25f, radius, radius * 1.2f); break;
                case SwingStyle.Spin: center.y -= 0.2f; break;
            }
            r.transform.SetPositionAndRotation(center, rot);
            r.transform.localScale = scale;
            float duration = style == SwingStyle.Spin ? 0.3f : 0.2f;
            slashInfo[r] = (Time.unscaledTime, duration, color, scale);
            liveSlashes.Add(new Timed<MeshRenderer> { Item = r, ReleaseAt = Time.unscaledTime + duration });
        }

        ParticleSystem CreateSpark()
        {
            var go = new GameObject("VFX_HitSpark");
            go.transform.SetParent(transform, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);

            var main = ps.main;
            main.playOnAwake = false;
            main.loop = false;
            main.duration = 0.5f;
            main.useUnscaledTime = true; // vẫn bay khi đang hit-stop
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.15f, 0.35f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(3f, 9f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.03f, 0.09f);
            main.gravityModifier = 0.8f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 64;

            var emission = ps.emission;
            emission.rateOverTime = 0f;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.08f;

            var col = ps.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = sparkMaterial;
            renderer.renderMode = ParticleSystemRenderMode.Stretch;
            renderer.velocityScale = 0.04f;
            renderer.lengthScale = 1.5f;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            go.SetActive(false);
            return ps;
        }

        MeshRenderer CreateSlash()
        {
            var go = new GameObject("VFX_Slash", typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.SetParent(transform, false);
            var r = go.GetComponent<MeshRenderer>();
            r.sharedMaterial = slashMaterial;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            go.SetActive(false);
            return r;
        }
    }
}
