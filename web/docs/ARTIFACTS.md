# Pháp bảo V1.6 – 8 nguyên liệu · 36 công thức

> Sinh tự động bởi `node tools/gen-artifacts-doc.js` từ `js/data/artifacts.js`. Mô tả nội tại sinh từ đúng tham số mà `js/items/artifact-passives.js` dùng. validateArtifacts: không lỗi.

## Nguyên liệu

| ID | Icon | Nguyên liệu | Chỉ số | Mô tả |
|---|---|---|---|---|
| `sword` | 剑 | Linh Kiếm | +10 Công | Kiếm luyện từ linh thiết – tăng công. |
| `staff` | 杖 | Pháp Trượng | +10 Phép thuật | Trượng dẫn linh lực – tăng phép thuật. |
| `bow` | 弓 | Thần Cung | +10% Tốc đánh | Cung nhẹ như gió – tăng tốc đánh. |
| `armor` | 甲 | Huyền Giáp | +20 Giáp | Giáp huyền thiết – tăng giáp. |
| `cloak` | 袍 | Linh Bào | +20 Kháng phép | Áo bào dệt linh tơ – tăng kháng phép. |
| `crystal` | 晶 | Linh Tinh | +15 Năng lượng khởi đầu | Tinh thể tụ linh khí – thêm năng lượng khởi đầu. |
| `jade` | 玉 | Sinh Mệnh Ngọc | +150 Máu | Ngọc chứa sinh khí – tăng máu. |
| `glove` | 手 | Thiên Cơ Thủ | +10% Chí mạng | Găng tay thiên cơ – tăng chí mạng. |

Nguồn: vòng yêu thú (3, 7, 11…) – Yêu Lang 40% rơi khi hạ, Yêu Thú Vương chắc chắn; thắng vòng ít nhất 1; tối đa 3 / vòng; nhận đúng 1 lần mỗi vòng (lưu cùng ván). Linh thạch rơi không đổi.

## 36 công thức

Quy tắc chung: **chỉ số = nguyên liệu A + B (+ phần thêm)**, luôn cộng dồn khi mang nhiều bản. **Nội tại** (trừ loại chỉ số) chỉ áp **1 lần mỗi tướng** dù mang 2 bản cùng loại. Nội tại "đòn đánh" chỉ chạy với đòn đánh thường; sát thương do nội tại gây ra là sát thương phụ → không kích hoạt nội tại khác (không vòng lặp).

