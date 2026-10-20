using System;
using UnityEngine;
using VanGioi.Input;

namespace VanGioi.Player
{
    public enum MovementState { Idle, Walk, Run, Sprint, Jump, Fall }

    /// <summary>
    /// Di chuyển nhân vật góc nhìn thứ ba bằng CharacterController:
    /// đi / chạy / chạy nhanh tương đối theo camera, nhảy (coyote time + jump buffer +
    /// độ cao nhảy thay đổi theo thời gian giữ phím), trọng lực, bám dốc khi xuống dốc,
    /// trượt khỏi dốc quá đứng, đẩy vật thể Rigidbody và hồi sinh khi rơi khỏi bản đồ.
    ///
    /// Script này KHÔNG biết gì về model/animation – PlayerAnimationController đọc các
    /// thuộc tính public để điều khiển Animator, nên có thể thay model tuỳ ý.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Tham chiếu")]
        [Tooltip("Camera dùng để tính hướng di chuyển. Để trống sẽ dùng Camera.main.")]
        [SerializeField] Transform cameraTransform;

        [Header("Tốc độ (m/s)")]
        [SerializeField] float walkSpeed = 2.2f;
        [SerializeField] float runSpeed = 5.5f;
        [SerializeField] float sprintSpeed = 9f;
        [Tooltip("Joystick đẩy dưới ngưỡng này thì đi bộ.")]
        [SerializeField, Range(0.1f, 0.9f)] float walkInputThreshold = 0.55f;
        [SerializeField] float acceleration = 28f;
        [SerializeField] float deceleration = 36f;
        [Tooltip("Tốc độ xoay người (độ/giây).")]
        [SerializeField] float turnSpeed = 720f;
        [Tooltip("Tỉ lệ khả năng điều hướng khi đang ở trên không.")]
        [SerializeField, Range(0f, 1f)] float airControl = 0.35f;

        [Header("Nhảy & trọng lực")]
        [SerializeField] float jumpHeight = 1.5f;
        [SerializeField] float gravity = -25f;
        [Tooltip("Rơi nhanh hơn lúc lên → cú nhảy chắc tay hơn.")]
        [SerializeField] float fallGravityMultiplier = 1.6f;
        [Tooltip("Nhả phím nhảy sớm → nhảy thấp hơn.")]
        [SerializeField] float lowJumpGravityMultiplier = 2.2f;
        [SerializeField] float terminalVelocity = 55f;
        [Tooltip("Vẫn nhảy được trong khoảng này sau khi rời mép.")]
        [SerializeField] float coyoteTime = 0.15f;
        [Tooltip("Bấm nhảy hơi sớm trước khi chạm đất vẫn được tính.")]
        [SerializeField] float jumpBufferTime = 0.15f;

        [Header("Mặt đất")]
        [SerializeField] LayerMask groundMask = ~0;
        [Tooltip("Khoảng dò mặt đất bên dưới chân.")]
        [SerializeField] float groundProbeDistance = 0.2f;
        [Tooltip("Khoảng tối đa kéo nhân vật bám xuống khi chạy xuống dốc / bậc thềm.")]
        [SerializeField] float groundSnapDistance = 0.6f;
        [SerializeField] float groundStickVelocity = -2f;
        [Tooltip("Lực đẩy khỏi dốc quá đứng (lớn hơn Slope Limit của CharacterController).")]
        [SerializeField] float steepSlopeSlideSpeed = 5f;

        [Header("Tương tác vật lý")]
        [SerializeField] float pushPower = 2f;

        [Header("An toàn")]
        [Tooltip("Rơi thấp hơn độ cao này sẽ hồi sinh về điểm hồi sinh.")]
        [SerializeField] float fallResetHeight = -40f;

        CharacterController cc;
        PlayerInputHub hub;
        readonly RaycastHit[] probeHits = new RaycastHit[8];

        Vector3 planarVelocity;
        float verticalVelocity;
        float lastGroundedTime = -10f;
        float lastJumpPressedTime = -10f;
        bool hasJumpedSinceGrounded;
        bool walkToggled;
        Vector3 respawnPoint;
        float airborneMinVerticalVelocity;
        Vector3 velocityOverride;
        bool hasVelocityOverride;
        bool rotationOverridden;

        // ---------------------------------------------------------------- Public API

