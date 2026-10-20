using UnityEngine;

namespace VanGioi.Input
{
    /// <summary>
    /// Điểm duy nhất gameplay lấy input. Mỗi frame gộp PC + Mobile thành một PlayerInputState.
    /// Chạy trước mọi script gameplay nhờ DefaultExecutionOrder.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class PlayerInputHub : MonoBehaviour
    {
        public static PlayerInputHub Instance { get; private set; }

        [Tooltip("Bộ điều khiển cảm ứng. Để trống sẽ tự tìm trong scene.")]
        [SerializeField] MobileInputController mobileInput;
        [SerializeField] bool enableDesktopInput = true;
        [Tooltip("Hệ số nhân độ nhạy xoay camera bằng chuột.")]
        [SerializeField, Range(0.1f, 5f)] float mouseLookScale = 1f;
        [Tooltip("Hệ số nhân độ nhạy xoay camera bằng vuốt màn hình.")]
        [SerializeField, Range(0.1f, 5f)] float touchLookScale = 1f;

        readonly DesktopInputReader desktop = new DesktopInputReader();
        PlayerInputState state;

        /// <summary>Input của frame hiện tại.</summary>
        public PlayerInputState State => state;

        /// <summary>Chặn input gameplay (khi mở túi đồ, hội thoại...). Phím hệ thống vẫn hoạt động.</summary>
        public bool GameplayBlocked { get; set; }

        public MobileInputController Mobile => mobileInput;

        public float MouseLookScale { get => mouseLookScale; set => mouseLookScale = Mathf.Clamp(value, 0.1f, 5f); }
        public float TouchLookScale { get => touchLookScale; set => touchLookScale = Mathf.Clamp(value, 0.1f, 5f); }

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning("[PlayerInputHub] Có nhiều hơn một PlayerInputHub trong scene – huỷ bản trùng.");
                Destroy(this);
                return;
            }
            Instance = this;
            if (mobileInput == null) mobileInput = FindFirstObjectByType<MobileInputController>();
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        void Update()
        {
            var s = new PlayerInputState();

            if (enableDesktopInput)
            {
                desktop.Read(ref s);
                s.Look *= mouseLookScale;
            }

            if (mobileInput != null && mobileInput.IsActive)
            {
                var touch = new PlayerInputState();
                mobileInput.Read(ref touch);
                Merge(ref s, touch, touchLookScale);
            }

            s.Move = Vector2.ClampMagnitude(s.Move, 1f);

            if (GameplayBlocked)
            {
                // Giữ lại phím hệ thống / menu, xoá hành động gameplay.
                var blocked = new PlayerInputState
                {
                    InventoryPressed = s.InventoryPressed,
                    MapPressed = s.MapPressed,
                    PausePressed = s.PausePressed,
                    DebugTogglePressed = s.DebugTogglePressed,
                    QualityCyclePressed = s.QualityCyclePressed
                };
                s = blocked;
            }

            state = s;
        }

        static void Merge(ref PlayerInputState a, in PlayerInputState b, float lookScale)
        {
            a.Move += b.Move;
            a.Look += b.Look * lookScale;
            a.Zoom += b.Zoom;
            a.SprintHeld |= b.SprintHeld;
            a.JumpPressed |= b.JumpPressed;
            a.JumpHeld |= b.JumpHeld;
            a.WalkTogglePressed |= b.WalkTogglePressed;
            a.DodgePressed |= b.DodgePressed;
            a.AttackPressed |= b.AttackPressed;
            a.BlockHeld |= b.BlockHeld;
            a.BlockPressed |= b.BlockPressed;
            a.LockOnPressed |= b.LockOnPressed;
            a.Skill1Pressed |= b.Skill1Pressed;
            a.Skill2Pressed |= b.Skill2Pressed;
            a.Skill3Pressed |= b.Skill3Pressed;
            a.Skill4Pressed |= b.Skill4Pressed;
            a.InventoryPressed |= b.InventoryPressed;
            a.MapPressed |= b.MapPressed;
            a.PausePressed |= b.PausePressed;
        }
    }
}
