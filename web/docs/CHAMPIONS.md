# 24 tướng Tu Tiên – bảng chỉ số (V1.5 tuần 1)

> Sinh tự động bởi `node tools/gen-docs.js` từ `js/data/champions.js`, `js/data/skills.js`, `js/data/traits.js`. Đừng sửa tay.

Nâng sao (cấu hình `STAR`): máu ×1 / 1.8 / 3.2 · công ×1 / 1.5 / 2.5 · sức mạnh kỹ năng ×1 / 1.15 / 1.4 · kích thước mô hình ×1 / 1.12 / 1.24. 3 bản ★1 → ★2, 3 bản ★2 → ★3, tối đa ★3.

DPS ★1 = công × tốc đánh × (1 + chí mạng × (ST chí mạng − 1)). Máu hiệu dụng ★1 = máu × (1 + giáp/100) với sát thương vật lý (sát thương nhận = thô × 100 / (100 + giáp)); phép tính theo kháng phép. AP = sức mạnh phép thuật (100 = ×1 cho mọi hệ số kỹ năng).

| # | id | Tên | Bậc | Phẩm | Tộc | Hệ | Vai trò | Máu | Công | Giáp | AP | Kháng phép | Tốc đánh | Tầm | Tốc chạy | Năng lượng | Chí mạng | Né | DPS ★1 | Máu hiệu dụng ★1 | Máu ★2/★3 | Công ★2/★3 | Kỹ năng | Loại sát thương kỹ năng |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `kiemdong` | Kiếm Đồng | 1 | Phàm phẩm | Nhân Tộc | Kiếm Tu | Đấu sĩ | 600 | 52 | 20 | 100 | 20 | 0,95 | 2,2 | 4,4 | 20/60 | 10% ×1,5 | 8% | 52 | 720 | 1080/1920 | 78/130 | Nhất Kiếm Đoạn Thủy | Vật lý |
| 2 | `thietve` | Thiết Vệ | 1 | Phàm phẩm | Nhân Tộc | Hộ Pháp | Đỡ đòn | 920 | 40 | 40 | 100 | 30 | 0,8 | 2,6 | 3,8 | 30/80 | 5% ×1,5 | 0% | 33 | 1288 | 1656/2944 | 60/100 | Thiết Bích | Vật lý |
| 3 | `hoa` | Hỏa Linh | 1 | Phàm phẩm | Yêu Tộc | Pháp Tu, Đan Tu (phụ: Linh thể) | Pháp sư | 560 | 46 | 14 | 100 | 20 | 0,75 | 7,5 | 3,6 | 30/70 | 8% ×1,5 | 3% | 36 | 638 | 1008/1792 | 69/115 | Hỏa Cầu Thuật | Phép |
| 4 | `thanhmoc` | Thanh Mộc | 1 | Phàm phẩm | Tiên Tộc | Đan Tu (phụ: Linh thể) | Hỗ trợ | 560 | 32 | 18 | 100 | 25 | 0,75 | 6,5 | 3,6 | 20/70 | 5% ×1,5 | 3% | 25 | 661 | 1008/1792 | 48/80 | Mộc Linh Hồi Xuân | Phép |
| 5 | `mabinh` | Ma Binh | 1 | Phàm phẩm | Ma Tộc | Kiếm Tu | Đấu sĩ | 640 | 50 | 18 | 100 | 20 | 1 | 2,2 | 4,4 | 10/60 | 12% ×1,5 | 5% | 53 | 755 | 1152/2048 | 75/125 | Huyết Chiến | Vật lý |
| 6 | `linhcung` | Linh Cung | 1 | Phàm phẩm | Yêu Tộc | Pháp Tu (phụ: Xạ Tu) | Xạ thủ | 520 | 52 | 14 | 100 | 15 | 0,88 | 9 | 3,8 | 0/70 | 15% ×1,6 | 5% | 50 | 593 | 936/1664 | 78/130 | Liên Châu Tiễn | Vật lý |
| 7 | `thanhphong` | Thanh Phong Kiếm Khách | 2 | Linh phẩm | Nhân Tộc | Kiếm Tu | Đấu sĩ | 700 | 60 | 22 | 100 | 22 | 1,05 | 2,2 | 4,6 | 20/70 | 15% ×1,6 | 10% | 69 | 854 | 1260/2240 | 90/150 | Thanh Phong Liên Trảm | Vật lý |
| 8 | `huyengiap` | Huyền Giáp Vệ | 2 | Linh phẩm | Yêu Tộc | Hộ Pháp | Đỡ đòn | 1050 | 42 | 45 | 100 | 35 | 0,8 | 2,6 | 3,8 | 40/100 | 5% ×1,5 | 0% | 34 | 1523 | 1890/3360 | 63/105 | Hộ Thể Chân Khí | Vật lý |
| 9 | `bangling` | Băng Linh Sư | 2 | Linh phẩm | Yêu Tộc | Pháp Tu (phụ: Linh thể) | Pháp sư | 640 | 48 | 15 | 100 | 22 | 0,8 | 7,5 | 3,6 | 30/70 | 8% ×1,5 | 3% | 40 | 736 | 1152/2048 | 72/120 | Hàn Băng Tiễn | Phép |
| 10 | `huyetma` | Huyết Ma | 2 | Linh phẩm | Ma Tộc | Hộ Pháp | Đấu sĩ | 800 | 52 | 22 | 100 | 25 | 0,9 | 2,2 | 4,2 | 20/70 | 10% ×1,5 | 5% | 49 | 976 | 1440/2560 | 78/130 | Huyết Phệ | Vật lý |
| 11 | `loithuong` | Lôi Thương | 2 | Linh phẩm | Nhân Tộc | Hộ Pháp (phụ: Thương Tu) | Đấu sĩ | 780 | 58 | 32 | 100 | 25 | 0,85 | 2,8 | 4,2 | 20/70 | 10% ×1,5 | 5% | 52 | 1030 | 1404/2496 | 87/145 | Lôi Thương Xuyên Vân | Vật lý |
| 12 | `linhy` | Linh Y | 2 | Linh phẩm | Tiên Tộc | Đan Tu | Hỗ trợ | 660 | 36 | 18 | 100 | 28 | 0,75 | 6,5 | 3,6 | 30/80 | 5% ×1,5 | 3% | 28 | 779 | 1188/2112 | 54/90 | Diệu Thủ Hồi Xuân | Phép |
| 13 | `ngukiem` | Ngự Kiếm Chân Nhân | 3 | Huyền phẩm | Tiên Tộc | Kiếm Tu | Pháp sư | 760 | 58 | 22 | 100 | 25 | 0,85 | 5,5 | 3,8 | 30/80 | 12% ×1,6 | 5% | 53 | 927 | 1368/2432 | 87/145 | Ngự Kiếm Thuật | Phép |
| 14 | `cuuviem` | Cửu Viêm Pháp Sư | 3 | Huyền phẩm | Yêu Tộc | Pháp Tu (phụ: Linh thể) | Pháp sư | 740 | 60 | 18 | 100 | 22 | 0,8 | 7,5 | 3,6 | 30/80 | 10% ×1,5 | 3% | 50 | 873 | 1332/2368 | 90/150 | Cửu Viêm Hỏa Trận | Phép |
| 15 | `kimcuong` | Kim Cang Hộ Pháp | 3 | Huyền phẩm | Nhân Tộc | Hộ Pháp | Đỡ đòn | 1300 | 50 | 50 | 100 | 40 | 0,8 | 2,6 | 3,8 | 40/90 | 5% ×1,5 | 0% | 41 | 1950 | 2340/4160 | 75/125 | Kim Cang Bất Hoại | Vật lý |
| 16 | `anhsat` | Ảnh Sát | 3 | Huyền phẩm | Ma Tộc | Kiếm Tu (phụ: Sát Tu) | Sát thủ | 680 | 64 | 20 | 100 | 20 | 1,1 | 2,2 | 5 | 10/70 | 25% ×1,7 | 20% | 83 | 816 | 1224/2176 | 96/160 | Ảnh Tập | Vật lý |
| 17 | `huyenbang` | Huyền Băng Tiên Tử | 3 | Huyền phẩm | Tiên Tộc | Pháp Tu | Pháp sư | 740 | 56 | 18 | 100 | 28 | 0,8 | 7,5 | 3,6 | 40/90 | 8% ×1,5 | 3% | 47 | 873 | 1332/2368 | 84/140 | Huyền Băng Phong Ấn | Phép |
| 18 | `vocuc` | Vô Cực Kiếm Tôn | 4 | Địa phẩm | Ma Tộc | Kiếm Tu | Đấu sĩ | 1000 | 68 | 30 | 100 | 30 | 1 | 2,4 | 4,6 | 30/80 | 20% ×1,7 | 10% | 78 | 1300 | 1800/3200 | 102/170 | Vô Cực Kiếm Khí | Vật lý |
| 19 | `loiton` | Thiên Lôi Đạo Nhân | 4 | Địa phẩm | Nhân Tộc | Pháp Tu | Pháp sư | 880 | 66 | 22 | 100 | 30 | 0,8 | 8 | 3,6 | 40/90 | 10% ×1,5 | 3% | 55 | 1074 | 1584/2816 | 99/165 | Cửu Thiên Lôi Kiếp | Phép |
| 20 | `batdiet` | Bất Diệt Chiến Thần | 4 | Địa phẩm | Yêu Tộc | Hộ Pháp, Đan Tu (phụ: Thể Tu) | Đỡ đòn | 1400 | 62 | 45 | 100 | 40 | 0,85 | 2,4 | 4 | 40/100 | 8% ×1,5 | 0% | 55 | 2030 | 2520/4480 | 93/155 | Bất Diệt Kim Thân | Vật lý |
| 21 | `umaquan` | U Minh Ma Quân | 4 | Địa phẩm | Ma Tộc | Pháp Tu | Pháp sư | 860 | 64 | 24 | 100 | 30 | 0,8 | 7 | 3,6 | 30/90 | 10% ×1,5 | 3% | 54 | 1066 | 1548/2752 | 96/160 | U Minh Phệ Hồn | Phép |
| 22 | `kiemtien` | Vạn Kiếm Tiên Đế | 5 | Thiên phẩm | Tiên Tộc | Kiếm Tu | Đấu sĩ | 1000 | 76 | 28 | 100 | 30 | 1 | 2,2 | 4,6 | 45/100 | 15% ×1,7 | 10% | 84 | 1280 | 1800/3200 | 114/190 | Vạn Kiếm Quy Tông | Vật lý |
| 23 | `thannu` | Cửu Thiên Thần Nữ | 5 | Thiên phẩm | Tiên Tộc | Pháp Tu, Đan Tu | Hỗ trợ | 1050 | 70 | 26 | 100 | 35 | 0,8 | 7,5 | 3,6 | 40/100 | 10% ×1,5 | 3% | 59 | 1323 | 1890/3360 | 105/175 | Cửu Thiên Thánh Trận | Phép |
| 24 | `hondon` | Hỗn Độn Ma Đế | 5 | Thiên phẩm | Ma Tộc | Hộ Pháp | Đấu sĩ | 1250 | 76 | 34 | 100 | 30 | 0,9 | 2,6 | 4,4 | 30/100 | 15% ×1,7 | 5% | 76 | 1675 | 2250/4000 | 114/190 | Hỗn Độn Diệt Thế | Vật lý |