        public bool IsGrounded { get; private set; }
        public bool OnSteepSlope { get; private set; }
        public Vector3 GroundNormal { get; private set; } = Vector3.up;
        public float SlopeAngle { get; private set; }
        public MovementState State { get; private set; }
        public Vector3 Velocity => planarVelocity + Vector3.up * verticalVelocity;
        public float HorizontalSpeed => planarVelocity.magnitude;
        public float VerticalVelocity => verticalVelocity;
        public float WalkSpeed => walkSpeed;
        public float RunSpeed => runSpeed;
        public float SprintSpeed => sprintSpeed;
        public bool WalkToggled => walkToggled;
        public CharacterController Controller => cc;

        /// <summary>Khoá di chuyển (dùng cho đòn đánh có root lock, hội thoại, cutscene…).</summary>
        public bool MovementLocked { get; set; }
        /// <summary>Nhân tốc độ từ buff / debuff / đỡ đòn.</summary>
        public float SpeedMultiplier { get; set; } = 1f;
        /// <summary>Chặn chạy nhanh (đang đỡ đòn…).</summary>
        public bool SprintBlocked { get; set; }
        /// <summary>
        /// Mục tiêu đang khoá: nhân vật luôn quay mặt về mục tiêu khi di chuyển (strafe),
        /// trừ khi đang chạy nhanh.
        /// </summary>
        public Transform FacingTarget { get; set; }
        public Vector3 RespawnPoint => respawnPoint;

        public event Action Jumped;
        /// <summary>Tham số: tốc độ rơi lúc chạm đất (m/s, dương).</summary>
        public event Action<float> Landed;

        public void SetCameraTransform(Transform cam) => cameraTransform = cam;
        public void SetRespawnPoint(Vector3 point) => respawnPoint = point;

        /// <summary>Dịch chuyển tức thời (cổng dịch chuyển, hồi sinh…).</summary>
        public void Teleport(Vector3 position, Quaternion? rotation = null)
        {
            cc.enabled = false;
            transform.position = position;
            if (rotation.HasValue) transform.rotation = rotation.Value;
            cc.enabled = true;
            planarVelocity = Vector3.zero;
            verticalVelocity = 0f;
        }

        /// <summary>
        /// Ghi đè vận tốc ngang CHO FRAME NÀY (lướt né, lao tới khi chém, bị đánh bật).
        /// Phải gọi trước Update của PlayerController (CombatSystem chạy sớm hơn nhờ DefaultExecutionOrder).
        /// </summary>
        public void OverridePlanarVelocity(Vector3 velocity)
        {
            velocityOverride = Vector3.ProjectOnPlane(velocity, Vector3.up);
            hasVelocityOverride = true;
        }

        /// <summary>Quay ngay về hướng cho trước (bỏ qua tốc độ xoay) – dùng khi ra đòn.</summary>
        public void SnapFacing(Vector3 direction)
        {
            direction = Vector3.ProjectOnPlane(direction, Vector3.up);
            if (direction.sqrMagnitude < 0.0001f) return;
            transform.rotation = Quaternion.LookRotation(direction.normalized, Vector3.up);
            rotationOverridden = true;
        }

        /// <summary>Hướng thế giới tương ứng với input di chuyển (theo camera).</summary>
        public Vector3 GetMoveDirection(Vector2 move) => CameraRelativeDirection(move);

        /// <summary>Thêm vận tốc tức thời (bị đánh bật, lướt né…).</summary>
        public void AddImpulse(Vector3 velocity)
        {
            planarVelocity += Vector3.ProjectOnPlane(velocity, Vector3.up);
            verticalVelocity += velocity.y;
            if (velocity.y > 0f) IsGrounded = false;
        }

        // ---------------------------------------------------------------- Unity

        void Awake()
        {
            cc = GetComponent<CharacterController>();
            respawnPoint = transform.position;
        }

