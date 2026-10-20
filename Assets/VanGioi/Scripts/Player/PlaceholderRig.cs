using UnityEngine;

namespace VanGioi.Player
{
    public enum RigAction { None, SlashRight, SlashLeft, Overhead, Thrust, Spin, Dodge, Backstep, HitReact, Parry }

    /// <summary>
    /// "Hệ xương" placeholder làm từ primitive, đặt tên khớp theo chuẩn Humanoid
    /// (Hips, Spine, Head, LeftUpperArm…). Có animation thủ tục:
    ///  • Locomotion: Idle / Walk / Run / Sprint / Jump / Fall / Land.
    ///  • Hành động (Giai đoạn 2): 5 kiểu chém, né / lùi, trúng đòn, đỡ, đỡ hoàn hảo, tử vong.
    ///
    /// Khi gắn model Humanoid thật có Animator, PlayerAnimationController tự ưu tiên Animator
    /// và component này không còn được dùng (có thể xoá cả object PlaceholderModel).
    /// </summary>
    public class PlaceholderRig : MonoBehaviour
    {
        public Transform hips;
        public Transform spine;
        public Transform head;
        public Transform leftUpperArm;
        public Transform rightUpperArm;
        public Transform leftUpperLeg;
        public Transform rightUpperLeg;

        [Header("Biên độ")]
        [SerializeField] float legSwing = 42f;
        [SerializeField] float armSwing = 34f;
        [SerializeField] float hipBob = 0.05f;
        [SerializeField] float strideLength = 1.35f;

        /// <summary>Một tư thế (góc Euler cục bộ cộng thêm vào tư thế gốc).</summary>
        struct Pose
        {
            public Vector3 rArm, lArm, spine, head, lLeg, rLeg;
            public float yaw, hipDrop;

            public static Pose Lerp(in Pose a, in Pose b, float t) => new Pose
            {
                rArm = Vector3.LerpUnclamped(a.rArm, b.rArm, t),
                lArm = Vector3.LerpUnclamped(a.lArm, b.lArm, t),
                spine = Vector3.LerpUnclamped(a.spine, b.spine, t),
                head = Vector3.LerpUnclamped(a.head, b.head, t),
                lLeg = Vector3.LerpUnclamped(a.lLeg, b.lLeg, t),
                rLeg = Vector3.LerpUnclamped(a.rLeg, b.rLeg, t),
                yaw = Mathf.LerpUnclamped(a.yaw, b.yaw, t),
                hipDrop = Mathf.LerpUnclamped(a.hipDrop, b.hipDrop, t),
            };
        }

        float phase;
        float airWeight, moveWeight, leanWeight, landSquash;
        Vector3 hipsBasePos;
        Quaternion spineBase, headBase, lArmBase, rArmBase, lLegBase, rLegBase, rootBase;
        bool cached;

        RigAction action;
        float actionTime, actionDuration, actionActiveStart, actionActiveEnd;
        Pose actionFrom, actionTo;
        bool blocking;
        float blockWeight;
        bool dead;
        float deadWeight;

        void CacheBasePose()
        {
            if (hips == null) return;
            hipsBasePos = hips.localPosition;
            spineBase = spine ? spine.localRotation : Quaternion.identity;
            headBase = head ? head.localRotation : Quaternion.identity;
            lArmBase = leftUpperArm ? leftUpperArm.localRotation : Quaternion.identity;
            rArmBase = rightUpperArm ? rightUpperArm.localRotation : Quaternion.identity;
            lLegBase = leftUpperLeg ? leftUpperLeg.localRotation : Quaternion.identity;
            rLegBase = rightUpperLeg ? rightUpperLeg.localRotation : Quaternion.identity;
            rootBase = transform.localRotation;
            cached = true;
        }

        public void TriggerLand(float impactSpeed) => landSquash = Mathf.Clamp01(impactSpeed / 15f);
        public void SetBlocking(bool on) => blocking = on;
        public void SetDead(bool on) => dead = on;

        /// <summary>
        /// Phát một hành động. activeStart/End (giây) là lúc vung kiếm – tư thế chuẩn bị giữ tới
        /// activeStart, rồi vung sang tư thế kết thúc trước activeEnd.
        /// </summary>
        public void PlayAction(RigAction newAction, float duration, float activeStart = -1f, float activeEnd = -1f)
        {
            action = newAction;
            actionTime = 0f;
            actionDuration = Mathf.Max(0.05f, duration);
            actionActiveStart = activeStart >= 0f ? activeStart : duration * 0.25f;
            actionActiveEnd = activeEnd >= 0f ? activeEnd : duration * 0.5f;
            GetPoses(newAction, out actionFrom, out actionTo);
        }

