using System.Collections.Generic;
using UnityEngine;

namespace VanGioi.Player
{
    /// <summary>
    /// Cầu nối giữa PlayerController và phần hiển thị. Hai chế độ:
    ///  1) Có Animator + Animator Controller → đẩy tham số (xem bảng bên dưới).
    ///  2) Không có → điều khiển PlaceholderRig (animation thủ tục).
    ///
    /// Hợp đồng tham số Animator (chỉ đặt tham số nào Controller CÓ, nên thiếu cũng không lỗi):
    ///   float  Speed          tốc độ ngang (m/s)              – Blend Tree Idle/Walk/Run/Sprint
    ///   float  Speed01        0..1 theo sprintSpeed
    ///   float  VerticalSpeed  vận tốc dọc (m/s)               – Blend Jump-Up / Fall
    ///   bool   Grounded
    ///   bool   Sprinting
    ///   int    MoveState      (int)MovementState
    ///   trigger Jump          khi bắt đầu nhảy
    ///   trigger Land          khi chạm đất
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerAnimationController : MonoBehaviour
    {
        [Tooltip("Để trống: tự tìm Animator trong các object con (model).")]
        [SerializeField] Animator animator;
        [Tooltip("Để trống: tự tìm PlaceholderRig trong các object con.")]
        [SerializeField] PlaceholderRig placeholderRig;
        [SerializeField, Range(0f, 0.5f)] float speedDampTime = 0.08f;

        static readonly int SpeedHash = Animator.StringToHash("Speed");
        static readonly int Speed01Hash = Animator.StringToHash("Speed01");
        static readonly int VerticalSpeedHash = Animator.StringToHash("VerticalSpeed");
        static readonly int GroundedHash = Animator.StringToHash("Grounded");
        static readonly int SprintingHash = Animator.StringToHash("Sprinting");
        static readonly int MoveStateHash = Animator.StringToHash("MoveState");
        static readonly int JumpHash = Animator.StringToHash("Jump");
        static readonly int LandHash = Animator.StringToHash("Land");

        readonly HashSet<int> availableParams = new HashSet<int>();
        PlayerController controller;

        bool UseAnimator => animator != null && animator.runtimeAnimatorController != null && animator.isActiveAndEnabled;

        void Awake()
        {
            controller = GetComponent<PlayerController>();
            Rebind();
        }

        void Start()
        {
            if (animator == null && placeholderRig == null) Rebind();
        }

        void OnEnable()
        {
            if (controller == null) controller = GetComponent<PlayerController>();
            controller.Jumped += OnJumped;
            controller.Landed += OnLanded;
        }

        void OnDisable()
        {
            controller.Jumped -= OnJumped;
            controller.Landed -= OnLanded;
        }

        /// <summary>
        /// Gọi sau khi thay model / trang phục lúc chạy để tìm lại Animator và PlaceholderRig.
        /// </summary>
        public void Rebind()
        {
            if (animator == null) animator = GetComponentInChildren<Animator>();
            if (placeholderRig == null) placeholderRig = GetComponentInChildren<PlaceholderRig>();
            CacheParameters();
            if (animator != null) animator.applyRootMotion = false; // PlayerController điều khiển chuyển động
        }

        /// <summary>Thay model nhân vật: model mới phải là con của object Visual.</summary>
        public void SetModel(GameObject newModelRoot)
        {
            animator = newModelRoot != null ? newModelRoot.GetComponentInChildren<Animator>() : null;
            placeholderRig = newModelRoot != null ? newModelRoot.GetComponentInChildren<PlaceholderRig>() : null;
            Rebind();
        }

        void CacheParameters()
        {
            availableParams.Clear();
            if (animator == null || animator.runtimeAnimatorController == null) return;
            foreach (var p in animator.parameters) availableParams.Add(p.nameHash);
        }

        void Update()
        {
            float speed = controller.HorizontalSpeed;
            float speed01 = controller.SprintSpeed > 0f ? Mathf.Clamp01(speed / controller.SprintSpeed) : 0f;

            if (UseAnimator)
            {
                float dt = Time.deltaTime;
                if (Has(SpeedHash)) animator.SetFloat(SpeedHash, speed, speedDampTime, dt);
                if (Has(Speed01Hash)) animator.SetFloat(Speed01Hash, speed01, speedDampTime, dt);
                if (Has(VerticalSpeedHash)) animator.SetFloat(VerticalSpeedHash, controller.VerticalVelocity);
                if (Has(GroundedHash)) animator.SetBool(GroundedHash, controller.IsGrounded);
                if (Has(SprintingHash)) animator.SetBool(SprintingHash, controller.State == MovementState.Sprint);
                if (Has(MoveStateHash)) animator.SetInteger(MoveStateHash, (int)controller.State);
            }
            else if (placeholderRig != null)
            {
                placeholderRig.Tick(speed, speed01, controller.IsGrounded, controller.VerticalVelocity, Time.deltaTime);
            }
        }

        bool Has(int hash) => availableParams.Contains(hash);

        void OnJumped()
        {
            if (UseAnimator && Has(JumpHash)) animator.SetTrigger(JumpHash);
        }

        void OnLanded(float impactSpeed)
        {
            if (UseAnimator && Has(LandHash)) animator.SetTrigger(LandHash);
            else if (placeholderRig != null) placeholderRig.TriggerLand(impactSpeed);
        }
    }
}
