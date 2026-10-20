using System;
using UnityEngine;

namespace VanGioi.Stats
{
    /// <summary>
    /// Bộ chỉ số gốc. Dùng cho nhân vật, quái vật và (Giai đoạn 4) cộng thêm từ trang bị / công pháp.
    /// Chí mạng & né tránh là xác suất 0..1; sát thương chí mạng là hệ số nhân.
    /// </summary>
    [Serializable]
    public struct StatBlock
    {
        [Min(1)] public int level;
        [Tooltip("Sinh lực")] public float maxHP;
        [Tooltip("Linh lực – dùng cho kỹ năng (Giai đoạn 3)")] public float maxMP;
        [Tooltip("Thể lực – dùng cho né / đỡ")] public float maxStamina;
        [Tooltip("Sức đánh")] public float attack;
        [Tooltip("Phòng thủ")] public float defense;
        [Range(0f, 1f), Tooltip("Tỉ lệ chí mạng")] public float critRate;
        [Tooltip("Hệ số sát thương chí mạng")] public float critDamage;
        [Range(0f, 0.75f), Tooltip("Tỉ lệ né tránh")] public float evasion;

        public static StatBlock DefaultPlayer => new StatBlock
        {
            level = 1, maxHP = 500f, maxMP = 200f, maxStamina = 100f,
            attack = 50f, defense = 30f, critRate = 0.1f, critDamage = 1.6f, evasion = 0.05f
        };

        public static StatBlock operator +(StatBlock a, StatBlock b) => new StatBlock
        {
            level = Mathf.Max(a.level, b.level),
            maxHP = a.maxHP + b.maxHP,
            maxMP = a.maxMP + b.maxMP,
            maxStamina = a.maxStamina + b.maxStamina,
            attack = a.attack + b.attack,
            defense = a.defense + b.defense,
            critRate = a.critRate + b.critRate,
            critDamage = a.critDamage + b.critDamage,
            evasion = a.evasion + b.evasion
        };
    }

    /// <summary>Bảng cảnh giới theo Chiến lực (GDD mục 5).</summary>
    public static class CultivationRealms
    {
        public static readonly (string name, long min)[] Table =
        {
            ("Phàm Nhân", 0),
            ("Linh Thai", 10_000),
            ("Ngũ Diệu", 500_000),
            ("Lục Hợp", 5_000_000),
            ("Thất Tinh", 30_000_000),
            ("Thiên Nhân", 100_000_000),
            ("Sinh Tử", 1_000_000_000),
            ("Thần Kiều", 4_000_000_000),
        };

        public static int IndexOf(long power)
        {
            for (int i = Table.Length - 1; i >= 0; i--)
                if (power >= Table[i].min) return i;
            return 0;
        }

        public static string NameOf(long power) => Table[IndexOf(power)].name;
    }
}
