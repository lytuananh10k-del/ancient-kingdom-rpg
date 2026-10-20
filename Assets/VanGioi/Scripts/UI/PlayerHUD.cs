using UnityEngine;
using UnityEngine.UI;
using VanGioi.Combat;
using VanGioi.Stats;
using VanGioi.Utils;

namespace VanGioi.UI
{
    /// <summary>
    /// HUD người chơi (uGUI, dựng bằng code): tên + cấp + cảnh giới + chiến lực,
    /// thanh Sinh lực / Linh lực / Thể lực (có vệt "máu vừa mất"), thông báo phản kích,
    /// và màn hình tử vong + đếm ngược hồi sinh. Tự co giãn theo màn hình và Safe Area.
    /// </summary>
    public class PlayerHUD : MonoBehaviour
    {
        [SerializeField] string characterName = "Tán Tu Vô Danh";
        [SerializeField] Vector2 referenceResolution = new Vector2(1920, 1080);

        sealed class Bar
        {
            public RectTransform Fill, Chip;
            public Text Label;
            public float ChipValue = 1f;
        }

        CombatSystem player;
        Canvas canvas;
        RectTransform safeArea;
        Bar hpBar, mpBar, staminaBar;
        Text header, realm, counterText, deathText, sessionText;
        Image deathOverlay;
        Font font;
        Sprite whiteSprite;
        long lastPower = -1;

        void Awake() => BuildUI();

        void Update()
        {
            if (player == null) player = CombatSystem.Player;
            if (player == null || player.Stats == null) return;
            var s = player.Stats;

            UpdateBar(hpBar, s.HP, s.MaxHP, true);
            UpdateBar(mpBar, s.MP, s.MaxMP, false);
            UpdateBar(staminaBar, s.Stamina, s.MaxStamina, false);

            long power = s.Power;
            if (power != lastPower)
            {
                lastPower = power;
                header.text = $"{characterName}   <size=22>Lv {s.Level}</size>";
                realm.text = $"{CultivationRealms.NameOf(power)}  ·  Chiến lực {power:N0}".Replace(',', '.');
            }

            counterText.enabled = player.CounterReady;
            if (counterText.enabled) counterText.color = new Color(1f, 0.85f, 0.35f, 0.65f + 0.35f * Mathf.Sin(Time.time * 12f));

            var w = WorldUI.Instance;
            sessionText.text = w != null ? $"Đã hạ {w.SessionKills}   EXP {w.SessionExp}   Lượng bạc {w.SessionGold}" : "";

            bool dead = player.State == CombatSystem.CombatState.Dead;
            deathOverlay.enabled = dead;
            deathText.enabled = dead;
            if (dead)
            {
                deathOverlay.color = new Color(0.25f, 0f, 0f, 0.45f);
                deathText.text = $"Thân tử đạo tiêu…\n<size=30>Hồi sinh tại Tàn Lão Thôn sau {Mathf.CeilToInt(player.RespawnCountdown)} giây</size>";
            }

            UpdateSafeArea();
        }

        void UpdateBar(Bar bar, float value, float max, bool showChip)
        {
            float ratio = max > 0f ? Mathf.Clamp01(value / max) : 0f;
            bar.Fill.anchorMax = new Vector2(ratio, 1f);
            if (showChip)
            {
                bar.ChipValue = ratio > bar.ChipValue ? ratio : Mathf.MoveTowards(bar.ChipValue, ratio, Time.unscaledDeltaTime * 0.35f);
                bar.Chip.anchorMax = new Vector2(bar.ChipValue, 1f);
            }
            bar.Label.text = $"{Mathf.CeilToInt(value)} / {Mathf.CeilToInt(max)}";
        }

        // ------------------------------------------------------------------ Build

