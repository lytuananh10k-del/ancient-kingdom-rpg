// BalanceSimulator – chạy N trận (mặc định 1200, N=… để đổi) có seed, xuất:
//   docs/reports/balance-sim.json (toàn bộ, kể cả từng trận) · docs/reports/balance-champions.csv · docs/reports/balance-fights.csv · docs/BALANCE-SIM.md
// Chạy: cd web && npm run simulate        (SEED=…, N=…)
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const N = +(process.env.N || 1200), SEED = +(process.env.SEED || 2024);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>' + fs.readFileSync(path.join(WEB, 'index.html'), 'utf8') + '</body></html>' });
    const f = path.join(WEB, decodeURIComponent(u.pathname));
    return f.startsWith(WEB) && fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' });
  });
  if (THREE_DIR) {
    await page.route(/three\.min\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'build/three.min.js') }));
    await page.route(/GLTFLoader\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/loaders/GLTFLoader.js') }));
    await page.route(/SkeletonUtils\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/utils/SkeletonUtils.js') }));
  }
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(ORIGIN + '/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); localStorage.setItem('vkkt_quality', '"LOW"'); });
  await page.reload();
  await page.click('#btn-enter');
  const save0 = await page.evaluate(() => localStorage.getItem('vkkt_save'));
  console.log(`BalanceSimulator: ${N} trận, seed ${SEED}…`);
  const rep = await page.evaluate(([n, seed]) => window.__vkkt.BalanceSimulator.run({ n, seed }), [N, SEED]);
  const save1 = await page.evaluate(() => localStorage.getItem('vkkt_save'));
  const csv = await page.evaluate(r => window.__vkkt.BalanceSimulator.toCSV(r), rep);
  const names = await page.evaluate(() => Object.fromEntries(window.__vkkt.CHAMPIONS.map(c => [c.id, { name: c.short || c.name, cost: c.cost, role: window.__vkkt.ROLES[c.role].name }])));
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/reports/balance-sim.json'), JSON.stringify(rep));
  fs.writeFileSync(path.join(WEB, 'docs/reports/balance-champions.csv'), csv.champions + '\n');
  fs.writeFileSync(path.join(WEB, 'docs/reports/balance-fights.csv'), csv.fights + '\n');
  const pct = x => (x * 100).toFixed(1) + '%';
  const md = [`# BalanceSimulator – ${rep.meta.n} trận (seed ${rep.meta.seed})`, '',
    `> Sinh tự động bởi \`npm run simulate\` (tests/simulate.js), ${(rep.meta.ms / 1000).toFixed(0)} s mô phỏng không render. Hai đội cân ngân sách vàng (giá × 3^(sao−1)), cấp 4–9 ngẫu nhiên, tỉ lệ bậc theo bảng cửa hàng, cận chiến hàng đầu / đánh xa hàng sau. Hai phe đều có tộc/hệ. Dữ liệu đầy đủ: reports/balance-sim.json, reports/balance-champions.csv, reports/balance-fights.csv.`, '',
    `Hoà ${rep.meta.draws} (${pct(rep.meta.draws / rep.meta.n)}) · thời lượng TB ${rep.meta.avgTime} s · dài nhất ${rep.meta.maxTime} s · bản lưu thật ${save0 === save1 ? 'không bị thay đổi' : '**BỊ THAY ĐỔI**'}.`, '',
    `Ngưỡng: ${Object.entries(rep.meta.thresholds).map(([k, v]) => k + ' = ' + v).join(' · ')}`, '',
    '## Tướng (tỉ lệ thắng của đội khi có mặt tướng, khoảng tin cậy 95% Wilson)', '',
    '| Tướng | Bậc | Vai trò | Số trận | Tỉ lệ thắng | KTC 95% | Sát thương TB (vật lý / phép / chuẩn) | DPS khi sống | Nhận | Máu hiệu dụng | Hồi | Khiên | Khống chế (s) | Số lần tung | Thời gian sống (s) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  Object.entries(rep.champions).sort((a, b) => b[1].winRate - a[1].winRate).forEach(([k, c]) => md.push(`| ${names[k].name} | ${names[k].cost} | ${names[k].role} | ${c.n} | ${pct(c.winRate)} | ${pct(c.ci95[0])}–${pct(c.ci95[1])} | ${Math.round(c.dealt)} (${Math.round(c.physical)} / ${Math.round(c.magic)} / ${Math.round(c.true)}) | ${c.dps} | ${Math.round(c.taken)} | ${Math.round(c.ehp)} | ${Math.round(c.healed)} | ${Math.round(c.shielded)} | ${c.cc} | ${c.casts} | ${c.survival} |`));
  const tbl = (title, m, label) => { md.push('', '## ' + title, '', '| ' + label + ' | Số lượt | Tỉ lệ thắng | Sát thương TB | Thời gian sống |', '|---|---|---|---|---|'); Object.entries(m).sort((a, b) => (a[0] > b[0] ? 1 : -1)).forEach(([k, c]) => md.push(`| ${k} | ${c.n} | ${pct(c.winRate)} | ${Math.round(c.dealt)} | ${c.survival} |`)); };
  tbl('Vai trò', rep.roles, 'Vai trò'); tbl('Bậc giá', rep.costs, 'Bậc'); tbl('Bậc × sao', rep.stars, 'Bậc★sao');
  md.push('', '## Tộc/hệ đang kích hoạt (mốc) – tỉ lệ thắng của đội', '', '| Tộc/hệ (mốc) | Số đội | Tỉ lệ thắng |', '|---|---|---|');
  Object.entries(rep.traits).sort((a, b) => (a[0] > b[0] ? 1 : -1)).forEach(([k, c]) => md.push(`| ${k} | ${c.n} | ${pct(c.winRate)} |`));
  md.push('', '## Cờ cảnh báo', '');
  const real = rep.flags.filter(f => f.kind !== 'ít dữ liệu');
  md.push(real.length ? real.map(f => `- ${f.key ? names[f.key].name + ': ' : ''}${f.kind}${f.winRate !== undefined ? ` (${pct(f.winRate)}, KTC ${pct(f.ci95[0])}–${pct(f.ci95[1])}, ${f.n} trận)` : f.rate !== undefined ? ` (${pct(f.rate)})` : ''}`).join('\n') : '- Không tướng nào vượt ngưỡng mạnh / yếu bất thường.');
  const few = rep.flags.filter(f => f.kind === 'ít dữ liệu'); if (few.length) md.push('- Ít dữ liệu (< ' + rep.meta.thresholds.minSamples + ' trận): ' + few.map(f => names[f.key].name + ' ' + f.n).join(', '));
  const byType = {}; rep.anomalies.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });
  md.push('', '## Bất thường', '', Object.keys(byType).length ? Object.entries(byType).map(([t, c]) => `- ${t}: ${c} lần` + ' – ví dụ ' + JSON.stringify(rep.anomalies.filter(a => a.type === t).slice(0, 3))).join('\n') : '- Không có.', '', `Lỗi console: ${errors.length}.`, '');
  fs.writeFileSync(path.join(WEB, 'docs/BALANCE-SIM.md'), md.join('\n'));
  console.log(md.slice(0, 8).join('\n'));
  console.log('Cờ:', JSON.stringify(real), '\nBất thường:', JSON.stringify(byType), '\nlỗi console:', errors.length);
  await browser.close();
  process.exit(errors.length || save0 !== save1 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
