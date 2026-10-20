using UnityEngine;

namespace VanGioi.Player
{
    /// <summary>
    /// "Hệ xương" placeholder làm từ primitive, đặt tên khớp theo chuẩn Humanoid
    /// (Hips, Spine, Head, LeftUpperArm…). Có animation thủ tục (procedural) cho
    /// Idle / Walk / Run / Sprint / Jump / Fall để kiểm thử cảm giác điều khiển
    /// trước khi có model + animation clip thật.
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

        float phase;
        float airWeight;
        float moveWeight;
        float leanWeight;
        float landSquash;
        Vector3 hipsBasePos;
        Quaternion spineBase, headBase, lArmBase, rArmBase, lLegBase, rLegBase;
        bool cached;

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
            cached = true;
        }

        public void TriggerLand(float impactSpeed) => landSquash = Mathf.Clamp01(impactSpeed / 15f);

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

            // Tần số bước theo tốc độ thực → chân không bị "trượt băng".
            if (grounded && speed > 0.05f) phase += dt * speed / strideLength * Mathf.PI * 2f;
            else phase = Mathf.MoveTowards(phase, Mathf.Round(phase / Mathf.PI) * Mathf.PI, dt * 6f);

            float s = Mathf.Sin(phase);
            float idleBreath = Mathf.Sin(Time.time * 2.2f) * (1f - moveWeight) * (1f - airWeight);

            // Chân: vung trước/sau (âm = đưa về phía trước).
            float leg = s * legSwing * moveWeight;
            float tuckL = -55f * airWeight, tuckR = -15f * airWeight;
            if (verticalVelocity < -2f) { tuckL *= 0.6f; tuckR *= 0.6f; }
            if (leftUpperLeg) leftUpperLeg.localRotation = lLegBase * Quaternion.Euler(leg + tuckL, 0, 0);
            if (rightUpperLeg) rightUpperLeg.localRotation = rLegBase * Quaternion.Euler(-leg + tuckR, 0, 0);

            // Tay: ngược pha với chân, giang ra khi ở trên không.
            float arm = s * armSwing * moveWeight;
            float spread = 35f * airWeight;
            if (leftUpperArm) leftUpperArm.localRotation = lArmBase * Quaternion.Euler(-arm - 20f * airWeight, 0, -spread - 4f);
            if (rightUpperArm) rightUpperArm.localRotation = rArmBase * Quaternion.Euler(arm - 20f * airWeight, 0, spread + 4f);

            // Thân: nghiêng về trước khi chạy nhanh, thở khi đứng yên.
            if (spine) spine.localRotation = spineBase * Quaternion.Euler(4f * moveWeight + 12f * leanWeight + idleBreath * 1.5f, 0, 0);
            if (head) head.localRotation = headBase * Quaternion.Euler(-6f * leanWeight, 0, 0);

            float bob = Mathf.Abs(Mathf.Cos(phase)) * hipBob * moveWeight;
            hips.localPosition = hipsBasePos + Vector3.up * (bob + idleBreath * 0.006f - landSquash * 0.12f);
        }
    }
}