(phụ: …) = phân loại phụ, chỉ hiển thị, chưa có cộng hưởng.

## Đường cong sức mạnh theo bậc (trung bình ★1)

| Bậc | Số tướng | Máu | Công | DPS | Máu hiệu dụng | DPS × máu hiệu dụng (tương đối bậc 1) |
|---|---|---|---|---|---|---|
| 1 | 6 | 633 | 45 | 41 | 776 | ×1 |
| 2 | 6 | 772 | 49 | 45 | 983 | ×1,39 |
| 3 | 5 | 844 | 58 | 55 | 1088 | ×1,86 |
| 4 | 4 | 1035 | 65 | 60 | 1368 | ×2,57 |
| 5 | 3 | 1100 | 74 | 73 | 1426 | ×3,24 |

## Kỹ năng

| Tướng | Kỹ năng (id) | Loại | Mục tiêu | Điều kiện | Thời gian (vung / trúng / xong) | Hiệu ứng (hệ số công) | Mô tả |
|---|---|---|---|---|---|---|---|
| Kiếm Đồng | Nhất Kiếm Đoạn Thủy (`nhatKiem`) | Đơn mục tiêu | Gần nhất | đầy năng lượng | 0,25 / 0,32 / 0,7 s | damage 260% xuyên 30% | Chém một nhát dứt khoát vào mục tiêu: 260% công, bỏ qua 30% giáp. |
| Thiết Vệ | Thiết Bích (`thietBich`) | Diện rộng quanh mình r=3 | Gần nhất | địch trong tầm nổ | 0,3 / 0,4 / 0,8 s | damage 80% · ally:buff def +35 5s · ally:buff dmgTaken ×0,85 5s · ally:glow 5s | Dựng thiết bích: lớp giáp phát sáng, +35 giáp và giảm 15% sát thương nhận vào trong 5 giây, chấn 80% công (vật lý) lên địch trong 3 m. |
| Hỏa Linh | Hỏa Cầu Thuật (`hoaCau`) | Phóng đạn diện rộng | Vùng địch đông nhất | (viết tay, js/13-skills.js) | 3 s | damage, dot · tổng hệ số ≈ 180% | Phóng hỏa cầu truy đuổi mục tiêu, nổ gây 180% công (phép) trong bán kính 3 m và thiêu đốt 3 giây (12% công mỗi 0,5 giây). |
| Thanh Mộc | Mộc Linh Hồi Xuân (`mocLinh`) | Hỗ trợ | Bản thân / đồng minh | đồng minh < 75% máu | 0,3 / 0,45 / 0,9 s | ally:heal 20% máu · ally:hot 10% máu 3s | Lá xanh hồi xuân: hồi cho đồng minh yếu nhất 20% máu tối đa của Thanh Mộc + 100% công, rồi hồi thêm 10% trong 3 giây. |
| Ma Binh | Huyết Chiến (`huyetChien`) | Hỗ trợ | Bản thân / đồng minh | đầy năng lượng | 0,2 / 0,3 / 0,6 s | ally:selfDamage 12% máu · ally:buff atk ×1,4 5s · ally:buff aspd ×1,3 5s · ally:buff ls +0.2 5s | Đốt 12% máu hiện tại để nhận +40% công, +30% tốc đánh, +20% hút máu trong 5 giây. Nội tại: máu càng thấp công càng cao (tới +60%). |
| Linh Cung | Liên Châu Tiễn (`lienChau`) | Phóng đạn | Gần nhất | đầy năng lượng | 0,25 / 0,35 / 0,8 s | damage 110% xuyên 25% | Bắn liền 3 mũi tên vào mục tiêu, mỗi mũi 110% công và bỏ qua 25% giáp. |
| Thanh Phong Kiếm Khách | Thanh Phong Liên Trảm (`lienTram`) | Liên kích | Gần nhất | đầy năng lượng | 0,2 / 0,28 / 0,95 s | damage 70% xuyên 20% | Chém liên hoàn 4 nhát vào mục tiêu (đổi sang kẻ gần nhất nếu mục tiêu ngã): 3 nhát 70% công, nhát cuối tăng cường 112% công; bỏ qua 20% giáp. |
| Huyền Giáp Vệ | Hộ Thể Chân Khí (`hoThe`) | Hỗ trợ – lá chắn | 3 đồng minh yếu nhất | (viết tay, js/13-skills.js) | 6 s | shield · tổng hệ số ≈ 0% | Tạo khiên bằng 15% máu tối đa của bản thân (× sức mạnh phép thuật) cho bản thân và 1 đồng minh đang yếu nhất, giữ 6 giây. |
| Băng Linh Sư | Hàn Băng Tiễn (`hanBang`) | Phóng đạn r=2,2 | Vùng địch đông nhất | đầy năng lượng | 0,35 / 0,45 / 0,9 s | damage 240% · slow 3s 40% | Phóng băng tiễn vào vùng địch đông nhất: 240% công (phép) trong bán kính 2,2 m, làm chậm 40% trong 3 giây. |
| Huyết Ma | Huyết Phệ (`huyetPhe`) | Đơn mục tiêu | Gần nhất | đầy năng lượng | 0,25 / 0,35 / 0,75 s | damage 220% hút 70% | Huyết ảnh cắn xé mục tiêu: 220% công (vật lý), hồi máu bằng 70% sát thương THỰC gây ra (sau giáp, lá chắn). |
| Lôi Thương | Lôi Thương Xuyên Vân (`loiThuong`) | Xuyên tuyến | Hướng trúng nhiều nhất | đầy năng lượng | 0,3 / 0,38 / 0,85 s | damage 180% xuyên 20% · stun 0,5s | Đâm lôi thương xuyên hàng địch dài 9 m: 180% công, bỏ qua 20% giáp, choáng 0,5 giây. |
| Linh Y | Diệu Thủ Hồi Xuân (`dieuThu`) | Hỗ trợ | Bản thân / đồng minh | undefined | 0,3 / 0,45 / 0,9 s | ally:cleanse · ally:heal 15% máu · ally:buff dmgTaken ×0,85 3s | Linh đan diệu thủ: gỡ 1 hiệu ứng bất lợi thanh tẩy được (choáng, đóng băng, chậm, thiêu, giảm giáp…) cho 2 đồng minh cần nhất, hồi cho 2 đồng minh yếu nhất 15% máu tối đa của Linh Y + 80% công và giảm 15% sát thương họ nhận trong 3 giây. |
| Ngự Kiếm Chân Nhân | Ngự Kiếm Thuật (`nguKiem`) | Triệu hồi phi kiếm | Gần nhất | đầy năng lượng | 0,3 / 0,45 / 0,9 s | damage 45% | Triệu hồi 5 phi kiếm (+1 mỗi sao) bay quanh mình trong 6 giây; cứ 0,6 giây một thanh truy đuổi mục tiêu, va chạm gây 45% công (phép) rồi bay về; mục tiêu ngã thì kiếm đổi sang kẻ gần nhất. |
| Cửu Viêm Pháp Sư | Cửu Viêm Hỏa Trận (`cuuViem`) | Vùng duy trì r=3 | Vùng địch đông nhất | đầy năng lượng | 0,35 / 0,5 / 0,95 s | damage 36% | Lập hỏa trận 3 m tại vùng địch đông nhất trong 4 giây: cứ 0,5 giây gây 36% công (phép) lên mọi kẻ địch đứng trong (tối đa 288%); vẫn cháy nếu người thi triển ngã. |
| Kim Cang Hộ Pháp | Kim Cang Bất Hoại (`kimCang`) | Hỗ trợ | Bản thân / đồng minh | địch trong tầm nổ | 0,3 / 0,4 / 0,8 s | ally:buff dmgTaken ×0,65 4s · ally:shield 12% máu 4s | Bản thân và đồng minh trong 3,5 m giảm 35% sát thương nhận vào trong 4 giây; bản thân nhận lá chắn 12% máu tối đa. |
| Ảnh Sát | Ảnh Tập (`anhTap`) | Đột kích | Tuyến sau | đầy năng lượng | 0,15 / 0,32 / 0,7 s | damage 260% xuyên 40% | Ẩn vào bóng tối, xuất hiện sau lưng kẻ địch ở tuyến sau: 260% công, bỏ qua 40% giáp. |
| Huyền Băng Tiên Tử | Huyền Băng Phong Ấn (`huyenBang`) | Diện rộng r=2,8 | Vùng địch đông nhất | đầy năng lượng | 0,4 / 0,55 / 1 s | damage 180% · freeze 1,6s | Đóng băng vùng địch đông nhất bán kính 2,8 m: 180% công (phép) và đóng băng 1,6 giây (đỡ đòn kháng 40%). |
| Vô Cực Kiếm Tôn | Vô Cực Kiếm Khí (`voCucKiem`) | Xuyên tuyến (2 đạo, giảm 15% mỗi mục tiêu xuyên qua, tối thiểu 55%) | Hướng trúng nhiều nhất | (viết tay, js/13-skills.js) | — | damage, pen · tổng hệ số ≈ 480% | Chém 2 đạo kiếm khí bán nguyệt liên tiếp theo hướng trúng nhiều địch nhất: mỗi đạo 240% công (vật lý), xuyên mọi kẻ địch, bỏ qua 50% giáp; mỗi mục tiêu xuyên qua giảm 15% (tối thiểu 55%). |
| Thiên Lôi Đạo Nhân | Cửu Thiên Lôi Kiếp (`cuuThienLoi`) | undefined r=2,6 | Vùng địch đông nhất | đầy năng lượng | 0,35 / 0,55 / 1 s | damage 240% · stun 0,6s | Giáng sét vào vùng địch đông nhất rồi nhảy liên hoàn tới tối đa 6 kẻ địch khác (mỗi kẻ trúng 1 lần, tầm nhảy 5,5 m): 240% công (phép), giảm 10% mỗi lần nhảy, choáng 0,6 giây. |
| Bất Diệt Chiến Thần | Bất Diệt Kim Thân (`batDiet`) | Diện rộng quanh mình r=3,2 | Gần nhất | bản thân < 50% máu hoặc địch trong tầm nổ | 0,3 / 0,42 / 0,85 s | damage 120% · ally:heal 8% máu · ally:hot 6% máu 3s · ally:buff dmgTaken ×0,8 4s | Chấn 120% công và hất lùi địch trong 3,2 m; hồi ngay 8% máu tối đa, thêm 6% trong 3 giây và giảm 20% sát thương nhận trong 4 giây. Nội tại: hồi 0,4% máu mỗi giây. |
| U Minh Ma Quân | U Minh Phệ Hồn (`uMinhPhe`) | Phóng nhiều mục tiêu | Yếu nhất | đầy năng lượng | 0,35 / 0,5 / 1 s | damage 140% hút 35% | Phóng 4 u hồn hút sinh lực vào các kẻ địch yếu nhất: mỗi hồn 140% công (phép), hồi cho bản thân 35% sát thương thực gây ra. |
| Vạn Kiếm Tiên Đế | Vạn Kiếm Quy Tông (`vanKiem`) | Triệu hồi phi kiếm + diện rộng | Vùng địch đông nhất | (viết tay, js/13-skills.js) | 5,1 s | damage, knock, stun · tổng hệ số ≈ 620% | Triệu hồi phi kiếm vây quanh vùng địch đông nhất: 10 nhát chém liên tiếp (32% công mỗi nhát, bán kính 3,4 m), rồi cự kiếm giáng xuống gây 300% công trong bán kính 5 m, hất lùi và choáng 1,2 giây. |
| Cửu Thiên Thần Nữ | Cửu Thiên Thánh Trận (`cuuThien`) | Diện rộng r=4 | Vùng địch đông nhất | đầy năng lượng | 0,5 / 0,8 / 1,4 s | damage 220% · slow 3s 30% · ally:heal 10% máu · ally:buff atk ×1,2 4s | Giáng thánh trận bán kính 4 m vào vùng địch đông nhất: 220% công (phép), làm chậm 30% trong 3 giây; mọi đồng minh hồi 10% máu tối đa của Thần Nữ và +20% công trong 4 giây. |
| Hỗn Độn Ma Đế | Hỗn Độn Diệt Thế (`honDon`) | undefined r=4 | Vùng địch đông nhất | đầy năng lượng | 0,4 / 0,85 / 2 s | damage 105% xuyên 30% hút 20% · debuff 4s · debuff 4s · stun 0,8s | Báo trước vùng hỗn độn bán kính 4 m tại vùng địch đông nhất (0,8 giây để chạy ra), rồi lao vào tâm nổ 3 đợt: mỗi đợt 105% công (vật lý, bỏ qua 30% giáp), giảm 40% giáp và kháng phép trong 4 giây; đợt đầu choáng 0,8 giây; hồi 20% sát thương gây ra. |