        void Start()
        {
            hub = PlayerInputHub.Instance;
            if (cameraTransform == null && Camera.main != null) cameraTransform = Camera.main.transform;
            if (hub == null) Debug.LogWarning("[PlayerController] Không tìm thấy PlayerInputHub trong scene – nhân vật sẽ không nhận input.");
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (dt <= 0f) return;
            if (hub == null) hub = PlayerInputHub.Instance;
            var input = hub != null ? hub.State : default;

            if (input.WalkTogglePressed) walkToggled = !walkToggled;
            if (input.JumpPressed) lastJumpPressedTime = Time.time;

            bool wasGrounded = IsGrounded;
            UpdateGroundState();

            // ---- Di chuyển ngang
            Vector2 moveInput = MovementLocked ? Vector2.zero : input.Move;
            float inputMagnitude = Mathf.Clamp01(moveInput.magnitude);
            Vector3 wishDir = CameraRelativeDirection(moveInput);
            bool sprint = input.SprintHeld && !SprintBlocked;
            float targetSpeed = TargetSpeed(inputMagnitude, sprint) * SpeedMultiplier;
            Vector3 targetVelocity = wishDir * targetSpeed;

            if (hasVelocityOverride)
            {
                planarVelocity = velocityOverride;
            }
            else
            {
                float rate = targetVelocity.sqrMagnitude >= planarVelocity.sqrMagnitude ? acceleration : deceleration;
                if (!IsGrounded) rate *= airControl;
                planarVelocity = Vector3.MoveTowards(planarVelocity, targetVelocity, rate * dt);
            }

            if (!rotationOverridden)
            {
                Vector3 faceDir = wishDir;
                if (FacingTarget != null && !sprint && !MovementLocked)
                    faceDir = Vector3.ProjectOnPlane(FacingTarget.position - transform.position, Vector3.up);
                if (faceDir.sqrMagnitude > 0.0001f && !MovementLocked)
                {
                    var targetRot = Quaternion.LookRotation(faceDir.normalized, Vector3.up);
                    float turn = turnSpeed * (IsGrounded ? 1f : 0.5f) * dt;
                    transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRot, turn);
                }
            }
            hasVelocityOverride = false;
            rotationOverridden = false;

            // ---- Nhảy
            bool jumpedThisFrame = TryConsumeJump();

            // ---- Trọng lực
            if (IsGrounded && verticalVelocity <= 0f)
            {
                verticalVelocity = groundStickVelocity;
            }
            else
            {
                float mult = 1f;
                if (verticalVelocity < 0f) mult = fallGravityMultiplier;
                else if (!input.JumpHeld) mult = lowJumpGravityMultiplier;
                verticalVelocity = Mathf.Max(verticalVelocity + gravity * mult * dt, -terminalVelocity);
            }

            Vector3 motion = planarVelocity;
            if (OnSteepSlope)
            {
                // Đẩy nhân vật trượt khỏi mặt dốc quá đứng thay vì "leo tường".
                var away = Vector3.ProjectOnPlane(GroundNormal, Vector3.up);
                motion += away.normalized * steepSlopeSlideSpeed;
            }
            motion.y = verticalVelocity;

            var flags = cc.Move(motion * dt);

            if ((flags & CollisionFlags.Above) != 0 && verticalVelocity > 0f) verticalVelocity = 0f;

            // Bám mặt đất khi chạy xuống dốc / bước xuống bậc thấp.
            if (wasGrounded && !jumpedThisFrame && verticalVelocity <= 0f && (flags & CollisionFlags.Below) == 0)
                SnapToGround();

            if (!IsGrounded) airborneMinVerticalVelocity = Mathf.Min(airborneMinVerticalVelocity, verticalVelocity);

            UpdateGroundState();
            if (!wasGrounded && IsGrounded)
            {
                Landed?.Invoke(-airborneMinVerticalVelocity);
                airborneMinVerticalVelocity = 0f;
            }

            UpdateMovementState();

