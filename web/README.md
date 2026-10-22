# Vạn Kiếm Kỳ Trận (bản HTML5 / Three.js)

Auto chess tu tiên anime 3D chạy trực tiếp trên trình duyệt (Android, iOS, Windows).
Thư viện: Three.js r128 (cdnjs) + GLTFLoader, SkeletonUtils (jsDelivr).

Chạy thử: mở qua một web server tĩnh (ví dụ `npx serve web`) hoặc dùng link artifact.

## File
`index.html` chứa HTML + CSS; mã nằm trong `js/`, là **script thường** (không phải ES module) dùng chung phạm vi toàn cục
và phải nạp đúng thứ tự số. Thêm file mới: đặt số thứ tự sau mọi file mà nó dùng lúc nạp, rồi thêm thẻ `<script>` vào `index.html`.

| File | Nội dung |
|---|---|
| `js/01-core.js` | Tiện ích (vector, easing, `store` localStorage), QualityManager |
| `js/02-shaders.js` | ShaderLibrary |
| `js/03-renderer.js` | Renderer, scene, ánh sáng, bloom |
| `js/04-vfx.js` | ParticlePool, RibbonBatch, VFXManager |
| `js/05-character-rig.js` | CharacterRig (nhân vật thủ tục, IK chân, chuyển động phụ) |
| `js/06-gltf-rig.js` | GLTFRig (GLB/GLTF, IK chân GLB) |
| `js/07-animation.js` | AnimationStateMachine, SkillTimeline |
| `js/08-audio.js` | Âm thanh WebAudio |
| `js/09-camera.js` | CombatCamera, khung camera lúc chuẩn bị, lens shift |
| `js/10-world.js` | Vân Đài, bàn cờ, hàng chờ 3D |
| `js/data/champions.js` | **Dữ liệu 24 tướng** + phe địch, ngoại hình (LOOKS), vai trò, cấu hình nâng sao `STAR`, preset animation, `validateChampions`, chuyển id bản lưu cũ |
| `js/combat/effects.js` | EffectSet: buff / debuff chỉ số, làm chậm, giảm sát thương nhận, DoT / HoT; `healUnit`, `giveShield`, `applySlow` |
| `js/11-units.js` | Unit, AnimationController, AI di chuyển / chọn mục tiêu (`RIG_FACTORIES` để gắn GLB từng tướng) |
| `js/12-combat.js` | Sát thương, hit stop, đạn, phi kiếm |
| `js/13-skills.js` | Kỹ năng viết tay (SkillTimeline): Vạn Kiếm Quy Tông, sét, hỏa phượng, lá chắn, kiếm khí |
| `js/combat/skill-executor.js` | SkillExecutor: chọn mục tiêu (TARGETING), điều kiện tung (READY), áp hiệu ứng, VFX, dựng timeline cho kỹ năng dữ liệu |
| `js/data/skills.js` | **Dữ liệu 19 kỹ năng** (`SKILL_SPECS`) + mô tả kỹ năng viết tay (`SKILL_META`) |
| `js/data/traits.js` | Tộc / hệ: 4 hệ có cộng hưởng + 5 hệ mới (chỉ dữ liệu, tuần 2) |
| `js/14-game.js` | Kinh tế, cửa hàng, nâng sao, tộc/hệ, vòng đấu, lưu ván |
| `js/15-input.js` | Xoay/zoom, chọn, kéo thả kiểu TFT |
| `js/16-ui.js` | Giao diện, áp dụng chất lượng, lớp 2D |
| `js/17-benchmark.js` | Kiểm tra hiệu năng (có nút sao chép kết quả) |
| `js/18-glb-import.js` | Nhập GLB cho từng tướng |
| `js/19-main.js` | Vòng lặp chính, khởi động, móc kiểm thử `window.__vkkt` |

