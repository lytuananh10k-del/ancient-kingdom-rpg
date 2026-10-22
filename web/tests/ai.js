// Kiểm thử AI (mục V): dẫn đường, chọn mục tiêu, kỹ năng – đo trên nhiều trận có seed (CombatTestRunner, không render) + kịch bản dựng sẵn.
// Chạy: cd web && npm run test:ai → docs/reports/ai.json
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const N = +(process.env.N || 80);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' – ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); };

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
  await page.reload();
  await page.click('#btn-enter');

  // ---- A. thống kê trên N trận ngẫu nhiên (đội cân ngân sách như BalanceSimulator) ----
  const A = await page.evaluate(n => {
    const K = window.__vkkt, G = K.NavGrid, STEP = K.STEP, snap = K.snapshotGame();
    const st = { fights: 0, unitSec: 0, searches: 0, maxSearch1s: 0, sharedStill: 0, stillSamples: 0, closePairs: 0, pairSamples: 0, reversals: 0, moveSec: 0,
      rangedAtk: [], meleeAtk: [], heals: 0, badHeals: 0, deadDmg: 0, deadHeals: 0, castOverlap: 0, maxCastT: 0, maxCastOther: 0, maxStuck: 0, ahsat: { casts: 0, back: 0 }, maxCC: 0 };
    // móc đếm (chỉ trong bài kiểm thử)
    const origA = G.astar, perUnit = new Map();
    G.astar = function (self, ...rest) { st.searches++; const w = perUnit.get(self.id) || []; w.push(K.battle.step); perUnit.set(self.id, w); return origA.call(this, self, ...rest); };
    const oHeal = window.healUnit;
    window.healUnit = function (src, dst, amt, ...rest) { if (dst && src && amt > 0) { st.heals++; if (dst.team !== src.team) st.badHeals++; if (!dst.alive) st.deadHeals++; } return oHeal.call(this, src, dst, amt, ...rest); };
    const oDeal = window.dealDamage;
    window.dealDamage = function (src, dst, ...rest) { const alive = dst && dst.alive, r = oDeal.call(this, src, dst, ...rest); if (!alive && r > 0) st.deadDmg++; return r; };
    let s = 99991; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const RUN = K.CombatTestRunner;
    for (let i = 0; i < n; i++) {
      const level = 4 + Math.floor(rnd() * 6), budget = level * (level >= 7 ? 3.2 : 2.2);
      const T1 = K.BalanceSimulator.makeTeam(rnd, level, budget, false), T2 = K.BalanceSimulator.makeTeam(rnd, level, budget, true);
      // chạy từng bước để lấy mẫu chi tiết (giống CombatTestRunner nhưng có quan sát)
      RUN.run({ allies: T1.units, enemies: T2.units, seed: 5000 + i, keepState: true, maxTime: 0 });   // dựng trận, chưa chạy
      perUnit.clear();
      const prev = new Map(), castT = new Map(), still = new Map();
      let steps = 0;
      while (K.battle.phase === 'fight' && steps * STEP < 62) {
        K.simStep(STEP); steps++;
        const alive = K.units.filter(u => u.alive);
        st.unitSec += alive.length * STEP;
        for (const u of alive) {
          const fs = u.fsm.name;
          // thời gian liên tục ở CAST
          const ct = fs === 'cast' ? (castT.get(u) || 0) + STEP : 0; castT.set(u, ct); st.maxCastT = Math.max(st.maxCastT, ct); if (u.def.skill !== 'vanKiem') st.maxCastOther = Math.max(st.maxCastOther, ct);
          if (fs === 'move') {
            st.moveSec += STEP;
            const p = prev.get(u);
            if (p && p.fs === 'move') {
              const vx = u.pos.x - p.x, vz = u.pos.z - p.z, l = Math.hypot(vx, vz), pl = Math.hypot(p.vx, p.vz);
              if (l > 1e-3 && pl > 1e-3 && (vx * p.vx + vz * p.vz) / (l * pl) < -0.5) st.reversals++;   // đảo chiều gắt giữa 2 bước liên tiếp = giật
              prev.set(u, { x: u.pos.x, z: u.pos.z, vx, vz, fs });
            } else prev.set(u, { x: u.pos.x, z: u.pos.z, vx: 0, vz: 0, fs });
            // kẹt: đang đi, mục tiêu ngoài tầm mà không nhích
            const sk = still.get(u) || { x: u.pos.x, z: u.pos.z, t: 0 };
            if (Math.hypot(u.pos.x - sk.x, u.pos.z - sk.z) < 0.05 && u.target && u.target.alive && u.target.pos.distanceTo(u.pos) > u.def.range + 0.45) sk.t += STEP; else { sk.t = 0; sk.x = u.pos.x; sk.z = u.pos.z; }
            still.set(u, sk); st.maxStuck = Math.max(st.maxStuck, sk.t);
          } else { prev.set(u, { x: u.pos.x, z: u.pos.z, vx: 0, vz: 0, fs }); still.delete(u); }
          if (fs === 'attack' && u.target && u.target.alive) (u.def.ranged ? st.rangedAtk : st.meleeAtk).push(+u.pos.distanceTo(u.target.pos).toFixed(2));
        }
        if (steps % 6) continue;
        // 2 tướng đứng yên (đánh / hồi chiêu / thi triển) cùng một ô dẫn đường
        const stillU = alive.filter(u => ['attack', 'recover', 'cast', 'idle'].includes(u.fsm.name)), cells = new Map();
        for (const u of stillU) { const c = G.cellOf(u.pos.x, u.pos.z); cells.set(c, (cells.get(c) || 0) + 1); }
        st.stillSamples++; if ([...cells.values()].some(v => v > 1)) st.sharedStill++;
        st.pairSamples++;
        outer: for (let a = 0; a < alive.length; a++) for (let b = a + 1; b < alive.length; b++) if (Math.hypot(alive[a].pos.x - alive[b].pos.x, alive[a].pos.z - alive[b].pos.z) < 0.35) { st.closePairs++; break outer; }
      }
      // A* tối đa trong 1 giây của một tướng
      for (const w of perUnit.values()) { let j = 0; for (let k = 0; k < w.length; k++) { while (w[k] - w[j] > 60) j++; st.maxSearch1s = Math.max(st.maxSearch1s, k - j + 1); } }
      for (const u of K.units) st.maxCC = Math.max(st.maxCC, u.cs.cc);
      st.fights++;
      K.nextRound();
    }
    G.astar = origA; window.healUnit = oHeal; window.dealDamage = oDeal;
    K.restoreGame(snap);
    const avg = a => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null), pct = (a, q) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length * q)] : null);
    return { fights: st.fights, searchesPerUnitSec: +(st.searches / st.unitSec).toFixed(3), maxSearch1s: st.maxSearch1s, sharedStillRate: +(st.sharedStill / st.stillSamples).toFixed(4),
      closePairRate: +(st.closePairs / st.pairSamples).toFixed(4), reversalsPerMoveSec: +(st.reversals / Math.max(1, st.moveSec)).toFixed(3), maxStuck: +st.maxStuck.toFixed(2),
      rangedAtkDist: { avg: avg(st.rangedAtk), p05: pct(st.rangedAtk, 0.05) }, meleeAtkDist: { avg: avg(st.meleeAtk), p95: pct(st.meleeAtk, 0.95) },
      heals: st.heals, badHeals: st.badHeals, deadHeals: st.deadHeals, deadDmg: st.deadDmg, maxCastT: +st.maxCastT.toFixed(2), maxCastOther: +st.maxCastOther.toFixed(2), badCasts: K.CombatAudit.badCasts };
  }, N);
  console.log('Thống kê', N, 'trận:', JSON.stringify(A));
  check(`Dẫn đường: không chạy A* mỗi khung (TB ${A.searchesPerUnitSec} lần / tướng / giây, tối đa ${A.maxSearch1s} lần trong 1 s; mỗi khung = 60)`, A.searchesPerUnitSec < 3 && A.maxSearch1s <= 12);
  check(`Dẫn đường: không đứng chồng / xuyên qua nhau (cặp tâm < 0,35 m ở ${(A.closePairRate * 100).toFixed(2)}% mẫu)`, A.closePairRate < 0.02);
  check(`Dẫn đường: hai tướng đứng yên không chung một ô (${(A.sharedStillRate * 100).toFixed(2)}% mẫu)`, A.sharedStillRate < 0.03);
  check(`Dẫn đường: không giật qua lại (${A.reversalsPerMoveSec} lần đảo chiều gắt / giây di chuyển)`, A.reversalsPerMoveSec < 0.5);
  check(`Dẫn đường: không kẹt (đứng yên lâu nhất khi cần đi: ${A.maxStuck} s)`, A.maxStuck <= 2.5);
  check(`Mục tiêu: đánh xa giữ khoảng cách (TB ${A.rangedAtkDist.avg} m, 5% gần nhất ${A.rangedAtkDist.p05} m), cận chiến đánh ở tầm gần (TB ${A.meleeAtkDist.avg} m)`, A.rangedAtkDist.avg > 3 && A.meleeAtkDist.avg < A.rangedAtkDist.avg);
  check(`Mục tiêu: hỗ trợ chỉ hồi đồng minh còn sống (${A.heals} lần hồi, sai phe ${A.badHeals}, lên xác ${A.deadHeals})`, A.heals > 0 && A.badHeals === 0 && A.deadHeals === 0);
  check(`Mục tiêu: không gây sát thương lên mục tiêu đã chết (${A.deadDmg})`, A.deadDmg === 0);
  check(`Kỹ năng: không bị kẹt ở CAST (lâu nhất ${A.maxCastT} s – Vạn Kiếm Quy Tông kênh tới 5,1 s theo thiết kế, chiêu khác ${A.maxCastOther} s), không tung khi thiếu năng lượng (${A.badCasts})`, A.maxCastT <= 5.1 && A.maxCastOther < 2.5 && A.badCasts === 0);

  // ---- B. kịch bản dựng sẵn ----
  const B = await page.evaluate(() => {
    const K = window.__vkkt, RUN = K.CombatTestRunner, STEP = K.STEP, out = {};
    const until = (fn, t) => { let s = 0; while (s * STEP < t && !fn()) { K.simStep(STEP); s++; } return +(s * STEP).toFixed(2); };
    // B1. bị chặn đường: tướng cận chiến sau một hàng đồng minh bị choáng dài → phải đi vòng, vẫn tới đánh được
    RUN.run({ allies: [['mabinh', 1, 3, 0], ['thietve', 3, 2, 1], ['thietve', 3, 3, 1], ['thietve', 3, 4, 1]], enemies: [['kiemdong', 1, 3, 7]], seed: 11, keepState: true, maxTime: 0 });
    const ma = K.units.find(u => u.key === 'mabinh'), walls = K.units.filter(u => u.key === 'thietve'), foe = K.units.find(u => u.team === 'enemy');
    walls.forEach(w => { K.applyStun(w, 30); w.ccImmune = 0; }); foe.reset(1); foe.hp = foe.maxHp = 99999; foe.atk = 0;
    let minWall = Infinity;
    const t1 = until(() => { for (const w of walls) minWall = Math.min(minWall, Math.hypot(w.pos.x - ma.pos.x, w.pos.z - ma.pos.z)); return ma.fsm.name === 'attack'; }, 20);
    out.detour = { t: t1, minDistToWall: +minWall.toFixed(2), reached: ma.fsm.name === 'attack', wallsMoved: walls.some(w => w.pos.distanceTo(K.tileCenter(w.homeTile.c, w.homeTile.r)) > 0.5) };
    K.nextRound();
    // B2. góc bàn: tướng ở góc (0,0) đánh địch ở góc đối diện, có chướng ngại ở giữa
    RUN.run({ allies: [['kiemdong', 1, 0, 0], ['thietve', 1, 1, 1]], enemies: [['mabinh', 1, 7, 7]], seed: 12, keepState: true, maxTime: 0 });
    const kd = K.units.find(u => u.key === 'kiemdong'), e2 = K.units.find(u => u.team === 'enemy'); e2.hp = e2.maxHp = 99999; e2.atk = 0;
    out.corner = { t: until(() => kd.fsm.name === 'attack', 20), reached: kd.fsm.name === 'attack' };
    K.nextRound();
    // B3. sát thủ nhắm tuyến sau: Ảnh Sát đầy năng lượng, địch có đỡ đòn hàng đầu + pháp sư hàng cuối
    RUN.run({ allies: [['anhsat', 1, 3, 3]], enemies: [['kimcuong', 1, 3, 4], ['thietve', 1, 4, 4], ['hoa', 1, 3, 7]], seed: 13, keepState: true, maxTime: 0 });
    const as = K.units.find(u => u.key === 'anhsat'); as.mana = as.maxMana;
    const oStart = as.startCast.bind(as); let castTarget = null;
    as.startCast = function () { const sk = K.SKILLS[this.def.skill]; castTarget = sk && sk.pick ? sk.pick(this) : this.findTarget(); return oStart(); };
    until(() => castTarget, 4);
    out.assassin = { target: castTarget && castTarget.key };
    K.nextRound();
    // B4. khống chế lúc đang thi triển: giáp chiêu – vẫn thi triển xong, sau đó mới bị choáng phần còn lại; không kẹt CAST
    RUN.run({ allies: [['hoa', 1, 3, 1]], enemies: [['kimcuong', 1, 3, 4]], seed: 14, keepState: true, maxTime: 0 });
    const ho = K.units.find(u => u.key === 'hoa'); ho.mana = ho.maxMana;
    until(() => ho.fsm.name === 'cast', 3);
    const inCast = ho.fsm.name === 'cast'; K.applyStun(ho, 1.5);
    const tCastEnd = until(() => ho.fsm.name !== 'cast', 4);
    until(() => ho.fsm.name === 'stun', 0.3); const afterCast = ho.fsm.name;   // phần choáng còn dư áp ngay sau khi thi triển xong
    const tStunEnd = until(() => ho.fsm.name !== 'stun', 4);
    out.interrupt = { inCast, afterCast, tCastEnd, tStunEnd, final: ho.fsm.name, casts: ho.cs.casts, mana: Math.round(ho.mana) };
    K.nextRound();
    // B5. mục tiêu biến mất giữa chiêu: giết mục tiêu ngay khi bắt đầu thi triển → không lỗi, caster trở lại bình thường
    RUN.run({ allies: [['loiton', 1, 3, 1]], enemies: [['mabinh', 1, 3, 5], ['kiemdong', 1, 5, 6]], seed: 15, keepState: true, maxTime: 0 });
    const lt = K.units.find(u => u.key === 'loiton'); lt.mana = lt.maxMana;
    until(() => lt.fsm.name === 'cast', 3);
    K.units.filter(u => u.team === 'enemy').forEach(u => { u.hp = 1; K.dealDamage(lt, u, 50, { skill: true }); });
    const back = until(() => lt.fsm.name !== 'cast', 4);
    out.removed = { backToNormal: back, state: lt.fsm.name, phase: K.battle.phase };
    K.nextRound();
    // B6. nhiều chiêu cùng lúc: 6 tướng đầy năng lượng cùng một bước – mỗi tướng đúng 1 lần thi triển, không chồng
    RUN.run({ allies: [['hoa', 1, 2, 1], ['bangling', 1, 3, 1], ['cuuviem', 1, 4, 1]], enemies: [['hoa', 1, 2, 6], ['bangling', 1, 3, 6], ['cuuviem', 1, 4, 6]], seed: 16, keepState: true, maxTime: 0 });
    K.units.forEach(u => { u.mana = u.maxMana; u.cs.casts = 0; });
    let overlap = 0; const seen = new Map();
    K.units.forEach(u => { const o = u.startCast.bind(u); u.startCast = function () { if (this.casting && !this.casting.released) overlap++; return o(); }; });
    until(() => false, 3);
    out.multi = { casts: K.units.map(u => u.cs.casts), overlap, phase: K.battle.phase };
    K.nextRound();
    return out;
  });
  console.log('Kịch bản:', JSON.stringify(B));
  check(`Đường bị chặn: đi vòng / lách khe giữa hàng đồng minh đứng yên (không lại gần quá ${B.detour.minDistToWall} m – không xuyên qua) và tới đánh sau ${B.detour.t} s`, B.detour.reached && B.detour.minDistToWall > 0.6 && !B.detour.wallsMoved);
  check(`Góc bàn: từ góc (0,0) tới đánh địch ở góc đối diện sau ${B.corner.t} s`, B.corner.reached);
  check(`Sát thủ nhắm tuyến sau: Ảnh Sát chọn ${B.assassin.target} (pháp sư hàng cuối) thay vì đỡ đòn hàng đầu`, B.assassin.target === 'hoa');
  check(`Khống chế lúc thi triển: thi triển xong (${B.interrupt.tCastEnd} s) rồi mới choáng (${B.interrupt.afterCast}), hết choáng sau ${B.interrupt.tStunEnd} s, ${B.interrupt.casts} lần tung`, B.interrupt.inCast && B.interrupt.afterCast === 'stun' && B.interrupt.final !== 'cast' && B.interrupt.casts === 1);
  check(`Mục tiêu biến mất giữa chiêu: không lỗi, rời CAST sau ${B.removed.backToNormal} s`, B.removed.backToNormal < 2.5 && B.removed.state !== 'cast');
  check(`Nhiều chiêu cùng lúc: mỗi tướng tung đúng 1 lần (${B.multi.casts.join(',')}), không chiêu chồng trên cùng tướng (${B.multi.overlap})`, B.multi.casts.every(c => c === 1) && B.multi.overlap === 0);
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} PASS`);
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/reports/ai.json'), JSON.stringify({ date: new Date().toISOString(), fights: N, stats: A, scenarios: B, results }, null, 1));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
