# Vạn Kiếm Kỳ Trận – Phiêu Lưu (V2.0, HTML5 / Three.js)

Nhập vai hành động tu tiên **3D màn ngang** (2.5D) chạy trên trình duyệt – Android (Chrome), Windows (Chrome / Edge).
Lối chơi theo kiểu game nhập vai màn ngang trực tuyến quen thuộc (chạy, nhảy, **bay**, đánh quái lấy tu vi, nâng chỉ số bằng điểm tiềm năng,
đậu hồi phục mọc trên cây, gom 7 viên ngọc rồng để ước) nhưng **chơi đơn ngoại tuyến**, chủ đề tu tiên riêng: không dùng tên nhân vật,
tên chiêu hay hình ảnh của bất kỳ trò chơi / truyện có bản quyền nào.

Từ V2.0 game **thay hẳn** lối chơi cờ nhân phẩm (auto chess) của V1.0–V1.6. Bản cờ vẫn còn nguyên trong lịch sử git
(commit `acfbafe`, tag cục bộ `v1.6-autochess`) và bản 1 tệp `dist/Van_Kiem_Ky_Tran_V1.6.html`.

## Chạy

| Cách | Làm gì |
|---|---|
| **1 tệp, không cần mạng** | Mở `dist/Van_Kiem_Ky_Tran_Phieu_Luu_V2.0.html` bằng Chrome / Edge. Đã nhúng three.js r128 + toàn bộ mã. Tạo lại: `npm run build` |
| Thư mục nguồn | Phục vụ `web/` bằng máy chủ tĩnh (`npx serve web`) rồi mở `index.html` (three.js tải từ CDN) |
| Artifact | Mở liên kết Artifact đã xuất bản (cần mạng) |

Hướng dẫn chi tiết + điều khiển: [docs/RUN-GUIDE.md](docs/RUN-GUIDE.md). Báo cáo phiên bản: [docs/V2.0-REPORT.md](docs/V2.0-REPORT.md).
Bảng dữ liệu (sinh từ mã): [docs/GAME-DATA.md](docs/GAME-DATA.md).

## Nội dung chính

* **3 tông môn**: Thanh Vân Kiếm Tông (kiếm, cận chiến), Đan Hà Pháp Tông (pháp, đánh xa, hồi phục), Bất Diệt Võ Tông (thể tu, khiên, biến thân).
  Ngoại hình chọn từ 24 tướng của bản cờ (6 / tông môn).
* **Cảnh giới** Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa (9 tầng mỗi cảnh giới) thay cho "sức mạnh";
  **linh căn** thay cho "tiềm năng" (nâng sinh lực, linh lực, sức đánh, giáp, chí mạng).
* **14 bản đồ** nối nhau qua cổng ở hai mép: 3 sơn môn, 9 bản đồ vùng tông môn, 2 bản đồ Ma Vực (cần Nguyên Anh); địa hình gồ ghề, bục nổi, biome riêng.
* **15 kỹ năng** (5 / tông môn, cấp 1–7) – gồm Vạn Kiếm Quy Tông, Cửu Thiên Lôi Kiếp, Bất Diệt Kim Thân (biến thân).
* **23 loại quái + 5 boss** (8 mô hình thú thủ tục mới + quái hình người dùng lại rig nhân vật); boss xuất hiện theo giờ, có thông báo, nhiều chiêu, triệu hồi lâu la.
* NPC sơn môn: Sư Phụ (nhiệm vụ, học kỹ năng, trừ yêu), Linh Thương, Luyện Khí Sư (36 pháp bảo – công thức của bản cờ, cường hoá +7),
  Truyền Tống Sứ, **Linh Đan Thụ** (kết linh đan theo thời gian thật, kể cả khi tắt game), **Tế Đàn Long Châu** (7 viên → Thần Long → 1 điều ước).
* 15 nhiệm vụ chính tuyến + trừ yêu lặp lại; **người chơi ảo** đi lại, đánh quái, rủ đánh boss, chat thế giới (mô phỏng, không có mạng).
* Điều khiển: bàn phím (Windows) + cần ảo / nút ảo (Android); chạm quái để chọn mục tiêu. Tự lưu (localStorage, khoá `vkkt_rpg_save`).

## Mã nguồn

Script thường (không phải ES module), dùng chung phạm vi toàn cục, nạp đúng thứ tự trong `index.html`.

