# Vân Giới Truyền Kỳ 3D — Game Design Document

Action RPG 3D thế giới mở, đề tài tu tiên phương Đông. Unity 6 · C# · URP · Windows + Android.

## 1. Tầm nhìn

Người chơi là một phàm nhân ở **Tàn Lão Thôn**, bước lên con đường tu tiên: luyện cấp ở Đại Khư, khám phá di tích, vượt sơn mạch, tới Kinh Thành Diên Khang, cuối cùng phá **Thượng Cổ Bí Cảnh**. Cảm giác chủ đạo: *thế giới hùng vĩ, chiến đấu dứt khoát, sức mạnh tăng vọt theo từng cảnh giới*.

**Phong cách hình ảnh:** tiên hiệp bán hiện thực → chân thực. Núi đá dựng đứng, rừng cổ thụ, sương mù thung lũng, mái ngói cong, gỗ sơn son, ngọc bích; pháp thuật phát sáng xanh lam / vàng kim / tím lôi.

## 2. Thế giới — 10 khu vực

| # | Khu vực | Cấp độ đề xuất | Địa hình | Quái / Boss tiêu biểu | Tài nguyên | Nội dung chính |
|---|---|---|---|---|---|---|
| 1 | **Tàn Lão Thôn** | Phàm Nhân | Làng giữa thung lũng | Chó hoang, Thỏ Linh | Linh thảo sơ cấp | Hướng dẫn, nhận kiếm, nhiệm vụ chính 1 |
| 2 | **Đồng Cỏ Đại Khư** | Phàm Nhân – Linh Thai | Thảo nguyên, đồi thoải | Sói Xám, Lợn Rừng Nanh Sắt | Thảo dược, da thú | Luyện cấp, nhiệm vụ săn |
| 3 | **Rừng Cổ Mộc** | Linh Thai | Rừng cổ thụ, sương dày | Hổ Vằn Lục, Thụ Yêu | Gỗ linh mộc, nấm linh | Thu thập, yêu thú tinh anh |
| 4 | **Di Tích Cổ Đại Khư** | Linh Thai – Ngũ Diệu | Phế tích đá, cột trận | Thạch Khôi Lỗi, Oán Linh | Mảnh công pháp | Giải đố trận pháp, nhiệm vụ cốt truyện |
| 5 | **Đầm Lầy Đại Khư** | Ngũ Diệu | Bùn lầy (làm chậm), khí độc | Mãng Xà Đầm, Cóc Độc | Độc thảo, xương thú | Địa hình nguy hiểm, trạng thái độc |
| 6 | **Sơn Mạch Biên Giới** | Ngũ Diệu – Lục Hợp | Núi cao, hang động, thác nước | Ưng Sơn, Hắc Hùng | Khoáng thạch, tinh thiết | Leo núi, hang ẩn, mở khoá Ngự Kiếm |
| 7 | **Quan Đạo Diên Khang** | Lục Hợp | Đường cái, trạm dịch | Sơn tặc, Mã Tặc thủ lĩnh | Vàng, hàng hoá | Hộ tống, giao thương, sự kiện ngẫu nhiên |
| 8 | **Kinh Thành Diên Khang** | Lục Hợp – Thất Tinh | Thành thị, tường thành | (an toàn) | – | Cửa hàng, lò luyện, tông môn, NPC, nhiệm vụ phụ |
| 9 | **Hỏa Diệm Cốc** | Thất Tinh – Thiên Nhân | Hẻm núi dung nham | Hỏa Lang, Viêm Ma | Hỏa tinh thạch | Kháng hoả, yêu thú hệ lửa |
| 10 | **Thượng Cổ Bí Cảnh** | Thiên Nhân – Thần Kiều | Không gian tách biệt, đảo bay | **Thượng Cổ Kiếm Linh** (3 giai đoạn) | Pháp bảo thượng cổ | Phó bản boss cuối |

Mỗi khu vực là một **chunk** tải động (Giai đoạn 5), nối bằng đường đi tự nhiên + **cổng dịch chuyển** mở khoá khi đến lần đầu. Có minimap (camera trực giao render texture) và bản đồ thế giới (M).

## 3. Nhân vật & điều khiển

- Model Humanoid, Animator với Idle / Walk / Run / Sprint / Jump / Fall / Land / Dodge / Attack 1–4 / Skill / Swim / Fly.
- Camera góc nhìn thứ ba 360°, di chuyển tương đối theo camera.
- Trang phục & vũ khí là các mesh gắn vào xương (SkinnedMeshRenderer dùng chung rig, hoặc vũ khí gắn socket bàn tay).
- Hệ thống điều khiển không phụ thuộc model: `PlayerController` (vật lý) ↔ `PlayerAnimationController` (hình ảnh) ↔ `PlayerInputHub` (thiết bị).

