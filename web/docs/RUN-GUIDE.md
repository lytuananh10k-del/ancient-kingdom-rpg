# Hướng dẫn chạy – Android / Windows (V1.6)

## 1. Cách chạy

| Cách | Làm gì | Ghi chú |
|---|---|---|
| **Một tệp duy nhất** | Mở `dist/Van_Kiem_Ky_Tran_V1.6.html` bằng Chrome / Edge (Windows) hoặc Chrome Android | Đã nhúng sẵn three.js r128 + toàn bộ mã game → chạy **không cần mạng** (chỉ phông chữ Google cần mạng; mất mạng thì dùng phông hệ thống). Tạo lại: `cd web && npm run build` |
| Thư mục nguồn | Phục vụ thư mục `web/` bằng máy chủ tĩnh bất kỳ (`npx http-server web`, `python -m http.server`) rồi mở `index.html` | `index.html` là phần thân (dùng cho Artifact); trình duyệt vẫn hiển thị đúng. three.js tải từ CDN |
| Artifact | Mở liên kết Artifact đã xuất bản | Cần mạng |

Android: mở tệp HTML từ trình quản lý tệp → chọn Chrome. Nên **xoay ngang** (giao diện ưu tiên màn ngang; màn dọc vẫn chơi được). Thêm vào màn hình chính (menu Chrome → *Thêm vào màn hình chính*) để chạy toàn màn hình.

## 2. Điều khiển

| | Android (cảm ứng) | Windows (chuột / bàn phím) |
|---|---|---|
| Mua tướng | Chạm thẻ cửa hàng | Nhấp thẻ |
| Xếp tướng | Giữ và kéo tướng giữa hàng chờ ↔ bàn (rung nhẹ khi nhấc / thả – tắt trong Cài đặt) | Kéo thả chuột |
| Bán | Kéo tướng vào cửa hàng | Kéo vào cửa hàng |
| Xem thông tin | Chạm tướng / giữ lâu thẻ | Nhấp / nhấp phải thẻ |
| Xoay camera | Kéo một ngón trên chỗ trống | Kéo chuột trên chỗ trống |
| Thu phóng | Chụm / mở hai ngón | Con lăn chuột |
| Phím tắt | – | Space: giao chiến / vòng tiếp · D: làm mới · F: mua kinh nghiệm · U: Vạn Kiếm · P: tạm dừng · Esc: đóng menu |
| Kho pháp bảo (V1.6) | Nút **法 n/10** bên phải: chạm 2 nguyên liệu → **Ghép**; chạm pháp bảo → chạm tướng để trang bị; nhấn giữ ô xem chi tiết | Kéo nguyên liệu lên nguyên liệu → **Ghép**; kéo pháp bảo lên tướng; rê chuột xem tooltip / chỉ số trước → sau |
| 3 ô pháp bảo | Chạm tướng → bảng thông tin: chạm ô → chạm tướng khác để chuyển, ↩ tháo về kho | Như Android |
| Bảng Debug (nhà phát triển) | Chạm nhanh **5 lần** vào ô FPS | **Ctrl+Shift+D**, hoặc thêm `?debug=1` vào địa chỉ |

## 3. Đồ hoạ và hiệu năng

* 4 mức **Thấp / Vừa / Cao / Tối đa** (☰ Menu → Cài đặt). Mặc định: điện thoại = Vừa, máy tính = Cao.
* **Tự giảm đồ hoạ**: FPS trung bình < 38 kéo dài 4 giây → hạ một mức (có thông báo), chờ 10 giây giữa hai lần hạ. Tắt được trong Cài đặt.
* **Giới hạn tỉ lệ điểm ảnh (DPR)**: Thấp 0,75 · Vừa 1,0 · Cao 1,5 · Tối đa 2,0 (không bao giờ vượt DPR thật của màn hình). Điện thoại DPR 3 ở mức Vừa chỉ vẽ ⅑ số điểm ảnh so với DPR gốc → mát máy hơn.
* Mức đồ hoạ **chỉ đổi cách vẽ** (độ phân giải, bloom, bóng, viền, số hạt, số phi kiếm hiển thị); **không** đổi sát thương, tầm đánh, thời điểm trúng đòn, chọn mục tiêu hay kết quả trận (logic chạy bước cố định 60 Hz, kiểm thử bằng seed – tests/combat3.js).
* **Rời ứng dụng / tắt màn hình** → trận và đồng hồ chuẩn bị tự tạm dừng (không thua oan, không chạy ngầm làm nóng máy). Quay lại: ☰ Menu → Tiếp tục.
* **Mất ngữ cảnh WebGL** (Android thu hồi GPU khi thiếu bộ nhớ) → game dừng vẽ và tạm dừng, tự dựng lại đồ hoạ khi trình duyệt khôi phục; ván không mất.
* Kiểm tra nhanh trên máy: ☰ Menu → Cài đặt → **Chạy kiểm tra 15 giây** (5v5, tuyệt kỹ liên tục) → FPS TB, 1% thấp nhất, draw call, đề xuất mức đồ hoạ. Bảng Debug hiện FPS, thời gian cập nhật / render, draw call, tam giác, hạt, đạn, trạng thái, geometry / texture, heap.

## 4. Bản lưu

