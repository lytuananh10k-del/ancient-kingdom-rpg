// Kiểm thử bản đóng gói 1 tệp (dist/Van_Kiem_Ky_Tran_Phieu_Luu_V2.0.html) mở bằng file:// – CHẶN mọi truy cập http/https (giả lập không mạng):
// phải tự chạy (three.js đã nhúng), tạo nhân vật, đánh quái, lưu, tải lại trang → Tiếp tục, không lỗi.
// Chạy: cd web && npm run build && npm run test:dist
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '..', 'dist', 'Van_Kiem_Ky_Tran_Phieu_Luu_V2.0.html');
(async () => {
  if (!fs.existsSync(FILE)) { console.error('Chưa có bản đóng gói – chạy npm run build'); process.exit(1); }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = [], blocked = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/^https?:/, r => { blocked.push(r.request().url()); return r.abort(); });
  await page.goto('file://' + FILE);
  await page.waitForFunction(() => window.__vkkt && window.__vkkt.Game, null, { timeout: 30000 });
  await page.click('#btn-new'); await page.click('.sect[data-s="phap"]'); await page.fill('#c-name', 'BanMotTep'); await page.click('#c-go');
  await page.waitForFunction(() => window.__vkkt.Game.playing);
  const r = await page.evaluate(() => {
    const K = window.__vkkt, P = K.Ents.player; K.Game.enter('B1'); P.pos.set(20, K.World.groundAt(20), 0);
    const k0 = K.G.kills; for (let i = 0; i < 40 && K.G.kills < k0 + 2; i++) { P.target = K.Ents.monsters.filter(m => !m.dead).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x))[0]; K.keys.add('attack'); K.syncInput(); K.simulate(1); P.hp = P.maxHp; }
    K.keys.clear(); K.syncInput(); K.Save.now();
    return { three: THREE.REVISION, kills: K.G.kills - k0, tv: Math.round(K.G.tv), saved: !!localStorage.getItem('vkkt_rpg_save') };
  });
  await page.reload(); await page.waitForFunction(() => window.__vkkt && window.__vkkt.Game);
  const cont = await page.textContent('#btn-continue'), vis = await page.isVisible('#btn-continue');
  const nonFont = blocked.filter(u => !/fonts\./.test(u));
  const ok = r.three === '128' && r.kills >= 2 && r.saved && vis && /BanMotTep/.test(cont) && errors.length === 0 && nonFont.length === 0;
  console.log(JSON.stringify({ ...r, cont, blockedNonFont: nonFont, errors }, null, 1));
  console.log(ok ? 'PASS bản 1 tệp chạy không cần mạng (chỉ phông chữ bị chặn): tạo nhân vật, hạ quái, lưu, tải lại' : 'FAIL bản 1 tệp');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
