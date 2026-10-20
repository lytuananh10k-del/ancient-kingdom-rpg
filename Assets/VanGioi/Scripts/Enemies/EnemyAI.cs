using System.Collections.Generic;
using UnityEngine;
using VanGioi.Combat;
using VanGioi.Data;
using VanGioi.Stats;

namespace VanGioi.Enemies
{
    public enum EnemyState { Idle, Patrol, Alert, Chase, Attack, Stagger, Return, Dead }

    /// <summary>
    /// AI yêu thú – máy trạng thái:
    ///   Idle ⇄ Patrol → (thấy người chơi) Alert → Chase → Attack (Báo hiệu → Ra đòn → Thu chiêu)
    ///   → Chase … ; mất dấu / chạy quá xa nhà → Return (hồi đầy máu) → Idle
    ///   Bị phá thế / bị đỡ hoàn hảo → Stagger.  HP = 0 → Dead → (EnemySpawnZone) hồi sinh.
    ///
    /// Di chuyển bằng CharacterController + né vật cản đơn giản (không cần bake NavMesh),
    /// tách bầy để không chồng lên nhau, xin "lượt tấn công" từ EnemyManager để
    /// không quá nhiều con cùng đánh một lúc. Ngủ (không Update AI) khi ở xa người chơi.
    /// </summary>
    [RequireComponent(typeof(CharacterController), typeof(CharacterStats))]
    public class EnemyAI : MonoBehaviour, IDamageable, IStaggerable
    {
        public static readonly List<EnemyAI> All = new List<EnemyAI>();

        [SerializeField] EnemyData data;
        [SerializeField] LayerMask obstacleMask = ~0;
        [Tooltip("Thời gian giữ xác trước khi ẩn đi (giây).")]
        [SerializeField] float corpseTime = 3f;

        enum AttackPhase { Windup, Strike, Recover }

        CharacterController cc;
        CharacterStats stats;
        QuadrupedRig rig;
        Animator animator;
        Transform aimPoint;
        Transform visualRoot;
        Renderer[] renderers;
        MaterialPropertyBlock mpb;

        Vector3 home;
        Vector3 patrolTarget;
        float stateTimer;
        float lastAttackTime = -100f;
        float verticalVelocity;
        Vector3 knockVelocity;
        Vector3 moveVelocity;
        float poiseAccumulated;
        float lastPoiseHitTime;
        AttackPhase attackPhase;
        Vector3 chargeDirection;
        bool attackHitDone;
        float strafeSign = 1f;
        float flashTimer;
        Color flashColor;
        float telegraph;
        float lastDamagedTime = -100f;

        static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        static readonly int ColorId = Shader.PropertyToID("_Color");
        static readonly int AnimSpeed = Animator.StringToHash("Speed");
        static readonly int AnimAttack = Animator.StringToHash("Attack");
        static readonly int AnimHit = Animator.StringToHash("Hit");
        static readonly int AnimDead = Animator.StringToHash("Dead");

        // ------------------------------------------------------------------ Public

        public EnemyData Data => data;
        public EnemyState State { get; private set; } = EnemyState.Idle;
        public EnemySpawnZone Zone { get; set; }
        /// <summary>EnemyManager tắt AI của quái ở xa để tiết kiệm CPU.</summary>
        public bool AIActive { get; set; } = true;
        public bool IsTelegraphing => State == EnemyState.Attack && attackPhase == AttackPhase.Windup;
        public float LastDamagedTime => lastDamagedTime;
        public string DisplayName => data != null ? data.displayName : name;

        public Team Team => Team.Enemy;
        public bool IsAlive => State != EnemyState.Dead && stats != null && !stats.IsDead;
        public Transform AimPoint => aimPoint;
        public CharacterStats Stats => stats;

        public void Setup(EnemyData enemyData, Vector3 homePosition)
        {
            data = enemyData;
            home = homePosition;
            CacheComponents();
            stats.Initialize(enemyData.stats);
            aimPoint.localPosition = new Vector3(0f, cc.height * 0.6f, 0f);
            EnterState(EnemyState.Idle, Random.Range(0.5f, 3f));
        }

