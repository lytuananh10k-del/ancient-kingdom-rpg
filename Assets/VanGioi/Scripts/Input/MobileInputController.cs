using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using VanGioi.Utils;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
using ETouch = UnityEngine.InputSystem.EnhancedTouch;
#endif

namespace VanGioi.Input
{
    /// <summary>
    /// Điều khiển cảm ứng Android/iOS: joystick nổi bên trái, vuốt xoay camera bên phải,
    /// nút Đánh / Nhảy / Né / Chạy nhanh / 4 kỹ năng / Túi / Bản đồ.
    ///
    /// Giao diện được dựng bằng code lúc chạy (không cần prefab) và tự co giãn theo
    /// CanvasScaler + Safe Area (tai thỏ, bo góc). Cảm ứng được xử lý trực tiếp
    /// (không qua EventSystem) nên đa chạm ổn định và không phụ thuộc Input Module.
    /// </summary>
    [DefaultExecutionOrder(-150)]
    public class MobileInputController : MonoBehaviour
    {
        public enum ActivationMode { Auto, ForceOn, ForceOff }

        [Tooltip("Auto = chỉ bật trên thiết bị di động. ForceOn để thử trong Editor bằng chuột.")]
        [SerializeField] ActivationMode mode = ActivationMode.Auto;
        [Tooltip("Trong Editor: dùng chuột trái giả lập một ngón tay.")]
        [SerializeField] bool simulateTouchWithMouse = true;

        [Header("Bố cục (đơn vị canvas, chuẩn 1920×1080)")]
        [SerializeField] Vector2 referenceResolution = new Vector2(1920, 1080);
        [SerializeField] Vector2 joystickDefaultPosition = new Vector2(260, 240);
        [SerializeField] float joystickRadius = 120f;
        [Tooltip("Phần màn hình bên trái (0..1) dành cho joystick.")]
        [SerializeField, Range(0.2f, 0.6f)] float joystickZoneWidth = 0.42f;
        [SerializeField, Range(0f, 0.5f)] float joystickDeadZone = 0.08f;
        [SerializeField, Range(0.3f, 1f)] float idleAlpha = 0.45f;

        [Header("Camera")]
        [Tooltip("Độ nhạy vuốt (đã chuẩn hoá theo chiều cao màn hình).")]
        [SerializeField] float swipeSensitivity = 1.4f;

        public bool IsActive { get; private set; }

        enum TouchState { Began, Moved, Ended }

        struct TouchSample
        {
            public int Id;
            public Vector2 Position;
            public TouchState State;
        }

        sealed class TouchButton
        {
            public string Label;
            public RectTransform Rect;
            public Image Image;
            public Color BaseColor;
            public int TouchId = NoTouch;
            public bool Held;
            public bool Pressed;
        }

        const int NoTouch = int.MinValue;
        const int MouseTouchId = -1;

        readonly List<TouchSample> samples = new List<TouchSample>(10);
        readonly List<TouchButton> buttons = new List<TouchButton>();
        readonly HashSet<int> seenIds = new HashSet<int>();

        Canvas canvas;
        RectTransform safeArea;
        RectTransform joyBase, joyKnob;
        Image joyBaseImage, joyKnobImage;
        Rect lastSafeArea;
        Vector2Int lastScreenSize;

        int joystickTouchId = NoTouch;
        Vector2 joystickCenterAnchored;
        Vector2 moveValue;

        int lookTouchId = NoTouch;
        Vector2 lastLookPosition;
        Vector2 lookDelta;

        bool sprintToggled;
        TouchButton btnAttack, btnJump, btnDodge, btnBlock, btnSprint, btnQ, btnE, btnR, btnF, btnBag, btnMap, btnLock;

        void Awake()
        {
            IsActive = mode == ActivationMode.ForceOn ||
                       (mode == ActivationMode.Auto && Application.isMobilePlatform);
            BuildUI();
            canvas.enabled = IsActive;
        }

        void OnEnable()
        {
#if ENABLE_INPUT_SYSTEM
            ETouch.EnhancedTouchSupport.Enable();
#endif
        }

        void OnDisable()
        {
#if ENABLE_INPUT_SYSTEM
            ETouch.EnhancedTouchSupport.Disable();
#endif
            ReleaseAll();
        }

        /// <summary>Bật/tắt điều khiển cảm ứng lúc chạy (ví dụ từ menu Cài đặt).</summary>
        public void SetActive(bool active)
        {
            IsActive = active;
            if (canvas != null) canvas.enabled = active;
            if (!active) ReleaseAll();
        }

