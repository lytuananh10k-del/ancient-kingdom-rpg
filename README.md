# Vân Giới Truyền Kỳ 3D

Game nhập vai hành động 3D thế giới mở, đề tài tu tiên phương Đông, làm bằng **Unity 6 + C# + URP**, nhắm tới **Windows** và **Android**.

> Repo trước đây chứa bản 2D pixel "Vương Quốc Cổ Đại". Từ giờ repo dùng cho dự án 3D này.

| Tài liệu | Nội dung |
|---|---|
| [docs/GDD.md](docs/GDD.md) | Thiết kế tổng thể: 10 khu vực, cảnh giới, chiến đấu, kỹ năng, kiến trúc, lộ trình 6 giai đoạn |
| [docs/PHASE1_GUIDE.md](docs/PHASE1_GUIDE.md) | Giai đoạn 1: cài đặt, Inspector, dựng scene thủ công, kiểm thử, lỗi thường gặp, thay placeholder |

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **1** | Địa hình 3D 500×500 m, nhân vật, camera góc nhìn thứ ba, đi/chạy/chạy nhanh/nhảy, va chạm, điều khiển PC + Android | ✅ Đã có mã nguồn |
| 2 | Animation (Animator thật), combo, né/đỡ/phản công, khoá mục tiêu, quái vật AI | ⏳ |
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
4. Thanh menu → **Vân Giới → Giai đoạn 1 → Dựng Scene Prototype (500×500 m)**.
   Công cụ sẽ sinh địa hình, làng Tàn Lão Thôn, ~900 cây, đá, nước, nhân vật, camera và lưu scene
   `Assets/VanGioi/Scenes/Phase1_Prototype.unity` (đã thêm vào Build Settings).
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
| Đánh / Né / Kỹ năng Q E R F / Túi / Bản đồ | Chuột trái / Ctrl / Q E R F / Tab / M | X / B / Y / – / Back | Nút tương ứng (đã nối input, chức năng có từ Giai đoạn 2–5) |
| Nhả / khoá chuột | Esc / click chuột trái | – | – |
| HUD gỡ lỗi · đổi mức đồ hoạ | F1 · F2 | – | – |

## Cấu trúc mã nguồn

```
Assets/VanGioi/
├── Editor/
│   └── PrototypeSceneBuilder.cs     Menu "Vân Giới": dựng scene, lưu asset sinh ra, kiểm tra & áp dụng Player Settings
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
│   ├── UI/DebugHUD.cs               FPS, trạng thái nhân vật, bảng phím
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
