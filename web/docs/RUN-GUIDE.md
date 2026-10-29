# Hướng dẫn chạy & chơi – Android / Windows (Phiêu Lưu V2.0)

## 1. Cách chạy

| Cách | Làm gì | Ghi chú |
|---|---|---|
| **Một tệp duy nhất** | Mở `dist/Van_Kiem_Ky_Tran_Phieu_Luu_V2.0.html` bằng Chrome / Edge (Windows) hoặc Chrome Android | Đã nhúng three.js r128 + toàn bộ mã → chạy **không cần mạng** (chỉ phông chữ Google cần mạng; mất mạng thì dùng phông hệ thống). Tạo lại: `cd web && npm run build` |
| Thư mục nguồn | Phục vụ thư mục `web/` bằng máy chủ tĩnh (`npx serve web`, `python -m http.server`) rồi mở `index.html` | three.js tải từ CDN |
| Artifact | Mở liên kết Artifact đã xuất bản | Cần mạng |

Android: mở tệp HTML bằng Chrome, **xoay ngang** cho dễ chơi (màn dọc vẫn chơi được – bố cục riêng). Menu Chrome → *Thêm vào màn hình chính* để chạy toàn màn hình.

## 2. Điều khiển

| Thao tác | Windows (bàn phím / chuột) | Android (cảm ứng) |
|---|---|---|
| Chạy trái / phải | A / D hoặc ← / → | Cần ảo bên trái |
| Nhảy | Space / W / ↑ | Nút ⇑ (hoặc đẩy cần ảo lên) |
| **Bay** | Nhấn nhảy lần 2 khi đang trên không; giữ ↑ / ↓ để lên xuống; bay tốn linh lực | Nhấn ⇑ lần 2 trên không; cần ảo lên / xuống |
| Hạ xuống / xuống khỏi bục | S / ↓ | Nút ⇓ (giữ) hoặc kéo cần ảo xuống |
| Đánh thường | J (giữ để đánh liên tục; có mục tiêu ngoài tầm thì tự tiến tới) | Nút ⚔ (giữ) |
| 4 kỹ năng | K, L, U, I (hoặc 1–4) | 4 nút quanh nút ⚔ (hiện hồi chiêu, viền xanh = thiếu linh lực) |
| Chọn mục tiêu | Nhấp vào quái · Tab đổi mục tiêu | Chạm vào quái · nút ◎ |
| Nói chuyện / thu hoạch | E (hoặc F, Enter) khi đứng cạnh NPC; hoặc nhấp NPC | Nút "Nói chuyện" hiện khi đứng cạnh; hoặc chạm NPC |
| Dùng đan | H (hoặc Q) – ưu tiên linh đan | Nút 丹 |
| Bảng | B túi đồ · N nhân vật · O kỹ năng · T nhiệm vụ · M bản đồ · ☰ menu · Esc đóng · P tạm dừng | Các nút góc trên phải |
| Debug (nhà phát triển) | Ctrl+Shift+D hoặc `?debug=1` | Chạm nhanh 5 lần vào ô FPS |

## 3. Bắt đầu chơi

1. **Tạo nhân vật**: chọn tông môn, ngoại hình (6 / tông môn – lấy từ 24 tướng), đặt đạo hiệu → *Bái nhập tông môn*.
2. Ở sơn môn: nói chuyện với **Sư Phụ** (dấu **!**) → nhiệm vụ đầu tiên. Đi sang phải qua **cổng sáng** để xuống núi.
3. Đánh quái → nhận **tu vi** (lên cảnh giới) và **linh căn** (mở bảng Nhân vật, phím N, để nâng chỉ số). Quái rơi linh thạch, đan dược, nguyên liệu, trang bị; tự hút khi lại gần.
4. Về sơn môn: **Linh Đan Thụ** kết linh đan theo thời gian thật (kể cả khi tắt game) – thu hoạch để có đan hồi phục; **Sư Phụ** dạy kỹ năng; **Luyện Khí Sư** ghép 2 nguyên liệu thành pháp bảo và cường hoá; **Linh Thương** bán đan / trang bị; **Truyền Tống Sứ** đưa tới tông môn khác và Ma Vực.
5. **Boss** xuất hiện theo giờ ở bản đồ cuối mỗi vùng (bản đồ thế giới – phím M – có đồng hồ). Người chơi ảo sẽ tới đánh cùng; nếu bạn không tới, "đồng đạo" sẽ hạ boss sau một lúc.
6. **Long Châu**: 7 viên rơi ngẫu nhiên (boss thường xuyên, quái rất hiếm). Đủ 7 → Tế Đàn ở sơn môn → Thần Long → chọn 1 trong 5 điều ước.
7. Tử trận không mất tu vi: về sơn môn miễn phí, hoặc hồi sinh tại chỗ (Hoàn Hồn Phù / 1 tiên ngọc).

