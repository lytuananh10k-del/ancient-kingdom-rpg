# Giai đoạn 2 — Chiến đấu, chỉ số và quái vật

Mục tiêu: biến prototype Giai đoạn 1 thành một vòng chơi hành động hoàn chỉnh. Người chơi đánh combo, né, đỡ, đỡ hoàn hảo rồi phản kích, khoá mục tiêu, và chiến đấu với yêu thú biết tuần tra, phát hiện, truy đuổi, tấn công và hồi sinh. Có HUD, số sát thương và "cảm giác đánh" (khựng hình, rung camera, tia lửa, vệt kiếm khí).

## 1. Các quyết định thiết kế

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Thời điểm gây sát thương | Theo **dữ liệu** (startup / active / recovery của từng đòn), không dựa vào Animation Event | Chạy được ngay với model placeholder; khi có clip thật chỉ cần chỉnh 3 con số |
| Vùng đánh | `OverlapSphere` + lọc theo **góc quạt**, mỗi mục tiêu trúng tối đa 1 lần mỗi đòn | Rẻ, ổn định, không cần collider vũ khí |
| Di chuyển quái | CharacterController + né vật cản bằng SphereCast, **không dùng NavMesh** | Không cần cài AI Navigation hay bake; địa hình mở. Giai đoạn 5 sẽ chuyển sang NavMesh cho thành thị / hang động |
| Số quái cùng tấn công | Tối đa **2 con** có "lượt tấn công", số còn lại đi vòng quanh | Bầy sói đông nhưng vẫn công bằng |
| Quái ở xa | Chỉ **24 con gần nhất** trong 90 m chạy AI (Android: 12) | Tiết kiệm CPU |
| Hồi sinh quái | Dùng lại chính object (pooling theo khu sinh quái) | Không Instantiate/Destroy → không tạo rác GC |
| VFX | Particle System + mesh vòng cung + TrailRenderer, shader `Sprites/Default` | Chạy được trên URP lẫn Built-in, trên mọi máy Android |
| UI | HUD người chơi bằng uGUI dựng bằng code; số sát thương / thanh máu quái bằng IMGUI | Không cần prefab hay TextMeshPro |
| Dữ liệu | ScriptableObject: `ComboData`, `WeaponData`, `EnemyData`, lưu ở `Assets/VanGioi/Data` | Designer cân bằng trong Inspector, không đụng code |
| Phím đỡ | Chuột phải (khi đã khoá chuột) / RB / nút **Đỡ** | Chuột phải không còn dùng để xoay camera khi chuột đã khoá |

## 2. Dựng scene

Chạy **Vân Giới → Dựng Scene Prototype (Giai đoạn 1–2)**. Lần đầu, công cụ tạo các file dữ liệu trong `Assets/VanGioi/Data/`:

```
Data/Combat/Combo_ThanhPhongKiemPhap.asset    4 thức + đòn phản kích
Data/Weapons/Weapon_ThanhPhongKiem.asset      vũ khí (+12 sức đánh, +2% chí mạng)
Data/Enemies/Enemy_SoiXam.asset               Sói Xám
Data/Enemies/Enemy_SoiDauDan.asset            Sói Đầu Đàn
Data/Enemies/Enemy_LonRungNanhSat.asset       Lợn Rừng Nanh Sắt
```

Các lần dựng sau sẽ **dùng lại** những file này, nên chỉnh sửa của bạn được giữ nguyên. Muốn về giá trị gốc thì xoá file rồi dựng lại. Nên commit thư mục `Data` (nó không bị `.gitignore`).

Những gì được thêm vào scene so với Giai đoạn 1:

```
_Systems      + EnemyManager, CombatFeedback, WorldUI, PlayerHUD
Player        + CharacterStats, LockOnSystem, CombatSystem
  └─ Visual/PlaceholderModel  + WeaponHolder, Weapon_ThanhPhongKiem (TrailRenderer)
EnemyZones
  ├─ Zone_SoiXam_DongNam      (300, 175)  4 × Sói Xám
  ├─ Zone_LonRung_TayNam      (175, 170)  3 × Lợn Rừng Nanh Sắt
  ├─ Zone_SoiDauDan_TayBac    (215, 350)  1 × Sói Đầu Đàn
  └─ Zone_BaySoi_TayBac       (222, 342)  2 × Sói Xám (cùng bầy với Đầu Đàn)
```

Quái được tạo khi bấm Play (trong Edit Mode chỉ có các khu sinh quái; chọn một khu để thấy vòng tròn bán kính màu đỏ).

## 3. Cơ chế chiến đấu

### Combo — Thanh Phong Kiếm Pháp

| # | Thức | Kiểu | Hệ số | Startup / Active / Recovery (s) | Tầm / Góc | Poise | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | Thanh Phong Trảm | chém ngang phải→trái | 0.9 | 0.12 / 0.12 / 0.28 | 2.3 m / 150° | 15 | |
| 2 | Hồi Phong Trảm | chém ngược | 1.0 | 0.10 / 0.12 / 0.30 | 2.3 m / 150° | 15 | |
| 3 | Lạc Nhạn Kích | bổ dọc | 1.3 | 0.18 / 0.12 / 0.36 | 2.5 m / 90° | 30 | rung mạnh |
| 4 | Toàn Phong Kiếm | xoay vòng | 1.8 | 0.20 / 0.25 / 0.45 | 2.9 m / 360° | 60 | đánh bật 6 m/s |
| ★ | Phản Kích · Nhất Kiếm Đoạn Hồn | đâm | 2.5 | 0.06 / 0.12 / 0.40 | 2.8 m / 100° | 100 | **chắc chắn chí mạng**, choáng gấp đôi |

- **Input buffer 0.3 s:** bấm hơi sớm vẫn được tính. Bấm trong lúc đang ra đòn thì đòn kế tiếp nối vào sau vùng Active (+25% thời gian thu chiêu).
- Sau đòn cuối, hoặc nghỉ quá 0.45 s, combo quay về thức 1.
- **Tự xoay về phía quái:** khi ra đòn, nhân vật quay ngay về mục tiêu đang khoá. Nếu không khoá, nhân vật quay về con quái gần nhất trong 6 m, trong góc 140° quanh hướng đang bấm (hoặc hướng đang nhìn). Nếu cách quái dưới 1.4 m thì ngừng lao tới.
- **Huỷ đòn:** có thể né ngay trong lúc chuẩn bị hoặc thu chiêu, và có thể đỡ trong lúc thu chiêu. Không huỷ được trong vùng Active.

### Né
Lướt 0.42 s với tốc độ 11 m/s (giảm dần), **bất tử từ 0.02 đến 0.30 s**, tốn 22 thể lực. Có bấm hướng thì lướt theo hướng đó; không bấm hướng thì lùi về sau. Né thành công hiện chữ "Né!".

### Đỡ, đỡ hoàn hảo, phản kích
- **Giữ Đỡ:** giảm 70% sát thương từ phía trước (góc 140°), tốn 15 thể lực + 20% poise của đòn địch. Khi đỡ, tốc độ di chuyển còn 45% và không chạy nhanh được.
- **Hết thể lực khi đỡ → Phá thế:** nhận đủ sát thương và bị khựng 0.8 s.
- **Đỡ hoàn hảo:** bắt đầu đỡ trong vòng **0.2 s** trước khi đòn địch trúng. Bạn không mất máu, địch **choáng 1.6 s**, và trong 1.6 s tiếp theo bấm Đánh sẽ ra **Phản Kích**.
- Mẹo: khi quái **loé đỏ và hiện dấu "!"** trên đầu, nó sắp ra đòn. Đó là lúc bấm Đỡ.

### Trúng đòn và tử vong
- Đòn có poise ≥ 40 (Sói Đầu Đàn, Lợn Rừng húc) sẽ ngắt đòn đánh của bạn và đẩy lùi. Đòn nhẹ hơn chỉ gây khựng khi bạn không đang tấn công.
- HP về 0 thì hiện màn hình "Thân tử đạo tiêu…" và sau 4 s hồi sinh tại Tàn Lão Thôn với đầy máu.