        // ------------------------------------------------------------------ Unity

        void Awake() => CacheComponents();

        void CacheComponents()
        {
            if (cc != null) return;
            cc = GetComponent<CharacterController>();
            stats = GetComponent<CharacterStats>();
            rig = GetComponentInChildren<QuadrupedRig>();
            animator = GetComponentInChildren<Animator>();
            visualRoot = rig != null ? rig.transform.parent : (animator != null ? animator.transform : transform);
            renderers = GetComponentsInChildren<Renderer>();
            mpb = new MaterialPropertyBlock();
            aimPoint = transform.Find("AimPoint");
            if (aimPoint == null)
            {
                aimPoint = new GameObject("AimPoint").transform;
                aimPoint.SetParent(transform, false);
                aimPoint.localPosition = new Vector3(0f, 0.6f, 0f);
            }
        }

        void OnEnable()
        {
            All.Add(this);
            TargetRegistry.Register(this);
        }

        void OnDisable()
        {
            All.Remove(this);
            TargetRegistry.Unregister(this);
            EnemyManager.Instance?.ReleaseAttackToken(this);
        }

        void Update()
        {
            if (data == null) return;
            float dt = Time.deltaTime;
            UpdateFlash(dt);

            if (State == EnemyState.Dead)
            {
                stateTimer -= dt;
                if (rig != null) rig.Tick(0f, dt);
                if (stateTimer <= 0f && visualRoot != null && visualRoot.gameObject.activeSelf) visualRoot.gameObject.SetActive(false);
                return;
            }
            if (!AIActive) return;

            var manager = EnemyManager.Instance;
            var player = manager != null ? manager.Player : CombatSystem.Player;
            stateTimer -= dt;
            Vector3 desired = Vector3.zero;
            Vector3? face = null;

            switch (State)
            {
                case EnemyState.Idle:
                    if (CanSense(player)) { BecomeAlert(player, true); break; }
                    if (stateTimer <= 0f) { patrolTarget = RandomPatrolPoint(); EnterState(EnemyState.Patrol, 12f); }
                    break;

                case EnemyState.Patrol:
                    if (CanSense(player)) { BecomeAlert(player, true); break; }
                    Vector3 toPatrol = Flat(patrolTarget - transform.position);
                    if (toPatrol.magnitude < 1f || stateTimer <= 0f) EnterState(EnemyState.Idle, Random.Range(2f, 5f));
                    else desired = toPatrol.normalized * data.walkSpeed;
                    break;

                case EnemyState.Alert:
                    if (player != null) face = player.transform.position;
                    if (stateTimer <= 0f) EnterState(EnemyState.Chase, 0f);
                    break;

                case EnemyState.Chase:
                    UpdateChase(player, ref desired, ref face);
                    break;

                case EnemyState.Attack:
                    UpdateAttack(player, ref desired, ref face, dt);
                    break;

                case EnemyState.Stagger:
                    if (stateTimer <= 0f) EnterState(EnemyState.Chase, 0f);
                    break;

                case EnemyState.Return:
                    Vector3 toHome = Flat(home - transform.position);
                    if (toHome.magnitude < 1.5f)
                    {
                        stats.RestoreAll();
                        EnterState(EnemyState.Idle, Random.Range(1f, 3f));
                    }
                    else desired = toHome.normalized * data.runSpeed * 0.8f;
                    break;
            }

            Move(desired, face, dt);
        }

        // ------------------------------------------------------------------ States

        void EnterState(EnemyState next, float timer)
        {
            if (State == EnemyState.Attack && next != EnemyState.Attack)
            {
                EnemyManager.Instance?.ReleaseAttackToken(this);
                telegraph = 0f;
                if (rig != null && attackPhase == AttackPhase.Strike) rig.SetPose(QuadrupedPose.None, 0.1f);
            }
            State = next;
            stateTimer = timer;
        }

        void BecomeAlert(CombatSystem player, bool alertPack)
        {
            EnterState(EnemyState.Alert, 0.45f);
            strafeSign = Random.value < 0.5f ? -1f : 1f;
            if (alertPack && data.packAlertRadius > 0f) AlertPack(player);
        }

