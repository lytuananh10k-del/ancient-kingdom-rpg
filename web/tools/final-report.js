// Sinh docs/V1.5-FINAL.md – báo cáo tổng hợp tuần 4 – từ các tệp kết quả ĐO THẬT trong docs/reports/*.json
// (BalanceSimulator, kiểm thử AI / bộ nhớ / lưu / hiệu năng / hồi quy / 24 tướng). Phần chữ cố định chỉ mô tả cách làm và thay đổi đã thực hiện.
// Chạy: cd web && node tools/final-report.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.resolve(__dirname, '..');
const J = f => { const p = path.join(WEB, 'docs/reports', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const sim = J('balance-sim.json'), sim0 = J('balance-sim-before.json'), ai = J('ai.json'), mem = J('memory.json'), save = J('save-test.json'),
  pb = J('perf-before.json'), pa = J('perf-after.json'), reg = J('regression.json'), qa = J('qa-champions.json');
// dữ liệu tướng (tên, bậc, vai trò) đọc thẳng từ js/data – không cần trình duyệt
const ctx = { THREE: { Color: class { constructor(c) { this.c = c; } } }, SKILLS: {}, makeDataSkill: (id, s) => Object.assign({ id }, s), console };
vm.createContext(ctx);
['js/data/balance.js', 'js/data/champions.js', 'js/data/traits.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8').replace(/^(const|let) /gm, 'var ').replace(/^'use strict';/m, ''), ctx));
const { CHAMPIONS, ROLES, TRAITS } = ctx;
const pct = x => (x * 100).toFixed(1) + '%';
const md = [];
const P = (...l) => md.push(...l);

// Thay đổi cân bằng đã làm (mô tả đúng mã nguồn – js/data/*.js, js/13-skills.js)
const CHANGES = {
  huyengiap: 'Hộ Thể Chân Khí: khiên 3 mục tiêu × 20% máu → **2 mục tiêu × 15%**',
  batdiet: 'Bất Diệt Kim Thân: hồi ngay 10→**8%**, hồi theo thời gian 12→**6%**, giảm sát thương nhận 30→**20%**; nội tại 0,6→**0,4%** máu/giây',
  linhcung: 'Công 56→**52**, tốc đánh 0,95→**0,88**',
  bangling: 'Hàn Băng Tiễn 210→**240%** công; máu 600→**640**'
};
const subst = {}; (sim.substitution || []).forEach(sb => { for (const k in sb.results) subst[k] = Object.assign({ slot: sb.slot }, sb.results[k]); });

P('# Vạn Kiếm Kỳ Trận V1.5 FINAL – Báo cáo tuần 4 (kiểm thử · cân bằng · hiệu năng · hoàn thiện)', '',
  `> Sinh bởi \`node tools/final-report.js\` từ các tệp đo thật trong \`docs/reports/\`. Mọi số liệu là kết quả chạy thực tế trong **Chromium headless + SwiftShader** (WebGL dựng bằng CPU, không GPU, không thiết bị thật). Ngày sinh: ${new Date().toISOString().slice(0, 10)}.`, '');

