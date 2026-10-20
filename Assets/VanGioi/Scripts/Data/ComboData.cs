using System;
using UnityEngine;
using VanGioi.Stats;

namespace VanGioi.Data
{
    /// <summary>Kiểu vung kiếm – quyết định tư thế placeholder và hướng vệt kiếm khí.</summary>
    public enum SwingStyle { SlashRight, SlashLeft, Overhead, Thrust, Spin }

    /// <summary>
    /// Một đòn trong chuỗi combo. Thời gian tính bằng giây:
    /// [Startup – chuẩn bị] → [Active – vùng gây sát thương] → [Recovery – thu chiêu].
    /// Khi có animation thật, chỉnh 3 mốc này khớp với clip (xem PHASE2_GUIDE).
    /// </summary>
    [Serializable]
    public class AttackStep
    {
        public string name = "Trảm";
        public SwingStyle style = SwingStyle.SlashRight;
        [Min(0f)] public float damageMultiplier = 1f;
        [Min(0f)] public float startup = 0.12f;
        [Min(0.01f)] public float active = 0.12f;
        [Min(0f)] public float recovery = 0.3f;
        [Tooltip("Từ giây này trở đi, bấm đánh sẽ được ghi nhận để nối đòn kế tiếp.")]
        [Min(0f)] public float comboInputOpen = 0.08f;
        [Tooltip("Tỉ lệ thời gian thu chiêu phải trôi qua trước khi nối đòn (0 = nối ngay sau Active).")]
        [Range(0f, 1f)] public float chainAfterRecovery = 0.25f;

        [Header("Vùng đánh")]
        [Tooltip("Bán kính tầm với tính từ nhân vật.")]
        [Min(0.5f)] public float range = 2.3f;
        [Tooltip("Góc quạt (độ). 360 = đánh xoay vòng.")]
        [Range(10f, 360f)] public float arc = 150f;

        [Header("Cảm giác")]
        [Tooltip("Tốc độ lao tới trong lúc ra đòn (m/s).")]
        public float lungeSpeed = 3f;
        public float knockback = 2f;
        public float poiseDamage = 20f;
        public float staminaCost = 5f;
        public float hitStop = 0.04f;
        public float cameraShake = 0.08f;
        public bool forceCritical;

        public float Duration => startup + active + recovery;
        public float ActiveEnd => startup + active;
    }

    [CreateAssetMenu(menuName = "Vân Giới/Chiến đấu/Combo", fileName = "Combo_New")]
    public class ComboData : ScriptableObject
    {
        public AttackStep[] steps = Array.Empty<AttackStep>();
        [Tooltip("Sau khi đòn kết thúc, bấm đánh trong khoảng này vẫn nối được đòn kế tiếp.")]
        public float comboResetTime = 0.45f;
        [Tooltip("Đòn phản kích sau khi đỡ hoàn hảo.")]
        public AttackStep counterAttack = new AttackStep();
    }
}