        void AlertPack(CombatSystem player)
        {
            float r2 = data.packAlertRadius * data.packAlertRadius;
            foreach (var other in All)
            {
                if (other == this || !other.IsAlive || other.data == null) continue;
                if (other.State != EnemyState.Idle && other.State != EnemyState.Patrol) continue;
                if ((other.transform.position - transform.position).sqrMagnitude > r2) continue;
                other.BecomeAlert(player, false);
            }
        }

        void UpdateChase(CombatSystem player, ref Vector3 desired, ref Vector3? face)
        {
            if (player == null || !player.IsAlive)
            {
                EnterState(EnemyState.Return, 0f);
                return;
            }
            Vector3 to = Flat(player.transform.position - transform.position);
            float dist = to.magnitude;
            float fromHome = Flat(transform.position - home).magnitude;
            if (dist > data.loseRange || fromHome > data.leashRange)
            {
                EnterState(EnemyState.Return, 0f);
                return;
            }

            face = player.transform.position;
            bool cooldownReady = Time.time - lastAttackTime >= data.attackCooldown;
            float reach = data.attackRange + cc.radius;
            bool inRange = data.attackKind == EnemyAttackKind.Charge
                ? dist <= data.attackRange && dist >= 3f
                : dist <= reach;

            if (inRange && cooldownReady && HasLineOfSight(player) && EnemyManager.RequestAttackToken(this))
            {
                StartAttack(player);
                return;
            }

            if (data.attackKind == EnemyAttackKind.Charge && dist < 3f)
            {
                // Quá gần để húc: lùi ra lấy đà.
                desired = -to.normalized * data.walkSpeed;
            }
            else if (dist <= reach * 1.8f && (!cooldownReady || !EnemyManager.HasTokenOrFree(this)))
            {
                // Chờ lượt: đi vòng quanh người chơi giữ khoảng cách.
                Vector3 side = Vector3.Cross(Vector3.up, to.normalized) * strafeSign;
                float keep = (dist - reach * 1.4f) * 0.8f;
                desired = (side * data.walkSpeed) + to.normalized * keep;
                if (Random.value < 0.005f) strafeSign = -strafeSign;
            }
            else
            {
                desired = to.normalized * data.runSpeed;
            }
        }

        void StartAttack(CombatSystem player)
        {
            EnterState(EnemyState.Attack, data.windup);
            attackPhase = AttackPhase.Windup;
            attackHitDone = false;
            chargeDirection = Flat(player.transform.position - transform.position).normalized;
            if (rig != null) rig.SetPose(QuadrupedPose.Windup, data.windup);
            if (animator != null) animator.SetTrigger(AnimAttack);
        }

        void UpdateAttack(CombatSystem player, ref Vector3 desired, ref Vector3? face, float dt)
        {
            switch (attackPhase)
            {
                case AttackPhase.Windup:
                    telegraph = 1f - Mathf.Clamp01(stateTimer / Mathf.Max(0.01f, data.windup));
                    if (player != null)
                    {
                        // Bám hướng người chơi trong lúc báo hiệu (chậm dần ở cuối để có thể né).
                        if (telegraph < 0.7f) chargeDirection = Flat(player.transform.position - transform.position).normalized;
                        face = transform.position + chargeDirection;
                    }
                    if (stateTimer <= 0f)
                    {
                        telegraph = 0f;
                        attackPhase = AttackPhase.Strike;
                        bool charge = data.attackKind == EnemyAttackKind.Charge;
                        stateTimer = charge ? data.chargeDuration : data.strikeDuration;
                        if (rig != null) rig.SetPose(charge ? QuadrupedPose.Charge : QuadrupedPose.Strike, stateTimer);
                    }
                    break;

                case AttackPhase.Strike:
                    face = transform.position + chargeDirection;
                    if (data.attackKind == EnemyAttackKind.Charge)
                    {
                        desired = chargeDirection * data.chargeSpeed;
                        if (!attackHitDone) TryHitPlayer(player, 1.2f);
                        if (State != EnemyState.Attack) break; // bị đỡ hoàn hảo → đã chuyển sang Stagger
                        if ((cc.collisionFlags & CollisionFlags.Sides) != 0 && stateTimer < data.chargeDuration - 0.15f) stateTimer = 0f;
                    }
                    else
                    {
                        desired = chargeDirection * 4f; // vồ tới
                        if (!attackHitDone) TryHitPlayer(player, data.attackRange * 0.6f);
                        if (State != EnemyState.Attack) break;
                    }
                    if (stateTimer <= 0f)
                    {
                        attackPhase = AttackPhase.Recover;
                        stateTimer = data.recovery;
                        if (rig != null) rig.SetPose(QuadrupedPose.None, 0.1f);
                        lastAttackTime = Time.time;
                        EnemyManager.Instance?.ReleaseAttackToken(this);
                    }
                    break;

                case AttackPhase.Recover:
                    if (player != null) face = player.transform.position;
                    if (stateTimer <= 0f) EnterState(EnemyState.Chase, 0f);
                    break;
            }
        }