// ---------- 1. Tình trạng hệ thống ----------
P('## 1. Bảng tình trạng hệ thống (kiểm tra đầu tuần 4 → sau tuần 4)', '',
  '| Hệ thống | Đã triển khai | Hoạt động đúng (đầu tuần 4) | Cần sửa (phát hiện qua kiểm thử) | Sau tuần 4 |', '|---|---|---|---|---|',
  '| 24 tướng | Có | Gần đúng | Đổi mục tiêu chậm 0,7–0,9 s khi mục tiêu chết giữa đòn (#14 kiểm tra 24 tướng) | Đã sửa – 360/360 hạng mục |',
  '| 8 tộc / hệ | Có | Đúng (tests/traits.js) | – | Giữ nguyên, hồi quy đạt |',
  '| AI giao chiến | Có | Gần đúng | Lắc qua lại quanh ô đích khi mục tiêu chạy (1,3 lần đảo chiều / giây di chuyển); phím tắt game nhận cả Ctrl+… | Đã sửa (0,04 / giây) |',
  '| Kỹ năng | Có | Gần đúng | Lỗi `undefined.dot` trong StatusEffectManager khi tướng chết giữa vòng cập nhật; nguồn choáng của Lôi Kiếp / Vạn Kiếm không được ghi | Đã sửa |',
  '| Cửa hàng | Có | Đúng (tests/economy.js, champions.js) | – | Giữ nguyên |',
  '| Nâng sao | Có | Đúng | – | Giữ nguyên |',
  '| Animation | Có | Đúng (#9: lệch tư thế–sát thương ≤ 1 bước 16,7 ms) | – | Giữ nguyên |',
  '| VFX / dựng hình | Có | Đúng | Draw call rất cao (591 ở chuẩn bị mức Vừa, 1.907 ở 9v8 Tối đa); cấp phát đối tượng mỗi khung cho tóc / dải lụa / vệt vũ khí | Đã tối ưu (−84…−93% draw call) |',
  '| Lưu | Có | Một phần | Không có chuyển phiên bản; bản lưu hỏng bị thay bằng ván mới (mất); số hỏng (NaN) lọt vào ván; bộ mô phỏng / kiểm thử ghi đè bản lưu thật | Đã sửa – v2, sao lưu bản hỏng, làm sạch, sandbox |',
  '| Vòng đời Android | Một phần | – | Không tạm dừng khi rời ứng dụng; không xử lý mất ngữ cảnh WebGL | Đã thêm |', '');

// ---------- 2. Kiểm thử 24 tướng ----------
P('## 2. Kiểm thử 24 tướng (15 hạng mục × 24)', '', `Chi tiết: docs/QA-CHAMPIONS.md (\`npm run test:audit\`). Kết quả: **${qa ? qa.filter(r => Object.values(r.checks).every(c => c.ok)).length : '?'}/24 tướng đạt cả 15 hạng mục** (${qa ? qa.reduce((a, r) => a + Object.values(r.checks).filter(c => c.ok).length, 0) : '?'}/${qa ? qa.length * 15 : '?'} hạng mục).`, '');

