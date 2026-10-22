// Kiểm tra V1.5 tuần 3 – Combat & Skills V3.0 (CombatTestRunner, RNG có seed, StatusEffectManager, DamageCalculator, A*).
//   1. 24 tướng dùng đúng kỹ năng của mình          8. AI không kẹt vô hạn, không đứng chồng
//   2. Không tung chiêu khi thiếu năng lượng          9. Giới hạn thời gian + xử lý hoà
//   3. Không đánh mục tiêu đã chết                   10. ×1 và ×2 (vòng lặp thời gian thực) cùng seed, cùng số bước → cùng trạng thái
//   4. Không NaN / Infinity (cả phòng thủ âm)        11. LOW và ULTRA → cùng sát thương / kết quả
//   5. Trạng thái hết hạn đúng thời điểm             12. Không còn đạn / tác vụ / trạng thái của trận trước
//   6. Tộc/hệ không cộng sai (xem thêm tests/traits) 13. Lưu tiến trình & nâng sao vẫn chạy
//   7. Không gây sát thương 2 lần do animation       14. Random có seed: cùng seed → giống hệt, khác seed → khác
//   + công thức sát thương (vật lý / phép / chuẩn, giáp âm), thanh tẩy, sét liên hoàn không nhảy lặp, vùng báo trước cho phép né.
// Chạy:  cd web && npm run test:combat3      (FIGHTS=… số trận ngẫu nhiên, mặc định 40)
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const FIGHTS = +(process.env.FIGHTS || 40);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const failures = [];
const check = (cond, msg, extra) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } else console.log('  ✓ ' + msg); return cond; };

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
  if (!(await page.evaluate(() => !!window.__vkkt && !!window.__vkkt.CombatTestRunner))) throw new Error('Game không khởi động:\n' + errors.join('\n'));
  await page.click('#btn-enter');
  const V = (fn, arg) => page.evaluate(fn, arg);

  // ---------- Công thức sát thương
  console.log('\nCông thức sát thương');
  const dmg = await V(() => {
    const K = window.__vkkt, f = K.defenseFactor;
    const out = { f0: f(0), f100: f(100), f50: f(50), fm50: f(-50), fm100: f(-100), fmBig: f(-1e9), fInf: f(Infinity), fNaN: f(NaN) };
    // Một cặp tướng thật: cùng hệ số, vật lý / phép / chuẩn
    K.CombatTestRunner.run({ allies: [['kiemdong', 1, 3, 3]], enemies: [['mathu', 1, 3, 4]], seed: 3, maxTime: 0.05, keepState: true });
    const a = K.units.find(u => u.team === 'ally'), e = K.units.find(u => u.team === 'enemy');
    const C = K.DamageCalculator, o = { crit: false };
    const ph = C.compute(a, e, 1, Object.assign({ type: 'physical' }, o)), mg = C.compute(a, e, 1, Object.assign({ type: 'magic' }, o)), tr = C.compute(a, e, 1, Object.assign({ type: 'true' }, o));
    out.pair = { atk: a.atkNow(), armor: e.defNow(), mr: e.mrNow(), phys: ph.dmg, magic: mg.dmg, true: tr.dmg,
      physWant: a.atkNow() * 100 / (100 + e.defNow()), magicWant: a.atkNow() * 100 / (100 + e.mrNow()), trueWant: a.atkNow() };
    // Giáp âm: giảm giáp mạnh → sát thương tăng nhưng tối đa ×2
    e.fx.push({ stat: 'def', add: -10000, dur: 5, tag: 'test' });
    out.neg = { armor: e.defNow(), dmg: C.compute(a, e, 1, { type: 'physical', crit: false }).dmg, cap: Math.round(a.atkNow() * 2 * 1.06) };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    return out;
  });
  console.log('   ' + JSON.stringify(dmg));
  check(dmg.f0 === 1 && Math.abs(dmg.f100 - 0.5) < 1e-9 && Math.abs(dmg.f50 - 100 / 150) < 1e-9, 'Damage = Raw × 100 / (100 + phòng thủ)');
  check(dmg.fm50 > 1 && dmg.fm100 > dmg.fm50 && dmg.fmBig <= 2 && dmg.fmBig > 1.99 && Number.isFinite(dmg.fInf) && dmg.fNaN === 1, 'phòng thủ âm: tăng dần, tối đa ×2, không chia cho 0 / vô hạn / NaN', dmg);
  const near = (x, y) => Math.abs(x - y) <= Math.max(2, y * 0.06);
  check(near(dmg.pair.phys, dmg.pair.physWant) && near(dmg.pair.magic, dmg.pair.magicWant) && near(dmg.pair.true, dmg.pair.trueWant), 'vật lý trừ theo giáp, phép theo kháng phép, chuẩn bỏ qua cả hai (±5% dao động)', dmg.pair);
  check(dmg.neg.dmg <= dmg.neg.cap && dmg.neg.dmg > dmg.pair.true, 'giáp −10000: sát thương bị chặn ở ≤ ×2', dmg.neg);

  // ---------- 1. 24 kỹ năng
  console.log('\n1. 24 tướng dùng đúng kỹ năng');
  const skills = await V(() => {
    const K = window.__vkkt, bad = [], rows = [];
    for (const k of K.CHAMPION_KEYS) {
      const sk = K.UNIT_DEFS[k].skill, before = K.combatLog.casts[sk] || 0, other = Object.assign({}, K.combatLog.casts);
      const r = K.CombatTestRunner.run({ allies: [[k, 2, 3, 2], ['thietve', 1, 4, 3]], enemies: [['mathu', 1, 3, 5], ['uminh', 1, 4, 6]], seed: 11, maxTime: 14, keepState: true });
      const n = (K.combatLog.casts[sk] || 0) - before;
      const wrong = Object.keys(K.combatLog.casts).filter(s => s !== sk && s !== 'thietBich' && s !== 'phaDia' && s !== 'uMinh' && (K.combatLog.casts[s] || 0) > (other[s] || 0));
      if (n < 1) bad.push(k + ': không tung ' + sk);
      if (wrong.length) bad.push(k + ': tung nhầm ' + wrong.join(','));
      const me = r.allies.find(u => u.key === k);
      rows.push(`${k}:${sk}×${n} sát thương ${me.dealt} hồi ${me.healed} khiên ${me.shielded}`);
      K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    }
    return { bad, rows };
  });
  skills.rows.forEach(r => console.log('   ' + r));
  check(skills.bad.length === 0, '24/24 tướng tung đúng kỹ năng của mình (chỉ kỹ năng đó)', skills.bad);

  // ---------- 2–4, 7–8, 14: nhiều trận ngẫu nhiên có seed
  console.log(`\n2–4, 7–8. ${FIGHTS} trận ngẫu nhiên (seed cố định)`);
  const many = await V(n => {
    const K = window.__vkkt, keys = K.CHAMPION_KEYS, out = { anomalies: [], results: { win: 0, lose: 0, draw: 0 }, time: 0, maxOverlap: 0, deadAtk: 0, bad: 0, dbl: 0, leftovers: [] };
    let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };   // chọn đội hình (tái hiện được)
    const side = rows => { const used = new Set(), list = [], size = 3 + Math.floor(rnd() * 6); while (list.length < size) { const c = Math.floor(rnd() * 8), r = rows[Math.floor(rnd() * rows.length)], k = c + ',' + r; if (used.has(k)) continue; used.add(k); list.push([keys[Math.floor(rnd() * keys.length)], 1 + Math.floor(rnd() * 3), c, r]); } return list; };
    for (let i = 0; i < n; i++) {
      const r = K.CombatTestRunner.run({ allies: side([0, 1, 2, 3]), enemies: side([4, 5, 6, 7]), seed: 1000 + i, keepState: true });
      out.results[r.result]++; out.time += r.time; out.maxOverlap = Math.max(out.maxOverlap, r.overlap);
      out.anomalies.push(...r.anomalies.map(a => `#${i}: ${a}`));
      out.deadAtk += K.CombatAudit ? 0 : 0;
      if (r.leftovers.projectiles || r.leftovers.tasks) out.leftovers.push(i);
      K.nextRound();
    }
    out.time = +(out.time / n).toFixed(1);
    return out;
  }, FIGHTS);
  // CombatAudit được đặt lại mỗi trận và ghi vào anomalies của trận đó
  console.log('   ' + JSON.stringify({ results: many.results, avgTime: many.time, maxOverlap: +many.maxOverlap.toFixed(3) }));
  check(!many.anomalies.some(a => /thiếu năng lượng/.test(a)), '2. không tung chiêu khi thiếu năng lượng', many.anomalies.filter(a => /thiếu/.test(a)).slice(0, 3));
  check(!many.anomalies.some(a => /NaN|ngoài khoảng/.test(a)), '4. không NaN / Infinity, máu & năng lượng trong khoảng', many.anomalies.filter(a => /NaN|khoảng/.test(a)).slice(0, 3));
  check(!many.anomalies.some(a => /2 lần/.test(a)), '7. mỗi đòn đánh thường gây sát thương tối đa 1 lần', many.anomalies.filter(a => /2 lần/.test(a)).slice(0, 3));
  check(!many.anomalies.some(a => /kẹt|không kết thúc/.test(a)), '8. không tướng nào đứng kẹt > 2,5 s, mọi trận đều kết thúc', many.anomalies.filter(a => /kẹt|kết thúc/.test(a)).slice(0, 3));
  check(many.maxOverlap < 0.05, '8. không đứng chồng lên nhau (cặp < 0,5 m dưới 5% thời gian)', many.maxOverlap);
  check(many.leftovers.length === 0, '12. hết trận không còn đạn / tác vụ đang chạy', many.leftovers.slice(0, 5));

  // 3. đánh xác: đếm trực tiếp qua CombatAudit trong 1 trận đông
  const dead = await V(() => {
    const K = window.__vkkt; let worst = 0, hitDead = 0;
    const orig = window.dealDamage;
    window.dealDamage = function (src, dst) { if (dst && !dst.alive) hitDead++; return orig.apply(this, arguments); };
    for (let i = 0; i < 6; i++) {
      K.CombatTestRunner.run({ allies: [['kiemdong', 2, 2, 3], ['thanhphong', 2, 3, 3], ['linhcung', 2, 4, 1], ['hoa', 2, 5, 1], ['anhsat', 2, 6, 3]], enemies: [['mathu', 1, 2, 4], ['huyetkiem', 1, 4, 4], ['uminh', 1, 3, 6], ['uminh', 1, 5, 6]], seed: 50 + i, keepState: true });
      worst = Math.max(worst, K.CombatAudit.deadTargetAttacks); K.nextRound();
    }
    window.dealDamage = orig;
    const changed = K.dealDamage(K.units[0], Object.assign(Object.create(Object.getPrototypeOf(K.units[0])), { hp: 0 }), 5, {});
    return { worst, hitDead, deadDmg: changed };
  });
  check(dead.worst === 0 && dead.deadDmg === 0, '3. không bắt đầu đòn đánh vào mục tiêu đã chết; sát thương lên xác luôn = 0', dead);

  // ---------- 5. Trạng thái hết hạn đúng lúc
  console.log('\n5. StatusEffectManager');
  const st = await V(() => {
    const K = window.__vkkt;
    K.CombatTestRunner.run({ allies: [['kiemdong', 1, 0, 0], ['linhy', 1, 7, 0]], enemies: [['mathu', 1, 7, 7]], seed: 9, maxTime: 0.05, keepState: true });
    const u = K.units.find(x => x.key === 'kiemdong'), src = K.units.find(x => x.team === 'enemy');
    [u, src].concat(K.units).forEach(x => { x.atkCd = 1e9; x.maxMana = 1e9; x.mana = 0; });
    const t0 = K.battle.time;
    K.applyStun(u, 1.0, 'stun', src); u.ccImmune = 0;
    K.applySlow(u, 0.3, 2.0, src); K.applySlow(u, 0.1, 5.0, src);   // yếu hơn → bỏ qua (strongest)
    u.fx.push({ stat: 'atk', mul: 1.2, dur: 3, tag: 'A' }); u.fx.push({ stat: 'atk', mul: 1.2, dur: 1, tag: 'A' });   // cùng tag → không cộng dồn
    u.fx.push({ stat: 'atk', mul: 1.1, dur: 3, tag: 'B' });   // tag khác → nhân
    u.fx.push({ type: 'dot', dot: 0.1, dur: 2, tick: 0.5, src, tag: 'D' });
    K.giveShield(u, 100, 1.5, src); K.giveShield(u, 60, 3, src);   // lá chắn: giữ lớn nhất, thời gian xa nhất
    const at = { stun: null, slow: null, atkA: null, atkB: null, dot: null, shield: null }, dotHits = { n: 0 };
    const orig = window.dealDamage; window.dealDamage = function (s, d, m, o) { if (d === u && o && o.dot) dotHits.n++; return orig.apply(this, arguments); };
    const mulAtk0 = +u.fx.mul('atk').toFixed(4), shield0 = u.shield, slowPow = u.fx.list.find(e => e.type === 'slow').power;
    for (let i = 0; i < 6 * 60 && K.battle.phase === 'fight'; i++) {
      K.simStep(K.STEP);
      const tt = +(K.battle.time - t0).toFixed(4);
      if (at.stun === null && u.status.stun <= 0) at.stun = tt;
      if (at.slow === null && !u.fx.hasType('slow')) at.slow = tt;
      if (at.atkA === null && !u.fx.has('A')) at.atkA = tt;
      if (at.atkB === null && !u.fx.has('B')) at.atkB = tt;
      if (at.dot === null && !u.fx.has('D')) at.dot = tt;
      if (at.shield === null && u.shield <= 0) at.shield = tt;
    }
    window.dealDamage = orig;
    // Thanh tẩy: choáng + thiêu + giảm giáp → gỡ 1 (mới nhất) rồi thêm 1
    K.applyStun(u, 3, 'stun', src); K.applyBurn(u, src, 0.1); u.fx.push({ stat: 'def', mul: 0.5, dur: 5, tag: 'C' });
    const before = u.fx.list.map(e => e.type), gone1 = u.fx.cleanse(1).map(e => e.type), gone2 = u.fx.cleanse(5).map(e => e.type);
    const tenacity = { tank: K.units.find(x => x.key === 'mathu').tenacity() };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    return { at, mulAtk0, shield0, slowPow, dotHits: dotHits.n, before, gone1, gone2, after: u.fx.list.length, tenacity, kiemdongTen: 1 - 0.85 };
  });
  console.log('   ' + JSON.stringify(st));
  const ok = (x, want) => x !== null && Math.abs(x - want) <= 1 / 60 + 1e-6;
  check(ok(st.at.stun, 1.0 * (1 - 0.15)), 'choáng 1 s (đấu sĩ kháng 15%) hết đúng 0,85 s', st.at.stun);
  check(ok(st.at.slow, 2.0) && Math.abs(st.slowPow - 0.3) < 1e-9, 'làm chậm: giữ hiệu ứng mạnh nhất (30%), hết đúng 2 s', { at: st.at.slow, power: st.slowPow });
  check(ok(st.at.atkA, 3.0) && ok(st.at.atkB, 3.0) && Math.abs(st.mulAtk0 - 1.32) < 1e-3, 'buff cùng tag làm mới (không cộng dồn), khác tag nhân với nhau (1,2 × 1,1), hết đúng 3 s', { mul: st.mulAtk0, A: st.at.atkA, B: st.at.atkB });
  check(ok(st.at.dot, 2.0) && st.dotHits === 4, 'sát thương theo thời gian 2 s / nhịp 0,5 s → đúng 4 nhịp, hết đúng 2 s', { at: st.at.dot, ticks: st.dotHits });
  check(st.shield0 === 100 && ok(st.at.shield, 3.0), 'lá chắn: giữ lượng lớn nhất (100), hết hạn ở mốc xa nhất (3 s)', { amount: st.shield0, at: st.at.shield });
  check(st.gone1.length === 1 && st.gone2.length === 2 && st.after === 0, 'thanh tẩy gỡ đúng số hiệu ứng bất lợi (mới nhất trước), lá chắn / buff không bị gỡ', st);

  // ---------- 9. Giới hạn thời gian & hoà
  console.log('\n9. Giới hạn thời gian & hoà');
  const draw = await V(() => {
    const K = window.__vkkt, g = K.game;
    const runOnce = () => {
      K.newGame(); g.level = 9; for (const u of K.boardAllies()) K.removeUnit(u);
      K.placeUnit('thietve', 1, 0, 0);
      const orig = window.enemyLineup; window.enemyLineup = () => [['mathu', 7, 7, 1]];
      K.battle.round = 2; K.setupRound(); window.enemyLineup = orig;
      K.battle.seedOverride = 5; K.startBattle(); K.battle.seedOverride = null;
      K.units.forEach(u => { u.atkCd = 1e9; u.manaLock = true; u.steerTo = () => {}; u.def = Object.assign({}, u.def, { dash: false }); });   // hai bên không đánh nhau
      const hp0 = g.hp; let steps = 0;
      while (K.battle.phase === 'fight' && steps < 70 * 60) { K.simStep(K.STEP); steps++; }
      return { result: K.battle.result, time: +K.battle.time.toFixed(2), hpLoss: hp0 - g.hp, streak: g.streak };
    };
    return runOnce();
  });
  console.log('   ' + JSON.stringify(draw));
  check(draw.result === 'draw' && Math.abs(draw.time - 60) < 0.05, 'hết 60 s mà hai bên còn người → HOÀ đúng lúc', draw);
  check(draw.hpLoss > 0 && draw.streak < 0, 'hoà tính như thua cho người chơi (mất máu, chuỗi thua) – kinh tế không đổi', draw);

  // ---------- 14. RNG có seed
  console.log('\n14. Random có seed');
  const rng = await V(() => {
    const K = window.__vkkt, cfg = s => ({ allies: [['kiemdong', 2, 2, 3], ['linhcung', 2, 4, 1], ['hoa', 1, 5, 1], ['thietve', 2, 3, 3]], enemies: [['mathu', 1, 3, 4], ['huyetkiem', 1, 4, 5], ['uminh', 1, 5, 6]], seed: s, keepState: true });
    const a = K.CombatTestRunner.run(cfg(777)); K.nextRound();
    const b = K.CombatTestRunner.run(cfg(777)); K.nextRound();
    const c = K.CombatTestRunner.run(cfg(778)); K.nextRound();
    return { same: a.fingerprint === b.fingerprint, diff: a.fingerprint !== c.fingerprint, a: a.fingerprint.slice(0, 80), steps: [a.steps, b.steps, c.steps] };
  });
  check(rng.same, 'cùng seed + cùng đội hình → kết quả giống hệt từng điểm máu, cùng số bước', rng);
  check(rng.diff, 'khác seed → diễn biến khác (né / chí mạng / dao động sát thương theo seed)', rng.steps);

  // ---------- 10–11. ×1 / ×2 và LOW / ULTRA – chạy VÒNG LẶP THỜI GIAN THỰC (render, VFX, hit stop…) tới cùng số bước
  console.log('\n10–11. Tốc độ ×1 / ×2 và đồ hoạ LOW / ULTRA (vòng lặp thời gian thực, dừng ở cùng bước mô phỏng)');
  const STOP = 6 * 60;
  const realRun = (speed, quality) => V(async ([speed, quality, STOP]) => {
    const K = window.__vkkt, g = K.game;
    K.QualityManager.set(quality, 'test');
    K.newGame(); g.level = 9; for (const u of K.boardAllies()) K.removeUnit(u);
    [['kiemdong', 2, 2, 3], ['ngukiem', 1, 3, 2], ['cuuviem', 1, 4, 1], ['kiemtien', 1, 5, 3], ['thietve', 2, 3, 3]].forEach(([k, s, c, r]) => K.placeUnit(k, s, c, r));
    const orig = window.enemyLineup; window.enemyLineup = () => [['mathu', 3, 4, 1], ['huyetkiem', 4, 5, 1], ['uminh', 2, 6, 1], ['uminh', 5, 6, 1]];
    K.battle.round = 4; K.setupRound(); window.enemyLineup = orig;
    K.boardAllies().forEach(u => { u.mana = u.maxMana - 5; });
    K.battle.speed = speed; K.battle.paused = false; K.battle.seedOverride = 4242; K.startBattle(); K.battle.seedOverride = null;
    K.units.forEach(u => { if (u.team === 'ally') u.mana = u.maxMana - 5; });
    K.battle.stopAtStep = STOP;
    await new Promise(res => { const w = () => (K.battle.paused || K.battle.phase !== 'fight' ? res() : requestAnimationFrame(w)); w(); });
    const fp = { step: K.battle.step, time: +K.battle.time.toFixed(4), hp: K.units.map(u => u.key + ':' + u.hp.toFixed(3)).join('|'), pos: K.units.map(u => u.pos.x.toFixed(3) + ',' + u.pos.z.toFixed(3)).join('|'), dealt: Math.round(K.combatLog.dealt || 0), particles: K.vfx.particles.live };
    K.battle.paused = false; K.battle.speed = 1; K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    return fp;
  }, [speed, quality, STOP]);
  const r1 = await realRun(1, 'MEDIUM'), r2 = await realRun(2, 'MEDIUM'), rl = await realRun(1, 'LOW'), ru = await realRun(2, 'ULTRA');
  console.log('   ×1 MEDIUM:', r1.step, r1.hp.slice(0, 90), '\n   ×2 MEDIUM:', r2.step, r2.hp.slice(0, 90), '\n   ×1 LOW   :', rl.step, rl.hp.slice(0, 90), '\n   ×2 ULTRA :', ru.step, ru.hp.slice(0, 90));
  check(r1.step === STOP && r2.step === STOP && r1.hp === r2.hp && r1.pos === r2.pos, '10. ×1 và ×2: cùng seed, cùng số bước → máu & vị trí mọi tướng giống hệt', { x1: r1.hp.slice(0, 60), x2: r2.hp.slice(0, 60) });
  check(rl.hp === ru.hp && rl.pos === ru.pos && rl.hp === r1.hp, '11. LOW và ULTRA (và ×2): sát thương / máu / vị trí giống hệt dù số hạt khác', { low: rl.particles, ultra: ru.particles });

  // ---------- 12. Không còn gì của trận trước
  console.log('\n12. Dọn trận');
  const clean = await V(() => {
    const K = window.__vkkt;
    K.CombatTestRunner.run({ allies: [['ngukiem', 2, 3, 2], ['cuuviem', 2, 4, 1], ['hondon', 1, 3, 3], ['loiton', 1, 5, 1]], enemies: [['mathu', 1, 3, 4], ['mathu', 1, 4, 4], ['uminh', 1, 3, 6]], seed: 21, maxTime: 4, keepState: true });
    const mid = { projectiles: K.Projectiles.list.length, tasks: K.SimTasks.list.length, zones: K.DangerZones.list.length };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    return { mid, projectiles: K.Projectiles.list.length, tasks: K.SimTasks.list.length, zones: K.DangerZones.list.length, timelines: K.timelines.length,
      statuses: K.units.reduce((a, u) => a + u.fx.list.length, 0), shields: K.units.reduce((a, u) => a + u.shield, 0), vfx: K.vfx.effects.length };
  });
  console.log('   ' + JSON.stringify(clean));
  check(clean.projectiles === 0 && clean.tasks === 0 && clean.zones === 0 && clean.timelines === 0 && clean.statuses === 0 && clean.shields === 0 && clean.vfx === 0,
    '12. vòng mới: 0 đạn, 0 tác vụ (vùng lửa / phi kiếm), 0 vùng báo trước, 0 timeline, 0 trạng thái, 0 lá chắn, 0 VFX', clean);

  // ---------- Kỹ năng đặc thù tuần 3
  console.log('\nKỹ năng đặc thù');
  const spec = await V(() => {
    const K = window.__vkkt, out = {};
    // Sét liên hoàn: 3 địch → nhảy tối đa 3 lần (mỗi địch 1 lần) dù jumps = 6
    const per = new Map(), orig = window.dealDamage;
    window.dealDamage = function (s, d, m, o) { if (s.key === 'loiton' && o && o.skill) per.set(d.id, (per.get(d.id) || 0) + 1); return orig.apply(this, arguments); };
    K.CombatTestRunner.run({ allies: [['loiton', 1, 3, 2]], enemies: [['mathu', 1, 3, 4], ['mathu', 1, 4, 4], ['mathu', 1, 5, 5]], seed: 2, maxTime: 0.05, keepState: true });
    const lo = K.units.find(u => u.key === 'loiton'); lo.mana = lo.maxMana; K.units.forEach(u => { if (u.team === 'enemy') { u.atkCd = 1e9; u.maxMana = 1e9; } });
    const j0 = K.combatLog.chainJumps || 0; for (let i = 0; i < 150; i++) K.simStep(K.STEP);
    out.chain = { jumps: (K.combatLog.chainJumps || 0) - j0, perTarget: [...per.values()] };
    window.dealDamage = orig; K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    // Vùng hỗn độn: có báo trước; địch đứng trong vùng chạy ra trong thời gian chuẩn bị
    K.CombatTestRunner.run({ allies: [['hondon', 1, 3, 3]], enemies: [['uminh', 1, 3, 5], ['uminh', 1, 4, 5], ['linhcung', 1, 3, 6]], seed: 4, maxTime: 0.05, keepState: true });
    const hd = K.units.find(u => u.key === 'hondon'); hd.mana = hd.maxMana; hd.atkCd = 1e9;
    K.units.forEach(u => { if (u.team === 'enemy') { u.maxMana = 1e9; } });
    let zoneSeen = false; const p0 = K.combatLog.riftPulses || 0, dz0 = K.combatLog.dodgedZones || 0;
    for (let i = 0; i < 180; i++) { K.simStep(K.STEP); if (K.DangerZones.list.length) zoneSeen = true; }
    out.rift = { telegraph: zoneSeen, pulses: (K.combatLog.riftPulses || 0) - p0, fled: +((K.combatLog.dodgedZones || 0) - dz0).toFixed(2) };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    // Linh Y thanh tẩy đồng minh đang bị choáng
    K.CombatTestRunner.run({ allies: [['linhy', 1, 2, 1], ['kiemdong', 1, 3, 3]], enemies: [['mathu', 1, 3, 6]], seed: 6, maxTime: 0.05, keepState: true });
    const ly = K.units.find(u => u.key === 'linhy'), kd = K.units.find(u => u.key === 'kiemdong'), foe = K.units.find(u => u.team === 'enemy');
    K.units.forEach(u => { u.atkCd = 1e9; if (u !== ly) u.maxMana = 1e9; });
    kd.ccImmune = 0; K.applyStun(kd, 4, 'stun', foe); ly.mana = ly.maxMana;
    const c0 = K.combatLog.cleansed || 0; for (let i = 0; i < 90; i++) K.simStep(K.STEP);
    out.cleanse = { cleansed: (K.combatLog.cleansed || 0) - c0, stunLeft: +kd.status.stun.toFixed(2) };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    // Ngự Kiếm: mỗi lần phi kiếm lao đi gây sát thương tối đa 1 lần
    K.CombatTestRunner.run({ allies: [['ngukiem', 1, 3, 2]], enemies: [['mathu', 1, 3, 5]], seed: 8, maxTime: 0.05, keepState: true });
    const nk = K.units.find(u => u.key === 'ngukiem'); nk.mana = nk.maxMana; nk.atkCd = 1e9; K.units.forEach(u => { if (u.team === 'enemy') { u.atkCd = 1e9; u.maxMana = 1e9; } });
    const l0 = K.combatLog.summonLaunch || 0, h0 = K.combatLog.summonHits || 0; for (let i = 0; i < 8 * 60; i++) { K.simStep(K.STEP); nk.atkCd = 1e9; }
    out.summon = { launched: (K.combatLog.summonLaunch || 0) - l0, hits: (K.combatLog.summonHits || 0) - h0 };
    K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
    return out;
  });
  console.log('   ' + JSON.stringify(spec));
  check(spec.chain.jumps === 3 && spec.chain.perTarget.every(n => n === 1), 'Cửu Thiên Lôi Kiếp: sét nhảy qua 3 địch, mỗi địch đúng 1 lần (không nhảy qua lại)', spec.chain);
  check(spec.rift.telegraph && spec.rift.pulses === 3 && spec.rift.fled > 0, 'Hỗn Độn Diệt Thế: báo trước vùng nổ, địch có chạy ra, nổ đủ 3 đợt', spec.rift);
  check(spec.cleanse.cleansed >= 1 && spec.cleanse.stunLeft === 0, 'Linh Y gỡ choáng cho đồng minh', spec.cleanse);
  check(spec.summon.launched >= 5 && spec.summon.hits <= spec.summon.launched && spec.summon.hits >= spec.summon.launched - 1, 'Ngự Kiếm: mỗi lần phi kiếm lao đi trúng tối đa 1 lần', spec.summon);

  // ---------- 13. Lưu & nâng sao
  console.log('\n13. Lưu & nâng sao');
  const save = await V(() => {
    const K = window.__vkkt, g = K.game; K.newGame();
    g.bench.fill(null); for (let i = 0; i < 3; i++) g.bench[i] = { key: 'linhy', star: 1, items: [] };
    K.mergeAll(); K.afterRosterChange();
    const sv = K.store.get('save', null);
    return { star: g.bench.filter(Boolean).map(e => e.key + '★' + e.star), saved: sv && sv.bench.filter(Boolean).map(e => e.key + '★' + e.star) };
  });
  check(save.star.join() === 'linhy★2' && save.saved && save.saved.join() === 'linhy★2', '3 × ★1 → ★2 và được lưu', save);

  console.log('\nLỗi console');
  check(errors.length === 0, '13. không có lỗi console / pageerror', errors.slice(0, 5));
  await browser.close();
  if (failures.length) { console.log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  console.log('\n✓ Combat V3.0: công thức sát thương, 24 kỹ năng, trạng thái, AI, hoà, seed, ×1/×2, LOW/ULTRA, dọn trận – đều đạt.');
}
main().catch(e => { console.error(e); process.exit(1); });