## Kiểm thử tự động
```bash
cd web && npm install && npm test          # chơi 12 vòng liên tục, màn ngang 844×390
ROUNDS=20 VIEW=400x820 node tests/playtest.js
TOUCH=1 VIEW=400x820 node tests/playtest.js  # thao tác bằng sự kiện chạm thật (CDP) như trên Android
```
`tests/playtest.js` mở game trong Chromium (Playwright) và tự chơi. Sau mỗi thao tác nó kiểm tra:
linh thạch khi mua / bán / làm mới / mua kinh nghiệm; nâng sao bảo toàn số bản ★1 quy đổi và không còn nhóm 3 bản chưa gộp;
kéo thả bằng chuột thật (hàng chờ → bàn, đổi chỗ, bàn → hàng chờ, kéo vào cửa hàng để bán, bị chặn khi đủ quân);
hàng chờ 3D khớp dữ liệu; tộc/hệ; AI (không NaN, không ra ngoài đài, có sát thương, trận ≤ 90 s);
thu nhập, mất máu, chuỗi thắng/thua theo công thức; bản lưu khớp trạng thái; tải lại trang giữa chừng (vòng 3, 6, 9…);
rò rỉ object trong scene; lỗi console; mọi tướng đứng đúng tâm ô lúc chuẩn bị; tự đưa tướng lên khi vào trận;
bảng thông tin (tướng ta, địch, nhấn giữ thẻ cửa hàng) hiện đúng và không che cửa hàng. Trận được tua nhanh bằng `__vkkt.simulate(giây)` (bỏ qua render) để chạy được cả khi không có GPU.
`SHOTS=thư-mục` để lưu ảnh chụp mỗi vòng.

`tests/champions.js` (`npm run test:champions`) – 12 hạng mục bắt buộc của V1.5: 24 tướng ra đúng bậc ở cửa hàng, mua / bán chính xác,
dữ liệu hợp lệ, nâng sao cả 24 tướng (★1→★2→★3, không ★4, máu / công đúng hệ số), từng kỹ năng tung đúng và có đủ cơ chế
(sát thương, choáng, đóng băng, làm chậm, thiêu, hồi máu, lá chắn, buff, phi kiếm, lướt, trận pháp), giết mục tiêu giữa lúc thi triển,
không kẹt thi triển, máu / năng lượng hợp lệ, không rò rỉ VFX / object / geometry, bản lưu cũ tải được, không lỗi console.
`node tools/gen-docs.js` sinh lại `docs/CHAMPIONS.md` (bảng chỉ số 24 tướng, kỹ năng, tộc/hệ, mô hình) từ dữ liệu.

