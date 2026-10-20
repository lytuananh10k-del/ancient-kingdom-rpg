using UnityEngine;
using VanGioi.Player;

namespace VanGioi.World
{
    /// <summary>
    /// Cách nhanh nhất để chơi thử: tạo scene trống, thêm một GameObject rỗng, gắn script này
    /// và bấm Play. Nếu scene chưa có PlayerController, toàn bộ prototype sẽ được dựng lúc chạy.
    ///
    /// Khuyến nghị dùng menu "Vân Giới > Giai đoạn 1 > Dựng Scene Prototype" để dựng sẵn
    /// trong Editor (xem/chỉnh được trong Scene view và build ra máy thật an toàn hơn).
    /// </summary>
    public class PrototypeBootstrap : MonoBehaviour
    {
        [SerializeField] TerrainGenerationSettings terrainSettings = new TerrainGenerationSettings();
        [SerializeField] bool buildOnAwake = true;

        void Awake()
        {
            if (!buildOnAwake) return;
            if (FindFirstObjectByType<PlayerController>() != null) return;

            float t = Time.realtimeSinceStartup;
            var result = PrototypeWorldBuilder.Build(terrainSettings);
            Debug.Log($"[Vân Giới] Dựng prototype lúc chạy trong {(Time.realtimeSinceStartup - t) * 1000f:0} ms. Điểm xuất phát: {result.SpawnPoint}");
        }
    }
}
