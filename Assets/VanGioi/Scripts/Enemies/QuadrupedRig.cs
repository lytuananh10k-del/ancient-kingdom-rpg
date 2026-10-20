using UnityEngine;

namespace VanGioi.Enemies
{
    public enum QuadrupedPose { None, Windup, Strike, Charge, Stagger, Hit }

    /// <summary>
    /// Animation thủ tục cho yêu thú bốn chân placeholder (sói, lợn rừng):
    /// bước chân chéo theo tốc độ, lấy đà / vồ / lao húc, choáng, trúng đòn, ngã chết.
    /// Model thật có Animator → EnemyAI đẩy tham số Animator thay vì dùng rig này.
    /// </summary>
    public class QuadrupedRig : MonoBehaviour
    {
        public Transform body;
        public Transform head;
        public Transform legFL, legFR, legBL, legBR;
        public Transform tail;
        [SerializeField] float stride = 1.1f;
        [SerializeField] float legSwing = 38f;

        float phase, moveWeight, deadWeight;
        QuadrupedPose pose;
        float poseTime, poseDuration;
        bool dead;
        Vector3 bodyBasePos;
        Quaternion bodyBase, headBase, flBase, frBase, blBase, brBase, tailBase, rootBase;
        bool cached;

        void Cache()
        {
            if (body == null) return;
            bodyBasePos = body.localPosition;
            bodyBase = body.localRotation;
            headBase = head ? head.localRotation : Quaternion.identity;
            flBase = legFL ? legFL.localRotation : Quaternion.identity;
            frBase = legFR ? legFR.localRotation : Quaternion.identity;
            blBase = legBL ? legBL.localRotation : Quaternion.identity;
            brBase = legBR ? legBR.localRotation : Quaternion.identity;
            tailBase = tail ? tail.localRotation : Quaternion.identity;
            rootBase = transform.localRotation;
            cached = true;
        }

        public void SetPose(QuadrupedPose newPose, float duration)
        {
            pose = newPose;
            poseTime = 0f;
            poseDuration = Mathf.Max(0.05f, duration);
        }

        public void SetDead(bool value) => dead = value;

        public void ResetPose()
        {
            pose = QuadrupedPose.None;
            dead = false;
            deadWeight = 0f;
            if (cached) transform.localRotation = rootBase;
        }

        public void Tick(float speed, float dt)
        {
            if (!cached) Cache();
            if (!cached) return;

            moveWeight = Mathf.MoveTowards(moveWeight, Mathf.Clamp01(speed / 4f), dt * 5f);
            deadWeight = Mathf.MoveTowards(deadWeight, dead ? 1f : 0f, dt * 3f);
            if (speed > 0.05f) phase += dt * speed / stride * Mathf.PI * 2f;

            float s = Mathf.Sin(phase);
            float leg = s * legSwing * moveWeight;
            float bodyPitch = 0f, headPitch = 0f, crouch = 0f, lunge = 0f, shakeYaw = 0f;

            if (pose != QuadrupedPose.None)
            {
                poseTime += dt;
                float t = Mathf.Clamp01(poseTime / poseDuration);
                float bell = Mathf.Sin(t * Mathf.PI);
                switch (pose)
                {
                    case QuadrupedPose.Windup:
                        bodyPitch = -10f * t; headPitch = -15f * t; crouch = 0.12f * t;
                        shakeYaw = Mathf.Sin(poseTime * 40f) * 2f * t;
                        break;
                    case QuadrupedPose.Strike:
                        bodyPitch = 12f * bell; headPitch = 30f * bell; lunge = 0.35f * bell;
                        break;
                    case QuadrupedPose.Charge:
                        bodyPitch = 8f; headPitch = 25f; leg = Mathf.Sin(phase * 1.5f) * legSwing * 1.3f;
                        break;
                    case QuadrupedPose.Stagger:
                        shakeYaw = Mathf.Sin(poseTime * 25f) * 12f * (1f - t); headPitch = -20f * (1f - t); crouch = 0.08f;
                        break;
                    case QuadrupedPose.Hit:
                        bodyPitch = -6f * bell; headPitch = -12f * bell;
                        break;
                }
                if (poseTime >= poseDuration && pose != QuadrupedPose.Charge) pose = QuadrupedPose.None;
            }

            if (legFL) legFL.localRotation = flBase * Quaternion.Euler(leg, 0, 0);
            if (legBR) legBR.localRotation = brBase * Quaternion.Euler(leg, 0, 0);
            if (legFR) legFR.localRotation = frBase * Quaternion.Euler(-leg, 0, 0);
            if (legBL) legBL.localRotation = blBase * Quaternion.Euler(-leg, 0, 0);
            if (tail) tail.localRotation = tailBase * Quaternion.Euler(0, Mathf.Sin(Time.time * (3f + moveWeight * 6f)) * 20f, 0);
            if (head) head.localRotation = headBase * Quaternion.Euler(headPitch, shakeYaw, 0);

            float bob = Mathf.Abs(Mathf.Cos(phase)) * 0.05f * moveWeight;
            body.localPosition = bodyBasePos + new Vector3(0, bob - crouch, lunge);
            body.localRotation = bodyBase * Quaternion.Euler(bodyPitch, shakeYaw * 0.5f, 0);

            // Ngã nghiêng sang một bên khi chết.
            transform.localRotation = rootBase * Quaternion.Euler(0, 0, 88f * deadWeight);
        }
    }
}
