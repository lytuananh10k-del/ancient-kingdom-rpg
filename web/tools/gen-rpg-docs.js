// Sinh docs/GAME-DATA.md từ CHÍNH dữ liệu game (js/data/*.js + js/rpg/data.js) – bảng tông môn, cảnh giới, kỹ năng, bản đồ, quái / boss,
// trang bị, đan dược, nhiệm vụ. Chạy lại sau mỗi lần chỉnh số: cd web && node tools/gen-rpg-docs.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.resolve(__dirname, '..');
class Color { constructor(c) { this.c = c; } }
const ctx = { THREE: { Color }, console, Math, JSON, Object, Array, Set, Map, String, Number };
ctx.clamp = (v, a, b) => (v < a ? a : v > b ? b : v); ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/data/champions.js', 'js/data/artifacts.js', 'js/rpg/data.js']) vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8').replace(/^'use strict';/m, ''), ctx, { filename: f });
const D = vm.runInContext('({ SECTS, REALMS, RPG_SKILLS, MAPS, MONSTERS, monsterStats, TIERS, EQUIP_SLOTS, equipStats, CONSUMABLES, QUESTS, LINHDAN, WISHES, POINT_STATS, pointCost, RPG_BAL, CHAMPIONS, LOOKS, ENEMY_DEFS, skillBookCost, ARTIFACT_LIST })', ctx);

const n = v => Math.round(v).toLocaleString('vi-VN');
const lookName = l => { const c = D.CHAMPIONS.find(x => x.model.look === l) || D.ENEMY_DEFS.find(x => x.model.look === l); return c ? c.name : l; };
let md = `# Dữ liệu game – Vạn Kiếm Kỳ Trận Phiêu Lưu V2.0\n\nSinh tự động bởi \`tools/gen-rpg-docs.js\` từ \`js/rpg/data.js\` (+ \`js/data/champions.js\`, \`js/data/artifacts.js\`). Đừng sửa tay – sửa dữ liệu rồi chạy lại.\n\n`;
md += `## Tông môn\n\n| Tông môn | Chỉ số gốc (sinh lực / linh lực / công / giáp / chí mạng) | Ngoại hình chọn được (lấy từ 24 tướng) | Sư Phụ | Kỹ năng |\n|---|---|---|---|---|\n`;
for (const S of Object.values(D.SECTS)) md += `| ${S.glyph} ${S.name} | ${S.base.hp} / ${S.base.mp} / ${S.base.atk} / ${S.base.def} / ${Math.round(S.base.crit * 100)}% | ${S.looks.map(lookName).join(', ')} | ${lookName(S.master)} | ${S.skills.map(id => D.RPG_SKILLS[id].name).join(' · ')} |\n`;
md += `\n## Cảnh giới (thay "sức mạnh")\n\nMỗi cảnh giới chia 9 tầng; chỉ số gốc × (1 + thưởng cảnh giới + 1,2% mỗi tầng). Tu vi và linh căn nhận khi gây sát thương lên quái (${D.RPG_BAL.tvPerDmg} tu vi / 1 sát thương, boss × 0,25) và khi hạ quái (${D.RPG_BAL.tvKill} × cấp quái), nhân hệ số chênh cấp 10%–130%.\n\n| Cảnh giới | Tu vi cần | Thưởng chỉ số gốc |\n|---|---|---|\n`;
for (const R of D.REALMS) md += `| ${R.name} | ${n(R.tv)} | +${Math.round(R.bonus * 100)}% |\n`;
md += `\n## Linh căn (điểm tiềm năng)\n\n| Chỉ số | Mỗi lần nâng | Giá lần 1 | Giá lần 11 | Giá lần 101 |\n|---|---|---|---|---|\n`;
for (const [k, P] of Object.entries(D.POINT_STATS)) md += `| ${P.name} | +${k === 'crit' ? '1%' : P.step} | ${n(D.pointCost(k, 0))} | ${n(D.pointCost(k, 10))} | ${P.max ? '(tối đa ' + P.max + ' lần)' : n(D.pointCost(k, 100))} |\n`;
md += `\n## Kỹ năng (15)\n\nCấp 1–7 (bí kíp ở Sư Phụ: linh thạch + tu vi tối thiểu). Linh lực tốn × (1 + 0,6 × cảnh giới).\n\n| Tông môn | Kỹ năng | Loại | Hệ số công cấp 1 → 7 | Hồi chiêu | Linh lực | Mở khoá | Mô tả |\n|---|---|---|---|---|---|---|---|\n`;
for (const S of Object.values(D.SECTS)) for (const id of S.skills) { const k = D.RPG_SKILLS[id], m7 = k.mult + (k.perLv || 0) * 6;
  md += `| ${S.short} | ${k.name}${k.ult ? ' (tuyệt kỹ)' : ''} | ${k.kind} | ${Math.round(k.mult * 100)}% → ${Math.round(m7 * 100)}%${k.hits ? ' × ' + k.hits : ''} | ${k.cd} s | ${k.cost} | ${k.unlockQuest ? 'nhiệm vụ ' + k.unlockQuest : id === S.skills[0] ? 'có sẵn' : D.REALMS[k.unlock || 0].name} | ${k.desc} |\n`; }
