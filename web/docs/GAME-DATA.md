# Dữ liệu game – Vạn Kiếm Kỳ Trận Phiêu Lưu V2.0

Sinh tự động bởi `tools/gen-rpg-docs.js` từ `js/rpg/data.js` (+ `js/data/champions.js`, `js/data/artifacts.js`). Đừng sửa tay – sửa dữ liệu rồi chạy lại.

## Tông môn

| Tông môn | Chỉ số gốc (sinh lực / linh lực / công / giáp / chí mạng) | Ngoại hình chọn được (lấy từ 24 tướng) | Sư Phụ | Kỹ năng |
|---|---|---|---|---|
| 剑 Thanh Vân Kiếm Tông | 220 / 120 / 18 / 2 / 6% | Kiếm Đồng, Thanh Phong Kiếm Khách, Ngự Kiếm Chân Nhân, Vô Cực Kiếm Tôn, Ảnh Sát, Ma Binh | Vạn Kiếm Tiên Đế | Kiếm Chiêu · Nhất Kiếm Đoạn Thủy · Thanh Phong Liên Trảm · Ngự Kiếm Thuật · Vạn Kiếm Quy Tông |
| 法 Đan Hà Pháp Tông | 185 / 220 / 18 / 1 / 5% | Hỏa Linh, Thanh Mộc, Băng Linh Sư, Linh Y, Cửu Viêm Pháp Sư, Huyền Băng Tiên Tử | Thiên Lôi Đạo Nhân | Linh Chưởng · Hàn Băng Tiễn · Cửu Viêm Hỏa Trận · Mộc Linh Hồi Xuân · Cửu Thiên Lôi Kiếp |
| 武 Bất Diệt Võ Tông | 280 / 110 / 16 / 4 / 5% | Thiết Vệ, Huyết Ma, Lôi Thương, Kim Cang Hộ Pháp, Huyền Giáp Vệ, Ma Thú Hống | Bất Diệt Chiến Thần | Quyền Kích · Lôi Thương Xuyên Vân · Phá Địa Trảm · Kim Cang Bất Hoại · Bất Diệt Kim Thân |

## Cảnh giới (thay "sức mạnh")

Mỗi cảnh giới chia 9 tầng; chỉ số gốc × (1 + thưởng cảnh giới + 1,2% mỗi tầng). Tu vi và linh căn nhận khi gây sát thương lên quái (0.12 tu vi / 1 sát thương, boss × 0,25) và khi hạ quái (1.2 × cấp quái), nhân hệ số chênh cấp 10%–130%.

| Cảnh giới | Tu vi cần | Thưởng chỉ số gốc |
|---|---|---|
| Luyện Khí | 0 | +0% |
| Trúc Cơ | 3.000 | +15% |
| Kim Đan | 30.000 | +35% |
| Nguyên Anh | 200.000 | +60% |
| Hóa Thần | 1.000.000 | +90% |
| Luyện Hư | 5.000.000 | +130% |
| Hợp Thể | 20.000.000 | +180% |
| Đại Thừa | 80.000.000 | +250% |

## Linh căn (điểm tiềm năng)

| Chỉ số | Mỗi lần nâng | Giá lần 1 | Giá lần 11 | Giá lần 101 |
|---|---|---|---|---|
| Sinh lực | +20 | 40 | 64 | 280 |
| Linh lực | +20 | 40 | 64 | 280 |
| Sức đánh | +1 | 60 | 90 | 360 |
| Giáp | +1 | 160 | 288 | 1.440 |
| Chí mạng | +1% | 4.000 | 44.000 | (tối đa 20 lần) |

## Kỹ năng (15)

Cấp 1–7 (bí kíp ở Sư Phụ: linh thạch + tu vi tối thiểu). Linh lực tốn × (1 + 0,6 × cảnh giới).