        void TryHitPlayer(CombatSystem player, float forwardOffset)
        {
            if (player == null || !player.IsAlive) return;
            Vector3 center = transform.position + Vector3.up * (cc.height * 0.5f) + transform.forward * forwardOffset;
            float radius = data.attackRadius * data.scale + 0.3f; // + bán kính người chơi
            Vector3 closest = player.transform.position + Vector3.up * Mathf.Clamp(center.y - player.transform.position.y, 0.2f, 1.6f);
            if ((closest - center).sqrMagnitude > radius * radius) return;

            attackHitDone = true;
            var hit = new HitInfo
            {
                Attacker = gameObject,
                AttackerStats = stats,
                AttackerTeam = Team.Enemy,
                Multiplier = data.attackMultiplier,
                PoiseDamage = data.attackPoise,
                Knockback = data.attackKnockback,
                Point = closest,
                Direction = Flat(player.transform.position - transform.position).normalized,
            };
            var result = player.ReceiveHit(hit);
            if (result.Outcome == HitOutcome.Parried) return; // Stagger() đã được gọi
            if (result.Landed) CombatFeedback.Spark(closest, new Color(1f, 0.35f, 0.25f), 10);
            if (data.attackKind == EnemyAttackKind.Charge && result.Landed) stateTimer = Mathf.Min(stateTimer, 0.15f);
        }

        // ------------------------------------------------------------------ Movement

        void Move(Vector3 desired, Vector3? facePoint, float dt)
        {
            if (desired.sqrMagnitude > 0.01f && State != EnemyState.Attack) desired = Avoid(desired);
            desired += Separation() * 2f;
            float accel = State == EnemyState.Attack ? 40f : 18f;
            moveVelocity = Vector3.MoveTowards(moveVelocity, desired, accel * dt);
            knockVelocity = Vector3.MoveTowards(knockVelocity, Vector3.zero, 18f * dt);

            if (cc.isGrounded && verticalVelocity < 0f) verticalVelocity = -2f;
            else verticalVelocity = Mathf.Max(verticalVelocity - 25f * dt, -50f);

            Vector3 motion = moveVelocity + knockVelocity;
            motion.y = verticalVelocity;
            cc.Move(motion * dt);

            Vector3 faceDir = facePoint.HasValue ? Flat(facePoint.Value - transform.position) : Flat(moveVelocity);
            if (faceDir.sqrMagnitude > 0.01f)
            {
                var target = Quaternion.LookRotation(faceDir.normalized, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, target, data.turnSpeed * dt);
            }

            float speed = Flat(moveVelocity).magnitude;
            if (rig != null) rig.Tick(speed, dt);
            if (animator != null) animator.SetFloat(AnimSpeed, speed, 0.1f, dt);
        }

