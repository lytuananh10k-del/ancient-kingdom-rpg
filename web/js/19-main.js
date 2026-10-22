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
  if (battle.phase === 'fight') battle.time += dt;
  for (let i = timelines.length - 1; i >= 0; i--) { timelines[i].update(dt); if (timelines[i].done) timelines.splice(i, 1); }
  for (const u of units) u.simStep(dt);
  Projectiles.update(dt);
  checkBattleEnd();
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  QualityManager.sample(dt);
  fpsAcc += dt; fpsFrames++; if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsFrames / fpsAcc) + ' fps'; fpsAcc = 0; fpsFrames = 0; }
  let scale = battle.paused ? 0 : battle.speed;
  if (hitStopTimer > 0) { hitStopTimer -= dt; scale *= 0.06; }
  const sdt = dt * scale;
  acc += sdt; let steps = 0;
  while (acc >= STEP && steps < 6) { simStep(STEP); acc -= STEP; steps++; }
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
  ui.tick(dt);
  renderer.info.reset();
  try { bloom.render(scene, camera); } catch (e) { console.error('[Bloom] tắt bloom do lỗi', e); bloom.setLevel(0, window.innerWidth, window.innerHeight); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  draw2D(dt);
}

(function boot() {
  const saved = store.get('save', null);
  const ok = saved && saved.v === 1 && saved.hp > 0 && !saved.over;
  restoreGame(ok ? saved : newGameState());
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
  snapshotGame, enemyLineup, sellPrice, combatCam, camera, prepFit, simulate, UNIT_DEFS, XP_NEED, MAX_LEVEL, BENCH_SIZE, STAR_MUL };
