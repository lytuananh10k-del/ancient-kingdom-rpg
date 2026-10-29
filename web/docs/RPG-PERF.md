# Hiệu năng Phiêu Lưu – số đo thật trên máy kiểm thử

Sinh bởi `tests/rpg-perf.js` lúc 2026-10-29T07:40:16.531Z · màn 1280x720 · renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.

**Quan trọng:** máy kiểm thử là Chromium headless với **SwiftShader – WebGL chạy hoàn toàn bằng CPU, không có GPU**. FPS dưới đây vì thế thấp hơn rất nhiều so với điện thoại / máy tính thật có GPU và **không** dùng để kết luận game đạt 30 / 60 FPS trên thiết bị thật. Dùng để so sánh tương đối (kịch bản nặng / nhẹ, mức đồ hoạ) và theo dõi draw call / tam giác (không phụ thuộc GPU). Chưa đo trên Android / Windows thật.

| Mức | Kịch bản | FPS TB | 1% thấp | Cập nhật (ms) | Render (ms) | Draw call | Tam giác | Thực thể | Hạt |
|---|---|---|---|---|---|---|---|---|---|
| LOW | Sơn môn (6 NPC, người chơi ảo) | 14.8 | 3.2 | 0.83 | 14.37 | 28 | 26.959 | 8 | 9 |
| LOW | Bản đồ 1: tự đánh quái + kỹ năng | 14.6 | 5 | 1.01 | 6.44 | 48 | 21.884 | 12 | 27 |
| LOW | Boss + Vạn Kiếm Quy Tông liên tục | 7.8 | 3.3 | 1.65 | 12.04 | 57 | 65.880 | 12 | 683 |
| LOW | Hỗn Độn Hư Không (pha lê, quái bay) | 12.6 | 5.5 | 1.11 | 6.26 | 52 | 11.578 | 10 | 29 |
| MEDIUM | Sơn môn (6 NPC, người chơi ảo) | 9.4 | 5.5 | 1.06 | 2.32 | 45 | 46.571 | 9 | 12 |
| MEDIUM | Bản đồ 1: tự đánh quái + kỹ năng | 9.7 | 5.5 | 1.02 | 3.83 | 65 | 18.204 | 11 | 32 |
| MEDIUM | Boss + Vạn Kiếm Quy Tông liên tục | 6.1 | 3.2 | 2 | 7.19 | 71 | 93.538 | 14 | 886 |
| MEDIUM | Hỗn Độn Hư Không (pha lê, quái bay) | 8.7 | 5 | 1.38 | 5.1 | 74 | 17.514 | 11 | 101 |
| HIGH | Sơn môn (6 NPC, người chơi ảo) | 5.5 | 3.8 | 1.19 | 5.8 | 57 | 63.816 | 8 | 17 |
| HIGH | Bản đồ 1: tự đánh quái + kỹ năng | 7 | 3.8 | 0.99 | 24.58 | 86 | 28.887 | 11 | 44 |
| HIGH | Boss + Vạn Kiếm Quy Tông liên tục | 4 | 2.4 | 1.48 | 15.98 | 101 | 131.530 | 14 | 638 |
| HIGH | Hỗn Độn Hư Không (pha lê, quái bay) | 5.6 | 2.9 | 1.3 | 34.95 | 74 | 26.237 | 11 | 41 |

**Rò rỉ bộ nhớ GPU** (đi qua 28 lần đổi bản đồ): geometry 47 → 47, texture 7 → 7, số đối tượng gốc trong scene: 24.