        void BuildUI()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var tex = Texture2D.whiteTexture;
            whiteSprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f));

            var go = new GameObject("PlayerHUDCanvas", typeof(Canvas), typeof(CanvasScaler));
            go.transform.SetParent(transform, false);
            canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 50;
            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = referenceResolution;
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            safeArea = NewRect("SafeArea", go.transform);
            Stretch(safeArea);

            // Màn hình tử vong (phủ toàn màn hình).
            var overlayRt = NewRect("DeathOverlay", go.transform);
            Stretch(overlayRt);
            deathOverlay = overlayRt.gameObject.AddComponent<Image>();
            deathOverlay.sprite = whiteSprite;
            deathOverlay.raycastTarget = false;
            deathOverlay.enabled = false;
            deathText = NewText("DeathText", overlayRt, 52, TextAnchor.MiddleCenter, new Color(1f, 0.85f, 0.8f));
            Stretch(deathText.rectTransform);
            deathText.enabled = false;
            overlayRt.SetAsFirstSibling();

            // Khung thông tin góc trên-trái.
            var panel = NewRect("StatusPanel", safeArea);
            panel.anchorMin = panel.anchorMax = new Vector2(0f, 1f);
            panel.pivot = new Vector2(0f, 1f);
            panel.anchoredPosition = new Vector2(24f, -20f);
            panel.sizeDelta = new Vector2(470f, 160f);

            header = NewText("Header", panel, 26, TextAnchor.UpperLeft, Color.white);
            Place(header.rectTransform, 0f, 0f, 470f, 32f);
            header.supportRichText = true;
            realm = NewText("Realm", panel, 19, TextAnchor.UpperLeft, new Color(0.95f, 0.85f, 0.55f));
            Place(realm.rectTransform, 0f, 32f, 470f, 26f);

            hpBar = NewBar("HP", panel, 62f, 22f, new Color(0.80f, 0.16f, 0.14f));
            mpBar = NewBar("MP", panel, 90f, 14f, new Color(0.22f, 0.48f, 0.95f));
            staminaBar = NewBar("Stamina", panel, 108f, 10f, new Color(0.95f, 0.75f, 0.25f));
            mpBar.Label.fontSize = 12;
            staminaBar.Label.enabled = false;

            sessionText = NewText("Session", panel, 15, TextAnchor.UpperLeft, new Color(0.85f, 0.9f, 0.85f, 0.9f));
            Place(sessionText.rectTransform, 0f, 124f, 470f, 22f);

            // Thông báo phản kích (giữa-dưới).
            counterText = NewText("CounterReady", safeArea, 30, TextAnchor.MiddleCenter, new Color(1f, 0.85f, 0.35f));
            var crt = counterText.rectTransform;
            crt.anchorMin = crt.anchorMax = new Vector2(0.5f, 0.3f);
            crt.sizeDelta = new Vector2(800f, 50f);
            counterText.text = "PHẢN KÍCH SẴN SÀNG – BẤM ĐÁNH!";
            counterText.enabled = false;
        }

        Bar NewBar(string name, RectTransform parent, float y, float height, Color color)
        {
            var bg = NewRect(name + "_BG", parent);
            Place(bg, 0f, y, 420f, height);
            var bgImg = bg.gameObject.AddComponent<Image>();
            bgImg.sprite = whiteSprite;
            bgImg.color = new Color(0f, 0f, 0f, 0.6f);
            bgImg.raycastTarget = false;

            var chip = NewRect(name + "_Chip", bg);
            FillRect(chip);
            var chipImg = chip.gameObject.AddComponent<Image>();
            chipImg.sprite = whiteSprite;
            chipImg.color = new Color(1f, 0.92f, 0.8f, 0.85f);
            chipImg.raycastTarget = false;

            var fill = NewRect(name + "_Fill", bg);
            FillRect(fill);
            var fillImg = fill.gameObject.AddComponent<Image>();
            fillImg.sprite = whiteSprite;
            fillImg.color = color;
            fillImg.raycastTarget = false;

            var label = NewText(name + "_Label", bg, Mathf.RoundToInt(height * 0.75f), TextAnchor.MiddleCenter, Color.white);
            Stretch(label.rectTransform);
            return new Bar { Fill = fill, Chip = chip, Label = label };
        }

        static RectTransform NewRect(string name, Transform parent)
        {
            var rt = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            return rt;
        }

        Text NewText(string name, Transform parent, int size, TextAnchor anchor, Color color)
        {
            var rt = NewRect(name, parent);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = font;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = color;
            t.raycastTarget = false;
            t.supportRichText = true;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            var shadow = rt.gameObject.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.8f);
            shadow.effectDistance = new Vector2(1.5f, -1.5f);
            return t;
        }

        static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        /// <summary>Thanh fill neo trái: chiều rộng điều khiển bằng anchorMax.x.</summary>
        static void FillRect(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0f, 0.5f);
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        /// <summary>Đặt rect theo toạ độ góc trên-trái của parent (đơn vị canvas).</summary>
        static void Place(RectTransform rt, float x, float y, float w, float h)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, -y);
            rt.sizeDelta = new Vector2(w, h);
        }

        Rect lastSafe;

        void UpdateSafeArea()
        {
            var area = Screen.safeArea;
            if (area == lastSafe || Screen.width <= 0 || Screen.height <= 0) return;
            lastSafe = area;
            safeArea.anchorMin = new Vector2(area.xMin / Screen.width, area.yMin / Screen.height);
            safeArea.anchorMax = new Vector2(area.xMax / Screen.width, area.yMax / Screen.height);
        }
    }
}