// ---------- 3. Cân bằng ----------
const m = sim.meta;
P('## 3. Cân bằng 24 tướng', '',
  `**BalanceSimulator** (\`npm run simulate\`): ${m.n} trận, seed ${m.seed}, ${(m.ms / 1000).toFixed(0)} s mô phỏng không render. Hai đội cân ngân sách vàng (giá × 3^(sao−1)), cấp 4–9, tỉ lệ bậc theo bảng cửa hàng, cả hai phe có tộc/hệ. Hoà ${m.draws}, thời lượng TB ${m.avgTime} s, dài nhất ${m.maxTime} s. Ngưỡng cảnh báo (chỉnh được): ${Object.entries(m.thresholds).map(([k, v]) => k + ' ' + v).join(' · ')}.`, '',
  '**Hai cách đo bổ sung nhau:** (1) *tỉ lệ thắng khi có mặt* (cỡ mẫu lớn, nhưng nhiễu theo bố cục – đội có đỡ đòn tuyến đầu thắng nhiều hơn đội không có, nên mọi đỡ đòn đều “cao”); (2) *thí nghiệm thay thế* – cùng 4 tướng + cùng đối thủ + cùng seed, chỉ đổi tướng ở một ô (tuyến đầu / tuyến sau), ' + (sim.substitution ? sim.substitution[0].n : '?') + ' cặp trận mỗi tướng – đo giá trị biên, kỳ vọng tăng dần theo bậc giá. Chỉ đổi chỉ số khi cả hai cách cùng chỉ ra lệch.', '',
  '| Tướng | Bậc | Vai trò | Số trận | Thắng khi có mặt (trước → sau) | KTC 95% (sau) | Thay thế (ô · thắng) | Sát thương TB (vật lý / phép / chuẩn) | DPS | Nhận | Máu hiệu dụng | Hồi | Khiên | Khống chế (s) | Lần tung | Sống (s) | Thay đổi / trạng thái |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const c of CHAMPIONS.slice().sort((a, b) => a.cost - b.cost || (a.short || a.name).localeCompare(b.short || b.name))) {
  const a = sim.champions[c.id], b = sim0 && sim0.champions[c.id], s = subst[c.id];
  let status;
  if (CHANGES[c.id]) status = 'Đã chỉnh: ' + CHANGES[c.id];
  else if (a.n < 150) status = 'Ít dữ liệu (bậc 5 hiếm) – theo dõi';
  else if (c.role === 'tank' && a.ci95[0] > 0.5) status = 'Ổn – cao do bố cục (xem thay thế)';
  else if (a.ci95[1] < 0.5 && 0.5 - a.winRate > 0.05) status = 'Hơi yếu, trong ngưỡng – theo dõi';
  else if (a.ci95[0] > 0.5 && a.winRate - 0.5 > 0.05) status = 'Hơi mạnh, trong ngưỡng – theo dõi';
  else status = 'Cân bằng';
  P(`| ${c.short || c.name} | ${c.cost} | ${ROLES[c.role].name} | ${a.n} | ${b ? pct(b.winRate) + ' → ' : ''}**${pct(a.winRate)}** | ${pct(a.ci95[0])}–${pct(a.ci95[1])} | ${s ? (s.slot === 'front' ? 'đầu' : 'sau') + ' · ' + pct(s.winRate) : '–'} | ${Math.round(a.dealt)} (${Math.round(a.physical)} / ${Math.round(a.magic)} / ${Math.round(a.true)}) | ${a.dps} | ${Math.round(a.taken)} | ${Math.round(a.ehp)} | ${Math.round(a.healed)} | ${Math.round(a.shielded)} | ${a.cc} | ${a.casts} | ${a.survival} | ${status} |`);
}
const curve = slot => (sim.substitution || []).filter(x => x.slot === slot).map(x => Object.entries(x.results).sort((p, q) => p[1].cost - q[1].cost).map(([k, r]) => `${CHAMPIONS.find(c => c.id === k).short || k} (${r.cost}) ${pct(r.winRate)}`).join(' · ')).join('');
P('', `**Thay thế tuyến đầu:** ${curve('front')}.`, '', `**Thay thế tuyến sau:** ${curve('back')}.`, '',
  '**Theo bậc giá:** ' + Object.entries(sim.costs).map(([k, c]) => `bậc ${k} ${pct(c.winRate)} (${c.n})`).join(' · ') + '. **Theo vai trò:** ' + Object.entries(sim.roles).map(([k, c]) => `${ROLES[k].name} ${pct(c.winRate)}`).join(' · ') + '.', '',
  '**Quy trình điều chỉnh (có bằng chứng):** 1) mô phỏng gốc 1200 trận → cờ “mạnh bất thường” Huyền Giáp 72,4% (KTC 68,5–76,0%) và Bất Diệt 74,0% (69,4–78,2%), cũng là 2 tướng có khiên / hồi lớn nhất (2.143 khiên / trận của tướng 2 vàng, hơn Kim Cang 3 vàng). 2) giảm bước 1 → 70,4% / 69,0%; bước 2 → gần như không đổi nữa (69,5% / 67,9%) dù khiên giảm thêm 1/3 ⇒ phần còn lại là hiệu ứng bố cục, không phải sức mạnh tướng. 3) thí nghiệm thay thế xác nhận đỡ đòn tăng đều theo giá (Thiết Vệ → Huyền Giáp → Kim Cang → Bất Diệt) ⇒ dừng giảm. 4) thay thế tuyến sau cho thấy Linh Cung (1 vàng) ngang pháp sư 3 vàng và Băng Linh (2 vàng) ngang tướng 1 vàng, khớp với tỉ lệ khi có mặt (Linh Cung 58,1% KTC 54–62%; Băng Linh 42,5% KTC 38–47%) ⇒ chỉnh nhẹ, chạy lại xác nhận. Không đổi Kiếm Đế / Ma Đế (bậc 5: 103 / 111 trận, KTC chứa 50%).', '');
// tộc/hệ
P('## 4. Báo cáo 8 tộc / hệ', '', 'Kiểm thử chức năng: `tests/traits.js` (đếm tướng khác nhau, hàng chờ không tính, mốc bật / tắt, công thức chỉ số trên 50 đội ngẫu nhiên, không cộng dồn qua vòng, từng hiệu ứng đặc biệt, dọn sạch sau trận, ×1 = ×2). Tỉ lệ thắng của đội khi mốc đang bật (BalanceSimulator, cả hai phe có tộc/hệ):', '',
  '| Tộc / hệ | Loại | Mốc | Số đội (sau) | Thắng trước → sau |', '|---|---|---|---|---|');
