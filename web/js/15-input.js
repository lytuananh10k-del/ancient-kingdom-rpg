// Vạn Kiếm Kỳ Trận – Input: xoay/zoom, chọn, kéo thả kiểu TFT (mục 21)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 21. Input: chuột, cảm ứng (xoay, chụm), chọn & đặt quân
 * ===================================================================*/
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new V3(0, 1, 0), 0);
const pointers = new Map(); let pinchStart = 0, dragMoved = 0;
/** Kéo thả quân (giống TFT): giữ một tu sĩ trên bàn hoặc hàng chờ rồi kéo tới ô khác, hàng chờ hoặc cửa hàng (bán). */
const drag = { src: null, unit: null, id: -1, active: false, target: null };
const canEdit = () => battle.phase === 'prep' && !game.over && !battle.bench;
function groundAt(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, new V3());
}
/** Chọn quân theo khoảng cách trên màn hình tới đoạn chân → ngực (dễ chạm hơn raycast mặt đất). */
function screenPick(x, y) {
  const rc = canvas.getBoundingClientRect(), cands = [];
  boardAllies().forEach(u => cands.push({ type: 'board', unit: u }));
  benchUnits.forEach((u, i) => { if (u) cands.push({ type: 'bench', i, unit: u }); });
  let best = null, bd = 34;
  const toScreen = (v) => { v.project(camera); return { x: rc.left + (v.x * 0.5 + 0.5) * rc.width, y: rc.top + (-v.y * 0.5 + 0.5) * rc.height }; };
  for (const c of cands) {
    const sc = STAR_SCALE[c.unit.star];
    const a = toScreen(_v1.set(c.unit.pos.x, 0.2, c.unit.pos.z)), b = toScreen(_v1.set(c.unit.pos.x, 1.5 * sc, c.unit.pos.z));
    const abx = b.x - a.x, aby = b.y - a.y, t = clamp(((x - a.x) * abx + (y - a.y) * aby) / (abx * abx + aby * aby || 1), 0, 1);
    const d = Math.hypot(x - a.x - abx * t, y - a.y - aby * t);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function overShop(x, y) {
  const el = $('prep-panel'); if (el.hidden) return false;
  const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
function targetAt(x, y) {
  if (overShop(x, y)) return { type: 'sell' };
  const p = groundAt(x, y); if (!p) return null;
  const i = Math.round((BENCH.slots - 1) / 2 - p.x / BENCH.gap);
  if (Math.abs(p.z - BENCH.z) < 1.25 && i >= 0 && i < BENCH.slots) return { type: 'bench', i };
  const t = worldToTile(p.x, p.z);
  if (t.c >= 0 && t.c < 8 && t.r >= 0 && t.r < 4) return { type: 'tile', c: t.c, r: t.r };
  return null;
}
const pickTarget = (pk) => (pk.type === 'board' ? { type: 'tile', c: pk.unit.homeTile.c, r: pk.unit.homeTile.r } : { type: 'bench', i: pk.i });
function targetOk(src, t) {
  if (!t) return false;
  if (t.type === 'tile' && src.type === 'bench' && !tileOccupant(t.c, t.r) && boardAllies().length >= boardCap()) return false;
  return true;
}
/** Thực hiện di chuyển src → đích; trả về true nếu có thay đổi. */
function moveTo(src, t) {
  if (!t || !canEdit()) return false;
  if (t.type === 'sell') { sellSrc(src); return true; }
  if (src.type === 'board') {
    const u = src.unit;
    if (t.type === 'tile') {
      if (u.homeTile.c === t.c && u.homeTile.r === t.r) return false;
      const occ = tileOccupant(t.c, t.r);
      if (occ) { occ.homeTile = { c: u.homeTile.c, r: u.homeTile.r }; tileCenter(occ.homeTile.c, occ.homeTile.r, occ.pos); }
      u.homeTile = { c: t.c, r: t.r }; tileCenter(t.c, t.r, u.pos);
      vfx.particles.burst(_v1.set(u.pos.x, 0.3, u.pos.z), COLORS.allyA, 14, 3, 0.4, 0.25, { up: 2 });
      saveGame(); ui.update(); return true;
    }
    const e = game.bench[t.i];
    if (!e) { if (!moveToBench(u, t.i)) return false; }
    else { const tile = { ...u.homeTile }; game.bench[t.i] = { key: u.key, star: u.star }; removeUnit(u); placeUnit(e.key, e.star, tile.c, tile.r); }
    afterRosterChange(); return true;
  }
  if (t.type === 'tile') { if (!benchToBoard(src.i, t.c, t.r)) return false; afterRosterChange(); return true; }
  if (t.i === src.i) return false;
  const tmp = game.bench[t.i]; game.bench[t.i] = game.bench[src.i]; game.bench[src.i] = tmp;
  saveGame(); ui.update(); return true;
}
function snapBack(u) {
  if (!u) return;
  u.dragging = false; u.pos.y = 0;
  if (u.benchSlot !== undefined && benchUnits[u.benchSlot] === u) benchSlotPos(u.benchSlot, u.pos); else tileCenter(u.homeTile.c, u.homeTile.r, u.pos);
}
function cancelDrag() { snapBack(drag.unit); Object.assign(drag, { src: null, unit: null, id: -1, active: false, target: null }); $('prep-panel').classList.remove('selling', 'hot'); world.highlight.visible = false; }
function updateDrag(x, y) {
  const p = groundAt(x, y), u = drag.unit;
  if (p) { u.pos.set(clamp(p.x, -12, 12), 0.55, clamp(p.z, -12.2, 10)); }
  const t = targetAt(x, y), ok = targetOk(drag.src, t);
  drag.target = t; showHighlight(t, ok);
  const panel = $('prep-panel'); panel.classList.add('selling'); panel.classList.toggle('hot', !!t && t.type === 'sell');
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* con trỏ đã kết thúc */ }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (pointers.size === 1) {
    dragMoved = 0;
    const pk = canEdit() ? screenPick(e.clientX, e.clientY) : null;
    if (pk) Object.assign(drag, { src: pk, unit: pk.unit, id: e.pointerId, active: false, target: null });
  }
  if (pointers.size === 2) { if (drag.src) cancelDrag(); const [a, b] = [...pointers.values()]; pinchStart = Math.hypot(a.x - b.x, a.y - b.y); }
  closeSettings();
  Sfx.init();
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 1) {
    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (drag.src && drag.id === e.pointerId) {
      if (!drag.active && dragMoved > 8) {
        if (!canEdit()) { cancelDrag(); return; }
        drag.active = true; drag.unit.dragging = true; game.sel = null; battle.selected = null;
        const price = sellPrice(drag.unit.key, drag.unit.star);
        $('prep-panel').dataset.sell = 'Thả vào đây để bán · +' + price + ' linh thạch';
        Sfx.tone && Sfx.ok('pick', 0.05) && Sfx.tone(660, 0.1, 0.05, 'sine');
      }
      if (drag.active) updateDrag(e.clientX, e.clientY);
    } else if (dragMoved > 6) combatCam.rotate(dx, dy);
  }
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart > 0) { combatCam.zoom(pinchStart / d); pinchStart = d; }
    dragMoved = 999;
  }
});
const endPointer = e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  pointers.delete(e.pointerId);
  if (drag.src && drag.id === e.pointerId && drag.active) {
    const src = drag.src, t = targetAt(e.clientX, e.clientY);
    cancelDrag();
    if (targetOk(src, t)) { if (moveTo(src, t)) Sfx.ok('drop', 0.05) && Sfx.tone(440, 0.14, 0.06, 'triangle'); }
    else if (t && t.type === 'tile') ui.toast('Cấp ' + game.level + ' chỉ đặt được ' + boardCap() + ' tu sĩ – mua kinh nghiệm để lên cấp');
    select(null);
  } else {
    if (drag.id === e.pointerId) cancelDrag();
    if (pointers.size === 0 && dragMoved <= 6) onTap(e.clientX, e.clientY);
  }
  if (pointers.size < 2) pinchStart = 0;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); if (drag.id === e.pointerId) cancelDrag(); });