### Chỉ số và công thức

```
sát thương = ATK × hệ số đòn × (1 − DEF / (DEF + 500 + 10 × cấp kẻ tấn công)) × (chí mạng ? hệ số chí mạng : 1) × ngẫu nhiên(0.95–1.05)
```
Né tránh (theo chỉ số) được tính trước; đòn chắc chắn chí mạng thì không bị né. Chiến lực = 0.5·HP + 0.3·Linh lực + 8·ATK + 6·DEF + 2000·(Chí mạng + Né tránh). Cảnh giới hiển thị trên HUD được tra theo bảng ở GDD mục 5.

| | Cấp | HP | ATK | DEF | Chí mạng | Né |
|---|---|---|---|---|---|---|
| Người chơi (+ kiếm) | 1 | 500 | 50 + 12 | 30 | 10% + 2% (×1.6) | 5% |
| Sói Xám | 2 | 180 | 35 | 10 | 5% | 8% |
| Sói Đầu Đàn | 5 | 750 | 58 | 25 | 10% | 5% |
| Lợn Rừng Nanh Sắt | 3 | 420 | 55 | 40 | 5% | 0% |

Ví dụ: thức 1 đánh Sói Xám gây khoảng 55 sát thương, nên thức 1–3 là đủ hạ một con. Sói cắn bạn mất khoảng 33 HP (khoảng 10 nếu đỡ). Phản Kích gây khoảng 245 sát thương, hạ ngay một con Sói Xám.

Hồi phục: thể lực 30/s (sau 0.8 s không dùng), linh lực 2/s, HP 1%/s khi đã ngoài chiến đấu 6 s.

## 4. Quái vật

| | Sói Xám | Sói Đầu Đàn | Lợn Rừng Nanh Sắt |
|---|---|---|---|
| Kiểu đánh | Vồ cắn (tầm 1.9 m) | Vồ cắn mạnh (tầm 2.5 m, poise 45) | **Lao húc** từ 3–9 m, 13 m/s trong 1.1 s |
| Báo hiệu | 0.55 s | 0.70 s | 0.85 s |
| Hồi chiêu | 1.8 s | 1.5 s | 3.0 s (sau cú húc hở sườn 1.1 s) |
| Phát hiện | 15 m, góc 150° | 18 m | 12 m, góc 120° |
| Bầy đàn | báo động đồng loại trong 16 m | có | không |
| Hồi sinh | 20 s | 45 s | 25 s |
| Thưởng | 12 EXP, 3 bạc | 80 EXP, 25 bạc | 25 EXP, 8 bạc |

**Máy trạng thái EnemyAI:**

```
Idle ⇄ Patrol ──thấy người chơi──▶ Alert (0.45 s) ──▶ Chase ──trong tầm + hết hồi chiêu + có lượt──▶ Attack
  ▲                                                     │  ▲                                   │
  │                                                     │  └──────── Windup → Strike → Recover ─┘
  └── Return (hồi đầy máu) ◀── mất dấu > loseRange hoặc cách nhà > leashRange
Bị phá thế / bị đỡ hoàn hảo → Stagger → Chase        HP = 0 → Dead → (sau respawnTime) hồi sinh tại khu
```

- **Phát hiện:** trong `detectRange` + nằm trong góc nhìn (hoặc ở rất gần dưới 4 m) + không bị vật cản che (raycast).
- **Poise:** sát thương poise cộng dồn (reset sau 3 s không trúng đòn). Đạt ngưỡng `poise` thì bị choáng `staggerTime`.
- **Thanh máu quái** hiện khi quái đang giao chiến, vừa trúng đòn hoặc đang bị khoá. Tên và cấp hiện khi ở trong 16 m.

## 5. Component và Inspector

