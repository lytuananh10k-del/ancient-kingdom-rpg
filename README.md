# Vân Giới Truyền Kỳ 3D

Game nhập vai hành động 3D thế giới mở, đề tài tu tiên phương Đông, làm bằng **Unity 6 + C# + URP**, nhắm tới **Windows** và **Android**.

> Repo trước đây chứa bản 2D pixel "Vương Quốc Cổ Đại". Từ giờ repo dùng cho dự án 3D này.

| Tài liệu | Nội dung |
|---|---|
| [docs/GDD.md](docs/GDD.md) | Thiết kế tổng thể: 10 khu vực, cảnh giới, chiến đấu, kỹ năng, kiến trúc, lộ trình 6 giai đoạn |
| [docs/PHASE1_GUIDE.md](docs/PHASE1_GUIDE.md) | Giai đoạn 1: cài đặt, Inspector, dựng scene thủ công, kiểm thử, lỗi thường gặp, thay placeholder |
| [docs/PHASE2_GUIDE.md](docs/PHASE2_GUIDE.md) | Giai đoạn 2: chiến đấu, chỉ số, quái vật AI, Animator, dữ liệu ScriptableObject, kiểm thử & cân bằng |

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **1** | Địa hình 3D 500×500 m, nhân vật, camera góc nhìn thứ ba, đi/chạy/chạy nhanh/nhảy, va chạm, điều khiển PC + Android | ✅ Đã có mã nguồn |
| **2** | Combo 4 đòn, né (i-frame), đỡ / đỡ hoàn hảo / phản kích, khoá mục tiêu, chỉ số & sát thương, 3 loại quái AI hồi sinh, HUD, hiệu ứng đánh trúng, Animator Controller mẫu | ✅ Đã có mã nguồn |
| 3 | 5 kỹ năng, VFX, boss nhiều giai đoạn, chỉ số | ⏳ |
| 4 | NPC, nhiệm vụ, trang bị, tu luyện & đột phá | ⏳ |
| 5 | Thế giới mở 10 khu vực, ngự kiếm phi hành, tải khu vực động | ⏳ |
| 6 | Tối ưu, lưu game, kiểm thử, build Windows/Android | ⏳ |

## Chạy thử nhanh (5 phút)

**Yêu cầu:** Unity Hub + **Unity 6 (6000.0 LTS trở lên)**, cài thêm module *Windows Build Support (IL2CPP)* và *Android Build Support* (kèm OpenJDK, Android SDK & NDK) nếu muốn build.

1. Unity Hub → **New project** → template **Universal 3D** → đặt tên, ví dụ `VanGioiTruyenKy3D` → Create. Đóng Unity khi tạo xong.
2. Đưa mã nguồn repo vào thư mục project vừa tạo:
   ```bash
   cd VanGioiTruyenKy3D
   git init
   git remote add origin https://github.com/lytuananh10k-del/ancient-kingdom-rpg.git
   git fetch origin claude/van-gioi-truyen-ky-3d-sln96l
   git checkout -f -b van-gioi origin/claude/van-gioi-truyen-ky-3d-sln96l
   ```
   (Hoặc tải ZIP rồi chép thư mục `Assets/VanGioi` vào `Assets/` của project.)
3. Mở lại project trong Unity, đợi biên dịch xong.
4. Thanh menu → **Vân Giới → Dựng Scene Prototype (Giai đoạn 1–2)**.
   Công cụ sẽ sinh địa hình, làng Tàn Lão Thôn, ~900 cây, đá, nước, 4 khu quái, nhân vật, camera và lưu scene
   `Assets/VanGioi/Scenes/VanGioi_Prototype.unity` (đã thêm vào Build Settings).
5. Bấm **Play**. Click vào cửa sổ Game để khoá chuột.

Không muốn dùng menu? Tạo scene trống → thêm GameObject rỗng → gắn `PrototypeBootstrap` → Play.

## Điều khiển

| Hành động | Windows | Tay cầm | Android |
|---|---|---|---|
| Di chuyển | WASD / phím mũi tên | Cần trái | Joystick ảo (nửa trái màn hình, joystick nổi) |
| Xoay camera 360° | Chuột (giữ chuột phải nếu chưa khoá chuột) | Cần phải | Vuốt nửa phải màn hình |
| Zoom | Con lăn | – | – |
| Chạy nhanh | Giữ Shift | Nhấn cần trái / LT | Nút **Chạy** (bật/tắt) |
| Nhảy (giữ lâu nhảy cao hơn) | Space | A | Nút **Nhảy** |
| Đi bộ (bật/tắt) | Caps Lock | – | Đẩy joystick nhẹ |
| Đánh thường (combo 4 đòn) | Chuột trái | X | Nút **Đánh** |
| Đỡ đòn (bấm đúng lúc = đỡ hoàn hảo) | Giữ chuột phải | RB | Giữ nút **Đỡ** |
| Né / lùi né | Ctrl (+ hướng) | B | Nút **Né** |
| Khoá mục tiêu | T / chuột giữa | R3 | Nút **Khoá** |
| Kỹ năng Q E R F / Túi / Bản đồ | Q E R F / Tab / M | Y / – / Back | Nút tương ứng (đã nối input, chức năng có từ Giai đoạn 3–5) |
| Nhả / khoá chuột | Esc / click chuột trái | – | – |
| HUD gỡ lỗi · đổi mức đồ hoạ | F1 · F2 | – | – |

## Cấu trúc mã nguồn

