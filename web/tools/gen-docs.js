// Sinh docs/CHAMPIONS.md (bảng chỉ số 24 tướng + kỹ năng) trực tiếp từ js/data/*.js – bảng luôn khớp dữ liệu game.
// Chạy:  cd web && node tools/gen-docs.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.resolve(__dirname, '..');
// Môi trường tối thiểu để nạp file dữ liệu (không cần WebGL)
const ctx = { THREE: { Color: class { constructor(c) { this.c = c; } } }, SKILLS: {}, makeDataSkill: (id, s) => Object.assign({ id }, s), console };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8').replace(/^(const|let) /gm, 'var ').replace(/^'use strict';/m, ''), ctx, { filename: f });
['js/data/champions.js', 'js/data/traits.js', 'js/data/skills.js'].forEach(load);
const { CHAMPIONS, TRAITS, ORIGINS, ROLES, RARITY, STAR, SKILL_SPECS, SKILL_META, UNIT_DEFS } = ctx;

// Tên kỹ năng viết tay (js/13-skills.js) – đọc từ mã nguồn để không phải nạp Three.js
const src13 = fs.readFileSync(path.join(WEB, 'js/13-skills.js'), 'utf8');
const handName = id => {
  const m = src13.match(new RegExp('\\b' + id + ':\\s*(?:\\{[^]*?name:\\s*\'([^\']+)\'|\\w+\\(\\{\\s*name:\\s*\'([^\']+)\')'));
  return m ? m[1] || m[2] : id;
};
const handDesc = id => {
  const i = src13.search(new RegExp('^\\s*' + id + ':', 'm')); if (i < 0) return '—';
  const m = src13.slice(i, i + 1500).match(/desc:\s*'([^']+)'/); return m ? m[1] : '—';
};
const pct = x => Math.round(x * 100) + '%';
const num = x => (Math.round(x * 100) / 100).toString().replace('.', ',');
const effOf = s => (s.effects || []).map(e => e.kind + (e.mult ? ' ' + pct(e.mult) : '') + (e.pen ? ' xuyên ' + pct(e.pen) : '') + (e.dur ? ' ' + num(e.dur) + 's' : '') + (e.amount ? ' ' + pct(e.amount) : '') + (e.lifesteal ? ' hút ' + pct(e.lifesteal) : ''))
  .concat((s.ally || []).map(e => 'ally:' + e.kind + (e.pct ? ' ' + pct(e.pct) + ' máu' : '') + (e.stat ? ' ' + e.stat + (e.mul ? ' ×' + num(e.mul) : ' +' + e.add) : '') + (e.dur ? ' ' + num(e.dur) + 's' : ''))).join(' · ');

let out = '# 24 tướng Tu Tiên – bảng chỉ số (V1.5 tuần 1)\n\n';
out += '> Sinh tự động bởi `node tools/gen-docs.js` từ `js/data/champions.js`, `js/data/skills.js`, `js/data/traits.js`. Đừng sửa tay.\n\n';
out += `Nâng sao (cấu hình \`STAR\`): máu ×${STAR.hp.slice(1).join(' / ')} · công ×${STAR.atk.slice(1).join(' / ')} · sức mạnh kỹ năng ×${STAR.skill.slice(1).join(' / ')} · kích thước mô hình ×${STAR.scale.slice(1).join(' / ')}. ` +
  '3 bản ★1 → ★2, 3 bản ★2 → ★3, tối đa ★3.\n\n';
out += 'DPS ★1 = công × tốc đánh × (1 + chí mạng × (ST chí mạng − 1)). Máu hiệu dụng ★1 = máu × (1 + giáp/100) (giảm sát thương = giáp / (giáp + 100)).\n\n';
out += '| # | id | Tên | Bậc | Phẩm | Tộc | Hệ | Vai trò | Máu | Công | Giáp | Tốc đánh | Tầm | Tốc chạy | Năng lượng | Chí mạng | Né | DPS ★1 | Máu hiệu dụng ★1 | Máu ★2/★3 | Công ★2/★3 | Kỹ năng |\n';
out += '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
CHAMPIONS.forEach((c, i) => {
  const dps = c.atk * c.aspd * (1 + c.crit * (c.critDmg - 1)), ehp = c.hp * (1 + c.def / 100);
  const sk = SKILL_SPECS[c.skill] ? SKILL_SPECS[c.skill].name : handName(c.skill);
  out += `| ${i + 1} | \`${c.id}\` | ${c.name} | ${c.cost} | ${RARITY[c.cost]} | ${ORIGINS[c.origin]} | ${c.traits.map(t => TRAITS[t].name + (TRAITS[t].active ? '' : '*')).join(', ')} | ${ROLES[c.role].name} | ${c.hp} | ${c.atk} | ${c.def} | ${num(c.aspd)} | ${num(c.range)} | ${num(c.speed)} | ${c.mana0}/${c.mana} | ${pct(c.crit)} ×${num(c.critDmg)} | ${pct(c.dodge)} | ${Math.round(dps)} | ${Math.round(ehp)} | ${Math.round(c.hp * STAR.hp[2])}/${Math.round(c.hp * STAR.hp[3])} | ${Math.round(c.atk * STAR.atk[2])}/${Math.round(c.atk * STAR.atk[3])} | ${sk} |\n`;
});
out += '\n\\* hệ mới chỉ có dữ liệu, chưa có cộng hưởng (tuần 2).\n\n';