| Component | Đặt ở | Tham số chính |
|---|---|---|
| **CombatSystem** | Player | Weapon (WeaponData), Soft Target Range/Angle, Dodge (thời gian, tốc độ, khoảng bất tử, thể lực), Block (giảm sát thương, thể lực, cửa sổ đỡ hoàn hảo, choáng, cửa sổ phản kích), Hit React Poise Threshold, Respawn Delay, Input Buffer |
| **LockOnSystem** | Player | Acquire Distance 25, Break Distance 32, Acquire Angle 120, Lost Sight Grace 1.5 |
| **CharacterStats** | Player, quái | Base Stats (StatBlock), các thông số hồi phục. Quái lấy Base Stats từ EnemyData |
| **WeaponHolder** | Gốc model | Weapon, Hand Socket, Back Socket, tư thế cầm / đeo, Trail, Auto Sheath Delay 6 s |
| **EnemyAI** | Quái (tạo lúc chạy) | Data, Obstacle Mask, Corpse Time |
| **EnemySpawnZone** | Scene | Enemy (EnemyData), Count, Radius, Min Height, Max Slope |
| **EnemyManager** | _Systems | Max Active Desktop/Mobile 24/12, Activation Distance 90, Max Simultaneous Attackers 2 |
| **CombatFeedback** | _Systems | Bật/tắt hit-stop & rung camera, Max Hit Stop, Hit Stop Time Scale |
| **WorldUI** | _Systems | Khoảng hiện thanh máu / tên quái, thời gian số sát thương |
| **PlayerHUD** | _Systems | Tên nhân vật |
| **ThirdPersonCamera** | Main Camera | (mới) Lock On Turn Sharpness, Lock On Pitch Offset, Shake Frequency, Shake Scale |

**Thêm khu quái mới:** tạo GameObject rỗng, Add Component **EnemySpawnZone**, kéo một `EnemyData` vào, đặt Count và Radius.
**Tạo quái mới:** Project → Create → **Vân Giới → Quái vật → Enemy Data**. Hoặc Duplicate một file trong `Data/Enemies` rồi chỉnh.
**Combo / vũ khí mới:** Create → **Vân Giới → Chiến đấu → Combo / Vũ khí**, rồi gán vào ô **Weapon** của CombatSystem. Đổi vũ khí lúc chạy bằng `CombatSystem.SetWeapon(weaponData)`.

## 6. Thay bằng animation và model thật

### Người chơi
1. **Vân Giới → Animation → Tạo Animator Controller mẫu – Người chơi**. Lệnh này tạo `Assets/VanGioi/Animation/AC_Player.controller` với đủ tham số và state:
   `Locomotion` (Blend Tree theo Speed: 0 / 2.2 / 5.5 / 9), `JumpStart`, `Airborne` (Blend theo VerticalSpeed), `Land`, `Attack_1..4` (AnyState, Attack + ComboStep), `Counter`, `Dodge`, `Backstep`, `Block`, `Parry`, `Hit`, `Death`.
2. Kéo clip vào từng state hoặc ô của Blend Tree. Bỏ chọn **Root Motion** của clip (hoặc để `applyRootMotion = false`, PlayerAnimationController đã đặt sẵn).
3. **Khớp thời gian đòn:** mở clip Attack_1, ghi lại frame kiếm bắt đầu và kết thúc vùng trúng. Chia cho FPS của clip rồi nhập vào `startup` / `active` / `recovery` của thức tương ứng trong `Combo_ThanhPhongKiemPhap`. Ví dụ clip 30 fps, vùng trúng từ frame 4 đến 8, clip dài 18 frame thì `startup = 0.13`, `active = 0.13`, `recovery = 0.33`.
4. Thay model như ở Giai đoạn 1 (đưa vào `Player/Visual`). Thêm **WeaponHolder** vào gốc model và gán:
   - Hand Socket = một Empty con của xương `RightHand` (`animator.GetBoneTransform(HumanBodyBones.RightHand)`).
   - Back Socket = Empty con của `Spine`/`Chest`.
   - Weapon = model kiếm (gốc ở chuôi, lưỡi theo trục +Y). Thêm một Empty có TrailRenderer ở gần mũi kiếm.
   - Chỉnh `Hand Local Euler` cho tới khi kiếm nằm đúng trong tay.