## 4. Đồ hoạ, hiệu năng, bản lưu

* ☰ Menu → 4 mức **Thấp / Vừa / Cao / Tối đa** (mặc định: điện thoại = Vừa, máy tính = Cao); tự giảm mức khi FPS < 38 kéo dài 4 giây (tắt được). Mức đồ hoạ chỉ đổi cách vẽ (độ phân giải, bloom, bóng, viền, số hạt) – không đổi lối chơi.
* Ẩn ứng dụng / tắt màn hình → game tạm dừng và lưu; mất ngữ cảnh WebGL → dừng vẽ, tự dựng lại khi trình duyệt khôi phục.
* **Tự lưu**: khi đổi bản đồ, nhặt / dùng đồ, nhiệm vụ, mỗi 30 giây và khi rời trang. Khoá `vkkt_rpg_save` (KHÔNG ghi đè bản lưu cờ cũ `vkkt_save`). Bản lưu hỏng / của phiên bản mới hơn được sao lưu nguyên văn sang `vkkt_rpg_save_backup` trước khi tạo nhân vật mới; *Xoá nhân vật* giữ bản cũ ở `vkkt_rpg_save_prev`.
* Xoá dữ liệu trang web trong trình duyệt sẽ xoá bản lưu.

## 5. Kiểm thử trên thiết bị thật (CHƯA THỰC HIỆN – cần làm)

Mọi số liệu FPS trong [RPG-PERF.md](RPG-PERF.md) đo trên **Chromium headless + SwiftShader (WebGL bằng CPU, không GPU)**; kiểm thử cảm ứng là **giả lập** Playwright. Chưa thử trên điện thoại / máy tính thật. Quy trình đề nghị:

1. Ghi lại tên máy, chip, RAM, phiên bản Android / Windows, trình duyệt.
2. Bảng Debug (chạm 5 lần ô FPS / Ctrl+Shift+D): xem FPS, thời gian cập nhật / render, draw call ở sơn môn, bản đồ 1, khi đánh boss + Vạn Kiếm Quy Tông, ở Hỗn Độn Hư Không – lần lượt mức Thấp / Vừa / Cao.
3. Cảm ứng: kéo cần ảo chạy trái phải, nhảy + bay, giữ nút đánh, bấm liên tục 4 nút kỹ năng, chạm chọn quái, nói chuyện NPC, mở / cuộn các bảng; xoay ngang ↔ dọc khi đang chơi.
4. Windows: đổi kích thước cửa sổ, phóng to / thu nhỏ (Ctrl + / −), 1366×768, 1920×1080, 2560×1440; giữ nhiều phím cùng lúc (chạy + nhảy + đánh).
5. Vòng đời: đang đánh boss → về màn hình chính 30 giây → quay lại (phải tạm dừng, không mất tiến trình); tắt game rồi mở lại sau 10 phút (Linh Đan Thụ phải có thêm linh đan).
6. Chơi liên tục 20–30 phút ở mức mặc định: ghi FPS thấp nhất, nhiệt độ máy, có tụt mức đồ hoạ tự động không.

Gửi lại kết quả để hiệu chỉnh mức đồ hoạ mặc định và kích thước nút.
