using System;
using System.Collections.Generic;
using UnityEngine;
using VanGioi.Data;
using VanGioi.Input;
using VanGioi.Player;
using VanGioi.Stats;
using VanGioi.UI;

namespace VanGioi.Combat
{
    /// <summary>
    /// Chiến đấu của người chơi:
    ///  • Combo đánh thường nhiều đòn (dữ liệu từ WeaponData → ComboData), có input buffer.
    ///  • Tự xoay về phía quái gần nhất (hoặc mục tiêu đang khoá) khi ra đòn.
    ///  • Né (lướt) có thời gian bất tử, huỷ được phần chuẩn bị / thu chiêu của đòn đánh.
    ///  • Đỡ đòn giảm sát thương, tốn thể lực; hết thể lực → phá thế.
    ///  • Đỡ hoàn hảo (bấm đỡ ngay trước khi trúng) → địch choáng + mở đòn Phản Kích.
    ///  • Trúng đòn mạnh bị khựng & đẩy lùi; chết → hồi sinh ở điểm hồi sinh.
    ///
    /// Thời gian đòn đánh dựa trên dữ liệu (startup / active / recovery), nên chạy được
    /// với model placeholder lẫn Animator thật.
    /// </summary>
    [DefaultExecutionOrder(-50)]
    [RequireComponent(typeof(PlayerController), typeof(CharacterStats))]
    public class CombatSystem : MonoBehaviour, IDamageable
    {
        public enum CombatState { Idle, Attacking, Dodging, Blocking, HitReact, Dead }

        [Header("Vũ khí")]
        [SerializeField] WeaponData weapon;

        [Header("Tự xoay về phía quái")]
        [SerializeField] float softTargetRange = 6f;
        [SerializeField] float softTargetAngle = 140f;

        [Header("Né")]
        [SerializeField] float dodgeDuration = 0.42f;
        [SerializeField] float dodgeSpeed = 11f;
        [SerializeField] float dodgeInvulnerableStart = 0.02f;
        [SerializeField] float dodgeInvulnerableEnd = 0.3f;
        [SerializeField] float dodgeStaminaCost = 22f;
        [SerializeField] float dodgeCooldown = 0.12f;

        [Header("Đỡ đòn")]
        [SerializeField, Range(0f, 1f)] float blockDamageReduction = 0.7f;
        [SerializeField] float blockStaminaPerHit = 15f;
        [Tooltip("Bấm đỡ trong khoảng này trước khi trúng đòn = đỡ hoàn hảo.")]
        [SerializeField] float perfectParryWindow = 0.2f;
        [SerializeField] float blockAngle = 140f;
        [SerializeField, Range(0.1f, 1f)] float blockMoveSpeedMultiplier = 0.45f;
        [SerializeField] float parryStaggerDuration = 1.6f;
        [Tooltip("Thời gian mở đòn phản kích sau khi đỡ hoàn hảo.")]
        [SerializeField] float counterWindow = 1.6f;
        [SerializeField] float guardBreakDuration = 0.8f;

        [Header("Trúng đòn")]
        [SerializeField] float hitReactDuration = 0.35f;
        [Tooltip("Đòn có poise ≥ ngưỡng này sẽ ngắt đòn đánh của người chơi.")]
        [SerializeField] float hitReactPoiseThreshold = 40f;
        [SerializeField] float knockbackDecay = 14f;

        [Header("Khác")]
        [SerializeField] float respawnDelay = 4f;
        [SerializeField] float inputBufferTime = 0.3f;
        [SerializeField] LayerMask hitMask = ~0;
        [SerializeField] Transform aimPoint;

        public static CombatSystem Player { get; private set; }

        PlayerController controller;
        CharacterStats stats;
        LockOnSystem lockOn;
        WeaponHolder weaponHolder;
        PlayerInputHub hub;
        readonly Collider[] overlap = new Collider[48];
        readonly HashSet<IDamageable> hitThisSwing = new HashSet<IDamageable>();

