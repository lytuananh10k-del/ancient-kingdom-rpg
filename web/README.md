# Vạn Kiếm Kỳ Trận (bản HTML5 / Three.js)

Auto chess tu tiên anime 3D chạy trực tiếp trên trình duyệt (Android, iOS, Windows). Một file: `index.html`.
Thư viện: Three.js r128 (cdnjs) + GLTFLoader, SkeletonUtils (jsDelivr).

Chạy thử: mở `index.html` qua một web server tĩnh (ví dụ `npx serve web`) hoặc dùng link artifact.

## Cấu trúc mã (các module trong `index.html`)
| Mục | Module | Vai trò |
|---|---|---|
| 1 | QualityManager | 4 mức Thấp / Vừa / Cao / Tối đa, tự giảm khi FPS < 38 kéo dài 4 giây |
| 2 | ShaderLibrary | Toon / cel 3 bậc, rim light, viền (inverted hull), dissolve, hạt GPU, ribbon, pháp trận, xung kích, kiếm khí, khiên Fresnel, bầu trời, biển mây |
| 3 | Bloom | Bloom tự viết (bright pass → blur → cộng), ngưỡng cao để không cháy trắng |
| 4 | ParticlePool | Hạt GPU dùng bộ đệm vòng, giới hạn theo mức đồ hoạ |
| 5 | RibbonBatch | Nhiều dải vệt hướng camera trong 1 draw call (vệt kiếm, sét, tóc, dải lụa) |
| 6 | VFXManager | Pool mesh hiệu ứng, cập nhật, dọn dẹp |
| 7 | CharacterRig | Nhân vật thủ tục có khớp, động tác chuẩn bị → va chạm → thu chiêu, IK hướng nhìn, IK chân 2 khớp (bàn chân bám đất, gối tự gập, bàn chân phẳng), váy/tóc/dải lụa có chuyển động phụ |
| 8 | GLTFRig | Thay bằng GLB/GLTF có xương: nhân bản bộ xương (SkeletonUtils), AnimationMixer, crossfade, bỏ root motion ngang, socket tay phải, IK chân 2 khớp |
| 9 | AnimationStateMachine | Trạng thái logic có chặn kẹt (maxTime → fallback) |
| 10 | SkillTimeline | Sự kiện theo thời gian mô phỏng: AnimationEvent, SpawnVFX, PlaySound, LaunchProjectile, ApplyDamage, ApplyStatusEffect, CameraImpulse, Cleanup; pause / resume / seek / cancel |
| 12 | CombatCamera | Góc nhìn auto chess, xoay / zoom chuột & cảm ứng, rung (trauma), impulse lò xo, camera điện ảnh có thể tắt |
| 17 | ProjectileSystem | Đạn pháp, cầu lửa, u hồn truy đuổi |
| 19 | SKILLS (SkillDefinitions) | Vạn Kiếm Quy Tông (5 giai đoạn), Thiên Lôi Quyết, Hỏa Phượng Phần Thiên, Hộ Thể Chân Khí, Kiếm Khí Trảm; Huyết Ảnh Trảm, U Minh Chú, Phá Địa Hống (dùng chung cho tướng phe ta, đổi màu theo phe) |
| 20 | Kinh tế & vòng đấu | Cửa hàng, hàng chờ, gộp sao, tộc/hệ, máu người chơi, thu nhập, đội hình địch theo vòng, lưu / tải ván |
| 25 | Benchmark | 15 giây cảnh nặng nhất: FPS TB, 1% thấp, draw call, tam giác, hạt, đề xuất mức |

Mô phỏng chạy bước cố định 60 Hz; sát thương nằm trên timeline mô phỏng nên không đổi theo FPS.

## Cách chơi (kinh tế)
| Thành phần | Quy tắc |
|---|---|
| Cửa hàng | 5 tướng mỗi vòng. Làm mới: 2 linh thạch (phím D). Tỉ lệ bậc 1/2/3 theo cấp: cấp 1–2 100/0/0 → cấp 8 20/40/40 |
| Tướng | Bậc 1 (1 linh thạch): Kiếm Đồng, Hộ Pháp, Thiết Vệ · Bậc 2: Lôi Pháp Sư, Hỏa Linh, Ảnh Kiếm · Bậc 3: Kiếm Tiên, U Hồn Sư |
| Cấp | Cấp = số tu sĩ tối đa trên bàn (khởi đầu cấp 3). Mua kinh nghiệm: 4 linh thạch → 4 KN (phím F); +2 KN mỗi vòng. Tối đa cấp 8 |
| Hàng chờ | Kiểu TFT: 9 ô 3D ngay sau hàng cuối phe ta, tướng đứng trên ô. **Kéo thả** tướng giữa bàn cờ và hàng chờ (thả lên quân khác = đổi chỗ), kéo vào cửa hàng để bán. Vẫn dùng được chạm-chọn rồi chạm-đích |
| Nâng sao | 3 bản giống nhau cùng sao tự gộp: ★2 (chỉ số ×1.8), ★3 (×3.24). Được mua khi hàng chờ đầy nếu lần mua đó tạo ra gộp |
| Bán | Hoàn giá × 3^(sao−1), trừ 1 với tướng ★2 trở lên |
| Thu nhập | 5 + lãi (1 mỗi 10 linh thạch, tối đa 5) + chuỗi thắng/thua (2: +1, 4: +2, 5+: +3) + 1 khi thắng |
| Máu | 100. Thua mất 2 + ⌊vòng/2⌋ + tổng số sao của địch còn sống. Hết 90 giây tính là thua. Hết máu = hết ván |
| Lưu | Tự lưu vào `localStorage` (`vkkt_save`) sau mỗi thao tác; mở lại trang có nút "Tiếp tục" và "Ván mới" |

