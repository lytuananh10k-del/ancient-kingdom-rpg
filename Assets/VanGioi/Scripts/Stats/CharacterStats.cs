using System;
using System.Collections.Generic;
using UnityEngine;

namespace VanGioi.Stats
{
    /// <summary>
    /// Chỉ số và tài nguyên (HP / linh lực / thể lực) của một nhân vật hoặc quái vật.
    /// Hồi phục tự động, hỗ trợ cộng thêm chỉ số từ nhiều nguồn (trang bị, buff, công pháp).
    /// Không biết gì về chiến đấu – CombatSystem / EnemyAI quyết định khi nào trừ máu.
    /// </summary>
    public class CharacterStats : MonoBehaviour
    {
        [SerializeField] StatBlock baseStats = StatBlock.DefaultPlayer;

        [Header("Hồi phục")]
        [Tooltip("Hồi % HP tối đa mỗi giây khi ngoài chiến đấu.")]
        [SerializeField, Range(0f, 0.2f)] float hpRegenFraction = 0.01f;
        [SerializeField] float outOfCombatDelay = 6f;
        [SerializeField] float mpRegenPerSecond = 2f;
        [SerializeField] float staminaRegenPerSecond = 30f;
        [SerializeField] float staminaRegenDelay = 0.8f;

        readonly Dictionary<object, StatBlock> modifiers = new Dictionary<object, StatBlock>();
        StatBlock total;
        bool initialized;
        bool died;
        float lastCombatTime = -100f;
        float lastStaminaUseTime = -100f;

        public float HP { get; private set; }
        public float MP { get; private set; }
        public float Stamina { get; private set; }

        public int Level => total.level;
        public float MaxHP => Mathf.Max(1f, total.maxHP);
        public float MaxMP => Mathf.Max(0f, total.maxMP);
        public float MaxStamina => Mathf.Max(1f, total.maxStamina);
        public float Attack => Mathf.Max(0f, total.attack);
        public float Defense => Mathf.Max(0f, total.defense);
        public float CritRate => Mathf.Clamp01(total.critRate);
        public float CritDamage => Mathf.Max(1f, total.critDamage);
        public float Evasion => Mathf.Clamp(total.evasion, 0f, 0.75f);
        public bool IsDead => HP <= 0f;
        public bool InCombat => Time.time - lastCombatTime < outOfCombatDelay;
        public StatBlock BaseStats => baseStats;

        /// <summary>Chiến lực – quyết định cảnh giới (GDD mục 5).</summary>
        public long Power => (long)(MaxHP * 0.5f + MaxMP * 0.3f + Attack * 8f + Defense * 6f + CritRate * 2000f + Evasion * 2000f);

        /// <summary>(hiện tại, tối đa)</summary>
        public event Action<float, float> HealthChanged;
        /// <summary>Lượng sát thương thực nhận.</summary>
        public event Action<float> Damaged;
        public event Action Died;
        public event Action Revived;
        public event Action StatsChanged;

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (initialized) return;
            Recalculate();
            RestoreAll();
            initialized = true;
        }

        /// <summary>Đặt chỉ số gốc mới (quái vật lấy từ EnemyData) và hồi đầy.</summary>
        public void Initialize(StatBlock stats)
        {
            baseStats = stats;
            initialized = true;
            Recalculate();
            RestoreAll();
        }

        public void SetModifier(object source, StatBlock delta)
        {
            modifiers[source] = delta;
            Recalculate();
        }

        public void RemoveModifier(object source)
        {
            if (modifiers.Remove(source)) Recalculate();
        }

        void Recalculate()
        {
            total = baseStats;
            foreach (var m in modifiers.Values) total += m;
            if (initialized)
            {
                HP = Mathf.Min(HP, MaxHP);
                MP = Mathf.Min(MP, MaxMP);
                Stamina = Mathf.Min(Stamina, MaxStamina);
            }
            StatsChanged?.Invoke();
            HealthChanged?.Invoke(HP, MaxHP);
        }

        public void RestoreAll()
        {
            bool wasDead = died;
            died = false;
            HP = MaxHP;
            MP = MaxMP;
            Stamina = MaxStamina;
            HealthChanged?.Invoke(HP, MaxHP);
            if (wasDead) Revived?.Invoke();
        }

        public void MarkInCombat() => lastCombatTime = Time.time;

        /// <summary>Trừ HP. Trả về true nếu đòn này làm chết.</summary>
        public bool ApplyDamage(float amount)
        {
            EnsureInitialized();
            if (IsDead || amount <= 0f) return false;
            HP = Mathf.Max(0f, HP - amount);
            MarkInCombat();
            Damaged?.Invoke(amount);
            HealthChanged?.Invoke(HP, MaxHP);
            if (HP > 0f) return false;
            died = true;
            Died?.Invoke();
            return true;
        }

        public void Heal(float amount)
        {
            if (IsDead || amount <= 0f) return;
            HP = Mathf.Min(MaxHP, HP + amount);
            HealthChanged?.Invoke(HP, MaxHP);
        }

        public bool TrySpendStamina(float amount)
        {
            if (amount <= 0f) return true;
            if (Stamina < amount) return false;
            Stamina -= amount;
            lastStaminaUseTime = Time.time;
            return true;
        }

        /// <summary>Trừ thể lực tối đa có thể; trả về true nếu đủ.</summary>
        public bool DrainStamina(float amount)
        {
            bool enough = Stamina >= amount;
            Stamina = Mathf.Max(0f, Stamina - amount);
            lastStaminaUseTime = Time.time;
            return enough;
        }

        public bool TrySpendMP(float amount)
        {
            if (amount <= 0f) return true;
            if (MP < amount) return false;
            MP -= amount;
            return true;
        }

        void Update()
        {
            if (IsDead) return;
            float dt = Time.deltaTime;

            if (Time.time - lastStaminaUseTime > staminaRegenDelay)
                Stamina = Mathf.Min(MaxStamina, Stamina + staminaRegenPerSecond * dt);
            MP = Mathf.Min(MaxMP, MP + mpRegenPerSecond * dt);

            if (!InCombat && HP < MaxHP)
            {
                HP = Mathf.Min(MaxHP, HP + MaxHP * hpRegenFraction * dt);
                HealthChanged?.Invoke(HP, MaxHP);
            }
        }
    }
}