        Vector3 Avoid(Vector3 desired)
        {
            float speed = desired.magnitude;
            Vector3 dir = desired / speed;
            Vector3 origin = transform.position + Vector3.up * (cc.height * 0.6f);
            float probe = 1.2f + cc.radius;
            if (!Blocked(origin, dir, probe)) return desired;
            foreach (float angle in AvoidAngles)
            {
                var alt = Quaternion.Euler(0f, angle * strafeSign, 0f) * dir;
                if (!Blocked(origin, alt, probe)) return alt * speed;
            }
            return desired;
        }

        static readonly float[] AvoidAngles = { 35f, -35f, 70f, -70f, 110f, -110f };

        bool Blocked(Vector3 origin, Vector3 dir, float distance)
        {
            if (!Physics.SphereCast(origin, cc.radius * 0.6f, dir, out var hit, distance, obstacleMask, QueryTriggerInteraction.Ignore))
                return false;
            if (hit.collider is TerrainCollider) return false;          // địa hình do CharacterController xử lý
            if (hit.collider.transform.IsChildOf(transform)) return false;
            if (hit.collider.GetComponentInParent<IDamageable>() != null) return false; // tách bầy xử lý riêng
            return Vector3.Angle(hit.normal, Vector3.up) > 50f;          // chỉ tránh "tường"
        }

        Vector3 Separation()
        {
            Vector3 push = Vector3.zero;
            float min = cc.radius * 2.4f;
            foreach (var other in All)
            {
                if (other == this || other.State == EnemyState.Dead) continue;
                Vector3 d = Flat(transform.position - other.transform.position);
                float m = d.magnitude;
                if (m < 0.001f || m > min) continue;
                push += d / m * (1f - m / min);
            }
            return push;
        }

        // ------------------------------------------------------------------ Perception

        bool CanSense(CombatSystem player)
        {
            if (player == null || !player.IsAlive) return false;
            if (Flat(transform.position - home).magnitude > data.leashRange) return false;
            Vector3 to = player.transform.position - transform.position;
            float dist = Flat(to).magnitude;
            if (dist > data.detectRange) return false;
            bool inCone = dist < 4f || Vector3.Angle(transform.forward, Flat(to)) <= data.detectAngle * 0.5f;
            return inCone && HasLineOfSight(player);
        }

        bool HasLineOfSight(CombatSystem player)
        {
            Vector3 eye = transform.position + Vector3.up * (cc.height * 0.8f);
            Vector3 target = player.AimPoint != null ? player.AimPoint.position : player.transform.position + Vector3.up;
            Vector3 dir = target - eye;
            float dist = dir.magnitude;
            if (!Physics.Raycast(eye, dir / dist, out var hit, dist, obstacleMask, QueryTriggerInteraction.Ignore)) return true;
            return hit.collider.transform.IsChildOf(player.transform) || hit.collider.transform.IsChildOf(transform);
        }

        Vector3 RandomPatrolPoint()
        {
            var c = Random.insideUnitCircle * data.patrolRadius;
            return home + new Vector3(c.x, 0f, c.y);
        }

        static Vector3 Flat(Vector3 v) => new Vector3(v.x, 0f, v.z);

        // ------------------------------------------------------------------ Damage

        public HitResult ReceiveHit(in HitInfo hit)
        {
            if (!IsAlive) return HitResult.Immune;

            float damage = DamageCalculator.Calculate(hit.AttackerStats, stats, hit.Multiplier, hit.ForceCritical, out bool crit, out bool evaded);
            if (evaded)
            {
                var miss = new HitResult { Outcome = HitOutcome.Evaded };
                CombatEvents.RaiseHit(this, hit.Attacker, miss, hit.Point);
                Aggro(hit.Attacker);
                return miss;
            }

            lastDamagedTime = Time.time;
            bool killed = stats.ApplyDamage(damage);
            var result = new HitResult { Outcome = crit ? HitOutcome.Critical : HitOutcome.Hit, Damage = damage, Killed = killed };
            CombatEvents.RaiseHit(this, hit.Attacker, result, hit.Point);
            Flash(Color.white, 0.12f);

            if (killed)
            {
                Die();
                return result;
            }

            knockVelocity = Flat(hit.Direction) * hit.Knockback * (1f / Mathf.Max(0.5f, data.scale));
            if (Time.time - lastPoiseHitTime > 3f) poiseAccumulated = 0f;
            lastPoiseHitTime = Time.time;
            poiseAccumulated += hit.PoiseDamage;
            if (poiseAccumulated >= data.poise || hit.IsCounter)
            {
                poiseAccumulated = 0f;
                Stagger(hit.IsCounter ? data.staggerTime * 2f : data.staggerTime);
            }
            else
            {
                if (rig != null && State != EnemyState.Attack) rig.SetPose(QuadrupedPose.Hit, 0.25f);
                if (animator != null) animator.SetTrigger(AnimHit);
                Aggro(hit.Attacker);
            }
            return result;
        }