        float stateTime, stateStartTime;
        float lastAttackPress = -10f, lastDodgePress = -10f;
        float lastAttackEndTime = -10f, lastDodgeEndTime = -10f;
        float blockStartTime = -10f;
        float counterUntil = -10f;
        int lastComboIndex = -1;
        bool queuedNext, activeStarted, isCounter;
        Vector3 dodgeDirection, knockVelocity;
        float lastStaminaToast = -10f;
        IDamageable attackTarget;

        // ------------------------------------------------------------------ Public

        public CombatState State { get; private set; }
        public int ComboIndex { get; private set; } = -1;
        public AttackStep CurrentStep { get; private set; }
        public bool IsInvulnerable { get; private set; }
        public bool CounterReady => Time.time < counterUntil;
        public float RespawnCountdown { get; private set; }
        public WeaponData Weapon => weapon;
        public LockOnSystem LockOn => lockOn;

        public Team Team => Team.Player;
        public bool IsAlive => State != CombatState.Dead && !stats.IsDead;
        public Transform AimPoint => aimPoint;
        public CharacterStats Stats => stats;

        /// <summary>(chỉ số đòn trong combo, -1 nếu là phản kích), dữ liệu đòn, có phải phản kích</summary>
        public event Action<int, AttackStep, bool> AttackStarted;
        /// <summary>true = lùi né (không có input hướng)</summary>
        public event Action<bool> DodgeStarted;
        public event Action<bool> BlockChanged;
        public event Action Parried;
        public event Action HitReacted;
        public event Action GuardBroken;
        public event Action Died;
        public event Action Revived;

        public void SetWeapon(WeaponData newWeapon)
        {
            weapon = newWeapon;
            if (stats == null) return;
            if (weapon != null) stats.SetModifier(this, weapon.bonusStats);
            else stats.RemoveModifier(this);
            if (weaponHolder != null && weapon != null) weaponHolder.SetTrailColor(weapon.trailColor);
        }

        // ------------------------------------------------------------------ Unity

        void Awake()
        {
            controller = GetComponent<PlayerController>();
            stats = GetComponent<CharacterStats>();
            lockOn = GetComponent<LockOnSystem>();
            if (aimPoint == null)
            {
                aimPoint = new GameObject("AimPoint").transform;
                aimPoint.SetParent(transform, false);
                aimPoint.localPosition = new Vector3(0f, 1.3f, 0f);
            }
            Player = this;
        }

        void OnEnable() => stats.Died += OnDied;
        void OnDisable() => stats.Died -= OnDied;

        void OnDestroy()
        {
            if (Player == this) Player = null;
        }

        void Start()
        {
            hub = PlayerInputHub.Instance;
            weaponHolder = GetComponentInChildren<WeaponHolder>();
            if (weapon == null) Debug.LogWarning("[CombatSystem] Chưa gán WeaponData – dùng combo mặc định.");
            SetWeapon(weapon != null ? weapon : DefaultGameData.CreateSword(DefaultGameData.CreateSwordCombo()));
        }

        /// <summary>Gọi lại khi đổi model (WeaponHolder nằm trên model).</summary>
        public void RebindModel() => weaponHolder = GetComponentInChildren<WeaponHolder>();

        void Update()
        {
            if (hub == null) hub = PlayerInputHub.Instance;
            var input = hub != null ? hub.State : default;
            float now = Time.time;
            if (input.AttackPressed) lastAttackPress = now;
            if (input.DodgePressed) lastDodgePress = now;

            stateTime += Time.deltaTime;

            switch (State)
            {
                case CombatState.Dead: UpdateDead(); break;
                case CombatState.HitReact: UpdateHitReact(); break;
                case CombatState.Dodging: UpdateDodge(); break;
                case CombatState.Attacking: UpdateAttack(input); break;
                default: UpdateIdleOrBlock(input); break;
            }

            controller.MovementLocked = State == CombatState.Attacking || State == CombatState.Dodging ||
                                        State == CombatState.HitReact || State == CombatState.Dead;
            controller.SpeedMultiplier = State == CombatState.Blocking ? blockMoveSpeedMultiplier : 1f;
            controller.SprintBlocked = State == CombatState.Blocking;
        }

