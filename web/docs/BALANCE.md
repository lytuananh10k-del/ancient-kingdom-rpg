# Báo cáo cân bằng sơ bộ – V1.5 tuần 3

> Sinh tự động bởi `npm run balance` (tests/balance.js) bằng CombatTestRunner: mô phỏng không render, bước 60 Hz, seed 1, 2, 3. Không phải số liệu người chơi thật.

## A. Chỉ số từng tướng (★1 / ★2 / ★3)

DPS = sát thương trung bình mỗi giây trong 20 s đánh bia đỡ (gồm kỹ năng, năng lượng chỉ từ đòn đánh – thấp hơn trận thật vì không bị đánh). Máu hiệu dụng = máu / hệ số giáp (vật lý) hoặc kháng phép (phép). Hồi + khiên = tổng trong 20 s (có 1 đồng minh 50% máu). Khống chế = giây choáng / đóng băng (làm chậm tính theo %) mỗi lần thi triển.

| Tướng | Bậc | Vai trò | DPS ★1/★2/★3 | Máu hiệu dụng vật lý ★1/★2/★3 | Máu hiệu dụng phép ★1/★2/★3 | Hồi + khiên ★1/★2/★3 | Số lần tung (20 s) | Khống chế / lần | Năng lượng cần | Tầm |
|---|---|---|---|---|---|---|---|---|---|---|
| Kiếm Đồng | 1 | Đấu sĩ | 56 / 87 / 155 | 720 / 1296 / 2304 | 720 / 1296 / 2304 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 40 | 2.2 |
| Thiết Vệ | 1 | Đỡ đòn | 32 / 49 / 83 | 1610 / 2898 / 5152 | 1196 / 2153 / 3827 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.6 |
| Hỏa Linh | 1 | Pháp sư | 40 / 62 / 106 | 638 / 1149 / 2043 | 672 / 1210 / 2150 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 40 | 7.5 |
| Thanh Mộc | 1 | Hỗ trợ | 20 / 30 / 49 | 661 / 1189 / 2115 | 700 / 1260 / 2240 | 325 / 425 / 425 | 2 / 2 / 2 | 0 | 50 | 6.5 |
| Ma Binh | 1 | Đấu sĩ | 66 / 98 / 161 | 755 / 1359 / 2417 | 768 / 1382 / 2458 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 50 | 2.2 |
| Linh Cung | 1 | Xạ thủ | 58 / 91 / 161 | 593 / 1067 / 1897 | 598 / 1076 / 1914 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 70 | 9 |
| Thanh Phong | 2 | Đấu sĩ | 71 / 111 / 199 | 854 / 1537 / 2733 | 854 / 1537 / 2733 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 50 | 2.2 |
| Huyền Giáp | 2 | Đỡ đòn | 31 / 47 / 79 | 1523 / 2741 / 4872 | 1418 / 2552 / 4536 | 420 / 869 / 1882 | 2 / 2 / 2 | 0 | 60 | 2.6 |
| Băng Linh | 2 | Pháp sư | 40 / 62 / 107 | 690 / 1242 / 2208 | 732 / 1318 / 2342 | 0 / 0 / 0 | 2 / 2 / 2 | 1.2 | 40 | 7.5 |
| Huyết Ma | 2 | Đấu sĩ | 48 / 74 / 128 | 976 / 1757 / 3123 | 1000 / 1800 / 3200 | 92 / 92 / 92 | 2 / 2 / 2 | 0 | 50 | 2.2 |
| Lôi Thương | 2 | Đấu sĩ | 55 / 85 / 146 | 1030 / 1853 / 3295 | 975 / 1755 / 3120 | 0 / 0 / 0 | 2 / 2 / 2 | 0.5 | 50 | 2.8 |
| Linh Y | 2 | Hỗ trợ | 22 / 33 / 55 | 779 / 1402 / 2492 | 845 / 1521 / 2703 | 242 / 375 / 375 | 1 / 1 / 1 | 0 | 50 | 6.5 |
| Ngự Kiếm | 3 | Pháp sư | 59 / 93 / 166 | 927 / 1669 / 2967 | 950 / 1710 / 3040 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 5.5 |
| Cửu Viêm | 3 | Pháp sư | 57 / 88 / 155 | 873 / 1572 / 2794 | 903 / 1625 / 2889 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 7.5 |
| Kim Cang | 3 | Đỡ đòn | 37 / 56 / 94 | 1950 / 3510 / 6240 | 1820 / 3276 / 5824 | 312 / 646 / 1398 | 2 / 2 / 2 | 0 | 50 | 2.6 |
| Ảnh Sát | 3 | Sát thủ | 91 / 142 / 253 | 816 / 1469 / 2611 | 816 / 1469 / 2611 | 0 / 0 / 0 | 3 / 3 / 3 | 0 | 60 | 2.2 |
| Huyền Băng | 3 | Pháp sư | 45 / 70 / 121 | 873 / 1572 / 2794 | 947 / 1705 / 3031 | 0 / 0 / 0 | 2 / 2 / 2 | 1.6 | 50 | 7.5 |
| Vô Cực | 4 | Đấu sĩ | 91 / 144 / 260 | 1300 / 2340 / 4160 | 1300 / 2340 / 4160 | 0 / 0 / 0 | 2 / 2 / 2 | 0 | 50 | 2.4 |
| Thiên Lôi | 4 | Pháp sư | 53 / 82 / 144 | 1074 / 1932 / 3436 | 1144 / 2059 / 3661 | 0 / 0 / 0 | 2 / 2 / 2 | 0.6 | 50 | 8 |
| Bất Diệt | 4 | Đỡ đòn | 53 / 81 / 139 | 2030 / 3654 / 6496 | 1960 / 3528 / 6272 | 24 / 0 / 0 | 2 / 2 / 2 | 0 | 60 | 2.4 |
| U Minh Quân | 4 | Pháp sư | 70 / 111 / 203 | 1066 / 1920 / 3412 | 1118 / 2012 / 3578 | 91 / 91 / 91 | 2 / 2 / 2 | 0 | 60 | 7 |
| Kiếm Đế | 5 | Đấu sĩ | 72 / 112 / 198 | 1280 / 2304 / 4096 | 1300 / 2340 / 4160 | 0 / 0 / 0 | 2 / 2 / 2 | 1.2 | 55 | 2.2 |
| Thần Nữ | 5 | Hỗ trợ | 57 / 88 / 154 | 1323 / 2381 / 4234 | 1418 / 2552 / 4536 | 331 / 419 / 419 | 2 / 2 / 2 | 0.9 | 60 | 7.5 |
| Ma Đế | 5 | Đấu sĩ | 70 / 108 / 187 | 1675 / 3015 / 5360 | 1625 / 2925 / 5200 | 50 / 84 / 84 | 2 / 2 / 2 | 0.8 | 70 | 2.6 |