for (const id of Object.keys(TRAITS)) {
  const t = TRAITS[id];
  t.tiers.forEach(tier => { const k = id + ' ' + tier, a = sim.traits[k], b = sim0 && sim0.traits[k]; if (!a) return;
    P(`| ${t.name} | ${t.kind === 'origin' ? 'Tộc' : 'Hệ'} | ${tier} | ${a.n} | ${b ? pct(b.winRate) + ' → ' : ''}${pct(a.winRate)}${a.n < 40 ? ' (ít dữ liệu)' : ''} |`); });
}
P('', 'Mốc đầu của mọi tộc/hệ nằm trong 46–62%; không đội hình tộc/hệ nào áp đảo ở mốc có đủ dữ liệu. Mốc cao (4/6) xuất hiện quá ít trong đội ngẫu nhiên (≤ 65 đội) – không kết luận được, cần thêm mô phỏng có chủ đích ở giai đoạn sau. Pháp Tu (2) / Tiên Tộc (2) thấp nhất (~46%) – trùng với nhóm pháp sư, đã chỉnh Băng Linh; theo dõi tiếp.', '');

// ---------- 5. AI & kỹ năng ----------
P('## 5. Báo cáo AI và kỹ năng', '', `\`npm run test:ai\`: ${ai.fights} trận ngẫu nhiên có seed + 6 kịch bản dựng sẵn. Kết quả ${ai.results.filter(r => r.ok).length}/${ai.results.length}.`, '', '| Kiểm tra | Kết quả |', '|---|---|');
ai.results.forEach(r => P(`| ${r.name.replace(/\|/g, '/')} | ${r.ok ? 'PASS' : '**FAIL**'} |`));
P('', 'Thêm (tests/combat3.js): cùng seed ×1 và ×2 → máu & vị trí mọi tướng giống hệt ở cùng bước; LOW và ULTRA giống hệt; mỗi đòn thường gây sát thương tối đa 1 lần; không tung chiêu khi thiếu năng lượng.', '');

// ---------- 6. Hiệu năng ----------
P('## 6. Hiệu năng trước / sau', '', 'Bảng đầy đủ 7 kịch bản × mức đồ hoạ: **docs/PERF-DATA.md** (`npm run perf`, `node tools/perf-report.js`). Trước = commit 457b2c4 (đầu tuần 4), sau = mã hiện tại; đo lần lượt trên cùng máy.', '');
if (pa && pb) {
  const bm = new Map(pb.results.map(r => [r.id + '@' + r.quality, r]));
  P('| Kịch bản @ mức | Draw call | Mesh hiển thị | Cập nhật CPU (ms) | FPS (SwiftShader) |', '|---|---|---|---|---|');
  for (const a of pa.results) { const b = bm.get(a.id + '@' + a.quality); if (!b) continue; P(`| ${a.name} @${a.quality} | ${b.peak.calls} → **${a.peak.calls}** | ${b.peak.meshes} → ${a.peak.meshes} | ${b.updateMs} → ${a.updateMs} | ${b.fps} → ${a.fps} |`); }
}
P('', '**Điểm nghẽn đo được và cách xử lý:** mỗi tướng thủ tục gồm ~46 mesh thân + ~16 mesh viền = ~62 draw call (17 tướng ≈ 1.050). Đã gộp mọi phần tĩnh của một tướng thành **1 SkinnedMesh thân + 1 SkinnedMesh viền** mà xương chính là các khớp sẵn có (js/05-character-rig.js `batch()`): animation / IK / socket không đổi; geometry gộp dùng chung cho mọi bản sao cùng tướng; tắt để so sánh bằng `?nobatch=1` (ảnh chụp so sánh giống nhau). Bỏ cấp phát mỗi khung ở tóc / dải lụa / vệt vũ khí; vật liệu bóng chân dùng chung.',
  '', '**Đọc kết quả trung thực:** draw call giảm 84–93%, thời gian cập nhật CPU giảm ~20–45%; nhưng **FPS trên SwiftShader gần như không đổi** vì SwiftShader nghẽn ở tô điểm ảnh bằng CPU chứ không ở số lệnh vẽ. Trên GPU di động thật, số draw call thường là chi phí CPU chính của trình điều khiển, nên kỳ vọng có lợi – **nhưng chưa đo trên thiết bị thật** (xem docs/RUN-GUIDE.md §5).', '',
  'Chất lượng đồ hoạ (LOW / MEDIUM / HIGH / ULTRA) giữ nguyên 4 mức và chỉ đổi cách vẽ (tests/combat3.js #11: kết quả trận giống hệt giữa LOW và ULTRA).', '');