## 8 tộc / hệ (V1.5 tuần 2)

Mô tả sinh từ dữ liệu `TRAITS` (TraitRegistry.describe) – luôn khớp hệ số thật trong trận.

| Tộc/hệ | Loại | Mốc | Hiệu ứng từng mốc | Tướng (bậc) |
|---|---|---|---|---|
| 人 Nhân Tộc (`nhan`) | Tộc | 2 / 4 / 6 | **(2)** Toàn đội +5% tốc đánh<br>**(4)** Toàn đội +12% tốc đánh<br>**(6)** Toàn đội +20% tốc đánh, +10% công | Kiếm Đồng (1), Thiết Vệ (1), Thanh Phong Kiếm Khách (2), Lôi Thương (2), Kim Cang Hộ Pháp (3), Thiên Lôi Đạo Nhân (4) |
| 魔 Ma Tộc (`ma`) | Tộc | 2 / 4 / 6 | **(2)** Ma Tộc +8% hút máu toàn phần<br>**(4)** Ma Tộc +15% hút máu toàn phần, +10% công<br>**(6)** Ma Tộc +22% hút máu toàn phần, +20% công | Ma Binh (1), Huyết Ma (2), Ảnh Sát (3), Vô Cực Kiếm Tôn (4), U Minh Ma Quân (4), Hỗn Độn Ma Đế (5) |
| 仙 Tiên Tộc (`tien`) | Tộc | 2 / 4 / 6 | **(2)** Tiên Tộc +10% năng lượng nhận được<br>**(4)** Tiên Tộc +20% năng lượng nhận được; lá chắn 10% máu tối đa khi vào trận<br>**(6)** Tiên Tộc +30% năng lượng nhận được; lá chắn 20% máu tối đa khi vào trận | Thanh Mộc (1), Linh Y (2), Ngự Kiếm Chân Nhân (3), Huyền Băng Tiên Tử (3), Vạn Kiếm Tiên Đế (5), Cửu Thiên Thần Nữ (5) |
| 妖 Yêu Tộc (`yeu`) | Tộc | 2 / 4 / 6 | **(2)** Yêu Tộc +8% máu tối đa<br>**(4)** Yêu Tộc +18% máu tối đa, +8% tốc đánh<br>**(6)** Yêu Tộc +30% máu tối đa, +15% tốc đánh | Hỏa Linh (1), Linh Cung (1), Huyền Giáp Vệ (2), Băng Linh Sư (2), Cửu Viêm Pháp Sư (3), Bất Diệt Chiến Thần (4) |
| 劍 Kiếm Tu (`kiemtu`) | Hệ | 2 / 4 / 6 | **(2)** Kiếm Tu +15% công<br>**(4)** Kiếm Tu +30% công; mỗi lần tung kỹ năng phóng 1 phi kiếm phụ, mỗi kiếm 35% công<br>**(6)** Kiếm Tu +50% công; mỗi lần tung kỹ năng phóng 3 phi kiếm phụ, mỗi kiếm 35% công | Kiếm Đồng (1), Ma Binh (1), Thanh Phong Kiếm Khách (2), Ngự Kiếm Chân Nhân (3), Ảnh Sát (3), Vô Cực Kiếm Tôn (4), Vạn Kiếm Tiên Đế (5) |
| 法 Pháp Tu (`phaptu`) | Hệ | 2 / 4 / 6 | **(2)** Pháp Tu +15% sức mạnh kỹ năng<br>**(4)** Pháp Tu +35% sức mạnh kỹ năng<br>**(6)** Pháp Tu +60% sức mạnh kỹ năng; kỹ năng trúng địch gây thêm 5% máu tối đa của mục tiêu (1 lần / mục tiêu / lần thi triển) | Hỏa Linh (1), Linh Cung (1), Băng Linh Sư (2), Cửu Viêm Pháp Sư (3), Huyền Băng Tiên Tử (3), Thiên Lôi Đạo Nhân (4), U Minh Ma Quân (4), Cửu Thiên Thần Nữ (5) |
| 護 Hộ Pháp (`hophap`) | Hệ | 2 / 4 / 6 | **(2)** Hộ Pháp +15% giáp<br>**(4)** Hộ Pháp +30% giáp; đồng minh đứng cạnh nhận lá chắn 8% máu tối đa khi vào trận<br>**(6)** Hộ Pháp +50% giáp; đồng minh đứng cạnh nhận lá chắn 15% máu tối đa khi vào trận | Thiết Vệ (1), Huyền Giáp Vệ (2), Huyết Ma (2), Lôi Thương (2), Kim Cang Hộ Pháp (3), Bất Diệt Chiến Thần (4), Hỗn Độn Ma Đế (5) |
| 丹 Đan Tu (`dantu`) | Hệ | 2 / 3 / 4 | **(2)** Đan Tu +15% hiệu quả hồi máu<br>**(3)** Đan Tu +30% hiệu quả hồi máu<br>**(4)** Đan Tu +50% hiệu quả hồi máu; lần đầu mỗi đồng minh xuống dưới 30% máu: hồi 12% máu tối đa trong 3 giây | Hỏa Linh (1), Thanh Mộc (1), Linh Y (2), Bất Diệt Chiến Thần (4), Cửu Thiên Thần Nữ (5) |