| Tộc / hệ | Mốc | Hiệu ứng |
|---|---|---|
| Kiếm Tu (Kiếm Đồng, Ảnh Kiếm, Kiếm Tiên) | 2 / 3 | +20% công · +45% công, +15% tốc đánh |
| Pháp Tu (Lôi Pháp Sư, Hỏa Linh, U Hồn Sư) | 2 / 3 | Tuyệt kỹ +25%, linh lực đầu +20 · tuyệt kỹ +60%, linh lực đầu +40 |
| Hộ Pháp (Hộ Pháp, Thiết Vệ) | 2 | +30% máu, +20 phòng thủ |
| Ma Tu (Ảnh Kiếm, U Hồn Sư) | 2 | Hút máu 25% sát thương gây ra |

Tộc/hệ đếm số **tướng khác nhau** trên bàn (2 bản cùng tướng chỉ tính 1). Địch: số lượng tăng theo vòng (tối đa 8), chỉ số ×1.13 mỗi vòng, có ★2 từ vòng 4 và ★3 từ vòng 12.
Benchmark chụp lại ván đang chơi, chạy đội hình cố định rồi khôi phục nguyên trạng.

**Camera lúc chuẩn bị** tự căn khung theo kích thước màn hình (`fitPrepCamera`): tìm khoảng cách nhỏ nhất để hàng chờ + nửa bàn phe ta
(thêm các hàng địch nếu hình không nhỏ đi quá 20%) nằm gọn trong vùng trống giữa HUD và cửa hàng, rồi dùng lens shift
(dời tâm chiếu trong ma trận chiếu, không đổi phối cảnh) để đặt nội dung vào giữa vùng đó. Vào giao chiến camera trở về góc mặc định.

## GLB / GLTF
Cài đặt → "Chọn file .glb". Mô hình thay cho mọi Kiếm Tiên phe ta (kể cả bản mua sau đó), giữ tỉ lệ theo sao. Tên clip được nhận theo mẫu: Idle, Walk, Run, Dash, Attack01–03, HeavyAttack,
SkillCast, UltimateCast, Hit, Stun, Knockback, Death, Victory. Kiếm gắn vào xương có tên chứa RightHand / hand_r.
Mô hình được tự co về cao 1.8 m; dịch chuyển ngang của xương Hips bị loại bỏ (logic tự di chuyển nhân vật).

**IK chân cho GLB**: tìm xương bàn chân theo tên (Foot/Ankle + Left/Right, `.L/.R`, `_l/_r`, `_L_` – Mixamo, Rigify, Unreal, VRM),
lấy 2 xương cha làm cẳng chân và đùi. Sau khi AnimationMixer chạy, nếu cổ chân thấp hơn độ cao lúc đứng (đo từ tư thế gốc)
thì giải two-bone IK trong không gian thế giới (gối gập theo hướng mặt nhân vật), giữ nguyên hướng bàn chân.
Xương bị IK chỉnh được trả về giá trị cũ trước khung kế tiếp nên không cộng dồn sai số. Bảng Cài đặt hiển thị chuỗi xương nhận được.

## Giới hạn hiện tại
Nhân vật và animation là placeholder thủ tục, không phải animation dựng tay. Chưa có VFX Graph. IK chân chỉ nâng chân lên khi bị xuyên đất, chưa khoá chân khi đứng yên (foot locking).

## Cài đặt liên quan
- **Số phi kiếm** (Vạn Kiếm Quy Tông): theo mức đồ hoạ (14 / 24 / 36 / 56) hoặc tự chọn 8–96.
- **Âm thanh**: bật/tắt (lưu trên máy).
- Bảng Cài đặt đóng bằng nút ✕, phím Esc hoặc chạm ra bàn cờ.
- Bảng thông tin bên trái (vòng, máu, linh thạch, tộc/hệ) có nút thu gọn / mở rộng; khi thu gọn chỉ còn một dòng ♥ máu · ◆ linh thạch · cấp. Trạng thái được nhớ.
- **IK chân**: bật/tắt để so sánh. Hàm `groundHeight(x, z)` là điểm nối khi có địa hình gồ ghề.