## Cấu trúc mã (các module)
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
| Cửa hàng | 5 ô mỗi vòng, tướng giá 1–5 linh thạch. Làm mới: 2 linh thạch (phím D). Tỉ lệ bậc 1/2/3/4/5 theo cấp (hiện ngay dưới cửa hàng): cấp 3 75/25/0/0/0 · cấp 5 45/33/20/2/0 · cấp 7 19/30/35/15/1 · cấp 9 15/18/25/30/12 |
| Tướng | 24 tướng (bảng đầy đủ: [docs/CHAMPIONS.md](docs/CHAMPIONS.md)). Bậc 1: Kiếm Đồng, Thiết Vệ, Hỏa Linh, Thanh Mộc, Ma Binh, Linh Cung · Bậc 2: Thanh Phong Kiếm Khách, Huyền Giáp Vệ, Băng Linh Sư, Huyết Ma, Lôi Thương, Linh Y · Bậc 3: Ngự Kiếm Chân Nhân, Cửu Viêm Pháp Sư, Kim Cang Hộ Pháp, Ảnh Sát, Huyền Băng Tiên Tử · Bậc 4: Vô Cực Kiếm Tôn, Thiên Lôi Đạo Nhân, Bất Diệt Chiến Thần, U Minh Ma Quân · Bậc 5: Vạn Kiếm Tiên Đế (Vạn Kiếm Quy Tông), Cửu Thiên Thần Nữ, Hỗn Độn Ma Đế. Phe địch riêng (không bán): Ma Thú Hống, Huyết Ảnh Kiếm Khách, U Minh Ma Tu, Yêu Lang, Yêu Thú Vương |
| Cấp | Cấp = số tu sĩ tối đa trên bàn (khởi đầu cấp 3); kéo thêm khi đã đủ sẽ bị chặn (ô đích đỏ). Vào trận mà bàn còn chỗ thì tự đưa tướng mạnh nhất từ hàng chờ lên (giống TFT). Mua kinh nghiệm: 4 linh thạch → 4 KN (phím F); +2 KN mỗi vòng. Tối đa cấp 9 |
| Bể tướng chung | Mỗi tướng có hạn số bản theo bậc: 22 / 18 / 14 / 10 / 8. Tướng người chơi giữ (★2 = 3 bản, ★3 = 9), tướng đang bày ở cửa hàng và tướng 7 đối thủ ảo giữ đều trừ vào bể; hết bản thì không còn xuất hiện. Đối thủ ảo mỗi vòng trả lại ~30% và lấy thêm 4 + vòng bản (¼ nhắm vào tướng bạn đang gom). Thẻ cửa hàng hiện "còn N" |
| Trang bị | Rơi ở vòng yêu thú (3, 7, 11, 15…): Thanh Phong Kiếm +18% công · Huyền Thiết Giáp +25 giáp · Tụ Linh Châu +20 linh lực đầu, tuyệt kỹ +10% · Hộ Mệnh Phù +250 máu · Phong Hành Ngoa +18% tốc đánh · Huyết Ngọc +15% hút máu. Tối đa 3 món mỗi tướng; chạm món trong túi rồi chạm tướng (hoặc kéo lên tướng) để gắn; gộp sao giữ trang bị; bán tướng thì trang bị về túi |
| Thời gian | Chuẩn bị 30 s (vòng 1: 45 s), hết giờ tự vào trận – tắt được trong Cài đặt. Trận tối đa 60 s; từ giây 40 linh khí hỗn loạn, sát thương +6% mỗi giây |
| Bàn cờ | 8×8: 4 hàng ô xanh phía dưới là phe ta (đặt được), 4 hàng ô đỏ là địch; vạch vàng ở giữa |
| Thông tin tướng | Chạm vào bất kỳ tướng nào (phe ta, hàng chờ, địch; cả lúc đang đánh – máu/linh lực cập nhật trực tiếp) để xem chỉ số, tộc/hệ, kỹ năng. Nhấn giữ (chuột phải) thẻ cửa hàng để xem trước khi mua. Bảng tự đặt ở phía không che tướng vừa chạm và không che cửa hàng |
| Hàng chờ | Kiểu TFT: 9 ô 3D ngay sau hàng cuối phe ta, tướng đứng trên ô. **Kéo thả** tướng giữa bàn cờ và hàng chờ (thả lên quân khác = đổi chỗ), kéo vào cửa hàng để bán. Vẫn dùng được chạm-chọn rồi chạm-đích |
| Nâng sao | 3 bản giống nhau cùng sao tự gộp, tối đa ★3: ★2 máu ×1,8 · công ×1,5 · kỹ năng ×1,15; ★3 máu ×3,2 · công ×2,5 · kỹ năng ×1,4 (chỉnh ở `STAR` trong `js/data/champions.js`). Mô hình to dần theo sao. Được mua khi hàng chờ đầy nếu lần mua đó tạo ra gộp |
| Bán | Hoàn giá × 3^(sao−1), trừ 1 với tướng ★2 trở lên |
| Thu nhập | 5 + lãi (1 mỗi 10 linh thạch, tối đa 5 – bảng thông tin nhắc mốc kế tiếp) + chuỗi thắng/thua (2: +1, 4: +2, 5+: +3) + 1 khi thắng. Vòng yêu thú: 5 + lãi + linh thạch yêu thú rơi, không tính chuỗi |
| Máu | 100. Thua mất 2 + ⌊vòng/2⌋ + tổng số sao của địch còn sống (vòng yêu thú: một nửa). Hết 60 giây tính là thua. Hết máu = hết ván |
| Lưu | Tự lưu vào `localStorage` (`vkkt_save`) sau mỗi thao tác; mở lại trang có nút "Tiếp tục" và "Ván mới" |

