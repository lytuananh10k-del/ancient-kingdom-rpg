// Vạn Kiếm Kỳ Trận – Kiểm tra hiệu năng (mục 25)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 25. Kiểm tra hiệu năng (benchmark)
 * ===================================================================*/
const bench = { running: false, t: 0, frames: [], calls: 0, tris: 0, peakParticles: 0, nextUlt: 0 };
$('btn-bench').addEventListener('click', () => {
  if (bench.running) return;
  $('settings').hidden = true; $('btn-settings').setAttribute('aria-expanded', 'false');
  Object.assign(bench, { running: true, t: 0, frames: [], calls: 0, tris: 0, peakParticles: 0, nextUlt: 1.5, prevAuto: QualityManager.auto, snap: snapshotGame() });
  QualityManager.auto = false;
  battle.bench = true;
  for (const u of boardAllies()) removeUnit(u);
  [['hophap', 3, 3], ['kiemtien', 4, 3], ['anhkiem', 5, 3], ['loi', 2, 1], ['hoa', 5, 1]].forEach(([k, c, r]) => placeUnit(k, 1, c, r));
  battle.round = 5; setupRound(); game.over = false; startBattle();
  ui.toast('Đang kiểm tra hiệu năng 15 giây…');
});
function benchTick(dt) {
  if (!bench.running) return;
  bench.t += dt; bench.frames.push(dt * 1000);
  bench.calls = Math.max(bench.calls, renderer.info.render.calls); bench.tris = Math.max(bench.tris, renderer.info.render.triangles);
  bench.peakParticles = Math.max(bench.peakParticles, vfx.particles.live);
  if (bench.t > bench.nextUlt) { bench.nextUlt += 3; const c = units.filter(u => u.alive && u.fsm.name !== 'cast'); const k = c.find(u => u.key === 'kiemtien') || c[0]; if (k) { k.mana = k.maxMana; } c.forEach(u => { if (Math.random() < 0.4) u.mana = u.maxMana; }); }
  if (bench.t < 15) return;
  bench.running = false; QualityManager.auto = bench.prevAuto;
  const fr = bench.frames.slice(30).sort((a, b) => a - b);
  const avg = fr.reduce((s, v) => s + v, 0) / Math.max(1, fr.length);
  const p99 = fr[Math.floor(fr.length * 0.99)] || avg;
  const fps = 1000 / avg, low = 1000 / p99;
  let gpu = '';
  try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); } catch (e) { /* không hỗ trợ */ }
  const idx = QualityManager.order.indexOf(QualityManager.level);
  let rec = QualityManager.level;
  if (fps < 30 || low < 20) rec = QualityManager.order[Math.max(0, idx - 1)];
  else if (fps > 58 && low > 45 && idx < 3) rec = QualityManager.order[idx + 1];
  battle.bench = false;
  const out = $('bench-out'); out.hidden = false;
  out.textContent = `Mức đang chạy: ${Q().label}\nFPS trung bình: ${fps.toFixed(1)}\n1% thấp nhất: ${low.toFixed(1)} FPS\nDraw call tối đa: ${bench.calls}\nTam giác tối đa: ${bench.tris.toLocaleString('vi-VN')}\nHạt đồng thời tối đa: ${bench.peakParticles}\nĐộ phân giải: ${renderer.domElement.width}×${renderer.domElement.height} (DPR ${renderer.getPixelRatio().toFixed(2)})\nWebGL2: ${renderer.capabilities.isWebGL2 ? 'có' : 'không'}${gpu ? '\nGPU: ' + gpu : ''}\nĐề xuất: ${QualityManager.presets[rec].label}${rec !== QualityManager.level ? ' (bấm mức đó ở trên để áp dụng)' : ' (giữ nguyên)'}`;
  out.textContent += `\nMàn hình: ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')}`;
  $('btn-bench-copy').hidden = false;
  restoreGame(bench.snap);
  $('settings').hidden = false; $('btn-settings').setAttribute('aria-expanded', 'true');
}
$('btn-bench-copy').addEventListener('click', async () => {
  const text = 'Vạn Kiếm Kỳ Trận – kiểm tra hiệu năng\n' + $('bench-out').textContent;
  try { await navigator.clipboard.writeText(text); ui.toast('Đã sao chép kết quả'); }
  catch (e) {   // trình duyệt chặn clipboard (ví dụ trong khung nhúng): chọn sẵn chữ để người chơi tự sao chép
    const r = document.createRange(); r.selectNodeContents($('bench-out')); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    ui.toast('Đã chọn sẵn kết quả – giữ lâu rồi chọn Sao chép');
  }
});
