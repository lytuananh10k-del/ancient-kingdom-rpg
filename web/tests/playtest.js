// Bài chơi thử tự động cho Vạn Kiếm Kỳ Trận.
// Tự chơi nhiều vòng liên tục và kiểm tra sau mỗi thao tác:
//   mua / bán / làm mới / mua kinh nghiệm (linh thạch chính xác), nâng sao (bảo toàn số bản ★1 quy đổi),
//   kéo thả bằng chuột thật (hàng chờ ↔ bàn cờ, đổi chỗ, kéo vào cửa hàng để bán), giới hạn quân theo cấp,
//   hàng chờ 3D khớp dữ liệu, tộc/hệ, AI giao chiến (không NaN, không ra ngoài đài, có sát thương, kết thúc ≤ 90 s),
//   thu nhập & mất máu đúng công thức, lưu / tải lại trang giữa chừng, rò rỉ object trong scene, lỗi console.
//
// Chạy:  cd web && npm install && npm test            (mặc định 12 vòng, màn ngang 844×390)
//        ROUNDS=20 VIEW=400x820 node tests/playtest.js
//        TOUCH=1 VIEW=400x820 node tests/playtest.js     (thao tác bằng sự kiện chạm thật như trên Android)
// Three.js lấy từ node_modules/three (bản 0.128.0) thay cho CDN; đặt THREE_DIR để dùng thư mục khác.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const ROUNDS = +(process.env.ROUNDS || 12);
const [VW, VH] = (process.env.VIEW || '844x390').split('x').map(Number);
const SHOTS = process.env.SHOTS || '';
const TOUCH = process.env.TOUCH === '1';
const LIFT = 56;   // khớp TOUCH.lift trong js/15-input.js: kéo bằng ngón tay thì tướng nằm phía trên ngón tay
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';