**Trung bình theo bậc (★1)** – tiềm năng tăng theo giá:

| Bậc | DPS | Máu hiệu dụng vật lý | Máu hiệu dụng phép | DPS × máu hiệu dụng (so với bậc 1) |
|---|---|---|---|---|
| 1 | 45 | 830 | 776 | ×1.00 |
| 2 | 45 | 975 | 971 | ×1.19 |
| 3 | 58 | 1088 | 1087 | ×1.73 |
| 4 | 67 | 1368 | 1381 | ×2.52 |
| 5 | 66 | 1426 | 1448 | ×2.62 |

## B. Đấu tay đôi trong cùng bậc (★2 vs ★2, đổi bên, 3 seed)

Đấu 1 chọi 1 thiên về đấu sĩ / sát thủ (đỡ đòn và hỗ trợ được thiết kế để mạnh trong đội hình) – dùng để phát hiện tướng lệch hẳn, không phải mục tiêu 50%.

| Bậc | Tướng (tỉ lệ thắng, thời lượng TB) |
|---|---|
| 1 | Thiết Vệ 93% (26 s) · Ma Binh 87% (13 s) · Kiếm Đồng 57% (14 s) · Linh Cung 43% (13 s) · Thanh Mộc 20% (28 s) · Hỏa Linh 0% (16 s) |
| 2 | Huyền Giáp 100% (33 s) · Thanh Phong 77% (15 s) · Huyết Ma 57% (20 s) · Lôi Thương 47% (19 s) · Băng Linh 10% (17 s) · Linh Y 10% (26 s) |
| 3 | Kim Cang 100% (25 s) · Ảnh Sát 75% (14 s) · Ngự Kiếm 50% (16 s) · Huyền Băng 21% (17 s) · Cửu Viêm 4% (15 s) |
| 4 | Bất Diệt 100% (22 s) · Vô Cực 67% (15 s) · U Minh Quân 33% (15 s) · Thiên Lôi 0% (16 s) |
| 5 | Ma Đế 100% (18 s) · Kiếm Đế 33% (17 s) · Thần Nữ 17% (19 s) |