| Tộc / hệ | Mốc | Hiệu ứng |
|---|---|---|
| Kiếm Tu (Kiếm Đồng, Thanh Phong, Ngự Kiếm, Vô Cực, Vạn Kiếm Tiên Đế) | 2 / 4 | +20% công · +50% công, +20% tốc đánh |
| Pháp Tu (Hỏa Linh, Băng Linh, Cửu Viêm, Huyền Băng, Thiên Lôi, Thần Nữ) | 2 / 4 | Tuyệt kỹ +25%, linh lực đầu +20 · tuyệt kỹ +60%, linh lực đầu +40 |
| Hộ Pháp (Thiết Vệ, Huyền Giáp, Kim Cang) | 2 / 3 | +30% máu, +20 giáp · +60% máu, +45 giáp |
| Ma Tu (Ma Binh, Huyết Ma, U Minh Ma Quân, Hỗn Độn Ma Đế) | 2 / 4 | Hút máu 20% · hút máu 40%, +15% công |
| Đan Tu, Xạ Tu, Thương Tu, Sát Tu, Thể Tu | – | Mới có dữ liệu, cộng hưởng làm ở tuần 2 (hiện mờ trên bảng tộc/hệ) |

Tộc/hệ đếm số **tướng khác nhau** trên bàn (2 bản cùng tướng chỉ tính 1). Địch: 2 quân ở vòng 1, cứ 2 vòng thêm 1 (tối đa 8); máu và công ×1.07 mỗi vòng; ★2 từ vòng 5 (thêm quân ★2 ở vòng 8, 11), ★3 từ vòng 15. Vòng yêu thú: Yêu Lang (40% rơi trang bị, còn lại 1 linh thạch), Yêu Thú Vương (chắc chắn 1 trang bị + 3 linh thạch); thắng vòng yêu thú luôn được ít nhất 1 trang bị.

`tests/economy.js` (`npm run test:economy`): thống kê tỉ lệ ra tướng ở 9 cấp, bảo toàn số bản trong bể, tướng cạn bể không xuất hiện, đồng hồ chuẩn bị / giới hạn trận, trang bị qua tải lại trang, và cho 3 bot (tiết kiệm / lên cấp nhanh / làm mới liên tục) tự chơi để so đội hình.
Benchmark chụp lại ván đang chơi, chạy đội hình cố định rồi khôi phục nguyên trạng.

**Cảm ứng (Android)**: vùng chạm tướng rộng 46 px (chuột 34 px); kéo khi di quá 12 px (chuột 8 px) để rung tay không thành kéo;
khi kéo bằng ngón tay, tướng nổi phía trên ngón tay 56 px và mọi đích thả (ô, hàng chờ, cửa hàng để bán) tính theo vị trí tướng nổi;
rung nhẹ khi nhấc / thả (tắt được trong Cài đặt); không kéo-để-tải-lại, không menu nhấn giữ, không trễ chạm đúp; nút ≥ 36–40 px.

**Camera lúc chuẩn bị** tự căn khung theo kích thước màn hình (`fitPrepCamera`): tìm khoảng cách nhỏ nhất để hàng chờ + nửa bàn phe ta
(thêm các hàng địch nếu hình không nhỏ đi quá 20%) nằm gọn trong vùng trống giữa HUD và cửa hàng, rồi dùng lens shift
(dời tâm chiếu trong ma trận chiếu, không đổi phối cảnh) để đặt nội dung vào giữa vùng đó. Vào giao chiến camera trở về góc mặc định.

