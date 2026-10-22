// Vạn Kiếm Kỳ Trận – Vòng lặp chính, khởi động (mục 27)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 27. Vòng lặp chính – mô phỏng bước cố định 60 Hz, render theo khung
 * ===================================================================*/
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; applyLensShift();
  const d = Math.min(2, window.devicePixelRatio || 1); fx2d.width = Math.round(w * d); fx2d.height = Math.round(h * d); fxScale = d * clamp(Math.min(w, h) / 700, 0.85, 1.3);
  vfx.particles.material.uniforms.uScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(camera.fov * DEG / 2));
  if (bloom.level) bloom.resize(w, h);
}
window.addEventListener('resize', () => { resize(); if (battle.phase === 'prep') requestAnimationFrame(applyPrepCamera); });

const STEP = 1 / 60;
let acc = 0, last = performance.now(), fpsAcc = 0, fpsFrames = 0;
function simStep(dt) {
  vfx.simJobs.length = 0;
  battle.step++;
  if (battle.phase === 'fight') battle.time += dt;
  for (let i = timelines.length - 1; i >= 0; i--) { timelines[i].update(dt); if (timelines[i].done) timelines.splice(i, 1); }
  for (const u of units) u.simStep(dt);
  Projectiles.update(dt);
  SimTasks.update(dt);
  TraitEngine.update(dt);
  checkBattleEnd();
}
/** PerfStats: thời gian khung hình (vòng 600 khung), thời gian cập nhật game / render (ms, trung bình trượt), draw call, tam giác.
 *  Đo bằng performance.now() – rẻ, luôn bật; bảng Debug và tests/perf.js đọc. */
