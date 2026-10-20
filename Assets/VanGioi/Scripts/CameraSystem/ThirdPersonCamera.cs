using UnityEngine;
using VanGioi.Input;
using VanGioi.Player;

namespace VanGioi.CameraSystem
{
    /// <summary>
    /// Camera góc nhìn thứ ba xoay 360° quanh nhân vật:
    /// chuột / vuốt / cần phải tay cầm, zoom bằng con lăn, bám theo mượt,
    /// tránh xuyên tường (SphereCast) và không chui xuống dưới địa hình.
    /// Đặt trên GameObject có Camera (thường là Main Camera).
    /// </summary>
    [DisallowMultipleComponent]
    public class ThirdPersonCamera : MonoBehaviour
    {
        [Header("Mục tiêu")]
        [Tooltip("Thường là object Player. Để trống sẽ tự tìm PlayerController.")]
        [SerializeField] Transform target;
        [Tooltip("Điểm camera xoay quanh, tính từ chân nhân vật (≈ ngang vai).")]
        [SerializeField] Vector3 pivotOffset = new Vector3(0f, 1.55f, 0f);
        [Tooltip("Lệch sang phải (over-the-shoulder). 0 = chính giữa.")]
        [SerializeField] float shoulderOffset = 0.35f;

        [Header("Xoay")]
        [Tooltip("Độ / pixel chuột.")]
        [SerializeField] float sensitivity = 0.12f;
        [SerializeField] bool invertY = false;
        [SerializeField] float minPitch = -35f;
        [SerializeField] float maxPitch = 75f;
        [SerializeField] float startPitch = 12f;

        [Header("Zoom")]
        [SerializeField] float distance = 5f;
        [SerializeField] float minDistance = 1.6f;
        [SerializeField] float maxDistance = 12f;
        [SerializeField] float zoomStep = 1f;
        [SerializeField] float zoomSmoothTime = 0.12f;

        [Header("Bám theo")]
        [Tooltip("Độ trễ khi bám nhân vật (giây). 0 = dính chặt.")]
        [SerializeField] float followSmoothTime = 0.05f;
        [Tooltip("Độ trễ riêng theo trục dọc – làm cú nhảy trông mềm hơn.")]
        [SerializeField] float verticalFollowSmoothTime = 0.12f;

        [Header("Va chạm")]
        [SerializeField] LayerMask collisionMask = ~0;
        [SerializeField] float collisionRadius = 0.25f;
        [SerializeField] float collisionBuffer = 0.1f;
        [Tooltip("Tốc độ camera lùi ra lại sau khi hết bị che (m/s).")]
        [SerializeField] float recoverSpeed = 6f;
        [SerializeField] float minTerrainClearance = 0.4f;

        float yaw, pitch;
        float targetDistance, zoomDistance, zoomVelocity, currentDistance;
        Vector3 smoothedPivot;
        Vector3 pivotVelocity;
        float verticalVelocity;
        bool initialized;
        readonly RaycastHit[] hits = new RaycastHit[16];

        public Transform Target => target;
        public float Yaw => yaw;
        public float Pitch => pitch;
        public float Sensitivity { get => sensitivity; set => sensitivity = Mathf.Max(0.01f, value); }
        public bool InvertY { get => invertY; set => invertY = value; }

        /// <summary>Đổi mục tiêu (ví dụ chuyển sang phi kiếm hay boss cutscene).</summary>
        public void SetTarget(Transform newTarget, bool snap = true)
        {
            target = newTarget;
            if (snap) Snap();
        }

        /// <summary>Hướng camera theo yaw/pitch cho trước (dùng cho khoá mục tiêu ở Giai đoạn 2).</summary>
        public void SetOrientation(float newYaw, float newPitch)
        {
            yaw = newYaw;
            pitch = Mathf.Clamp(newPitch, minPitch, maxPitch);
        }

        void Start()
        {
            if (target == null)
            {
                var player = FindFirstObjectByType<PlayerController>();
                if (player != null) target = player.transform;
            }
            yaw = target != null ? target.eulerAngles.y : transform.eulerAngles.y;
            pitch = startPitch;
            targetDistance = zoomDistance = currentDistance = Mathf.Clamp(distance, minDistance, maxDistance);
            Snap();
        }

