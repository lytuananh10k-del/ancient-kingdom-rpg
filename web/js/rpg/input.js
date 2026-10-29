// Vạn Kiếm Kỳ Trận – Phiêu Lưu: camera màn ngang bám nhân vật + điều khiển: bàn phím (Windows), cần ảo + nút ảo (Android / cảm ứng),
// chạm / nhấp vào quái để chọn mục tiêu, chạm NPC để nói chuyện.
// Script thường (không phải module): nạp sau js/rpg/save.js.
'use strict';

/* ---------- Camera màn ngang ---------- */
const SideCam = {
  x: 30, y: 2, dist: 16, trauma: 0, kickX: 0, kickV: 0, cineT: 0, cineDur: 0, look: 0,
  enableShake: store.get('shake', !prefersReducedMotion),
  shake(a) { if (this.enableShake) this.trauma = Math.min(1, this.trauma + a); },
  kick(dx) { if (this.enableShake) this.kickV += dx * 30; },
  cinematic(d) { this.cineT = this.cineDur = d; },
  /** Khoảng cách camera theo tỉ lệ màn: màn ngang ~16 m, màn dọc lùi xa để vẫn thấy ≥ 11 m bề ngang. */
  baseDist() { const a = camera.aspect || 1.8; return clamp(24.7 / a, 15, 34); },
  snap(P) { this.x = P.pos.x; this.y = P.pos.y + 1.6; this.look = P.facing * 2; this.dist = this.baseDist(); this.apply(); },
  update(dt, P) {
    if (P) {
      this.look = damp(this.look, P.facing * 2.2, 2.5, dt);
      const hw = Math.tan(camera.fov * DEG / 2) * this.dist * camera.aspect, W = World.width;
      let tx = P.pos.x + this.look; tx = W > hw * 2 ? clamp(tx, hw - 1.5, W - hw + 1.5) : W / 2;
      const ty = Math.max(P.pos.y, World.groundAt(P.pos.x)) + 1.6 + (P.flying ? 0.6 : 0);
      this.x = damp(this.x, tx, 6, dt); this.y = damp(this.y, ty, P.onGround ? 5 : 3.5, dt);
    }
    let d = this.baseDist();
    if (this.cineT > 0) { this.cineT -= dt; const k = Math.min(smooth(0, 0.3, this.cineDur - this.cineT), smooth(0, 0.4, this.cineT)); d *= 1 - 0.18 * k; }
    this.dist = damp(this.dist, d, 4, dt);
    this.kickV += -this.kickX * 140 * dt; this.kickV *= Math.max(0, 1 - 14 * dt); this.kickX += this.kickV * dt;
    this.apply();
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma, t = performance.now() * 0.001;
      camera.position.x += Math.sin(t * 61) * 0.35 * s; camera.position.y += Math.sin(t * 73 + 1) * 0.3 * s; camera.rotation.z += Math.sin(t * 47) * 0.02 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    }
  },
  apply() {
    camera.position.set(this.x + this.kickX, this.y + this.dist * 0.2, this.dist);
    camera.lookAt(this.x + this.kickX, this.y + 0.2, 0);
  }
};

/* ---------- Trạng thái điều khiển (đọc mỗi bước mô phỏng) ---------- */
const inp = { left: false, right: false, up: false, down: false, attack: false, skill: [false, false, false, false], jumpPressed: false, downPressed: false };
const keys = new Set();
const pad = { x: 0, y: 0, active: false, upLatch: false };
function syncInput() {
  inp.left = keys.has('left') || pad.x < -0.35; inp.right = keys.has('right') || pad.x > 0.35;
  inp.up = keys.has('up') || pad.y > 0.45; inp.down = keys.has('down') || pad.y < -0.45;
  inp.attack = keys.has('attack') || touchHold.attack;
}
const touchHold = { attack: false };
/** Xoá cờ "vừa nhấn" sau khi bước mô phỏng đầu tiên đã đọc. */
function consumeEdges() { inp.jumpPressed = false; inp.downPressed = false; inp.skill.fill(false); }
const KEYMAP = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', Space: 'up', KeyS: 'down', ArrowDown: 'down', KeyJ: 'attack', KeyZ: 'attack' };
const SKILL_KEYS = { KeyK: 0, Digit1: 0, KeyX: 0, KeyL: 1, Digit2: 1, KeyC: 1, KeyU: 2, Digit3: 2, KeyV: 2, KeyI: 3, Digit4: 3, KeyB: -1 };
function haptic(p) { if (options.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* chặn */ } }

