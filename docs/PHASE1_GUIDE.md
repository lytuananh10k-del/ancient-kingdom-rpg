# Giai đoạn 1 — Địa hình, nhân vật, camera, di chuyển

Mục tiêu: một bản prototype chơi được với địa hình **500 × 500 m**, nhân vật 3D, camera góc nhìn thứ ba xoay 360°, đi / chạy / chạy nhanh / nhảy, va chạm địa hình, chạy trên **Windows** và **Android**.

## 1. Thiết lập dự án Unity

| Mục | Giá trị |
|---|---|
| Phiên bản | Unity 6 (6000.0 LTS hoặc mới hơn) |
| Template | **Universal 3D** (có sẵn URP, Input System, uGUI) |
| Color Space | Linear (Project Settings → Player → Other Settings) |
| Active Input Handling | *Input System Package (New)* hoặc *Both* — mã hỗ trợ cả hai, kể cả *Input Manager (Old)* |
| Module Hub | Windows Build Support (IL2CPP), Android Build Support + OpenJDK + SDK & NDK |

Nếu dự án **không** tạo từ template Universal 3D:
1. Window → Package Manager → cài **Universal RP** và **Input System** (đồng ý khởi động lại).
2. Project → Create → Rendering → **URP Asset (with Universal Renderer)**.
3. Project Settings → **Graphics** → Default Render Pipeline = asset vừa tạo; Project Settings → **Quality** → gán cùng asset cho mọi mức.
4. Chạy **Vân Giới → Kiểm tra cấu hình dự án** — mọi dòng phải là ✔ (trừ hai dòng Android nếu chưa áp dụng Player Settings).

## 2. Dựng scene

### Cách A — tự động (khuyến nghị)
**Vân Giới → Giai đoạn 1 → Dựng Scene Prototype (500×500 m)**. Mất vài giây. Kết quả:

```
Phase1_Prototype (scene)
├── _Systems              GraphicsQualityManager, DebugHUD, PlayerInputHub, GameManager
│   └── MobileInput       MobileInputController (tự dựng UI cảm ứng khi chạy)
├── Environment
│   └── Sun               Directional Light, bóng Soft
├── Terrain_TanLaoThon    Terrain + TerrainCollider (500×500×160 m, 5 lớp đất)
├── World_Props
│   ├── Water             mặt nước (không collider)
│   ├── WorldBounds       4 tường vô hình
│   ├── TanLaoThon_Village  quảng trường, giếng, 6 nhà, cổng làng, tháp 3 tầng, JumpTestArea
│   ├── Trees             ~900 cây (thông, cây lá, cổ thụ) có LODGroup
│   └── Rocks             ~260 đá có MeshCollider convex
├── Player                CharacterController, PlayerController, PlayerAnimationController
│   └── Visual
│       └── PlaceholderModel  PlaceholderRig + Hips/Spine/Head/LeftUpperArm/…
└── Main Camera           Camera, AudioListener, ThirdPersonCamera
```

Asset sinh ra (TerrainData, TerrainLayer, texture, material, mesh) nằm ở `Assets/VanGioi/Generated/Phase1/`. Chạy lại menu sẽ xoá thư mục đó và sinh lại.

### Cách B — lúc chạy
Scene trống → GameObject rỗng → Add Component **PrototypeBootstrap** → Play. Có thể chỉnh seed, kích thước, số cây… trong Inspector của `PrototypeBootstrap`.
> Khi build bằng cách B, thêm `Universal Render Pipeline/Lit`, `Universal Render Pipeline/Terrain/Lit` và `Skybox/Procedural` vào Project Settings → Graphics → **Always Included Shaders**, nếu không shader có thể bị loại khỏi bản build. Cách A không cần bước này.