```
Assets/VanGioi/
├── Editor/
│   ├── PrototypeSceneBuilder.cs     Menu "Vân Giới": dựng scene, lưu asset + dữ liệu, kiểm tra & áp dụng Player Settings
│   └── AnimatorControllerGenerator.cs Sinh Animator Controller mẫu (người chơi, yêu thú)
├── Data/                            Asset dữ liệu (vũ khí, combo, quái) – tạo bởi menu, chỉnh trong Inspector
├── Scripts/
│   ├── Core/
│   │   ├── GameManager.cs           Frame rate, khoá chuột, trạng thái game, phím hệ thống
│   │   └── GraphicsQualityManager.cs Low / Medium / High (render scale, bóng, MSAA, LOD, terrain, sương)
│   ├── Input/
│   │   ├── PlayerInputState.cs      Struct input dùng chung cho mọi thiết bị
│   │   ├── PlayerInputHub.cs        Gộp PC + tay cầm + cảm ứng → 1 state mỗi frame
│   │   ├── DesktopInputReader.cs    Bàn phím / chuột / tay cầm (Input System mới hoặc Input Manager cũ)
│   │   └── MobileInputController.cs Joystick ảo, vuốt camera, nút cảm ứng, Safe Area
│   ├── Player/
│   │   ├── PlayerController.cs      CharacterController: di chuyển theo camera, nhảy, trọng lực, dốc
│   │   ├── PlayerAnimationController.cs Đẩy tham số Animator hoặc điều khiển rig placeholder
│   │   ├── PlaceholderRig.cs        Animation thủ tục cho model placeholder
│   │   └── PlaceholderCharacterBuilder.cs Dựng tu sĩ placeholder (khớp kiểu Humanoid)
│   ├── CameraSystem/
│   │   └── ThirdPersonCamera.cs     Orbit 360°, zoom, bám mượt, tránh xuyên tường / địa hình
│   ├── World/
│   │   ├── ProceduralTerrainGenerator.cs Địa hình 500×500 m: đồi, vòng núi, sông, hồ, nền làng, 5 lớp đất
│   │   ├── PrototypeWorldBuilder.cs Dựng hệ thống, ánh sáng, làng, cây (LOD), đá, nước, nhân vật, camera
│   │   └── PrototypeBootstrap.cs    Dựng prototype lúc chạy trong scene trống
│   ├── Combat/
│   │   ├── CombatSystem.cs          Combo, né, đỡ, đỡ hoàn hảo, phản kích, trúng đòn, tử vong (người chơi)
│   │   ├── CombatTypes.cs           Team, HitInfo, HitResult, IDamageable, CombatEvents, DamageCalculator
│   │   ├── LockOnSystem.cs          Khoá mục tiêu
│   │   ├── TargetRegistry.cs        Danh sách mục tiêu + chọn mục tiêu tốt nhất
│   │   ├── WeaponHolder.cs          Rút/tra kiếm, vệt kiếm
│   │   └── CombatFeedback.cs        Hit-stop, rung camera, tia lửa, vệt kiếm khí (Object Pool)
│   ├── Stats/                       StatBlock, CharacterStats (HP/linh lực/thể lực, hồi phục), bảng cảnh giới
│   ├── Data/                        ScriptableObject: ComboData, WeaponData, EnemyData + DefaultGameData
│   ├── Enemies/
│   │   ├── EnemyAI.cs               Tuần tra → phát hiện → truy đuổi → tấn công → choáng → về nhà → chết → hồi sinh
│   │   ├── EnemyManager.cs          Giới hạn quái hoạt động, lượt tấn công
│   │   ├── EnemySpawnZone.cs        Khu sinh & hồi sinh quái (tái sử dụng object)
│   │   ├── EnemyFactory.cs          Tạo quái từ EnemyData (prefab hoặc placeholder sói / lợn rừng)
│   │   └── QuadrupedRig.cs          Animation thủ tục yêu thú 4 chân
│   ├── UI/
│   │   ├── PlayerHUD.cs             Thanh máu / linh lực / thể lực, cảnh giới, chiến lực, màn hình tử vong
│   │   ├── WorldUI.cs               Số sát thương, thanh máu quái, dấu khoá mục tiêu, thông báo
│   │   └── DebugHUD.cs              FPS, trạng thái nhân vật, bảng phím
│   └── Utils/                       MaterialFactory (URP/Built-in), MeshFactory, ProceduralTextures, ObjectUtil
└── Scenes/                          Scene được sinh vào đây
```

Nguyên tắc kiến trúc:
- **Gameplay không đọc input trực tiếp** — chỉ đọc `PlayerInputHub.Instance.State`, nên PC/Android/tay cầm dùng chung logic.
- **Điều khiển tách khỏi hình ảnh** — `PlayerController` không biết model; thay model/trang phục chỉ cần thay con của object `Visual`.
- **Không phụ thuộc tài nguyên có sẵn** — mọi mesh, texture, vật liệu placeholder được sinh bằng code và lưu vào `Assets/VanGioi/Generated/` (không commit; chạy lại menu để sinh lại, kết quả giống hệt nhờ seed cố định).
- Mã không tham chiếu trực tiếp assembly URP / Input System, nên vẫn biên dịch được nếu dự án thiếu một trong hai.

## Build

- **Windows:** File → Build Profiles → Windows → Build.
- **Android:** chạy **Vân Giới → Áp dụng Player Settings đề xuất** (IL2CPP, ARM64, màn hình ngang, Linear), File → Build Profiles → Android → Switch Platform → Build And Run.

Chi tiết, checklist kiểm thử và cách sửa lỗi: [docs/PHASE1_GUIDE.md](docs/PHASE1_GUIDE.md).