5. Gọi `GetComponent<PlayerAnimationController>().SetModel(modelRoot)` nếu thay model lúc chạy.

### Yêu thú
1. **Vân Giới → Animation → Tạo Animator Controller mẫu – Yêu thú**. Lệnh này tạo `AC_Enemy_Quadruped.controller` với các tham số `Speed`, `Attack`, `Hit`, `Dead`.
2. Tạo prefab: model + Animator (gán controller), không cần thêm component nào khác.
3. Kéo prefab vào ô **Prefab** của EnemyData. EnemyFactory sẽ tự thêm CharacterController, CharacterStats, EnemyAI; kích thước capsule lấy theo `scale`.
4. Thời gian `windup` trong EnemyData nên bằng độ dài đoạn lấy đà của clip Attack.

## 7. Checklist kiểm thử

| # | Bước | Kết quả mong đợi |
|---|---|---|
| 1 | Play, bấm chuột trái 4 lần liên tục | 4 thức khác nhau, vệt kiếm khí, kiếm tự rút ra tay; sau 6 s không đánh, kiếm tự tra lại sau lưng |
| 2 | Bấm chuột trái chậm (nghỉ > 0.5 s giữa các lần) | Luôn ra thức 1 |
| 3 | Đi về phía đông nam (300, 175) | 4 Sói Xám tuần tra; tới gần 15 m thì chúng phát hiện, đuổi theo, vây quanh và mỗi lúc chỉ 2 con cắn |
| 4 | Đánh trúng sói | Số sát thương trắng (vàng khi chí mạng), khựng hình, rung, tia lửa; sói loé trắng và bị đẩy lùi |
| 5 | Ra đủ thức 3–4 | Sói bị choáng (lắc đầu) |
| 6 | Quan sát sói loé đỏ + "!" rồi bấm chuột phải đúng lúc | "Đỡ hoàn hảo", sói choáng, HUD hiện "PHẢN KÍCH SẴN SÀNG"; bấm Đánh → đâm chí mạng ~245 |
| 7 | Giữ chuột phải lâu khi bị cắn liên tục | Mất ~10 HP mỗi lần, thể lực giảm; hết thể lực thì "Phá thế!" |
| 8 | Ctrl + hướng khi sói cắn | Lướt đi, hiện "Né!", không mất máu |
| 9 | Ctrl không bấm hướng | Lùi né |
| 10 | Bấm T | Vòng khoá trên mục tiêu, camera bám theo, nhân vật quay mặt về mục tiêu khi di chuyển; bấm T lần nữa để huỷ |
| 11 | Hạ sói | Ngã nghiêng, biến mất sau 3 s, có thông báo "+12 EXP"; 20 s sau hồi sinh trong khu |
| 12 | Tới Lợn Rừng (175, 170) đứng cách 6 m | Lợn cào chân (loé đỏ) rồi lao húc; né ngang thì lợn lao qua và hở sườn khoảng 1 s |
| 13 | Chạy xa > 28 m | Quái bỏ cuộc, chạy về khu và hồi đầy máu |
| 14 | Để chết | Màn hình đỏ, đếm ngược 4 s, hồi sinh ở làng |
| 15 | Mobile ForceOn trong Editor | Nút Đánh / Né / Đỡ / Khoá hoạt động; HUD không bị che |
| 16 | F2 khi đang đánh 7 con | FPS ổn định; HUD F1 cho biết FPS |

## 8. Cân bằng nhanh

