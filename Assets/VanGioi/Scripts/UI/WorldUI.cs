using System.Collections.Generic;
using UnityEngine;
using VanGioi.Combat;
using VanGioi.Enemies;

namespace VanGioi.UI
{
    /// <summary>
    /// UI gắn với thế giới, vẽ bằng IMGUI (nhẹ, không cần prefab):
    /// số sát thương bay lên, thanh máu + tên quái, dấu khoá mục tiêu, cảnh báo tấn công,
    /// và thông báo giữa màn hình (toast). Giai đoạn 6 có thể thay bằng UI Toolkit.
    /// </summary>
    public class WorldUI : MonoBehaviour
    {
        public static WorldUI Instance { get; private set; }

        [SerializeField] float enemyBarDistance = 30f;
        [SerializeField] float enemyNameDistance = 16f;
        [SerializeField] float numberLifetime = 0.9f;
        [SerializeField] int maxNumbers = 48;

        struct FloatingText
        {
            public Vector3 World;
            public string Text;
            public Color Color;
            public float Born;
            public float Size;
            public Vector2 Jitter;
        }

        struct ToastEntry
        {
            public string Text;
            public Color Color;
            public float Born;
        }

        readonly List<FloatingText> numbers = new List<FloatingText>();
        readonly List<ToastEntry> toasts = new List<ToastEntry>();
        Texture2D white;
        Texture2D ring;
        GUIStyle numberStyle, labelStyle, toastStyle;
        Camera cam;

        public int SessionExp { get; private set; }
        public int SessionGold { get; private set; }
        public int SessionKills { get; private set; }

        public static void Toast(string text, Color color)
        {
            if (Instance == null) return;
            var list = Instance.toasts;
            if (list.Count > 0 && list[list.Count - 1].Text == text && Time.unscaledTime - list[list.Count - 1].Born < 0.5f) return;
            list.Add(new ToastEntry { Text = text, Color = color, Born = Time.unscaledTime });
            if (list.Count > 4) list.RemoveAt(0);
        }

