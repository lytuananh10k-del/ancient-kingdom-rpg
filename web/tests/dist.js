// Kiểm thử bản đóng gói 1 tệp (dist/Vạn Kiếm Kỳ Trận V1.5 FINAL.html) mở bằng file:// – KHÔNG cho truy cập mạng (chặn mọi http/https):
// phải tự chạy (three.js đã nhúng), vào trận, đánh xong một trận, lưu / tải lại được, không lỗi.
// Chạy: cd web && npm run build && npm run test:dist
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '..', 'dist', 'Vạn Kiếm Kỳ Trận V1.5 FINAL.html');
(async () => {
  if (!fs.existsSync(FILE)) { console.error('Chưa có bản đóng gói – chạy npm run build'); process.exit(1); }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = [], blocked = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/^https?:/, r => { blocked.push(r.request().url()); return r.abort(); });   // giả lập không có mạng
  await page.goto('file://' + FILE);
  await page.waitForFunction(() => window.__vkkt && window.__vkkt.units, null, { timeout: 30000 });
  await page.click('#btn-enter');
  const r = await page.evaluate(() => {
    const K = window.__vkkt; K.startBattle(); K.simulate(62);
    return { three: THREE.REVISION, phase: K.battle.phase, result: K.battle.result, units: K.units.length, saved: !!localStorage.getItem('vkkt_save') };
  });
  await page.reload(); await page.waitForFunction(() => window.__vkkt && window.__vkkt.units);
  const enter = await page.textContent('#btn-enter');
  const ok = r.three === '128' && r.phase !== 'fight' && r.saved && errors.length === 0 && blocked.every(u => /fonts\./.test(u));
  console.log(JSON.stringify({ ...r, enter, blockedNonFont: blocked.filter(u => !/fonts\./.test(u)), errors }, null, 1));
  console.log(ok ? 'PASS bản 1 tệp chạy không cần mạng (chỉ phông chữ bị chặn)' : 'FAIL bản 1 tệp');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
