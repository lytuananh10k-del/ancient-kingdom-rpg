# Báo cáo cân bằng sơ bộ – V1.5 tuần 3

> Sinh tự động bởi `npm run balance` (tests/balance.js) bằng CombatTestRunner: mô phỏng không render, bước 60 Hz, seed 1, 2, 3. Không phải số liệu người chơi thật.

## A. Chỉ số từng tướng (★1 / ★2 / ★3)

DPS = sát thương trung bình mỗi giây trong 20 s đánh bia đỡ (gồm kỹ năng, năng lượng chỉ từ đòn đánh – thấp hơn trận thật vì không bị đánh). Máu hiệu dụng = máu / hệ số giáp (vật lý) hoặc kháng phép (phép). Hồi + khiên = tổng trong 20 s (có 1 đồng minh 50% máu). Khống chế = giây choáng / đóng băng (làm chậm tính theo %) mỗi lần thi triển.

| Tướng | Bậc | Vai trò | DPS ★1/★2/★3 | Máu hiệu dụng vật lý ★1/★2/★3 | Máu hiệu dụng phép ★1/★2/★3 | Hồi + khiên ★1/★2/★3 | Số lần tung (20 s) | Khống chế / lần | Năng lượng cần | Tầm |
|---|---|---|---|---|---|---|---|---|---|---|
| Kiếm Đồng | 1 | Đấu sĩ | 53 / 83 / 148 | 720 / 1296 / 2304 | 720 / 1296 / 2304 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 40 | 2.2 |
| Thiết Vệ | 1 | Đỡ đòn | 30 / 46 / 78 | 1610 / 2898 / 5152 | 1196 / 2153 / 3827 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.6 |
| Hỏa Linh | 1 | Pháp sư | 37 / 56 / 98 | 638 / 1149 / 2043 | 672 / 1210 / 2150 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 40 | 7.5 |
| Thanh Mộc | 1 | Hỗ trợ | 19 / 29 / 48 | 661 / 1189 / 2115 | 700 / 1260 / 2240 | 230 / 330 / 330 | 1 / 1 / 1 | 0 | 50 | 6.5 |
| Ma Binh | 1 | Đấu sĩ | 60 / 91 / 152 | 755 / 1359 / 2417 | 768 / 1382 / 2458 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 50 | 2.2 |
| Linh Cung | 1 | Xạ thủ | 50 / 78 / 139 | 593 / 1067 / 1897 | 598 / 1076 / 1914 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 70 | 9 |
| Thanh Phong | 2 | Đấu sĩ | 65 / 101 / 177 | 854 / 1537 / 2733 | 854 / 1537 / 2733 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.2 |
| Huyền Giáp | 2 | Đỡ đòn | 29 / 44 / 73 | 1523 / 2741 / 4872 | 1418 / 2552 / 4536 | 315 / 652 / 1411 | 1 / 1 / 1 | 0 | 60 | 2.6 |
| Băng Linh | 2 | Pháp sư | 38 / 59 / 103 | 736 / 1325 / 2355 | 781 / 1405 / 2499 | 0 / 0 / 0 | 2 / 2 / 2 | 1.2 | 40 | 7.5 |
| Huyết Ma | 2 | Đấu sĩ | 46 / 70 / 122 | 976 / 1757 / 3123 | 1000 / 1800 / 3200 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.2 |
| Lôi Thương | 2 | Đấu sĩ | 53 / 81 / 139 | 1030 / 1853 / 3295 | 975 / 1755 / 3120 | 0 / 0 / 0 | 2 / 2 / 2 | 0.5 | 50 | 2.8 |
| Linh Y | 2 | Hỗ trợ | 21 / 32 / 54 | 779 / 1402 / 2492 | 845 / 1521 / 2703 | 147 / 280 / 280 | 1 / 1 / 1 | 0 | 50 | 6.5 |
| Ngự Kiếm | 3 | Pháp sư | 56 / 88 / 156 | 927 / 1669 / 2967 | 950 / 1710 / 3040 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 5.5 |
| Cửu Viêm | 3 | Pháp sư | 55 / 85 / 148 | 873 / 1572 / 2794 | 903 / 1625 / 2889 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 7.5 |
| Kim Cang | 3 | Đỡ đòn | 35 / 52 / 87 | 1950 / 3510 / 6240 | 1820 / 3276 / 5824 | 312 / 646 / 1398 | 2 / 2 / 2 | 0 | 50 | 2.6 |
| Ảnh Sát | 3 | Sát thủ | 86 / 134 / 238 | 816 / 1469 / 2611 | 816 / 1469 / 2611 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 60 | 2.2 |
| Huyền Băng | 3 | Pháp sư | 42 / 64 / 112 | 873 / 1572 / 2794 | 947 / 1705 / 3031 | 0 / 0 / 0 | 2 / 2 / 2 | 1.6 | 50 | 7.5 |
| Vô Cực | 4 | Đấu sĩ | 90 / 142 / 256 | 1300 / 2340 / 4160 | 1300 / 2340 / 4160 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.4 |
| Thiên Lôi | 4 | Pháp sư | 50 / 77 / 137 | 1074 / 1932 / 3436 | 1144 / 2059 / 3661 | 0 / 0 / 0 | 2 / 2 / 2 | 0.6 | 50 | 8 |
| Bất Diệt | 4 | Đỡ đòn | 50 / 76 / 129 | 2030 / 3654 / 6496 | 1960 / 3528 / 6272 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 60 | 2.4 |
| U Minh Quân | 4 | Pháp sư | 63 / 100 / 181 | 1066 / 1920 / 3412 | 1118 / 2012 / 3578 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 60 | 7 |
| Kiếm Đế | 5 | Đấu sĩ | 73 / 114 / 201 | 1280 / 2304 / 4096 | 1300 / 2340 / 4160 | 0 / 0 / 0 | 1 / 1 / 1 | 1.2 | 55 | 2.2 |
| Thần Nữ | 5 | Hỗ trợ | 51 / 78 / 133 | 1323 / 2381 / 4234 | 1418 / 2552 / 4536 | 121 / 250 / 330 | 1 / 1 / 1 | 0.9 | 60 | 7.5 |
| Ma Đế | 5 | Đấu sĩ | 64 / 99 / 172 | 1675 / 3015 / 5360 | 1625 / 2925 / 5200 | 0 / 0 / 0 | 1 / 1 / 1 | 0.8 | 70 | 2.6 |

