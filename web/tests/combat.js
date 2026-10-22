// Kiểm tra AI giao chiến của Vạn Kiếm Kỳ Trận.
// Dựng nhiều trận với đội hình khác nhau (cận chiến dồn lên, đội đánh xa, 8 đấu 8, ngẫu nhiên) rồi đo:
//   kẹt đường (đứng yên lâu khi chưa tới tầm đánh), chồng chéo nhân vật, ra ngoài đài,
//   cận chiến có tới được mục tiêu và đánh, đánh xa có giữ được tầm và tránh bị áp sát,
//   sát thủ nhắm tuyến sau, né / chí mạng / choáng / kháng có xảy ra, kỹ năng chọn mục tiêu,
//   độ lệch giữa tư thế va chạm của animation và lúc gây sát thương.
// Chạy:  cd web && npm run test:combat        (FIGHTS=… để đổi số trận ngẫu nhiên)
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const RANDOM_FIGHTS = +(process.env.FIGHTS || 4);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const failures = [];
const check = (cond, msg, extra) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } return cond; };

// [key, c, r] – phe ta đứng hàng 0–3, phe địch hàng 4–7
const SCENARIOS = [
  { name: 'Đội hình hỗn hợp vs địch mặc định vòng 6', round: 6, allies: [['hophap', 3, 3], ['thietve', 4, 3], ['kiemtien', 5, 3], ['anhkiem', 2, 2], ['loi', 3, 1], ['hoa', 5, 1]] },
  { name: 'Cận chiến dồn lên vs tuyến sau đánh xa', round: 6, allies: [['kiemdong', 2, 3], ['kiemdong', 3, 3], ['thietve', 4, 3], ['kiemtien', 5, 3], ['anhkiem', 6, 3]],
    enemies: [['mathu', 3, 4], ['mathu', 4, 4], ['uminh', 2, 6], ['uminh', 4, 7], ['uhon', 6, 6]] },
  { name: 'Đội đánh xa bị cận chiến lao vào (thả diều)', round: 5, allies: [['loi', 2, 1], ['hoa', 4, 1], ['uhon', 6, 1], ['loi', 3, 0], ['hophap', 4, 3]],
    enemies: [['huyetkiem', 2, 4], ['huyetkiem', 4, 4], ['huyetkiem', 6, 4], ['mathu', 3, 5], ['mathu', 5, 5]] },
  { name: 'Đông người 8 đấu 8', round: 9, allies: [['hophap', 1, 3], ['thietve', 3, 3], ['kiemtien', 4, 3], ['kiemdong', 6, 3], ['anhkiem', 0, 2], ['anhkiem', 7, 2], ['loi', 2, 1], ['uhon', 5, 1]] },
  { name: 'Bảy cận chiến vây một tướng đỡ đòn (tìm chỗ quanh mục tiêu)', round: 14, allies: [['kiemdong', 0, 3], ['kiemdong', 1, 3], ['thietve', 2, 3], ['kiemtien', 3, 3], ['kiemdong', 5, 3], ['thietve', 6, 3], ['kiemtien', 7, 3]],
    enemies: [['mathu', 3, 7]] },
  { name: 'Hàng dọc: người sau phải lách qua người trước', round: 8, allies: [['thietve', 3, 3], ['kiemdong', 3, 2], ['kiemtien', 3, 1], ['kiemdong', 3, 0], ['anhkiem', 4, 0]],
    enemies: [['mathu', 0, 7], ['uminh', 7, 7]] },
  // Tự kiểm tra thước đo: cố tình làm một tướng không di chuyển được (ở xa mục tiêu) → thước đo PHẢI báo kẹt.
  { name: 'Tự kiểm tra thước đo kẹt (cố tình đóng băng 1 tướng)', round: 3, freeze: 'kiemdong', expectStuck: true, allies: [['thietve', 3, 3], ['kiemdong', 0, 0]], enemies: [['mathu', 7, 7]] },
  { name: 'Sát thủ vs tuyến sau', round: 5, allies: [['anhkiem', 1, 3], ['anhkiem', 6, 3], ['thietve', 3, 3], ['hophap', 4, 3]],
    enemies: [['mathu', 3, 4], ['mathu', 4, 4], ['uminh', 1, 7], ['uminh', 6, 7]] }
];
const KEYS = ['kiemtien', 'loi', 'hoa', 'hophap', 'huyetkiem', 'uminh', 'mathu', 'kiemdong', 'thietve', 'anhkiem', 'uhon'];
function randomLineup(n, rows) {
  const used = new Set(), out = [];
  while (out.length < n) { const c = Math.floor(Math.random() * 8), r = rows[Math.floor(Math.random() * rows.length)], k = c + ',' + r; if (used.has(k)) continue; used.add(k); out.push([KEYS[Math.floor(Math.random() * KEYS.length)], c, r]); }
  return out;
}
for (let i = 0; i < RANDOM_FIGHTS; i++) { const n = 3 + Math.floor(Math.random() * 6); SCENARIOS.push({ name: `Ngẫu nhiên #${i + 1} (${n} đấu ${n})`, round: 3 + Math.floor(Math.random() * 8), allies: randomLineup(n, [0, 1, 2, 3]), enemies: randomLineup(n, [4, 5, 6, 7]) }); }

