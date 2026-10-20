using System;
using UnityEngine;
using VanGioi.Stats;

namespace VanGioi.Combat
{
    public enum Team { Player, Enemy, Neutral }

    public enum HitOutcome
    {
        Hit,
        Critical,
        Evaded,   // né tránh theo chỉ số
        Blocked,  // đỡ thường – giảm sát thương
        Parried,  // đỡ hoàn hảo – không mất máu, kẻ địch choáng
        Immune    // đang bất tử (i-frame) / đã chết
    }

    /// <summary>Thông tin một đòn đánh gửi tới mục tiêu.</summary>
    public struct HitInfo
    {
        public GameObject Attacker;
        public CharacterStats AttackerStats;
        public Team AttackerTeam;
        public float Multiplier;
        public float PoiseDamage;
        /// <summary>Lực đẩy lùi (m/s) theo hướng Direction.</summary>
        public float Knockback;
        public Vector3 Point;
        /// <summary>Hướng đòn đánh (từ kẻ tấn công tới mục tiêu, nằm ngang).</summary>
        public Vector3 Direction;
        public bool ForceCritical;
        public bool Unblockable;
        public bool IsCounter;
    }

    public struct HitResult
    {
        public HitOutcome Outcome;
        public float Damage;
        public bool Killed;

        public bool Landed => Outcome == HitOutcome.Hit || Outcome == HitOutcome.Critical || Outcome == HitOutcome.Blocked;
        public static HitResult Immune => new HitResult { Outcome = HitOutcome.Immune };
    }

    /// <summary>Mọi thứ nhận sát thương: người chơi, quái, (sau này) vật phá được.</summary>
    public interface IDamageable
    {
        Team Team { get; }
        bool IsAlive { get; }
        /// <summary>Điểm ngắm (ngực) cho khoá mục tiêu, số sát thương, tia sét…</summary>
        Transform AimPoint { get; }
        CharacterStats Stats { get; }
        HitResult ReceiveHit(in HitInfo hit);
    }

    /// <summary>Có thể bị choáng (bị đỡ hoàn hảo, phá thế).</summary>
    public interface IStaggerable
    {
        void Stagger(float duration);
    }

    /// <summary>Sự kiện chiến đấu toàn cục – HUD, nhiệm vụ (Giai đoạn 4) và thành tựu lắng nghe ở đây.</summary>
    public static class CombatEvents
    {
        /// <summary>(nạn nhân, kẻ tấn công, kết quả, điểm trúng)</summary>
        public static event Action<IDamageable, GameObject, HitResult, Vector3> HitLanded;
        /// <summary>(tên quái, EXP, vàng)</summary>
        public static event Action<string, int, int> EnemyKilled;
        public static event Action PlayerDied;
        public static event Action PlayerRevived;

        public static void RaiseHit(IDamageable victim, GameObject attacker, HitResult result, Vector3 point)
            => HitLanded?.Invoke(victim, attacker, result, point);
        public static void RaiseEnemyKilled(string name, int exp, int gold) => EnemyKilled?.Invoke(name, exp, gold);
        public static void RaisePlayerDied() => PlayerDied?.Invoke();
        public static void RaisePlayerRevived() => PlayerRevived?.Invoke();

        /// <summary>Xoá mọi listener (gọi khi đổi scene để tránh rò rỉ tham chiếu).</summary>
        public static void Clear()
        {
            HitLanded = null;
            EnemyKilled = null;
            PlayerDied = null;
            PlayerRevived = null;
        }
    }

    public static class DamageCalculator
    {
        /// <summary>
        /// dmg = ATK × hệ số × (1 − DEF / (DEF + 500 + 10 × cấp kẻ tấn công)) × (chí mạng ? hệ số chí mạng : 1) × (0.95..1.05)
        /// Né tránh tính trước (đòn chí mạng bắt buộc không thể bị né).
        /// </summary>
        public static float Calculate(CharacterStats attacker, CharacterStats defender, float multiplier,
            bool forceCritical, out bool critical, out bool evaded)
        {
            critical = false;
            evaded = false;
            float attack = attacker != null ? attacker.Attack : 10f;
            int level = attacker != null ? attacker.Level : 1;
            float defense = defender != null ? defender.Defense : 0f;
            float evasion = defender != null ? defender.Evasion : 0f;

            if (!forceCritical && UnityEngine.Random.value < evasion)
            {
                evaded = true;
                return 0f;
            }

            float mitigation = defense / (defense + 500f + 10f * level);
            float damage = attack * multiplier * (1f - mitigation) * UnityEngine.Random.Range(0.95f, 1.05f);
            float critRate = attacker != null ? attacker.CritRate : 0f;
            if (forceCritical || UnityEngine.Random.value < critRate)
            {
                critical = true;
                damage *= attacker != null ? attacker.CritDamage : 1.5f;
            }
            return Mathf.Max(1f, Mathf.Round(damage));
        }
    }
}
