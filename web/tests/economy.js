// Kiểm tra kinh tế của Vạn Kiếm Kỳ Trận:
//   1. Tỉ lệ ra tướng theo cấp khớp bảng SHOP_ODDS (thống kê 4.000 lần làm mới mỗi cấp).
//   2. Bể tướng dùng chung: tổng số bản luôn bảo toàn, tướng hết bản không còn xuất hiện, đối thủ ảo làm vơi bể.
//   3. Đồng hồ chuẩn bị tự vào trận, tạm dừng thì dừng đếm; trận dài bị chặn ở 60 s nhờ giai đoạn hỗn loạn.
//   4. Trang bị: gắn, lưu & tải lại trang, bán tướng thì trả về túi.
//   5. Ba chiến thuật (tiết kiệm / lên cấp nhanh / làm mới liên tục) tự chơi cùng số vòng → đội hình khác nhau rõ rệt:
//      mỗi lựa chọn giữa giữ linh thạch, lên cấp và làm mới đều ảnh hưởng tới sức mạnh đội hình.
// Chạy:  cd web && npm run test:economy        (GAMES=… số ván mỗi chiến thuật, ROUNDS=… số vòng mỗi ván)
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const GAMES = +(process.env.GAMES || 3), ROUNDS = +(process.env.ROUNDS || 14);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const failures = [];
const check = (cond, msg, extra) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } else console.log('  ✓ ' + msg); return cond; };