        // ------------------------------------------------------------------ States

        void Enter(CombatState next)
        {
            if (State == CombatState.Blocking && next != CombatState.Blocking) BlockChanged?.Invoke(false);
            State = next;
            stateTime = 0f;
            stateStartTime = Time.time;
            if (next != CombatState.Dodging) IsInvulnerable = false;
        }

        bool Buffered(float pressTime) => Time.time - pressTime <= inputBufferTime;

        void UpdateIdleOrBlock(PlayerInputState input)
        {
            if (Buffered(lastDodgePress) && CanDodge())
            {
                StartDodge(input);
                return;
            }

            if (Buffered(lastAttackPress) && controller.IsGrounded)
            {
                if (CounterReady)
                {
                    counterUntil = -10f;
                    StartAttack(-1, true, input);
                }
                else
                {
                    StartAttack(NextComboIndex(), false, input);
                }
                return;
            }

            bool wantBlock = input.BlockHeld && controller.IsGrounded;
            if (wantBlock && State != CombatState.Blocking)
            {
                Enter(CombatState.Blocking);
                blockStartTime = Time.time;
                if (weaponHolder != null) weaponHolder.Draw();
                BlockChanged?.Invoke(true);
            }
            else if (!wantBlock && State == CombatState.Blocking)
            {
                Enter(CombatState.Idle);
            }
            else if (State == CombatState.Blocking && weaponHolder != null)
            {
                weaponHolder.MarkUsed();
            }

            // Bị đẩy lùi nhẹ khi đỡ đòn.
            if (State == CombatState.Blocking && knockVelocity.sqrMagnitude > 0.01f)
            {
                controller.OverridePlanarVelocity(knockVelocity);
                knockVelocity = Vector3.MoveTowards(knockVelocity, Vector3.zero, knockbackDecay * Time.deltaTime);
            }
        }

        int NextComboIndex()
        {
            var steps = weapon != null && weapon.combo != null ? weapon.combo.steps : null;
            if (steps == null || steps.Length == 0) return 0;
            bool inWindow = Time.time - lastAttackEndTime <= weapon.combo.comboResetTime;
            if (inWindow && lastComboIndex >= 0 && lastComboIndex < steps.Length - 1) return lastComboIndex + 1;
            return 0;
        }

        void StartAttack(int index, bool counter, PlayerInputState input)
        {
            var combo = weapon != null ? weapon.combo : null;
            if (combo == null || (!counter && (combo.steps == null || combo.steps.Length == 0))) return;

            var step = counter ? combo.counterAttack : combo.steps[Mathf.Clamp(index, 0, combo.steps.Length - 1)];
            stats.DrainStamina(step.staminaCost);
            lastAttackPress = -10f;
            ComboIndex = counter ? -1 : index;
            isCounter = counter;
            CurrentStep = step;
            Enter(CombatState.Attacking);
            hitThisSwing.Clear();
            queuedNext = false;
            activeStarted = false;

            FaceAttackDirection(input);
            if (weaponHolder != null) weaponHolder.Draw();
            AttackStarted?.Invoke(ComboIndex, step, counter);
            if (counter) WorldUI.Toast("Phản Kích!", new Color(1f, 0.85f, 0.35f));
        }

        void FaceAttackDirection(PlayerInputState input)
        {
            Vector3 moveDir = controller.GetMoveDirection(input.Move);
            attackTarget = lockOn != null && lockOn.HasTarget ? lockOn.Current : null;
            if (attackTarget == null)
            {
                Vector3 reference = moveDir.sqrMagnitude > 0.01f ? moveDir : transform.forward;
                attackTarget = TargetRegistry.FindBest(transform.position, reference, softTargetRange, softTargetAngle);
            }

            if (attackTarget != null && attackTarget.AimPoint != null)
                controller.SnapFacing(attackTarget.AimPoint.position - transform.position);
            else if (moveDir.sqrMagnitude > 0.01f)
                controller.SnapFacing(moveDir);
        }

