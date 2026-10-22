# Combat & Skills V3.0 – V1.5 tuần 3

Tài liệu kỹ thuật của hệ thống chiến đấu. Bảng chỉ số 24 tướng: [CHAMPIONS.md](CHAMPIONS.md) (sinh từ dữ liệu).
Báo cáo cân bằng: [BALANCE.md](BALANCE.md) (sinh bởi `npm run balance`).

## 1. Chỉ số chuẩn hoá

Mỗi tướng (`Unit.statsNow()`) có:

| Chỉ số | Trường dữ liệu | Ghi chú |
|---|---|---|
| Máu / máu tối đa | `hp` | × sao × (1 + % tộc/hệ) + máu trang bị |
| Công vật lý | `atk` | × sao × (1 + % tộc/hệ) × trang bị |
| Sức mạnh phép thuật (AP) | `ap` (100) | 100 = ×1. × STAR.skill × (1 + % sức mạnh kỹ năng tộc/hệ) × trang bị. Nhân **mọi** hệ số kỹ năng (sát thương, hồi máu, lá chắn) |
| Giáp | `def` | × (1 + % giáp tộc/hệ) + giáp trang bị; có thể âm khi bị giảm giáp |
| Kháng phép | `mr` | mới ở tuần 3 (đỡ đòn 30–40, đấu sĩ 20–30, pháp sư 20–30, xạ thủ 15, hỗ trợ 25–35); có thể âm |
| Tốc đánh, tầm, tốc chạy | `aspd`, `range`, `speed` | |
| Năng lượng hiện tại / tối đa | `mana0`, `mana` | |
| Chí mạng / sát thương chí mạng | `crit`, `critDmg` | áp cho cả kỹ năng (không áp cho sát thương theo thời gian / sát thương cố định) |
| Hút máu | trang bị `ls`, trạng thái `lifesteal`, Ma Tộc `omni` | hút máu thường không tính sát thương theo thời gian; hút máu toàn phần (Ma Tộc) tính mọi nguồn |
| Kháng khống chế | `ROLES[role].tenacity` | đỡ đòn 40%, đấu sĩ 15%, hỗ trợ 10%, còn lại 0% |

Chỉ số gốc (`UNIT_DEFS`) không bao giờ bị sửa. Chỉ số trận được tính lại từ đầu ở `Unit.reset` mỗi khi đội hình đổi hoặc vào trận.

## 2. Công thức sát thương (`DamageCalculator`, hằng số ở `js/data/balance.js`)

```
Raw      = công_hiện_hành × hệ số × (1 ± 5% dao động, RNG có seed) × (chí mạng ? critDmg : 1) × (kỹ năng ? AP / 100 : 1)
Vật lý   : Damage = Raw × 100 / (100 + Giáp × (1 − xuyên giáp))
Phép     : Damage = Raw × 100 / (100 + Kháng phép × (1 − xuyên kháng))
Chuẩn    : Damage = Raw (bỏ qua giáp & kháng phép)
Phòng thủ âm : hệ số = 2 − 100 / (100 − giá_trị)   → tăng dần, tối đa ×2, không chia cho 0, không vô hạn
Cuối     : × hệ số "linh khí hỗn loạn" (sau 40 s) × hệ số giảm/tăng sát thương nhận (trạng thái) → làm tròn, tối thiểu 1
→ Lá chắn hấp thụ trước → Máu → hút máu → năng lượng → hiệu ứng phụ (hất lùi, choáng, thiêu) → chết → sự kiện tộc/hệ
```

- Loại sát thương: đòn thường = vật lý; sát thương theo thời gian / thiêu đốt = phép; kỹ năng = `effect.type` hoặc mặc định theo vai trò
  (pháp sư, hỗ trợ → phép; còn lại → vật lý). Pháp Tu (6) nổ % máu = phép. Phi kiếm phụ Kiếm Tu = vật lý.