        void Aggro(GameObject attacker)
        {
            if (State == EnemyState.Idle || State == EnemyState.Patrol || State == EnemyState.Return || State == EnemyState.Alert)
            {
                EnterState(EnemyState.Chase, 0f);
                if (data.packAlertRadius > 0f) AlertPack(CombatSystem.Player);
            }
        }

        public void Stagger(float duration)
        {
            if (!IsAlive) return;
            EnterState(EnemyState.Stagger, duration);
            moveVelocity = Vector3.zero;
            if (rig != null) rig.SetPose(QuadrupedPose.Stagger, duration);
            if (animator != null) animator.SetTrigger(AnimHit);
            Flash(new Color(1f, 0.9f, 0.4f), 0.25f);
        }

        void Die()
        {
            EnterState(EnemyState.Dead, corpseTime);
            moveVelocity = knockVelocity = Vector3.zero;
            cc.enabled = false;
            if (rig != null) rig.SetDead(true);
            if (animator != null) animator.SetBool(AnimDead, true);
            CombatEvents.RaiseEnemyKilled(data.displayName, data.expReward, data.goldReward);
            if (Zone != null) Zone.NotifyDeath(this);
        }

        /// <summary>Hồi sinh tại vị trí mới (dùng lại object – object pooling).</summary>
        public void Respawn(Vector3 position)
        {
            transform.SetPositionAndRotation(position, Quaternion.Euler(0f, Random.Range(0f, 360f), 0f));
            home = position;
            cc.enabled = true;
            stats.RestoreAll();
            if (visualRoot != null) visualRoot.gameObject.SetActive(true);
            if (rig != null) rig.ResetPose();
            if (animator != null) animator.SetBool(AnimDead, false);
            poiseAccumulated = 0f;
            verticalVelocity = 0f;
            lastAttackTime = -100f;
            EnterState(EnemyState.Idle, Random.Range(1f, 3f));
        }

        // ------------------------------------------------------------------ Flash / telegraph

        void Flash(Color color, float duration)
        {
            flashColor = color;
            flashTimer = duration;
        }

        void UpdateFlash(float dt)
        {
            if (renderers == null) return;
            flashTimer -= dt;
            Color tintColor = Color.white;
            float amount;
            if (flashTimer > 0f) { tintColor = flashColor; amount = 0.75f; }
            else if (telegraph > 0f) { tintColor = new Color(1f, 0.15f, 0.1f); amount = telegraph * (0.55f + 0.25f * Mathf.Sin(Time.time * 30f)); }
            else amount = 0f;

            bool active = amount > 0.01f;
            foreach (var r in renderers)
            {
                if (r == null) continue;
                if (!active)
                {
                    if (r.HasPropertyBlock()) r.SetPropertyBlock(null);
                    continue;
                }
                var baseColor = r.sharedMaterial != null && r.sharedMaterial.HasProperty(BaseColorId) ? r.sharedMaterial.GetColor(BaseColorId)
                    : r.sharedMaterial != null && r.sharedMaterial.HasProperty(ColorId) ? r.sharedMaterial.GetColor(ColorId) : Color.white;
                var c = Color.Lerp(baseColor, tintColor, amount);
                mpb.Clear();
                mpb.SetColor(BaseColorId, c);
                mpb.SetColor(ColorId, c);
                r.SetPropertyBlock(mpb);
            }
        }
    }
}