### Cách C — dựng tay với địa hình / model của bạn
1. Tạo Terrain (GameObject → 3D Object → Terrain), đặt Width/Length = 500.
2. **Player:** GameObject rỗng tên `Player`, tag `Player`, đặt trên mặt đất.
   - Add **CharacterController**: Height 1.85, Radius 0.32, Center (0, 0.945, 0), Slope Limit 45, Step Offset 0.4, Skin Width 0.02, Min Move Distance 0.
   - Add **PlayerController** (tự thêm nếu thiếu khi add PlayerAnimationController).
   - Add **PlayerAnimationController**.
   - Tạo con `Visual`, kéo model của bạn vào làm con của `Visual`.
3. **Camera:** Main Camera (tag `MainCamera`) → Add **ThirdPersonCamera**, kéo `Player` vào ô **Target**.
4. **Systems:** GameObject rỗng `_Systems` → Add **PlayerInputHub**, **GameManager**, **GraphicsQualityManager**, **DebugHUD**. Tạo con `MobileInput` → Add **MobileInputController**.
5. Play.

## 3. Tham số Inspector

### PlayerController
| Nhóm | Trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| Tham chiếu | Camera Transform | trống → Camera.main | hướng di chuyển tương đối theo camera |
| Tốc độ | Walk / Run / Sprint Speed | 2.2 / 5.5 / 9 m/s | |
| | Walk Input Threshold | 0.55 | joystick đẩy ít hơn → đi bộ |
| | Acceleration / Deceleration | 28 / 36 m/s² | tăng → khựng gọn hơn |
| | Turn Speed | 720 °/s | tốc độ xoay người |
| | Air Control | 0.35 | khả năng điều hướng trên không |
| Nhảy | Jump Height | 1.5 m | độ cao khi giữ phím |
| | Gravity | −25 | âm; mạnh hơn thật (−9.81) để cú nhảy chắc tay |
| | Fall / Low Jump Multiplier | 1.6 / 2.2 | rơi nhanh hơn; nhả phím sớm → nhảy thấp |
| | Coyote Time / Jump Buffer | 0.15 / 0.15 s | nhảy được ngay sau khi rời mép / bấm sớm |
| Mặt đất | Ground Mask | Everything | layer được coi là đất |
| | Ground Probe / Snap Distance | 0.2 / 0.6 m | dò đất / bám dốc khi chạy xuống |
| | Steep Slope Slide Speed | 5 | đẩy khỏi dốc dựng hơn Slope Limit |
| Khác | Push Power | 2 | lực đẩy Rigidbody (thùng hàng) |
| | Fall Reset Height | −40 | rơi quá thấp → về điểm hồi sinh |

### ThirdPersonCamera
| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| Target | Player | |
| Pivot Offset | (0, 1.55, 0) | điểm xoay ≈ ngang vai |
| Shoulder Offset | 0.35 | lệch vai phải; 0 = chính giữa |
| Sensitivity | 0.12 °/pixel | |
| Invert Y | tắt | |
| Min / Max Pitch | −35 / 75 | |
| Distance / Min / Max | 5 / 1.6 / 12 | zoom bằng con lăn |
| Follow / Vertical Follow Smooth Time | 0.05 / 0.12 s | độ trễ bám |
| Collision Mask / Radius / Buffer | Everything / 0.25 / 0.1 | tránh xuyên tường |
| Recover Speed | 6 m/s | camera lùi lại sau khi hết bị che |
| Min Terrain Clearance | 0.4 m | không chui xuống đất |

### MobileInputController
| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| Mode | Auto | Auto = chỉ trên điện thoại; **ForceOn** để thử trong Editor |
| Simulate Touch With Mouse | bật | Editor: chuột trái = một ngón tay |
| Joystick Zone Width | 0.42 | phần trái màn hình dành cho joystick |
| Joystick Radius / Dead Zone | 120 / 0.08 | |
| Swipe Sensitivity | 1.4 | độ nhạy vuốt camera |

### PlayerInputHub
`Mouse Look Scale`, `Touch Look Scale` nhân thêm độ nhạy (dùng cho menu Cài đặt sau này). `GameplayBlocked` (code) chặn input gameplay khi mở UI.