## AI giao chiến
| Vai trò | Tướng | Hành vi |
|---|---|---|
| Đỡ đòn | Thiết Vệ, Huyền Giáp, Kim Cang, Bất Diệt (+ Ma Thú Hống, Yêu Thú Vương) | Đánh kẻ gần nhất, kháng choáng / đóng băng 40% |
| Đấu sĩ | Kiếm Đồng, Ma Binh, Thanh Phong, Huyết Ma, Lôi Thương, Vô Cực, Vạn Kiếm Tiên Đế, Hỗn Độn Ma Đế | Đánh kẻ gần nhất, kháng khống chế 15% |
| Sát thủ | Ảnh Sát (+ Huyết Ảnh, Yêu Lang) | Ưu tiên tuyến sau đánh xa và kẻ máu thấp, lướt vào khi xa > 6,5 m; né cao |
| Pháp sư | Hỏa Linh, Băng Linh, Ngự Kiếm, Cửu Viêm, Huyền Băng, Thiên Lôi, U Minh Ma Quân (+ U Minh Ma Tu) | Dừng ở rìa tầm đánh; bị cận chiến áp sát (< 2,4 m) thì lùi ra nếu vẫn giữ được tầm và còn trong đài |
| Xạ thủ | Linh Cung | Như pháp sư (thả diều), tầm 9 m; trong tầm thì bắn kẻ còn ít máu nhất |
| Hỗ trợ | Thanh Mộc, Linh Y, Cửu Thiên Thần Nữ | Đứng tuyến sau; kỹ năng hồi máu chỉ tung khi có đồng minh < 75% máu (chờ tối đa 4 s) |

- **Di chuyển**: cận chiến nhắm "ô đánh" quanh mục tiêu (tản theo góc theo thứ tự trong nhóm cùng đánh, không dồn một điểm),
  lách sang bên khi đồng đội chắn phía trước; mục tiêu đã bị ≥ 2 đồng minh cận chiến vây thì ưu tiên kẻ khác.
  Kẹt đường (1,2 s không lại gần được 0,2 m mỗi nửa giây) → bỏ qua mục tiêu đó 2,5 s và chọn kẻ khác. Có lực đẩy tách để không chồng lên nhau.
- **Né**: chỉ né đòn đánh thường (kỹ năng và thiêu đốt luôn trúng); đang choáng hoặc đang tung chiêu thì không né.
  **Chí mạng**: theo chỉ số từng tướng (cả kỹ năng). **Khống chế**: choáng (Thiên Lôi, Vạn Kiếm), hất lùi, thiêu đốt;
  sau khi hết choáng được miễn khống chế 0,8 s; tướng đang tung chiêu không bị ngắt.
- **Kỹ năng tự chọn mục tiêu**: Vạn Kiếm / Thiên Lôi / Hỏa Phượng → chỗ địch đứng dày nhất; Kiếm Khí Trảm → hướng xuyên được nhiều địch nhất;
  Huyết Ảnh → kẻ yếu / tuyến sau trong 9 m; U Minh → 3 kẻ máu thấp nhất; Trấn Sơn / Phá Địa chỉ tung khi có địch trong 3,6 m,
  Hộ Thể khi có đồng đội bị thương hoặc địch áp sát (chờ tối đa 4 s rồi tung).
- **Đồng bộ animation**: sát thương cận chiến và lúc phóng đạn nằm trên timeline đúng mốc `active` – cũng là lúc rig đạt tư thế va chạm;
  bài kiểm tra đo độ lệch thực tế (≤ 1 bước mô phỏng 1/60 s).

`tests/combat.js` (`npm run test:combat`) dựng các trận: đội hình hỗn hợp, cận chiến dồn lên tuyến sau, đội đánh xa bị lao vào,
8 đấu 8, bảy cận chiến vây một mục tiêu, hàng dọc phải lách, sát thủ vs tuyến sau, cộng các trận ngẫu nhiên; đo kẹt đường, chồng chéo,
ra ngoài đài, thời gian cận chiến bắt đầu đánh, tỉ lệ đánh xa trong tầm / bị áp sát, sát thủ nhắm tuyến sau, né / chí mạng / choáng,
loại kỹ năng được tung, độ lệch animation – sát thương. Có một trận tự kiểm tra cố tình đóng băng 1 tướng để chắc thước đo kẹt phát hiện được.

