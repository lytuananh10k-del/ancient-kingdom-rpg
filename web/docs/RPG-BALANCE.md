# Cân bằng tiến trình – mô phỏng tự chơi (số đo thật)

Sinh bởi `tests/rpg-balance.js` lúc 2026-10-29T07:38:49.588Z · mỗi tông môn 300 phút thời gian game, 1 lần chạy (có ngẫu nhiên → số liệu dao động giữa các lần chạy).
Người chơi tự động dùng chiến thuật cố định (đánh quái gần nhất, kỹ năng khi hết hồi chiêu, chia linh căn công/máu/giáp, mua trang bị Linh Thương) – người chơi thật có thể nhanh / chậm hơn. Không tính thời gian đi bộ giữa bản đồ, nói chuyện NPC, nhiệm vụ.

| Tông môn | Cảnh giới sau 300 phút | Trúc Cơ (phút) | Kim Đan (phút) | Nguyên Anh (phút) | Hóa Thần (phút) | Quái hạ | Tử trận | Boss |
|---|---|---|---|---|---|---|---|---|
| Kiếm Tông | Luyện Hư tầng 1 | 11.5 | 28 | 68.5 | 128 | 5686 | 75 | 19 |
| Pháp Tông | Hóa Thần tầng 8 | 8 | 26.5 | 87 | 163.5 | 5167 | 52 | 2 |
| Võ Tông | Hóa Thần tầng 9 | 5.5 | 23 | 62 | 130.5 | 4679 | 101 | 17 |

## Theo bản đồ

| Tông môn | Bản đồ | Phút ở bản đồ | Tu vi / phút | Quái / phút |
|---|---|---|---|---|
| Kiếm Tông | A1 | 11.5 | 268 | 19.4 |
| Kiếm Tông | A2 | 16.5 | 1649 | 18.4 |
| Kiếm Tông | A3 | 40.5 | 4213 | 13.4 |
| Kiếm Tông | D1 | 59.5 | 13480 | 18.2 |
| Kiếm Tông | D2 | 172 | 27166 | 20.6 |
| Pháp Tông | B1 | 8 | 389 | 18.9 |
| Pháp Tông | B2 | 18.5 | 1466 | 15.7 |
| Pháp Tông | B3 | 60.5 | 2820 | 13.2 |
| Pháp Tông | D1 | 76.5 | 10510 | 17.3 |
| Pháp Tông | D2 | 136.5 | 23258 | 19.1 |
| Võ Tông | C1 | 5.5 | 559 | 19.8 |
| Võ Tông | C2 | 17.5 | 1582 | 17.6 |
| Võ Tông | C3 | 39 | 4641 | 11.9 |
| Võ Tông | D1 | 68.5 | 11556 | 16 |
| Võ Tông | D2 | 169.5 | 23013 | 15.9 |

## Chỉ số cuối

| Tông môn | Công | Sinh lực | Giáp | Chí mạng | Kỹ năng |
|---|---|---|---|---|---|
| Kiếm Tông | 3957 | 43098 | 402 | 15% | kiem_basic 4, kiem_khi 4, kiem_lien 4, kiem_ngu 4, kiem_van 4 |
| Pháp Tông | 2990 | 30378 | 256 | 8% | phap_basic 4, phap_bang 4, phap_hoa 4, phap_moc 4, phap_loi 4 |
| Võ Tông | 3216 | 33779 | 302 | 8% | vo_basic 4, vo_thuong 4, vo_phadia 4, vo_kimcang 4, vo_kimthan 4 |
