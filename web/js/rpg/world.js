// Vạn Kiếm Kỳ Trận – Phiêu Lưu: thế giới màn ngang – địa hình theo bản đồ, bục nổi, cổng chuyển bản đồ, cảnh nền, công trình sơn môn.
// Lối chơi nằm trên mặt phẳng z = 0 (x ngang, y dọc); địa hình / cảnh vật dựng 3D quanh mặt phẳng đó, camera nhìn ngang hơi chếch xuống.
// Script thường (không phải module): nạp sau js/rpg/data.js.
'use strict';

/** Tuỳ chọn người chơi (rig nhân vật đọc options.footIK). Lưu riêng từng khoá như bản cũ. */
const prefersReducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const options = { footIK: store.get('footIK', true), hitstop: store.get('hitstop', !prefersReducedMotion), haptics: store.get('haptics', true),
  shake: store.get('shake', !prefersReducedMotion), autoTarget: store.get('autoTarget', true), showNames: store.get('showNames', true), padSize: store.get('padSize', 1) };
const vfx = new VFXManager();

/** RNG có hạt giống (dựng bản đồ giống nhau mỗi lần vào). */
function seededRng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TERRAIN = { zBack: -3.6, zFront: 1.4, ext: 26, step: 1 };

/** Gộp nhiều geometry (mỗi phần một màu, một ma trận) thành 1 BufferGeometry có màu đỉnh – dùng cho InstancedMesh cảnh vật. */
function mergeColored(parts) {
  const pos = [], nor = [], col = [], idx = [];
  let base = 0;
  for (const [g0, color, m] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.applyMatrix4(m || new THREE.Matrix4());
    const p = g.attributes.position, n = g.attributes.normal, c = new THREE.Color(color);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); idx.push(base + i); }
    base += p.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.setIndex(idx);
  return out;
}
const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0, rx = 0) =>
  new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const toonVC = () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ShaderLibrary.gradientMap });