| File | Nội dung |
|---|---|
| `js/01-core.js` … `js/08-audio.js` | **Engine dùng lại từ bản cờ**: tiện ích + `store` + QualityManager (4 mức), ShaderLibrary (toon, viền, tan biến, trời – thêm màu theo vùng), renderer + bloom, VFX (hạt, dải sáng, pháp trận, sóng, kiếm khí), CharacterRig (nhân vật thủ tục gộp lưới, IK chân, tóc / váy vật lý), AnimationStateMachine / SkillTimeline, âm thanh WebAudio |
| `js/data/champions.js`, `js/data/artifacts.js` | Dữ liệu dùng lại: ngoại hình 24 tướng + phe địch; 8 nguyên liệu, 36 pháp bảo, công thức, 29 loại nội tại |
| `js/rpg/data.js` | Dữ liệu phiêu lưu: tông môn, cảnh giới, kỹ năng, linh căn, quái, biome, bản đồ, NPC, trang bị, đan dược, điều ước, nhiệm vụ, người chơi ảo |
| `js/rpg/world.js` | Thế giới màn ngang: địa hình theo hạt giống, bục nổi một chiều, cảnh nền nhiều lớp, cảnh vật InstancedMesh, cổng, công trình sơn môn, Linh Đan Thụ, Tế Đàn |
| `js/rpg/actors.js` | `HumanModel` (bọc CharacterRig), `BeastModel` (8 mô hình thú thủ tục), `Actor` (vật lý chạy / nhảy / bay / bục, trạng thái) |
| `js/rpg/combat.js` | Sát thương (chí mạng, giáp, khiên, giảm sát thương, hút máu), choáng / chậm, đạn bay, tia sét, vật phẩm rơi + nhặt, số nổi, hẹn giờ theo đồng hồ game |
| `js/rpg/skills.js` | Thi triển 15 kỹ năng (combo, đạn, kiếm khí xuyên, lướt chém, phi kiếm, mưa kiếm InstancedMesh, hỏa trận, hồi phục, thiên lôi, dậm đất, khiên, biến thân) |
| `js/rpg/player.js` | Trạng thái lưu `G`, `Player`: chỉ số, điều khiển, tu vi / linh căn, đột phá, tử trận / hồi sinh |
| `js/rpg/monsters.js` | `Monster` (AI tuần tra / đuổi / đánh / bắn / bay / quay về), `Boss` (5 chiêu + triệu hồi), `BossClock` (xuất hiện theo giờ) |
| `js/rpg/npcs.js` | NPC, người chơi ảo (`Bot`, `Bots`), kênh chat |
| `js/rpg/items.js` | Túi đồ, trang bị, nội tại pháp bảo (luật phiêu lưu), phần thưởng hạ quái, luyện khí, cường hoá, Linh Thương, Linh Đan Thụ, Thần Long |
| `js/rpg/quests.js` | Nhiệm vụ chính tuyến, chỉ đường, trừ yêu, gợi ý lần đầu |
| `js/rpg/save.js` | Bản lưu có phiên bản + làm sạch từng trường, sao lưu bản hỏng |
| `js/rpg/input.js` | Camera màn ngang, bàn phím, cần ảo + nút ảo (Pointer Events), chạm chọn mục tiêu |
| `js/rpg/ui.js` | HUD, bảng (túi, nhân vật, kỹ năng, nhiệm vụ, bản đồ, menu, NPC, luyện khí, cửa hàng, tử trận, điều ước), lớp 2D (tên, thanh máu, số sát thương, chỉ đường) |
| `js/rpg/main.js` | Luồng game, tạo nhân vật, chuyển bản đồ, vòng lặp 60 Hz cố định, vòng đời ứng dụng, móc kiểm thử `window.__vkkt` |
| `js/rpg/debug.js` | Bảng Debug (`?debug=1`, Ctrl+Shift+D, chạm 5 lần ô FPS) |

## Kiểm thử (Chromium headless + Playwright)

```
cd web && npm install          # playwright + three@0.128.0 (three.js thay CDN khi kiểm thử)
npm test                       # lối chơi đầy đủ, Kiếm Tông (SECT=phap / vo hoặc npm run test:phap / test:vo)
npm run test:touch             # cảm ứng giả lập + bố cục màn ngang / dọc
npm run rpg-balance            # người chơi tự động 3 tông môn → docs/RPG-BALANCE.md (MIN=phút game)
npm run perf                   # 4 kịch bản × 3 mức đồ hoạ → docs/RPG-PERF.md (SwiftShader – xem lưu ý trong tệp)
npm run build && npm run test:dist   # bản 1 tệp chạy không mạng
node tests/rpg-shots.js        # ảnh chụp giao diện → docs/shots/
node tools/gen-rpg-docs.js     # docs/GAME-DATA.md từ dữ liệu
```
Không có Chromium cho Playwright / không có mạng tới CDN: đặt `THREE_DIR` trỏ tới gói three@0.128.0.