| Tông môn | Kỹ năng | Loại | Hệ số công cấp 1 → 7 | Hồi chiêu | Linh lực | Mở khoá | Mô tả |
|---|---|---|---|---|---|---|---|
| Kiếm Tông | Kiếm Chiêu | melee | 100% → 100% | 0.42 s | 0 | có sẵn | Chém liên hoàn 3 nhát, nhát thứ 3 mạnh hơn. |
| Kiếm Tông | Nhất Kiếm Đoạn Thủy | wave | 220% → 370% | 3 s | 14 | Luyện Khí | Phóng một đạo kiếm khí bay thẳng, xuyên qua mọi kẻ địch trên đường. |
| Kiếm Tông | Thanh Phong Liên Trảm | dash | 130% → 220% × 4 | 6 s | 24 | nhiệm vụ q5 | Lướt tới trước, chém 4 nhát vào mọi kẻ địch lướt qua. |
| Kiếm Tông | Ngự Kiếm Thuật | orbit | 70% → 130% | 16 s | 40 | Trúc Cơ | 3 phi kiếm xoay quanh thân trong 8 giây, tự chém kẻ địch lại gần. |
| Kiếm Tông | Vạn Kiếm Quy Tông (tuyệt kỹ) | rain | 55% → 103% × 14 | 40 s | 90 | Kim Đan | Tuyệt kỹ: triệu vạn phi kiếm trút xuống vùng phía trước, 14 đợt sát thương, đợt cuối choáng. |
| Pháp Tông | Linh Chưởng | bolt | 100% → 100% | 0.55 s | 0 | có sẵn | Phóng chưởng lực linh khí vào mục tiêu. |
| Pháp Tông | Hàn Băng Tiễn | bolt | 240% → 420% | 3 s | 16 | Luyện Khí | Băng tiễn xuyên giáp, làm chậm 40% trong 2,5 giây. |
| Pháp Tông | Cửu Viêm Hỏa Trận | zone | 60% → 108% | 9 s | 34 | nhiệm vụ q5 | Dựng hỏa trận tại mục tiêu: thiêu đốt kẻ địch bên trong mỗi 0,5 giây trong 4 giây. |
| Pháp Tông | Mộc Linh Hồi Xuân | heal | 22% → 40% | 18 s | 45 | Trúc Cơ | Hồi ngay 22% sinh lực, rồi hồi thêm trong 5 giây. |
| Pháp Tông | Cửu Thiên Lôi Kiếp (tuyệt kỹ) | strike | 260% → 440% × 9 | 40 s | 100 | Kim Đan | Tuyệt kỹ: 9 đạo thiên lôi giáng xuống kẻ địch xung quanh, mỗi đạo choáng 0,6 giây. |
| Võ Tông | Quyền Kích | melee | 105% → 105% | 0.5 s | 0 | có sẵn | Đòn thương / trảo nặng, nhát thứ 3 hất lùi. |
| Võ Tông | Lôi Thương Xuyên Vân | dash | 220% → 370% × 1 | 5 s | 18 | Luyện Khí | Xung phong đâm thương, choáng 0,8 giây kẻ bị trúng. |
| Võ Tông | Phá Địa Trảm | slam | 240% → 408% | 8 s | 30 | nhiệm vụ q5 | Dậm đất tạo sóng chấn diện rộng, hất tung kẻ địch xung quanh. |
| Võ Tông | Kim Cang Bất Hoại | shield | 30% → 54% | 20 s | 40 | Trúc Cơ | Khiên kim cang hấp thụ 30% sinh lực tối đa, giảm 30% sát thương nhận trong 6 giây. |
| Võ Tông | Bất Diệt Kim Thân (tuyệt kỹ) | transform | 50% → 86% | 60 s | 80 | Kim Đan | Tuyệt kỹ biến thân: thân hình hóa vàng to lớn, +50% công, +50% giáp, hồi 2% sinh lực / giây trong 15 giây. |

## Bản đồ (14)

