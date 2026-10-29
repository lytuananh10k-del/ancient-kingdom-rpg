// Chụp ảnh giao diện thật (Chromium headless + SwiftShader) cho tài liệu / soát bố cục: màn mở đầu, tạo nhân vật, sơn môn, đánh quái,
// boss, các bảng (túi đồ, nhân vật, kỹ năng, luyện khí, Linh Thương, bản đồ, menu, Tế Đàn, điều ước). Lưu docs/shots/<view>-*.png.
// Chạy: cd web && node tests/rpg-shots.js      (VIEWS="844x390,400x820")
'use strict';
const { openGame, createCharacter } = require('./harness');
const fs = require('fs');
const path = require('path');

const VIEWS = (process.env.VIEWS || '844x390,400x820').split(',');
const OUT = path.join(__dirname, '..', 'docs', 'shots'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  for (const view of VIEWS) {
    const { browser, page, errors } = await openGame({ view, touch: view.startsWith('400') });
    const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, `${view}-${name}.png`) }); };
    const ev = (fn, a) => page.evaluate(fn, a);
    await page.waitForTimeout(600); await shot('01-intro');
    await page.click('#btn-new'); await page.click('.sect[data-s="phap"]'); await page.waitForTimeout(500); await shot('02-create');
    await page.click('#c-go'); await page.waitForFunction(() => window.__vkkt.Game.playing);
    await ev(() => { const K = window.__vkkt, m = K.Ents.npcs.find(n => n.role === 'master'); K.Ents.player.pos.x = m.pos.x - 3; K.SideCam.snap(K.Ents.player); });
    await shot('03-home');
    // chuẩn bị dữ liệu xem cho các bảng (đánh dấu debugUsed – chỉ để chụp ảnh)
    await ev(() => { const K = window.__vkkt, G = K.G; G.debugUsed = true; G.tv = 42000; G.lc = 30000; G.gold = 60000; G.gem = 40; K.Ents.player.recompute();
      for (const c of ['sword', 'staff', 'jade', 'glove']) K.Bag.add({ kind: 'comp', id: c, n: 2 }, true);
      K.Bag.add({ kind: 'equip', slot: 'gang', tier: 3, plus: 2 }, true); K.Bag.add({ kind: 'art', id: 'tru_tien_kiem', plus: 1 }, true); K.Bag.add({ kind: 'cons', id: 'hp_m', n: 12 }, true); K.Bag.add({ kind: 'dan', id: 'dan2', lv: 2, n: 6 }, true);
      K.equipItem(K.G.bag.find(b => b.kind === 'art').uid); for (const id of K.SECTS.phap.skills) G.skills[id] = 2; [1, 3, 4, 6].forEach(s => G.balls.push(s)); });
    for (const p of ['bag', 'char', 'skills', 'quest', 'map', 'menu']) { await ev(p => window.__vkkt.ui.open(p), p); await shot('10-' + p); }
    await ev(() => window.__vkkt.ui.open('smith', { tab: 'craft', a: 'sword', b: 'staff' })); await shot('11-smith');
    await ev(() => window.__vkkt.ui.open('shop', { tab: 'buy' })); await shot('12-shop');
    await ev(() => { const K = window.__vkkt; K.ui.open('npc', { npc: K.Ents.npcs.find(n => n.role === 'altar') }); }); await shot('13-altar');
    await ev(() => { const K = window.__vkkt; K.ui.open('npc', { npc: K.Ents.npcs.find(n => n.role === 'tree') }); }); await shot('14-tree');
    await ev(() => { const K = window.__vkkt; K.ui.cur = null; document.getElementById('panel').hidden = true; K.Game.enter('B2'); const P = K.Ents.player; P.pos.set(40, K.World.groundAt(40), 0); P.invuln = true; K.SideCam.snap(P); P.target = K.Ents.monsters[0]; });
    await ev(() => { const K = window.__vkkt, P = K.Ents.player; P.mp = P.maxMp; P.cd = {}; P.busy = 0; P.useSkill('phap_hoa'); });
    await page.waitForTimeout(900); await shot('20-fight');
    await ev(() => { const K = window.__vkkt; K.Game.enter('B3'); K.BossClock.spawn('B3'); const P = K.Ents.player, b = K.Ents.monsters.find(m => m.spec.boss); P.pos.set(b.pos.x - 6, K.World.groundAt(b.pos.x - 6), 0); K.SideCam.snap(P); P.target = b; P.mp = P.maxMp; P.cd = {}; P.busy = 0; P.useSkill('phap_loi'); });
    await page.waitForTimeout(1300); await shot('21-boss');
    await ev(() => { const K = window.__vkkt; K.Game.enter('D2'); const P = K.Ents.player; P.pos.set(60, K.World.groundAt(60) + 5, 0); P.flying = true; K.SideCam.snap(P); });
    await page.waitForTimeout(600); await shot('22-void-fly');
    await ev(() => { const K = window.__vkkt; K.Game.enter('B0'); for (let s = 1; s <= 7; s++) K.addBall(s); const a = K.Ents.npcs.find(n => n.role === 'altar'); K.Ents.player.pos.x = a.pos.x; K.SideCam.snap(K.Ents.player); K.Dragon.summon(); });
    await page.waitForTimeout(2900); await shot('23-dragon');
    console.log(view, 'xong', errors.length ? 'LỖI: ' + errors.slice(0, 3).join(' | ') : 'không lỗi');
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
