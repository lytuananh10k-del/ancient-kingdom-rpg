// Vạn Kiếm Kỳ Trận – ParticlePool, RibbonBatch, VFXManager (mục 4–6)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  4. ParticlePool – hạt GPU, bộ đệm vòng (ghi đè hạt cũ nhất khi đầy)
 * ===================================================================*/
class ParticlePool {
  constructor(capacity) {
    this.cap = capacity; this.budget = capacity; this.head = 0; this.live = 0;
    this.pos = new Float32Array(capacity * 3); this.vel = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 4); this.size = new Float32Array(capacity);
    this.life = new Float32Array(capacity); this.maxLife = new Float32Array(capacity);
    this.s0 = new Float32Array(capacity); this.s1 = new Float32Array(capacity);
    this.drag = new Float32Array(capacity); this.grav = new Float32Array(capacity); this.a0 = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('aSize', this.aSize);
    this.material = ShaderLibrary.particles();
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false; this.points.renderOrder = 10;
  }
  /** Phát một hạt. color: THREE.Color; size0→size1 theo vòng đời. */
  emit(x, y, z, vx, vy, vz, life, size0, size1, color, alpha = 1, drag = 1.5, gravity = 0) {
    if (this.budget <= 0) return;
    const i = this.head; this.head = (this.head + 1) % Math.min(this.cap, this.budget);
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i4] = color.r; this.col[i4 + 1] = color.g; this.col[i4 + 2] = color.b; this.col[i4 + 3] = alpha;
    this.life[i] = life; this.maxLife[i] = life; this.s0[i] = size0; this.s1[i] = size1; this.size[i] = size0;
    this.drag[i] = drag; this.grav[i] = gravity; this.a0[i] = alpha;
  }
  burst(pos, color, count, speed, life, size, opts = {}) {
    const up = opts.up || 0, grav = opts.gravity || 0, spread = opts.spread || 1;
    for (let k = 0; k < count; k++) {
      const th = Math.random() * TAU, ph = Math.acos(rand(-1, 1) * spread), s = speed * rand(0.35, 1);
      const sx = Math.sin(ph) * Math.cos(th), sy = Math.cos(ph), sz = Math.sin(ph) * Math.sin(th);
      this.emit(pos.x, pos.y, pos.z, sx * s, sy * s + up, sz * s, life * rand(0.6, 1.1), size * rand(0.6, 1.2), size * 0.1, color, opts.alpha || 1, opts.drag || 2.5, grav);
    }
  }
  update(dt) {
    let live = 0;
    const n = Math.min(this.cap, this.budget);
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; continue; }
      live++;
      this.life[i] -= dt;
      const i3 = i * 3, k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt; this.vel[i3 + 2] *= k;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i];
      this.size[i] = lerp(this.s0[i], this.s1[i], t);
      this.col[i * 4 + 3] = this.a0[i] * (t < 0.1 ? t / 0.1 : 1 - smooth(0.55, 1, t));
    }
    this.live = live;
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
    this.points.geometry.setDrawRange(0, n);
  }
  setBudget(b) {
    b = Math.min(this.cap, b);
    for (let i = b; i < this.cap; i++) { this.life[i] = 0; this.col[i * 4 + 3] = 0; }
    this.budget = b; this.head = 0;
  }
}

/* =====================================================================
 *  5. RibbonBatch – nhiều dải hướng camera trong 1 draw call
 * ===================================================================*/