### GameManager
Target frame rate PC 60 / Android 60 (đặt 30 cho máy yếu), VSync PC, khoá chuột khi bắt đầu.

### GraphicsQualityManager
Ba mức **Low / Medium / High** chỉnh: render scale (0.7 / 0.85 / 1.0), khoảng bóng (35 / 70 / 140 m), MSAA (1 / 2 / 4), LOD bias, sai số pixel terrain, far clip, mật độ sương. Mặc định PC = High, Android = Medium, lưu bằng PlayerPrefs. F2 đổi mức lúc chạy. Các giá trị URP Asset được khôi phục khi thoát Play Mode.

## 4. Thiết kế bản đồ prototype (Tàn Lão Thôn)

- **Giữa bản đồ (250, 250):** nền làng phẳng cao 18 m, quảng trường đá + giếng cổ, 6 nhà mái ngói, cổng làng (phía nam), tháp cổ 3 tầng (phía bắc).
- **Điểm xuất phát:** (250, 18, 230), nhìn về phía bắc.
- **JumpTestArea** (phía nam quảng trường, trước cổng): 5 bậc đá cao 0.35 → 3.6 m, 4 thùng gỗ đẩy được.
- **Phía đông:** sông uốn khúc bắc → nam, mực nước 9 m, bờ cát; cắt qua vòng núi tạo hẻm.
- **Phía tây bắc:** hồ (125, 365).
- **Đông bắc:** ngọn tiên sơn đơn độc ~100 m.
- **Rìa bản đồ:** vòng núi cao 35–130 m có tuyết trên đỉnh — ranh giới tự nhiên; thêm tường vô hình ở biên.

## 5. Checklist kiểm thử

| # | Bước | Kết quả mong đợi |
|---|---|---|
| 1 | Play | Nhân vật rơi nhẹ xuống đất, HUD hiện FPS & trạng thái `Idle` |
| 2 | Giữ W, xoay chuột | Nhân vật luôn đi theo hướng camera, xoay mượt về hướng di chuyển |
| 3 | W + Shift | Trạng thái `Sprint`, ~9 m/s, thân nghiêng về trước |
| 4 | Caps Lock rồi W | `Walk`, ~2.2 m/s |
| 5 | Space nhấn nhanh / giữ | Nhảy thấp / nhảy ~1.5 m; khi chạm đất HUD về `Idle`/`Run` |
| 6 | Chạy khỏi mép bậc rồi bấm Space ngay | Vẫn nhảy được (coyote time) |
| 7 | Leo JumpTestArea (5 bậc 0.35 / 1.0 / 1.8 / 2.6 / 3.6 m) | Bậc đầu tự bước lên; các bậc sau phải nhảy; bậc 3.6 m không nhảy thẳng từ đất lên được, chỉ từ bậc 2.6 m |
| 8 | Đi vào thùng gỗ | Thùng bị đẩy đi |
| 9 | Chạy lên sườn núi | Dốc ≤ 45° đi được; dốc hơn → trượt xuống, HUD ghi "(quá dốc)" |
| 10 | Chạy xuống đồi | Không nảy lên nảy xuống (`Chạm đất: True` liên tục) |
| 11 | Đứng sát nhà, xoay camera ra sau tường | Camera kéo gần lại, không nhìn xuyên tường |
| 12 | Hạ camera xuống thấp | Camera không chui xuống đất |
| 13 | Lăn chuột | Zoom 1.6–12 m mượt |
| 14 | Esc / click | Nhả chuột / khoá lại |
| 15 | F2 | Đổi Low → Medium → High, FPS thay đổi tương ứng |
| 16 | `MobileInputController.Mode = ForceOn`, Play | Hiện joystick + nút; kéo chuột nửa trái = di chuyển, nửa phải = xoay camera, nút Nhảy / Chạy hoạt động |
| 17 | Build Android, chạy trên máy | Đa chạm: vừa di chuyển vừa xoay camera vừa bấm nhảy; UI không bị tai thỏ che |

