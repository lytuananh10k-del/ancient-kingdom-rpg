using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using VanGioi.Data;

namespace VanGioi.Enemies
{
    /// <summary>
    /// Khu sinh quái: tạo N quái từ EnemyData khi bắt đầu, hồi sinh sau respawnTime khi bị hạ
    /// (dùng lại chính object đó – không Instantiate/Destroy). Kéo thả vào scene và chỉnh bán kính.
    /// </summary>
    public class EnemySpawnZone : MonoBehaviour
    {
        [SerializeField] EnemyData enemy;
        [SerializeField, Min(1)] int count = 4;
        [SerializeField] float radius = 12f;
        [Tooltip("Không sinh quái dưới độ cao này (mực nước).")]
        [SerializeField] float minHeight = 10f;
        [SerializeField] float maxSlope = 35f;
        [SerializeField] bool spawnOnStart = true;

        readonly List<EnemyAI> spawned = new List<EnemyAI>();

        public EnemyData Enemy => enemy;
        public IReadOnlyList<EnemyAI> Spawned => spawned;

        public void Configure(EnemyData data, int amount, float zoneRadius, float minimumHeight)
        {
            enemy = data;
            count = amount;
            radius = zoneRadius;
            minHeight = minimumHeight;
        }

        void Start()
        {
            if (spawnOnStart) SpawnAll();
        }

        public void SpawnAll()
        {
            if (enemy == null)
            {
                Debug.LogWarning($"[EnemySpawnZone] {name}: chưa gán EnemyData.", this);
                return;
            }
            for (int i = spawned.Count; i < count; i++)
            {
                var ai = EnemyFactory.Create(enemy, FindSpawnPoint(), Quaternion.Euler(0f, Random.Range(0f, 360f), 0f), transform);
                ai.Zone = this;
                spawned.Add(ai);
            }
        }

        public void NotifyDeath(EnemyAI ai)
        {
            if (isActiveAndEnabled) StartCoroutine(RespawnLater(ai));
        }

        IEnumerator RespawnLater(EnemyAI ai)
        {
            yield return new WaitForSeconds(enemy != null ? enemy.respawnTime : 20f);
            if (ai != null) ai.Respawn(FindSpawnPoint());
        }

        Vector3 FindSpawnPoint()
        {
            var terrain = Terrain.activeTerrain;
            for (int attempt = 0; attempt < 20; attempt++)
            {
                var c = Random.insideUnitCircle * radius;
                var p = transform.position + new Vector3(c.x, 0f, c.y);
                if (terrain == null) return p + Vector3.up * 0.5f;
                var data = terrain.terrainData;
                Vector3 local = p - terrain.transform.position;
                float u = local.x / data.size.x, v = local.z / data.size.z;
                if (u < 0f || u > 1f || v < 0f || v > 1f) continue;
                float h = data.GetInterpolatedHeight(u, v) + terrain.transform.position.y;
                if (h < minHeight || data.GetSteepness(u, v) > maxSlope) continue;
                return new Vector3(p.x, h + 0.3f, p.z);
            }
            var fallback = transform.position;
            if (terrain != null) fallback.y = terrain.SampleHeight(fallback) + terrain.transform.position.y + 0.3f;
            return fallback;
        }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.3f, 0.2f, 0.6f);
            Gizmos.DrawWireSphere(transform.position, radius);
        }
    }
}