* Tự lưu khi mua / bán / xếp tướng và khi sang vòng (không lưu mỗi khung hình). Lưu: vòng, máu, linh thạch, cấp, kinh nghiệm, chuỗi, tướng trên bàn (sao, vị trí, trang bị), hàng chờ, cửa hàng, kho trang bị, bể tướng của đối thủ ảo.
* Tùy chọn đồ hoạ / âm thanh / đếm giờ lưu riêng → đổi ván hay bản lưu hỏng không mất cài đặt.
* Bản lưu có phiên bản (hiện tại v2) và tự chuyển từ v1. Bản lưu hỏng hoặc của phiên bản mới hơn **không bị xoá**: được chép sang `vkkt_save_backup` rồi mới vào ván mới.
* Xoá dữ liệu trang web (cài đặt trình duyệt) sẽ xoá bản lưu.

## 5. Kiểm thử thủ công trên thiết bị thật (CHƯA THỰC HIỆN – cần làm)

Mọi số liệu FPS trong docs/PERF.md đo trên **Chromium headless + SwiftShader (WebGL bằng CPU)**, không có GPU và không có thiết bị thật. Các mục tiêu 30 FPS (Android tầm trung, mức Vừa) và 60 FPS (Windows, mức Cao) **chưa được xác nhận**. Quy trình đề nghị:

1. **Chuẩn bị**: sạc > 50 %, tắt chế độ tiết kiệm pin, đóng ứng dụng khác. Ghi lại: tên máy, chip, RAM, phiên bản Android / Windows, trình duyệt.
2. **Đo chuẩn**: mở game → ☰ → Cài đặt → tắt *Tự giảm đồ hoạ* → chọn từng mức Thấp / Vừa / Cao / Tối đa → **Chạy kiểm tra 15 giây** → bấm *Sao chép kết quả* và lưu lại (FPS TB, 1% thấp, draw call, tam giác, GPU).
3. **Bảng Debug** (chạm 5 lần ô FPS / Ctrl+Shift+D): bấm *Trận thử* ở mức Vừa và Tối đa, theo dõi FPS và *cập nhật / render ms* trong cả trận; bấm *Xuất báo cáo* để lấy JSON.
4. **Chơi liên tục 20 vòng** ở mức mặc định: ghi FPS thấp nhất thấy được, máy có nóng / giật / tụt mức đồ hoạ tự động không, có lỗi hiển thị không.
5. **Cảm ứng (Android)**: kéo tướng chính xác vào từng ô (cả 4 góc bàn), kéo vào cửa hàng để bán, chạm thẻ nhanh liên tục, chụm hai ngón thu phóng, xoay ngang ↔ dọc khi đang kéo.
6. **Vòng đời**: đang giao tranh → về màn hình chính 30 giây → quay lại (phải đang tạm dừng, không mất ván); tắt màn hình → mở lại; nhận cuộc gọi giữa trận.
7. **Windows**: đổi kích thước cửa sổ khi đang chơi, phóng to / thu nhỏ trình duyệt (Ctrl + / −), màn 1366×768, 1920×1080, 2560×1440, 4K; con lăn chuột thu phóng; phím tắt.
8. **Bản lưu**: chơi tới vòng 5 → đóng tab → mở lại (*Tiếp tục – Vòng 5*); xoá cache trình duyệt khi đang mở game không làm treo.
9. **Nhiệt độ**: chơi 15 phút ở mức Vừa, ghi nhận nhiệt độ máy (nóng nhẹ chấp nhận được; nếu nóng nhiều → dùng mức Thấp, kiểm tra FPS / pin tụt).

Gửi kết quả (bản sao chép kiểm tra 15 giây + JSON Debug) để hiệu chỉnh mặc định mức đồ hoạ theo máy.

## 6. Kiểm thử tự động (máy phát triển)

```
cd web && npm install
npm test                 # chơi thử 12 vòng bằng chuột (ROUNDS=20 cho 20 vòng)
npm run test:portrait    # màn dọc + cảm ứng
npm run test:combat · test:economy · test:champions · test:traits · test:combat3
npm run test:audit       # 15 kiểm tra × 24 tướng → docs/QA-CHAMPIONS.md
npm run test:equipment   # pháp bảo: EquipmentTestRunner + giao diện chuột / cảm ứng (V1.6)
npm run artifact-balance # giá trị biên 36 pháp bảo → docs/ARTIFACT-BALANCE.md
npm run test:save        # bản lưu: phiên bản, hỏng, thiếu trường, Debug không ghi đè
npm run test:memory      # rò rỉ geometry / texture / listener / đối tượng sau trận, ván mới, đổi đồ hoạ, thay GLB
npm run balance          # bảng cân bằng theo bậc / vai trò
npm run simulate         # BalanceSimulator 1200 trận (N=…, SEED=…) → docs/BALANCE-SIM.md + CSV / JSON
npm run perf             # 7 kịch bản hiệu năng (TAG=before|after) → docs/reports/perf-*.json; node tools/perf-report.js → docs/PERF-DATA.md
npm run build            # tạo dist/Van_Kiem_Ky_Tran_V1.6.html
```
Cần Chromium cho Playwright (biến `THREE_DIR` trỏ tới gói three@0.128.0 nếu không có mạng tới CDN).