**Mục tiêu hiệu năng Giai đoạn 1:** PC tầm trung ≥ 60 FPS ở High; Android tầm trung (Snapdragon 7-series / Dimensity 7000+) 45–60 FPS ở Medium, máy yếu dùng Low + 30 FPS. Đo bằng Window → Analysis → Profiler (kết nối thiết bị Android qua USB, bật *Development Build* + *Autoconnect Profiler*).

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách sửa |
|---|---|
| Mọi thứ màu hồng tím | Shader URP không chạy vì chưa gán URP Asset. Làm mục 1 rồi dựng lại scene. |
| Không có menu "Vân Giới" | Có lỗi biên dịch — xem Console. Thư mục `Editor` phải nằm đúng `Assets/VanGioi/Editor`. |
| `InvalidOperationException: You are trying to read Input using the UnityEngine.Input class…` | Script khác (không thuộc dự án này) dùng Input cũ. Đặt Active Input Handling = **Both**. |
| Nhân vật không di chuyển | Thiếu `PlayerInputHub` trong scene (Console có cảnh báo), hoặc `MovementLocked` đang bật. |
| Chuột không xoay camera | Chưa khoá chuột: click vào cửa sổ Game. Hoặc giữ chuột phải. |
| Camera giật khi xoay | Đặt Follow Smooth Time = 0; kiểm tra FPS; tắt *VSync* trong Game view nếu Editor bị giới hạn FPS. |
| Nhân vật rung khi đứng trên dốc | Giảm `Ground Snap Distance` hoặc tăng `Skin Width` của CharacterController lên 0.03–0.05. |
| Nhân vật lơ lửng trên đất | Visual lệch so với capsule; chỉnh `Center.y` = Height/2 và vị trí `Visual`. |
| Nhân vật xuyên địa hình khi rơi nhanh | Hiếm với CharacterController (va chạm quét liên tục). Kiểm tra Terrain có **TerrainCollider** và TerrainData đúng; giảm `Terminal Velocity`. |
| Ánh sáng tối / phẳng | Scene dùng Ambient Trilight không cần bake. Nếu đổi sang Skybox, vào Window → Rendering → Lighting → **Generate Lighting**. |
| Bóng đổ răng cưa | Tăng Shadow Resolution trong URP Asset, giảm khoảng bóng ở mức Low/Medium. |
| Android: màn hình đen / crash khi mở | Bắt buộc IL2CPP + ARM64 (menu Áp dụng Player Settings). Graphics API: để Auto (Vulkan + OpenGLES3). |
| Android: nút cảm ứng không hiện | `Mode` đang ForceOff, hoặc Canvas bị che — kiểm tra Console bằng `adb logcat -s Unity`. |
| Android FPS thấp | F2 không có trên điện thoại → đặt `Default Mobile Tier = Low` trong GraphicsQualityManager; giảm `treeCount` trong TerrainGenerationSettings. |

## 7. Thay placeholder bằng tài nguyên thật

### Nhân vật & animation
1. Lấy model Humanoid (ví dụ Mixamo, Unity Asset Store, hoặc tự làm trong Blender), import FBX → tab **Rig** → Animation Type = **Humanoid** → Apply.
2. Import các clip: Idle, Walk, Run, Sprint, Jump Start, Fall, Land (tab Animation: bật *Loop Time* cho Idle/Walk/Run/Sprint/Fall; **tắt** *Root Motion* — PlayerController điều khiển vị trí).
3. Tạo **Animator Controller** với các tham số (đúng tên, phân biệt hoa thường):

   | Tham số | Kiểu | Dùng cho |
   |---|---|---|
   | `Speed` | float | Blend Tree 1D: 0 Idle · 2.2 Walk · 5.5 Run · 9 Sprint |
   | `Speed01` | float | tuỳ chọn (0..1) |
   | `VerticalSpeed` | float | Blend Jump Up (> 0) / Fall (< 0) |
   | `Grounded` | bool | Locomotion ↔ Airborne |
   | `Sprinting` | bool | tuỳ chọn |
   | `MoveState` | int | tuỳ chọn: 0 Idle, 1 Walk, 2 Run, 3 Sprint, 4 Jump, 5 Fall |
   | `Jump` | trigger | Locomotion → JumpStart |
   | `Land` | trigger | Airborne → Land → Locomotion |

   Gợi ý state machine: `Locomotion (Blend Tree theo Speed)` → [Jump] → `JumpStart` → `Airborne (Blend Tree theo VerticalSpeed)` → [Grounded = true] → `Land` → `Locomotion`. Transition locomotion: Has Exit Time tắt, Transition Duration 0.1–0.15 s.
   Tham số nào không có trong Controller sẽ được bỏ qua — không lỗi.