| Hành động | PC | Android |
|---|---|---|
| Di chuyển | WASD | Joystick ảo |
| Camera | Chuột | Vuốt |
| Chạy nhanh / Nhảy | Shift / Space | Nút Chạy / Nhảy |
| Đánh / Né | Chuột trái / Ctrl | Nút Đánh / Né |
| Kỹ năng | Q E R F | 4 nút kỹ năng |
| Khoá mục tiêu | T / chuột giữa | Chạm biểu tượng mục tiêu |
| Túi / Bản đồ | Tab / M | Nút Túi / Bản đồ |

## 4. Chiến đấu

- **Combo đánh thường** 4 đòn; mỗi đòn có cửa sổ nối combo (combo window) theo animation event; đòn 4 có hất văng.
- **Né** (Dodge): lướt 4 m, 0.25 s bất tử (i-frame), tốn thể lực nhẹ.
- **Đỡ đòn**: giữ nút → giảm 70% sát thương; **phản công** khi đỡ trong 0.2 s đầu (perfect parry) → choáng địch + đòn phản kích.
- **Khoá mục tiêu**: chọn quái gần tâm màn hình nhất trong 25 m, camera và nhân vật xoay về mục tiêu.
- **Sát thương:** `dmg = ATK × hệ số đòn × (1 − DEF / (DEF + 500 + 10 × cấp_địch)) × (chí mạng ? 1.5–2.5 : 1) × biến thiên(0.95–1.05)`; né tránh = xác suất miss theo chênh lệch chỉ số.

### Kỹ năng khởi đầu

| Phím | Kỹ năng | Linh lực | Hồi chiêu | Hiệu ứng |
|---|---|---|---|---|
| Q | **Kiếm Khí Trảm** | 15 | 3 s | Bắn kiếm khí hình bán nguyệt bay 12 m, xuyên mục tiêu, 180% ATK |
| E | **Vạn Kiếm Quy Tông** | 45 | 14 s | Triệu hồi kiếm trận 8 m, 20 phi kiếm rơi trong 3 s, 60% ATK mỗi kiếm |
| R | **Thiên Lôi Quyết** | 35 | 10 s | Gọi 3 tia sét vào vùng chỉ định, 220% ATK, tê liệt 1 s |
| F | **Hộ Thể Chân Khí** | 30 | 20 s | Khiên hấp thụ 25% HP tối đa trong 6 s, miễn hất văng |
| (giữ Space trên không / nút riêng) | **Ngự Kiếm Phi Hành** | 2/giây | – | Đứng trên phi kiếm bay tự do, tốc độ 18–30 m/s |

Dữ liệu kỹ năng lưu trong **`SkillData` (ScriptableObject)**: tên, icon, chi phí, hồi chiêu, hệ số, prefab VFX, animation, âm thanh.

### Boss: Thượng Cổ Kiếm Linh
1. **Giai đoạn 1 (100–70% HP):** combo kiếm 3 đòn, lướt chém.
2. **Giai đoạn 2 (70–35%):** kiếm trận vòng tròn (phải chạy ra ngoài), phân thân 2 bóng.
3. **Giai đoạn 3 (< 35%):** cuồng nộ — Vạn Kiếm Thiên Hàng toàn sân, chỉ an toàn trong vùng sáng; tốc độ +30%.

## 5. Tu luyện

| Cảnh giới | Sức mạnh (Chiến lực) |
|---|---|
| Phàm Nhân | 0 – 9.999 |
| Linh Thai | 10.000 – 499.999 |
| Ngũ Diệu | 500.000 – 4.999.999 |
| Lục Hợp | 5.000.000 – 29.999.999 |
| Thất Tinh | 30.000.000 – 99.999.999 |
| Thiên Nhân | 100.000.000 – 999.999.999 |
| Sinh Tử | 1.000.000.000 – 3.999.999.999 |
| Thần Kiều | 4.000.000.000 – 9.999.999.999 |

- **Chỉ số:** HP, Linh lực, Sức đánh, Phòng thủ, Chí mạng, Né tránh.
- **Chiến lực** = tổng có trọng số các chỉ số + trang bị + công pháp (lưu bằng `long`, vượt giới hạn `int`).
- **Điểm tiềm năng:** +5 mỗi cấp, phân bổ vào chỉ số.
- **Công pháp:** ScriptableObject `TechniqueData` — tăng chỉ số theo tầng, mở khoá kỹ năng.
- **Đột phá:** khi chiến lực đạt ngưỡng cảnh giới kế tiếp + có vật phẩm đột phá → nhiệm vụ / thử thách đột phá → tăng bội số chỉ số gốc, hiệu ứng thiên kiếp (sét).
- **Pháp bảo:** trang bị đặc biệt có kỹ năng bị động / chủ động.

## 6. NPC, quái vật, nhiệm vụ

- **NPC:** hội thoại dạng cây (`DialogueData` SO), cửa hàng (`ShopData`), giao/nhận nhiệm vụ.
- **Quái vật (`EnemyData` SO):** chỉ số, tốc độ, tầm phát hiện, tầm tấn công, bảng rơi đồ, prefab. **EnemyAI** là state machine: Idle → Patrol (waypoint/ngẫu nhiên) → Alert → Chase (NavMeshAgent) → Attack → Return → Dead → Respawn (sau X giây, dùng Object Pool).
- **Nhiệm vụ (`QuestData` SO):** loại Chính / Phụ / Tông môn / Bí cảnh; mục tiêu Giết, Thu thập, Nói chuyện, Đến nơi, Hộ tống; phần thưởng EXP, chiến lực, vàng, vật phẩm.

