using System.Collections.Generic;
using UnityEngine;
using VanGioi.Combat;
using VanGioi.Data;

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
    ///   --- Chiến đấu (Giai đoạn 2) ---
    ///   trigger Attack        bắt đầu một đòn; int ComboStep = 0..3, = -1 khi là Phản Kích
    ///   int    ComboStep
    ///   trigger Counter       đòn phản kích sau đỡ hoàn hảo
    ///   trigger Dodge         né (bool Backstep = true khi lùi né)
    ///   bool   Backstep
    ///   bool   Blocking       đang đỡ đòn
    ///   trigger Parry         đỡ hoàn hảo
    ///   trigger Hit           trúng đòn / phá thế
    ///   bool   Dead
    /// Menu "Vân Giới > Giai đoạn 2 > Tạo Animator Controller mẫu" sinh sẵn controller đúng hợp đồng này.
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
        static readonly int AttackHash = Animator.StringToHash("Attack");
        static readonly int ComboStepHash = Animator.StringToHash("ComboStep");
        static readonly int CounterHash = Animator.StringToHash("Counter");
        static readonly int DodgeHash = Animator.StringToHash("Dodge");
        static readonly int BackstepHash = Animator.StringToHash("Backstep");
        static readonly int BlockingHash = Animator.StringToHash("Blocking");
        static readonly int ParryHash = Animator.StringToHash("Parry");
        static readonly int HitHash = Animator.StringToHash("Hit");
        static readonly int DeadHash = Animator.StringToHash("Dead");

        readonly HashSet<int> availableParams = new HashSet<int>();
        PlayerController controller;
        CombatSystem combat;

        bool UseAnimator => animator != null && animator.runtimeAnimatorController != null && animator.isActiveAndEnabled;

        void Awake()
        {
            controller = GetComponent<PlayerController>();
            combat = GetComponent<CombatSystem>();
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
            if (combat == null) combat = GetComponent<CombatSystem>();
            if (combat != null)
            {
                combat.AttackStarted += OnAttack;
                combat.DodgeStarted += OnDodge;
                combat.BlockChanged += OnBlock;
                combat.Parried += OnParry;
                combat.HitReacted += OnHit;
                combat.GuardBroken += OnHit;
                combat.Died += OnDied;
                combat.Revived += OnRevived;
            }
        }

        void OnDisable()
        {
            controller.Jumped -= OnJumped;
            controller.Landed -= OnLanded;
            if (combat != null)
            {
                combat.AttackStarted -= OnAttack;
                combat.DodgeStarted -= OnDodge;
                combat.BlockChanged -= OnBlock;
                combat.Parried -= OnParry;
                combat.HitReacted -= OnHit;
                combat.GuardBroken -= OnHit;
                combat.Died -= OnDied;
                combat.Revived -= OnRevived;
            }
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
            if (combat != null) combat.RebindModel();
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

        void OnAttack(int comboStep, AttackStep step, bool counter)
        {
            if (UseAnimator)
            {
                if (Has(ComboStepHash)) animator.SetInteger(ComboStepHash, comboStep);
                if (counter && Has(CounterHash)) animator.SetTrigger(CounterHash);
                else if (Has(AttackHash)) animator.SetTrigger(AttackHash);
                return;
            }
            if (placeholderRig == null) return;
            var rigAction = step.style switch
            {
                SwingStyle.SlashLeft => RigAction.SlashLeft,
                SwingStyle.Overhead => RigAction.Overhead,
                SwingStyle.Thrust => RigAction.Thrust,
                SwingStyle.Spin => RigAction.Spin,
                _ => RigAction.SlashRight
            };
            placeholderRig.PlayAction(rigAction, step.Duration, step.startup, step.ActiveEnd);
        }

        void OnDodge(bool backstep)
        {
            if (UseAnimator)
            {
                if (Has(BackstepHash)) animator.SetBool(BackstepHash, backstep);
                if (Has(DodgeHash)) animator.SetTrigger(DodgeHash);
            }
            else if (placeholderRig != null)
            {
                placeholderRig.PlayAction(backstep ? RigAction.Backstep : RigAction.Dodge, 0.42f, 0.05f, 0.1f);
            }
        }

        void OnBlock(bool blocking)
        {
            if (UseAnimator) { if (Has(BlockingHash)) animator.SetBool(BlockingHash, blocking); }
            else if (placeholderRig != null) placeholderRig.SetBlocking(blocking);
        }

        void OnParry()
        {
            if (UseAnimator) { if (Has(ParryHash)) animator.SetTrigger(ParryHash); }
            else if (placeholderRig != null) placeholderRig.PlayAction(RigAction.Parry, 0.35f, 0.02f, 0.12f);
        }

        void OnHit()
        {
            if (UseAnimator) { if (Has(HitHash)) animator.SetTrigger(HitHash); }
            else if (placeholderRig != null) placeholderRig.PlayAction(RigAction.HitReact, 0.35f, 0.05f, 0.1f);
        }

        void OnDied()
        {
            if (UseAnimator) { if (Has(DeadHash)) animator.SetBool(DeadHash, true); }
            else if (placeholderRig != null) placeholderRig.SetDead(true);
        }

        void OnRevived()
        {
            if (UseAnimator) { if (Has(DeadHash)) animator.SetBool(DeadHash, false); }
            else if (placeholderRig != null) placeholderRig.SetDead(false);
        }

        void OnLanded(float impactSpeed)
        {
            if (UseAnimator && Has(LandHash)) animator.SetTrigger(LandHash);
            else if (placeholderRig != null) placeholderRig.TriggerLand(impactSpeed);
        }
    }
}