        void Update()
        {
            lookDelta = Vector2.zero;
            foreach (var b in buttons) b.Pressed = false;
            if (!IsActive) return;

            UpdateSafeArea();
            CollectTouches();
            ProcessTouches();

            if (btnSprint.Pressed) sprintToggled = !sprintToggled;
            if (moveValue.sqrMagnitude < 0.01f && joystickTouchId == NoTouch) sprintToggled = false;

            // Hiệu ứng phản hồi khi chạm.
            foreach (var b in buttons)
            {
                bool lit = b.Held || (b == btnSprint && sprintToggled);
                var c = b.BaseColor;
                c.a = lit ? 0.95f : idleAlpha;
                b.Image.color = c;
                b.Rect.localScale = Vector3.one * (b.Held ? 0.92f : 1f);
            }
            bool joyActive = joystickTouchId != NoTouch;
            joyBaseImage.color = new Color(1, 1, 1, joyActive ? 0.55f : idleAlpha * 0.6f);
            joyKnobImage.color = new Color(1, 1, 1, joyActive ? 0.9f : idleAlpha);
        }

        /// <summary>Ghi input cảm ứng của frame hiện tại vào state.</summary>
        public void Read(ref PlayerInputState s)
        {
            if (!IsActive) return;
            s.Move += moveValue;
            s.Look += lookDelta;
            s.SprintHeld |= sprintToggled;
            s.JumpPressed |= btnJump.Pressed;
            s.JumpHeld |= btnJump.Held;
            s.AttackPressed |= btnAttack.Pressed;
            s.DodgePressed |= btnDodge.Pressed;
            s.BlockHeld |= btnBlock.Held;
            s.BlockPressed |= btnBlock.Pressed;
            s.LockOnPressed |= btnLock.Pressed;
            s.Skill1Pressed |= btnQ.Pressed;
            s.Skill2Pressed |= btnE.Pressed;
            s.Skill3Pressed |= btnR.Pressed;
            s.Skill4Pressed |= btnF.Pressed;
            s.InventoryPressed |= btnBag.Pressed;
            s.MapPressed |= btnMap.Pressed;
        }

        // ---------------------------------------------------------------- Touch

        void CollectTouches()
        {
            samples.Clear();
#if ENABLE_INPUT_SYSTEM
            foreach (var t in ETouch.Touch.activeTouches)
            {
                var phase = t.phase;
                var state = phase == UnityEngine.InputSystem.TouchPhase.Began ? TouchState.Began
                    : (phase == UnityEngine.InputSystem.TouchPhase.Ended || phase == UnityEngine.InputSystem.TouchPhase.Canceled)
                        ? TouchState.Ended : TouchState.Moved;
                samples.Add(new TouchSample { Id = t.touchId, Position = t.screenPosition, State = state });
            }
            if (simulateTouchWithMouse && Application.isEditor && Mouse.current != null)
            {
                var m = Mouse.current;
                var pos = m.position.ReadValue();
                if (m.leftButton.wasPressedThisFrame) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Began });
                else if (m.leftButton.wasReleasedThisFrame) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Ended });
                else if (m.leftButton.isPressed) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Moved });
            }
#else
            for (int i = 0; i < UnityEngine.Input.touchCount; i++)
            {
                var t = UnityEngine.Input.GetTouch(i);
                var state = t.phase == UnityEngine.TouchPhase.Began ? TouchState.Began
                    : (t.phase == UnityEngine.TouchPhase.Ended || t.phase == UnityEngine.TouchPhase.Canceled)
                        ? TouchState.Ended : TouchState.Moved;
                samples.Add(new TouchSample { Id = t.fingerId, Position = t.position, State = state });
            }
            if (simulateTouchWithMouse && Application.isEditor)
            {
                var pos = (Vector2)UnityEngine.Input.mousePosition;
                if (UnityEngine.Input.GetMouseButtonDown(0)) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Began });
                else if (UnityEngine.Input.GetMouseButtonUp(0)) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Ended });
                else if (UnityEngine.Input.GetMouseButton(0)) samples.Add(new TouchSample { Id = MouseTouchId, Position = pos, State = TouchState.Moved });
            }
