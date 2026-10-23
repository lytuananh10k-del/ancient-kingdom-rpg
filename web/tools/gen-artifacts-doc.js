// Sinh docs/ARTIFACTS.md (8 nguyên liệu, 36 công thức, chỉ số + nội tại từng pháp bảo) trực tiếp từ js/data/artifacts.js – bảng luôn khớp dữ liệu game.
// Chạy: cd web && node tools/gen-artifacts-doc.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.resolve(__dirname, '..');
const ctx = { console };
vm.createContext(ctx);
['js/data/artifacts.js', 'js/items/artifact-system.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8').replace(/^(const|let|class) /gm, m => (m === 'class ' ? 'var UserError = class ' + '' : 'var ')).replace(/var UserError = class UserError/, 'var UserError = class').replace(/^'use strict';/m, ''), ctx, { filename: f }));
const { COMPONENTS, COMPONENT_KEYS, ARTIFACT_LIST, ARTIFACTS, statText, validateArtifacts, ARTIFACT_REWARDS } = ctx;
const VFX = { sword: 'Kiếm khí, vệt chém, tia kim loại', staff: 'Pháp trận, hạt linh lực bay lên', bow: 'Vệt sáng tốc độ', armor: 'Hạt khiên, sóng phòng ngự (Cao+)', cloak: 'Sương linh khí sát đất',
  crystal: 'Năng lượng tụ lên, sóng tinh thể (Tối đa)', jade: 'Ánh sáng hồi phục + pháp trận sen', glove: 'Tia chớp chí mạng vàng' };
const bad = validateArtifacts();
const md = ['# Pháp bảo V1.6 – 8 nguyên liệu · 36 công thức', '',
  '> Sinh tự động bởi `node tools/gen-artifacts-doc.js` từ `js/data/artifacts.js`. Mô tả nội tại sinh từ đúng tham số mà `js/items/artifact-passives.js` dùng.' + (bad.length ? ' **Lỗi dữ liệu: ' + bad.join('; ') + '**' : ' validateArtifacts: không lỗi.'), '',
  '## Nguyên liệu', '', '| ID | Icon | Nguyên liệu | Chỉ số | Mô tả |', '|---|---|---|---|---|'];
for (const k of COMPONENT_KEYS) { const c = COMPONENTS[k]; md.push(`| \`${k}\` | ${c.glyph} | ${c.name} | ${statText(c.stats)} | ${c.desc} |`); }
md.push('', 'Nguồn: vòng yêu thú (3, 7, 11…) – Yêu Lang ' + Math.round(ARTIFACT_REWARDS.killChance.yeulang * 100) + '% rơi khi hạ, Yêu Thú Vương chắc chắn; thắng vòng ít nhất ' + ARTIFACT_REWARDS.winMin + '; tối đa ' + ARTIFACT_REWARDS.maxPerRound + ' / vòng; nhận đúng 1 lần mỗi vòng (lưu cùng ván). Linh thạch rơi không đổi.', '',
  '## 36 công thức', '',
  'Quy tắc chung: **chỉ số = nguyên liệu A + B (+ phần thêm)**, luôn cộng dồn khi mang nhiều bản. **Nội tại** (trừ loại chỉ số) chỉ áp **1 lần mỗi tướng** dù mang 2 bản cùng loại. Nội tại "đòn đánh" chỉ chạy với đòn đánh thường; sát thương do nội tại gây ra là sát thương phụ → không kích hoạt nội tại khác (không vòng lặp).', '',
  '| # | A | B | Pháp bảo | ID | Chỉ số | Nội tại | Kích hoạt | Giới hạn / hồi chiêu | Kích hoạt sự kiện tiếp? | VFX (nhóm ' + 'A) |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const [id] of ARTIFACT_LIST) {
  const a = ARTIFACTS[id];
  md.push(`| ${a.no} | ${COMPONENTS[a.parts[0]].name} | ${COMPONENTS[a.parts[1]].name} | **${a.name}** | \`${id}\` | ${statText(a.stats)} | ${a.passiveText} | ${a.trigger} | ${a.limit} | ${a.chain} | ${VFX[a.group]} |`);
}
md.push('', '## Ma trận ghép (hàng = A, cột = B, A + B = B + A)', '', '| | ' + COMPONENT_KEYS.map(k => COMPONENTS[k].glyph + ' ' + COMPONENTS[k].name).join(' | ') + ' |', '|---' + '|---'.repeat(8) + '|');
const byPair = {}; for (const [id, , a, b] of ARTIFACT_LIST) { byPair[a + '+' + b] = byPair[b + '+' + a] = ARTIFACTS[id].name; }
for (const i of COMPONENT_KEYS) md.push(`| **${COMPONENTS[i].glyph} ${COMPONENTS[i].name}** | ` + COMPONENT_KEYS.map(j => byPair[i + '+' + j]).join(' | ') + ' |');
md.push('', '## Trang bị cũ (V1.0–V1.5) khi tải bản lưu', '', 'Bản lưu v2 trở về trước: 6 trang bị cũ (trong túi và đang gắn trên tướng) được đổi thành nguyên liệu tương ứng và đưa vào kho (Thanh Phong Kiếm → Linh Kiếm, Huyền Thiết Giáp → Huyền Giáp, Tụ Linh Châu → Linh Tinh, Hộ Mệnh Phù → Linh Bào, Phong Hành Ngoa → Thần Cung, Huyết Ngọc → Sinh Mệnh Ngọc). Bản gốc được sao lưu ở `vkkt_save_backup_v2` trước khi ghi bản v3.', '');
fs.writeFileSync(path.join(WEB, 'docs/ARTIFACTS.md'), md.join('\n'));
console.log('Đã ghi docs/ARTIFACTS.md (36 pháp bảo)' + (bad.length ? ' – LỖI: ' + bad.join('; ') : ''));