## Phân bổ tộc/hệ cho 24 tướng

| Tướng | Bậc | Tộc | Hệ | Phân loại phụ |
|---|---|---|---|---|
| Kiếm Đồng | 1 | Nhân Tộc | Kiếm Tu | — |
| Thiết Vệ | 1 | Nhân Tộc | Hộ Pháp | — |
| Hỏa Linh | 1 | Yêu Tộc | Pháp Tu, Đan Tu | Linh thể |
| Thanh Mộc | 1 | Tiên Tộc | Đan Tu | Linh thể |
| Ma Binh | 1 | Ma Tộc | Kiếm Tu | — |
| Linh Cung | 1 | Yêu Tộc | Pháp Tu | Xạ Tu |
| Thanh Phong Kiếm Khách | 2 | Nhân Tộc | Kiếm Tu | — |
| Huyền Giáp Vệ | 2 | Yêu Tộc | Hộ Pháp | — |
| Băng Linh Sư | 2 | Yêu Tộc | Pháp Tu | Linh thể |
| Huyết Ma | 2 | Ma Tộc | Hộ Pháp | — |
| Lôi Thương | 2 | Nhân Tộc | Hộ Pháp | Thương Tu |
| Linh Y | 2 | Tiên Tộc | Đan Tu | — |
| Ngự Kiếm Chân Nhân | 3 | Tiên Tộc | Kiếm Tu | — |
| Cửu Viêm Pháp Sư | 3 | Yêu Tộc | Pháp Tu | Linh thể |
| Kim Cang Hộ Pháp | 3 | Nhân Tộc | Hộ Pháp | — |
| Ảnh Sát | 3 | Ma Tộc | Kiếm Tu | Sát Tu |
| Huyền Băng Tiên Tử | 3 | Tiên Tộc | Pháp Tu | — |
| Vô Cực Kiếm Tôn | 4 | Ma Tộc | Kiếm Tu | — |
| Thiên Lôi Đạo Nhân | 4 | Nhân Tộc | Pháp Tu | — |
| Bất Diệt Chiến Thần | 4 | Yêu Tộc | Hộ Pháp, Đan Tu | Thể Tu |
| U Minh Ma Quân | 4 | Ma Tộc | Pháp Tu | — |
| Vạn Kiếm Tiên Đế | 5 | Tiên Tộc | Kiếm Tu | — |
| Cửu Thiên Thần Nữ | 5 | Tiên Tộc | Pháp Tu, Đan Tu | — |
| Hỗn Độn Ma Đế | 5 | Ma Tộc | Hộ Pháp | — |