const failures = [];
const log = (...a) => console.log(...a);
function check(cond, msg, extra) {
  if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); }
  return cond;
}

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, hasTouch: TOUCH, isMobile: TOUCH, deviceScaleFactor: TOUCH ? 2 : 1 });
  const page = await ctx.newPage();
  const cdp = TOUCH ? await ctx.newCDPSession(page) : null;
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });

  // Phục vụ file từ thư mục web/ (index.html được bọc doctype giống khi đăng artifact).
  await page.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/' || u.pathname === '/index.html') {
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(path.join(WEB, 'index.html'), 'utf8') + '</body></html>' });
    }
    const f = path.join(WEB, decodeURIComponent(u.pathname));
    if (!f.startsWith(WEB) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ path: f });
  });
  if (THREE_DIR) {
    await page.route(/three\.min\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'build/three.min.js') }));
    await page.route(/GLTFLoader\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/loaders/GLTFLoader.js') }));
    await page.route(/SkeletonUtils\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/utils/SkeletonUtils.js') }));
  }
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());

  const boot = async (fresh) => {
    if (fresh) await page.goto(ORIGIN + '/');
    if (!(await page.evaluate(() => !!window.__vkkt))) throw new Error('Game không khởi động:\n' + errors.join('\n'));
    await press('#btn-enter');
    await page.waitForTimeout(250);
  };
  const press = sel => (TOUCH ? page.tap(sel) : page.click(sel));
  await page.goto(ORIGIN + '/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await boot(false);

  const V = (fn, arg) => page.evaluate(fn, arg);
  const state = () => V(() => {
    const K = window.__vkkt, g = K.game;
    return {
      hp: g.hp, gold: g.gold, level: g.level, xp: g.xp, streak: g.streak, over: g.over, round: K.battle.round, phase: K.battle.phase,
      bench: g.bench.map(e => (e ? e.key + '*' + e.star : null)), shop: g.shop.slice(),
      board: K.boardAllies().map(u => u.key + '*' + u.star + '@' + u.homeTile.c + ',' + u.homeTile.r).sort(),
      cap: K.boardCap()
    };
  });
  /** Bất biến chung – gọi sau mỗi thao tác. */
  const invariants = async (where) => {
    const r = await V(() => {
      const K = window.__vkkt, g = K.game, out = [];
      if (!(g.gold >= 0) || !Number.isInteger(g.gold)) out.push('gold không hợp lệ: ' + g.gold);
      if (g.bench.length !== K.BENCH_SIZE) out.push('độ dài hàng chờ ' + g.bench.length);
      const allies = K.boardAllies();
      if (allies.length > K.boardCap()) out.push(`quá số quân: ${allies.length}/${K.boardCap()}`);
      const tiles = new Set();
      for (const u of allies) {
        const k = u.homeTile.c + ',' + u.homeTile.r;
        if (tiles.has(k)) out.push('hai quân cùng ô ' + k); tiles.add(k);
        if (u.homeTile.r < 0 || u.homeTile.r > 3 || u.homeTile.c < 0 || u.homeTile.c > 7) out.push('quân ngoài nửa bàn phe ta ' + k);
      }
      // Không còn nhóm 3 bản cùng tướng cùng sao (đã phải gộp).
      const groups = {};
      g.bench.forEach(e => { if (e && e.star < 3) groups[e.key + e.star] = (groups[e.key + e.star] || 0) + 1; });
      allies.forEach(u => { if (u.star < 3) groups[u.key + u.star] = (groups[u.key + u.star] || 0) + 1; });
      for (const k in groups) if (groups[k] >= 3) out.push('chưa gộp sao: ' + k + ' ×' + groups[k]);
      // Hàng chờ 3D khớp dữ liệu.
      for (let i = 0; i < K.BENCH_SIZE; i++) {
        const e = g.bench[i], u = K.benchUnits[i];
        if (!!e !== !!u || (e && (e.key !== u.key || e.star !== u.star))) out.push('hàng chờ 3D lệch ô ' + i);
        if (u && !u.rig.root.parent) out.push('quân hàng chờ không nằm trong scene ô ' + i);
      }
      // Vị trí: lúc chuẩn bị mọi tướng phải đứng đúng tâm ô / ô hàng chờ, không còn trạng thái đang kéo.
      if (K.battle.phase === 'prep') {
        for (const u of allies) { const c = K.tileCenter(u.homeTile.c, u.homeTile.r); if (Math.hypot(u.pos.x - c.x, u.pos.z - c.z) > 0.01 || Math.abs(u.pos.y) > 0.001 || u.dragging) out.push('tướng lệch ô ' + u.key + ' @' + u.homeTile.c + ',' + u.homeTile.r); }
        K.benchUnits.forEach((u, i) => { if (!u) return; const c = K.benchSlotPos(i); if (Math.hypot(u.pos.x - c.x, u.pos.z - c.z) > 0.01 || Math.abs(u.pos.y) > 0.001 || u.dragging) out.push('tướng lệch ô hàng chờ ' + i); });
      }
      // Tộc/hệ = số tướng khác nhau trên bàn.
      const want = {};
      new Set(allies.map(u => u.key)).forEach(k => K.UNIT_DEFS[k].traits.forEach(t => { want[t] = (want[t] || 0) + 1; }));
      if (JSON.stringify(Object.entries(want).sort()) !== JSON.stringify(Object.entries(K.traitCounts()).sort())) out.push('đếm tộc/hệ sai');
      // Bản lưu khớp trạng thái (trừ lúc đang đánh – lưu lúc đó là của vòng chuẩn bị).
      if (K.battle.phase === 'prep') {
        const sv = K.store.get('save', null), sn = K.snapshotGame();
        const pick = o => JSON.stringify({ hp: o.hp, gold: o.gold, level: o.level, xp: o.xp, round: o.round, bench: o.bench, board: o.board.map(b => b.key + b.star + b.c + b.r).sort() });
        if (!sv || pick(sv) !== pick(sn)) out.push('bản lưu không khớp trạng thái');
      }
      return out;
    });
    r.forEach(m => check(false, `[${where}] ${m}`));
  };
  const unitScreen = (sel) => V((sel) => {
    const K = window.__vkkt, u = sel.bench !== undefined ? K.benchUnits[sel.bench] : K.boardAllies().find(x => x.homeTile.c === sel.c && x.homeTile.r === sel.r);
    if (!u) return null;
    const v = u.pos.clone(); v.y = 0.8 * (u.star > 1 ? 1.1 : 1); v.project(K.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }, sel);
  const tileScreen = (c, r) => V(([c, r]) => { const K = window.__vkkt, v = K.tileCenter(c, r); v.project(K.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; }, [c, r]);
  const slotScreen = (i) => V((i) => { const K = window.__vkkt, v = K.benchSlotPos(i); v.project(K.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; }, i);
  /** Kéo bằng chuột, hoặc bằng ngón tay (sự kiện chạm CDP → pointerType 'touch'). Với ngón tay, đích trên bàn/hàng chờ
   *  được cộng LIFT vì tướng hiện phía trên ngón tay; thả vào cửa hàng thì không (raw = true). */
  const mouseDrag = async (from, to, raw = false) => {
    if (TOUCH) {
      const dest = raw ? to : { x: to.x, y: Math.min(to.y + LIFT, VH - 2) };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
      for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (dest.x - from.x) * k / 8, y: from.y + (dest.y - from.y) * k / 8 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(80); return;
    }
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let k = 1; k <= 6; k++) { await page.mouse.move(from.x + (to.x - from.x) * k / 6, from.y + (to.y - from.y) * k / 6); }
    await page.mouse.up(); await page.waitForTimeout(60);
  };
  const tapAt = async (p) => { if (TOUCH) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); await page.waitForTimeout(80); };
  const waitCamera = () => page.waitForTimeout(1300); // camera chuẩn bị damp về khung mới
  const onScreen = p => p && p.x > 4 && p.x < VW - 4 && p.y > 4 && p.y < VH - 4 - (TOUCH ? LIFT : 0);
  const value = s => s.bench.filter(Boolean).concat(s.board).reduce((a, x) => a + Math.pow(3, +x.split('*')[1][0] - 1), 0);
  const stats = { autoFill: 0, infoChecks: 0, apiPlacements: 0, buys: 0, sells: 0, rerolls: 0, xpBuys: 0, merges: 0, mouseDrags: 0, swaps: 0, wins: 0, losses: 0, reloads: 0, gameOvers: 0 };
  let baseChildren = null;

  for (let played = 1; played <= ROUNDS; played++) {
    let s = await state();
    log(`\nVòng ${s.round} (lượt ${played}) – máu ${s.hp}, linh thạch ${s.gold}, cấp ${s.level}, bàn ${s.board.length}/${s.cap}`);
    check(s.phase === 'prep', 'vào vòng mới phải ở pha chuẩn bị', s.phase);
    check(s.shop.length === 5, 'cửa hàng phải có 5 ô', s.shop.length);
    const enemyOk = await V(() => { const K = window.__vkkt; return K.units.filter(u => u.team === 'enemy').length === K.enemyLineup(K.battle.round).length && K.timelines.length === 0; });
    check(enemyOk, 'đội hình địch đúng và timeline đã dọn');
    await invariants('đầu vòng');

    // --- Nhấn giữ thẻ cửa hàng (chuột: chuột phải) → xem thông tin, không mua
    if (played <= 2) {
      const b0 = await state(), card = await page.locator('#shop .card:nth-child(1)').boundingBox(), key = b0.shop[0];
      if (key && card) {
        const cx = card.x + card.width / 2, cy = card.y + card.height / 2;
        if (TOUCH) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
          await page.waitForTimeout(800);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else await page.mouse.click(cx, cy, { button: 'right' });
        await page.waitForTimeout(120);
        const b1 = await state();
        const g = await V(() => ({ hidden: document.getElementById('unit-info').hidden, name: document.getElementById('ui-name').textContent }));
        const want = await V(k => window.__vkkt.UNIT_DEFS[k].name, key);
        check(!g.hidden && g.name === want && b1.gold === b0.gold && b1.shop[0] === key, 'nhấn giữ thẻ cửa hàng → xem thông tin, không mua', { g, want, gold: [b0.gold, b1.gold] });
        // Bảng thông tin không được che cửa hàng
        const r1 = await page.locator('#unit-info').boundingBox(), r2 = await page.locator('#prep-panel').boundingBox();
        check(!(r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y), 'bảng thông tin không che cửa hàng', { info: r1, shop: r2 });
        await V(() => document.getElementById('btn-info-close').click());
      }
    }
    // --- Mua kinh nghiệm khi bàn đã đủ quân và còn dư (giữ lại 6 linh thạch)
    if (s.board.length >= s.cap && s.gold >= 10 && s.level < 8) {
      const before = s; await press('#btn-xp'); s = await state(); stats.xpBuys++;
      check(s.gold === before.gold - 4, 'mua kinh nghiệm trừ 4', [before.gold, s.gold]);
      check(s.level * 100 + s.xp > before.level * 100 + before.xp, 'kinh nghiệm phải tăng');
    }
    // --- Mua: ưu tiên tướng đã có, rồi tướng đắt nhất mua được, giữ lại 2 linh thạch
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < 5; i++) {
        s = await state(); const key = s.shop[i]; if (!key) continue;
        const cost = await V(k => window.__vkkt.UNIT_DEFS[k].cost, key);
        const owned = s.bench.concat(s.board).filter(x => x && x.startsWith(key + '*')).length;
        const owned1 = s.bench.concat(s.board).filter(x => x && x.startsWith(key + '*1')).length;   // luật: hàng chờ đầy vẫn mua được nếu lần mua tạo ra gộp sao
        const benchFree = s.bench.filter(x => !x).length;
        if (cost > s.gold - (owned ? 0 : 2)) continue;
        if (benchFree === 0 && owned1 < 2) {   // phải bị từ chối, linh thạch giữ nguyên
          await press(`#shop .card:nth-child(${i + 1})`);
          const s2 = await state(); check(s2.gold === s.gold && value(s2) === value(s), 'hàng chờ đầy phải từ chối mua', [s.gold, s2.gold]);
          continue;
        }
        if (!owned && pass === 0 && cost < Math.min(3, s.level - 1)) continue;
        const v0 = value(s);
        await press(`#shop .card:nth-child(${i + 1})`);
        const s2 = await state(); stats.buys++;
        check(s2.gold === s.gold - cost, `mua ${key} trừ đúng ${cost}`, [s.gold, s2.gold]);
        check(value(s2) === v0 + 1, 'nâng sao phải bảo toàn số bản ★1 quy đổi', [v0, value(s2)]);
        const cnt = x => x.bench.filter(Boolean).length + x.board.length;
        stats.merges += (cnt(s) + 1 - cnt(s2)) / 2;
        await invariants('sau khi mua');
      }
      // --- Làm mới khi còn dư nhiều
      s = await state();
      if (pass === 0 && s.gold >= 12) {
        const shop0 = s.shop.join(); await press('#btn-reroll'); const s2 = await state(); stats.rerolls++;
        check(s2.gold === s.gold - 2, 'làm mới trừ 2', [s.gold, s2.gold]);
        check(s2.shop.length === 5 && s2.shop.every(Boolean), 'cửa hàng mới đủ 5 tướng');
        if (s2.shop.join() === shop0) log('  (làm mới ra đúng cửa hàng cũ – có thể xảy ra ngẫu nhiên)');
      }
    }
    await waitCamera();

    // --- Đặt quân: lần đầu bằng chuột thật, còn lại bằng API; thử vượt giới hạn
    s = await state();
    const leaveOne = played % 4 === 2;   // chừa 1 chỗ để kiểm tra tự đưa tướng lên khi vào trận
    for (let guard = 0; guard < 10; guard++) {
      s = await state();
      const bi = s.bench.findIndex(Boolean); if (bi < 0) break;
      if (leaveOne && s.board.length === s.cap - 1) break;
      const free = await V(() => { const K = window.__vkkt; for (let r = 3; r >= 0; r--) for (const c of [3, 4, 2, 5, 1, 6, 0, 7]) if (!K.boardAllies().some(u => u.homeTile.c === c && u.homeTile.r === r)) return { c, r }; return null; });
      if (!free) break;
      if (s.board.length >= s.cap) {
        // Thử kéo khi đã đủ quân: phải bị từ chối.
        const from = await unitScreen({ bench: bi }), to = await tileScreen(free.c, free.r);
        if (onScreen(from) && onScreen(to)) {
          await mouseDrag(from, to); stats.mouseDrags++;
          const s2 = await state(); check(s2.board.length === s.board.length, 'kéo khi đủ quân phải bị chặn', [s.board.length, s2.board.length]);
        }
        break;
      }
      const from = await unitScreen({ bench: bi }), to = await tileScreen(free.c, free.r);
      if (onScreen(from) && onScreen(to)) {
        await mouseDrag(from, to); stats.mouseDrags++;
        const s2 = await state();
        const landed = await V(([c, r]) => window.__vkkt.boardAllies().some(u => u.homeTile.c === c && u.homeTile.r === r), [free.c, free.r]);
        check(s2.board.length === s.board.length + 1 && !s2.bench[bi] && landed, `kéo ${TOUCH ? 'ngón tay' : 'chuột'} từ hàng chờ lên đúng ô ${free.c},${free.r}`, { before: s.board, after: s2.board });
      } else {
        stats.apiPlacements++;
        await V(([bi, c, r]) => window.__vkkt.moveTo({ type: 'bench', i: bi }, { type: 'tile', c, r }), [bi, free.c, free.r]);
      }
      await invariants('sau khi đặt quân');
    }
    // --- Đổi chỗ hai quân trên bàn bằng chuột
    s = await state();
    if (s.board.length >= 2) {
      const [a, b] = s.board.slice(0, 2).map(x => x.split('@')[1].split(',').map(Number));
      const from = await unitScreen({ c: a[0], r: a[1] }), to = await tileScreen(b[0], b[1]);
      if (onScreen(from) && onScreen(to)) {
        const ka = await V(([c, r]) => window.__vkkt.boardAllies().find(u => u.homeTile.c === c && u.homeTile.r === r).id, a);
        await mouseDrag(from, to); stats.mouseDrags++;
        const moved = await V(([id, c, r]) => { const u = window.__vkkt.boardAllies().find(x => x.id === id); return u && u.homeTile.c === c && u.homeTile.r === r; }, [ka, b[0], b[1]]);
        if (check(moved, 'kéo đổi chỗ hai quân trên bàn')) stats.swaps++;
        await invariants('sau khi đổi chỗ');
      }
    }
    // --- Dọn hàng chờ: bán tướng ★1 lẻ (không có cặp) khi hàng chờ còn ≤ 2 ô trống
    for (let guard = 0; guard < 4; guard++) {
      s = await state(); if (s.bench.filter(x => !x).length > 2) break;
      const i = s.bench.findIndex(x => x && x.endsWith('*1') && s.bench.concat(s.board).filter(y => y && y.startsWith(x)).length === 1);
      if (i < 0) break;
      const [key] = s.bench[i].split('*'); const price = await V(k => window.__vkkt.sellPrice(k, 1), key);
      await V(i => window.__vkkt.sellSrc({ type: 'bench', i }), i); stats.sells++;
      const s2 = await state(); check(s2.gold === s.gold + price && !s2.bench[i], 'bán dọn hàng chờ', [s.gold, s2.gold]);
      await invariants('sau khi dọn hàng chờ');
    }
    // --- Bán bằng cách kéo vào cửa hàng (vòng chẵn), hoặc kéo quân trên bàn về hàng chờ rồi lên lại (vòng lẻ)
    s = await state();
    if (played % 2 === 0) {
      const bi = s.bench.findIndex(Boolean);
      if (bi >= 0) {
        const [key, star] = s.bench[bi].split('*'); const price = await V(([k, st]) => window.__vkkt.sellPrice(k, st), [key, +star]);
        const from = await unitScreen({ bench: bi }), box = await page.locator('#prep-panel').boundingBox();
        if (onScreen(from)) {
          await mouseDrag(from, { x: box.x + box.width / 2, y: box.y + box.height / 2 }); stats.mouseDrags++;
          const s2 = await state(); stats.sells++;
          check(s2.gold === s.gold + price && !s2.bench[bi], `kéo vào cửa hàng để bán ${key}★${star} +${price}`, [s.gold, s2.gold]);
          await invariants('sau khi bán');
        }
      }
    } else if (s.board.length) {
      const empty = s.bench.findIndex(x => !x);
      const [c, r] = s.board[s.board.length - 1].split('@')[1].split(',').map(Number);
      const from = await unitScreen({ c, r }), to = await slotScreen(empty);
      if (empty >= 0 && onScreen(from) && onScreen(to)) {
        await mouseDrag(from, to); stats.mouseDrags++;
        const s2 = await state();
        check(s2.board.length === s.board.length - 1 && !!s2.bench[empty], 'kéo quân từ bàn về hàng chờ', { before: s.bench, after: s2.bench });
        await invariants('sau khi về hàng chờ');
        await V(([i, c, r]) => window.__vkkt.moveTo({ type: 'bench', i }, { type: 'tile', c, r }), [empty, c, r]);
        await invariants('sau khi đặt lại');
      }
    }
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `round${String(played).padStart(2, '0')}_prep.png`) });

    // --- Bảng thông tin: chạm tướng phe ta, chạm địch, chạm chỗ trống
    s = await state();
    if (s.board.length) {
      const [c, r] = s.board[0].split('@')[1].split(',').map(Number);
      const p = await unitScreen({ c, r });
      if (onScreen(p)) {
        await tapAt(p);
        const want = await V(([c, r]) => window.__vkkt.UNIT_DEFS[window.__vkkt.boardAllies().find(u => u.homeTile.c === c && u.homeTile.r === r).key].name, [c, r]);
        const got = await V(() => ({ hidden: document.getElementById('unit-info').hidden, name: document.getElementById('ui-name').textContent, enemy: document.getElementById('unit-info').classList.contains('enemy'), skill: document.getElementById('ui-skill-desc').textContent }));
        check(!got.hidden && got.name === want && !got.enemy && got.skill.length > 10, 'chạm tướng phe ta hiện đúng thông tin', got);
        { const r1 = await page.locator('#unit-info').boundingBox(), r2 = await page.locator('#prep-panel').boundingBox();
          check(!(r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y), 'bảng thông tin (tướng) không che cửa hàng', { info: r1, shop: r2 }); }
        await V(() => document.getElementById('btn-info-close').click());   // đóng trước rồi mới chạm địch
        const ep = await V(() => { const K = window.__vkkt, u = K.units.find(x => x.team === 'enemy'); const v = u.pos.clone(); v.y = 0.8; v.project(K.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, name: K.UNIT_DEFS[u.key].name }; });
        if (onScreen(ep)) {
          await tapAt(ep);
          const g2 = await V(() => ({ hidden: document.getElementById('unit-info').hidden, name: document.getElementById('ui-name').textContent, enemy: document.getElementById('unit-info').classList.contains('enemy') }));
          check(!g2.hidden && g2.enemy, 'chạm địch hiện thông tin địch', { got: g2, want: ep.name, at: ep, el: await V(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.id || e.className || e.tagName); }, [ep.x, ep.y]) });
        }
        await V(() => document.getElementById('btn-info-close').click());
        check(await page.isHidden('#unit-info'), 'nút ✕ đóng bảng thông tin');
        stats.infoChecks++;
        await invariants('sau khi xem thông tin');
      }
    }

    // --- Lưu & tải lại trang giữa chừng (vòng 3, 6, 9…)
    if (played % 3 === 0) {
      const before = await state();
      await page.reload(); await boot(false); stats.reloads++;
      const after = await state();
      const pick = o => JSON.stringify({ hp: o.hp, gold: o.gold, level: o.level, xp: o.xp, round: o.round, bench: o.bench, board: o.board, shop: o.shop, streak: o.streak });
      check(pick(before) === pick(after), 'tải lại trang phải khôi phục đúng ván', { before: pick(before), after: pick(after) });
      check(await page.textContent('#btn-start') === 'Bắt đầu giao chiến', 'nút sau khi tải lại');
      await waitCamera();
    }

    // --- Giao chiến
    s = await state();
    const pre = await state();
    await press('#btn-start');
    const post = await V(() => ({ board: window.__vkkt.boardAllies().length, cap: window.__vkkt.boardCap(), bench: window.__vkkt.game.bench.filter(Boolean).length }));
    if (pre.board.length < pre.cap && pre.bench.some(Boolean)) {
      check(post.board === Math.min(pre.cap, pre.board.length + pre.bench.filter(Boolean).length), 'tự đưa tướng từ hàng chờ lên khi vào trận', { pre: pre.board.length, post });
      stats.autoFill++;
    }
    check(post.board <= post.cap, 'vào trận không vượt giới hạn cấp', post);
    let ended = false, damageSeen = false, maxCastStreak = 0;
    for (let t = 0; t < 100; t += 2) {
      await V(sec => window.__vkkt.simulate(sec), 2);
      const r = await V(() => {
        const K = window.__vkkt, bad = [];
        for (const u of K.units) {
          if (![u.pos.x, u.pos.y, u.pos.z, u.hp, u.mana].every(Number.isFinite)) bad.push('NaN ở ' + u.key);
          if (Math.abs(u.pos.x) > 12 || Math.abs(u.pos.z) > 12) bad.push('ra ngoài đài ' + u.key);
          if (u.hp > u.maxHp + 0.01) bad.push('máu vượt tối đa ' + u.key);
        }
        return { bad, phase: K.battle.phase, time: K.battle.time, hurt: K.units.some(u => u.hp < u.maxHp), casting: K.units.filter(u => u.alive && u.fsm.name === 'cast').length };
      });
      r.bad.forEach(m => check(false, 'AI: ' + m));
      if (r.hurt) damageSeen = true;
      if (r.phase !== 'fight') { ended = true; break; }
    }
    check(ended, 'trận phải kết thúc');
    const res = await V(() => {
      const K = window.__vkkt;
      return { result: K.battle.result, time: K.battle.time, enemyStars: K.units.filter(u => u.team === 'enemy' && u.alive).reduce((a, u) => a + u.star, 0), alliesAlive: K.units.filter(u => u.team === 'ally' && u.alive).length };
    });
    check(res.time <= 90.2, 'trận kết thúc trong 90 giây', res.time);
    check(damageSeen, 'phải có sát thương trong trận');
    const end = await state();
    const win = res.result === 'win';
    win ? stats.wins++ : stats.losses++;
    // Thu nhập & máu theo công thức
    const interest = Math.min(5, Math.floor(s.gold / 10));
    const streak = win ? Math.max(1, s.streak + 1) : Math.min(-1, s.streak - 1), sa = Math.abs(streak);
    const income = 5 + interest + (sa >= 5 ? 3 : sa >= 4 ? 2 : sa >= 2 ? 1 : 0) + (win ? 1 : 0);
    const dmg = win ? 0 : 2 + Math.floor(s.round / 2) + res.enemyStars;
    check(end.gold === s.gold + income, 'thu nhập cuối vòng', { expected: s.gold + income, got: end.gold });
    check(end.hp === Math.max(0, s.hp - dmg), 'mất máu khi thua', { expected: s.hp - dmg, got: end.hp });
    check(end.streak === streak, 'chuỗi thắng/thua', [streak, end.streak]);
    const saved = await V(() => window.__vkkt.store.get('save', null));
    check(saved && saved.round === s.round + 1 && saved.gold === end.gold && saved.hp === end.hp, 'đã lưu kết quả vòng (round + 1)', saved && { round: saved.round, gold: saved.gold, hp: saved.hp });
    log(`  ${win ? 'Thắng' : 'Thua'} sau ${res.time.toFixed(1)} s · +${income} linh thạch${dmg ? ' · mất ' + dmg + ' máu' : ''} · đồng minh còn ${res.alliesAlive}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `round${String(played).padStart(2, '0')}_end.png`) });

    // --- Vòng tiếp theo / hết ván
    await press('#btn-start'); await page.waitForTimeout(80);
    if (end.over) {
      stats.gameOvers++;
      const ng = await state();
      check(ng.round === 1 && ng.hp === 100 && ng.gold === 6, 'hết máu → ván mới', ng);
    } else {
      const nx = await state();
      check(nx.round === s.round + 1, 'sang vòng kế tiếp', [s.round, nx.round]);
    }
    // Rò rỉ: số object trong scene trừ đi rig của các quân hiện có phải giữ nguyên qua các vòng.
    const others = await V(() => { const K = window.__vkkt; return K.scene.children.length - K.units.length - K.benchUnits.filter(Boolean).length; });
    if (baseChildren === null) baseChildren = others;
    check(others <= baseChildren + 4, 'object thừa trong scene tăng dần (rò rỉ)', { base: baseChildren, now: others });
  }

  log('\nThống kê:', JSON.stringify(stats));
  const mem = await V(() => window.__vkkt.renderer.info.memory);
  log('Bộ nhớ GPU:', JSON.stringify(mem));
  errors.forEach(e => check(false, e));
  await browser.close();
  if (failures.length) { log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  log(`\n✓ Chơi ${ROUNDS} vòng liên tục, không có lỗi.`);
}
main().catch(e => { console.error(e); process.exit(1); });