## 7. Kiến trúc mã nguồn

| Hệ thống | Vai trò | Giai đoạn |
|---|---|---|
| `GameManager` | Vòng đời game, trạng thái, frame rate, con trỏ | 1 ✅ |
| `PlayerInputHub` + `DesktopInputReader` + `MobileInputController` | Gộp input mọi thiết bị | 1 ✅ |
| `PlayerController` | Di chuyển vật lý (CharacterController) | 1 ✅ (bơi & bay: 5) |
| `ThirdPersonCamera` | Camera orbit, va chạm, khoá mục tiêu | 1 ✅ (lock-on: 2) |
| `PlayerAnimationController` | Animator / rig placeholder | 1 ✅ |
| `GraphicsQualityManager` | Low / Medium / High | 1 ✅ |
| `CombatSystem` | Combo, hitbox, né, đỡ, phản công, sát thương | 2 |
| `CharacterStats` | Chỉ số, HP/MP, buff | 2–3 |
| `EnemyAI` | State machine quái + boss | 2–3 |
| `SkillSystem` | Kỹ năng, hồi chiêu, linh lực, VFX | 3 |
| `InventorySystem` | Túi đồ, trang bị, hiển thị trên nhân vật | 4 |
| `QuestSystem` | Nhiệm vụ, sự kiện, phần thưởng | 4 |
| `CultivationSystem` | Cảnh giới, công pháp, đột phá | 4 |
| `WorldStreamingManager` | Tải/huỷ khu vực theo khoảng cách (Additive Scene + Addressables) | 5 |
| `SaveLoadSystem` | JSON + checksum, lưu vị trí/chỉ số/túi/nhiệm vụ | 6 |

**Quy ước:** namespace `VanGioi.*`; hệ thống giao tiếp qua event C# / interface, không tham chiếu chéo cứng; dữ liệu thiết kế nằm trong ScriptableObject (`Assets/VanGioi/Data/`).

## 8. Thế giới mở & tải động (Giai đoạn 5)

- Mỗi khu vực = một scene Additive (terrain + props + quái + NPC). Scene `Bootstrap` giữ hệ thống, Player, Camera.
- `WorldStreamingManager` kiểm tra khoảng cách người chơi → tâm/biên khu vực: tải khi < bán kính tải, huỷ khi > bán kính huỷ (có độ trễ chống "nhấp nháy").
- Terrain chia ô 500×500 m, các ô kề nhau được nối bằng `Terrain.SetNeighbors`.
- Phi kiếm: tăng bán kính tải theo tốc độ bay, hạ chất lượng LOD khi bay nhanh.
- Occlusion Culling bake theo từng scene khu vực; LOD Group cho mọi prefab môi trường; GPU Instancing / SRP Batcher cho cây cỏ đá.

## 9. Tối ưu & mục tiêu hiệu năng

| | PC (GTX 1060 / RX 580 trở lên) | Android tầm trung | Android yếu |
|---|---|---|---|
| Mục tiêu FPS | 60 | 45–60 | 30 |
| Mức đồ hoạ | High | Medium | Low |
| Render scale | 1.0 | 0.85 | 0.7 |
| Bóng | 140 m, 4 cascade | 70 m, 2 cascade | 35 m, 1 cascade |
| Quái hoạt động tối đa | 40 | 20 | 12 |

Kỹ thuật: Object Pooling (đạn, VFX, số sát thương, quái), giới hạn quái hoạt động theo khoảng cách, texture ASTC trên Android, shader biến thể tối thiểu, VFX Graph trên PC / Particle System trên Android, Addressables cho tài nguyên khu vực.

## 10. Lộ trình

| Giai đoạn | Sản phẩm bàn giao |
|---|---|
| **1** | Prototype 500×500 m, nhân vật, camera, di chuyển, nhảy, va chạm, PC + Android ✅ |
| **2** | Animator thật, combo, né/đỡ/phản công, lock-on, `CharacterStats`, `EnemyAI` + 2 loại quái, Object Pool |
| **3** | `SkillSystem` + 4 kỹ năng chiến đấu + VFX, boss 3 giai đoạn, số sát thương, HUD HP/MP |
| **4** | NPC hội thoại & cửa hàng, `QuestSystem`, `InventorySystem` + trang bị hiển thị, `CultivationSystem` |
| **5** | 10 khu vực tải động, cổng dịch chuyển, minimap & bản đồ, Ngự Kiếm Phi Hành, bơi, chu kỳ ngày đêm & thời tiết |
| **6** | `SaveLoadSystem`, tối ưu theo Profiler, Occlusion Culling, kiểm thử thiết bị, build Windows/Android phát hành |