        /// <param name="speed">Tốc độ ngang (m/s).</param>
        /// <param name="speed01">0 = đứng yên, 1 = chạy nhanh tối đa.</param>
        public void Tick(float speed, float speed01, bool grounded, float verticalVelocity, float dt)
        {
            if (!cached) CacheBasePose();
            if (!cached) return;

            airWeight = Mathf.MoveTowards(airWeight, grounded ? 0f : 1f, dt * 6f);
            moveWeight = Mathf.MoveTowards(moveWeight, grounded ? Mathf.Clamp01(speed01 * 1.6f) : 0f, dt * 5f);
            leanWeight = Mathf.MoveTowards(leanWeight, grounded ? Mathf.Clamp01((speed01 - 0.6f) / 0.4f) : 0f, dt * 4f);
            landSquash = Mathf.MoveTowards(landSquash, 0f, dt * 4f);
            blockWeight = Mathf.MoveTowards(blockWeight, blocking ? 1f : 0f, dt * 10f);
            deadWeight = Mathf.MoveTowards(deadWeight, dead ? 1f : 0f, dt * (dead ? 2.5f : 6f));

            // Tần số bước theo tốc độ thực → chân không bị "trượt băng".
            if (grounded && speed > 0.05f) phase += dt * speed / strideLength * Mathf.PI * 2f;
            else phase = Mathf.MoveTowards(phase, Mathf.Round(phase / Mathf.PI) * Mathf.PI, dt * 6f);

            float s = Mathf.Sin(phase);
            float idleBreath = Mathf.Sin(Time.time * 2.2f) * (1f - moveWeight) * (1f - airWeight);

            // ---- Locomotion
            float leg = s * legSwing * moveWeight;
            float tuckL = -55f * airWeight, tuckR = -15f * airWeight;
            if (verticalVelocity < -2f) { tuckL *= 0.6f; tuckR *= 0.6f; }
            float arm = s * armSwing * moveWeight;
            float spread = 35f * airWeight;

            var loco = new Pose
            {
                lLeg = new Vector3(leg + tuckL, 0, 0),
                rLeg = new Vector3(-leg + tuckR, 0, 0),
                lArm = new Vector3(-arm - 20f * airWeight, 0, -spread - 4f),
                rArm = new Vector3(arm - 20f * airWeight, 0, spread + 4f),
                spine = new Vector3(4f * moveWeight + 12f * leanWeight + idleBreath * 1.5f, 0, 0),
                head = new Vector3(-6f * leanWeight, 0, 0),
            };

            // ---- Đỡ đòn (giữ)
            if (blockWeight > 0f)
            {
                var guard = new Pose
                {
                    rArm = new Vector3(-75f, -35f, 0f), lArm = new Vector3(-60f, 40f, 0f),
                    spine = new Vector3(8f, -10f, 0f), lLeg = new Vector3(leg * 0.5f - 10f, 0, 0), rLeg = new Vector3(-leg * 0.5f + 10f, 0, 0),
                    hipDrop = 0.08f
                };
                loco = Pose.Lerp(loco, guard, blockWeight);
            }

            // ---- Hành động
            var final = loco;
            if (action != RigAction.None)
            {
                actionTime += dt;
                float t = actionTime;
                Pose current;
                if (t < actionActiveStart) current = Pose.Lerp(Rest(loco), actionFrom, Ease(t / Mathf.Max(0.01f, actionActiveStart)));
                else if (t < actionActiveEnd) current = Pose.Lerp(actionFrom, actionTo, Ease((t - actionActiveStart) / Mathf.Max(0.01f, actionActiveEnd - actionActiveStart)));
                else current = actionTo;

                float n = t / actionDuration;
                float w = n > 0.75f ? Mathf.Clamp01((1f - n) / 0.25f) : 1f;
                final = Pose.Lerp(loco, current, w);
                if (n >= 1f) action = RigAction.None;
            }

            // ---- Tử vong
            if (deadWeight > 0f)
            {
                var deathPose = new Pose { rArm = new Vector3(-20f, 0, 70f), lArm = new Vector3(-20f, 0, -70f), spine = new Vector3(-10f, 0, 0), head = new Vector3(-20f, 0, 0) };
                final = Pose.Lerp(final, deathPose, deadWeight);
            }

            Apply(final, idleBreath);
        }

        static Pose Rest(in Pose loco) => loco;
        static float Ease(float x) { x = Mathf.Clamp01(x); return x * x * (3f - 2f * x); }

        void Apply(in Pose p, float idleBreath)
        {
            if (leftUpperLeg) leftUpperLeg.localRotation = lLegBase * Quaternion.Euler(p.lLeg);
            if (rightUpperLeg) rightUpperLeg.localRotation = rLegBase * Quaternion.Euler(p.rLeg);
            if (leftUpperArm) leftUpperArm.localRotation = lArmBase * Quaternion.Euler(p.lArm);
            if (rightUpperArm) rightUpperArm.localRotation = rArmBase * Quaternion.Euler(p.rArm);
            if (spine) spine.localRotation = spineBase * Quaternion.Euler(p.spine);
            if (head) head.localRotation = headBase * Quaternion.Euler(p.head);

            // Ngã ngửa quanh gót chân khi chết.
            transform.localRotation = rootBase * Quaternion.Euler(-85f * deadWeight, p.yaw, 0f);

            float bob = Mathf.Abs(Mathf.Cos(phase)) * hipBob * moveWeight;
            hips.localPosition = hipsBasePos + Vector3.up * (bob + idleBreath * 0.006f - landSquash * 0.12f - p.hipDrop);
        }