- Né (`dodge`) chỉ áp cho đòn đánh thường; đang choáng / đang thi triển thì không né được.
- Trận đã phân định (`battle.phase = 'end'`) → không còn sát thương; đạn, vùng duy trì, phi kiếm, vùng báo trước bị dọn ngay.
- Năng lượng: đánh thường +10; bị đánh min(8, sát thương × 3% + 2) (tuần 2: 12 / 4%); nhân hệ số Tiên Tộc.

## 3. Trạng thái (`StatusEffectManager`, `js/combat/effects.js`)

Mỗi trạng thái có: `uid` (ID), `type`, `src` / `srcId` (nguồn), `target`, `start` / `end` theo **đồng hồ mô phỏng** (`battle.time`, bước 60 Hz – không dùng setTimeout),
`power`, `mods` (chỉ số bị đổi), `tag`, nhịp (`tick`, `nextTick`), cờ `debuff` / `cleanse`. Hết hạn khi `battle.time ≥ end` (kiểm thử: lệch ≤ 1 bước).

| Loại | Tên | Cộng dồn | Thanh tẩy | Hiển thị |
|---|---|---|---|---|
| `stun` | Choáng | giữ mốc kết thúc xa nhất | ✓ | chữ "Choáng", sao xoay trên đầu, bảng thông tin |
| `freeze` | Đóng băng (choáng + đứng im, phủ băng) | xa nhất | ✓ | phủ màu băng, tư thế dừng |
| `slow` | Làm chậm (tốc chạy −a, tốc đánh −a/2) | chỉ giữ mạnh nhất | ✓ | hạt băng dưới chân (MEDIUM+) |
| `burn` | Thiêu đốt (phép, 0,5 s/nhịp, 3 s) | làm mới | ✓ | lửa trên người |
| `dot` | Sát thương liên tục (phép, nhân AP) | làm mới theo nguồn/tag | ✓ | số cam |
| `shield` | Lá chắn | 1 lá chắn: lượng = max(còn lại, mới), thời gian xa nhất | ✗ | cầu Fresnel |
| `atkBuff` / `defBuff` / `aspdBuff` / `apBuff` / `mrBuff` | Tăng chỉ số | làm mới theo tag; khác tag thì nhân | ✗ | hạt bay lên (MEDIUM+) |
| `atkDown` / `aspdDown` | Giảm chỉ số | mạnh nhất | ✓ | |
| `armorReduction` / `mrReduction` | Giảm giáp / kháng phép | mạnh nhất | ✓ | hạt đỏ / tím rơi |
| `dmgReduction` / `dmgAmp` | Giảm / tăng sát thương nhận | làm mới / mạnh nhất | ✗ / ✓ | |
| `hot` | Hồi máu liên tục | làm mới; tổng luôn đủ | ✗ | hạt xanh |
| `lifesteal` | Hút máu | làm mới | ✗ | |

Thanh tẩy (`fx.cleanse(n)`): gỡ n hiệu ứng bất lợi thanh tẩy được, mới nhất trước. Choáng / đóng băng được đồng bộ sang `status.stun / frozen` cho FSM.
Kháng khống chế: thời gian × (1 − tenacity); hết choáng được miễn khống chế 0,8 s. Giai đoạn hỗn loạn (sau 40 s): mọi lượng hồi máu −50%.

## 4. AI & State Machine

| Trạng thái | Ý nghĩa |
|---|---|
| `idle` | chờ vào trận |
| `search` | không có mục tiêu hợp lệ – quét lại mỗi 0,25 s |
| `move` | tới chỗ đứng đánh (A*) / chờ hồi đòn trong tầm / thả diều / chạy khỏi vùng báo trước |
| `attack` | vung đòn: chuẩn bị → khung va chạm (sát thương / phóng đạn đúng mốc `active`) |
| `recover` | phần thu chiêu sau va chạm và 0,15 s sau thi triển – không hành động, vẫn bị khống chế |
| `cast` | thi triển (giáp chiêu – không bị ngắt) |
| `stun` | bị choáng / đóng băng |
| `dash`, `knockback` | lướt (sát thủ), bị hất lùi |
| `dead`, `victory` | |