| # | A | B | Pháp bảo | ID | Chỉ số | Nội tại | Kích hoạt | Giới hạn / hồi chiêu | Kích hoạt sự kiện tiếp? | VFX (nhóm A) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Linh Kiếm | Linh Kiếm | **Tru Tiên Kiếm** | `tru_tien_kiem` | +20 Công | Mỗi 2 giây trong trận: +4% công (tối đa 10 lần = +40%). | Mỗi 2 giây trong trận | Tối đa 10 lần | Không | Kiếm khí, vệt chém, tia kim loại |
| 2 | Linh Kiếm | Pháp Trượng | **Pháp Kiếm Lôi Đình** | `phap_kiem_loi_dinh` | +10 Công · +10 Phép thuật | Mỗi đòn đánh thứ 3: sét gây 60% công sát thương phép lên mục tiêu và 1 kẻ địch gần nó (≤ 3 m). | Mỗi đòn đánh thứ 3 | 1 lần / 3 đòn | Không (sét là sát thương phụ) | Kiếm khí, vệt chém, tia kim loại |
| 3 | Linh Kiếm | Thần Cung | **Phong Ảnh Kiếm** | `phong_anh_kiem` | +10 Công · +10% Tốc đánh | Mỗi đòn đánh trúng: +4% tốc đánh, cộng dồn tối đa 8 lần (+32%) tới hết trận. | Đòn đánh trúng | Tối đa 8 lần cộng dồn / trận | Không | Kiếm khí, vệt chém, tia kim loại |
| 4 | Linh Kiếm | Huyền Giáp | **Phá Giáp Thần Kiếm** | `pha_giap_than_kiem` | +10 Công · +20 Giáp | Đòn đánh giảm 30% giáp của mục tiêu trong 4 giây. | Đòn đánh trúng | Không cộng dồn (lấy hiệu ứng mạnh nhất) | Không | Kiếm khí, vệt chém, tia kim loại |
| 5 | Linh Kiếm | Linh Bào | **Huyết Kiếm** | `huyet_kiem` | +10 Công · +20 Kháng phép · +15% Hút máu (đòn đánh) | Lần đầu máu dưới 40%: nhận lá chắn 25% máu tối đa trong 4 giây (1 lần mỗi trận). | Máu xuống dưới 40% | 1 lần / trận | Không | Kiếm khí, vệt chém, tia kim loại |
| 6 | Linh Kiếm | Linh Tinh | **Tụ Linh Kiếm** | `tu_linh_kiem` | +10 Công · +15 Năng lượng khởi đầu | Mỗi đòn đánh trúng: hồi thêm 4 năng lượng. | Đòn đánh trúng | Không vượt năng lượng tối đa | Có thể giúp tung kỹ năng sớm | Kiếm khí, vệt chém, tia kim loại |
| 7 | Linh Kiếm | Sinh Mệnh Ngọc | **Kiếm Hồn Ngọc** | `kiem_hon_ngoc` | +10 Công · +150 Máu · +12% Hút máu toàn phần | Chỉ số đặc biệt: +12% Hút máu toàn phần. | Luôn có | Chỉ số – cộng dồn khi mang nhiều bản | Không | Kiếm khí, vệt chém, tia kim loại |
| 8 | Linh Kiếm | Thiên Cơ Thủ | **Thiên Sát Kiếm** | `thien_sat_kiem` | +10 Công · +10% Chí mạng · +35% Sát thương chí mạng | Chỉ số đặc biệt: +35% Sát thương chí mạng. | Luôn có | Chỉ số – cộng dồn khi mang nhiều bản | Không | Kiếm khí, vệt chém, tia kim loại |
| 9 | Pháp Trượng | Pháp Trượng | **Cửu Thiên Pháp Trượng** | `cuu_thien_phap_truong` | +20 Phép thuật · +15% Sát thương kỹ năng | Chỉ số đặc biệt: +15% Sát thương kỹ năng. | Luôn có | Chỉ số – cộng dồn khi mang nhiều bản | Không | Pháp trận, hạt linh lực bay lên |
| 10 | Pháp Trượng | Thần Cung | **Phong Lôi Pháp Châu** | `phong_loi_phap_chau` | +10 Phép thuật · +10% Tốc đánh | Sau mỗi lần thi triển: +35% tốc đánh trong 4 giây (làm mới, không cộng dồn). | Sau khi thi triển | Làm mới thời gian, không cộng dồn | Không | Pháp trận, hạt linh lực bay lên |
| 11 | Pháp Trượng | Huyền Giáp | **Hỏa Linh Hộ Giáp** | `hoa_linh_ho_giap` | +10 Phép thuật · +20 Giáp | Mỗi 2 giây: thiêu đốt mọi kẻ địch trong 2.5 m (25% công mỗi 0,5 giây trong 3 giây, sát thương phép). | Mỗi 2 giây trong trận | Thiêu đốt làm mới, không cộng dồn | Không | Pháp trận, hạt linh lực bay lên |
| 12 | Pháp Trượng | Linh Bào | **Ngũ Hành Pháp Ấn** | `ngu_hanh_phap_an` | +20 Phép thuật · +20 Kháng phép | Kỹ năng giảm 40% kháng phép của mọi kẻ địch trúng chiêu trong 6 giây. | Kỹ năng trúng địch | Không cộng dồn (lấy hiệu ứng mạnh nhất) | Không | Pháp trận, hạt linh lực bay lên |
| 13 | Pháp Trượng | Linh Tinh | **Vạn Pháp Linh Tinh** | `van_phap_linh_tinh` | +10 Phép thuật · +15 Năng lượng khởi đầu | Sau mỗi lần thi triển: hồi 20 năng lượng. | Sau khi thi triển | 1 lần / lần thi triển | Có thể giúp tung kỹ năng sớm | Pháp trận, hạt linh lực bay lên |
| 14 | Pháp Trượng | Sinh Mệnh Ngọc | **Thanh Mộc Pháp Châu** | `thanh_moc_phap_chau` | +10 Phép thuật · +150 Máu | Khi thi triển: hồi 12% máu tối đa cho đồng minh đang yếu nhất (hồi chiêu 2 giây). | Khi thi triển | Hồi chiêu 2 giây | Không | Pháp trận, hạt linh lực bay lên |
| 15 | Pháp Trượng | Thiên Cơ Thủ | **Thiên Mệnh Pháp Ấn** | `thien_menh_phap_an` | +10 Phép thuật · +10% Chí mạng · +20% Sát thương chí mạng · +10% Sát thương kỹ năng | Chỉ số đặc biệt: +20% Sát thương chí mạng · +10% Sát thương kỹ năng. | Luôn có | Chỉ số – cộng dồn khi mang nhiều bản | Không | Pháp trận, hạt linh lực bay lên |
| 16 | Thần Cung | Thần Cung | **Phong Lôi Thần Cung** | `phong_loi_than_cung` | +20% Tốc đánh | Mỗi đòn đánh thứ 3: bắn thêm 1 tia vào kẻ địch khác gần nhất, gây 70% công. | Mỗi đòn đánh thứ 3 | 1 lần / 3 đòn | Không (tia phụ là sát thương phụ) | Vệt sáng tốc độ |
| 17 | Thần Cung | Huyền Giáp | **Hộ Thân Thần Cung** | `ho_than_than_cung` | +10% Tốc đánh · +20 Giáp | Đầu trận: lá chắn 15% máu tối đa trong 8 giây. | Đầu trận | 1 lần / trận | Không | Vệt sáng tốc độ |
| 18 | Thần Cung | Linh Bào | **Ảnh Phong Linh Bào** | `anh_phong_linh_bao` | +10% Tốc đánh · +20 Kháng phép | 4 giây đầu trận: giảm 50% sát thương nhận vào. | Đầu trận | 1 lần / trận | Không | Vệt sáng tốc độ |
| 19 | Thần Cung | Linh Tinh | **Tụ Linh Thần Cung** | `tu_linh_than_cung` | +10% Tốc đánh · +15 Năng lượng khởi đầu | Mỗi đòn đánh trúng: hồi thêm 3 năng lượng. | Đòn đánh trúng | Không vượt năng lượng tối đa | Có thể giúp tung kỹ năng sớm | Vệt sáng tốc độ |
| 20 | Thần Cung | Sinh Mệnh Ngọc | **Trường Sinh Thần Cung** | `truong_sinh_than_cung` | +10% Tốc đánh · +150 Máu | Mỗi đòn đánh trúng: hồi 2% máu tối đa. | Đòn đánh trúng | Không vượt máu tối đa | Không | Vệt sáng tốc độ |
| 21 | Thần Cung | Thiên Cơ Thủ | **Liên Kích Thủ Sáo** | `lien_kich_thu_sao` | +10% Tốc đánh · +10% Chí mạng | Mỗi đòn đánh chí mạng: +6% tốc đánh, cộng dồn tối đa 5 lần. | Chí mạng (đòn đánh) | Tối đa 5 lần cộng dồn / trận | Không | Vệt sáng tốc độ |
| 22 | Huyền Giáp | Huyền Giáp | **Bất Diệt Thần Giáp** | `bat_diet_than_giap` | +40 Giáp | Lần đầu nhận sát thương chí tử: giữ lại 1 máu và nhận lá chắn 30% máu tối đa trong 3 giây (1 lần mỗi trận). | Nhận đòn chí tử | 1 lần / trận | Không | Hạt khiên, sóng phòng ngự (Cao+) |
| 23 | Huyền Giáp | Linh Bào | **Huyền Thiên Hộ Phù** | `huyen_thien_ho_phu` | +20 Giáp · +20 Kháng phép | Đầu trận: bản thân và đồng minh đứng cạnh +15 giáp, +15 kháng phép cả trận (nhiều người mang không cộng dồn). | Đầu trận | Không cộng dồn giữa nhiều người mang | Không | Hạt khiên, sóng phòng ngự (Cao+) |
| 24 | Huyền Giáp | Linh Tinh | **Tụ Linh Bảo Giáp** | `tu_linh_bao_giap` | +20 Giáp · +15 Năng lượng khởi đầu | Khi nhận sát thương: hồi thêm 3 năng lượng (tối đa 1 lần mỗi 0.5 giây). | Nhận sát thương | Hồi chiêu 0.5 giây | Có thể giúp tung kỹ năng sớm | Hạt khiên, sóng phòng ngự (Cao+) |
| 25 | Huyền Giáp | Sinh Mệnh Ngọc | **Kim Cang Hộ Giáp** | `kim_cang_ho_giap` | +20 Giáp · +150 Máu | Đầu trận: lá chắn 25% máu tối đa trong 6 giây. | Đầu trận | 1 lần / trận | Không | Hạt khiên, sóng phòng ngự (Cao+) |
| 26 | Huyền Giáp | Thiên Cơ Thủ | **Phản Kích Chi Giáp** | `phan_kich_chi_giap` | +20 Giáp · +10% Chí mạng | Phản lại 20% sát thương đòn đánh thường nhận vào dưới dạng sát thương phép (phản đòn không kích hoạt phản đòn khác). | Nhận đòn đánh thường | Phản đòn không bị phản lại | Không (chặn vòng lặp) | Hạt khiên, sóng phòng ngự (Cao+) |
| 27 | Linh Bào | Linh Bào | **Huyền Linh Pháp Bào** | `huyen_linh_phap_bao` | +40 Kháng phép · +200 Máu | Lần đầu bị choáng / đóng băng: miễn hiệu ứng đó và miễn khống chế thêm 1 giây (1 lần mỗi trận). | Bị khống chế | 1 lần / trận | Không | Sương linh khí sát đất |
| 28 | Linh Bào | Linh Tinh | **Linh Khí Pháp Bào** | `linh_khi_phap_bao` | +20 Kháng phép · +15 Năng lượng khởi đầu | Đầu trận: bản thân và đồng minh đứng cạnh +15 năng lượng. | Đầu trận | 1 lần / trận / người mang | Có thể giúp tung kỹ năng sớm | Sương linh khí sát đất |
| 29 | Linh Bào | Sinh Mệnh Ngọc | **Băng Tâm Ngọc** | `bang_tam_ngoc` | +20 Kháng phép · +150 Máu | Mỗi giây hồi 1% máu tối đa. | Mỗi giây | Không vượt máu tối đa | Không | Sương linh khí sát đất |
| 30 | Linh Bào | Thiên Cơ Thủ | **U Minh Thủ Sáo** | `u_minh_thu_sao` | +20 Kháng phép · +10% Chí mạng | Đòn đánh lên mục tiêu dưới 30% máu: gây thêm 30% sát thương chuẩn. | Đòn đánh lên mục tiêu yếu | Mục tiêu dưới 30% máu | Không (sát thương phụ) | Sương linh khí sát đất |
| 31 | Linh Tinh | Linh Tinh | **Tụ Linh Châu** | `tu_linh_chau` | +30 Năng lượng khởi đầu | Mỗi giây hồi 2 năng lượng. | Mỗi giây | Không vượt năng lượng tối đa | Có thể giúp tung kỹ năng sớm | Năng lượng tụ lên, sóng tinh thể (Tối đa) |
| 32 | Linh Tinh | Sinh Mệnh Ngọc | **Sinh Mệnh Linh Châu** | `sinh_menh_linh_chau` | +15 Năng lượng khởi đầu · +150 Máu | Khi thi triển: hồi 10% máu tối đa cho bản thân và đồng minh gần nhất (hồi chiêu 2 giây). | Khi thi triển | Hồi chiêu 2 giây | Không | Năng lượng tụ lên, sóng tinh thể (Tối đa) |
| 33 | Linh Tinh | Thiên Cơ Thủ | **Thiên Cơ Linh Tinh** | `thien_co_linh_tinh` | +15 Năng lượng khởi đầu · +10% Chí mạng | Đòn đánh chí mạng: hồi 5 năng lượng (tối đa 1 lần mỗi 0.5 giây). | Chí mạng (đòn đánh) | Hồi chiêu 0.5 giây | Có thể giúp tung kỹ năng sớm | Năng lượng tụ lên, sóng tinh thể (Tối đa) |
| 34 | Sinh Mệnh Ngọc | Sinh Mệnh Ngọc | **Trường Sinh Ngọc** | `truong_sinh_ngoc` | +300 Máu | Khi máu dưới 50%: mỗi giây hồi 2% máu tối đa. | Mỗi giây khi máu thấp | Chỉ khi dưới 50% máu | Không | Ánh sáng hồi phục + pháp trận sen |
| 35 | Sinh Mệnh Ngọc | Thiên Cơ Thủ | **Hộ Tâm Bảo Ngọc** | `ho_tam_bao_ngoc` | +150 Máu · +10% Chí mạng | Lần đầu máu dưới 40%: nhận lá chắn 30% máu tối đa trong 4 giây (1 lần mỗi trận). | Máu xuống dưới 40% | 1 lần / trận | Không | Ánh sáng hồi phục + pháp trận sen |
| 36 | Thiên Cơ Thủ | Thiên Cơ Thủ | **Thiên Mệnh Thủ Sáo** | `thien_menh_thu_sao` | +20% Chí mạng | Mỗi đòn đánh chí mạng: +2% chí mạng, cộng dồn tối đa 10 lần (+20%). | Chí mạng (đòn đánh) | Tối đa 10 lần cộng dồn / trận | Không | Tia chớp chí mạng vàng |

