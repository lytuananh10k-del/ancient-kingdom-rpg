// Vạn Kiếm Kỳ Trận – CombatCamera, khung camera lúc chuẩn bị, lens shift (mục 12)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 12. CombatCamera – góc nhìn auto chess, xoay/zoom chuột & cảm ứng, rung, impulse, điện ảnh
 * ===================================================================*/
class CombatCamera {
  constructor(cam) {
    this.cam = cam; this.defaults = { yaw: 0, pitch: 52 * DEG, dist: isMobile ? 31 : 27 };
    this.yaw = this.defaults.yaw; this.pitch = this.defaults.pitch; this.dist = this.defaults.dist;
    this.tYaw = this.yaw; this.tPitch = this.pitch; this.tDist = this.dist;
    this.target = new V3(0, 0.5, 0); this.focus = new V3(0, 0.5, 0);
    this.trauma = 0; this.impulse = new V3(); this.impulseVel = new V3();
    this.cine = null; this.cineW = 0; this.cineFocus = new V3();
    this.enableCinematic = store.get('cine', true); this.enableShake = store.get('shake', true); this.reduceShake = store.get('reduce', false);
  }
  reset() { this.tYaw = this.defaults.yaw; this.tPitch = this.defaults.pitch; this.tDist = battle.phase === 'prep' && prepFit.dist ? prepFit.dist : this.defaults.dist; }
  rotate(dx, dy) { this.tYaw = clamp(this.tYaw - dx * 0.005, -1.1, 1.1); this.tPitch = clamp(this.tPitch + dy * 0.004, 26 * DEG, 80 * DEG); }
  zoom(f) { this.tDist = clamp(this.tDist * f, 13, 70); }
  shake(amount) { if (!this.enableShake) return; this.trauma = Math.min(1, this.trauma + amount * (this.reduceShake ? 0.4 : 1)); }
  /** Camera impulse: hất camera theo một hướng rồi lò xo trả về. */
  kick(dir, strength) { if (!this.enableShake) return; this.impulseVel.addScaledVector(dir, strength * (this.reduceShake ? 0.4 : 1)); }
  cinematic(subject, duration, opts = {}) {
    if (!this.enableCinematic) return;
    this.cine = { subject, t: 0, dur: duration, dist: opts.dist || 13, yawOff: opts.yawOff || 0.5, pitch: opts.pitch || 30 * DEG, focusFn: opts.focusFn || null };
  }
  update(dt) {
    this.yaw = damp(this.yaw, this.tYaw, 10, dt); this.pitch = damp(this.pitch, this.tPitch, 10, dt); this.dist = damp(this.dist, this.tDist, 8, dt);
    let yaw = this.yaw, pitch = this.pitch, dist = this.dist;
    this.focus.copy(this.target);
    if (this.cine) {
      const c = this.cine; c.t += dt;
      const inW = smooth(0, 0.5, c.t), outW = 1 - smooth(c.dur - 0.6, c.dur, c.t);
      this.cineW = Math.min(inW, outW);
      if (c.focusFn) c.focusFn(this.cineFocus); else this.cineFocus.copy(c.subject.pos).setY(1.2);
      if (c.t >= c.dur) { this.cine = null; this.cineW = 0; }
    } else this.cineW = damp(this.cineW, 0, 6, dt);
    if (this.cineW > 0.001) {
      const w = this.cineW, c = this.cine;
      this.focus.lerp(this.cineFocus, w * 0.75);
      const portrait = clamp(1.25 / Math.max(0.4, this.cam.aspect), 1, 2.2); // màn hình dọc: lùi xa hơn để vẫn thấy trận
      yaw = lerp(yaw, yaw + (c ? c.yawOff : 0.4), w); pitch = lerp(pitch, c ? c.pitch : 30 * DEG, w); dist = lerp(dist, (c ? c.dist : 14) * portrait, w);
    }
    // Lò xo impulse
    this.impulseVel.addScaledVector(this.impulse, -120 * dt); this.impulseVel.multiplyScalar(Math.max(0, 1 - 12 * dt)); this.impulse.addScaledVector(this.impulseVel, dt);
    const cp = Math.cos(pitch);
    this.cam.position.set(this.focus.x - Math.sin(yaw) * cp * dist, this.focus.y + Math.sin(pitch) * dist, this.focus.z - Math.cos(yaw) * cp * dist).add(this.impulse);
    this.cam.lookAt(this.focus.x + this.impulse.x * 0.5, this.focus.y + this.impulse.y * 0.5, this.focus.z + this.impulse.z * 0.5);
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma, t = performance.now() * 0.001;
      this.cam.rotation.z += (Math.sin(t * 47) * 0.6 + Math.sin(t * 91) * 0.4) * 0.03 * s;
      this.cam.position.x += Math.sin(t * 61) * 0.35 * s; this.cam.position.y += Math.sin(t * 73 + 1) * 0.3 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }
  }
}
const combatCam = new CombatCamera(camera);
/** Khung camera lúc chuẩn bị (giống TFT): tìm khoảng cách + điểm nhìn để nửa bàn phe ta và hàng chờ
 *  nằm gọn trong vùng trống giữa thanh nút trên cùng và cửa hàng – tự tính theo kích thước màn hình. */