const PerfStats = {
  ft: new Float32Array(600), i: 0, n: 0, update: 0, render: 0, calls: 0, tris: 0, lastUpdate: 0, lastRender: 0,
  push(dtMs, upd, ren) {
    this.ft[this.i] = dtMs; this.i = (this.i + 1) % this.ft.length; this.n = Math.min(this.n + 1, this.ft.length);
    this.lastUpdate = upd; this.lastRender = ren; this.update += (upd - this.update) * 0.05; this.render += (ren - this.render) * 0.05;
    this.calls = renderer.info.render.calls; this.tris = renderer.info.render.triangles;
  },
  reset() { this.n = 0; this.i = 0; },
  /** FPS trung bình, 1% thấp (FPS ở khung chậm thứ 99 phần trăm), thời gian khung TB / p99 (ms). */
  summary() {
    const a = Array.from(this.ft.subarray(0, this.n)).sort((x, y) => x - y); if (!a.length) return null;
    const avg = a.reduce((s, v) => s + v, 0) / a.length, p99 = a[Math.min(a.length - 1, Math.floor(a.length * 0.99))];
    return { frames: a.length, fps: +(1000 / avg).toFixed(1), low1: +(1000 / p99).toFixed(1), frameMs: +avg.toFixed(2), p99Ms: +p99.toFixed(2), updateMs: +this.update.toFixed(2), renderMs: +this.render.toFixed(2) };
  }
};
function frame(now) {
  requestAnimationFrame(frame);
  if (appState.glLost) { last = now; return; }   // mất ngữ cảnh WebGL: không vẽ, không chạy logic cho tới khi khôi phục
  const tf0 = performance.now(), rawDt = now - last;
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  QualityManager.sample(dt);
  fpsAcc += dt; fpsFrames++; if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsFrames / fpsAcc) + ' fps'; fpsAcc = 0; fpsFrames = 0; }
  let scale = battle.paused ? 0 : battle.speed;
  if (hitStopTimer > 0) { hitStopTimer -= dt; scale *= 0.06; }
  const sdt = dt * scale;
  acc += sdt; let steps = 0;
  while (acc >= STEP && steps < 6) {
    simStep(STEP); acc -= STEP; steps++;
    // điểm dừng cho kiểm thử tái hiện (tốc độ ×1 / ×2, LOW / ULTRA phải ra cùng trạng thái ở cùng số bước)
    if (battle.stopAtStep && battle.step >= battle.stopAtStep) { battle.paused = true; battle.stopAtStep = 0; acc = 0; break; }
  }
  if (steps === 6) acc = 0;
  for (const u of units) u.renderUpdate(sdt);
  for (const u of benchUnits) if (u) u.renderUpdate(sdt);
  vfx.update(sdt, camera.position);
  world.sky.material.uniforms.uTime.value += dt; world.sea.material.uniforms.uTime.value += dt;
  world.env.forEach((e, i) => { e.lantern.scale.setScalar(1 + Math.sin(now * 0.003 + i) * 0.08); });
  if (Q().env > 0 && Math.random() < Q().env * 0.15) { // hạt môi trường: linh khí lơ lửng
    vfx.particles.emit(rand(-14, 14), rand(0, 1), rand(-14, 14), rand(-0.2, 0.2), rand(0.3, 0.8), rand(-0.2, 0.2), rand(2, 4), 0.12, 0.05, Math.random() < 0.5 ? COLORS.allyB : COLORS.shield, 0.5, 0.1);
  }
  const prepView = battle.phase === 'prep' && !game.over;
  combatCam.target.z = damp(combatCam.target.z, prepView ? prepFit.tz : 0, 4, dt);
  const lx = damp(lens.x, prepView ? prepFit.shiftX : 0, 4, dt), ly = damp(lens.y, prepView ? prepFit.shiftY : 0, 4, dt);
  if (Math.abs(lx - lens.x) + Math.abs(ly - lens.y) > 0.05) { lens.x = Math.abs(lx) < 0.1 ? 0 : lx; lens.y = Math.abs(ly) < 0.1 ? 0 : ly; applyLensShift(); }
  combatCam.update(dt);
  sun.position.set(combatCam.focus.x - 14, 26, combatCam.focus.z - 10); sun.target.position.copy(combatCam.focus);
  benchTick(dt);
  tickPrepTimer(dt);
  ui.tick(dt);
  renderer.info.reset();
  const tr0 = performance.now();
  try { bloom.render(scene, camera); } catch (e) { console.error('[Bloom] tắt bloom do lỗi', e); bloom.setLevel(0, window.innerWidth, window.innerHeight); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  const tr1 = performance.now();
  draw2D(dt);
  PerfStats.push(rawDt, tr0 - tf0, tr1 - tr0);
  if (typeof DebugPanel !== 'undefined') DebugPanel.tick(dt);
}

/* ---------- Vòng đời ứng dụng (Android / trình duyệt): ẩn app → tạm dừng; mất ngữ cảnh WebGL → chờ khôi phục ---------- */
const appState = { glLost: false, autoPaused: false, lostCount: 0 };
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // chuyển app / tắt màn hình: dừng trận và đồng hồ chuẩn bị (tickPrepTimer bỏ qua khi battle.paused) để không thua oan, bớt nóng máy
    if (!battle.paused && $('intro').hidden && !battle.bench) { togglePause(); appState.autoPaused = true; }
  } else {
    last = performance.now();   // khung đầu sau khi quay lại không mang dt khổng lồ
    if (appState.autoPaused) { appState.autoPaused = false; ui.toast('Đã tạm dừng khi rời ứng dụng – bấm ☰ → Tiếp tục'); }
  }
});
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault();   // cho phép trình duyệt khôi phục ngữ cảnh
  appState.glLost = true; appState.lostCount++;
  if (!battle.paused && $('intro').hidden) { togglePause(); appState.autoPaused = true; }
  console.warn('[WebGL] mất ngữ cảnh – đang chờ khôi phục');
}, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  // three.js tự khởi tạo lại trạng thái GL; hình học / vật liệu / texture tải lại GPU khi vẽ lần tới. Dựng lại bóng đổ + bloom theo mức hiện tại.
  appState.glLost = false; last = performance.now();
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  applyQuality(Q(), 'restore');
  ui.toast('Đã khôi phục đồ hoạ' + (battle.paused ? ' – bấm ☰ → Tiếp tục' : ''));
}, false);