        static void GetPoses(RigAction a, out Pose from, out Pose to)
        {
            from = default;
            to = default;
            switch (a)
            {
                case RigAction.SlashRight:
                    from = new Pose { rArm = new Vector3(-85f, 95f, 0f), lArm = new Vector3(-20f, 0f, -20f), spine = new Vector3(5f, 35f, 0f), lLeg = new Vector3(-15f, 0, 0), rLeg = new Vector3(10f, 0, 0) };
                    to = new Pose { rArm = new Vector3(-85f, -65f, 0f), lArm = new Vector3(-30f, 0f, -35f), spine = new Vector3(10f, -30f, 0f), lLeg = new Vector3(-25f, 0, 0), rLeg = new Vector3(15f, 0, 0), hipDrop = 0.06f };
                    break;
                case RigAction.SlashLeft:
                    from = new Pose { rArm = new Vector3(-85f, -70f, 0f), lArm = new Vector3(-20f, 0f, -30f), spine = new Vector3(5f, -35f, 0f), rLeg = new Vector3(-15f, 0, 0) };
                    to = new Pose { rArm = new Vector3(-85f, 90f, 0f), lArm = new Vector3(-25f, 0f, -20f), spine = new Vector3(10f, 30f, 0f), rLeg = new Vector3(-25f, 0, 0), lLeg = new Vector3(15f, 0, 0), hipDrop = 0.06f };
                    break;
                case RigAction.Overhead:
                    from = new Pose { rArm = new Vector3(-175f, 10f, 0f), lArm = new Vector3(-160f, -10f, 0f), spine = new Vector3(-12f, 0f, 0f), head = new Vector3(-10f, 0, 0) };
                    to = new Pose { rArm = new Vector3(-40f, -5f, 0f), lArm = new Vector3(-45f, 0f, 0f), spine = new Vector3(25f, 0f, 0f), lLeg = new Vector3(-35f, 0, 0), rLeg = new Vector3(20f, 0, 0), hipDrop = 0.14f };
                    break;
                case RigAction.Thrust:
                    from = new Pose { rArm = new Vector3(-30f, 40f, 30f), lArm = new Vector3(-60f, -30f, 0f), spine = new Vector3(0f, 30f, 0f), rLeg = new Vector3(10f, 0, 0) };
                    to = new Pose { rArm = new Vector3(-92f, 0f, 0f), lArm = new Vector3(20f, 0f, -30f), spine = new Vector3(18f, -15f, 0f), lLeg = new Vector3(-45f, 0, 0), rLeg = new Vector3(30f, 0, 0), hipDrop = 0.16f };
                    break;
                case RigAction.Spin:
                    from = new Pose { rArm = new Vector3(-80f, 80f, 0f), lArm = new Vector3(-60f, -60f, 0f), spine = new Vector3(5f, 20f, 0f), yaw = -40f, hipDrop = 0.08f };
                    to = new Pose { rArm = new Vector3(-85f, 80f, 0f), lArm = new Vector3(-60f, -60f, 0f), spine = new Vector3(8f, 0f, 0f), yaw = 360f, hipDrop = 0.12f };
                    break;
                case RigAction.Dodge:
                    from = new Pose { rArm = new Vector3(-40f, 0f, 15f), lArm = new Vector3(-40f, 0f, -15f), spine = new Vector3(45f, 0f, 0f), head = new Vector3(20f, 0, 0), lLeg = new Vector3(-70f, 0, 0), rLeg = new Vector3(-30f, 0, 0), hipDrop = 0.35f };
                    to = from;
                    break;
                case RigAction.Backstep:
                    from = new Pose { rArm = new Vector3(20f, 0f, 25f), lArm = new Vector3(20f, 0f, -25f), spine = new Vector3(-15f, 0f, 0f), lLeg = new Vector3(30f, 0, 0), rLeg = new Vector3(-20f, 0, 0), hipDrop = 0.15f };
                    to = from;
                    break;
                case RigAction.HitReact:
                    from = new Pose { rArm = new Vector3(15f, 0f, 30f), lArm = new Vector3(15f, 0f, -30f), spine = new Vector3(-22f, 0f, 8f), head = new Vector3(-15f, 0, 0), hipDrop = 0.05f };
                    to = from;
                    break;
                case RigAction.Parry:
                    from = new Pose { rArm = new Vector3(-70f, -30f, 0f), lArm = new Vector3(-50f, 30f, 0f), spine = new Vector3(0f, -15f, 0f) };
                    to = new Pose { rArm = new Vector3(-110f, 30f, 0f), lArm = new Vector3(-30f, 0f, -20f), spine = new Vector3(-5f, 15f, 0f) };
                    break;
            }
        }
    }
}
