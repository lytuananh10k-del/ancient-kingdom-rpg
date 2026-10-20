using UnityEngine;
using VanGioi.Stats;

namespace VanGioi.Data
{
    /// <summary>Bộ dữ liệu dùng để dựng prototype.</summary>
    public sealed class GameDataSet
    {
        public ComboData SwordCombo;
        public WeaponData Sword;
        public EnemyData GreyWolf;
        public EnemyData AlphaWolf;
        public EnemyData IronTuskBoar;

        public ScriptableObject[] All => new ScriptableObject[] { SwordCombo, Sword, GreyWolf, AlphaWolf, IronTuskBoar };
    }

    /// <summary>
    /// Giá trị thiết kế mặc định. Menu Editor lưu chúng thành asset trong Assets/VanGioi/Data
    /// để chỉnh trong Inspector; PrototypeBootstrap tạo trực tiếp lúc chạy.
    /// </summary>
    public static class DefaultGameData
    {
        public static GameDataSet Create()
        {
            var set = new GameDataSet { SwordCombo = CreateSwordCombo() };
            set.Sword = CreateSword(set.SwordCombo);
            set.GreyWolf = CreateGreyWolf();
            set.AlphaWolf = CreateAlphaWolf();
            set.IronTuskBoar = CreateBoar();
            return set;
        }

        public static ComboData CreateSwordCombo()
        {
            var c = ScriptableObject.CreateInstance<ComboData>();
            c.name = "Combo_ThanhPhongKiemPhap";
            c.steps = new[]
            {
                new AttackStep { name = "Thanh Phong Trảm", style = SwingStyle.SlashRight, damageMultiplier = 0.9f,
                    startup = 0.12f, active = 0.12f, recovery = 0.28f, range = 2.3f, arc = 150f,
                    lungeSpeed = 3f, knockback = 1.5f, poiseDamage = 15f, staminaCost = 4f, hitStop = 0.035f, cameraShake = 0.06f },
                new AttackStep { name = "Hồi Phong Trảm", style = SwingStyle.SlashLeft, damageMultiplier = 1f,
                    startup = 0.1f, active = 0.12f, recovery = 0.3f, range = 2.3f, arc = 150f,
                    lungeSpeed = 3f, knockback = 1.5f, poiseDamage = 15f, staminaCost = 4f, hitStop = 0.035f, cameraShake = 0.06f },
                new AttackStep { name = "Lạc Nhạn Kích", style = SwingStyle.Overhead, damageMultiplier = 1.3f,
                    startup = 0.18f, active = 0.12f, recovery = 0.36f, range = 2.5f, arc = 90f,
                    lungeSpeed = 4f, knockback = 2.5f, poiseDamage = 30f, staminaCost = 6f, hitStop = 0.05f, cameraShake = 0.12f },
                new AttackStep { name = "Toàn Phong Kiếm", style = SwingStyle.Spin, damageMultiplier = 1.8f,
                    startup = 0.2f, active = 0.25f, recovery = 0.45f, range = 2.9f, arc = 360f, chainAfterRecovery = 1f,
                    lungeSpeed = 1.5f, knockback = 6f, poiseDamage = 60f, staminaCost = 10f, hitStop = 0.07f, cameraShake = 0.2f },
            };
            c.comboResetTime = 0.45f;
            c.counterAttack = new AttackStep
            {
                name = "Phản Kích · Nhất Kiếm Đoạn Hồn", style = SwingStyle.Thrust, damageMultiplier = 2.5f,
                startup = 0.06f, active = 0.12f, recovery = 0.4f, range = 2.8f, arc = 100f, chainAfterRecovery = 1f,
                lungeSpeed = 7f, knockback = 7f, poiseDamage = 100f, staminaCost = 0f, hitStop = 0.1f, cameraShake = 0.25f,
                forceCritical = true
            };
            return c;
        }

        public static WeaponData CreateSword(ComboData combo)
        {
            var w = ScriptableObject.CreateInstance<WeaponData>();
            w.name = "Weapon_ThanhPhongKiem";
            w.displayName = "Thanh Phong Kiếm";
            w.description = "Thanh kiếm sắt nhẹ của tán tu. Kiếm pháp: Thanh Phong Kiếm Pháp (4 thức).";
            w.combo = combo;
            w.bonusStats = new StatBlock { attack = 12f, critRate = 0.02f };
            return w;
        }