- **Chọn mục tiêu**: cận chiến → gần nhất (tránh dồn > 2 người vào cùng một mục tiêu); sát thủ → tuyến sau đánh xa, máu thấp;
  xạ thủ → trong tầm thì kẻ ít máu nhất; mục tiêu chết → chọn lại ngay (search). Kỹ năng có luật chọn riêng (vùng đông nhất, yếu nhất, tuyến sau, đường thẳng…).
- **Đỡ đòn** bảo vệ bằng kỹ năng: khiên cho đồng minh yếu nhất khi có người bị thương / địch áp sát; giảm sát thương cho đồng minh quanh mình.
  **Hỗ trợ**: hồi máu / thanh tẩy chỉ khi có đồng minh < 75% máu hoặc dính hiệu ứng bất lợi (chờ tối đa 4 s rồi tung).
- **Tìm đường (`js/combat/pathfinder.js`)**: lưới 16×16 (mỗi ô bàn cờ chia 2×2, ≈ 1,15 m). A* 8 hướng, ô có tướng khác = chặn, không lách chéo qua khe;
  ô đứng đánh được **đặt chỗ** → hai tướng không chọn cùng ô. Đường đi được lưu, chỉ tính lại khi đổi mục tiêu, ô đích / ô kế tiếp bị chiếm, đi hết đường hoặc sau 0,6 s.
  Không có đường → lái trực tiếp (cũ) + đẩy tách 0,9 m. Kẹt 1,2 s → tạm bỏ mục tiêu.
- **Khống chế ngắt hành động**: choáng / đóng băng **ngắt** đòn đánh thường đang vung (chưa tới khung va chạm thì không gây sát thương);
  **không ngắt** thi triển (giáp chiêu) – thời gian khống chế vẫn trôi, còn dư thì bị choáng ngay sau khi thi triển xong; đang bị hất lùi thì choáng sau khi tiếp đất.
- **Vùng báo trước** (`DangerZones`): kỹ năng có thời gian chuẩn bị (Hỗn Độn Diệt Thế) đăng ký vùng; tướng phe kia đang đứng trong vùng thì chạy ra.
- **Kết thúc trận**: một bên hết người → thắng / thua; hết 60 s mà hai bên còn người, hoặc hai bên ngã cùng một bước → **hoà**, người chơi bị tính như thua (TFT).

## 5. Tái hiện & độc lập FPS

- `CombatRNG` (mulberry32) cho mọi ngẫu nhiên ảnh hưởng logic: né, chí mạng, dao động sát thương, lệch nhịp đầu trận, vị trí sét.
  VFX dùng `Math.random` riêng → đổi mức đồ hoạ không làm lệch chuỗi số. Seed của trận: `battle.seed` (đặt `battle.seedOverride` để tái hiện).
- Toàn bộ logic chạy trong `simStep` (60 Hz): timeline kỹ năng, đạn, `SimTasks` (vùng duy trì, phi kiếm triệu hồi), phi kiếm tộc/hệ, trạng thái.
  Tuần 3 sửa: vùng lửa Cửu Viêm và phi kiếm Ngự Kiếm trước đây chạy trong vòng lặp VFX (theo FPS); điểm phóng đạn trước đây đọc tư thế xương animation.
- Kiểm thử: ×1 và ×2, LOW và ULTRA chạy vòng lặp thời gian thực tới cùng bước 360 → máu và vị trí mọi tướng giống hệt (`tests/combat3.js`).

## 6. Đối chiếu 24 kỹ năng (đặc tả tuần 3 ↔ dữ liệu thực tế)

Giữ tên & kỹ năng tuần 1 khi đã có; cột cuối là phần nâng cấp tuần 3.