/** Chạy một trận ngay trong trang (tua nhanh bằng __vkkt.simulate) và lấy mẫu mỗi 0,1 s. */
function fightInPage(sc) {
  const K = window.__vkkt, g = K.game;
  g.level = 8; g.over = false;
  for (const u of K.boardAllies()) K.removeUnit(u);
  sc.allies.forEach(([k, c, r]) => K.placeUnit(k, 1, c, r));
  const original = window.enemyLineup;
  if (sc.enemies) window.enemyLineup = () => sc.enemies.map(([k, c, r]) => [k, c, r, 1]);
  K.battle.round = sc.round; K.setupRound(); window.enemyLineup = original;
  K.startBattle();
  if (sc.freeze) { const f = K.boardAllies().find(u => u.key === sc.freeze); f.steerTo = () => {}; f.def = Object.assign({}, f.def, { dash: false }); }
  const DT = 0.1, stats = { time: 0, samples: 0, overlapSamples: 0, oob: 0, maxStuck: 0, stuckWho: '', rangedSamples: 0, rangedInRange: 0, rangedCrowded: 0, meleeAttackT: [], meleeNever: [], assassinBackline: 0, assassinChecks: 0 };
  const track = new Map();   // u → { hist: [{t,x,z}], stuckT, firstAttack }
  for (const u of K.units) track.set(u, { hist: [], stuckT: 0, firstAttack: -1, born: 0 });
  let t = 0;
  while (K.battle.phase === 'fight' && t < 95) {
    K.simulate(DT); t += DT;
    const alive = K.units.filter(u => u.alive);
    stats.samples++;
    // Chồng chéo: cặp nào gần hơn 0,5 m (thân người ~0,9 m)
    let overlap = false;
    for (let i = 0; i < alive.length && !overlap; i++) for (let j = i + 1; j < alive.length; j++) if (Math.hypot(alive[i].pos.x - alive[j].pos.x, alive[i].pos.z - alive[j].pos.z) < 0.5) { overlap = true; break; }
    if (overlap) stats.overlapSamples++;
    for (const u of alive) {
      const tr = track.get(u); if (!tr) continue;
      if (Math.abs(u.pos.x) > 11.7 || Math.abs(u.pos.z) > 11.7) stats.oob++;
      if (tr.firstAttack < 0 && u.fsm.name === 'attack') tr.firstAttack = t;
      tr.hist.push({ t, x: u.pos.x, z: u.pos.z }); while (tr.hist.length && tr.hist[0].t < t - 1.0) tr.hist.shift();
      // Kẹt: ở trạng thái di chuyển, chưa tới tầm mục tiêu, mà 1 s qua đi được < 0,3 m
      const tg = u.target, reach = u.def.range + 0.45;
      const far = tg && tg.alive && Math.hypot(tg.pos.x - u.pos.x, tg.pos.z - u.pos.z) > reach;
      const moved = tr.hist.length > 1 ? Math.hypot(u.pos.x - tr.hist[0].x, u.pos.z - tr.hist[0].z) : 1;
      if (u.fsm.name === 'move' && far && moved < 0.3 && tr.hist[0].t <= t - 0.95) tr.stuckT += DT; else tr.stuckT = 0;
      if (tr.stuckT > stats.maxStuck) { stats.maxStuck = tr.stuckT; stats.stuckWho = u.team + ':' + u.key; }
      // Đánh xa: có mục tiêu thì phần lớn thời gian nằm trong tầm; ít khi bị cận chiến áp sát
      if (u.def.ranged && tg && tg.alive && ['move', 'attack'].includes(u.fsm.name)) {
        stats.rangedSamples++;
        if (Math.hypot(tg.pos.x - u.pos.x, tg.pos.z - u.pos.z) <= u.def.range + 0.5) stats.rangedInRange++;
        if (alive.some(e => e.team !== u.team && !e.def.ranged && Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z) < 1.3)) stats.rangedCrowded++;
      }
      // Sát thủ: mục tiêu đầu trận (sau 0,3 s) là tuyến sau đánh xa nếu địch có
      if (u.def.role === 'assassin' && !tr.assassinChecked && t >= 0.3 && tg) {
        tr.assassinChecked = true;
        if (alive.some(e => e.team !== u.team && e.def.ranged)) { stats.assassinChecks++; if (tg.def.ranged) stats.assassinBackline++; }
      }
    }
  }
  stats.time = t; stats.result = K.battle.result;
  for (const [u, tr] of track) if (!u.def.ranged && u.def.role !== undefined) {
    if (tr.firstAttack >= 0) stats.meleeAttackT.push(+tr.firstAttack.toFixed(1));
    else if (u.deathT === 0 || u.alive) stats.meleeNever.push(u.team + ':' + u.key);   // còn sống mà chưa từng đánh
  }
  // Về pha chuẩn bị cho trận sau
  K.nextRound();
  return stats;
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
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#btn-enter');

  let rangedS = 0, rangedIn = 0, rangedCrowd = 0, assChecks = 0, assBack = 0;
  for (const sc of SCENARIOS) {
    const st = await page.evaluate(fightInPage, sc);
    console.log(`\n${sc.name}: ${st.result === 'win' ? 'phe ta thắng' : 'phe ta thua'} sau ${st.time.toFixed(1)} s · kẹt lâu nhất ${st.maxStuck.toFixed(1)} s${st.stuckWho ? ' (' + st.stuckWho + ')' : ''} · chồng chéo ${(st.overlapSamples / st.samples * 100).toFixed(1)}% · cận chiến đánh lần đầu sau ${st.meleeAttackT.join('/')} s`);
    if (sc.expectStuck) { check(st.maxStuck >= 2.5, `[${sc.name}] thước đo phải phát hiện tướng bị đóng băng`, st.maxStuck); continue; }
    check(st.maxStuck < 2.5, `[${sc.name}] không tướng nào kẹt đường quá 2,5 s`, { maxStuck: st.maxStuck, who: st.stuckWho });
    check(st.overlapSamples / st.samples < 0.05, `[${sc.name}] chồng chéo nhân vật < 5% thời gian`, st.overlapSamples / st.samples);
    check(st.oob === 0, `[${sc.name}] không ra ngoài đài`, st.oob);
    check(st.meleeNever.length === 0 || st.time < 10, `[${sc.name}] mọi tướng cận chiến còn sống đều tới được mục tiêu và đánh`, st.meleeNever);
    check(st.meleeAttackT.every(x => x <= 12), `[${sc.name}] cận chiến bắt đầu đánh trong 12 s`, st.meleeAttackT);
    rangedS += st.rangedSamples; rangedIn += st.rangedInRange; rangedCrowd += st.rangedCrowded; assChecks += st.assassinChecks; assBack += st.assassinBackline;
  }
  const log = await page.evaluate(() => JSON.parse(JSON.stringify(window.__vkkt.combatLog)));
  console.log('\nTổng hợp:', JSON.stringify({ ...log, rangedInRange: +(rangedIn / rangedS).toFixed(2), rangedCrowded: +(rangedCrowd / rangedS).toFixed(2), assassinBackline: `${assBack}/${assChecks}` }));
  check(rangedIn / rangedS >= 0.7, 'đánh xa nằm trong tầm mục tiêu ≥ 70% thời gian', rangedIn / rangedS);
  check(rangedCrowd / rangedS <= 0.25, 'đánh xa bị cận chiến áp sát (< 1,3 m) ≤ 25% thời gian', rangedCrowd / rangedS);
  check(assChecks === 0 || assBack / assChecks >= 0.7, 'sát thủ nhắm tuyến sau đánh xa ≥ 70% số lần', `${assBack}/${assChecks}`);
  check(log.dodges > 0 && log.crits > 0 && log.stuns > 0, 'có né tránh, chí mạng và choáng xảy ra', log);
  check(log.kites > 0, 'đánh xa có lùi khi bị áp sát (thả diều)', log.kites);
  check(log.syncChecks >= 50 && log.syncMaxErr <= 2 / 60 + 1e-6, 'sát thương / phóng đạn đúng khung va chạm của animation (lệch ≤ 2 bước mô phỏng)', { checks: log.syncChecks, maxErr: log.syncMaxErr });
  check(Object.keys(log.casts).length >= 6, 'nhiều loại kỹ năng được tung', log.casts);
  errors.forEach(e => check(false, e));
  await browser.close();
  if (failures.length) { console.log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  console.log(`\n✓ ${SCENARIOS.length} trận, AI hành động hợp lý, không kẹt đường.`);
}
main().catch(e => { console.error(e); process.exit(1); });
