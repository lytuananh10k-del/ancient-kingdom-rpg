using UnityEngine;
using VanGioi.Core;
using VanGioi.Player;

namespace VanGioi.UI
{
    /// <summary>
    /// HUD gỡ lỗi (IMGUI – không cần prefab): FPS, mức đồ hoạ, trạng thái di chuyển,
    /// tốc độ, toạ độ và bảng phím. F1 bật/tắt, F2 đổi mức đồ hoạ.
    /// </summary>
    public class DebugHUD : MonoBehaviour
    {
        [SerializeField] bool visible = true;
        [SerializeField] bool showControls = true;
        [Tooltip("Khoảng cách từ mép trên (chừa chỗ cho PlayerHUD).")]
        [SerializeField] float top = 185f;

        float Top => top;

        PlayerController player;
        GraphicsQualityManager graphics;
        float fpsSmoothed = 60f;
        float worstFrameMs;
        float worstFrameTimer;
        GUIStyle box, label;

        public bool Visible { get => visible; set => visible = value; }

        void Start()
        {
            player = FindFirstObjectByType<PlayerController>();
            graphics = FindFirstObjectByType<GraphicsQualityManager>();
        }

        void Update()
        {
            float dt = Time.unscaledDeltaTime;
            if (dt > 0f) fpsSmoothed = Mathf.Lerp(fpsSmoothed, 1f / dt, 0.05f);
            worstFrameTimer += dt;
            worstFrameMs = Mathf.Max(worstFrameMs, dt * 1000f);
            if (worstFrameTimer > 2f) { worstFrameTimer = 0f; worstFrameMs = dt * 1000f; }
        }

        void OnGUI()
        {
            if (!visible) return;
            if (box == null)
            {
                box = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.UpperLeft, padding = new RectOffset(10, 10, 8, 8) };
                label = new GUIStyle(GUI.skin.label) { fontSize = 15, richText = true };
            }

            float scale = Mathf.Max(1f, Screen.height / 1080f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));

            var text = $"<b>VÂN GIỚI TRUYỀN KỲ 3D</b> – Prototype Giai đoạn 2\n" +
                       $"FPS: <b>{fpsSmoothed:0}</b>   (frame chậm nhất 2s: {worstFrameMs:0.0} ms)\n" +
                       $"Đồ hoạ: <b>{(graphics != null ? graphics.CurrentTier.ToString() : "-")}</b>";
            if (player != null)
            {
                var p = player.transform.position;
                text += $"\nTrạng thái: <b>{player.State}</b>{(player.WalkToggled ? " (đi bộ)" : "")}   " +
                        $"Tốc độ: {player.HorizontalSpeed:0.0} m/s   Vy: {player.VerticalVelocity:0.0}\n" +
                        $"Chạm đất: {player.IsGrounded}   Dốc: {player.SlopeAngle:0}°{(player.OnSteepSlope ? " (quá dốc)" : "")}\n" +
                        $"Vị trí: ({p.x:0.0}, {p.y:0.0}, {p.z:0.0})";
            }

            bool touch = GameManager.Instance != null && GameManager.Instance.UsingTouchControls;
            if (showControls)
            {
                text += touch
                    ? "\n\n<b>Cảm ứng</b>: joystick trái · vuốt phải xoay camera · Đánh / Né / Đỡ / Khoá"
                    : "\n\n<b>Phím</b>: WASD di chuyển · Chuột xoay · Lăn chuột zoom\n" +
                      "Shift chạy nhanh · Space nhảy · CapsLock đi bộ\n" +
                      "Chuột trái đánh (combo 4 đòn) · Chuột phải đỡ · Ctrl né · T khoá mục tiêu\n" +
                      "Esc nhả/khoá chuột · F1 ẩn HUD · F2 đổi đồ hoạ";
            }

            var content = new GUIContent(text);
            float width = 470f;
            float height = label.CalcHeight(content, width - 20f) + 16f;
            GUI.Box(new Rect(10, Top, width, height), GUIContent.none, box);
            GUI.Label(new Rect(20, Top + 6, width - 20f, height), content, label);
        }
    }
}