**Trung bình theo bậc (★1)** – tiềm năng tăng theo giá:

| Bậc | DPS | Máu hiệu dụng vật lý | Máu hiệu dụng phép | DPS × máu hiệu dụng (so với bậc 1) |
|---|---|---|---|---|
| 1 | 42 | 830 | 776 | ×1.00 |
| 2 | 42 | 983 | 979 | ×1.24 |
| 3 | 55 | 1088 | 1087 | ×1.79 |
| 4 | 63 | 1368 | 1381 | ×2.61 |
| 5 | 63 | 1426 | 1448 | ×2.70 |

## B. Đấu tay đôi trong cùng bậc (★2 vs ★2, đổi bên, 3 seed)

Đấu 1 chọi 1 thiên về đấu sĩ / sát thủ (đỡ đòn và hỗ trợ được thiết kế để mạnh trong đội hình) – dùng để phát hiện tướng lệch hẳn, không phải mục tiêu 50%.

| Bậc | Tướng (tỉ lệ thắng, thời lượng TB) |
|---|---|
| 1 | Thiết Vệ 97% (26 s) · Ma Binh 83% (13 s) · Kiếm Đồng 60% (14 s) · Linh Cung 37% (14 s) · Thanh Mộc 23% (29 s) · Hỏa Linh 0% (16 s) |
| 2 | Huyền Giáp 100% (31 s) · Thanh Phong 77% (15 s) · Huyết Ma 57% (20 s) · Lôi Thương 47% (18 s) · Băng Linh 20% (17 s) · Linh Y 0% (25 s) |
| 3 | Kim Cang 100% (24 s) · Ảnh Sát 75% (14 s) · Ngự Kiếm 50% (15 s) · Huyền Băng 21% (17 s) · Cửu Viêm 4% (15 s) |
| 4 | Bất Diệt 100% (21 s) · Vô Cực 67% (15 s) · U Minh Quân 33% (15 s) · Thiên Lôi 0% (15 s) |
| 5 | Ma Đế 100% (18 s) · Kiếm Đế 33% (17 s) · Thần Nữ 17% (19 s) |