#endif
        }

        void ProcessTouches()
        {
            seenIds.Clear();
            foreach (var t in samples)
            {
                seenIds.Add(t.Id);
                switch (t.State)
                {
                    case TouchState.Began: OnTouchBegan(t); break;
                    case TouchState.Moved: OnTouchMoved(t); break;
                    case TouchState.Ended: OnTouchEnded(t.Id); break;
                }
            }

            // Ngón tay "biến mất" (mất focus, hệ thống huỷ) → nhả ra để không kẹt nút.
            if (joystickTouchId != NoTouch && !seenIds.Contains(joystickTouchId)) OnTouchEnded(joystickTouchId);
            if (lookTouchId != NoTouch && !seenIds.Contains(lookTouchId)) OnTouchEnded(lookTouchId);
            foreach (var b in buttons)
                if (b.TouchId != NoTouch && !seenIds.Contains(b.TouchId)) OnTouchEnded(b.TouchId);
        }

        void OnTouchBegan(TouchSample t)
        {
            foreach (var b in buttons)
            {
                if (b.TouchId == NoTouch && RectTransformUtility.RectangleContainsScreenPoint(b.Rect, t.Position, null))
                {
                    b.TouchId = t.Id;
                    b.Held = true;
                    b.Pressed = true;
                    return;
                }
            }

            if (joystickTouchId == NoTouch && t.Position.x < Screen.width * joystickZoneWidth)
            {
                joystickTouchId = t.Id;
                // Joystick nổi: đế dời tới chỗ ngón tay chạm xuống.
                joystickCenterAnchored = ScreenToAnchored(t.Position);
                joyBase.anchoredPosition = joystickCenterAnchored;
                joyKnob.anchoredPosition = Vector2.zero;
                moveValue = Vector2.zero;
                return;
            }

            if (lookTouchId == NoTouch)
            {
                lookTouchId = t.Id;
                lastLookPosition = t.Position;
            }
        }

        void OnTouchMoved(TouchSample t)
        {
            if (t.Id == joystickTouchId)
            {
                var offset = ScreenToAnchored(t.Position) - joystickCenterAnchored;
                var clamped = Vector2.ClampMagnitude(offset, joystickRadius);
                joyKnob.anchoredPosition = clamped;
                var v = clamped / joystickRadius;
                float mag = v.magnitude;
                moveValue = mag < joystickDeadZone ? Vector2.zero
                    : v.normalized * Mathf.InverseLerp(joystickDeadZone, 1f, mag);
            }
            else if (t.Id == lookTouchId)
            {
                var delta = t.Position - lastLookPosition;
                lastLookPosition = t.Position;
                // Chuẩn hoá theo chiều cao màn hình để độ nhạy như nhau trên mọi độ phân giải.
                lookDelta += delta * (1080f / Mathf.Max(1, Screen.height)) * swipeSensitivity;
            }
            else
            {
                // Ngón đang giữ nút: kéo ra khỏi nút vẫn tính là giữ (thân thiện khi chiến đấu).
            }
        }

        void OnTouchEnded(int id)
        {
            if (id == joystickTouchId)
            {
                joystickTouchId = NoTouch;
                moveValue = Vector2.zero;
                joyBase.anchoredPosition = joystickDefaultPosition;
                joyKnob.anchoredPosition = Vector2.zero;
            }
            if (id == lookTouchId) lookTouchId = NoTouch;
            foreach (var b in buttons)
            {
                if (b.TouchId != id) continue;
                b.TouchId = NoTouch;
                b.Held = false;
            }
        }

        void ReleaseAll()
        {
            if (joyBase == null) return;
            OnTouchEnded(joystickTouchId);
            lookTouchId = NoTouch;
            foreach (var b in buttons) { b.TouchId = NoTouch; b.Held = false; b.Pressed = false; }
            sprintToggled = false;
        }

        Vector2 ScreenToAnchored(Vector2 screen)
        {
            // Toạ độ trong SafeArea tính từ góc dưới-trái (khớp với anchor (0,0) của joystick).
            RectTransformUtility.ScreenPointToLocalPointInRectangle(safeArea, screen, null, out var local);
            return local + safeArea.rect.size * 0.5f;
        }

        // ---------------------------------------------------------------- UI

        void BuildUI()
        {
            var canvasGo = new GameObject("MobileControlsCanvas", typeof(Canvas), typeof(CanvasScaler));
            canvasGo.transform.SetParent(transform, false);
            canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = referenceResolution;
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            safeArea = new GameObject("SafeArea", typeof(RectTransform)).GetComponent<RectTransform>();
            safeArea.SetParent(canvasGo.transform, false);
            safeArea.anchorMin = Vector2.zero;
            safeArea.anchorMax = Vector2.one;
            safeArea.offsetMin = safeArea.offsetMax = Vector2.zero;

            var circle = ProceduralTextures.CircleSprite(128);
            var ring = ProceduralTextures.CircleSprite(256, 0.08f);
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

            // Joystick (anchor góc dưới-trái).
            joyBase = CreateImage("JoystickBase", safeArea, Vector2.zero, joystickDefaultPosition,
                joystickRadius * 2f, ring, Color.white, out joyBaseImage);
            joyKnob = CreateImage("JoystickKnob", joyBase, new Vector2(0.5f, 0.5f), Vector2.zero,
                joystickRadius * 0.9f, circle, Color.white, out joyKnobImage);

            // Nút hành động (anchor góc dưới-phải).
            var br = new Vector2(1, 0);
            var gold = new Color(0.95f, 0.80f, 0.45f);
            var jade = new Color(0.55f, 0.90f, 0.75f);
            var azure = new Color(0.55f, 0.75f, 1f);
            btnAttack = AddButton("Đánh", br, new Vector2(-200, 200), 190, gold, circle, font);
            btnJump = AddButton("Nhảy", br, new Vector2(-410, 110), 130, jade, circle, font);
            btnDodge = AddButton("Né", br, new Vector2(-180, 420), 120, jade, circle, font);
            btnBlock = AddButton("Đỡ", br, new Vector2(-200, 585), 110, jade, circle, font);
            btnSprint = AddButton("Chạy", br, new Vector2(-600, 80), 110, jade, circle, font);
            btnQ = AddButton("Q", br, new Vector2(-400, 290), 110, azure, circle, font);
            btnE = AddButton("E", br, new Vector2(-330, 450), 110, azure, circle, font);
            btnR = AddButton("R", br, new Vector2(-560, 220), 110, azure, circle, font);
            btnF = AddButton("F", br, new Vector2(-520, 400), 110, azure, circle, font);

            // Nút menu (anchor góc trên-phải).
            var tr = new Vector2(1, 1);
            btnBag = AddButton("Túi", tr, new Vector2(-90, -80), 100, Color.white, circle, font);
            btnMap = AddButton("Bản đồ", tr, new Vector2(-210, -80), 100, Color.white, circle, font);
            btnLock = AddButton("Khoá", tr, new Vector2(-330, -80), 100, new Color(1f, 0.6f, 0.5f), circle, font);
        }

        TouchButton AddButton(string label, Vector2 anchor, Vector2 pos, float size, Color color, Sprite sprite, Font font)
        {
            var rect = CreateImage("Btn_" + label, safeArea, anchor, pos, size, sprite, color, out var img);
            var textGo = new GameObject("Label", typeof(RectTransform), typeof(Text));
            var trt = textGo.GetComponent<RectTransform>();
            trt.SetParent(rect, false);
            trt.anchorMin = Vector2.zero;
            trt.anchorMax = Vector2.one;
            trt.offsetMin = trt.offsetMax = Vector2.zero;
            var text = textGo.GetComponent<Text>();
            text.font = font;
            text.text = label;
            text.alignment = TextAnchor.MiddleCenter;
            text.fontSize = Mathf.RoundToInt(size * 0.24f);
            text.fontStyle = FontStyle.Bold;
            text.color = new Color(0.1f, 0.08f, 0.06f, 0.95f);
            text.raycastTarget = false;

            var b = new TouchButton { Label = label, Rect = rect, Image = img, BaseColor = color };
            buttons.Add(b);
            return b;
        }

        static RectTransform CreateImage(string name, RectTransform parent, Vector2 anchor, Vector2 pos,
            float size, Sprite sprite, Color color, out Image image)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            var rt = go.GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(size, size);
            rt.anchoredPosition = pos;
            image = go.GetComponent<Image>();
            image.sprite = sprite;
            image.color = color;
            image.raycastTarget = false;
            return rt;
        }

        void UpdateSafeArea()
        {
            var screen = new Vector2Int(Screen.width, Screen.height);
            var area = Screen.safeArea;
            if (area == lastSafeArea && screen == lastScreenSize) return;
            lastSafeArea = area;
            lastScreenSize = screen;
            if (screen.x <= 0 || screen.y <= 0) return;
            safeArea.anchorMin = new Vector2(area.xMin / screen.x, area.yMin / screen.y);
            safeArea.anchorMax = new Vector2(area.xMax / screen.x, area.yMax / screen.y);
        }
    }
}