            if (transform.position.y < fallResetHeight) Teleport(respawnPoint);
        }

        void OnControllerColliderHit(ControllerColliderHit hit)
        {
            var body = hit.collider.attachedRigidbody;
            if (body == null || body.isKinematic || hit.moveDirection.y < -0.3f) return;
            var push = new Vector3(hit.moveDirection.x, 0f, hit.moveDirection.z);
            body.AddForceAtPosition(push * pushPower, hit.point, ForceMode.Impulse);
        }

        // ---------------------------------------------------------------- Internals

        Vector3 CameraRelativeDirection(Vector2 move)
        {
            if (move.sqrMagnitude < 0.0001f) return Vector3.zero;
            Vector3 forward, right;
            if (cameraTransform != null)
            {
                forward = Vector3.ProjectOnPlane(cameraTransform.forward, Vector3.up);
                if (forward.sqrMagnitude < 0.0001f) forward = Vector3.ProjectOnPlane(cameraTransform.up, Vector3.up);
                forward.Normalize();
                right = Vector3.Cross(Vector3.up, forward);
            }
            else
            {
                forward = Vector3.forward;
                right = Vector3.right;
            }
            var dir = forward * move.y + right * move.x;
            return dir.sqrMagnitude > 0.0001f ? dir.normalized : Vector3.zero;
        }

        float TargetSpeed(float inputMagnitude, bool sprintHeld)
        {
            if (inputMagnitude < 0.05f) return 0f;
            if (sprintHeld) return sprintSpeed;
            if (walkToggled) return walkSpeed;
            if (inputMagnitude < walkInputThreshold)
                return walkSpeed * Mathf.Lerp(0.5f, 1f, inputMagnitude / walkInputThreshold);
            return runSpeed;
        }

        bool TryConsumeJump()
        {
            if (MovementLocked) return false;
            bool buffered = Time.time - lastJumpPressedTime <= jumpBufferTime;
            if (!buffered) return false;

            bool coyote = !hasJumpedSinceGrounded && Time.time - lastGroundedTime <= coyoteTime;
            bool canJump = (IsGrounded && !OnSteepSlope) || coyote;
            if (!canJump) return false;

            verticalVelocity = Mathf.Sqrt(2f * jumpHeight * -gravity);
            lastJumpPressedTime = -10f;
            lastGroundedTime = -10f;
            hasJumpedSinceGrounded = true;
            IsGrounded = false;
            Jumped?.Invoke();
            return true;
        }

        void UpdateGroundState()
        {
            bool probe = ProbeGround(groundProbeDistance, out var hit, out _);
            if (probe)
            {
                GroundNormal = hit.normal;
                SlopeAngle = Vector3.Angle(hit.normal, Vector3.up);
            }
            else
            {
                GroundNormal = Vector3.up;
                SlopeAngle = 0f;
            }

            bool touching = (cc.isGrounded || probe) && verticalVelocity <= 0.01f;
            OnSteepSlope = touching && SlopeAngle > cc.slopeLimit + 1f;
            IsGrounded = touching && !OnSteepSlope;

            if (IsGrounded)
            {
                lastGroundedTime = Time.time;
                hasJumpedSinceGrounded = false;
            }
        }

        void SnapToGround()
        {
            if (!ProbeGround(groundSnapDistance, out var hit, out float gap)) return;
            if (Vector3.Angle(hit.normal, Vector3.up) > cc.slopeLimit) return;
            if (gap > 0.001f) cc.Move(Vector3.down * (gap + cc.skinWidth));
        }

        /// <summary>
        /// SphereCast từ quả cầu đáy của capsule xuống dưới. gap = khoảng trống còn lại tới mặt đất.
        /// Bỏ qua collider của chính nhân vật (không cần layer riêng).
        /// </summary>
        bool ProbeGround(float distance, out RaycastHit best, out float gap)
        {
            const float lift = 0.05f;
            float radius = cc.radius * 0.95f;
            Vector3 center = transform.TransformPoint(cc.center);
            Vector3 bottomSphere = center + Vector3.down * (cc.height * 0.5f - cc.radius);
            Vector3 origin = bottomSphere + Vector3.up * lift;
            float castDistance = lift + (cc.radius - radius) + cc.skinWidth + distance;

            int count = Physics.SphereCastNonAlloc(origin, radius, Vector3.down, probeHits, castDistance,
                groundMask, QueryTriggerInteraction.Ignore);

            best = default;
            gap = float.MaxValue;
            bool found = false;
            for (int i = 0; i < count; i++)
            {
                var h = probeHits[i];
                if (h.collider == null || h.collider == cc || h.collider.transform.IsChildOf(transform)) continue;
                if (h.distance <= 0f && h.point == Vector3.zero) continue; // bắt đầu chồng lấn – bỏ qua
                if (!found || h.distance < best.distance)
                {
                    best = h;
                    found = true;
                }
            }
            if (found) gap = Mathf.Max(0f, best.distance - lift - (cc.radius - radius) - cc.skinWidth);
            return found;
        }

        void UpdateMovementState()
        {
            if (!IsGrounded)
            {
                State = verticalVelocity > 0.1f ? MovementState.Jump : MovementState.Fall;
                return;
            }
            float speed = HorizontalSpeed;
            if (speed < 0.15f) State = MovementState.Idle;
            else if (speed <= walkSpeed + 0.3f) State = MovementState.Walk;
            else if (speed <= runSpeed + 0.3f) State = MovementState.Run;
            else State = MovementState.Sprint;
        }

        void OnValidate()
        {
            walkSpeed = Mathf.Max(0.1f, walkSpeed);
            runSpeed = Mathf.Max(walkSpeed, runSpeed);
            sprintSpeed = Mathf.Max(runSpeed, sprintSpeed);
            gravity = Mathf.Min(-0.1f, gravity);
            jumpHeight = Mathf.Max(0f, jumpHeight);
        }
    }
}
