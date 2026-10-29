// Khung chạy chung cho các bài kiểm thử phiêu lưu: mở game trong Chromium headless (WebGL SwiftShader), phục vụ web/ từ đĩa,
// three.js từ node_modules/three (hoặc THREE_DIR) thay CDN, chặn phông Google. Gom lỗi console / pageerror.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';

async function openGame({ view = process.env.VIEW || '844x390', touch = process.env.TOUCH === '1', clear = true, query = '' } = {}) {
  const [w, h] = view.split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 4).join('\n') : '')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + fs.readFileSync(path.join(WEB, 'index.html'), 'utf8') + '</body></html>' });
    const f = path.join(WEB, decodeURIComponent(u.pathname));
    return fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' });
  });
  if (THREE_DIR) await page.route(/three\.min\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'build/three.min.js') }));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(ORIGIN + '/' + query);
  if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  await page.waitForFunction(() => window.__vkkt && window.__vkkt.Game, null, { timeout: 30000 });
  return { browser, ctx, page, errors };
}
/** Tạo nhân vật qua giao diện thật (chọn tông môn, ngoại hình, nhập tên, bấm nút). */
async function createCharacter(page, sect = 'kiem', name = 'KiemThu', lookIdx = 0) {
  await page.click('#btn-new');
  await page.click(`.sect[data-s="${sect}"]`);
  const looks = await page.$$('#c-looks .look'); if (looks[lookIdx]) await looks[lookIdx].click();
  await page.fill('#c-name', name);
  await page.click('#c-go');
  await page.waitForFunction(() => window.__vkkt.Game.playing, null, { timeout: 10000 });
}
const results = [];
function check(cond, msg, extra) {
  results.push({ ok: !!cond, msg });
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra !== undefined && !cond ? ' ' + JSON.stringify(extra) : ''));
  return !!cond;
}
module.exports = { openGame, createCharacter, check, results, WEB, THREE_DIR };
