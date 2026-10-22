// Vạn Kiếm Kỳ Trận – BalanceSimulator (V1.5 FINAL): mô phỏng hàng loạt trận bằng CombatTestRunner (không render, seed cố định),
// thống kê theo tướng / vai trò / bậc / sao / tộc-hệ, phát hiện bất thường theo NGƯỠNG CẤU HÌNH ĐƯỢC, xuất JSON / CSV.
// Hai đội luôn CÂN NGÂN SÁCH (tổng giá trị vàng = giá × 3^(sao−1)) để tỉ lệ thắng khi có mặt một tướng phản ánh sức mạnh tướng đó
// chứ không phải số tiền bỏ ra. Nạp sau js/combat/test-runner.js. Script thường (không phải module).
'use strict';
const BalanceSimulator = {
  /** Ngưỡng cảnh báo mặc định – truyền opts.thresholds để đổi. */
  THRESHOLDS: {
    minSamples: 40,          // dưới số trận có mặt này thì không kết luận
    winRateDelta: 0.12,      // |tỉ lệ thắng khi có mặt − 50%| vượt mức này VÀ khoảng tin cậy 95% không chứa 50% → mạnh / yếu bất thường
    longFight: 45,           // giây – trận dài bất thường
    hitRatio: 15,            // một đòn > 15 × công hiện tại của người gây → sát thương bất thường
    unitDealtPerFight: 9000, // một tướng gây > 9000 sát thương trong 1 trận → kiểm tra
    statusStack: 14,         // > 14 trạng thái cùng lúc trên một tướng → nghi cộng dồn vô hạn
    atkMul: 4,               // hệ số công × tốc đánh tạm thời > 4 → nghi cộng dồn vô hạn
    drawRate: 0.08           // tỉ lệ hoà toàn bộ > 8% → cảnh báo bế tắc
  },
  /** Đội ngẫu nhiên cân ngân sách. rnd: hàm [0,1) (có seed). level 4–9 quyết định số tướng và phân bố sao / bậc. */
  makeTeam(rnd, level, budget, enemy) {
    const odds = SHOP_ODDS[level], keys = CHAMPION_KEYS;
    const pickCost = () => { let r = rnd() * 100; for (let c = 0; c < 5; c++) { r -= odds[c]; if (r < 0) return c + 1; } return 1; };
    const list = []; let spent = 0, guard = 0;
    while (list.length < level && guard++ < 200) {
      const cost = pickCost(), pool = keys.filter(k => UNIT_DEFS[k].cost === cost);
      const key = pool[Math.floor(rnd() * pool.length)];
      const star = rnd() < (level >= 7 ? 0.35 : 0.2) ? 2 : rnd() < 0.04 && cost <= 2 ? 3 : 1;
      const val = cost * Math.pow(3, star - 1);
      if (spent + val > budget * 1.05 && list.length >= 3) continue;
      list.push([key, star]); spent += val;
      if (spent >= budget * 0.95 && list.length >= Math.min(level, 3)) break;
    }
    // xếp chỗ: cận chiến hàng đầu, đánh xa / hỗ trợ hàng sau, cột ngẫu nhiên
    const cols = [3, 4, 2, 5, 1, 6, 0, 7], used = new Set(), out = [];
    for (const [key, star] of list) {
      const back = !!UNIT_DEFS[key].ranged; const rows = back ? [1, 0, 2] : [3, 2, 1];
      let placed = false;
      for (const r of rows) {
        const free = cols.filter(c => !used.has(c + ',' + r)); if (!free.length) continue;
        const c = free[Math.floor(rnd() * Math.min(free.length, 4))]; used.add(c + ',' + r);
        out.push([key, star, c, enemy ? 7 - r : r]); placed = true; break;
      }
      if (!placed) break;
    }
    return { units: out, value: list.slice(0, out.length).reduce((a, [k, s]) => a + UNIT_DEFS[k].cost * Math.pow(3, s - 1), 0) };
  },
  /** Chạy n trận. opts: { n, seed, thresholds, onProgress(i, n), keepFights (lưu chi tiết từng trận – mặc định true) }. */
  run(opts = {}) {
    const n = opts.n || 100, T = Object.assign({}, this.THRESHOLDS, opts.thresholds || {}), t0 = performance.now();
    let s = (opts.seed || 2024) >>> 0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const snap = snapshotGame(); battle.sandbox = true;
    const fights = [], champ = {}, role = {}, cost = {}, star = {}, trait = {};
    const add = (m, k, win, extra) => { const a = m[k] || (m[k] = { n: 0, w: 0, dealt: 0, physical: 0, magic: 0, true: 0, taken: 0, healed: 0, shielded: 0, cc: 0, casts: 0, survival: 0, ehp: 0, dps: 0 }); a.n++; a.w += win; if (extra) for (const f in extra) a[f] += extra[f]; };
    const anomalies = [];
    let draws = 0, totalTime = 0, maxTime = 0;
    for (let i = 0; i < n; i++) {
      const level = 4 + Math.floor(rnd() * 6), budget = level * (level >= 7 ? 3.2 : 2.2);
      const A = this.makeTeam(rnd, level, budget, false), B = this.makeTeam(rnd, level, budget, true);
      const fightSeed = (opts.seed || 2024) * 7919 + i;
      const r = CombatTestRunner.run({ allies: A.units, enemies: B.units, seed: fightSeed, keepState: true });
      const res = r.result, wA = res === 'win' ? 1 : res === 'draw' ? 0.5 : 0;
      if (res === 'draw') draws++;
      totalTime += r.time; maxTime = Math.max(maxTime, r.time);
      const actA = Object.assign({}, TraitEngine.active), actB = Object.assign({}, TraitEngine.enemyActive || {});
      for (const [side, list, w, act] of [['A', r.allies, wA, actA], ['B', r.enemies, 1 - wA, actB]]) {
        const seenKey = new Set();
        for (const u of list) {
          const d = UNIT_DEFS[u.key], ex = { dealt: u.dealt, physical: u.physical, magic: u.magic, true: u.true, taken: u.taken, healed: u.healed, shielded: u.shielded, cc: u.cc, casts: u.casts, survival: u.survival, ehp: u.ehp, dps: u.dealt / Math.max(1, u.survival) };
          if (!seenKey.has(u.key)) { add(champ, u.key, w, ex); seenKey.add(u.key); }
          add(role, d.role, w, ex); add(cost, d.cost, w, ex); add(star, d.cost + '★' + u.star, w, ex);
          if (u.maxHitRatio > T.hitRatio) anomalies.push({ type: 'sát thương bất thường', fight: i, key: u.key, value: u.maxHitRatio, maxHit: u.maxHit });
          if (u.dealt > T.unitDealtPerFight) anomalies.push({ type: 'tổng sát thương 1 trận rất cao', fight: i, key: u.key, value: u.dealt });
          if (u.maxStatus > T.statusStack) anomalies.push({ type: 'nhiều trạng thái cùng lúc', fight: i, key: u.key, value: u.maxStatus });
          if (u.maxAtkMul > T.atkMul) anomalies.push({ type: 'hệ số công × tốc đánh tạm thời rất cao', fight: i, key: u.key, value: u.maxAtkMul });
        }
        for (const id in act) add(trait, id + ' ' + TRAITS[id].tiers[act[id] - 1], w);
      }
      if (r.time > T.longFight) anomalies.push({ type: 'trận dài', fight: i, value: r.time, result: res });
      r.anomalies.forEach(a => anomalies.push({ type: 'runner', fight: i, value: a }));
      if (opts.keepFights !== false) fights.push({ i, seed: fightSeed, level, valueA: A.value, valueB: B.value, result: res, time: r.time,
        A: r.allies.map(u => [u.key, u.star, Math.round(u.dealt), u.alive ? 1 : 0]), B: r.enemies.map(u => [u.key, u.star, Math.round(u.dealt), u.alive ? 1 : 0]) });
      nextRound();
      if (opts.onProgress) opts.onProgress(i + 1, n);
    }
    restoreGame(snap);
    // tổng hợp + cờ mạnh / yếu bất thường (Wilson 95%)
    const wilson = (w, k) => { if (!k) return [0, 1]; const z = 1.96, p = w / k, d = 1 + z * z / k, c = (p + z * z / (2 * k)) / d, h = z * Math.sqrt(p * (1 - p) / k + z * z / (4 * k * k)) / d; return [c - h, c + h]; };
    const fin = m => Object.fromEntries(Object.entries(m).map(([k, a]) => { const avg = f => +(a[f] / a.n).toFixed(1), ci = wilson(a.w, a.n);
      return [k, { n: a.n, winRate: +(a.w / a.n).toFixed(3), ci95: ci.map(x => +x.toFixed(3)), dealt: avg('dealt'), physical: avg('physical'), magic: avg('magic'), true: avg('true'), dps: avg('dps'), taken: avg('taken'), ehp: avg('ehp'), healed: avg('healed'), shielded: avg('shielded'), cc: avg('cc'), casts: avg('casts'), survival: avg('survival') }]; }));
    const champions = fin(champ), flags = [];
    for (const k in champions) {
      const c = champions[k];
      if (c.n < T.minSamples) { flags.push({ key: k, kind: 'ít dữ liệu', n: c.n }); continue; }
      if (c.winRate - 0.5 > T.winRateDelta && c.ci95[0] > 0.5) flags.push({ key: k, kind: 'mạnh bất thường', winRate: c.winRate, ci95: c.ci95, n: c.n });
      if (0.5 - c.winRate > T.winRateDelta && c.ci95[1] < 0.5) flags.push({ key: k, kind: 'yếu bất thường', winRate: c.winRate, ci95: c.ci95, n: c.n });
    }
    if (draws / n > T.drawRate) flags.push({ kind: 'hoà nhiều', rate: draws / n });
    return { meta: { n, seed: opts.seed || 2024, thresholds: T, ms: Math.round(performance.now() - t0), draws, avgTime: +(totalTime / n).toFixed(2), maxTime: +maxTime.toFixed(2) },
      champions, roles: fin(role), costs: fin(cost), stars: fin(star), traits: fin(trait), flags, anomalies, fights };
  },
  /** CSV: một dòng mỗi tướng (tổng hợp) và một dòng mỗi trận. */
  toCSV(rep) {
    const head = ['id', 'n', 'winRate', 'ci_lo', 'ci_hi', 'dealt', 'physical', 'magic', 'true', 'dps', 'taken', 'ehp', 'healed', 'shielded', 'cc', 'casts', 'survival'];
    const champ = [head.join(',')].concat(Object.entries(rep.champions).map(([k, c]) => [k, c.n, c.winRate, c.ci95[0], c.ci95[1], c.dealt, c.physical, c.magic, c.true, c.dps, c.taken, c.ehp, c.healed, c.shielded, c.cc, c.casts, c.survival].join(',')));
    const fights = ['i,seed,level,valueA,valueB,result,time,A,B'].concat(rep.fights.map(f => [f.i, f.seed, f.level, f.valueA, f.valueB, f.result, f.time, '"' + f.A.map(u => u[0] + '*' + u[1]).join(' ') + '"', '"' + f.B.map(u => u[0] + '*' + u[1]).join(' ') + '"'].join(',')));
    return { champions: champ.join('\n'), fights: fights.join('\n') };
  }
};
if (window.__vkkt) window.__vkkt.BalanceSimulator = BalanceSimulator;