        void UpdateAttack(PlayerInputState input)
        {
            var step = CurrentStep;
            float t = stateTime;
            float prevT = t - Time.deltaTime;

            if (lastAttackPress >= stateStartTime + step.comboInputOpen) queuedNext = true;

            // Huỷ đòn bằng né (ngoài vùng Active).
            if (Buffered(lastDodgePress) && (t < step.startup || t > step.ActiveEnd) && CanDodge())
            {
                EndAttack(false);
                StartDodge(input);
                return;
            }

            // Huỷ phần thu chiêu bằng đỡ.
            if (input.BlockHeld && t > step.ActiveEnd)
            {
                EndAttack(true);
                UpdateIdleOrBlock(input);
                return;
            }

            // Lao tới khi ra đòn (dừng lại nếu đã sát mục tiêu).
            float lunge = t < step.ActiveEnd ? step.lungeSpeed : 0f;
            if (attackTarget != null && attackTarget.IsAlive && attackTarget.AimPoint != null)
            {
                Vector3 to = attackTarget.AimPoint.position - transform.position;
                to.y = 0f;
                if (to.magnitude < 1.4f) lunge = 0f;
            }
            if (!controller.IsGrounded) lunge = 0f;
            controller.OverridePlanarVelocity(transform.forward * lunge);

            bool inActive = (t >= step.startup && prevT <= step.ActiveEnd) || (prevT < step.startup && t > step.ActiveEnd);
            if (inActive)
            {
                if (!activeStarted)
                {
                    activeStarted = true;
                    if (weaponHolder != null) weaponHolder.SetTrail(true);
                    var color = weapon != null ? weapon.trailColor : Color.white;
                    if (isCounter) color = new Color(1f, 0.8f, 0.35f, 0.9f);
                    CombatFeedback.Slash(transform, step.style, color, step.range);
                }
                DetectHits(step);
            }
            else if (activeStarted && t > step.ActiveEnd && weaponHolder != null)
            {
                weaponHolder.SetTrail(false);
            }

            var steps = weapon.combo.steps;
            float chainTime = step.ActiveEnd + step.recovery * step.chainAfterRecovery;
            if (queuedNext && !isCounter && t >= chainTime && ComboIndex < steps.Length - 1)
            {
                lastComboIndex = ComboIndex;
                StartAttack(ComboIndex + 1, false, input);
                return;
            }

            if (t >= step.Duration) EndAttack(true);
        }

        void EndAttack(bool toIdle)
        {
            if (weaponHolder != null) weaponHolder.SetTrail(false);
            lastComboIndex = isCounter ? -1 : ComboIndex;
            lastAttackEndTime = Time.time;
            attackTarget = null;
            if (toIdle) Enter(CombatState.Idle);
        }

        void DetectHits(AttackStep step)
        {
            Vector3 origin = transform.position + Vector3.up * 1f;
            int count = Physics.OverlapSphereNonAlloc(origin, step.range + 0.6f, overlap, hitMask, QueryTriggerInteraction.Ignore);
            for (int i = 0; i < count; i++)
            {
                var col = overlap[i];
                if (col == null || col.transform.IsChildOf(transform)) continue;
                var target = col.GetComponentInParent<IDamageable>();
                if (target == null || ReferenceEquals(target, this) || target.Team == Team.Player || !target.IsAlive) continue;
                if (hitThisSwing.Contains(target)) continue;

                Vector3 targetPos = target.AimPoint != null ? target.AimPoint.position : col.bounds.center;
                Vector3 to = targetPos - origin;
                to.y = 0f;
                float dist = to.magnitude;
                float targetRadius = Mathf.Min(1.2f, Mathf.Max(col.bounds.extents.x, col.bounds.extents.z));
                if (dist > step.range + targetRadius) continue;
                if (step.arc < 359f && dist > 0.6f && Vector3.Angle(transform.forward, to) > step.arc * 0.5f) continue;

                hitThisSwing.Add(target);
                var point = col.ClosestPoint(origin);
                var hit = new HitInfo
                {
                    Attacker = gameObject,
                    AttackerStats = stats,
                    AttackerTeam = Team.Player,
                    Multiplier = step.damageMultiplier,
                    PoiseDamage = step.poiseDamage,
                    Knockback = step.knockback,
                    Point = point,
                    Direction = dist > 0.01f ? to / dist : transform.forward,
                    ForceCritical = step.forceCritical,
                    IsCounter = isCounter
                };
                var result = target.ReceiveHit(hit);
                if (!result.Landed) continue;

                bool crit = result.Outcome == HitOutcome.Critical;
                CombatFeedback.Spark(point, crit ? new Color(1f, 0.75f, 0.3f) : new Color(1f, 0.95f, 0.8f), crit ? 22 : 14);
                CombatFeedback.HitStop(step.hitStop * (crit ? 1.4f : 1f));
                CombatFeedback.Shake(step.cameraShake * (crit ? 1.4f : 1f));
            }
        }