4. Trong scene: xoá `Player/Visual/PlaceholderModel`, kéo model mới vào làm con của `Visual`, gán Animator Controller cho component Animator của model. Không cần sửa PlayerController.
5. Đổi model lúc chạy (trang phục, hoá thân): `GetComponent<PlayerAnimationController>().SetModel(newModelRoot)`.
6. Nếu model cao/thấp khác 1.8 m: chỉnh CharacterController Height/Center và `ThirdPersonCamera.Pivot Offset`.

Socket vũ khí placeholder: `Socket_RightHand`, `Socket_BackSword` — Giai đoạn 4 sẽ thay bằng hệ thống trang bị gắn vào xương `RightHand` của Humanoid (`animator.GetBoneTransform(HumanBodyBones.RightHand)`).

### Địa hình
- Texture đất: mở các file `TL_*.terrainlayer` trong `Generated/Phase1`, thay Diffuse bằng texture PBR thật (thêm Normal Map + Mask Map) — hoặc copy layer ra thư mục khác vì menu dựng lại sẽ ghi đè.
- Dùng địa hình riêng: thay `Terrain_TanLaoThon` bằng Terrain của bạn (Terrain Tools, Gaia, World Machine heightmap 513×513 RAW…). Mọi script khác không phụ thuộc cách sinh địa hình.
- Cây: thay cây primitive bằng prefab cây thật có **LOD Group** (SpeedTree hoặc cây low-poly), dùng Terrain → Paint Trees để tận dụng instancing của terrain.

### Môi trường
Skybox procedural, ánh sáng Trilight và sương Exponential được đặt trong `PrototypeWorldBuilder.BuildEnvironment()`. Giai đoạn 3/5 sẽ thay bằng chu kỳ ngày đêm, mây volumetric giả lập và Volume hậu kỳ (Bloom, Color Grading, Tonemapping ACES).

## 8. Build

### Windows
File → **Build Profiles** → Windows → *Add Open Scenes* (scene đã được thêm tự động) → **Build**. Thử ở mức High, kiểm tra FPS bằng F1.

### Android
1. **Vân Giới → Áp dụng Player Settings đề xuất (Windows + Android)**.
2. Build Profiles → Android → **Switch Platform**.
3. Bật *Developer options* + *USB debugging* trên điện thoại, cắm cáp → **Build And Run**.
4. Texture compression: ASTC (mặc định của Unity 6). Lần đầu build IL2CPP mất 5–15 phút.
5. Kiểm thử theo checklist mục 5 (bước 16–17) và đo FPS bằng HUD.

## 9. Bước tiếp theo (Giai đoạn 2)
- Animator Controller thật cho nhân vật placeholder (hoặc model Humanoid), thêm Dodge, Attack combo 3–4 đòn.
- `CombatSystem` (hitbox theo animation event, combo window, i-frame khi né, đỡ đòn & phản công), `LockOnSystem` dùng `ThirdPersonCamera.SetOrientation`.
- `CharacterStats` (HP, linh lực, sức đánh, phòng thủ, chí mạng, né tránh) + `EnemyData` ScriptableObject.
- `EnemyAI` (tuần tra → phát hiện → truy đuổi → tấn công → hồi sinh) với NavMesh, Object Pooling và giới hạn số quái hoạt động.
