using UnityEngine;

namespace VanGioi.Input
{
    /// <summary>
    /// Ảnh chụp input của một frame, đã gộp bàn phím/chuột, tay cầm và cảm ứng.
    /// Gameplay chỉ đọc struct này – không gọi trực tiếp API input của Unity –
    /// nên đổi thiết bị điều khiển không ảnh hưởng PlayerController / Camera / Combat.
    /// </summary>
    public struct PlayerInputState
    {
        /// <summary>Hướng di chuyển (x = phải, y = tiến), độ lớn 0..1.</summary>
        public Vector2 Move;
        /// <summary>Độ xoay camera theo "pixel" của frame này.</summary>
        public Vector2 Look;
        /// <summary>Số nấc zoom (+ = lại gần, - = ra xa).</summary>
        public float Zoom;

        public bool SprintHeld;
        public bool JumpPressed;
        public bool JumpHeld;
        public bool WalkTogglePressed;

        // Dành cho Giai đoạn 2–4 (đã nối phím sẵn).
        public bool DodgePressed;
        public bool AttackPressed;
        public bool BlockHeld;     // chuột phải (khi đã khoá chuột) – đỡ đòn
        public bool BlockPressed;  // frame bắt đầu đỡ – dùng cho đỡ hoàn hảo
        public bool LockOnPressed;
        public bool Skill1Pressed; // Q – Kiếm Khí Trảm
        public bool Skill2Pressed; // E – Vạn Kiếm Quy Tông
        public bool Skill3Pressed; // R – Thiên Lôi Quyết
        public bool Skill4Pressed; // F – Hộ Thể Chân Khí
        public bool InventoryPressed; // Tab
        public bool MapPressed;       // M

        // Hệ thống.
        public bool PausePressed;          // Esc
        public bool DebugTogglePressed;    // F1
        public bool QualityCyclePressed;   // F2
    }
}