**Lệch khỏi 25–75% trong đấu tay đôi**: Thiết Vệ (bậc 1, tank) 93% · Ma Binh (bậc 1, fighter) 87% · Thanh Mộc (bậc 1, support) 20% · Hỏa Linh (bậc 1, mage) 0% · Huyền Giáp (bậc 2, tank) 100% · Thanh Phong (bậc 2, fighter) 77% · Băng Linh (bậc 2, mage) 10% · Linh Y (bậc 2, support) 10% · Kim Cang (bậc 3, tank) 100% · Huyền Băng (bậc 3, mage) 21% · Cửu Viêm (bậc 3, mage) 4% · Bất Diệt (bậc 4, tank) 100% · Thiên Lôi (bậc 4, mage) 0% · Ma Đế (bậc 5, fighter) 100% · Thần Nữ (bậc 5, support) 17%

## C. Đường cong giá

| Trận | Tỉ lệ thắng của bên đầu | Số trận |
|---|---|---|
| Bậc 2 ★1 vs bậc 1 ★1 | 68% | 72 |
| Bậc 3 ★1 vs bậc 2 ★1 | 58% | 60 |
| Bậc 4 ★1 vs bậc 3 ★1 | 78% | 40 |
| Bậc 5 ★1 vs bậc 4 ★1 | 42% | 24 |
| Bậc 1 ★3 vs bậc 4 ★1 | 88% | 24 |
| Bậc 1 ★3 vs bậc 5 ★1 | 100% | 18 |
| Bậc 2 ★3 vs bậc 4 ★1 | 100% | 24 |
| Bậc 2 ★3 vs bậc 5 ★1 | 100% | 18 |
| Bậc 1 ★3 vs bậc 4 ★2 | 50% | 24 |
| Bậc 2 ★3 vs bậc 4 ★2 | 65% | 24 |

## D. 8 đội hình tộc/hệ cân giá (8 tướng ★2, tổng giá 21–23) đấu vòng tròn

Ô = tỉ lệ thắng của đội ở hàng khi gặp đội ở cột (3 seed × đổi bên). "Tổng giá" = tổng giá tướng ★1 trong đội.

| Đội \ gặp | A | B | C | D | E | F | G | H | Trung bình | Tổng giá |
|---|---|---|---|---|---|---|---|---|---|---|
| A. Kiếm Tu 6 | — | 0% | 33% | 50% | 0% | 33% | 17% | 0% | **19%** | 21 |
| B. Pháp Tu 6 | 100% | — | 100% | 100% | 17% | 17% | 50% | 67% | **64%** | 21 |
| C. Hộ Pháp 6 | 67% | 0% | — | 67% | 0% | 0% | 0% | 0% | **19%** | 21 |
| D. Nhân Tộc 6 | 50% | 0% | 33% | — | 0% | 100% | 33% | 0% | **31%** | 22 |
| E. Ma Tộc 6 | 100% | 83% | 100% | 100% | — | 50% | 50% | 83% | **81%** | 22 |
| F. Tiên Tộc 6 | 67% | 83% | 100% | 0% | 50% | — | 100% | 8% | **58%** | 22 |
| G. Yêu Tộc 6 | 83% | 50% | 100% | 67% | 50% | 0% | — | 0% | **50%** | 21 |
| H. Đan Tu 4 + Hộ Pháp 4 | 100% | 33% | 100% | 100% | 17% | 92% | 100% | — | **77%** | 21 |

**Đội không thua ai**: Ma Tộc 6 · **Vòng khắc chế (A > B > C > A)**: 6 vòng, ví dụ Pháp Tu 6 > Đan Tu 4 + Hộ Pháp 4 > Tiên Tộc 6 > Pháp Tu 6; Hộ Pháp 6 > Nhân Tộc 6 > Tiên Tộc 6 > Hộ Pháp 6; Nhân Tộc 6 > Tiên Tộc 6 > Pháp Tu 6 > Nhân Tộc 6

## E. 60 trận ngẫu nhiên (4–8 tướng ★1–★2 mỗi bên, vị trí ngẫu nhiên)

Phe dưới thắng 31 · phe trên thắng 29 · hoà 0 · thời lượng TB 22.6 s · sát thương TB mỗi tướng 1121 · bất thường: không có

_Thời gian chạy: 55 s. Lỗi console: 0._
