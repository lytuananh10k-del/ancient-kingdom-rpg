// Kiểm thử cảm ứng (giả lập Android bằng Playwright: hasTouch + isMobile, sự kiện chạm thật qua CDP) + bố cục màn ngang / dọc.
// Cần ảo (kéo ngón tay), nút nhảy / bay / hạ, giữ nút đánh, nút kỹ năng, nút đan, nút Nói chuyện, chạm quái để chọn mục tiêu, bảng phủ.
// Bố cục: các nút ảo không chồng nhau, không đè HUD, nằm trong màn hình; bảng phủ vừa màn hình. SHOTS=1: lưu ảnh chụp vào docs/shots/.
// Chạy: cd web && npm run test:touch      (VIEWS="844x390,400x820,1280x720")
// Lưu ý: đây là GIẢ LẬP cảm ứng trên Chromium headless, không thay cho thử trên điện thoại thật.
'use strict';
const { openGame, check, results } = require('./harness');
const fs = require('fs');
const path = require('path');

const VIEWS = (process.env.VIEWS || '844x390,400x820').split(',');
const SHOTS = path.join(__dirname, '..', 'docs', 'shots'); if (process.env.SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  for (const view of VIEWS) {
    console.log('== Màn ' + view + ' (cảm ứng)');
    const { browser, ctx, page, errors } = await openGame({ view, touch: true });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const center = async sel => { const b = await page.locator(sel).first().boundingBox(); return b ? [b.x + b.width / 2, b.y + b.height / 2] : null; };
    const ev = (fn, a) => page.evaluate(fn, a);
    const waitFor = (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms, polling: 50 }).catch(() => {});
    // tạo nhân vật bằng chạm
    await page.tap('#btn-new'); await page.tap('.sect[data-s="vo"]'); await page.tap('#c-looks .look:nth-child(2)');
    await page.fill('#c-name', 'CamUng'); await page.tap('#c-go');
    await waitFor(() => window.__vkkt.Game.playing);
    check(await ev(() => window.__vkkt.G.sect === 'vo' && window.__vkkt.G.look === window.__vkkt.SECTS.vo.looks[1]), 'chạm: chọn Võ Tông + ngoại hình thứ 2, tạo nhân vật');
    check(await page.isVisible('#pad') && await page.isVisible('#actions'), 'thiết bị cảm ứng: hiện cần ảo + nút chiêu');
    // cần ảo: chạm giữ rồi kéo sang phải
    const pc = await center('#pad'), x0 = await ev(() => window.__vkkt.Ents.player.pos.x);
    await touch('touchStart', [pc]); await touch('touchMove', [[pc[0] + 60, pc[1]]]);
    await waitFor(`window.__vkkt.Ents.player.pos.x > ${x0 + 2}`);
    const x1 = await ev(() => window.__vkkt.Ents.player.pos.x);
    await touch('touchMove', [[pc[0] - 60, pc[1]]]);
    await waitFor(`window.__vkkt.Ents.player.pos.x < ${x1 - 1}`);
    const x2 = await ev(() => ({ x: window.__vkkt.Ents.player.pos.x, f: window.__vkkt.Ents.player.facing }));
    await touch('touchEnd', []);
    check(x1 > x0 + 2 && x2.x < x1 - 1 && x2.f === -1, 'kéo cần ảo phải / trái: nhân vật chạy theo, quay mặt', { x0, x1, x2 });
    await ev(() => window.__vkkt.simulate(0.5));
    check(await ev(() => Math.abs(window.__vkkt.Ents.player.vel.x) < 0.5), 'thả cần ảo: dừng lại');
    // nút nhảy 2 lần → bay; nút hạ → đáp
    const jc = await center('.a-jump');
    await touch('touchStart', [jc]); await waitFor(() => !window.__vkkt.Ents.player.onGround, 4000); await touch('touchEnd', []);
    await page.waitForTimeout(120);
    await touch('touchStart', [jc]); await waitFor(() => window.__vkkt.Ents.player.flying, 4000);
    const fly = await ev(() => window.__vkkt.Ents.player.flying);
    await touch('touchEnd', []);
    check(fly, 'chạm ⇑ hai lần: nhảy rồi bay');
    const dc = await center('.a-down');
    await touch('touchStart', [dc]); await waitFor(() => !window.__vkkt.Ents.player.flying && window.__vkkt.Ents.player.onGround, 10000); await touch('touchEnd', []);
    check(await ev(() => !window.__vkkt.Ents.player.flying), 'giữ ⇓: hạ xuống đất');
    // Nói chuyện với Sư Phụ bằng nút ảo
    await ev(() => { const K = window.__vkkt, m = K.Ents.npcs.find(n => n.role === 'master'); K.Ents.player.pos.x = m.pos.x - 1; K.simulate(0.05); });
    await waitFor(() => !document.querySelector('.a-talk').hidden, 3000);
    await page.tap('.a-talk');
    check(await page.isVisible('#panel') && /Sư Phụ/.test(await page.textContent('#p-title')), 'nút "Nói chuyện" hiện cạnh NPC, chạm mở hội thoại');
    const pb = await page.locator('.pbox').boundingBox(), vp = page.viewportSize();
    check(pb.x >= 0 && pb.y >= 0 && pb.x + pb.width <= vp.width + 1 && pb.y + pb.height <= vp.height + 1, 'bảng hội thoại nằm gọn trong màn hình', pb);
    if (process.env.SHOTS) await page.screenshot({ path: path.join(SHOTS, `touch-${view}-npc.png`) });
    await page.tap('#p-close');
    // bản đồ quái: chạm quái để chọn mục tiêu, giữ nút đánh
    await ev(() => window.__vkkt.Game.travel('C1', 1));
    await waitFor(() => window.__vkkt.World.id === 'C1' && !window.__vkkt.Game.traveling);
    const tgt = await ev(() => { const K = window.__vkkt, P = K.Ents.player, m = K.Ents.monsters[0]; for (const o of K.Ents.monsters.slice(1)) o.dispose(); K.Ents.monsters.length = 1; for (const b of K.Ents.bots) b.dispose(); K.Ents.bots.length = 0;   // chỉ để 1 con quái → điểm chạm không mơ hồ
      P.pos.x = m.pos.x - 3; m.home = m.pos.x; m.aggroR = 0; P.facing = 1; K.simulate(0.05); K.SideCam.snap(P); m.center(window._c = new THREE.Vector3()); window._m = m; window._h0 = m.hp; return true; });
    await page.waitForTimeout(300);
    const mp = await ev(() => { const v = window._m.center(new THREE.Vector3()).project(window.__vkkt.camera); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; });
    await page.touchscreen.tap(mp[0], mp[1]);
    check(await ev(() => window.__vkkt.Ents.player.target === window._m), 'chạm vào quái trên màn: chọn làm mục tiêu', mp);
    const ac = await center('.a-attack');
    await touch('touchStart', [ac]); await waitFor(() => window._m.hp < window._h0, 10000);
    const hit = await ev(() => ({ h: window._m.hp, h0: window._h0 }));
    await touch('touchEnd', []);
    check(hit.h < hit.h0, 'giữ nút ⚔: tự tiến tới mục tiêu và đánh trúng', hit);
    const mp0 = await ev(() => { const P = window.__vkkt.Ents.player; P.busy = 0; P.mp = P.maxMp; return P.mp; });
    await page.tap('.a-s0'); await page.waitForTimeout(200);
    check(await ev(m => window.__vkkt.Ents.player.mp < m, mp0), 'chạm nút kỹ năng: thi triển (tốn linh lực)');
    if (process.env.SHOTS) await page.screenshot({ path: path.join(SHOTS, `touch-${view}-fight.png`) });
    // bố cục: nút ảo không chồng nhau / không đè HUD / trong màn
    const L = await ev(() => {
      const r = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, id: el.className || el.id }; };
      const btns = [...document.querySelectorAll('#actions > button')].filter(b => !b.hidden).map(r);
      const hud = [document.getElementById('hud'), document.getElementById('hud-r'), document.getElementById('pad')].map(r);
      return { btns, hud, W: innerWidth, H: innerHeight };
    });
    const ov = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
    const bad = [];
    L.btns.forEach((a, i) => L.btns.forEach((b, j) => { if (j > i && ov(a, b)) bad.push(a.id + ' × ' + b.id); }));
    L.btns.forEach(a => L.hud.forEach(h => { if (ov(a, h)) bad.push(a.id + ' × ' + h.id); }));
    const out = L.btns.concat(L.hud).filter(a => a.l < -1 || a.t < -1 || a.r > L.W + 1 || a.b > L.H + 1).map(a => a.id);
    check(bad.length === 0, 'nút ảo không chồng lên nhau hay lên HUD / cần ảo', bad);
    check(out.length === 0, 'mọi nút + HUD nằm trong màn hình', out);
    const size = L.btns.map(b => Math.min(b.r - b.l, b.b - b.t));
    check(Math.min(...size) >= 36, 'nút ảo đủ lớn cho ngón tay (≥ 36 px)', Math.min(...size));
    check(errors.length === 0, 'không lỗi console', errors.slice(0, 3));
    await browser.close();
  }
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} kiểm tra cảm ứng đạt`);
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'reports', 'rpg-touch.json'), JSON.stringify({ when: new Date().toISOString(), views: VIEWS, pass, total: results.length, results, note: 'Giả lập cảm ứng Playwright (Chromium headless, SwiftShader) – không phải thiết bị thật' }, null, 1));
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
