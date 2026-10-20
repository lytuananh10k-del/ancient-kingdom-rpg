using UnityEngine;
using VanGioi.Stats;

namespace VanGioi.Data
{
    public enum EnemyVisual { Wolf, Boar }
    public enum EnemyAttackKind { Melee, Charge }

    [CreateAssetMenu(menuName = "Vân Giới/Quái vật/Enemy Data", fileName = "Enemy_New")]
    public class EnemyData : ScriptableObject
    {
        [Header("Nhận dạng")]
        public string displayName = "Yêu Thú";
        [Tooltip("Prefab model (tuỳ chọn, có Animator). Để trống dùng model placeholder theo Visual.")]
        public GameObject prefab;
        public EnemyVisual visual = EnemyVisual.Wolf;
        public Color tint = new Color(0.45f, 0.45f, 0.48f);
        [Min(0.3f)] public float scale = 1f;

        [Header("Chỉ số")]
        public StatBlock stats = new StatBlock
        {
            level = 1, maxHP = 180f, maxMP = 0f, maxStamina = 100f,
            attack = 35f, defense = 10f, critRate = 0.05f, critDamage = 1.5f, evasion = 0.05f
        };
        [Tooltip("Ngưỡng phá thế: tích đủ poise damage sẽ bị choáng.")]
        public float poise = 40f;
        public float staggerTime = 0.6f;

        [Header("Di chuyển")]
        public float walkSpeed = 2f;
        public float runSpeed = 6.5f;
        public float turnSpeed = 420f;

        [Header("Nhận biết")]
        public float detectRange = 14f;
        [Range(10f, 360f)] public float detectAngle = 140f;
        [Tooltip("Mất dấu khi người chơi xa hơn khoảng này.")]
        public float loseRange = 28f;
        [Tooltip("Không đuổi quá xa vị trí gốc.")]
        public float leashRange = 45f;
        public float patrolRadius = 10f;
        [Tooltip("Báo động đồng loại trong bán kính này khi phát hiện / bị đánh.")]
        public float packAlertRadius = 0f;

        [Header("Tấn công")]
        public EnemyAttackKind attackKind = EnemyAttackKind.Melee;
        public float attackRange = 2f;
        public float attackRadius = 1.2f;
        public float attackCooldown = 1.8f;
        [Tooltip("Thời gian báo hiệu (thân loé đỏ) – cửa sổ để người chơi đỡ hoàn hảo hoặc né.")]
        public float windup = 0.55f;
        public float strikeDuration = 0.2f;
        public float recovery = 0.6f;
        public float attackMultiplier = 1f;
        public float attackPoise = 20f;
        public float attackKnockback = 3f;
        public float chargeSpeed = 12f;
        public float chargeDuration = 1f;

        [Header("Hồi sinh & phần thưởng")]
        public float respawnTime = 20f;
        public int expReward = 10;
        public int goldReward = 3;
    }
}
