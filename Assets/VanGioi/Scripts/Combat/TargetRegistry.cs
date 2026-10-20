using System.Collections.Generic;
using UnityEngine;

namespace VanGioi.Combat
{
    /// <summary>
    /// Danh sách mục tiêu chiến đấu đang tồn tại (quái tự đăng ký khi bật / huỷ khi tắt).
    /// Dùng cho khoá mục tiêu, tự xoay về phía quái và HUD – tránh FindObjectsOfType mỗi frame.
    /// </summary>
    public static class TargetRegistry
    {
        static readonly List<IDamageable> enemies = new List<IDamageable>();

        public static IReadOnlyList<IDamageable> Enemies => enemies;

        public static void Register(IDamageable target)
        {
            if (target != null && !enemies.Contains(target)) enemies.Add(target);
        }

        public static void Unregister(IDamageable target) => enemies.Remove(target);

        /// <summary>
        /// Tìm mục tiêu còn sống tốt nhất: gần nhất theo khoảng cách + độ lệch góc so với
        /// hướng tham chiếu. Trả về null nếu không có.
        /// </summary>
        public static IDamageable FindBest(Vector3 origin, Vector3 referenceDirection, float maxDistance,
            float maxAngle, IDamageable exclude = null, float anglePenalty = 0.05f)
        {
            referenceDirection.y = 0f;
            if (referenceDirection.sqrMagnitude < 0.0001f) referenceDirection = Vector3.forward;
            IDamageable best = null;
            float bestScore = float.MaxValue;
            float maxSqr = maxDistance * maxDistance;
            for (int i = 0; i < enemies.Count; i++)
            {
                var e = enemies[i];
                if (e == null || ReferenceEquals(e, exclude) || !e.IsAlive || e.AimPoint == null) continue;
                Vector3 to = e.AimPoint.position - origin;
                to.y = 0f;
                float sqr = to.sqrMagnitude;
                if (sqr > maxSqr) continue;
                float angle = sqr > 0.01f ? Vector3.Angle(referenceDirection, to) : 0f;
                if (angle > maxAngle * 0.5f) continue;
                float score = Mathf.Sqrt(sqr) + angle * anglePenalty;
                if (score < bestScore)
                {
                    bestScore = score;
                    best = e;
                }
            }
            return best;
        }

        public static void Clear() => enemies.Clear();
    }
}
