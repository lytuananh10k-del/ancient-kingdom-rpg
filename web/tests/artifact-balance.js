// Thí nghiệm giá trị biên của 36 pháp bảo (có đối chứng): cùng đội, cùng đối thủ, cùng seed; tướng mang đồ = tướng đắt nhất đội ta,
// lần lượt mang KHÔNG GÌ hoặc 1 trong 36 pháp bảo → chênh lệch tỉ lệ thắng = giá trị của món đó (trung bình qua nhiều vai trò).
// Chạy: cd web && npm run artifact-balance   (N=… cặp trận / pháp bảo, mặc định 60) → docs/reports/artifact-balance.json, docs/ARTIFACT-BALANCE.md
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const N = +(process.env.N || 60), SEED = +(process.env.SEED || 606), ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;   // ONLY=id1,id2: đo riêng vài món (mẫu lớn)
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
  await page.reload(); await page.click('#btn-enter');
  const save0 = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('vkkt_save')); delete o.savedAt; return JSON.stringify(o); });
  console.log(`36 pháp bảo × ${N} cặp trận (+ đối chứng không đồ), seed ${SEED}…`);
  const rep = await page.evaluate(([n, seed, only]) => {
    const K = window.__vkkt, snap = K.snapshotGame(), t0 = performance.now();
    let s = seed >>> 0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const keys = ['none'].concat(only || K.ARTIFACT_LIST.map(r => r[0])), res = Object.fromEntries(keys.map(k => [k, { w: 0, n: 0, dealt: 0, taken: 0, healed: 0, shielded: 0, procs: 0, survival: 0 }]));
    const roles = {};
    K.battle.sandbox = true;
    for (let i = 0; i < n; i++) {
      const level = 5 + Math.floor(rnd() * 3), budget = level * 2.4;
      const A = K.BalanceSimulator.makeTeam(rnd, level, budget - 1, false).units, B = K.BalanceSimulator.makeTeam(rnd, level, budget, true).units;
      const ci = A.reduce((bi, u, j) => (K.UNIT_DEFS[u[0]].cost * 10 + u[1] > K.UNIT_DEFS[A[bi][0]].cost * 10 + A[bi][1] ? j : bi), 0);
      const role = K.UNIT_DEFS[A[ci][0]].role; roles[role] = (roles[role] || 0) + 1;
      for (const k of keys) {
        const allies = A.map((u, j) => (j === ci ? u.concat([k === 'none' ? [] : [k]]) : u));
        const r = K.CombatTestRunner.run({ allies, enemies: B, seed: seed * 13 + i, keepState: true });
        const a = res[k], u = r.allies[ci], st = K.units.find(x => x.team === 'ally' && x.key === A[ci][0]);
        a.n++; a.w += r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0; a.dealt += u.dealt; a.taken += u.taken; a.healed += u.healed; a.shielded += u.shielded; a.survival += u.survival;
        a.procs += st && st.artStats ? st.artStats.reduce((x, y) => x + y.procs, 0) : 0;
        K.nextRound();
      }
    }
    K.restoreGame(snap);
    const base = res.none.w / res.none.n;
    return { n, seed, ms: Math.round(performance.now() - t0), roles, base,
      rows: keys.map(k => { const a = res[k], avg = f => +(a[f] / a.n).toFixed(1); return { id: k, name: k === 'none' ? '(không đồ)' : K.ARTIFACTS[k].name, kind: k === 'none' ? '' : K.ARTIFACTS[k].passive.kind,
        winRate: +(a.w / a.n).toFixed(3), delta: +((a.w / a.n) - base).toFixed(3), dealt: avg('dealt'), taken: avg('taken'), healed: avg('healed'), shielded: avg('shielded'), procs: avg('procs'), survival: avg('survival') }; }) };
  }, [N, SEED, ONLY]);
  const save1 = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('vkkt_save')); delete o.savedAt; return JSON.stringify(o); });
  const pct = x => (x * 100).toFixed(1) + '%';
  const arts = rep.rows.filter(r => r.id !== 'none'), sorted = arts.slice().sort((a, b) => b.delta - a.delta);
  const mean = arts.reduce((a, r) => a + r.delta, 0) / arts.length, sd = Math.sqrt(arts.reduce((a, r) => a + (r.delta - mean) ** 2, 0) / arts.length);
  const md = [`# Giá trị biên của 36 pháp bảo – ${rep.n} cặp trận / pháp bảo (seed ${rep.seed})`, '',
    `> Sinh bởi \`npm run artifact-balance\` (tests/artifact-balance.js), ${(rep.ms / 1000).toFixed(0)} s mô phỏng không render (${rep.n * 37} trận). Cùng đội (cân ngân sách, đội ta kém 1 linh thạch) + cùng đối thủ + cùng seed; tướng mang đồ = tướng đắt nhất đội ta (vai trò: ${Object.entries(rep.roles).map(([k, v]) => k + ' ' + v).join(', ')}); chỉ đổi 1 pháp bảo. Đối chứng không đồ: thắng **${pct(rep.base)}**. Bản lưu thật ${save0 === save1 ? 'không bị thay đổi' : '**BỊ THAY ĐỔI**'}.`, '',
    `Chênh lệch trung bình ${pct(mean)}, độ lệch chuẩn ${pct(sd)}. Với ${rep.n} cặp, sai số chuẩn của một tỉ lệ ~${pct(Math.sqrt(0.25 / rep.n))} – chỉ khác biệt lớn (> ~2 sai số) mới có ý nghĩa.`, '',
    '| # | Pháp bảo | Nội tại | Thắng | Chênh lệch | Sát thương TB (người mang) | Nhận | Hồi | Khiên | Lần kích hoạt | Sống (s) |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  sorted.forEach((r, i) => md.push(`| ${i + 1} | ${r.name} | ${r.kind} | ${pct(r.winRate)} | ${r.delta >= 0 ? '+' : ''}${pct(r.delta)} | ${r.dealt} | ${r.taken} | ${r.healed} | ${r.shielded} | ${r.procs} | ${r.survival} |`));
  const none = rep.rows.find(r => r.id === 'none');
  md.push(`| – | (không đồ) | – | ${pct(none.winRate)} | 0 | ${none.dealt} | ${none.taken} | ${none.healed} | ${none.shielded} | – | ${none.survival} |`, '',
    '**Cảnh báo tự động:** ' + ([...sorted.filter(r => r.delta - mean > 2.5 * sd).map(r => r.name + ' mạnh hơn hẳn (' + pct(r.delta) + ')'), ...sorted.filter(r => r.delta < 0).map(r => r.name + ' không tăng tỉ lệ thắng (' + pct(r.delta) + ')')].join('; ') || 'không món nào lệch quá 2,5 độ lệch chuẩn hoặc làm giảm tỉ lệ thắng.'), '',
    `Lỗi console: ${errors.length}.`, '');
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  const tag = ONLY ? '-' + ONLY.length + 'mon-N' + N : '';   // đo riêng: tệp kết quả riêng, không ghi đè bảng 36 món
  fs.writeFileSync(path.join(WEB, `docs/reports/artifact-balance${tag}.json`), JSON.stringify(rep, null, 1));
  if (!ONLY) fs.writeFileSync(path.join(WEB, 'docs/ARTIFACT-BALANCE.md'), md.join('\n'));
  console.log(md.slice(4, 8).join('\n')); console.log(sorted.slice(0, 5).map(r => r.name + ' ' + pct(r.delta)).join(' · '), ' … ', sorted.slice(-5).map(r => r.name + ' ' + pct(r.delta)).join(' · '));
  console.log('lỗi console:', errors.length, errors.slice(0, 3));
  await browser.close();
  process.exit(errors.length || save0 !== save1 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
