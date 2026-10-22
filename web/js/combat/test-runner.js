// Vạn Kiếm Kỳ Trận – CombatTestRunner (V1.5 tuần 3): mô phỏng giao tranh KHÔNG render (chỉ gọi simStep cố định 60 Hz).
// Dùng cho kiểm thử tự động và báo cáo cân bằng: cùng seed + cùng đội hình → cùng kết quả (tái hiện lỗi).
// Từ console:  CombatTestRunner.run({ allies: [['kiemdong', 2, 3, 3]], enemies: [['mathu', 1, 3, 4]], seed: 42 })
// Nạp sau js/19-main.js. Script thường (không phải module).
'use strict';
const CombatTestRunner = {
  /** cfg: { allies: [[key, star, c, r]], enemies: [[key, star, c, r]] (hàng 4–7, đặt theo phía địch), seed, round (hệ số địch – mặc định 1 = không nhân),
   *        enemyScale (ghi đè hệ số), maxTime (mặc định theo BATTLE_RULES.limit), level, sample: số giây giữa 2 lần lấy mẫu kẹt / chồng (0.1) }
   *  Trả về: { result, time, steps, seed, allies[], enemies[] (thống kê từng tướng), anomalies[], log } */
  run(cfg) {
    const snap = cfg.keepState ? null : snapshotGame(), sb0 = !!battle.sandbox;
    battle.sandbox = true;   // không ghi bản lưu thật trong lúc thử (restoreGame / newGame tắt lại)
    const g = game; g.level = cfg.level || 9; g.over = false; battle.bench = false;
    for (const u of boardAllies()) removeUnit(u);
    (cfg.allies || []).forEach(([k, s, c, r]) => placeUnit(k, s || 1, c, r));
    const orig = window.enemyLineup;
    window.enemyLineup = () => (cfg.enemies || []).map(([k, s, c, r]) => [k, c, r, s || 1]);
    battle.round = cfg.round || 1;
    battle.enemyTraits = cfg.enemyTraits !== false;   // mặc định đối xứng: phe địch cũng có tộc/hệ
    try { setupRound(); } finally { window.enemyLineup = orig; }
    // hệ số địch: mặc định 1 (so sánh tướng với tướng), hoặc theo vòng như trong game
    const scale = cfg.enemyScale !== undefined ? cfg.enemyScale : cfg.round ? 0.85 * Math.pow(1.07, cfg.round - 1) : 1;
    units.forEach(u => { if (u.team === 'enemy') u.reset(scale); });
    battle.seedOverride = cfg.seed !== undefined ? cfg.seed : 1;
    startBattle();
    battle.seedOverride = null; battle.enemyTraits = false;
    const anomalies = [], maxT = cfg.maxTime !== undefined ? cfg.maxTime : BATTLE_RULES.limit + 1, sampleEvery = Math.round((cfg.sample || 0.1) / STEP);
    const track = new Map(units.map(u => [u, { lastX: u.pos.x, lastZ: u.pos.z, still: 0, maxStill: 0 }]));
    let steps = 0, overlap = 0, samples = 0;
    while (battle.phase === 'fight' && steps * STEP < maxT) {
      simStep(STEP); steps++;
      if (steps % sampleEvery) continue;
      samples++;
      const alive = units.filter(u => u.alive);
      for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) if (Math.hypot(alive[i].pos.x - alive[j].pos.x, alive[i].pos.z - alive[j].pos.z) < 0.5) { overlap++; i = alive.length; break; }
      for (const u of alive) {
        for (const k of ['hp', 'maxHp', 'mana', 'atk', 'def_', 'mr_', 'ap_']) if (!Number.isFinite(u[k])) anomalies.push(`${u.key}: ${k} = ${u[k]}`);
        if (u.hp > u.maxHp + 1e-6 || u.mana > u.maxMana + 1e-6 || u.hp < 0) anomalies.push(`${u.key}: máu/năng lượng ngoài khoảng`);
        const tr = track.get(u), moved = Math.hypot(u.pos.x - tr.lastX, u.pos.z - tr.lastZ);
        const far = u.target && u.target.alive && Math.hypot(u.target.pos.x - u.pos.x, u.target.pos.z - u.pos.z) > u.def.range + 0.45;
        if (u.fsm.name === 'move' && far && moved < 0.03) tr.still += sampleEvery * STEP; else tr.still = 0;
        tr.maxStill = Math.max(tr.maxStill, tr.still); tr.lastX = u.pos.x; tr.lastZ = u.pos.z;
        // phát hiện cộng dồn bất thường: số trạng thái cùng lúc và hệ số công / tốc đánh lớn nhất
        u.cs.maxStatus = Math.max(u.cs.maxStatus, u.fx.list.length); u.cs.maxAtkMul = Math.max(u.cs.maxAtkMul, u.fx.mul('atk') * u.fx.mul('aspd'));
      }
      if (anomalies.length > 20) break;
    }
    if (battle.phase === 'fight') anomalies.push('trận không kết thúc trong giới hạn thời gian');
    for (const [u, tr] of track) if (tr.maxStill > 2.5) anomalies.push(`${u.team}:${u.key} đứng kẹt ${tr.maxStill.toFixed(1)} s`);
    if (CombatAudit.doubleHits) anomalies.push(`đòn thường gây sát thương 2 lần: ${CombatAudit.doubleHits}`);
    if (CombatAudit.badCasts) anomalies.push(`tung chiêu khi thiếu năng lượng: ${CombatAudit.badCasts}`);
    if (CombatAudit.nonFinite) anomalies.push(`chỉ số NaN / Infinity: ${CombatAudit.nonFinite}`);
    const pack = u => ({ key: u.key, star: u.star, alive: u.alive, hp: Math.round(u.hp), maxHp: u.maxHp, ...Object.fromEntries(Object.entries(u.cs).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      survival: +(u.cs.deathT >= 0 ? u.cs.deathT : battle.time).toFixed(2), ehp: Math.round(u.maxHp / defenseFactor((u.def_ + u.mr_) / 2)) });
    const out = { result: battle.result, time: +battle.time.toFixed(3), steps, seed: battle.seed, overlap: samples ? overlap / samples : 0,
      allies: units.filter(u => u.team === 'ally').map(pack), enemies: units.filter(u => u.team === 'enemy').map(pack), anomalies,
      leftovers: { projectiles: Projectiles.list.length, tasks: SimTasks.list.length, timelines: timelines.filter(t => !t.done).length },
      fingerprint: units.map(u => u.key + ':' + Math.round(u.hp * 1000)).join('|') + '@' + steps };
    if (snap) restoreGame(snap, sb0);
    return out;
  },
  /** Chạy nhiều seed; trả về tỉ lệ thắng (hoà tính 0,5), thời lượng TB, sát thương TB mỗi tướng. */
  series(cfg, seeds) {
    const runs = []; for (const s of seeds) runs.push(this.run(Object.assign({}, cfg, { seed: s })));
    const n = runs.length, agg = {};
    for (const r of runs) for (const u of r.allies.concat(r.enemies)) { const a = agg[u.key] || (agg[u.key] = { dealt: 0, taken: 0, healed: 0, shielded: 0, casts: 0, n: 0 }); a.dealt += u.dealt; a.taken += u.taken; a.healed += u.healed; a.shielded += u.shielded; a.casts += u.casts; a.n++; }
    for (const k in agg) for (const f of ['dealt', 'taken', 'healed', 'shielded', 'casts']) agg[k][f] = +(agg[k][f] / agg[k].n).toFixed(1);
    return { n, winRate: runs.reduce((a, r) => a + (r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0), 0) / n, draws: runs.filter(r => r.result === 'draw').length,
      avgTime: +(runs.reduce((a, r) => a + r.time, 0) / n).toFixed(2), anomalies: runs.flatMap(r => r.anomalies), units: agg };
  }
};
if (window.__vkkt) window.__vkkt.CombatTestRunner = CombatTestRunner;