// Trung bình theo bậc để kiểm tra đường cong cân bằng
out += '## Đường cong sức mạnh theo bậc (trung bình ★1)\n\n| Bậc | Số tướng | Máu | Công | DPS | Máu hiệu dụng | DPS × máu hiệu dụng (tương đối bậc 1) |\n|---|---|---|---|---|---|---|\n';
let base = 0;
for (let t = 1; t <= 5; t++) {
  const L = CHAMPIONS.filter(c => c.cost === t), avg = f => L.reduce((a, c) => a + f(c), 0) / L.length;
  const dps = avg(c => c.atk * c.aspd * (1 + c.crit * (c.critDmg - 1))), ehp = avg(c => c.hp * (1 + c.def / 100)), p = dps * ehp;
  if (t === 1) base = p;
  out += `| ${t} | ${L.length} | ${Math.round(avg(c => c.hp))} | ${Math.round(avg(c => c.atk))} | ${Math.round(dps)} | ${Math.round(ehp)} | ×${num(p / base)} |\n`;
}

out += '\n## Kỹ năng\n\n| Tướng | Kỹ năng (id) | Loại | Mục tiêu | Điều kiện | Thời gian (vung / trúng / xong) | Hiệu ứng (hệ số công) | Mô tả |\n|---|---|---|---|---|---|---|---|\n';
const TYPE = { strike: 'Đơn mục tiêu', multi: 'Liên kích', projectile: 'Phóng đạn', volley: 'Phóng nhiều mục tiêu', line: 'Xuyên tuyến', area: 'Diện rộng', zone: 'Vùng duy trì', dash: 'Đột kích', summon: 'Triệu hồi phi kiếm', support: 'Hỗ trợ' };
const TARGET = { nearest: 'Gần nhất', densest: 'Vùng địch đông nhất', weakest: 'Yếu nhất', line: 'Hướng trúng nhiều nhất', backline: 'Tuyến sau', self: 'Bản thân / đồng minh' };
const READY = { allyHurt: 'đồng minh < 75% máu', enemyNear: 'địch trong tầm nổ', hurtOrNear: 'bản thân < 50% máu hoặc địch trong tầm nổ' };
for (const c of CHAMPIONS) {
  const s = SKILL_SPECS[c.skill];
  if (s) out += `| ${c.name} | ${s.name} (\`${c.skill}\`) | ${TYPE[s.type]}${s.center === 'self' ? ' quanh mình' : ''}${s.radius ? ' r=' + num(s.radius) : ''} | ${TARGET[s.target]} | ${s.ready ? READY[s.ready] : 'đầy năng lượng'} | ${num(s.timing.windup)} / ${num(s.timing.impact)} / ${num(s.timing.end)} s | ${effOf(s)} | ${s.desc} |\n`;
  else { const m = SKILL_META[c.skill] || {}; out += `| ${c.name} | ${handName(c.skill)} (\`${c.skill}\`) | ${m.type || ''} | ${m.target || ''} | (viết tay, js/13-skills.js) | ${m.duration ? num(m.duration) + ' s' : '—'} | ${(m.effects || []).join(', ')} · tổng hệ số ≈ ${pct(m.mult || 0)} | ${handDesc(c.skill)} |\n`; }
}

out += '\n## Tộc / hệ\n\n| id | Tên | Mốc | Hiệu ứng | Trạng thái | Tướng |\n|---|---|---|---|---|---|\n';
for (const id in TRAITS) {
  const t = TRAITS[id], who = CHAMPIONS.filter(c => c.traits.includes(id)).map(c => c.name);
  out += `| \`${id}\` | ${t.name} | ${t.tiers.join(' / ')} | ${t.desc.join(' · ')} | ${t.active ? 'đang hoạt động' : 'tuần 2'} | ${who.join(', ')} |\n`;
}
out += '\n## Tộc (nguồn gốc) – dữ liệu cho tuần 2\n\n| id | Tộc | Tướng |\n|---|---|---|\n';
for (const id in ORIGINS) out += `| \`${id}\` | ${ORIGINS[id]} | ${CHAMPIONS.filter(c => c.origin === id).map(c => c.name).join(', ')} |\n`;

out += '\n## Mô hình & animation\n\n| Tướng | Ngoại hình (LOOKS) | Vũ khí | Tỉ lệ | Preset animation | Đòn thường | Clip thi triển |\n|---|---|---|---|---|---|---|\n';
const looksSrc = fs.readFileSync(path.join(WEB, 'js/data/champions.js'), 'utf8');
for (const c of CHAMPIONS) {
  const w = (looksSrc.match(new RegExp('^  ' + c.model.look + ': \\{[^\\n]*weapon: \'(\\w+)\'', 'm')) || [])[1] || '';
  const a = UNIT_DEFS[c.id].animSet;
  out += `| ${c.name} | \`${c.model.look}\` | ${w} | ${c.model.scale} | ${c.anim} | ${a.attack.join(' → ')} | ${a.cast} |\n`;
}
fs.mkdirSync(path.join(WEB, 'docs'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'docs/CHAMPIONS.md'), out);
console.log('Đã ghi docs/CHAMPIONS.md (' + CHAMPIONS.length + ' tướng)');