| Mã | Bản đồ | Vùng | Rộng | Cấp quái | Quái | Boss | Nối |
|---|---|---|---|---|---|---|---|
| A0 | Thanh Vân Sơn Môn | kiem | 80 m | sơn môn | – | – | A1 → |
| A1 | Trúc Lâm | kiem | 110 m | 1–4 | Linh Thỏ ×6, Trúc Yêu ×4 | – | ← A0 A2 → |
| A2 | Vân Hải Nhai | kiem | 120 m | 6–10 | Phong Điểu ×4, Thạch Linh ×5 | – | ← A1 A3 → |
| A3 | Kiếm Mộ | kiem | 130 m | 12–16 | Kiếm Hồn ×5, Hắc Lang ×4 | Huyết Kiếm Ma Tôn (cấp 20) | ← A2 |
| B0 | Đan Hà Cốc | phap | 80 m | sơn môn | – | – | B1 → |
| B1 | Phong Lâm | phap | 110 m | 1–4 | Hồ Linh ×6, Hỏa Linh Tinh ×4 | – | ← B0 B2 → |
| B2 | Hỏa Diệm Sơn | phap | 120 m | 6–10 | Hỏa Nha ×4, Viêm Thạch Quái ×5 | – | ← B1 B3 → |
| B3 | Lôi Trạch | phap | 130 m | 12–16 | Lôi Xà ×5, U Minh Ma Tu ×4 | Lôi Giao Vương (cấp 20) | ← B2 |
| C0 | Vạn Thú Lĩnh | vo | 80 m | sơn môn | – | – | C1 → |
| C1 | Mãng Hoang Nguyên | vo | 110 m | 1–4 | Dã Trư ×6, Thanh Linh Tinh ×4 | – | ← C0 C2 → |
| C2 | Cổ Thụ Lâm | vo | 120 m | 6–10 | Thụ Yêu ×5, Yêu Lang ×4 | – | ← C1 C3 → |
| C3 | Thú Vương Động | vo | 130 m | 12–16 | Ma Thú Hống ×5, Thạch Giáp Trư ×4 | Yêu Thú Vương (cấp 20) | ← C2 |
| D1 | Ma Uyên | ma | 140 m | 22–28 | Huyết Ảnh Kiếm Khách ×4, Ma Nha ×3, Ma Binh ×4 | U Minh Ma Quân (cấp 32) · cần Nguyên Anh | D2 → |
| D2 | Hỗn Độn Hư Không | ma | 140 m | 30–36 | Hỗn Độn Thạch Ma ×5, Hư Không Giao ×4 | Hỗn Độn Ma Đế (cấp 42) · cần Nguyên Anh | ← D1 |

## Quái & boss

Chỉ số chuẩn theo cấp L: sinh lực = (40·L^1,5 + 40) × hpK; công = (7 + 3,8·L^1,25) × atkK; giáp = 0,8·L (boss × 1,5). Bảng dưới: chỉ số ở cấp thấp nhất / cao nhất của bản đồ.