const prepFit = { dist: 0, tz: -2.2, shiftX: 0, shiftY: 0 };
function fitPrepCamera() {
  const W = window.innerWidth, H = window.innerHeight;
  const rectTop = el => (el && !el.hidden && el.offsetParent !== null ? el.getBoundingClientRect().top : H);
  const ta = (document.querySelector('.top-actions').getBoundingClientRect().bottom || 0) + 6;
  const lc = document.querySelector('.left-col').getBoundingClientRect();
  const bottom = Math.min(rectTop(document.getElementById('prep-panel')), rectTop(document.querySelector('.main-actions'))) - 6;
  const cam = new THREE.PerspectiveCamera(camera.fov, W / H, 0.1, 400), p = combatCam.defaults.pitch, v = new V3();
  // Khung tối thiểu: hàng chờ + nửa bàn phe ta. Thêm các hàng địch đứng nếu hình không nhỏ đi quá 20%.
  const PTS_ALLY = [[9.3, 0, -11.9], [-9.3, 0, -11.9], [9.3, 0, 0.6], [-9.3, 0, 0.6], [8, 2.2, -1.2], [-8, 2.2, -1.2]];
  const PTS_FULL = [[9.3, 0, -11.9], [-9.3, 0, -11.9], [9.3, 0, 6.9], [-9.3, 0, 6.9], [4, 2.4, 5.8], [-4, 2.4, 5.8]];
  let cx = 0, cy = 0, pts = PTS_ALLY;
  // Vùng trống: hoặc nằm dưới cột thông tin bên trái (màn dọc), hoặc bên phải nó (màn ngang) – thử cả hai, lấy hình to hơn.
  const rects = [{ l: 6, r: W - 6, t: Math.max(ta, lc.bottom + 6), b: bottom }, { l: lc.right + 8, r: W - 6, t: ta, b: bottom }];
  const search = () => {
  let best = null;
  for (const R of rects) {
    if (R.b - R.t < 80 || R.r - R.l < 120) continue;
    // Điều kiện: kích thước vừa vùng trống, nội dung nằm quanh trục quang (lens shift sẽ dời vào giữa vùng trống).
    const fits = (tz, d) => {
      cam.position.set(0, 0.5 + Math.sin(p) * d, tz - Math.cos(p) * d); cam.lookAt(0, 0.5, tz); cam.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, ok = true;
      for (const q of pts) { v.set(q[0], q[1], q[2]).project(cam); if (v.z >= 1) ok = false; const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
      return ok && x1 - x0 <= R.r - R.l && y1 - y0 <= R.b - R.t && Math.abs(cy - H / 2) < H * 0.06;
    };
    for (let tz = -24; tz <= 2; tz += 0.25) {
      if (!fits(tz, 70)) continue;
      let lo = 12, hi = 70;
      for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (fits(tz, m)) hi = m; else lo = m; }
      if (!best || hi < best.d) { const d = hi * 1.03; fits(tz, d); best = { tz, d, sx: (R.l + R.r) / 2 - cx, sy: (R.t + R.b) / 2 - cy }; }
    }
  }
  return best;
  };
  let best = search();
  if (!best) return;
  pts = PTS_FULL; const full = search();
  if (full && full.d <= best.d * 1.2) best = full;
  Object.assign(prepFit, { dist: best.d, tz: best.tz, shiftX: best.sx, shiftY: best.sy });
}
/** Lens shift: dời tâm chiếu (pixel) mà không đổi phối cảnh, giống ống kính tilt-shift. */
const lens = { x: 0, y: 0 };
function applyLensShift() {
  camera.updateProjectionMatrix();
  if (lens.x || lens.y) {
    const e = camera.projectionMatrix.elements;
    e[8] -= 2 * lens.x / window.innerWidth; e[9] += 2 * lens.y / window.innerHeight;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
}
function applyPrepCamera() {
  fitPrepCamera();
  if (prepFit.dist) { combatCam.tDist = prepFit.dist; combatCam.tYaw = combatCam.defaults.yaw; combatCam.tPitch = combatCam.defaults.pitch; }
}