class RibbonBatch {
  constructor(maxRibbons, maxPoints, additive) {
    this.maxR = maxRibbons; this.maxP = maxPoints; this.count = 0;
    const nv = maxRibbons * maxPoints * 2;
    this.pos = new Float32Array(nv * 3); this.col = new Float32Array(nv * 4); this.uv = new Float32Array(nv * 2);
    const idx = [];
    for (let r = 0; r < maxRibbons; r++) for (let p = 0; p < maxPoints - 1; p++) {
      const a = (r * maxPoints + p) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, ShaderLibrary.ribbon(additive));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 9 : 1;
  }
  begin() { this.count = 0; }
  /** points: mảng Vector3; width(t) & color(t, out) – t chạy 0 (đầu) → 1 (đuôi). */
  push(points, n, width, color, camPos) {
    if (this.count >= this.maxR || n < 2) return;
    const r = this.count++, base = r * this.maxP;
    n = Math.min(n, this.maxP);
    for (let i = 0; i < this.maxP; i++) {
      const pi = Math.min(i, n - 1), p = points[pi];
      const a = points[Math.max(0, pi - 1)], b = points[Math.min(n - 1, pi + 1)];
      _v1.subVectors(b, a); _v2.subVectors(camPos, p);
      _v3.crossVectors(_v1, _v2); const len = _v3.length() || 1;
      const t = pi / (n - 1), w = i < n ? width(t) * 0.5 / len : 0;
      const v = (base + i) * 2;
      this.pos[v * 3] = p.x + _v3.x * w; this.pos[v * 3 + 1] = p.y + _v3.y * w; this.pos[v * 3 + 2] = p.z + _v3.z * w;
      this.pos[v * 3 + 3] = p.x - _v3.x * w; this.pos[v * 3 + 4] = p.y - _v3.y * w; this.pos[v * 3 + 5] = p.z - _v3.z * w;
      color(t, _c1);
      const al = i < n ? (_c1.a === undefined ? 1 : _c1.a) : 0;
      for (let s = 0; s < 2; s++) { const o = (v + s) * 4; this.col[o] = _c1.r; this.col[o + 1] = _c1.g; this.col[o + 2] = _c1.b; this.col[o + 3] = al; }
      this.uv[v * 2] = t; this.uv[v * 2 + 1] = 0; this.uv[v * 2 + 2] = t; this.uv[v * 2 + 3] = 1;
    }
  }
  end() {
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.mesh.geometry.attributes.uv.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, this.count * (this.maxP - 1) * 6);
  }
}

/* =====================================================================
 *  6. VFXManager – điều phối hiệu ứng (pool mesh, cập nhật, dọn dẹp)
 * ===================================================================*/
const COLORS = {
  allyA: new THREE.Color(0x7cc4ff), allyViolet: new THREE.Color(0x9fa8ff), allyB: new THREE.Color(0xf2cf73), allyCore: new THREE.Color(0xd9f1ff),
  enemyA: new THREE.Color(0xe2553f), enemyB: new THREE.Color(0xb07cff), fire: new THREE.Color(0xff8a3a), fireHot: new THREE.Color(0xffd27a),
  thunder: new THREE.Color(0xa9d4ff), shield: new THREE.Color(0x8ff0d0), white: new THREE.Color(0xffffff), blood: new THREE.Color(0xff3b30)
};