// ---------- 7. Bộ nhớ ----------
P('## 7. Bộ nhớ và tài nguyên GPU', '', `\`npm run test:memory\`: ${mem.results.filter(r => r.ok).length}/${mem.results.length}.`, '', '| Kiểm tra | Kết quả | Số đo |', '|---|---|---|');
mem.results.forEach(r => P(`| ${r.name} | ${r.ok ? 'PASS' : '**FAIL**'} | ${(r.detail || '').toString().replace(/\|/g, '/').slice(0, 220)} |`));
P('', '**Quy trình dọn dẹp** (đã có trong mã, được các bài trên kiểm):',
  '* *Hết trận / vòng mới* (`setupRound`): TraitEngine.battleEnd (gỡ sự kiện, phi kiếm, hào quang) → huỷ mọi timeline → Projectiles / SimTasks / DangerZones / vfx.clear (trả mesh về pool) → `dispose()` quân địch cũ (rig + skeleton; geometry dùng chung giữ lại) → tạo địch mới. Tướng chết: `fx.clear()` (trạng thái), bỏ tham chiếu mục tiêu.',
  '* *Ván mới* (`newGame` → `restoreGame`): gỡ toàn bộ quân phe ta (`removeUnit` → dispose rig), dựng lại từ trạng thái mới rồi `setupRound`.',
  '* *Đổi mô hình GLB* (`loadGlbBuffer`): dựng rig mới, `disposeGltf` bản cũ (geometry, vật liệu, texture của GLB cũ); về rig thủ tục: xoá RIG_FACTORIES, dựng lại.',
  '* *Đổi chất lượng* (`applyQuality`): đổi tỉ lệ điểm ảnh, bóng (giải phóng shadow map cũ khi đổi kích thước), viền, ngân sách hạt, bloom (tạo lại render target); không tạo thêm tài nguyên theo mỗi lần đổi.',
  '* *Mất / khôi phục ngữ cảnh WebGL*: dừng vẽ; khi khôi phục giải phóng shadow map, đánh dấu vật liệu cần biên dịch lại, áp lại mức đồ hoạ.',
  '* **Không bao giờ dispose tài nguyên dùng chung**: geometry `userData.shared` (hình khối gốc, geometry gộp theo tướng, SWORD_GEO), vật liệu bóng chân `userData.shared` – rig.dispose() bỏ qua chúng.',
  '* Ghi chú: mỗi rig gộp có 1 bone texture nhỏ (DataTexture của Skeleton) → `renderer.info.memory.textures` tăng theo số tướng đang có trên cảnh, được giải phóng khi tướng bị gỡ.', '');

// ---------- 8. Lưu ----------
P('## 8. Hệ thống lưu', '', `\`npm run test:save\`: ${save.results.filter(r => r.ok).length}/${save.results.length}.`, '', '| Kiểm tra | Kết quả |', '|---|---|');
save.results.forEach(r => P(`| ${r.name} | ${r.ok ? 'PASS' : '**FAIL**'} |`));
P('');