| Quái | Mô hình | Hành vi | Bản đồ | Sinh lực | Công |
|---|---|---|---|---|---|
| Linh Thỏ | rabbit | bị động | A1 | 64 – 288 | 8 – 20 |
| Trúc Yêu | tree | chủ động | A1 | 96 – 432 | 11 – 28 |
| Phong Điểu | bird | chủ động, bay | A2 | 502 – 1.044 | 43 – 75 |
| Thạch Linh | golem | chủ động | A2 | 942 – 1.957 | 47 – 82 |
| Kiếm Hồn | người (anhkiem) | chủ động | A3 | 1.703 – 2.600 | 106 – 148 |
| Hắc Lang | wolf | chủ động | A3 | 1.703 – 2.600 | 110 – 154 |
| Hồ Linh | wolf | bị động | B1 | 64 – 288 | 8 – 20 |
| Hỏa Linh Tinh | slime | chủ động, bắn xa | B1 | 80 – 360 | 11 – 28 |
| Hỏa Nha | bird | chủ động, bay | B2 | 502 – 1.044 | 45 – 78 |
| Viêm Thạch Quái | golem | chủ động | B2 | 942 – 1.957 | 49 – 86 |
| Lôi Xà | serpent | chủ động | B3 | 1.873 – 2.860 | 101 – 141 |
| U Minh Ma Tu | người (U Minh Ma Tu) | chủ động, bắn xa | B3 | 1.532 – 2.340 | 110 – 154 |
| Dã Trư | boar | bị động | C1 | 72 – 324 | 8 – 21 |
| Thanh Linh Tinh | slime | chủ động | C1 | 88 – 396 | 11 – 28 |
| Thụ Yêu | tree | chủ động | C2 | 879 – 1.827 | 43 – 75 |
| Yêu Lang | wolf | chủ động | C2 | 628 – 1.305 | 49 – 86 |
| Ma Thú Hống | người (Ma Thú Hống) | chủ động | C3 | 2.384 – 3.640 | 101 – 141 |
| Thạch Giáp Trư | boar | chủ động | C3 | 2.724 – 4.160 | 101 – 141 |
| Huyết Ảnh Kiếm Khách | người (Huyết Ảnh Kiếm Khách) | chủ động | D1 | 4.168 – 5.966 | 226 – 302 |
| Ma Nha | bird | chủ động, bay | D1 | 3.751 – 5.370 | 216 – 290 |
| Ma Binh | người (Ma Binh) | chủ động | D1 | 5.418 – 7.756 | 216 – 290 |
| Hỗn Độn Thạch Ma | golem | chủ động | D2 | 10.580 – 13.888 | 329 – 411 |
| Hư Không Giao | serpent | chủ động, bay | D2 | 7.935 – 10.416 | 342 – 428 |
| ☠ Huyết Kiếm Ma Tôn | người (Huyết Ảnh Kiếm Khách) | boss, 150 s hồi sinh | A3 | 79.590 | 268 |
| ☠ Lôi Giao Vương | serpent | boss, 150 s hồi sinh, bay, bắn xa | B3 | 79.590 | 268 |
| ☠ Yêu Thú Vương | người (Yêu Thú Vương) | boss, 150 s hồi sinh | C3 | 86.825 | 268 |
| ☠ U Minh Ma Quân | người (U Minh Ma Quân) | boss, 200 s hồi sinh, bắn xa | D1 | 189.300 | 504 |
| ☠ Hỗn Độn Ma Đế | người (Hỗn Độn Ma Đế) | boss, 300 s hồi sinh | D2 | 437.106 | 744 |

## Trang bị (5 ô) + pháp bảo (2 ô)

Chỉ số chính × hệ số bậc × (1 + 12% mỗi cấp cường hoá, tối đa +7). Pháp bảo: 36 món của bản cờ (ghép 2 nguyên liệu ở Luyện Khí Sư), chỉ số bản cờ đổi sang chỉ số nhân vật, 29 loại nội tại chạy theo luật "giao chiến".

| Bậc | Cần | Giá Linh Thương | Hộ Giáp | Chiến Khố | Hộ Thủ | Vân Hài | Ngọc Bội |
|---|---|---|---|---|---|---|---|
| Thanh Đồng | Luyện Khí | 150 | 3 def, 30 hp | 60 hp | 4 atk | 40 mp | 1.6% crit, 20 hp |
| Bạch Ngân | Luyện Khí | 900 | 8 def, 78 hp | 156 hp | 10 atk | 104 mp | 2.2% crit, 52 hp |
| Hoàng Kim | Trúc Cơ | 4.500 | 17 def, 165 hp | 330 hp | 22 atk | 220 mp | 2.8% crit, 110 hp |
| Huyền Thiết | Kim Đan | 22.000 | 30 def, 300 hp | 600 hp | 40 atk | 400 mp | 3.4% crit, 200 hp |
| Tử Kim | Nguyên Anh | chỉ rơi từ quái / boss | 51 def, 510 hp | 1020 hp | 68 atk | 680 mp | 4% crit, 340 hp |
| Thiên Tinh | Hóa Thần | chỉ rơi từ quái / boss | 84 def, 840 hp | 1680 hp | 112 atk | 1120 mp | 4.6% crit, 560 hp |

## Đan dược