window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!Game.playing) return;
  Sfx.init();
  if (e.code === 'Escape') { ui.closeAll(); return; }
  if (ui.modalOpen()) { if (e.code === 'KeyB' || e.code === 'KeyN' || e.code === 'KeyM' || e.code === 'KeyT' || e.code === 'KeyO') { ui.closeAll(); } else return; }
  const k = KEYMAP[e.code];
  if (k) { if (!keys.has(k)) { if (k === 'up') inp.jumpPressed = true; if (k === 'down') inp.downPressed = true; } keys.add(k); syncInput(); e.preventDefault(); return; }
  if (e.repeat) return;
  if (e.code in SKILL_KEYS && SKILL_KEYS[e.code] >= 0) { inp.skill[SKILL_KEYS[e.code]] = true; return; }
  switch (e.code) {
    case 'KeyE': case 'KeyF': case 'Enter': Game.interact(); break;
    case 'KeyH': case 'KeyQ': quickHeal(); break;
    case 'Tab': e.preventDefault(); Game.cycleTarget(); break;
    case 'KeyB': ui.open('bag'); break;
    case 'KeyN': ui.open('char'); break;
    case 'KeyO': ui.open('skills'); break;
    case 'KeyM': ui.open('map'); break;
    case 'KeyT': ui.open('quest'); break;
    case 'KeyP': Game.togglePause(); break;
  }
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { keys.delete(k); syncInput(); } });
window.addEventListener('blur', () => { keys.clear(); touchHold.attack = false; pad.x = pad.y = 0; syncInput(); });

/* ---------- Cần ảo + nút ảo (Pointer Events: chạy cả chuột, cảm ứng, bút) ---------- */
function bindTouchControls() {
  const base = $('pad'), knob = $('pad-knob');
  let pid = null, cx = 0, cy = 0;
  const R = () => base.getBoundingClientRect().width * 0.42;
  const move = e => {
    const dx = e.clientX - cx, dy = e.clientY - cy, r = R(), d = Math.hypot(dx, dy), k = d > r ? r / d : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    pad.x = clamp(dx / r, -1, 1); pad.y = clamp(-dy / r, -1, 1);
    if (pad.y > 0.7 && !pad.upLatch) { pad.upLatch = true; inp.jumpPressed = true; } else if (pad.y < 0.4) pad.upLatch = false;
    if (pad.y < -0.7 && !pad.downLatch) { pad.downLatch = true; inp.downPressed = true; } else if (pad.y > -0.4) pad.downLatch = false;
    syncInput();
  };
  base.addEventListener('pointerdown', e => { Sfx.init(); pid = e.pointerId; base.setPointerCapture(pid); const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; pad.active = true; move(e); e.preventDefault(); });
  base.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; pad.x = pad.y = 0; pad.active = false; pad.upLatch = pad.downLatch = false; knob.style.transform = ''; syncInput(); };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  document.querySelectorAll('#actions [data-act]').forEach(b => {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); Sfx.init(); b.setPointerCapture(e.pointerId); b.classList.add('down'); haptic(8);
      if (act === 'attack') touchHold.attack = true;
      else if (act === 'jump') { inp.jumpPressed = true; keys.add('up'); }
      else if (act === 'down') { inp.downPressed = true; keys.add('down'); }
      else if (act[0] === 's') inp.skill[+act[1]] = true;
      else if (act === 'heal') quickHeal();
      else if (act === 'talk') Game.interact();
      else if (act === 'target') Game.cycleTarget();
      syncInput();
    });
    const up = () => { b.classList.remove('down'); if (act === 'attack') touchHold.attack = false; if (act === 'jump') keys.delete('up'); if (act === 'down') keys.delete('down'); syncInput(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  // chạm / nhấp lên cảnh: chọn quái làm mục tiêu, chạm NPC để nói chuyện
  canvas.addEventListener('pointerdown', e => {
    if (!Game.playing || ui.modalOpen()) return;
    Sfx.init();
    const W = window.innerWidth, H = window.innerHeight; let best = null, bd = 60 * Math.max(1, W / 1400);
    for (const a of [...Ents.monsters, ...Ents.npcs]) {   // người chơi ảo không có thao tác chạm → không giành chỗ chạm của quái
      if (a.dead) continue; a.center(_v1); _v1.project(camera);
      const sx = (_v1.x * 0.5 + 0.5) * W, sy = (-_v1.y * 0.5 + 0.5) * H, d = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (d < bd + a.h * 8) { bd = d; best = a; }
    }
    if (!best) return;
    if (best.kind === 'npc') { if (Math.abs(best.pos.x - Ents.player.pos.x) < best.talkR + 0.5) ui.dialog(best); else { Ents.player.target = null; Game.walkTo = best.pos.x; } }
    else if (best.kind === 'monster') { Ents.player.target = best; haptic(10); }
  });
}