**Lệch khỏi 25–75% trong đấu tay đôi**: Thiết Vệ (bậc 1, tank) 97% · Ma Binh (bậc 1, fighter) 83% · Thanh Mộc (bậc 1, support) 23% · Hỏa Linh (bậc 1, mage) 0% · Huyền Giáp (bậc 2, tank) 100% · Thanh Phong (bậc 2, fighter) 77% · Băng Linh (bậc 2, mage) 20% · Linh Y (bậc 2, support) 0% · Kim Cang (bậc 3, tank) 100% · Huyền Băng (bậc 3, mage) 21% · Cửu Viêm (bậc 3, mage) 4% · Bất Diệt (bậc 4, tank) 100% · Thiên Lôi (bậc 4, mage) 0% · Ma Đế (bậc 5, fighter) 100% · Thần Nữ (bậc 5, support) 17%

## C. Đường cong giá

| Trận | Tỉ lệ thắng của bên đầu | Số trận |
|---|---|---|
| Bậc 2 ★1 vs bậc 1 ★1 | 72% | 72 |
| Bậc 3 ★1 vs bậc 2 ★1 | 58% | 60 |
| Bậc 4 ★1 vs bậc 3 ★1 | 75% | 40 |
| Bậc 5 ★1 vs bậc 4 ★1 | 42% | 24 |
| Bậc 1 ★3 vs bậc 4 ★1 | 96% | 24 |
| Bậc 1 ★3 vs bậc 5 ★1 | 100% | 18 |
| Bậc 2 ★3 vs bậc 4 ★1 | 100% | 24 |
| Bậc 2 ★3 vs bậc 5 ★1 | 100% | 18 |
| Bậc 1 ★3 vs bậc 4 ★2 | 50% | 24 |
| Bậc 2 ★3 vs bậc 4 ★2 | 75% | 24 |

## D. 8 đội hình tộc/hệ cân giá (8 tướng ★2, tổng giá 21–23) đấu vòng tròn

Ô = tỉ lệ thắng của đội ở hàng khi gặp đội ở cột (3 seed × đổi bên). "Tổng giá" = tổng giá tướng ★1 trong đội.

| Đội \ gặp | A | B | C | D | E | F | G | H | Trung bình | Tổng giá |
|---|---|---|---|---|---|---|---|---|---|---|
| A. Kiếm Tu 6 | — | 33% | 67% | 67% | 0% | 67% | 67% | 0% | **43%** | 21 |
| B. Pháp Tu 6 | 67% | — | 100% | 100% | 50% | 17% | 100% | 0% | **62%** | 21 |
| C. Hộ Pháp 6 | 33% | 0% | — | 33% | 0% | 0% | 0% | 0% | **10%** | 21 |
| D. Nhân Tộc 6 | 33% | 0% | 67% | — | 33% | 83% | 100% | 50% | **52%** | 22 |
| E. Ma Tộc 6 | 100% | 50% | 100% | 67% | — | 67% | 100% | 83% | **81%** | 22 |
| F. Tiên Tộc 6 | 33% | 83% | 100% | 17% | 33% | — | 100% | 0% | **52%** | 22 |
| G. Yêu Tộc 6 | 33% | 0% | 100% | 0% | 0% | 0% | — | 0% | **19%** | 21 |
| H. Đan Tu 4 + Hộ Pháp 4 | 100% | 100% | 100% | 50% | 17% | 100% | 100% | — | **81%** | 21 |

**Đội không thua ai**: Ma Tộc 6 · **Vòng khắc chế (A > B > C > A)**: 2 vòng, ví dụ Kiếm Tu 6 > Tiên Tộc 6 > Pháp Tu 6 > Kiếm Tu 6; Nhân Tộc 6 > Tiên Tộc 6 > Pháp Tu 6 > Nhân Tộc 6

## E. 60 trận ngẫu nhiên (4–8 tướng ★1–★2 mỗi bên, vị trí ngẫu nhiên)

Phe dưới thắng 32 · phe trên thắng 28 · hoà 0 · thời lượng TB 20.3 s · sát thương TB mỗi tướng 1046 · bất thường: không có

_Thời gian chạy: 50 s. Lỗi console: 0._