        public static void FloatText(Vector3 world, string text, Color color, float size = 1f)
        {
            if (Instance != null) Instance.AddNumber(world, text, color, size);
        }

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(this); return; }
            Instance = this;
            white = Texture2D.whiteTexture;
            ring = Utils.ProceduralTextures.CircleSprite(64, 0.18f).texture;
        }

        void OnEnable()
        {
            CombatEvents.HitLanded += OnHit;
            CombatEvents.EnemyKilled += OnKilled;
        }

        void OnDisable()
        {
            CombatEvents.HitLanded -= OnHit;
            CombatEvents.EnemyKilled -= OnKilled;
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        void OnHit(IDamageable victim, GameObject attacker, HitResult result, Vector3 point)
        {
            bool playerVictim = victim.Team == Team.Player;
            switch (result.Outcome)
            {
                case HitOutcome.Immune:
                    if (playerVictim) AddNumber(point, "Né!", new Color(0.6f, 0.9f, 1f), 0.9f);
                    break;
                case HitOutcome.Evaded:
                    AddNumber(point, "Trượt", new Color(0.8f, 0.8f, 0.8f), 0.85f);
                    break;
                case HitOutcome.Parried:
                    AddNumber(point, "Đỡ hoàn hảo", new Color(1f, 0.85f, 0.35f), 1.1f);
                    break;
                case HitOutcome.Blocked:
                    AddNumber(point, $"Đỡ −{result.Damage:0}", new Color(0.75f, 0.8f, 0.9f), 0.9f);
                    break;
                case HitOutcome.Critical:
                    AddNumber(point, $"{result.Damage:0}!", playerVictim ? new Color(1f, 0.3f, 0.25f) : new Color(1f, 0.75f, 0.2f), 1.45f);
                    break;
                default:
                    AddNumber(point, $"{result.Damage:0}", playerVictim ? new Color(1f, 0.45f, 0.4f) : Color.white, 1f);
                    break;
            }
        }

        void OnKilled(string enemyName, int exp, int gold)
        {
            SessionExp += exp;
            SessionGold += gold;
            SessionKills++;
            Toast($"Hạ {enemyName}   +{exp} EXP   +{gold} lượng bạc", new Color(0.85f, 1f, 0.75f));
        }

        void AddNumber(Vector3 world, string text, Color color, float size)
        {
            if (numbers.Count >= maxNumbers) numbers.RemoveAt(0);
            numbers.Add(new FloatingText
            {
                World = world, Text = text, Color = color, Born = Time.unscaledTime, Size = size,
                Jitter = new Vector2(Random.Range(-25f, 25f), Random.Range(-10f, 10f))
            });
        }

        void OnGUI()
        {
            if (Event.current.type != EventType.Repaint) return;
            if (cam == null) cam = Camera.main;
            if (cam == null) return;
            EnsureStyles();
            float scale = Mathf.Max(0.75f, Screen.height / 1080f);
            float now = Time.unscaledTime;

            DrawEnemyBars(scale);
            DrawLockOn(scale);
            DrawNumbers(scale, now);
            DrawToasts(scale, now);
        }

        void EnsureStyles()
        {
            if (numberStyle != null) return;
            numberStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, richText = false };
            labelStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.LowerCenter, fontStyle = FontStyle.Bold };
            toastStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, wordWrap = false };
        }

        bool ToScreen(Vector3 world, out Vector2 screen)
        {
            var p = cam.WorldToScreenPoint(world);
            screen = new Vector2(p.x, Screen.height - p.y);
            return p.z > 0.1f;
        }

        void DrawEnemyBars(float scale)
        {
            var player = CombatSystem.Player;
            if (player == null) return;
            Vector3 pp = player.transform.position;
            var locked = player.LockOn != null ? player.LockOn.Current : null;
            float barSqr = enemyBarDistance * enemyBarDistance;
            float nameSqr = enemyNameDistance * enemyNameDistance;
            labelStyle.fontSize = Mathf.RoundToInt(15 * scale);

            foreach (var e in EnemyAI.All)
            {
                if (!e.IsAlive || e.AimPoint == null) continue;
                float sqr = (e.transform.position - pp).sqrMagnitude;
                bool isLocked = ReferenceEquals(locked, e);
                bool recentlyHit = Time.time - e.LastDamagedTime < 6f;
                bool engaged = e.State == EnemyState.Chase || e.State == EnemyState.Attack || e.State == EnemyState.Stagger;
                if (!isLocked && (sqr > barSqr || (!recentlyHit && !engaged && sqr > nameSqr))) continue;

                float height = e.Data != null ? 0.75f * e.Data.scale : 0.8f;
                if (!ToScreen(e.AimPoint.position + Vector3.up * height, out var s)) continue;

                float w = 90f * scale, h = 8f * scale;
                var bg = new Rect(s.x - w * 0.5f, s.y, w, h);
                float ratio = e.Stats.HP / e.Stats.MaxHP;
                DrawRect(new Rect(bg.x - 1, bg.y - 1, bg.width + 2, bg.height + 2), new Color(0, 0, 0, 0.7f));
                DrawRect(new Rect(bg.x, bg.y, bg.width * ratio, bg.height), e.IsTelegraphing ? new Color(1f, 0.5f, 0.2f) : new Color(0.85f, 0.18f, 0.15f));

                if (sqr <= nameSqr || isLocked)
                {
                    int level = e.Stats.Level;
                    var content = $"{e.DisplayName}  Lv{level}";
                    GUI.color = new Color(0, 0, 0, 0.8f);
                    GUI.Label(new Rect(s.x - 150 + 1, s.y - 26 * scale + 1, 300, 24 * scale), content, labelStyle);
                    GUI.color = e.State == EnemyState.Chase || e.State == EnemyState.Attack ? new Color(1f, 0.75f, 0.7f) : Color.white;
                    GUI.Label(new Rect(s.x - 150, s.y - 26 * scale, 300, 24 * scale), content, labelStyle);
                    GUI.color = Color.white;
                }

                if (e.IsTelegraphing)
                {
                    labelStyle.fontSize = Mathf.RoundToInt(26 * scale);
                    GUI.color = new Color(1f, 0.35f, 0.2f, 0.6f + 0.4f * Mathf.Sin(Time.time * 25f));
                    GUI.Label(new Rect(s.x - 50, s.y - 58 * scale, 100, 32 * scale), "!", labelStyle);
                    GUI.color = Color.white;
                    labelStyle.fontSize = Mathf.RoundToInt(15 * scale);
                }
            }
        }

        void DrawLockOn(float scale)
        {
            var player = CombatSystem.Player;
            var target = player != null && player.LockOn != null ? player.LockOn.Current : null;
            if (target == null || target.AimPoint == null) return;
            if (!ToScreen(target.AimPoint.position, out var s)) return;
            float size = (34f + Mathf.Sin(Time.unscaledTime * 6f) * 3f) * scale;
            GUI.color = new Color(1f, 0.55f, 0.35f, 0.9f);
            GUI.DrawTexture(new Rect(s.x - size * 0.5f, s.y - size * 0.5f, size, size), ring);
            float d = 4f * scale;
            GUI.DrawTexture(new Rect(s.x - d * 0.5f, s.y - d * 0.5f, d, d), white);
            GUI.color = Color.white;
        }

        void DrawNumbers(float scale, float now)
        {
            for (int i = numbers.Count - 1; i >= 0; i--)
            {
                var n = numbers[i];
                float age = now - n.Born;
                if (age > numberLifetime)
                {
                    numbers.RemoveAt(i);
                    continue;
                }
                float t = age / numberLifetime;
                if (!ToScreen(n.World + Vector3.up * (0.4f + t * 1.1f), out var s)) continue;
                float pop = age < 0.08f ? Mathf.Lerp(1.6f, 1f, age / 0.08f) : 1f;
                numberStyle.fontSize = Mathf.RoundToInt(26f * n.Size * pop * scale);
                float alpha = t > 0.65f ? 1f - (t - 0.65f) / 0.35f : 1f;
                var rect = new Rect(s.x - 150 + n.Jitter.x * scale, s.y - 20 + n.Jitter.y * scale, 300, 40 * scale);
                GUI.color = new Color(0, 0, 0, alpha * 0.85f);
                GUI.Label(new Rect(rect.x + 2, rect.y + 2, rect.width, rect.height), n.Text, numberStyle);
                var c = n.Color;
                c.a = alpha;
                GUI.color = c;
                GUI.Label(rect, n.Text, numberStyle);
            }
            GUI.color = Color.white;
        }

        void DrawToasts(float scale, float now)
        {
            const float life = 2.4f;
            toastStyle.fontSize = Mathf.RoundToInt(24 * scale);
            float y = Screen.height * 0.24f;
            for (int i = toasts.Count - 1; i >= 0; i--)
            {
                float age = now - toasts[i].Born;
                if (age > life)
                {
                    toasts.RemoveAt(i);
                    continue;
                }
            }
            for (int i = 0; i < toasts.Count; i++)
            {
                float age = now - toasts[i].Born;
                float alpha = age < 0.15f ? age / 0.15f : age > life - 0.5f ? (life - age) / 0.5f : 1f;
                var rect = new Rect(0, y + i * 34f * scale, Screen.width, 34f * scale);
                GUI.color = new Color(0, 0, 0, alpha * 0.8f);
                GUI.Label(new Rect(rect.x + 2, rect.y + 2, rect.width, rect.height), toasts[i].Text, toastStyle);
                var c = toasts[i].Color;
                c.a = alpha;
                GUI.color = c;
                GUI.Label(rect, toasts[i].Text, toastStyle);
            }
            GUI.color = Color.white;
        }

        void DrawRect(Rect r, Color c)
        {
            GUI.color = c;
            GUI.DrawTexture(r, white);
            GUI.color = Color.white;
        }
    }
}