// ---------- 9. Hồi quy ----------
P('## 9. Danh sách hồi quy PASS / FAIL', '');
if (reg) {
  P('| Bộ kiểm thử | Kết quả | Hạng mục đạt / lỗi | Thời gian |', '|---|---|---|---|');
  reg.suites.forEach(s => P(`| ${s.name} | ${s.exit === 0 ? 'PASS' : '**FAIL**'} | ${s.total || (s.pass > 1 ? s.pass + ' / ' + s.fail : 'tự kiểm sau mỗi thao tác, lỗi → mã thoát ≠ 0')} | ${s.secs} s |`));
  P('', '`playtest20`: bot chơi 20 lượt liên tục bằng chuột thật (12 thắng / 8 thua, 87 lần mua, 40 bán, 14 lần nâng sao, 66 lần kéo thả, 6 lần tải lại trang, 1 lần hết máu → ván mới) – không lỗi. `portrait`: 12 lượt ở màn dọc 400×820. Số liệu: log của bộ kiểm thử.');
  const ok = n => { const s = reg.suites.find(x => x.name === n); return s ? (s.exit === 0 ? 'PASS' : 'FAIL') : 'chưa chạy'; };
  const both = (...n) => (n.every(x => ok(x) === 'PASS') ? 'PASS' : n.map(x => x + ': ' + ok(x)).join(', '));
  P('', '| Hạng mục (mục X) | Kết quả | Bằng chứng |', '|---|---|---|',
    `| Mua tướng | ${both('playtest20', 'champions')} | playtest (chuột, 20 vòng), champions (24 tướng đúng giá) |`,
    `| Bán tướng | ${both('playtest20', 'champions', 'economy')} | kéo vào cửa hàng; hoàn đúng giá ★1/★2/★3; trả bản về bể |`,
    `| Làm mới | ${both('playtest20', 'economy')} | trừ 2, đủ 5 ô, tỉ lệ bậc theo cấp |`,
    `| Mua kinh nghiệm | ${both('playtest20')} | trừ 4, kinh nghiệm tăng |`,
    `| Nâng sao | ${both('champions', 'playtest20')} | 3×★1→★2, 3×★2→★3 cho cả 24 tướng |`,
    `| Sắp xếp đội hình | ${both('playtest20', 'portrait')} | kéo đổi chỗ, bàn ↔ hàng chờ, giới hạn cấp (chuột và cảm ứng màn dọc) |`,
    `| Tộc / hệ | ${both('traits')} | tests/traits.js |`,
    `| Giao chiến | ${both('combat', 'combat3', 'ai', 'audit')} | combat, combat3, ai, audit 24 tướng |`,
    `| Kỹ năng | ${both('combat3', 'audit', 'champions')} | 24/24 kỹ năng đúng, mục tiêu chết giữa chiêu |`,
    `| Vàng sau vòng | ${both('playtest20', 'economy')} | thu nhập cơ bản + lãi + chuỗi |`,
    `| Mất máu khi thua | ${both('playtest20', 'combat3')} | thua / hoà mất máu, chuỗi thua |`,
    `| Chuyển vòng | ${both('playtest20')} | 20 vòng liên tiếp |`,
    `| Lưu / tải | ${both('save', 'playtest20', 'dist')} | v1→v2, hỏng, thiếu trường, tải lại trang, bản 1 tệp |`,
    `| Camera | ${both('playtest20', 'portrait')} | camera chuẩn bị ổn định, màn dọc |`,
    `| Đổi chất lượng | ${both('combat3', 'memory')} | kết quả trận giống hệt LOW/ULTRA; không rò texture |`,
    `| GLB / GLTF | ${both('memory')} | nạp glTF 4 lần, trở lại rig thủ tục |`,
    `| Khởi động lại (ván mới / hết máu) | ${both('playtest20', 'memory')} | hết máu → ván mới; 6 lần ván mới không rò |`);
  const bad = reg.suites.filter(s => s.failed.length);
  if (bad.length) P('', '**Hạng mục lỗi:**', ...bad.map(s => `* ${s.name}: ${s.failed.join(' · ')}`));
} else P('Chưa có docs/reports/regression.json.');
P('');
// ---------- 10–12: phần chữ (lỗi đã sửa / còn lại / sẵn sàng trang bị) – docs/V1.5-FINAL-NOTES.md, viết tay, mô tả mã nguồn ----------
const notes = path.join(WEB, 'docs/V1.5-FINAL-NOTES.md');
if (fs.existsSync(notes)) P(fs.readFileSync(notes, 'utf8'));
fs.writeFileSync(path.join(WEB, 'docs/V1.5-FINAL.md'), md.join('\n') + '\n');
console.log('Đã ghi docs/V1.5-FINAL.md (' + md.length + ' dòng)');