| # | Tướng | Đặc tả tuần 3 | Thực tế (giữ tên tuần 1) | Tuần 3 |
|---|---|---|---|---|
| 1 | Kiếm Đồng | Nhất Kiếm Trảm – chém tăng cường + kiếm khí | Nhất Kiếm Đoạn Thủy – 260% vật lý, xuyên 30% giáp, vệt chém | giữ |
| 2 | Thiết Vệ | Thiết Giáp Hộ Thể – tăng phòng thủ + giáp phát sáng | Thiết Bích – +35 giáp, −15% sát thương nhận 5 s, chấn 80% | + giáp phát sáng; sửa lỗi không bao giờ tung chiêu khi đứng ở rìa tầm đánh |
| 3 | Hỏa Linh | Hỏa Cầu Thuật – phép + thiêu ngắn | Hỏa Cầu Thuật | sát thương phép 180%, thiêu = trạng thái Burn |
| 4 | Thanh Mộc | hồi đồng minh thấp máu nhất + lá xanh | Mộc Linh Hồi Xuân | + VFX lá xanh / ánh ngọc; hồi 20% + 100% công, +10% trong 3 s |
| 5 | Ma Binh | Huyết Cuồng – tăng công khi máu thấp, kích hoạt 1 lần | Huyết Chiến (hiến máu → +40% công, +30% tốc đánh, +20% hút máu) + nội tại tăng công khi máu thấp | giữ (kích hoạt theo năng lượng, không phải 1 lần) |
| 6 | Linh Cung | Liên Châu Tiễn – chọn lại mục tiêu | Liên Châu Tiễn 3 mũi | + mũi tên đổi mục tiêu khi mục tiêu chết |
| 7 | Thanh Phong | 3 nhát, nhát cuối mạnh | Thanh Phong Liên Trảm 4 nhát | + nhát cuối ×1,6 (giữ 4 nhát) |
| 8 | Huyền Giáp | khiên bản thân + đồng minh gần nhất | Hộ Thể Chân Khí – khiên 3 đồng minh yếu nhất (gồm bản thân) | giữ; khiên 30% → 20% (× AP), năng lượng 70 → 100 (tạo 13.000 khiên / trận) |
| 9 | Băng Linh | phép + chậm tốc đánh | Hàn Băng Tiễn – nổ 2,2 m + chậm 40% (tốc đánh −20%) | phép 210% |
| 10 | Huyết Ma | hút máu theo sát thương thực | Huyết Phệ – 220% + hồi theo sát thương thực | hồi 100% → 70% |
| 11 | Lôi Thương | xuyên đường thẳng | Lôi Thương Xuyên Vân | giữ |
| 12 | Linh Y | hồi máu + thanh tẩy 1 hiệu ứng | Diệu Thủ Hồi Xuân | + thanh tẩy 1 hiệu ứng cho 2 đồng minh cần nhất; tung khi có người bị thương HOẶC dính hiệu ứng bất lợi |
| 13 | Ngự Kiếm | phi kiếm truy đuổi, va chạm riêng | Ngự Kiếm Thuật | phi kiếm bay có tốc độ, va chạm theo khoảng cách, 1 lần / lần lao, đổi mục tiêu; chạy trong bước mô phỏng |
| 14 | Cửu Viêm | vùng lửa nhiều đợt | Cửu Viêm Hỏa Trận | chạy trong bước mô phỏng (trước: theo FPS), cháy tiếp khi người thi triển ngã, 36%/nhịp |
| 15 | Kim Cang | giảm sát thương ngắn | Kim Cang Bất Hoại | giữ |
| 16 | Ảnh Sát | dịch chuyển sau mục tiêu hàng sau + đòn tăng cường | Ảnh Tập | giữ |
| 17 | Huyền Băng | AoE + đóng băng | Huyền Băng Phong Ấn | đóng băng = trạng thái thanh tẩy được; 180% phép |
| 18 | Vô Cực | kiếm khí xuyên, giảm dần theo cấu hình | Vô Cực Kiếm Khí | + falloff 0,85 / mục tiêu xuyên qua (tối thiểu 55%) |
| 19 | Thiên Lôi | sét liên hoàn, không nhảy vô hạn | Cửu Thiên Lôi Kiếp (tuần 2: 6 tia sét rơi quanh cụm) | **đổi** thành sét liên hoàn: tối đa 7 mục tiêu, mỗi mục tiêu 1 lần, giảm 10% mỗi lần nhảy |
| 20 | Bất Diệt | giảm sát thương + hồi phục, có điều kiện | Bất Diệt Kim Thân | điều kiện: máu < 50% hoặc địch trong tầm nổ; hồi giảm (10% + 12%), nội tại 1% → 0,6%/s |
| 21 | U Minh Ma Quân | vùng + hồi theo sát thương thực | U Minh Phệ Hồn – 4 u hồn vào kẻ yếu nhất, hồi theo sát thương thực | giữ (đa mục tiêu); hồi 50% → 35% |
| 22 | Vạn Kiếm Tiên Đế | tụ kiếm → khoá → bắn → kết; sát thương tách khỏi số kiếm hiển thị | Vạn Kiếm Quy Tông 5 giai đoạn | đã đúng (10 nhát + cự kiếm cố định); kiểm thử LOW/ULTRA xác nhận |
| 23 | Thần Nữ | pháp trận phép + khiên/hồi, có thời lượng | Cửu Thiên Thánh Trận | hồi toàn đội 20% → 10% |
| 24 | Hỗn Độn Ma Đế | vùng hỗn độn nhiều đợt + suy yếu + thời gian chuẩn bị | Hỗn Độn Diệt Thế (tuần 2: lao vào nổ 1 lần) | **đổi**: báo trước 0,8 s, 3 đợt × 105%, giảm 40% giáp & kháng phép, choáng ở đợt đầu; phe kia chạy ra |