        bool CanDodge() => controller.IsGrounded && Time.time - lastDodgeEndTime > dodgeCooldown;

        void StartDodge(PlayerInputState input)
        {
            lastDodgePress = -10f;
            if (!stats.TrySpendStamina(dodgeStaminaCost))
            {
                if (Time.time - lastStaminaToast > 1.5f)
                {
                    lastStaminaToast = Time.time;
                    WorldUI.Toast("Không đủ thể lực", new Color(1f, 0.8f, 0.4f));
                }
                return;
            }
            Vector3 dir = controller.GetMoveDirection(input.Move);
            bool backstep = dir.sqrMagnitude < 0.01f;
            if (backstep) dir = -transform.forward;
            else controller.SnapFacing(dir);
            dodgeDirection = dir.normalized;
            if (weaponHolder != null) weaponHolder.SetTrail(false);
            Enter(CombatState.Dodging);
            DodgeStarted?.Invoke(backstep);
        }

        void UpdateDodge()
        {
            float t = stateTime;
            float k = 1f - Mathf.Clamp01(t / dodgeDuration);
            controller.OverridePlanarVelocity(dodgeDirection * dodgeSpeed * Mathf.Lerp(0.3f, 1f, k * k));
            IsInvulnerable = t >= dodgeInvulnerableStart && t <= dodgeInvulnerableEnd;
            if (t < dodgeDuration) return;
            IsInvulnerable = false;
            lastDodgeEndTime = Time.time;
            Enter(CombatState.Idle);
        }

        void UpdateHitReact()
        {
            controller.OverridePlanarVelocity(knockVelocity);
            knockVelocity = Vector3.MoveTowards(knockVelocity, Vector3.zero, knockbackDecay * Time.deltaTime);
            float duration = hitReactIsGuardBreak ? guardBreakDuration : hitReactDuration;
            if (stateTime >= duration) Enter(CombatState.Idle);
        }

        bool hitReactIsGuardBreak;

        void EnterHitReact(Vector3 direction, float knockback, bool guardBreak)
        {
            if (State == CombatState.Attacking) EndAttack(false);
            knockVelocity = Vector3.ProjectOnPlane(direction, Vector3.up).normalized * knockback;
            hitReactIsGuardBreak = guardBreak;
            Enter(CombatState.HitReact);
            if (guardBreak) GuardBroken?.Invoke();
            else HitReacted?.Invoke();
        }

        void UpdateDead()
        {
            RespawnCountdown = Mathf.Max(0f, respawnDelay - stateTime);
            if (stateTime < respawnDelay) return;
            controller.Teleport(controller.RespawnPoint);
            stats.RestoreAll();
            RespawnCountdown = 0f;
            Enter(CombatState.Idle);
            Revived?.Invoke();
            CombatEvents.RaisePlayerRevived();
        }