        public static EnemyData CreateGreyWolf()
        {
            var e = ScriptableObject.CreateInstance<EnemyData>();
            e.name = "Enemy_SoiXam";
            e.displayName = "Sói Xám";
            e.visual = EnemyVisual.Wolf;
            e.tint = new Color(0.42f, 0.42f, 0.44f);
            e.scale = 1f;
            e.stats = new StatBlock { level = 2, maxHP = 180f, maxStamina = 100f, attack = 35f, defense = 10f, critRate = 0.05f, critDamage = 1.5f, evasion = 0.08f };
            e.poise = 35f; e.staggerTime = 0.6f;
            e.walkSpeed = 2.2f; e.runSpeed = 7f; e.turnSpeed = 480f;
            e.detectRange = 15f; e.detectAngle = 150f; e.loseRange = 28f; e.leashRange = 45f; e.patrolRadius = 10f;
            e.packAlertRadius = 16f;
            e.attackKind = EnemyAttackKind.Melee;
            e.attackRange = 1.9f; e.attackRadius = 1.1f; e.attackCooldown = 1.8f;
            e.windup = 0.55f; e.strikeDuration = 0.18f; e.recovery = 0.55f;
            e.attackMultiplier = 1f; e.attackPoise = 20f; e.attackKnockback = 2.5f;
            e.respawnTime = 20f; e.expReward = 12; e.goldReward = 3;
            return e;
        }

        public static EnemyData CreateAlphaWolf()
        {
            var e = CreateGreyWolf();
            e.name = "Enemy_SoiDauDan";
            e.displayName = "Sói Đầu Đàn";
            e.tint = new Color(0.22f, 0.20f, 0.22f);
            e.scale = 1.45f;
            e.stats = new StatBlock { level = 5, maxHP = 750f, maxStamina = 100f, attack = 58f, defense = 25f, critRate = 0.1f, critDamage = 1.6f, evasion = 0.05f };
            e.poise = 90f; e.staggerTime = 0.8f;
            e.runSpeed = 7.5f;
            e.detectRange = 18f;
            e.attackRange = 2.5f; e.attackRadius = 1.5f; e.attackCooldown = 1.5f;
            e.windup = 0.7f; e.attackMultiplier = 1.3f; e.attackPoise = 45f; e.attackKnockback = 5f;
            e.respawnTime = 45f; e.expReward = 80; e.goldReward = 25;
            return e;
        }

        public static EnemyData CreateBoar()
        {
            var e = ScriptableObject.CreateInstance<EnemyData>();
            e.name = "Enemy_LonRungNanhSat";
            e.displayName = "Lợn Rừng Nanh Sắt";
            e.visual = EnemyVisual.Boar;
            e.tint = new Color(0.36f, 0.25f, 0.18f);
            e.scale = 1f;
            e.stats = new StatBlock { level = 3, maxHP = 420f, maxStamina = 100f, attack = 55f, defense = 40f, critRate = 0.05f, critDamage = 1.5f, evasion = 0f };
            e.poise = 70f; e.staggerTime = 0.9f;
            e.walkSpeed = 1.6f; e.runSpeed = 5f; e.turnSpeed = 260f;
            e.detectRange = 12f; e.detectAngle = 120f; e.loseRange = 24f; e.leashRange = 40f; e.patrolRadius = 8f;
            e.packAlertRadius = 0f;
            e.attackKind = EnemyAttackKind.Charge;
            e.attackRange = 9f; e.attackRadius = 1.3f; e.attackCooldown = 3f;
            e.windup = 0.85f; e.strikeDuration = 0.2f; e.recovery = 1.1f;
            e.attackMultiplier = 1.4f; e.attackPoise = 60f; e.attackKnockback = 8f;
            e.chargeSpeed = 13f; e.chargeDuration = 1.1f;
            e.respawnTime = 25f; e.expReward = 25; e.goldReward = 8;
            return e;
        }
    }
}