## GLB / GLTF
Cài đặt → chọn tướng ở "Tướng nhận mô hình" → "Chọn file .glb". Mô hình thay cho mọi bản của tướng đó phe ta (kể cả bản mua sau đó), giữ tỉ lệ theo sao × `model.scale`;
mỗi tướng giữ GLB riêng (`GLB_LOADED[id]`, `RIG_FACTORIES[id]`), "Về mô hình thủ tục" chỉ gỡ của tướng đang chọn. Tên clip được nhận theo mẫu: Idle, Walk, Run, Dash, Attack01–03, HeavyAttack,
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

## V1.5 – Tuần 1: 24 tướng Tu Tiên
Nâng cấp trực tiếp trên mã cũ (không viết lại): giữ nguyên Three.js / WebGL, bàn cờ, giao chiến tự động, mua bán, nâng sao, kinh nghiệm,
kinh tế, AI, lưu ván, animation, shader, Vạn Kiếm Quy Tông và các mức đồ hoạ. Dữ liệu tướng / kỹ năng / hệ tách khỏi logic:

```
web/
├─ index.html                  HTML + CSS, nạp script theo thứ tự
├─ js/
│  ├─ 01…10-*.js               lõi, shader, renderer, VFX, rig, animation, âm thanh, camera, sân đấu (không đổi cấu trúc)
│  ├─ data/champions.js        24 tướng + phe địch, LOOKS, ROLES, STAR, ANIM, LEGACY_MAP, validateChampions
│  ├─ combat/effects.js        EffectSet (buff / debuff / chậm / DoT / HoT), healUnit, giveShield, applySlow
│  ├─ 11-units.js              Unit, FSM, AI, chỉ số động atkNow / defNow / aspdNow / speedNow, đóng băng
│  ├─ 12-combat.js             dealDamage (xuyên giáp, hút máu, sức mạnh kỹ năng × sao), applyStun (choáng / đóng băng), đạn
│  ├─ 13-skills.js             kỹ năng viết tay (Vạn Kiếm Quy Tông giữ nguyên)
│  ├─ combat/skill-executor.js chọn mục tiêu / điều kiện / áp hiệu ứng / VFX / dựng timeline cho kỹ năng dữ liệu
│  ├─ data/skills.js           SKILL_SPECS (19 kỹ năng dữ liệu) + SKILL_META (kỹ năng viết tay)
│  ├─ data/traits.js           TRAITS (4 hệ hoạt động + 5 hệ tuần 2)
│  └─ 14…19-*.js               kinh tế, nhập liệu, giao diện, benchmark, GLB, vòng lặp chính
├─ tests/                      playtest.js · combat.js · economy.js · champions.js (Playwright + Chromium)
├─ tools/gen-docs.js           sinh docs/CHAMPIONS.md từ dữ liệu
└─ docs/CHAMPIONS.md           bảng chỉ số 24 tướng, kỹ năng, tộc/hệ, mô hình & animation
```

**Thêm một tướng**: thêm 1 mục vào `CHAMPIONS` (và `LOOKS` nếu cần ngoại hình mới), thêm kỹ năng vào `SKILL_SPECS`
(chọn `type` / `target` / `effects` có sẵn) hoặc viết tay trong `js/13-skills.js`. `validateChampions()` chạy lúc khởi động
và báo lỗi console nếu thiếu trường, sai vai trò, thiếu kỹ năng / ngoại hình / animation hay sai số tướng mỗi bậc.

**Kỹ năng dữ liệu** – `type`: strike (đơn mục tiêu) · multi (liên kích, tự đổi mục tiêu khi mục tiêu ngã) · projectile · volley (nhiều mục tiêu) ·
line (xuyên tuyến) · area · zone (vùng duy trì theo nhịp) · dash (lướt tới) · summon (phi kiếm bay quanh rồi lao vào địch) · support.
`effects` lên địch: damage (mult, pen = xuyên giáp, knock, lifesteal) · dot · slow · stun · freeze · debuff. `ally`: heal · hot · shield · buff · selfDamage.
Kỹ năng tự tung khi đầy năng lượng và đúng điều kiện (`ready`: allyHurt / enemyNear / hurtOrNear, chờ tối đa 4 s).
Mỗi lần dùng, mục tiêu được lấy lại (`live()`) nên mục tiêu chết giữa chiêu thì chiêu chuyển sang kẻ khác hoặc kết thúc êm; timeline luôn có Cleanup.
Hiệu ứng cùng loại từ cùng kỹ năng làm mới thời gian, không cộng dồn vô hạn.