        void OnDied()
        {
            if (State == CombatState.Dead) return;
            if (State == CombatState.Attacking) EndAttack(false);
            if (lockOn != null) lockOn.Release();
            if (weaponHolder != null) weaponHolder.SetTrail(false);
            Enter(CombatState.Dead);
            RespawnCountdown = respawnDelay;
            Died?.Invoke();
            CombatEvents.RaisePlayerDied();
        }

        // ------------------------------------------------------------------ IDamageable

        public HitResult ReceiveHit(in HitInfo hit)
        {
            if (!IsAlive) return HitResult.Immune;
            Vector3 point = aimPoint.position;

            if (IsInvulnerable)
            {
                var dodged = new HitResult { Outcome = HitOutcome.Immune };
                CombatEvents.RaiseHit(this, hit.Attacker, dodged, point);
                return dodged;
            }

            stats.MarkInCombat();
            Vector3 fromAttacker = hit.Direction.sqrMagnitude > 0.001f ? hit.Direction : -transform.forward;
            bool facing = Vector3.Angle(transform.forward, -fromAttacker) <= blockAngle * 0.5f;

            if (State == CombatState.Blocking && facing && !hit.Unblockable)
            {
                if (Time.time - blockStartTime <= perfectParryWindow)
                {
                    if (hit.Attacker != null) hit.Attacker.GetComponent<IStaggerable>()?.Stagger(parryStaggerDuration);
                    counterUntil = Time.time + counterWindow;
                    var parried = new HitResult { Outcome = HitOutcome.Parried };
                    CombatEvents.RaiseHit(this, hit.Attacker, parried, point);
                    CombatFeedback.Spark(point + transform.forward * 0.4f, new Color(1f, 0.85f, 0.4f), 26);
                    CombatFeedback.HitStop(0.09f);
                    CombatFeedback.Shake(0.12f);
                    WorldUI.Toast("Đỡ Hoàn Hảo! Đánh ngay để Phản Kích", new Color(1f, 0.9f, 0.5f));
                    Parried?.Invoke();
                    return parried;
                }

                float raw = DamageCalculator.Calculate(hit.AttackerStats, stats, hit.Multiplier, false, out _, out _);
                bool enoughStamina = stats.DrainStamina(blockStaminaPerHit + hit.PoiseDamage * 0.2f);
                float blockedDamage = enoughStamina ? Mathf.Max(1f, Mathf.Round(raw * (1f - blockDamageReduction))) : raw;
                bool killedWhileBlocking = stats.ApplyDamage(blockedDamage);
                var blocked = new HitResult { Outcome = HitOutcome.Blocked, Damage = blockedDamage, Killed = killedWhileBlocking };
                CombatEvents.RaiseHit(this, hit.Attacker, blocked, point);
                CombatFeedback.Spark(point + transform.forward * 0.4f, Color.white, 10);
                CombatFeedback.Shake(0.05f);
                if (!killedWhileBlocking)
                {
                    if (!enoughStamina)
                    {
                        WorldUI.Toast("Phá thế!", new Color(1f, 0.5f, 0.4f));
                        EnterHitReact(fromAttacker, hit.Knockback, true);
                    }
                    else
                    {
                        knockVelocity = fromAttacker * hit.Knockback * 0.4f;
                    }
                }
                return blocked;
            }

            float damage = DamageCalculator.Calculate(hit.AttackerStats, stats, hit.Multiplier, hit.ForceCritical, out bool crit, out bool evaded);
            if (evaded)
            {
                var miss = new HitResult { Outcome = HitOutcome.Evaded };
                CombatEvents.RaiseHit(this, hit.Attacker, miss, point);
                return miss;
            }

            bool killed = stats.ApplyDamage(damage);
            var result = new HitResult { Outcome = crit ? HitOutcome.Critical : HitOutcome.Hit, Damage = damage, Killed = killed };
            CombatEvents.RaiseHit(this, hit.Attacker, result, point);
            CombatFeedback.Shake(crit ? 0.15f : 0.08f);

            if (!killed && (hit.PoiseDamage >= hitReactPoiseThreshold || State != CombatState.Attacking))
                EnterHitReact(fromAttacker, hit.Knockback, false);
            return result;
        }
    }
}
