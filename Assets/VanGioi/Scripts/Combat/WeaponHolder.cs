using UnityEngine;

namespace VanGioi.Combat
{
    /// <summary>
    /// Rút / tra vũ khí giữa hai socket (tay phải ↔ sau lưng) và bật vệt kiếm (TrailRenderer).
    /// Đặt trên object gốc của model nhân vật – thay model thì gán lại các socket.
    /// Với model Humanoid: handSocket = animator.GetBoneTransform(HumanBodyBones.RightHand).
    /// </summary>
    public class WeaponHolder : MonoBehaviour
    {
        [SerializeField] Transform weapon;
        [SerializeField] Transform handSocket;
        [SerializeField] Transform backSocket;
        [Header("Tư thế cầm")]
        [SerializeField] Vector3 handLocalPosition = Vector3.zero;
        [SerializeField] Vector3 handLocalEuler = new Vector3(90f, 0f, 0f);
        [SerializeField] Vector3 backLocalPosition = new Vector3(0.18f, 0.32f, 0f);
        [SerializeField] Vector3 backLocalEuler = new Vector3(0f, 0f, 145f);
        [Header("Hiệu ứng")]
        [SerializeField] TrailRenderer trail;
        [Tooltip("Tự tra kiếm sau khoảng thời gian không chiến đấu (giây). 0 = không tự tra.")]
        [SerializeField] float autoSheathDelay = 6f;

        float lastUseTime;

        public bool IsDrawn { get; private set; }
        public Transform Weapon => weapon;

        public void Configure(Transform weaponRoot, Transform hand, Transform back, TrailRenderer weaponTrail)
        {
            weapon = weaponRoot;
            handSocket = hand;
            backSocket = back;
            trail = weaponTrail;
            Attach(backSocket, backLocalPosition, backLocalEuler);
            IsDrawn = false;
        }

        void Start()
        {
            if (trail != null) trail.emitting = false;
            Attach(backSocket, backLocalPosition, backLocalEuler);
        }

        public void Draw()
        {
            lastUseTime = Time.time;
            if (IsDrawn || handSocket == null) return;
            Attach(handSocket, handLocalPosition, handLocalEuler);
            IsDrawn = true;
        }

        public void Sheath()
        {
            if (!IsDrawn) return;
            SetTrail(false);
            Attach(backSocket, backLocalPosition, backLocalEuler);
            IsDrawn = false;
        }

        public void MarkUsed() => lastUseTime = Time.time;

        public void SetTrail(bool on)
        {
            if (trail == null) return;
            if (on && !trail.emitting) trail.Clear();
            trail.emitting = on;
            if (on) lastUseTime = Time.time;
        }

        public void SetTrailColor(Color color)
        {
            if (trail == null) return;
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(color, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(color.a, 0f), new GradientAlphaKey(0f, 1f) });
            trail.colorGradient = g;
        }

        void Update()
        {
            if (IsDrawn && autoSheathDelay > 0f && Time.time - lastUseTime > autoSheathDelay) Sheath();
        }

        void Attach(Transform socket, Vector3 localPos, Vector3 localEuler)
        {
            if (weapon == null || socket == null) return;
            weapon.SetParent(socket, false);
            weapon.localPosition = localPos;
            weapon.localRotation = Quaternion.Euler(localEuler);
        }
    }
}