/** Mẫu cảnh vật: trả về geometry gộp (đơn vị ~1 m). Màu lấy theo biome. */
const PROP_BUILDERS = {
  pine: B => { const cy = new THREE.CylinderGeometry(0.12, 0.18, 1, 6), co = new THREE.ConeGeometry(1, 1, 7);
    return mergeColored([[cy, 0x4a3424, M4(0, 0.9, 0, 1, 1.8, 1)], [co, B.mid, M4(0, 2.2, 0, 1.3, 1.6, 1.3)], [co, B.top, M4(0, 3.1, 0, 1, 1.4, 1)], [co, B.top, M4(0, 3.9, 0, 0.65, 1.1, 0.65)]]); },
  bamboo: B => { const cy = new THREE.CylinderGeometry(0.06, 0.07, 1, 5), co = new THREE.ConeGeometry(0.35, 0.9, 5), parts = [];
    for (let k = 0; k < 4; k++) { const x = (k - 1.5) * 0.28, h = 4 + (k % 2) * 1.4; parts.push([cy, 0x7fa84a, M4(x, h / 2, (k % 2) * 0.2, 1, h, 1, 0, (k - 1.5) * 0.04)]); parts.push([co, B.top, M4(x + 0.1, h - 0.2, 0, 1, 1, 1, 0, 0.6)]); }
    return mergeColored(parts); },
  rock: B => mergeColored([[new THREE.DodecahedronGeometry(0.7, 0), B.soil, M4(0, 0.3, 0, 1.3, 0.8, 1)], [new THREE.DodecahedronGeometry(0.45, 0), B.deep, M4(0.7, 0.15, 0.2, 1, 0.7, 1)]]),
  maple: B => { const s = new THREE.IcosahedronGeometry(1, 0);
    return mergeColored([[new THREE.CylinderGeometry(0.12, 0.2, 1, 6), 0x3a2418, M4(0, 1, 0, 1, 2, 1)], [s, 0xd8502a, M4(0, 2.6, 0, 1.4, 1.1, 1.2)], [s, 0xf0903a, M4(0.7, 2.9, 0.2, 0.9, 0.8, 0.9)], [s, 0xb83a22, M4(-0.6, 2.4, -0.1, 0.9, 0.8, 0.9)]]); },
  deadtree: B => { const c = new THREE.CylinderGeometry(0.05, 0.14, 1, 5);
    return mergeColored([[c, 0x2a2420, M4(0, 1.3, 0, 1.3, 2.6, 1.3)], [c, 0x2a2420, M4(0.35, 2.2, 0, 0.8, 1.2, 0.8, 0, -0.9)], [c, 0x2a2420, M4(-0.3, 1.8, 0, 0.7, 1, 0.7, 0, 0.8)]]); },
  sword: B => { const b = new THREE.BoxGeometry(1, 1, 1);
    return mergeColored([[b, 0xc8d0d8, M4(0, 0.9, 0, 0.14, 1.9, 0.04)], [b, 0x6a5a3a, M4(0, 1.9, 0, 0.6, 0.1, 0.1)], [b, 0x3a2a1a, M4(0, 2.2, 0, 0.08, 0.5, 0.08)]]); },
  crystal: B => { const o = new THREE.OctahedronGeometry(0.5, 0);
    return mergeColored([[o, 0x7fe6ff, M4(0, 0.7, 0, 0.7, 1.6, 0.7)], [o, 0x5fb8e0, M4(0.4, 0.4, 0.1, 0.5, 1, 0.5, 0, -0.4)], [o, 0x9ff0ff, M4(-0.35, 0.35, 0, 0.4, 0.8, 0.4, 0, 0.5)]]); },
  crystal_fire: B => { const o = new THREE.OctahedronGeometry(0.5, 0);
    return mergeColored([[o, 0xff7a3a, M4(0, 0.7, 0, 0.7, 1.6, 0.7)], [o, 0xffb347, M4(0.4, 0.4, 0.1, 0.5, 1, 0.5, 0, -0.4)]]); },
  crystal_dark: B => { const o = new THREE.OctahedronGeometry(0.5, 0);
    return mergeColored([[o, 0x8a3aff, M4(0, 0.9, 0, 0.8, 2, 0.8)], [o, 0xff3a8a, M4(0.45, 0.5, 0.1, 0.5, 1.1, 0.5, 0, -0.4)], [o, 0x4a1a8a, M4(-0.4, 0.4, 0, 0.45, 0.9, 0.45, 0, 0.5)]]); },
  reed: B => { const c = new THREE.CylinderGeometry(0.02, 0.03, 1, 4), p = [];
    for (let k = 0; k < 6; k++) p.push([c, k % 2 ? 0x5a7a4a : 0x7a8a5a, M4((k - 2.5) * 0.12, 0.7, (k % 3) * 0.08, 1, 1.4 + (k % 3) * 0.3, 1, 0, (k - 2.5) * 0.08)]);
    return mergeColored(p); },
  grass: B => { const c = new THREE.ConeGeometry(0.08, 0.6, 4), p = [];
    for (let k = 0; k < 5; k++) p.push([c, k % 2 ? B.top : B.mid, M4((k - 2) * 0.12, 0.28, (k % 2) * 0.1, 1, 0.8 + (k % 3) * 0.3, 1, 0, (k - 2) * 0.2)]);
    return mergeColored(p); },
  bigtree: B => { const s = new THREE.IcosahedronGeometry(1, 1);
    return mergeColored([[new THREE.CylinderGeometry(0.45, 0.8, 1, 8), 0x3a2a1a, M4(0, 2.5, 0, 1, 5, 1)], [s, B.mid, M4(0, 6, 0, 3, 2.2, 2.4)], [s, B.top, M4(1.4, 6.6, 0.4, 1.8, 1.4, 1.6)], [s, B.top, M4(-1.5, 5.6, 0, 1.8, 1.3, 1.6)]]); }
};

