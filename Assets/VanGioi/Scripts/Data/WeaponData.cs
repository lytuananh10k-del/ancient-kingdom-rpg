using UnityEngine;
using VanGioi.Stats;

namespace VanGioi.Data
{
    [CreateAssetMenu(menuName = "Vân Giới/Chiến đấu/Vũ khí", fileName = "Weapon_New")]
    public class WeaponData : ScriptableObject
    {
        public string displayName = "Thanh Phong Kiếm";
        [TextArea] public string description;
        public ComboData combo;
        [Tooltip("Chỉ số cộng thêm khi cầm vũ khí.")]
        public StatBlock bonusStats;
        [Tooltip("Prefab model vũ khí (tuỳ chọn). Để trống dùng kiếm placeholder.")]
        public GameObject modelPrefab;
        public Color trailColor = new Color(0.6f, 0.85f, 1f, 0.8f);
    }
}
