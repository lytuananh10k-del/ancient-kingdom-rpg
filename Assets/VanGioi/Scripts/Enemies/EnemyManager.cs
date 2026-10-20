using System.Collections.Generic;
using UnityEngine;
using VanGioi.Combat;

namespace VanGioi.Enemies
{
    /// <summary>
    /// Quản lý quái toàn cục:
    ///  • Giới hạn số quái hoạt động: chỉ N con gần người chơi nhất (trong bán kính kích hoạt) chạy AI.
    ///  • Lượt tấn công: tối đa K con được ra đòn cùng lúc → bầy sói vây quanh thay vì cùng cắn.
    /// </summary>
    public class EnemyManager : MonoBehaviour
    {
        public static EnemyManager Instance { get; private set; }

        [SerializeField] int maxActiveDesktop = 24;
        [SerializeField] int maxActiveMobile = 12;
        [Tooltip("Quái xa hơn khoảng này sẽ ngủ (không chạy AI).")]
        [SerializeField] float activationDistance = 90f;
        [SerializeField] int maxSimultaneousAttackers = 2;
        [SerializeField] float refreshInterval = 0.25f;

        readonly HashSet<EnemyAI> attackers = new HashSet<EnemyAI>();
        readonly List<EnemyAI> sorted = new List<EnemyAI>();
        float nextRefresh;

        public CombatSystem Player => CombatSystem.Player;
        public int ActiveCount { get; private set; }
        public int MaxActive => Application.isMobilePlatform ? maxActiveMobile : maxActiveDesktop;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(this); return; }
            Instance = this;
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        void Update()
        {
            attackers.RemoveWhere(e => e == null || e.State != EnemyState.Attack);
            if (Time.time < nextRefresh) return;
            nextRefresh = Time.time + refreshInterval;
            RefreshActivation();
        }

        void RefreshActivation()
        {
            var player = Player;
            if (player == null) return;
            Vector3 p = player.transform.position;
            float maxSqr = activationDistance * activationDistance;

            sorted.Clear();
            sorted.AddRange(EnemyAI.All);
            sorted.Sort((a, b) => (a.transform.position - p).sqrMagnitude.CompareTo((b.transform.position - p).sqrMagnitude));

            int active = 0, limit = MaxActive;
            foreach (var e in sorted)
            {
                bool on = active < limit && (e.transform.position - p).sqrMagnitude <= maxSqr;
                // Quái đang giao chiến không bị tắt giữa chừng.
                if (!on && (e.State == EnemyState.Attack || e.State == EnemyState.Chase) && active < limit + 4) on = true;
                e.AIActive = on;
                if (on) active++;
            }
            ActiveCount = active;
        }

        public static bool RequestAttackToken(EnemyAI enemy)
        {
            var m = Instance;
            if (m == null) return true;
            if (m.attackers.Contains(enemy)) return true;
            if (m.attackers.Count >= m.maxSimultaneousAttackers) return false;
            m.attackers.Add(enemy);
            return true;
        }

        public static bool HasTokenOrFree(EnemyAI enemy)
        {
            var m = Instance;
            return m == null || m.attackers.Contains(enemy) || m.attackers.Count < m.maxSimultaneousAttackers;
        }

        public void ReleaseAttackToken(EnemyAI enemy) => attackers.Remove(enemy);
    }
}
