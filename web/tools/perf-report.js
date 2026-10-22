// Sinh docs/PERF.md từ docs/reports/perf-before.json và perf-after.json (đầu ra của tests/perf.js) – không chép số bằng tay.
// Chạy: cd web && node tools/perf-report.js
'use strict';
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const rd = t => JSON.parse(fs.readFileSync(path.join(WEB, `docs/reports/perf-${t}.json`), 'utf8'));
const B = rd('before'), A = rd('after');
const key = r => r.id + '@' + r.quality;
const bm = new Map(B.results.map(r => [key(r), r]));
const pct = (a, b) => (b ? ((a - b) / b * 100).toFixed(0) + '%' : '–');
const md = ['# Hiệu năng – trước / sau tối ưu (V1.5 FINAL)', '',
  '> Sinh bởi `node tools/perf-report.js` từ `docs/reports/perf-before.json` (mã trước tối ưu, commit 457b2c4) và `perf-after.json` (mã hiện tại), cả hai do `npm run perf` (tests/perf.js) đo **lần lượt trên cùng máy, không chạy song song việc khác**.',
  '',
  `**Môi trường đo:** ${A.env.gpu} · ${A.env.cores} nhân CPU · khung nhìn ${A.env.viewport} @ DPR ${A.env.dpr} · ${A.secsPerScenario} s mỗi kịch bản.`,
  '',
  '**Giới hạn – đọc trước khi dùng số liệu:** WebGL ở đây chạy bằng **SwiftShader (dựng hình trên CPU)** trong Chromium headless, không có GPU. FPS tuyệt đối vì thế rất thấp và **không đại diện cho điện thoại / PC thật**. Chỉ số so sánh được giữa hai lần đo là: draw call, tam giác, số mesh hiển thị, hạt, đạn, geometry / texture / shader, heap JS, thời gian cập nhật logic (ms, CPU). FPS / thời gian render cho biết xu hướng, không phải con số trên thiết bị. Mục tiêu 30 / 60 FPS trên Android / Windows phải kiểm bằng thiết bị thật – xem docs/RUN-GUIDE.md.',
  '',
  '| Kịch bản | Mức | Draw call trước → sau | Tam giác trước → sau | Mesh hiển thị | FPS TB trước → sau | 1% thấp | Khung TB (ms) | Cập nhật (ms) | Render (ms) | Hạt / đạn tối đa | Heap (MB) |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const a of A.results) {
  const b = bm.get(key(a)); if (!b) continue;
  md.push(`| ${a.name} | ${a.quality} | ${b.peak.calls} → **${a.peak.calls}** (${pct(a.peak.calls, b.peak.calls)}) | ${b.peak.tris.toLocaleString('vi-VN')} → ${a.peak.tris.toLocaleString('vi-VN')} | ${b.peak.meshes} → ${a.peak.meshes} | ${b.fps} → **${a.fps}** | ${b.low1} → ${a.low1} | ${b.frameMs} → ${a.frameMs} | ${b.updateMs} → ${a.updateMs} | ${b.renderMs} → ${a.renderMs} | ${a.peak.particles} / ${a.peak.projectiles} | ${b.jsHeapMB} → ${a.jsHeapMB} |`);
}
md.push('', '## 7. Nhiều vòng liên tiếp (5v5, MEDIUM, ×2 tốc độ) – tài nguyên sau mỗi lần dọn vòng', '',
  '| Vòng | FPS trước → sau | geometry trước → sau | texture | shader | đối tượng cảnh trước → sau | heap MB trước → sau (sau gc) | đạn / tác vụ / timeline / hiệu ứng còn sót (sau) |', '|---|---|---|---|---|---|---|---|');
A.rounds.forEach((a, i) => { const b = B.rounds[i] || { after: {} };
  md.push(`| ${a.round} | ${b.fps} → ${a.fps} | ${b.after.geometries} → ${a.after.geometries} | ${b.after.textures} → ${a.after.textures} | ${b.after.programs} → ${a.after.programs} | ${b.after.sceneObjects} → ${a.after.sceneObjects} | ${b.after.jsHeapMB} → ${a.after.jsHeapMB} | ${a.after.projectiles} / ${a.after.tasks} / ${a.after.timelines} / ${a.after.effects} |`); });
md.push('', `Lỗi console: trước ${B.errors.length}, sau ${A.errors.length}.`, '');
fs.writeFileSync(path.join(WEB, 'docs/PERF-DATA.md'), md.join('\n'));
console.log('Đã ghi docs/PERF-DATA.md');