| Vật phẩm | Giá | Tác dụng |
|---|---|---|
| Hồi Huyết Đan | 30 linh thạch | Hồi 250 sinh lực. |
| Hồi Linh Đan | 30 linh thạch | Hồi 200 linh lực. |
| Đại Hồi Huyết Đan | 220 linh thạch | Hồi 1.800 sinh lực. |
| Đại Hồi Linh Đan | 220 linh thạch | Hồi 1.200 linh lực. |
| Ngộ Đạo Đan | 5 tiên ngọc | Nhân đôi tu vi và linh căn nhận được trong 10 phút. |
| Hoàn Hồn Phù | 2 tiên ngọc | Khi tử trận: hồi sinh ngay tại chỗ với đầy sinh lực. |
| Linh Đan (Linh Đan Thụ cấp 1–7) | thu hoạch miễn phí, 75 s / viên, chứa tối đa 5–17 | hồi 40%–100% sinh lực + linh lực |

## Điều ước Thần Long (7 Long Châu)

| Điều ước | Tác dụng |
|---|---|
| Tu vi đại tiến | Nhận tu vi bằng 35% khoảng cách tới cảnh giới kế tiếp (tối thiểu 3.000). |
| Phú khả địch quốc | Nhận linh thạch: 20.000 × (cảnh giới + 1). |
| Thần binh xuất thế | Nhận 1 pháp bảo ngẫu nhiên +3 và 1 trang bị bậc cao. |
| Ngộ đạo | Mọi kỹ năng đã học +1 cấp (tối đa 7). |
| Tiên duyên | Nhận 60 tiên ngọc và 3 Ngộ Đạo Đan. |

## Nhiệm vụ chính tuyến (15)

| # | Nhiệm vụ | Yêu cầu | Thưởng |
|---|---|---|---|
| 1 | Bái kiến sư phụ | Tới gặp Sư Phụ ở giữa sơn môn. | gold: 200, equip: ao 1 |
| 2 | Thử tay | Ra khỏi sơn môn (đi sang phải), hạ 5 yêu thú. | tv: 300, item: hp_s 5 |
| 3 | Linh Đan Thụ | Về sơn môn, thu hoạch linh đan ở Linh Đan Thụ. | gold: 300 |
| 4 | Khai mở linh căn | Mở bảng Nhân vật (phím N) và dùng linh căn nâng một chỉ số. | tv: 400, equip: gang 1 |
| 5 | Yêu đan | Thu thập 6 Yêu Đan từ yêu thú ở bản đồ đầu tiên. | gold: 800, unlock: true, equip: quan 1 |
| 6 | Đột phá Trúc Cơ | Tu luyện tới cảnh giới Trúc Cơ. | gem: 10, equip: giay 2 |
| 7 | Vượt núi | Tới bản đồ thứ hai của tông môn, hạ 20 yêu thú. | tv: 3000, item: hp_m 5 |
| 8 | Luyện khí | Đưa 2 nguyên liệu cho Luyện Khí Sư để luyện 1 pháp bảo. | gold: 2000, item: mp_m 5 |
| 9 | Bái phỏng đồng đạo | Nhờ Truyền Tống Sứ tới tông môn khác và bái phỏng Sư Phụ ở đó. | ball: 1, gem: 10 |
| 10 | Đột phá Kim Đan | Tu luyện tới cảnh giới Kim Đan. | gold: 8000, equip: ngoc 3 |
| 11 | Trừ ma | Hạ boss ở bản đồ cuối vùng tông môn (boss xuất hiện theo giờ). | tv: 30000, gem: 20 |
| 12 | Thất Tinh Long Châu | Thu thập đủ 7 viên Long Châu và triệu hồi Thần Long ở Tế Đàn. | gem: 30 |
| 13 | Đột phá Nguyên Anh | Tu luyện tới Nguyên Anh để mở đường tới Ma Uyên. | gold: 30000 |
| 14 | Ma Uyên | Tới Ma Uyên (Truyền Tống Sứ), hạ 30 ma vật. | tv: 200000, equip: ao 5 |
| 15 | Diệt Ma Đế | Cùng đồng đạo hạ Hỗn Độn Ma Đế ở Hỗn Độn Hư Không. | gem: 100, art: 5 |