**Bản lưu cũ**: tướng đã đổi / gỡ (Lôi Pháp Sư, Hộ Pháp, Ảnh Kiếm, U Hồn Sư, Hỏa Tôn, U Minh, Huyết Ảnh, Ma Thú) được chuyển sang tướng mới cùng bậc
(`LEGACY_MAP`), giữ sao và trang bị; sau khi chuyển, 3 bản trùng tự gộp sao. Cửa hàng và đối thủ ảo cũng được chuyển.

### Chạy trên Windows
1. Cách nhanh nhất: mở link artifact bằng Chrome / Edge.
2. Chạy từ mã nguồn (cần Node.js 18+): mở PowerShell trong thư mục `web` → `npx serve .` → mở `http://localhost:3000`.
   (Không mở trực tiếp `index.html` bằng `file://` vì trình duyệt chặn nạp script / GLB cục bộ ở một số chế độ.)
3. Kiểm thử: `npm install` rồi `npx playwright install chromium` (một lần), sau đó `npm test`, `npm run test:combat`, `npm run test:economy`, `npm run test:champions`.
   Trên PowerShell đặt biến môi trường kiểu `$env:VIEW="400x820"; node tests/playtest.js`.

### Chạy trên Android
1. Mở link artifact bằng Chrome Android, xoay ngang hoặc dọc đều chơi được; Chrome menu → "Thêm vào màn hình chính" để mở toàn màn hình.
2. Chạy từ máy tính trong cùng Wi-Fi: trên máy tính `npx serve web -l 3000`, trên điện thoại mở `http://<IP máy tính>:3000`.
3. Máy yếu: Cài đặt → mức đồ hoạ Thấp / Vừa, hoặc chạy "Kiểm tra hiệu năng" để game đề xuất mức; game cũng tự hạ mức khi FPS < 38 kéo dài.

### Đã làm / chưa làm (tuần 1)
| Hạng mục | Trạng thái |
|---|---|
| 24 tướng 6/6/5/4/3, đủ id, tên, bậc, phẩm, tộc, hệ, vai trò, chỉ số, năng lượng, chí mạng, màu, mô hình, animation | Xong |
| 24 kỹ năng riêng (19 dữ liệu + 5 viết tay), cơ chế thật, tự tung, mục tiêu chết an toàn | Xong |
| Vạn Kiếm Tiên Đế dùng lại Vạn Kiếm Quy Tông cũ | Xong |
| Nâng sao theo cấu hình (máu 1/1,8/3,2 · công 1/1,5/2,5 · kỹ năng 1/1,15/1,4), tối đa ★3 | Xong |
| Đóng băng, làm chậm, DoT, HoT, lá chắn, buff / debuff, hút máu, xuyên giáp, lướt, phi kiếm triệu hồi | Xong |
| Mô hình: dùng chung CharacterRig, phân biệt trang phục / vũ khí (thêm cung) / màu / kích thước; cache geometry dùng chung | Xong |
| Gắn GLB riêng cho từng tướng (Cài đặt) | Xong (chưa có file GLB nào kèm theo – không dùng mô hình có bản quyền) |
| Bản lưu cũ tương thích | Xong |
| Hệ mới Đan Tu / Xạ Tu / Thương Tu / Sát Tu / Thể Tu, tộc Nhân / Tiên / Ma / Linh / Yêu | Chỉ dữ liệu – cộng hưởng làm ở tuần 2 |
| Cân bằng | Mới cân theo đường cong DPS × máu hiệu dụng mỗi bậc (docs/CHAMPIONS.md) và bot tự chơi; chưa có số liệu người chơi thật |
| Animation dựng tay riêng từng tướng, mô hình Ultra, cinematic, nhiều người chơi, lõi nâng cấp, ghép trang bị đầy đủ, sảnh 8 người | Không làm (ngoài phạm vi tuần 1) |