## 7. VFX theo nhóm kỹ năng

Dùng lại VFXManager / ShaderLibrary sẵn có (pool pháp trận, xung kích, vết chém, hạt GPU, ribbon, khiên Fresnel, InstancedMesh phi kiếm):
kiếm (vết chém + kiếm khí bán nguyệt + phi kiếm), hỏa (cầu lửa có cánh, nổ + vòng lửa), băng (đạn băng, phủ băng), lôi (tia sét thủ tục, chuỗi sét),
mộc (lá xanh), quang (pháp trận vàng), hỗn độn (vùng báo trước đỏ nhấp nháy + 3 vòng nổ), giáp (phát sáng qua uniform, không tạo material).
Hạt trạng thái thưa ở LOW, dày dần tới ULTRA. Mức đồ hoạ không ảnh hưởng logic (đã kiểm thử).
**Giảm chuyển động**: nếu hệ điều hành bật `prefers-reduced-motion`, mặc định tắt camera điện ảnh, giảm rung và tắt khựng hình (đổi lại được trong Cài đặt); rung luôn bị chặn trần.

## 8. CombatTestRunner (`js/combat/test-runner.js`)

```js
__vkkt.CombatTestRunner.run({ allies: [['kiemdong', 2, 3, 3]], enemies: [['mathu', 1, 3, 4]], seed: 42 })
// → { result: 'win'|'lose'|'draw', time, steps, seed, allies[], enemies[] (sát thương theo loại, nhận, hồi, khiên, số lần tung, giết),
//     anomalies[] (NaN, kẹt > 2,5 s, đánh 2 lần, tung chiêu thiếu năng lượng, trận không kết thúc), leftovers, fingerprint }
__vkkt.CombatTestRunner.series(cfg, [1, 2, 3])   // tỉ lệ thắng, thời lượng, sát thương TB
```
Chỉ gọi `simStep` (không render). Mặc định phe địch cũng có tộc/hệ (`enemyTraits`) để so sánh đối xứng; trong game thật địch không có tộc/hệ.
Lưu ý: vẫn chạy trong trang (cần đối tượng Three.js của tướng), không chạy thuần Node.