canvas.addEventListener('wheel', e => { e.preventDefault(); combatCam.zoom(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });
let lastTap = 0;
/** Chạm (không kéo): chạm quân để chọn, chạm ô / hàng chờ / quân khác để chuyển hoặc đổi chỗ. */
function onTap(x, y) {
  const pk = canEdit() ? screenPick(x, y) : null;
  const now = performance.now(); if (now - lastTap < 280 && !pk && !game.sel) combatCam.reset(); lastTap = now;
  if (!canEdit()) return;
  const sel = game.sel;
  const same = pk && sel && (pk.type === 'board' ? sel.unit === pk.unit : sel.type === 'bench' && sel.i === pk.i);
  if (sel && !same) {
    const t = pk ? pickTarget(pk) : targetAt(x, y);
    if (t && t.type !== 'sell') {
      if (!targetOk(sel, t)) { ui.toast('Cấp ' + game.level + ' chỉ đặt được ' + boardCap() + ' tu sĩ – mua kinh nghiệm để lên cấp'); return; }
      if (moveTo(sel, t)) { select(null); return; }
    }
  }
  if (pk && !same) { select(pk.type === 'board' ? { type: 'board', unit: pk.unit } : { type: 'bench', i: pk.i }); return; }
  select(null);
}
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  if (e.code === 'Space') { e.preventDefault(); if (game.over) newGame(); else if (battle.phase === 'prep') startBattle(); else if (battle.phase === 'end') nextRound(); }
  if (battle.phase === 'prep' && (e.key === 'd' || e.key === 'D')) reroll();
  if (battle.phase === 'prep' && (e.key === 'f' || e.key === 'F')) buyXP();
  if (e.key === 'u' || e.key === 'U') forceUltimate();
  if (e.key === 'p' || e.key === 'P') togglePause();
});