class VFXManager {
  constructor() {
    this.particles = new ParticlePool(5000);
    this.particles.setBudget(Q().particles);
    scene.add(this.particles.points);
    this.ribbons = new RibbonBatch(200, 16, true);
    scene.add(this.ribbons.mesh);
    this.hairRibbons = new RibbonBatch(40, 10, false);
    scene.add(this.hairRibbons.mesh);
    this.effects = [];
    this.pools = { circle: [], wave: [], slash: [] };
    this.active = new Map();   // mesh đang lấy từ pool → loại, để clear() trả lại đủ
    this.trailJobs = [];   // dải vệt tạo mỗi frame render (vệt vũ khí, sét)
    this.simJobs = [];     // dải vệt tạo trong bước mô phỏng (phi kiếm, đạn) – giữ tới bước kế tiếp để không nhấp nháy khi hit-stop
    this.hairJobs = [];
    this.time = 0;
    this.planeGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.arcGeo = VFXManager.arcGeometry(0.45, 1, 200, 28);
    this.blobTex = VFXManager.blobTexture();
  }
  static arcGeometry(inner, outer, degrees, segs) {
    const pos = [], uv = [], idx = [];
    const start = -degrees / 2 * DEG, step = degrees * DEG / segs;
    for (let i = 0; i <= segs; i++) {
      const a = start + step * i, s = Math.sin(a), c = Math.cos(a), u = i / segs;
      pos.push(s * inner, 0, c * inner, s * outer, 0, c * outer); uv.push(u, 0, u, 1);
      if (i < segs) { const v = i * 2; idx.push(v, v + 1, v + 3, v, v + 3, v + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  static blobTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }
  add(effect) { this.effects.push(effect); return effect; }
  take(kind, make) { const p = this.pools[kind]; const m = p.length ? p.pop() : make(); m.visible = true; scene.add(m); this.active.set(m, kind); return m; }
  give(kind, mesh) { if (!this.active.delete(mesh)) return; mesh.visible = false; scene.remove(mesh); this.pools[kind].push(mesh); }

  /** Pháp trận dưới đất. Trả về handle có .fadeOut(). */
  magicCircle(pos, radius, c1, c2, opts = {}) {
    const mesh = this.take('circle', () => new THREE.Mesh(this.planeGeo, ShaderLibrary.magicCircle(0xffffff, 0xffffff)));
    const u = mesh.material.uniforms;
    u.uC1.value.copy(c1); u.uC2.value.copy(c2); u.uAlpha.value = 0; u.uReveal.value = 0; u.uSpin.value = opts.spin || 1;
    mesh.scale.set(radius * 2, 1, radius * 2); mesh.position.set(pos.x, (opts.y || 0) + 0.04, pos.z);
    const fx = { t: 0, mesh, fading: false, fadeT: 0, follow: opts.follow || null, reveal: opts.reveal || 0.6, alpha: opts.alpha || 1, life: opts.life || Infinity,
      fadeOut(d = 0.5) { this.fading = true; this.fadeDur = d; },
      update: (dt) => {
        fx.t += dt; u.uTime.value += dt;
        if (fx.follow) mesh.position.set(fx.follow.x, 0.04, fx.follow.z);
        u.uReveal.value = Math.min(1.001, fx.t / fx.reveal);
        let a = fx.alpha * smooth(0, 0.25, fx.t);
        if (fx.t > fx.life) fx.fading = fx.fading || (fx.fadeDur = 0.5, true);
        if (fx.fading) { fx.fadeT += dt; a *= 1 - fx.fadeT / fx.fadeDur; mesh.scale.multiplyScalar(1 + dt * 0.15); if (fx.fadeT >= fx.fadeDur) { this.give('circle', mesh); return false; } }
        u.uAlpha.value = a; return true;
      } };
    return this.add(fx);
  }
  shockwave(pos, radius, color, dur = 0.6, width = 0.08) {
    const mesh = this.take('wave', () => new THREE.Mesh(this.planeGeo, ShaderLibrary.shockwave(0xffffff)));
    const u = mesh.material.uniforms; u.uColor.value.copy(color); u.uWidth.value = width; u.uProg.value = 0; u.uAlpha.value = 1;
    mesh.scale.set(radius * 2, 1, radius * 2); mesh.position.set(pos.x, pos.y + 0.06, pos.z);
    let t = 0;
    return this.add({ update: (dt) => { t += dt; const k = t / dur; u.uProg.value = easeOutExpo(Math.min(1, k)); u.uAlpha.value = 1 - smooth(0.6, 1, k);
      if (k >= 1) { this.give('wave', mesh); return false; } return true; } });
  }
  /** Kiếm khí hình cung gắn theo hướng nhân vật. tilt: độ nghiêng mặt phẳng chém. */
  slash(origin, yaw, color, radius, tilt = 0, dur = 0.24, height = 1.1, mirror = false) {
    const mesh = this.take('slash', () => new THREE.Mesh(this.arcGeo, ShaderLibrary.slash(0xffffff)));
    const u = mesh.material.uniforms; u.uColor.value.copy(color); u.uProg.value = 0; u.uFade.value = 1;
    mesh.position.set(origin.x, origin.y + height, origin.z);
    mesh.rotation.set(0, yaw, 0, 'YXZ'); mesh.rotateZ(tilt);
    mesh.scale.set(mirror ? -radius : radius, radius, radius);
    let t = 0;
    return this.add({ update: (dt) => { t += dt; u.uTime.value += dt; const k = t / dur; u.uProg.value = easeOut(Math.min(1, k * 1.6)); u.uFade.value = 1 - smooth(0.45, 1, k);
      if (k >= 1) { this.give('slash', mesh); return false; } return true; } });
  }
  update(dt, camPos) {
    this.time += dt;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      let alive = false;
      try { alive = this.effects[i].update(dt) !== false; } catch (e) { console.error('[VFX]', e); alive = false; }
      if (!alive) this.effects.splice(i, 1);
    }
    this.particles.update(dt);
    this.ribbons.begin();
    for (const job of this.trailJobs) this.ribbons.push(job.points, job.n, job.width, job.color, camPos);
    for (const job of this.simJobs) this.ribbons.push(job.points, job.n, job.width, job.color, camPos);
    this.ribbons.end();
    this.trailJobs.length = 0;
    this.hairRibbons.begin();
    for (const job of this.hairJobs) this.hairRibbons.push(job.points, job.n, job.width, job.color, camPos);
    this.hairRibbons.end();
    this.hairJobs.length = 0;
    for (const l of flashLights) if (l.intensity > 0) l.intensity = Math.max(0, l.intensity - dt * (l.userData.decay || 6) * l.intensity - dt);
  }
  clear() {
    for (const e of this.effects) if (e.cleanup) try { e.cleanup(); } catch (err) { /* bỏ qua */ }
    this.effects.length = 0;
    for (const [mesh, kind] of Array.from(this.active)) this.give(kind, mesh);   // hiệu ứng bị cắt ngang giữa chừng
  }
}
