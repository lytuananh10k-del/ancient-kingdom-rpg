using System;
using UnityEngine;
using VanGioi.CameraSystem;
using VanGioi.Input;
using VanGioi.Player;

namespace VanGioi.Combat
{
    /// <summary>
    /// Khoá mục tiêu (T / chuột giữa / R3 / nút "Khoá"): chọn quái gần tâm nhìn nhất,
    /// camera bám theo mục tiêu, nhân vật luôn quay mặt về mục tiêu (strafe).
    /// Tự huỷ khoá khi mục tiêu chết, đi quá xa hoặc bị che khuất quá lâu.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class LockOnSystem : MonoBehaviour
    {
        [SerializeField] float acquireDistance = 25f;
        [SerializeField] float breakDistance = 32f;
        [Tooltip("Góc quạt (độ) quanh hướng camera để chọn mục tiêu.")]
        [SerializeField] float acquireAngle = 120f;
        [SerializeField] LayerMask occlusionMask = ~0;
        [Tooltip("Mất tầm nhìn quá lâu (giây) thì huỷ khoá.")]
        [SerializeField] float lostSightGrace = 1.5f;

        PlayerController controller;
        ThirdPersonCamera cam;
        float lostSightTime;

        public IDamageable Current { get; private set; }
        public bool HasTarget => Current != null;
        public event Action<IDamageable> TargetChanged;

        void Awake() => controller = GetComponent<PlayerController>();

        void Start() => cam = FindFirstObjectByType<ThirdPersonCamera>();

        void Update()
        {
            var hub = PlayerInputHub.Instance;
            if (hub != null && hub.State.LockOnPressed)
            {
                if (HasTarget) Release();
                else TryAcquire();
            }
            if (HasTarget) Validate();
        }

        public bool TryAcquire()
        {
            Vector3 forward = cam != null ? cam.transform.forward : transform.forward;
            var best = TargetRegistry.FindBest(transform.position, forward, acquireDistance, acquireAngle);
            if (best == null) return false;
            SetTarget(best);
            return true;
        }

        public void Release() => SetTarget(null);

        void SetTarget(IDamageable target)
        {
            Current = target;
            lostSightTime = 0f;
            var aim = target?.AimPoint;
            if (cam == null) cam = FindFirstObjectByType<ThirdPersonCamera>();
            if (cam != null) cam.SetLockTarget(aim);
            controller.FacingTarget = aim;
            TargetChanged?.Invoke(target);
        }

        void Validate()
        {
            var aim = Current.AimPoint;
            if (!Current.IsAlive || aim == null || !aim.gameObject.activeInHierarchy)
            {
                Release();
                return;
            }
            Vector3 eye = transform.position + Vector3.up * 1.6f;
            Vector3 to = aim.position - eye;
            float dist = to.magnitude;
            if (dist > breakDistance)
            {
                Release();
                return;
            }

            bool blocked = Physics.Raycast(eye, to / Mathf.Max(dist, 0.001f), out var hit, dist, occlusionMask, QueryTriggerInteraction.Ignore)
                           && !hit.collider.transform.IsChildOf(transform)
                           && hit.collider.GetComponentInParent<IDamageable>() == null;
            lostSightTime = blocked ? lostSightTime + Time.deltaTime : 0f;
            if (lostSightTime > lostSightGrace) Release();
        }
    }
}
