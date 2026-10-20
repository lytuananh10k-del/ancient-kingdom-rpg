using System;
using UnityEngine;
using VanGioi.Input;
using VanGioi.UI;

namespace VanGioi.Core
{
    public enum GameState { Playing, Paused, InMenu }

    /// <summary>
    /// Điều phối cấp game: frame rate, khoá con trỏ, trạng thái Playing/Paused/InMenu,
    /// phím hệ thống (Esc, F1, F2). Các hệ thống khác (Save, Quest, World Streaming…)
    /// sẽ đăng ký vào đây ở các giai đoạn sau.
    /// </summary>
    [DefaultExecutionOrder(-300)]
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Hiệu năng")]
        [SerializeField] int desktopTargetFrameRate = 60;
        [Tooltip("30 cho máy yếu, 60 cho máy mạnh.")]
        [SerializeField] int mobileTargetFrameRate = 60;
        [Tooltip("Bật VSync trên PC (khi bật, targetFrameRate bị bỏ qua).")]
        [SerializeField] bool desktopVSync = false;

        [Header("Con trỏ chuột (PC)")]
        [SerializeField] bool lockCursorOnStart = true;

        [Header("Tham chiếu (tự tìm nếu để trống)")]
        [SerializeField] GraphicsQualityManager graphics;
        [SerializeField] DebugHUD debugHud;

        public GameState State { get; private set; } = GameState.Playing;
        public event Action<GameState> StateChanged;

        public GraphicsQualityManager Graphics => graphics;
        public bool UsingTouchControls
        {
            get
            {
                var hub = PlayerInputHub.Instance;
                return hub != null && hub.Mobile != null && hub.Mobile.IsActive;
            }
        }

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            if (graphics == null) graphics = FindFirstObjectByType<GraphicsQualityManager>();
            if (debugHud == null) debugHud = FindFirstObjectByType<DebugHUD>();

            if (Application.isMobilePlatform)
            {
                QualitySettings.vSyncCount = 0;
                Application.targetFrameRate = mobileTargetFrameRate;
                Screen.sleepTimeout = SleepTimeout.NeverSleep;
            }
            else
            {
                QualitySettings.vSyncCount = desktopVSync ? 1 : 0;
                Application.targetFrameRate = desktopTargetFrameRate;
            }
        }

        void Start()
        {
            if (lockCursorOnStart && !UsingTouchControls) SetCursorLocked(true);
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        void Update()
        {
            var hub = PlayerInputHub.Instance;
            if (hub == null) return;
            var input = hub.State;

            if (input.DebugTogglePressed && debugHud != null) debugHud.Visible = !debugHud.Visible;
            if (input.QualityCyclePressed && graphics != null) graphics.Cycle();

            if (UsingTouchControls) return;

            // PC: Esc nhả chuột; click chuột trái vào game để khoá lại.
            if (input.PausePressed)
            {
                SetCursorLocked(Cursor.lockState != CursorLockMode.Locked);
            }
            else if (State == GameState.Playing && Cursor.lockState != CursorLockMode.Locked && LeftClickThisFrame())
            {
                SetCursorLocked(true);
            }
        }

        public void SetState(GameState newState)
        {
            if (State == newState) return;
            State = newState;
            Time.timeScale = newState == GameState.Paused ? 0f : 1f;
            if (!UsingTouchControls) SetCursorLocked(newState == GameState.Playing);
            if (PlayerInputHub.Instance != null) PlayerInputHub.Instance.GameplayBlocked = newState != GameState.Playing;
            StateChanged?.Invoke(newState);
        }

        public static void SetCursorLocked(bool locked)
        {
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        static bool LeftClickThisFrame()
        {
#if ENABLE_INPUT_SYSTEM
            var mouse = UnityEngine.InputSystem.Mouse.current;
            return mouse != null && mouse.leftButton.wasPressedThisFrame;
#else
            return UnityEngine.Input.GetMouseButtonDown(0);
#endif
        }
    }
}