## Ma trận ghép (hàng = A, cột = B, A + B = B + A)

| | 剑 Linh Kiếm | 杖 Pháp Trượng | 弓 Thần Cung | 甲 Huyền Giáp | 袍 Linh Bào | 晶 Linh Tinh | 玉 Sinh Mệnh Ngọc | 手 Thiên Cơ Thủ |
|---|---|---|---|---|---|---|---|---|
| **剑 Linh Kiếm** | Tru Tiên Kiếm | Pháp Kiếm Lôi Đình | Phong Ảnh Kiếm | Phá Giáp Thần Kiếm | Huyết Kiếm | Tụ Linh Kiếm | Kiếm Hồn Ngọc | Thiên Sát Kiếm |
| **杖 Pháp Trượng** | Pháp Kiếm Lôi Đình | Cửu Thiên Pháp Trượng | Phong Lôi Pháp Châu | Hỏa Linh Hộ Giáp | Ngũ Hành Pháp Ấn | Vạn Pháp Linh Tinh | Thanh Mộc Pháp Châu | Thiên Mệnh Pháp Ấn |
| **弓 Thần Cung** | Phong Ảnh Kiếm | Phong Lôi Pháp Châu | Phong Lôi Thần Cung | Hộ Thân Thần Cung | Ảnh Phong Linh Bào | Tụ Linh Thần Cung | Trường Sinh Thần Cung | Liên Kích Thủ Sáo |
| **甲 Huyền Giáp** | Phá Giáp Thần Kiếm | Hỏa Linh Hộ Giáp | Hộ Thân Thần Cung | Bất Diệt Thần Giáp | Huyền Thiên Hộ Phù | Tụ Linh Bảo Giáp | Kim Cang Hộ Giáp | Phản Kích Chi Giáp |
| **袍 Linh Bào** | Huyết Kiếm | Ngũ Hành Pháp Ấn | Ảnh Phong Linh Bào | Huyền Thiên Hộ Phù | Huyền Linh Pháp Bào | Linh Khí Pháp Bào | Băng Tâm Ngọc | U Minh Thủ Sáo |
| **晶 Linh Tinh** | Tụ Linh Kiếm | Vạn Pháp Linh Tinh | Tụ Linh Thần Cung | Tụ Linh Bảo Giáp | Linh Khí Pháp Bào | Tụ Linh Châu | Sinh Mệnh Linh Châu | Thiên Cơ Linh Tinh |
| **玉 Sinh Mệnh Ngọc** | Kiếm Hồn Ngọc | Thanh Mộc Pháp Châu | Trường Sinh Thần Cung | Kim Cang Hộ Giáp | Băng Tâm Ngọc | Sinh Mệnh Linh Châu | Trường Sinh Ngọc | Hộ Tâm Bảo Ngọc |
| **手 Thiên Cơ Thủ** | Thiên Sát Kiếm | Thiên Mệnh Pháp Ấn | Liên Kích Thủ Sáo | Phản Kích Chi Giáp | U Minh Thủ Sáo | Thiên Cơ Linh Tinh | Hộ Tâm Bảo Ngọc | Thiên Mệnh Thủ Sáo |

## Trang bị cũ (V1.0–V1.5) khi tải bản lưu

Bản lưu v2 trở về trước: 6 trang bị cũ (trong túi và đang gắn trên tướng) được đổi thành nguyên liệu tương ứng và đưa vào kho (Thanh Phong Kiếm → Linh Kiếm, Huyền Thiết Giáp → Huyền Giáp, Tụ Linh Châu → Linh Tinh, Hộ Mệnh Phù → Linh Bào, Phong Hành Ngoa → Thần Cung, Huyết Ngọc → Sinh Mệnh Ngọc). Bản gốc được sao lưu ở `vkkt_save_backup_v2` trước khi ghi bản v3.