/** Một ván do bot chơi theo chiến thuật, chạy trong trang. Trả về chỉ số theo từng vòng. */
function botGame([strategy, rounds]) {
  const K = window.__vkkt, g = K.game, D = K.UNIT_DEFS;
  K.options.prepTimer = false;
  K.newGame();
  const value = (key, star) => D[key].cost * Math.pow(3, star - 1);
  const owned1 = key => g.bench.filter(e => e && e.key === key && e.star === 1).length + K.boardAllies().filter(u => u.key === key && u.star === 1).length;
  const ownedAny = key => g.bench.some(e => e && e.key === key) || K.boardAllies().some(u => u.key === key);
  const benchFree = () => g.bench.filter(e => !e).length;
  /** Hàng chờ gần đầy: bán tướng lẻ giá trị thấp nhất (không có cặp). */
  const tidyBench = () => {
    while (benchFree() < 2) {
      let worst = -1;
      g.bench.forEach((e, i) => { if (e && owned1(e.key) < 2 && (worst < 0 || value(e.key, e.star) < value(g.bench[worst].key, g.bench[worst].star))) worst = i; });
      if (worst < 0) break;
      K.sellSrc({ type: 'bench', i: worst });
    }
  };
  /** Đội hình mạnh nhất có thể: đổi tướng yếu nhất trên bàn với tướng mạnh hơn ở hàng chờ. */
  const optimizeBoard = () => {
    K.autoFillBoard();
    for (let guard = 0; guard < 12; guard++) {
      const board = K.boardAllies(); if (!board.length) break;
      const weak = board.reduce((a, u) => (value(u.key, u.star) < value(a.key, a.star) ? u : a));
      let best = -1;
      g.bench.forEach((e, i) => { if (e && value(e.key, e.star) > value(weak.key, weak.star) && (best < 0 || value(e.key, e.star) > value(g.bench[best].key, g.bench[best].star))) best = i; });
      if (best < 0) break;
      K.moveTo({ type: 'bench', i: best }, { type: 'tile', c: weak.homeTile.c, r: weak.homeTile.r });
    }
  };
  const equipAll = () => {
    while (g.items.length) {
      const u = K.boardAllies().filter(x => (x.items || []).length < 3).sort((a, b) => value(b.key, b.star) - value(a.key, a.star))[0];
      if (!u || !K.equipItem(0, { type: 'board', unit: u })) break;
    }
  };
  const buyLoop = (allow) => {
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 5; i++) {
      const key = g.shop[i]; if (!key) continue;
      const cost = D[key].cost;
      if (g.gold < cost || !allow(key, cost)) continue;
      if (benchFree() === 0 && owned1(key) < 2) continue;
      K.buyShop(i); tidyBench();
    }
  };
  const res = { rounds: [], interest: 0, rerolls: 0, xp: 0, wins: 0 };
  for (let r = 1; r <= rounds && !g.over; r++) {
    // ---- Quyết định trong pha chuẩn bị
    if (strategy === 'econ') {
      // Giữ mốc lãi: chỉ tiêu tiền khi không tụt xuống dưới bội số 10 hiện tại (tối đa 50); dư trên 50 thì lên cấp.
      const floorKeep = () => Math.min(50, Math.floor(g.gold / 10) * 10);
      buyLoop((key, cost) => (owned1(key) >= 1 || K.boardAllies().length < K.boardCap()) && g.gold - cost >= floorKeep());
      while (g.gold >= 54 && g.level < 9) { K.buyXP(); res.xp++; }
    } else if (strategy === 'level') {
      // Lên cấp nhanh: dồn tiền mua kinh nghiệm, rồi mua tướng đắt nhất mua được.
      while (g.gold >= 4 + 2 && g.level < 9) { K.buyXP(); res.xp++; }
      buyLoop((key, cost) => cost >= Math.min(4, g.level - 3) || owned1(key) >= 1);
    } else if (strategy === 'reroll') {
      // Làm mới liên tục ở cấp thấp: giữ cấp ≤ 5, tiêu hết tiền tìm bản sao để lên ★2/★3 tướng rẻ.
      if (r >= 9 && g.level < 6 && g.gold >= 4) { K.buyXP(); res.xp++; }
      for (let guard = 0; guard < 25; guard++) {
        buyLoop((key, cost) => cost <= 2 || ownedAny(key));
        if (g.gold < 2 + 1) break;
        K.reroll(); res.rerolls++;
      }
    }
    tidyBench(); equipAll(); optimizeBoard();
    const board = K.boardAllies();
    const snap = { r, gold: g.gold, level: g.level, hp: g.hp, power: board.reduce((a, u) => a + value(u.key, u.star), 0),
      starred: board.filter(u => u.star >= 2).length + g.bench.filter(e => e && e.star >= 2).length,
      avgCost: board.length ? board.reduce((a, u) => a + D[u.key].cost, 0) / board.length : 0, units: board.length };
    res.interest += K.interestOf(g.gold);
    // ---- Giao chiến
    K.startBattle(); K.simulate(65);
    snap.win = K.battle.result === 'win'; if (snap.win) res.wins++;
    res.rounds.push(snap);
    if (g.over) break;
    K.nextRound();
  }
  res.final = res.rounds[res.rounds.length - 1];
  return res;
}

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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); });
  await page.reload();
  await page.click('#btn-enter');

  // ---------- 1. Tỉ lệ ra tướng theo cấp
  console.log('\n1. Tỉ lệ ra tướng theo cấp (4.000 lần làm mới × 5 ô mỗi cấp)');
  const odds = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game, out = {};
    K.newGame(); g.rivals = {};
    for (let lv = 1; lv <= 9; lv++) {
      g.level = lv; const cnt = [0, 0, 0, 0, 0];
      for (let n = 0; n < 4000; n++) { K.rollShop(); for (const k of g.shop) if (k) cnt[K.UNIT_DEFS[k].cost - 1]++; }
      const tot = cnt.reduce((a, b) => a + b, 0);
      out[lv] = { got: cnt.map(c => +(c / tot * 100).toFixed(1)), want: K.SHOP_ODDS[lv] };
    }
    g.level = 3; K.rollShop();
    return out;
  });
  let maxDev = 0;
  for (const lv in odds) { const o = odds[lv]; o.got.forEach((p, i) => { maxDev = Math.max(maxDev, Math.abs(p - o.want[i])); }); console.log(`   cấp ${lv}: thực tế ${o.got.join(' / ')}  ·  bảng ${o.want.join(' / ')}`); }
  check(maxDev <= 2, `tỉ lệ thực tế lệch bảng tối đa ${maxDev.toFixed(1)} điểm % (≤ 2)`);

  // ---------- 2. Bể tướng dùng chung
  console.log('\n2. Bể tướng dùng chung');
  const pool = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game, out = {};
    K.newGame(); g.level = 9; g.gold = 999;
    const conserve = () => Object.keys(K.UNIT_DEFS).filter(k => K.UNIT_DEFS[k].cost).every(k => K.poolOwned(k) + g.shop.filter(x => x === k).length + (g.rivals[k] || 0) + K.poolLeft(k) === K.POOL_SIZE[K.UNIT_DEFS[k].cost] && K.poolLeft(k) >= 0);
    // Mua / bán / làm mới ngẫu nhiên 300 lần, bảo toàn số bản sau mỗi bước
    let ok = true;
    for (let n = 0; n < 300 && ok; n++) {
      const a = Math.random();
      if (a < 0.45) { const i = Math.floor(Math.random() * 5); if (g.shop[i] && (g.bench.includes(null))) K.buyShop(i); }
      else if (a < 0.75) K.reroll();
      else { const i = g.bench.findIndex(Boolean); if (i >= 0) K.sellSrc({ type: 'bench', i }); }
      if (Math.random() < 0.05) K.rivalsDraft(1 + Math.floor(Math.random() * 15));
      ok = conserve();
    }
    out.conserved = ok;
    // Cạn bể một tướng bậc 5: không bao giờ xuất hiện nữa
    const key = 'kiemtien'; g.shop = [];
    g.rivals[key] = K.POOL_SIZE[5] - K.poolOwned(key);
    let seen = 0; for (let n = 0; n < 400; n++) { K.rollShop(); if (g.shop.includes(key)) seen++; }
    out.depletedSeen = seen; out.leftAfterDeplete = K.poolLeft(key);
    // Bán lại trả bản về bể
    delete g.rivals[key]; g.shop = [null, null, null, null, null];
    const before = K.poolLeft('kiemdong'); g.bench[0] = { key: 'kiemdong', star: 2, items: [] };
    out.ownStar2 = before - K.poolLeft('kiemdong');
    K.sellSrc({ type: 'bench', i: 0 }); out.afterSell = K.poolLeft('kiemdong') - before;
    // Đối thủ ảo làm vơi bể theo vòng
    g.rivals = {}; for (let r = 1; r <= 10; r++) K.rivalsDraft(r);
    out.rivalsHeld = Object.values(g.rivals).reduce((a, b) => a + b, 0);
    out.rivalsDistinct = Object.keys(g.rivals).length;
    return out;
  });
  check(pool.conserved, 'sau 300 lần mua / bán / làm mới: người chơi giữ + cửa hàng + đối thủ + còn lại = số bản trong bể, không âm');
  check(pool.depletedSeen === 0 && pool.leftAfterDeplete === 0, 'tướng đã hết bản trong bể không bao giờ xuất hiện ở cửa hàng', pool);
  check(pool.ownStar2 === 3 && pool.afterSell === 0, 'tướng ★2 chiếm 3 bản; bán đi thì trả 3 bản về bể', pool);
  check(pool.rivalsHeld > 20 && pool.rivalsDistinct >= 6, `sau 10 vòng, đối thủ ảo giữ ${pool.rivalsHeld} bản của ${pool.rivalsDistinct} tướng (bể vơi dần)`);

  // ---------- 3. Đồng hồ
  console.log('\n3. Thời gian chuẩn bị và giao chiến');
  await page.evaluate(() => { const K = window.__vkkt; K.newGame(); K.options.prepTimer = true; K.battle.paused = true; K.game.prepT = 0.8; });
  await page.waitForTimeout(1500);
  const paused = await page.evaluate(() => window.__vkkt.battle.phase);
  await page.evaluate(() => { const K = window.__vkkt; K.battle.paused = false; K.game.prepT = 0.8; });
  await page.waitForFunction(() => window.__vkkt.battle.phase !== 'prep', null, { timeout: 15000 }).catch(() => {});
  const auto = await page.evaluate(() => window.__vkkt.battle.phase);
  check(paused === 'prep' && auto === 'fight', 'hết giờ chuẩn bị thì tự vào trận; đang tạm dừng thì không đếm', { paused, auto });
  const ot = await page.evaluate(() => {
    const K = window.__vkkt; K.options.prepTimer = false; K.battle.phase = 'end'; K.nextRound();
    for (const u of K.boardAllies()) K.removeUnit(u);
    K.placeUnit('kimcuong', 3, 3, 3);   // hai bức tường trâu: không có hỗn loạn thì đánh rất lâu
    const orig = window.enemyLineup; window.enemyLineup = () => [['kimcuong', 4, 4, 3]];
    K.setupRound(); window.enemyLineup = orig;
    const o0 = K.combatLog.overtime || 0; K.startBattle(); K.simulate(75);
    return { time: K.battle.time, phase: K.battle.phase, overtime: (K.combatLog.overtime || 0) - o0 };
  });
  check(ot.phase === 'end' && ot.time <= 60.1 && ot.overtime === 1, `trận giữa hai tướng trâu kết thúc sau ${ot.time.toFixed(1)} s (≤ 60), có giai đoạn hỗn loạn`, ot);
  await page.evaluate(() => window.__vkkt.nextRound());

  // ---------- 4. Trang bị: gắn, lưu, bán
  console.log('\n4. Trang bị');
  const it1 = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game; K.newGame();
    g.items = ['kiem', 'phu', 'ngoa'];
    const u = K.boardAllies()[0], atk0 = u.atk, hp0 = u.maxHp;
    K.equipItem(0, { type: 'board', unit: u }); K.equipItem(0, { type: 'board', unit: u });
    return { key: u.key, items: u.items.slice(), atkUp: u.atk > atk0, hpUp: u.maxHp > hp0, inv: g.items.slice() };
  });
  await page.reload(); await page.click('#btn-enter');
  const it2 = await page.evaluate(() => { const K = window.__vkkt; const u = K.boardAllies().find(x => x.items && x.items.length); return { items: u ? u.items.slice() : [], inv: K.game.items.slice(), atk: u && u.atk, base: u && K.UNIT_DEFS[u.key].atk }; });
  const it3 = await page.evaluate(() => { const K = window.__vkkt, u = K.boardAllies().find(x => x.items && x.items.length); K.sellSrc({ type: 'board', unit: u }); return K.game.items.slice(); });
  check(it1.items.join() === 'kiem,phu' && it1.atkUp && it1.hpUp, 'gắn Thanh Phong Kiếm + Hộ Mệnh Phù: công và máu tăng', it1);
  check(it2.items.join() === 'kiem,phu' && it2.inv.join() === 'ngoa' && it2.atk > it2.base, 'tải lại trang: trang bị trên tướng và trong túi còn nguyên, vẫn cộng chỉ số', it2);
  check(it3.sort().join() === 'kiem,ngoa,phu', 'bán tướng thì trang bị trả về túi', it3);

  // ---------- 5. Ba chiến thuật
  console.log(`\n5. Ba chiến thuật, mỗi chiến thuật ${GAMES} ván × ${ROUNDS} vòng (bot tự chơi, trận tua nhanh)`);
  const NAMES = { econ: 'Tiết kiệm (giữ mốc lãi)', level: 'Lên cấp nhanh', reroll: 'Làm mới liên tục' };
  const agg = {};
  for (const st of ['econ', 'level', 'reroll']) {
    const games = [];
    for (let n = 0; n < GAMES; n++) games.push(await page.evaluate(botGame, [st, ROUNDS]));
    const at = (r, f) => { const v = games.map(gm => gm.rounds[Math.min(r, gm.rounds.length) - 1]).filter(Boolean).map(f); return v.reduce((a, b) => a + b, 0) / v.length; };
    agg[st] = {
      interest: games.reduce((a, gm) => a + gm.interest, 0) / GAMES,
      rerolls: games.reduce((a, gm) => a + gm.rerolls, 0) / GAMES,
      wins: games.reduce((a, gm) => a + gm.wins, 0) / GAMES,
      hp: games.reduce((a, gm) => a + gm.final.hp, 0) / GAMES,
      lvl8: at(8, x => x.level), lvlEnd: at(ROUNDS, x => x.level),
      star8: at(8, x => x.starred), cost8: at(8, x => x.avgCost), costEnd: at(ROUNDS, x => x.avgCost),
      pow6: at(6, x => x.power), pow10: at(10, x => x.power), powEnd: at(ROUNDS, x => x.power)
    };
    const a = agg[st];
    console.log(`   ${NAMES[st].padEnd(24)} lãi tổng ${a.interest.toFixed(1)} · làm mới ${a.rerolls.toFixed(0)} lần · cấp v8 ${a.lvl8.toFixed(1)} → cuối ${a.lvlEnd.toFixed(1)} · tướng ★2+ v8 ${a.star8.toFixed(1)} · giá TB v8 ${a.cost8.toFixed(2)} → cuối ${a.costEnd.toFixed(2)} · sức mạnh v6/v10/cuối ${a.pow6.toFixed(0)}/${a.pow10.toFixed(0)}/${a.powEnd.toFixed(0)} · thắng ${a.wins.toFixed(1)} · máu còn ${a.hp.toFixed(0)}`);
  }
  const E = agg.econ, L = agg.level, R = agg.reroll;
  check(E.interest > L.interest && E.interest > R.interest, 'Tiết kiệm: nhận nhiều lãi nhất', { econ: E.interest, level: L.interest, reroll: R.interest });
  check(L.lvl8 > E.lvl8 && L.lvl8 > R.lvl8, 'Lên cấp nhanh: cấp cao nhất ở vòng 8 (đặt được nhiều tướng hơn)', { econ: E.lvl8, level: L.lvl8, reroll: R.lvl8 });
  check(L.costEnd > R.costEnd, 'Lên cấp nhanh: tướng trung bình đắt hơn (gặp được tướng bậc cao)', { level: L.costEnd, reroll: R.costEnd });
  check(R.star8 > E.star8 && R.star8 > L.star8, 'Làm mới liên tục: nhiều tướng ★2+ nhất ở vòng 8', { econ: E.star8, level: L.star8, reroll: R.star8 });
  const p10 = [E.pow10, L.pow10, R.pow10];
  check(Math.max(...p10) - Math.min(...p10) >= 3, 'sức mạnh đội hình ở vòng 10 khác nhau rõ giữa các chiến thuật', p10);

  errors.forEach(e => check(false, e));
  await browser.close();
  if (failures.length) { console.log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  console.log('\n✓ Kinh tế hoạt động đúng; các lựa chọn giữ linh thạch / lên cấp / làm mới dẫn tới đội hình khác nhau.');
}
main().catch(e => { console.error(e); process.exit(1); });