const World = {
  id: null, def: null, biome: null, group: null, heights: null, x0: 0, platforms: [], gates: [], spots: {}, geos: [], mats: [], glow: [], time: 0,
  /** Độ cao mặt đất tại x (nội suy tuyến tính giữa các mẫu 1 m). */
  groundAt(x) {
    const h = this.heights; if (!h) return 0;
    const f = (x - this.x0) / TERRAIN.step, i = Math.floor(f);
    if (i < 0) return h[0]; if (i >= h.length - 1) return h[h.length - 1];
    return lerp(h[i], h[i + 1], f - i);
  },
  /** Mặt đỡ cao nhất nằm dưới (hoặc ngang) độ cao y tại x: mặt đất hoặc bục nổi (bục chỉ đỡ khi đang ở trên nó). */
  supportAt(x, y, tol = 0.25) {
    let s = this.groundAt(x);
    for (const p of this.platforms) if (x >= p.x0 && x <= p.x1 && p.y <= y + tol && p.y > s) s = p.y;
    return s;
  },
  get width() { return this.def ? this.def.width : 80; },
  /** Dựng bản đồ id (xoá bản cũ, giải phóng geometry / vật liệu riêng). */
  load(id) {
    this.unload();
    const d = MAPS[id], B = BIOMES[d.biome], rng = seededRng(d.seed * 7919);
    this.id = id; this.def = d; this.biome = B; this.group = new THREE.Group(); scene.add(this.group);
    // ---- Địa hình: tổng các sóng sin theo hạt giống, phẳng ở hai mép (cổng) và quanh NPC
    const ext = TERRAIN.ext, n = Math.round((d.width + ext * 2) / TERRAIN.step) + 1;
    this.x0 = -ext; this.heights = new Float32Array(n);
    const ph = [rng() * 9, rng() * 9, rng() * 9], amp = d.rough;
    for (let i = 0; i < n; i++) {
      const x = this.x0 + i * TERRAIN.step;
      let h = amp * (Math.sin(x * 0.06 + ph[0]) * 1.4 + Math.sin(x * 0.17 + ph[1]) * 0.6 + Math.sin(x * 0.41 + ph[2]) * 0.2);
      const edge = Math.min(smooth(2, 12, x), smooth(d.width - 2, d.width - 12, x));
      this.heights[i] = h * edge;
    }
    // ---- Bục nổi (one-way): đặt rải đều, cao 3,5–6 m so với đất
    this.platforms = [];
    for (let k = 0; k < (d.plat || 0); k++) {
      const cx = lerp(16, d.width - 16, (k + 0.5) / d.plat) + (rng() - 0.5) * 8, w = 4 + rng() * 4;
      const y = Math.max(this.groundAt(cx - w / 2), this.groundAt(cx), this.groundAt(cx + w / 2)) + 3.5 + rng() * 2.5;
      this.platforms.push({ x0: cx - w / 2, x1: cx + w / 2, y });
    }
    this.buildTerrain(B, d);
    this.buildBackdrop(B, d, rng);
    this.buildProps(B, d, rng);
    for (const p of this.platforms) this.buildPlatform(p, B);
    this.gates = [];
    if (d.left) this.buildGate(-1, d.left, B); if (d.right) this.buildGate(1, d.right, B);
    if (d.home) this.buildHome(d, B);
    // ---- Ánh sáng, sương, trời theo biome
    scene.fog.color.set(B.fog); scene.fog.near = B.cave ? 18 : 34; scene.fog.far = B.cave ? 70 : 120;
    renderer.setClearColor(B.fog, 1);
    const u = world.sky.material.uniforms; u.uTop.value.set(B.sky[0]); u.uMid.value.set(B.sky[1]); u.uLow.value.set(B.sky[2]);
    hemi.color.set(B.cave ? 0x8a7a6a : 0xd8e6ff); hemi.groundColor.set(B.soil); hemi.intensity = B.cave ? 0.55 : 0.78;
    sun.color.set(d.biome === 'hoadiem' || d.biome === 'mauyen' ? 0xffb090 : 0xfff0d8); sun.intensity = B.cave ? 0.5 : 0.95;
    world.sea.visible = !!B.sea;
  },
  unload() {
    if (!this.group) return;
    scene.remove(this.group);
    this.geos.forEach(g => g.dispose()); this.mats.forEach(m => m.dispose());
    this.geos = []; this.mats = []; this.glow = []; this.group = null; this.heights = null; this.platforms = []; this.gates = []; this.spots = {};
  },
  keep(g, m) { if (g) this.geos.push(g); if (m) this.mats.push(m); return g || m; },
  /** Dải địa hình: mặt trên (cỏ) từ zBack → zFront, mép cỏ, vách đất phía trước xuống sâu. Màu đỉnh theo hàng. */
  buildTerrain(B, d) {
    const h = this.heights, n = h.length, Z0 = TERRAIN.zBack, Z1 = TERRAIN.zFront, floating = !!B.sea;
    const rows = [[Z0 - 2.2, 0, B.mid], [Z0, 0, B.top], [Z1, 0, B.top], [Z1 + 0.05, -0.35, B.mid], [Z1 + 0.1, -1.4, B.soil], [Z1 + 0.15, floating ? -7 : -16, B.deep]];
    const pos = [], col = [], idx = [], c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = this.x0 + i * TERRAIN.step;
      rows.forEach(([z, dy, color], r) => {
        const jag = r === rows.length - 1 && floating ? Math.sin(x * 1.7) * 1.6 + Math.sin(x * 0.5) * 1.2 : 0;
        pos.push(x, h[i] + dy + jag, z); c.set(color);
        const shade = r === 0 ? 0.82 : r === 5 ? 0.6 : 1 - (i % 2) * 0.03; col.push(c.r * shade, c.g * shade, c.b * shade);
      });
    }
    const R = rows.length;
    for (let i = 0; i < n - 1; i++) for (let r = 0; r < R - 1; r++) { const a = i * R + r, b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = this.keep(null, toonVC()); const mesh = new THREE.Mesh(this.keep(g), m); mesh.receiveShadow = true; this.group.add(mesh);
    if (B.cave) {   // trần hang + nhũ đá
      const cg = this.keep(new THREE.PlaneGeometry(d.width + 60, 14).rotateX(Math.PI / 2)), cm = this.keep(null, new THREE.MeshLambertMaterial({ color: B.deep, side: THREE.DoubleSide }));
      const ceil = new THREE.Mesh(cg, cm); ceil.position.set(d.width / 2, 17, -2); this.group.add(ceil);
      const st = this.keep(new THREE.ConeGeometry(0.6, 3, 5).rotateX(Math.PI)), sm = this.keep(null, new THREE.MeshLambertMaterial({ color: B.soil }));
      const im = new THREE.InstancedMesh(st, sm, 40);
      for (let k = 0; k < 40; k++) im.setMatrixAt(k, M4(k / 40 * (d.width + 40) - 20, 15.6, -2 - (k % 3) * 1.6, 1, 0.6 + (k * 37 % 10) / 8, 1));
      this.group.add(im);
    }
    if (B.lava || B.swamp) {   // mặt dung nham / đầm lầy phía trước vách
      const lg = this.keep(new THREE.PlaneGeometry(d.width + 60, 30).rotateX(-Math.PI / 2));
      const lm = this.keep(null, B.lava ? new THREE.MeshBasicMaterial({ color: 0xb8401a }) : new THREE.MeshLambertMaterial({ color: 0x2a4a50, transparent: true, opacity: 0.85 }));
      const lv = new THREE.Mesh(lg, lm); lv.position.set(d.width / 2, Math.min(...this.heights) - 2.2, 16); this.group.add(lv);
    }
  },
  /** Nền: đồi gần (z −11), dãy núi xa (z −50) – bóng mờ trong sương tạo chiều sâu khi camera chạy ngang. */
  buildBackdrop(B, d, rng) {
    const W = d.width + 120;
    const hill = (z, hMin, hMax, color, freq, yBase) => {
      const pos = [], idx = [], N = 90;
      for (let i = 0; i <= N; i++) {
        const x = -60 + W * i / N, y = yBase + hMin + (hMax - hMin) * (0.5 + 0.5 * Math.sin(x * freq + rng() * 0.4) * Math.cos(x * freq * 0.37));
        pos.push(x, y, z, x, yBase - 20, z);
        if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = this.keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, this.keep(null, new THREE.MeshBasicMaterial({ color, fog: true }))); this.group.add(mesh);
    };
    hill(-62, 10, 26, B.far, 0.045, -4);
    hill(-26, 3, 10, new THREE.Color(B.mid).lerp(new THREE.Color(B.fog), 0.35).getHex(), 0.11, -2);
    hill(-12, 0.5, 4, new THREE.Color(B.mid).lerp(new THREE.Color(B.deep), 0.25).getHex(), 0.2, -1);
  },
  /** Cảnh vật: mỗi loại 1 InstancedMesh (1 lần vẽ), rải sau lối đi (z âm) và vài bụi nhỏ phía trước. */
  buildProps(B, d, rng) {
    const types = B.props, mat = this.keep(null, toonVC()), per = Math.round(d.width * 0.22 * (B.density || 1));
    types.forEach((t, ti) => {
      const geo = this.keep(PROP_BUILDERS[t](B)), count = Math.max(4, Math.round(per / types.length));
      const im = new THREE.InstancedMesh(geo, mat, count); im.castShadow = t !== 'grass';
      for (let k = 0; k < count; k++) {
        const x = -16 + rng() * (d.width + 32), front = (t === 'grass' || t === 'rock') && rng() < 0.3;
        const z = front ? TERRAIN.zFront - 0.3 - rng() * 0.4 : TERRAIN.zBack + 0.6 - rng() * 5.5 - (t === 'bigtree' ? 3 : 0);
        const s = (t === 'grass' ? 0.8 : 0.75) + rng() * 0.6 * (front ? 0.5 : 1);
        if (d.home && t !== 'grass' && x > 4 && x < d.width - 4 && z > -6) { im.setMatrixAt(k, M4(0, -100, 0)); continue; }   // sơn môn: để trống khu NPC
        im.setMatrixAt(k, M4(x, this.groundAt(x) - 0.05, z, s, s * (0.85 + rng() * 0.3), s, rng() * TAU, (t === 'sword' ? (rng() - 0.5) * 0.5 : 0)));
      }
      this.group.add(im);
      if (t.startsWith('crystal')) this.glow.push(im);
    });
  },
  buildPlatform(p, B) {
    const w = p.x1 - p.x0, g = this.keep(mergeColored([[new THREE.BoxGeometry(1, 1, 1), B.top, M4(0, -0.15, -0.6, w, 0.3, 3.4)],
      [new THREE.CylinderGeometry(1, 0.2, 1, 6), B.soil, M4(0, -0.9, -0.6, w * 0.5, 1.2, 1.6)]]));
    const mesh = new THREE.Mesh(g, this.keep(null, toonVC())); mesh.position.set((p.x0 + p.x1) / 2, p.y, 0); mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh);
  },
  /** Cổng chuyển bản đồ ở mép: vòng sáng đứng + đĩa pháp trận. dir −1 trái, +1 phải. */
  buildGate(dir, to, B) {
    const x = dir < 0 ? 2 : this.width - 2, y = this.groundAt(x);
    const ring = new THREE.Mesh(this.keep(new THREE.TorusGeometry(1.5, 0.12, 8, 32)), this.keep(null, ShaderLibrary.glow(0x9fe8ff, 0.8)));
    ring.position.set(x, y + 1.7, -0.4); ring.rotation.y = Math.PI / 2 * 0.25; this.group.add(ring);
    const disc = new THREE.Mesh(this.keep(new THREE.CircleGeometry(1.4, 24)), this.keep(null, ShaderLibrary.glow(0x58d2b2, 0.25)));
    disc.position.copy(ring.position); disc.rotation.y = ring.rotation.y; this.group.add(disc);
    this.gates.push({ dir, to, x, y, ring, disc });
  },
  /** Sơn môn: lầu các, cổng tam quan, đèn lồng; Linh Đan Thụ và Tế Đàn là vật thể tương tác. */
  buildHome(d, B) {
    const sect = SECTS[d.home], c = new THREE.Color(sect.color), wood = 0x7a2a22, stone = 0xb8b4a8, roof = new THREE.Color(0x2a3440).lerp(c, 0.25).getHex();
    const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 8), cone = new THREE.ConeGeometry(1, 1, 4);
    const pavilion = (x, z, s) => {
      const p = [[box, stone, M4(0, 0.25, 0, 6 * s, 0.5, 4 * s)]];
      for (const [px, pz] of [[-2.5, -1.6], [2.5, -1.6], [-2.5, 1.6], [2.5, 1.6]]) p.push([cyl, wood, M4(px * s, 2.1, pz * s, 0.18, 3.4, 0.18)]);
      p.push([box, 0xd8c8a0, M4(0, 2, -1.5 * s, 4.6 * s, 3, 0.1)], [cone, roof, M4(0, 4.4, 0, 4.9 * s, 1.4, 3.6 * s, Math.PI / 4)], [cone, roof, M4(0, 5.6, 0, 3 * s, 1.2, 2.2 * s, Math.PI / 4)], [box, sect.color, M4(0, 6.3, 0, 0.3, 0.5, 0.3)]);
      const mesh = new THREE.Mesh(this.keep(mergeColored(p)), this.keep(null, toonVC())); mesh.position.set(x, this.groundAt(x), z); mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh);
    };
    pavilion(22, -9, 1.2); pavilion(42, -11, 1.6); pavilion(58, -9, 1.1);
    // Cổng tam quan ở lối ra phía phải
    const gx = d.width - 8, gp = [[cyl, wood, M4(-2.2, 2.4, 0, 0.25, 4.8, 0.25)], [cyl, wood, M4(2.2, 2.4, 0, 0.25, 4.8, 0.25)], [box, wood, M4(0, 4.4, 0, 5.6, 0.35, 0.4)],
      [box, roof, M4(0, 5, 0, 6.4, 0.3, 1.2)], [box, 0xe9c46a, M4(0, 3.7, 0.15, 1.6, 0.6, 0.08)]];
    const gate = new THREE.Mesh(this.keep(mergeColored(gp)), this.keep(null, toonVC())); gate.position.set(gx, this.groundAt(gx), -2.6); gate.castShadow = true; this.group.add(gate);
    // Đèn lồng
    const lm = this.keep(null, ShaderLibrary.glow(0xff9a4a, 0.35)), lg = this.keep(new THREE.SphereGeometry(0.35, 10, 8));
    for (const lx of [16, 28, 36, 48, 60, 70]) { const l = new THREE.Mesh(lg, lm); l.position.set(lx, this.groundAt(lx) + 3.2, -3.4); l.scale.y = 1.3; this.group.add(l); this.glow.push(l); }
    // Linh Đan Thụ: thân + tán + quả phát sáng (số quả hiện = số linh đan chờ thu)
    const tx = HOME_NPCS[d.home].find(n => n.role === 'tree').x, ty = this.groundAt(tx);
    const tree = new THREE.Group(); tree.position.set(tx, ty, -1.6); this.group.add(tree);
    const tg = this.keep(mergeColored([[new THREE.CylinderGeometry(0.3, 0.55, 1, 8), 0x5a3a24, M4(0, 1.5, 0, 1, 3, 1)], [new THREE.IcosahedronGeometry(1, 1), 0x3f9f6a, M4(0, 3.9, 0, 2.2, 1.7, 1.8)],
      [new THREE.IcosahedronGeometry(1, 1), 0x58d2b2, M4(1, 4.4, 0.3, 1.3, 1, 1.2)], [new THREE.IcosahedronGeometry(1, 1), 0x4fb88a, M4(-1.1, 3.6, 0.2, 1.3, 1, 1.1)]]));
    const tm = new THREE.Mesh(tg, this.keep(null, toonVC())); tm.castShadow = true; tree.add(tm);
    const fruitG = this.keep(new THREE.SphereGeometry(0.2, 10, 8)), fruitM = this.keep(null, new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    const fruits = []; for (let k = 0; k < 17; k++) { const f = new THREE.Mesh(fruitG, fruitM); const a = k * 2.4; f.position.set(Math.cos(a) * (1 + (k % 3) * 0.4), 3.2 + (k % 4) * 0.45, 1.3 + Math.sin(a) * 0.3); f.visible = false; tree.add(f); fruits.push(f); }
    this.spots.tree = { x: tx, fruits };
    // Tế Đàn Long Châu: bệ đá + 7 hốc ngọc (sáng = đã có)
    const ax = HOME_NPCS[d.home].find(n => n.role === 'altar').x, ay = this.groundAt(ax);
    const altar = new THREE.Group(); altar.position.set(ax, ay, -1.2); this.group.add(altar);
    const ag = this.keep(mergeColored([[cyl, stone, M4(0, 0.3, 0, 2.2, 0.6, 1.6)], [cyl, 0x8a867a, M4(0, 0.8, 0, 1.6, 0.4, 1.2)], [cyl, stone, M4(0, 1.6, 0, 0.5, 1.4, 0.5)], [box, 0xe9c46a, M4(0, 2.4, 0, 0.8, 0.16, 0.8)]]));
    altar.add(new THREE.Mesh(ag, this.keep(null, toonVC())));
    const orbG = this.keep(new THREE.SphereGeometry(0.22, 12, 10)), orbs = [];
    for (let k = 0; k < LONG_CHAU_COUNT; k++) { const a = (k / LONG_CHAU_COUNT) * Math.PI + Math.PI; const m = this.keep(null, new THREE.MeshBasicMaterial({ color: 0x3a3a3a }));
      const o = new THREE.Mesh(orbG, m); o.position.set(Math.cos(a) * 1.7, 1.35 + Math.sin(a) * -0.3, 1.1); altar.add(o); orbs.push(o); }
    this.spots.altar = { x: ax, orbs };
  },
  /** Cập nhật cảnh mỗi khung: cổng phát sáng, pha lê nhấp nháy, hạt môi trường quanh camera. */
  update(dt, camX, camY) {
    this.time += dt;
    for (const g of this.gates) { g.ring.rotation.z += dt * 0.8; g.disc.material.opacity = 0.2 + Math.sin(this.time * 3) * 0.08;
      if (Math.random() < 0.3) vfx.particles.emit(g.x + rand(-0.8, 0.8), g.y + rand(0.3, 3), -0.4, 0, rand(0.4, 1.2), 0, 1.2, 0.18, 0.04, COLORS.shield, 0.8, 0.5); }
    const B = this.biome; if (!B) return;
    if (Q().env > 0 && Math.random() < 0.25 * Q().env * (B.density || 1)) {
      _c1.set(B.motes);
      const leaf = B.props.includes('maple') || B.props.includes('bamboo');
      vfx.particles.emit(camX + rand(-16, 16), camY + rand(-3, 9), rand(-3, 2), rand(-0.6, 0.6) + (leaf ? 0.5 : 0), leaf ? rand(-0.6, -0.2) : rand(0.2, 0.7), rand(-0.2, 0.2), rand(3, 6), leaf ? 0.16 : 0.1, 0.05, _c1, 0.6, 0.05);
    }
    if (B.lava && Math.random() < 0.4) vfx.particles.emit(camX + rand(-16, 16), this.groundAt(camX) - 2, rand(2, 8), 0, rand(1, 3), 0, 2, 0.2, 0.05, COLORS.fire, 0.8, 0.3);
  }
};
/** Rig nhân vật (IK chân) gọi groundHeight – trả về mặt đỡ (đất hoặc bục) tại x. */
const groundHeight = (x, z) => World.groundAt(x);

/* Trời + biển mây dùng chung mọi bản đồ (đổi màu theo biome). */
const world = (() => {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), ShaderLibrary.sky()); sky.renderOrder = -1; scene.add(sky);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1).rotateX(-Math.PI / 2), ShaderLibrary.cloudSea()); sea.position.y = -12; scene.add(sea);
  return { sky, sea };
})();