md += `\n## Bản đồ (${Object.keys(D.MAPS).length})\n\n| Mã | Bản đồ | Vùng | Rộng | Cấp quái | Quái | Boss | Nối |\n|---|---|---|---|---|---|---|---|\n`;
for (const [id, M] of Object.entries(D.MAPS)) md += `| ${id} | ${M.name} | ${M.region} | ${M.width} m | ${M.level ? M.level.join('–') : 'sơn môn'} | ${(M.spawns || []).map(([t, c]) => D.MONSTERS[t].name + ' ×' + c).join(', ') || '–'} | ${M.boss ? D.MONSTERS[M.boss].name + ' (cấp ' + M.bossLv + ')' : '–'}${M.minRealm ? ' · cần ' + D.REALMS[M.minRealm].name : ''} | ${[M.left && '← ' + M.left, M.right && M.right + ' →'].filter(Boolean).join(' ')} |\n`;
md += `\n## Quái & boss\n\nChỉ số chuẩn theo cấp L: sinh lực = (40·L^1,5 + 40) × hpK; công = (7 + 3,8·L^1,25) × atkK; giáp = 0,8·L (boss × 1,5). Bảng dưới: chỉ số ở cấp thấp nhất / cao nhất của bản đồ.\n\n| Quái | Mô hình | Hành vi | Bản đồ | Sinh lực | Công |\n|---|---|---|---|---|---|\n`;
for (const [t, Mo] of Object.entries(D.MONSTERS)) {
  const maps = Object.entries(D.MAPS).filter(([, M]) => (M.spawns || []).some(s => s[0] === t) || M.boss === t);
  const lv = maps.map(([, M]) => M.boss === t ? [M.bossLv, M.bossLv] : M.level).flat(); const lo = Math.min(...lv), hi = Math.max(...lv);
  const a = D.monsterStats(lo, Mo), b = D.monsterStats(hi, Mo);
  md += `| ${Mo.boss ? '☠ ' : ''}${Mo.name} | ${Mo.model === 'human' ? 'người (' + lookName(Mo.look) + ')' : Mo.model} | ${Mo.boss ? 'boss, ' + (Mo.respawn) + ' s hồi sinh' : Mo.ai === 'passive' ? 'bị động' : 'chủ động'}${Mo.fly ? ', bay' : ''}${Mo.ranged ? ', bắn xa' : ''} | ${maps.map(([id]) => id).join(', ')} | ${n(a.hp)}${hi !== lo ? ' – ' + n(b.hp) : ''} | ${n(a.atk)}${hi !== lo ? ' – ' + n(b.atk) : ''} |\n`;
}
md += `\n## Trang bị (5 ô) + pháp bảo (2 ô)\n\nChỉ số chính × hệ số bậc × (1 + 12% mỗi cấp cường hoá, tối đa +7). Pháp bảo: 36 món của bản cờ (ghép 2 nguyên liệu ở Luyện Khí Sư), chỉ số bản cờ đổi sang chỉ số nhân vật, 29 loại nội tại chạy theo luật "giao chiến".\n\n| Bậc | Cần | Giá Linh Thương | ${Object.values(D.EQUIP_SLOTS).map(s => s.name).join(' | ')} |\n|---|---|---|${Object.keys(D.EQUIP_SLOTS).map(() => '---').join('|')}|\n`;
for (let t = 1; t < D.TIERS.length; t++) { const T = D.TIERS[t]; md += `| ${T.name} | ${D.REALMS[T.realm].name} | ${T.price ? n(T.price) : 'chỉ rơi từ quái / boss'} | ${Object.keys(D.EQUIP_SLOTS).map(s => Object.entries(D.equipStats(s, t, 0)).map(([k, v]) => (k === 'crit' ? Math.round(v * 1000) / 10 + '%' : v) + ' ' + k).join(', ')).join(' | ')} |\n`; }
md += `\n## Đan dược\n\n| Vật phẩm | Giá | Tác dụng |\n|---|---|---|\n`;
for (const C of Object.values(D.CONSUMABLES)) md += `| ${C.name} | ${C.price ? n(C.price) + ' linh thạch' : C.gem + ' tiên ngọc'} | ${C.desc} |\n`;
md += `| Linh Đan (Linh Đan Thụ cấp 1–${D.LINHDAN.maxLv}) | thu hoạch miễn phí, ${D.LINHDAN.interval} s / viên, chứa tối đa ${D.LINHDAN.cap(1)}–${D.LINHDAN.cap(D.LINHDAN.maxLv)} | hồi ${Math.round(D.LINHDAN.pct(1) * 100)}%–${Math.round(D.LINHDAN.pct(D.LINHDAN.maxLv) * 100)}% sinh lực + linh lực |\n`;
md += `\n## Điều ước Thần Long (7 Long Châu)\n\n| Điều ước | Tác dụng |\n|---|---|\n` + D.WISHES.map(w => `| ${w.name} | ${w.desc} |`).join('\n') + '\n';
md += `\n## Nhiệm vụ chính tuyến (${D.QUESTS.length})\n\n| # | Nhiệm vụ | Yêu cầu | Thưởng |\n|---|---|---|---|\n`;
D.QUESTS.forEach((q, i) => { md += `| ${i + 1} | ${q.name} | ${q.text} | ${Object.entries(q.reward).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join(' ') : v)).join(', ')} |\n`; });
fs.writeFileSync(path.join(WEB, 'docs', 'GAME-DATA.md'), md);
console.log('Đã ghi docs/GAME-DATA.md (' + md.length + ' ký tự)');