        void Snap()
        {
            if (target == null) return;
            smoothedPivot = target.position + pivotOffset;
            pivotVelocity = Vector3.zero;
            verticalVelocity = 0f;
            initialized = true;
            ApplyTransform(0f);
        }

        void LateUpdate()
        {
            if (target == null) return;
            if (!initialized) Snap();
            float dt = Time.deltaTime;

            var input = PlayerInputHub.Instance != null ? PlayerInputHub.Instance.State : default;
            yaw = Mathf.Repeat(yaw + input.Look.x * sensitivity, 360f);
            pitch = Mathf.Clamp(pitch + input.Look.y * sensitivity * (invertY ? 1f : -1f), minPitch, maxPitch);
            if (Mathf.Abs(input.Zoom) > 0.01f)
                targetDistance = Mathf.Clamp(targetDistance - input.Zoom * zoomStep, minDistance, maxDistance);

            // Bám theo: ngang nhanh, dọc chậm hơn một chút.
            Vector3 desired = target.position + pivotOffset;
            Vector3 horizontal = Vector3.SmoothDamp(new Vector3(smoothedPivot.x, 0, smoothedPivot.z),
                new Vector3(desired.x, 0, desired.z), ref pivotVelocity, followSmoothTime);
            float vertical = Mathf.SmoothDamp(smoothedPivot.y, desired.y, ref verticalVelocity, verticalFollowSmoothTime);
            smoothedPivot = new Vector3(horizontal.x, vertical, horizontal.z);

            zoomDistance = Mathf.SmoothDamp(zoomDistance, targetDistance, ref zoomVelocity, zoomSmoothTime);
            ApplyTransform(dt);
        }

        void ApplyTransform(float dt)
        {
            var rot = Quaternion.Euler(pitch, yaw, 0f);
            // Vai lệch bị thu lại khi camera kéo gần, tránh nhìn xuyên đầu nhân vật.
            float shoulder = shoulderOffset * Mathf.InverseLerp(minDistance * 0.5f, minDistance * 2f, currentDistance);
            Vector3 pivot = smoothedPivot + rot * Vector3.right * shoulder;
            Vector3 back = rot * Vector3.back;

            float allowed = CollisionDistance(smoothedPivot, pivot, back, zoomDistance);
            currentDistance = dt <= 0f || allowed < currentDistance
                ? allowed
                : Mathf.MoveTowards(currentDistance, allowed, recoverSpeed * dt);

            Vector3 position = pivot + back * currentDistance;

            var terrain = Terrain.activeTerrain;
            if (terrain != null)
            {
                float ground = terrain.SampleHeight(position) + terrain.transform.position.y + minTerrainClearance;
                if (position.y < ground) position.y = ground;
            }

            transform.SetPositionAndRotation(position, rot);
        }

        float CollisionDistance(Vector3 safeOrigin, Vector3 pivot, Vector3 direction, float maxDistance)
        {
            // Đảm bảo điểm vai lệch không nằm trong tường.
            Vector3 toPivot = pivot - safeOrigin;
            if (toPivot.sqrMagnitude > 0.0001f &&
                Physics.SphereCast(safeOrigin, collisionRadius, toPivot.normalized, out var sideHit, toPivot.magnitude,
                    collisionMask, QueryTriggerInteraction.Ignore) && !IsTarget(sideHit.collider))
            {
                return minDistance * 0.5f;
            }

            int count = Physics.SphereCastNonAlloc(pivot, collisionRadius, direction, hits, maxDistance,
                collisionMask, QueryTriggerInteraction.Ignore);
            float best = maxDistance;
            for (int i = 0; i < count; i++)
            {
                var h = hits[i];
                if (h.collider == null || IsTarget(h.collider)) continue;
                if (h.distance <= 0f) continue; // bắt đầu chồng lấn
                best = Mathf.Min(best, h.distance - collisionBuffer);
            }
            return Mathf.Max(best, 0.2f);
        }

        bool IsTarget(Collider c) => target != null && (c.transform == target || c.transform.IsChildOf(target));

        void OnValidate()
        {
            minDistance = Mathf.Max(0.3f, minDistance);
            maxDistance = Mathf.Max(minDistance, maxDistance);
            distance = Mathf.Clamp(distance, minDistance, maxDistance);
            maxPitch = Mathf.Clamp(maxPitch, minPitch, 89f);
        }
    }
}