- **Chiến đấu quá dễ:** tăng `attack` của quái, giảm `windup` (khó đỡ hoàn hảo hơn), tăng `Max Simultaneous Attackers` lên 3.
- **Quá khó:** tăng `Perfect Parry Window` lên 0.25–0.3, tăng `Dodge Invulnerable End`, giảm `attackCooldown` của bầy.
- **Đòn đánh "lướt" quá xa:** giảm `lungeSpeed` của từng thức.
- **Không thích khựng hình:** tắt `Enable Hit Stop` trong CombatFeedback.
- **Android yếu:** giảm `Max Active Mobile` xuống 8 và giảm `count` của các khu.

## 9. Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách sửa |
|---|---|
| Bấm chuột trái không đánh | Chuột chưa khoá: click vào Game view (lần click đầu chỉ để khoá chuột). Kiểm tra Player có CombatSystem và có WeaponData. |
| Chuột phải không đỡ | Chỉ hoạt động khi chuột đã khoá (khi chưa khoá, chuột phải dùng để xoay camera). |
| Không có quái | Chưa Play (quái được tạo lúc chạy). Xem Console có cảnh báo "chưa gán EnemyData" không. Kiểm tra `Min Height` của khu (cao hơn địa hình thì không tìm được điểm sinh, quái sẽ sinh ở tâm khu). |
| Quái đứng im | Ở xa người chơi hơn 90 m (đang "ngủ"), hoặc đã đủ `Max Active`. |
| Quái kẹt sau nhà / đá | AI né vật cản đơn giản, không dùng NavMesh. Đặt khu quái ở nơi thoáng; Giai đoạn 5 sẽ chuyển sang NavMesh. |
| Vung kiếm trúng quái nhưng không có sát thương | Kiểm tra `Hit Mask` của CombatSystem có chứa layer của quái, và quái có CharacterController (collider để dò trúng). Quái đã chết thì không nhận đòn. |
| Số sát thương không hiện | Thiếu WorldUI trong `_Systems`, hoặc Camera không có tag MainCamera. |
| Màn hình "khựng" liên tục | Hit-stop. Giảm `hitStop` của các thức hoặc `Max Hit Stop`. |
| Animator thật: đánh không có hình | Kiểm tra tên tham số đúng hợp đồng (`Attack`, `ComboStep`…) và state `Attack_n` đã gán clip. |
| Kiếm nằm sai chỗ trên model thật | Chỉnh `Hand Local Position/Euler` trong WeaponHolder (trong Play Mode thử rồi Copy Component → Paste Values). |
| Màu quái hồng tím trên Android | Quái được tạo lúc chạy dùng shader URP/Lit; scene đã có vật liệu URP/Lit nên shader được build. Nếu bạn xoá hết vật liệu URP/Lit khỏi scene, thêm shader vào **Always Included Shaders**. |

## 10. Hiệu năng

- Mỗi đòn đánh gọi 1 lần `OverlapSphereNonAlloc` (không cấp phát bộ nhớ) trong 0.12–0.25 s.
- Quái: 2 SphereCast né vật cản + 1 Raycast tầm nhìn mỗi frame **chỉ khi đang hoạt động**; quái ngủ không tốn gì.
- VFX dùng pool: 24 tia lửa và 12 vệt kiếm khí là tối đa.
- Nhấp nháy màu quái dùng MaterialPropertyBlock (không nhân bản material).
- Mục tiêu đo bằng Profiler: `EnemyAI.Update` tổng < 0.5 ms với 10 quái trên PC tầm trung (chưa đo trên máy thật – hãy kiểm tra).

## 11. Bước tiếp theo (Giai đoạn 3)
- `SkillSystem` + `SkillData` (ScriptableObject): Kiếm Khí Trảm (Q), Vạn Kiếm Quy Tông (E), Thiên Lôi Quyết (R), Hộ Thể Chân Khí (F) dùng linh lực, có hồi chiêu và thanh kỹ năng trên HUD.
- VFX kỹ năng (Particle System / VFX Graph trên PC), đạn bay dùng Object Pool.
- Boss **Thượng Cổ Kiếm Linh** 3 giai đoạn (kiếm trận, phân thân, cuồng nộ).
- Hiệu ứng trạng thái (choáng, tê liệt, khiên) cộng vào CharacterStats bằng modifier.