(function boot() {
  const bad = validateChampions();
  if (bad.length) console.error('[Vạn Kiếm] Dữ liệu tướng lỗi:\n' + bad.join('\n'));
  // Bản lưu: chuyển phiên bản cũ + làm sạch (parseSave). Hỏng / của bản mới hơn → SAO LƯU nguyên văn sang vkkt_save_backup
  // trước khi ván mới ghi đè, để không bao giờ mất dữ liệu có thể còn cứu được.
  let raw = null; try { raw = localStorage.getItem('vkkt_save'); } catch (e) { /* bộ nhớ bị chặn */ }
  const ld = parseSave(raw), ok = ld.status === 'ok';
  if (ld.status === 'bad' || ld.status === 'newer') {
    try { localStorage.setItem('vkkt_save_backup', raw); } catch (e) { /* đầy / bị chặn */ }
    console.warn('[Lưu] Không tải được bản lưu (' + ld.reason + ') – đã sao lưu sang vkkt_save_backup, bắt đầu ván mới');
    setTimeout(() => ui.toast('Bản lưu không đọc được (' + ld.reason + ') – đã giữ bản sao, bắt đầu ván mới'), 600);
  }
  restoreGame(ok ? ld.state : newGameState());
  if (ok) { $('btn-enter').textContent = 'Tiếp tục – Vòng ' + battle.round; $('btn-newgame').hidden = false; }
})();
applyQuality(Q(), 'init');
requestAnimationFrame(frame);
/** Móc kiểm thử: chạy mô phỏng trận nhanh (bỏ qua render WebGL, vẫn cập nhật rig và VFX) – dùng cho tests/playtest.js. */
function simulate(seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n && battle.phase === 'fight'; i++) {
    simStep(STEP);
    for (const u of units) u.renderUpdate(STEP);
    vfx.update(STEP, camera.position);
  }
}
window.__vkkt = { units, battle, timelines, QualityManager, startBattle, forceUltimate, vfx, renderer, scene, loadGlbBuffer, solveTwoBoneIK, options, game, store,
  buyShop, reroll, buyXP, nextRound, newGame, moveTo, sellSrc, benchToBoard, mergeAll, traitCounts, traitLevel, applyTraits, boardAllies, boardCap, benchUnits, benchSlotPos, tileCenter,
  snapshotGame, parseSave, SAVE_VERSION, restoreGame, enemyLineup, sellPrice, combatCam, camera, prepFit, simulate, UNIT_DEFS, XP_NEED, MAX_LEVEL, BENCH_SIZE, STAR, STAR_SCALE,
  CHAMPIONS, CHAMPION_KEYS, championsByCost, validateChampions, migrateChampionKey, LEGACY_MAP, SKILL_SPECS, SKILL_META, TRAITS, ORIGINS, SUBCLASSES, TraitRegistry, TraitCounter, TraitEvents, TraitEngine, TraitSwords, TraitVFX, defaultBonus, afterRosterChange, moveToBench, ui, addMana,
  PerfStats, appState, CombatRNG, crand, CombatAudit, DamageCalculator, defenseFactor, DAMAGE, BATTLE_RULES, STATUS, applyBurn, SimTasks, DangerZones, NavGrid, Projectiles, checkBattleEnd, STEP, simStep, RARITY, RIG_FACTORIES, GLB_LOADED, replaceChampionRig, applyStun, dealDamage, healUnit, giveShield, applySlow,
  combatLog, ROLES, SKILLS, placeUnit, removeUnit, setupRound, BOARD,
  cameraSettled: () => Math.abs(combatCam.dist - combatCam.tDist) < 0.05 && Math.abs(combatCam.target.z - prepFit.tz) < 0.05 && Math.abs(lens.x - prepFit.shiftX) + Math.abs(lens.y - prepFit.shiftY) < 1,
  poolLeft, poolOwned, POOL_SIZE, SHOP_POOL, SHOP_ODDS, rollShop, rivalsDraft, ITEMS, equipItem, isMonsterRound, interestOf, streakBonusOf, autoFillBoard };