## Mô hình & animation

| Tướng | Ngoại hình (LOOKS) | Vũ khí | Tỉ lệ | Preset animation | Đòn thường | Clip thi triển |
|---|---|---|---|---|---|---|
| Kiếm Đồng | `kiemdong` | sword | 0.95 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Thiết Vệ | `thietve` | spear | 1 | heavy | Attack01 → HeavyAttack → Attack02 → HeavyAttack | HeavyAttack |
| Hỏa Linh | `hoa` | staff | 0.95 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Thanh Mộc | `thanhmoc` | staff | 0.95 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Ma Binh | `mabinh` | blade | 0.98 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Linh Cung | `linhcung` | bow | 0.95 | archer | Attack01 → Attack02 → Attack01 → HeavyAttack | SkillCast |
| Thanh Phong Kiếm Khách | `thanhphong` | sword | 1 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Huyền Giáp Vệ | `huyengiap` | spear | 1.02 | heavy | Attack01 → HeavyAttack → Attack02 → HeavyAttack | HeavyAttack |
| Băng Linh Sư | `bangling` | staff | 1 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Huyết Ma | `huyetma` | claws | 1.02 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Lôi Thương | `loithuong` | spear | 1 | heavy | Attack01 → HeavyAttack → Attack02 → HeavyAttack | HeavyAttack |
| Linh Y | `linhy` | staff | 0.97 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Ngự Kiếm Chân Nhân | `ngukiem` | sword | 1.02 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Cửu Viêm Pháp Sư | `cuuviem` | staff | 1.02 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Kim Cang Hộ Pháp | `kimcuong` | spear | 1.04 | heavy | Attack01 → HeavyAttack → Attack02 → HeavyAttack | HeavyAttack |
| Ảnh Sát | `anhsat` | blade | 1 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Huyền Băng Tiên Tử | `huyenbang` | staff | 1.02 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Vô Cực Kiếm Tôn | `vocuc` | sword | 1.06 | melee | Attack01 → Attack02 → Attack03 → HeavyAttack | Attack03 |
| Thiên Lôi Đạo Nhân | `loiton` | staff | 1.06 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Bất Diệt Chiến Thần | `batdiet` | spear | 1.08 | heavy | Attack01 → HeavyAttack → Attack02 → HeavyAttack | HeavyAttack |
| U Minh Ma Quân | `umaquan` | staff | 1.06 | caster | Attack01 → Attack02 → Attack03 → HeavyAttack | SkillCast |
| Vạn Kiếm Tiên Đế | `kiemtien` | sword | 1.1 | ultimate | Attack01 → Attack02 → Attack03 → HeavyAttack | UltimateCast |
| Cửu Thiên Thần Nữ | `thannu` | staff | 1.1 | ultimate | Attack01 → Attack02 → Attack03 → HeavyAttack | UltimateCast |
| Hỗn Độn Ma Đế | `hondon` | claws | 1.12 | ultimate | Attack01 → Attack02 → Attack03 → HeavyAttack | UltimateCast |
