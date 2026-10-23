// Sinh docs/V1.6-REPORT.md – báo cáo tuần 5 (pháp bảo) – từ kết quả ĐO THẬT: docs/reports/equipment.json, regression.json, artifact-balance.json
// + phần chữ viết tay docs/V1.6-NOTES.md (lỗi đã sửa / còn lại / tuần 6). Chạy: cd web && node tools/v16-report.js
'use strict';
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const J = f => { const p = path.join(WEB, 'docs/reports', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const eq = J('equipment.json'), reg = J('regression.json'), ab = J('artifact-balance.json');
const pct = x => (x * 100).toFixed(1) + '%';
const md = ['# Vạn Kiếm Kỳ Trận V1.6 – Báo cáo tuần 5: Trang bị · Ghép pháp bảo · Nội tại · Kho đồ · Giao diện TFT', '',
  `> Sinh bởi \`node tools/v16-report.js\` từ kết quả chạy thật (Chromium headless + SwiftShader; "Android" = giả lập cảm ứng \`hasTouch/isMobile\`, chưa thử trên máy thật). Ngày ${new Date().toISOString().slice(0, 10)}.`, '',
  '## 1. Chức năng có sẵn (kiểm tra đầu tuần 5) → sau tuần 5', '',
  '| Hệ thống | Trước tuần 5 (V1.5 FINAL) | Sau tuần 5 (V1.6) |', '|---|---|---|',
  '| Trang bị | 6 món hoàn chỉnh, chỉ cộng chỉ số, lưu dạng tên chuỗi rải ở túi / hàng chờ / tướng, không có instanceId, không giao dịch | 8 nguyên liệu + 36 pháp bảo, sổ vật phẩm duy nhất (instanceId / itemId / ownerId / vị trí), giao dịch nguyên tử |',
  '| Ghép đồ | Không có | ArtifactCraftingSystem: xem trước, xác nhận, giữ chỗ, A+B = B+A |',
  '| Nội tại | Không có (chỉ chỉ số) | 29 loại nội tại cho 36 pháp bảo, chạy theo bước mô phỏng, chặn vòng lặp |',
  '| Kho / giao diện | Hàng "Túi" trong cửa hàng (chạm / kéo lên tướng) | Dock Kho pháp bảo thu gọn được, ô tạm giữ, tooltip, xem trước chỉ số, bảng 36 công thức, 3 ô trên bảng thông tin |',
  '| Nguồn đồ | Trang bị cũ rơi ở vòng yêu thú | Nguyên liệu rơi ở vòng yêu thú (cấu hình tỉ lệ, tối đa 3 / vòng, nhận đúng 1 lần), Debug "Kho thử" (sandbox) |',
  '| Lưu | v2 | v3 + chuyển đổi v2 → v3 (trang bị cũ → nguyên liệu), bản gốc sao lưu `vkkt_save_backup_v<cũ>` |',
  '| 24 tướng · 8 tộc/hệ · AI · kỹ năng · kinh tế · Vạn Kiếm Quy Tông | Hoàn thiện (V1.5 FINAL) | Giữ nguyên – hồi quy ở mục 4 |', ''];
md.push('## 2. Dữ liệu 36 pháp bảo', '', 'Bảng đầy đủ (nguyên liệu, chỉ số, nội tại, kích hoạt, giới hạn, chuỗi sự kiện, VFX): **[ARTIFACTS.md](ARTIFACTS.md)**. Thiết kế hệ thống: **[EQUIPMENT.md](EQUIPMENT.md)**.', '');
if (ab) {
  const arts = ab.rows.filter(r => r.id !== 'none').sort((a, b) => b.delta - a.delta);
  md.push(`**Giá trị biên đo được** (tests/artifact-balance.js – ${ab.n} cặp trận mỗi món, cùng đội / đối thủ / seed, tướng mang = tướng đắt nhất đội; đối chứng không đồ thắng ${pct(ab.base)}): mạnh nhất ` +
    arts.slice(0, 5).map(r => `${r.name} ${r.delta >= 0 ? '+' : ''}${pct(r.delta)}`).join(', ') + '; yếu nhất ' + arts.slice(-5).map(r => `${r.name} ${r.delta >= 0 ? '+' : ''}${pct(r.delta)}`).join(', ') +
    `. Sai số chuẩn mỗi tỉ lệ ~${pct(Math.sqrt(0.25 / ab.n))}. Chi tiết: [ARTIFACT-BALANCE.md](ARTIFACT-BALANCE.md).`, '');
}
md.push('## 3. Kiểm thử tự động hệ thống pháp bảo (mục XIII)', '');
if (eq) {
  const p = eq.results.filter(r => r.ok).length;
  md.push(`\`npm run test:equipment\`: **${p}/${eq.results.length} PASS** (EquipmentTestRunner trong game + giao diện chuột / cảm ứng).`, '', '| # | Kiểm thử | Kết quả | Số đo |', '|---|---|---|---|');
  eq.results.forEach(r => md.push(`| ${r.id} | ${r.name.replace(/\|/g, '/')} | ${r.ok ? 'PASS' : '**FAIL**'} | ${String(r.detail || '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 160)} |`));
  md.push('');
}
md.push('## 4. Hồi quy toàn game', '');
if (reg) {
  md.push('| Bộ kiểm thử | Kết quả | Hạng mục | Thời gian |', '|---|---|---|---|');
  reg.suites.forEach(s => md.push(`| ${s.name} | ${s.exit === 0 ? 'PASS' : '**FAIL**'} | ${s.total || (s.pass > 1 ? s.pass + ' đạt / ' + s.fail + ' lỗi' : 'tự kiểm sau mỗi thao tác')} | ${s.secs} s |`));
  const bad = reg.suites.filter(s => s.exit !== 0);
  md.push('', bad.length ? '**Lỗi:** ' + bad.map(s => s.name + ': ' + s.failed.slice(0, 3).join(' · ')).join(' — ') : 'Tất cả bộ hồi quy đạt.', '');
  const ok = n => { const s = reg.suites.find(x => x.name === n); return s ? s.exit === 0 : false; };
  md.push('Ánh xạ tiêu chí 19–22: ' + [
    `19. 24 tướng mua / bán / nâng sao – champions ${ok('champions') ? 'PASS' : 'FAIL'}, audit ${ok('audit') ? 'PASS' : 'FAIL'}, EquipmentTestRunner #19`,
    `20. 8 tộc/hệ – traits ${ok('traits') ? 'PASS' : 'FAIL'}`,
    `21. Kinh tế và vòng đấu – economy ${ok('economy') ? 'PASS' : 'FAIL'}, playtest 20 lượt ${ok('playtest20') ? 'PASS' : 'FAIL'}, EquipmentTestRunner #21`,
    `22. Android / Windows – touch (cảm ứng ${ok('touch') ? 'PASS' : 'FAIL'}), portrait ${ok('portrait') ? 'PASS' : 'FAIL'}, equipment B* (chuột) / C* (cảm ứng ngang + dọc), dist (bản 1 tệp không mạng ${ok('dist') ? 'PASS' : 'FAIL'})`].join(' · ') + '.', '');
}
const notes = path.join(WEB, 'docs/V1.6-NOTES.md');
if (fs.existsSync(notes)) md.push(fs.readFileSync(notes, 'utf8'));
fs.writeFileSync(path.join(WEB, 'docs/V1.6-REPORT.md'), md.join('\n') + '\n');
console.log('Đã ghi docs/V1.6-REPORT.md');
