// Vạn Kiếm Kỳ Trận – Phiêu Lưu: mô hình nhân vật & quái (người = CharacterRig có sẵn; thú = mô hình thủ tục mới) và lớp Actor
// (vật lý màn ngang: chạy, nhảy, bay, đứng trên bục; sinh lực / linh lực; hiệu ứng trạng thái cơ bản).
// Script thường (không phải module): nạp sau js/rpg/world.js.
'use strict';

/** Góc quay mặt khi nhìn sang phải / trái: lệch về phía camera 26° để thấy mặt nhân vật (kiểu màn ngang 2.5D). */
const FACE_YAW = Math.PI / 2 - 0.45;

/** Mô hình người: bọc CharacterRig (toon, viền, tóc / váy vật lý, IK chân, động tác chém / thi pháp). */
class HumanModel {
  constructor(look, scale = 1, rim = 0x9fd8ff) {
    this.U = ShaderLibrary.makeUnitUniforms(rim); this.U.uEdgeColor.value.set(rim);
    this.rig = new CharacterRig(LOOKS[look] || LOOKS.kiemdong, this.U);
    this.root = this.rig.root; this.root.scale.setScalar(scale); scene.add(this.root);
    this.scale = scale; this.yaw = FACE_YAW; this.height = 1.95 * scale; this.width = 0.8 * scale; this.trailT = 0; this.flashT = 0;
  }
  setScale(s) { this.scale = s; this.root.scale.setScalar(s); this.height = 1.95 * s; this.width = 0.8 * s; }
  play(name, timing) { this.rig.playAction(name, timing); if (/Attack|Heavy|Dash/.test(name)) { this.rig.setTrail(true); this.trailT = timing.dur * 0.8; } }
  hold(name, on) { this.rig.hold(name, on); }
  hit(fromFront, strength) { this.rig.hitReact(0, fromFront ? -1 : 1, strength); }
  flash(color, t = 0.12) { this.U.uFlash.value.set(color); this.flashT = t; }
  update(dt, a) {
    this.yaw = damp(this.yaw, a.facing > 0 ? FACE_YAW : -FACE_YAW, 14, dt);
    const ground = World.supportAt(a.pos.x, a.pos.y), alt = a.pos.y - ground;
    this.rig.setLoco(a.onGround ? Math.abs(a.vel.x) / this.scale : 0);
    this.rig.hold('Dash', !a.dead && !a.onGround && (a.flying ? Math.abs(a.vel.x) > 2.5 : true));
    this.rig.update(dt, a.pos, this.yaw);
    const b = this.rig.blob; b.position.y = -alt / this.scale + 0.085; b.scale.setScalar(clamp(1 - alt / 10, 0.25, 1)); b.visible = alt < 14 && !a.dead;
    if (this.trailT > 0 && (this.trailT -= dt) <= 0) this.rig.setTrail(false);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.U.uFlash.value.setRGB(0, 0, 0); else this.U.uFlash.value.multiplyScalar(Math.max(0, 1 - dt * 10)); }
  }
  setOutline(on) { this.rig.setOutline(on); }
  setShadows(on) { this.rig.setShadows(on); }
  dispose() { this.rig.dispose(); }
  /** Điểm phát chiêu (đầu vũ khí) trong không gian thế giới. */
  tipPos(out) { return (this.rig.tip || this.root).getWorldPosition(out); }
}

/* ---------- Mô hình thú thủ tục ----------
 * Mỗi loại: build(m) dựng bộ phận bằng m.part(...), anim(m, dt, a, k) xoay / co giãn theo trạng thái (đi, bay, tấn công, chết).
 * Vật liệu toon dùng uniform riêng của con quái (chớp sáng khi trúng đòn, tan biến khi chết). Geometry dùng chung giữa các con. */
const BG = {
  sph: () => sharedGeo('b_sph', () => new THREE.SphereGeometry(1, 14, 10)), box: () => sharedGeo('b_box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: () => sharedGeo('b_cyl', () => new THREE.CylinderGeometry(1, 1, 1, 10)), cone: () => sharedGeo('b_cone', () => new THREE.ConeGeometry(1, 1, 8)),
  ico: () => sharedGeo('b_ico', () => new THREE.IcosahedronGeometry(1, 0)), oct: () => sharedGeo('b_oct', () => new THREE.OctahedronGeometry(1, 0))
};
const quad = (m, side, x, z, len, color) => {   // chân 4 chân: khớp hông → chân
  const p = new THREE.Group(); p.position.set(x * side, 0, z); m.body.add(p);
  m.part(BG.cyl(), color, p, 0, -len / 2, 0, 0.09, len, 0.09); return p;
};
const BEASTS = {
  rabbit: { w: 0.8, h: 0.9,
    build(m) { const { c1, c2 } = m;
      m.body.position.y = 0.42; m.part(BG.sph(), c1, m.body, 0, 0, 0, 0.42, 0.36, 0.5);
      m.head = new THREE.Group(); m.head.position.set(0, 0.28, 0.36); m.body.add(m.head);
      m.part(BG.sph(), c1, m.head, 0, 0, 0, 0.27, 0.25, 0.26);
      m.ears = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(0.09 * s, 0.18, -0.04); m.head.add(e); m.part(BG.sph(), c1, e, 0, 0.26, 0, 0.07, 0.28, 0.05); m.part(BG.sph(), c2, e, 0, 0.26, 0.02, 0.04, 0.2, 0.03, false); return e; });
      for (const s of [-1, 1]) m.part(BG.sph(), 0x1a1a22, m.head, 0.12 * s, 0.05, 0.2, 0.04, 0.05, 0.03, false);
      m.part(BG.sph(), c2, m.head, 0, -0.03, 0.25, 0.04, 0.03, 0.03, false); m.part(BG.sph(), 0xffffff, m.body, 0, 0.05, -0.5, 0.12, 0.12, 0.12); },
    anim(m, dt, a, k) { const mv = Math.abs(a.vel.x) > 0.3 || !a.onGround; m.ph += dt * (mv ? 11 : 2);
      m.body.position.y = 0.42 + (mv ? Math.abs(Math.sin(m.ph)) * 0.32 : Math.sin(m.ph) * 0.02); m.body.rotation.x = mv ? Math.sin(m.ph) * 0.2 : 0;
      m.ears.forEach((e, i) => (e.rotation.x = -0.2 + Math.sin(m.ph + i) * 0.15 - k.atk * 0.6)); m.body.position.z = k.atk * 0.35; }
  },
  slime: { w: 1, h: 1,
    build(m) { m.body.position.y = 0.45; m.blobBody = m.part(BG.sph(), m.c1, m.body, 0, 0, 0, 0.55, 0.45, 0.5);
      m.core = new THREE.Mesh(BG.sph(), m.own(ShaderLibrary.glow(m.c2, 0.7))); m.core.scale.setScalar(0.2); m.body.add(m.core);
      for (const s of [-1, 1]) m.part(BG.sph(), 0x1a1a22, m.body, 0.17 * s, 0.12, 0.42, 0.06, 0.09, 0.04, false); },
    anim(m, dt, a, k) { m.ph += dt * (Math.abs(a.vel.x) > 0.3 ? 9 : 3); const s = Math.sin(m.ph);
      m.body.scale.set(1 + s * 0.08 + k.atk * 0.3, 1 - s * 0.1 - k.atk * 0.25, 1 + s * 0.08); m.body.position.y = 0.45 + Math.max(0, s) * 0.15; m.core.scale.setScalar(0.2 + Math.sin(m.ph * 2) * 0.03 + k.atk * 0.1); }
  },
  boar: { w: 1.4, h: 1.1,
    build(m) { const { c1, c2 } = m; m.body.position.y = 0.62;
      m.part(BG.sph(), c1, m.body, 0, 0, 0, 0.45, 0.42, 0.7); m.part(BG.box(), new THREE.Color(c1).multiplyScalar(0.7).getHex(), m.body, 0, 0.36, -0.05, 0.12, 0.18, 0.9, false);
      m.head = new THREE.Group(); m.head.position.set(0, 0.05, 0.62); m.body.add(m.head);
      m.part(BG.sph(), c1, m.head, 0, 0, 0, 0.3, 0.28, 0.32); m.part(BG.cyl(), 0xc89a8a, m.head, 0, -0.05, 0.3, 0.12, 0.12, 0.12).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) { const t = m.part(BG.cone(), c2, m.head, 0.15 * s, -0.08, 0.3, 0.04, 0.22, 0.04, false); t.rotation.set(-0.6, 0, 0.5 * s); m.part(BG.sph(), 0x1a1a1a, m.head, 0.13 * s, 0.1, 0.24, 0.035, 0.04, 0.03, false); m.part(BG.cone(), c1, m.head, 0.18 * s, 0.26, -0.05, 0.07, 0.14, 0.04); }
      m.legs = [quad(m, -1, 0.25, 0.38, 0.5, c1), quad(m, 1, 0.25, 0.38, 0.5, c1), quad(m, -1, 0.25, -0.4, 0.5, c1), quad(m, 1, 0.25, -0.4, 0.5, c1)]; m.legs.forEach(l => (l.position.y = -0.2)); },
    anim(m, dt, a, k) { const sp = Math.abs(a.vel.x); m.ph += dt * (2 + sp * 3); m.legs.forEach((l, i) => (l.rotation.x = Math.sin(m.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * clamp(sp / 4, 0, 0.7)));
      m.body.position.y = 0.62 + Math.abs(Math.sin(m.ph)) * 0.05 * clamp(sp, 0, 1); m.head.rotation.x = k.atk * 0.5 - k.wind * 0.3; m.body.position.z = k.atk * 0.5; }
  },
  wolf: { w: 1.4, h: 1.1,
    build(m) { const { c1, c2 } = m; m.body.position.y = 0.66;
      m.part(BG.sph(), c1, m.body, 0, 0, 0, 0.3, 0.3, 0.68); m.part(BG.sph(), c2, m.body, 0, -0.08, 0.3, 0.24, 0.22, 0.3, false);
      m.head = new THREE.Group(); m.head.position.set(0, 0.22, 0.66); m.body.add(m.head);
      m.part(BG.sph(), c1, m.head, 0, 0, 0, 0.22, 0.2, 0.24); const sn = m.part(BG.cone(), c1, m.head, 0, -0.04, 0.26, 0.1, 0.3, 0.1); sn.rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) { m.part(BG.cone(), c1, m.head, 0.11 * s, 0.22, -0.04, 0.06, 0.18, 0.05); m.part(BG.sph(), 0xffd166, m.head, 0.09 * s, 0.06, 0.18, 0.03, 0.025, 0.02, false); }
      m.tail = new THREE.Group(); m.tail.position.set(0, 0.12, -0.62); m.body.add(m.tail); m.part(BG.cone(), c1, m.tail, 0, 0, -0.25, 0.09, 0.55, 0.09).rotation.x = -Math.PI / 2 - 0.4;
      m.legs = [quad(m, -1, 0.15, 0.4, 0.55, c1), quad(m, 1, 0.15, 0.4, 0.55, c1), quad(m, -1, 0.15, -0.42, 0.55, c1), quad(m, 1, 0.15, -0.42, 0.55, c1)]; m.legs.forEach(l => (l.position.y = -0.12)); },
    anim(m, dt, a, k) { const sp = Math.abs(a.vel.x); m.ph += dt * (2 + sp * 2.6); m.legs.forEach((l, i) => (l.rotation.x = Math.sin(m.ph + (i % 2 ? 0.6 : 0) + (i > 1 ? Math.PI : 0)) * clamp(sp / 4, 0, 0.8)));
      m.tail.rotation.y = Math.sin(m.ph * 1.3) * 0.4; m.head.rotation.x = -k.wind * 0.4 + k.atk * 0.4; m.body.position.z = k.atk * 0.6; m.body.rotation.x = -k.wind * 0.15 + k.atk * 0.1; }
  },
  bird: { w: 1.3, h: 1, fly: true,
    build(m) { const { c1, c2 } = m; m.body.position.y = 0.5;
      m.part(BG.sph(), c1, m.body, 0, 0, 0, 0.26, 0.24, 0.45); m.part(BG.sph(), c1, m.body, 0, 0.18, 0.38, 0.17, 0.17, 0.17);
      const bk = m.part(BG.cone(), c2, m.body, 0, 0.15, 0.6, 0.06, 0.2, 0.06, false); bk.rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) m.part(BG.sph(), 0xffe08a, m.body, 0.1 * s, 0.24, 0.5, 0.025, 0.03, 0.02, false);
      m.wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(0.2 * s, 0.08, 0); m.body.add(w); m.part(BG.box(), c2, w, 0.55 * s, 0, -0.05, 1.1, 0.04, 0.42); m.part(BG.box(), c1, w, 0.3 * s, 0.02, 0.05, 0.6, 0.05, 0.3, false); return w; });
      m.part(BG.box(), c2, m.body, 0, 0.02, -0.55, 0.32, 0.03, 0.3); },
    anim(m, dt, a, k) { m.ph += dt * (k.atk > 0 ? 18 : 11); const f = Math.sin(m.ph);
      m.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (f * 0.7 + 0.1))); m.body.position.y = 0.5 + Math.sin(m.ph * 0.5) * 0.1; m.body.rotation.x = k.atk * 0.6 - k.wind * 0.3; }
  },
  golem: { w: 1.4, h: 2.2,
    build(m) { const { c1, c2 } = m; m.body.position.y = 1.15;
      m.part(BG.box(), c1, m.body, 0, 0.2, 0, 1, 0.9, 0.7); m.part(BG.box(), c1, m.body, 0, -0.42, 0, 0.75, 0.45, 0.55);
      m.head = new THREE.Group(); m.head.position.set(0, 0.85, 0.05); m.body.add(m.head); m.part(BG.box(), c1, m.head, 0, 0, 0, 0.42, 0.36, 0.38);
      for (const s of [-1, 1]) { m.part(BG.box(), c2, m.head, 0.1 * s, 0.03, 0.2, 0.08, 0.05, 0.02, false); m.part(BG.oct(), c2, m.body, 0.5 * s, 0.75, -0.1, 0.12, 0.26, 0.12, false); }
      m.core = new THREE.Mesh(BG.sph(), m.own(ShaderLibrary.glow(c2, 0.8))); m.core.position.set(0, 0.25, 0.36); m.core.scale.setScalar(0.13); m.body.add(m.core);
      m.arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(0.65 * s, 0.5, 0); m.body.add(g); m.part(BG.box(), c1, g, 0, -0.45, 0, 0.32, 0.9, 0.34); m.part(BG.box(), c1, g, 0, -1.0, 0.05, 0.4, 0.34, 0.4); return g; });
      m.legs = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(0.25 * s, -0.6, 0); m.body.add(g); m.part(BG.box(), c1, g, 0, -0.28, 0, 0.32, 0.56, 0.36); return g; }); },
    anim(m, dt, a, k) { const sp = Math.abs(a.vel.x); m.ph += dt * (1.5 + sp * 2.2);
      m.legs.forEach((l, i) => (l.rotation.x = Math.sin(m.ph + i * Math.PI) * clamp(sp / 3, 0, 0.5))); m.body.rotation.z = Math.sin(m.ph) * 0.04 * clamp(sp, 0, 1);
      m.arms.forEach((g, i) => (g.rotation.x = -Math.sin(m.ph + i * Math.PI) * 0.3 * clamp(sp / 3, 0, 1) - k.wind * 2.4 + k.atk * 1.6)); m.core.scale.setScalar(0.13 + Math.sin(m.time * 4) * 0.02); }
  },
  tree: { w: 1.4, h: 2.4,
    build(m) { const { c1, c2 } = m; m.body.position.y = 0.3;
      m.part(BG.cyl(), c1, m.body, 0, 0.8, 0, 0.35, 1.6, 0.35); m.part(BG.ico(), c2, m.body, 0, 2, 0, 0.9, 0.75, 0.8); m.part(BG.ico(), new THREE.Color(c2).multiplyScalar(0.8).getHex(), m.body, 0.45, 2.3, 0.1, 0.55, 0.45, 0.5);
      for (const s of [-1, 1]) m.part(BG.sph(), 0xffd166, m.body, 0.12 * s, 1.15, 0.33, 0.05, 0.035, 0.02, false);
      m.part(BG.box(), 0x1a1208, m.body, 0, 0.95, 0.34, 0.16, 0.05, 0.02, false);
      m.arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(0.32 * s, 1.2, 0); m.body.add(g); const b = m.part(BG.cyl(), c1, g, 0.35 * s, -0.1, 0, 0.07, 0.8, 0.07); b.rotation.z = 1.1 * s; return g; });
      m.legs = [-1, 0, 1].map(s => { const g = new THREE.Group(); g.position.set(0.2 * s, 0.05, s ? 0 : 0.2); m.body.add(g); m.part(BG.cone(), c1, g, 0, -0.15, 0, 0.12, 0.45, 0.12).rotation.x = Math.PI; return g; }); },
    anim(m, dt, a, k) { const sp = Math.abs(a.vel.x); m.ph += dt * (1.2 + sp * 2.5);
      m.body.rotation.z = Math.sin(m.ph * 0.7) * 0.05; m.legs.forEach((l, i) => (l.rotation.x = Math.sin(m.ph + i * 2.1) * clamp(sp / 3, 0, 0.5)));
      m.arms.forEach((g, i) => (g.rotation.x = Math.sin(m.ph + i) * 0.15 - k.wind * 1.8 + k.atk * 1.5)); }
  },
  serpent: { w: 2.4, h: 1.2, fly: true,
    build(m) { const { c1, c2 } = m; m.body.position.y = 0.7; m.segs = [];
      for (let i = 0; i < 9; i++) { const g = new THREE.Group(); m.body.add(g); const r = 0.3 * (1 - i * 0.07); m.part(BG.sph(), i % 2 ? c1 : new THREE.Color(c1).lerp(new THREE.Color(c2), 0.25).getHex(), g, 0, 0, 0, r, r, r * 1.3);
        if (i % 2 === 0) m.part(BG.cone(), c2, g, 0, r * 0.9, 0, r * 0.35, r * 0.8, r * 0.35, false); m.segs.push(g); }
      m.head = m.segs[0]; m.part(BG.sph(), c1, m.head, 0, 0.05, 0.25, 0.26, 0.2, 0.32);
      for (const s of [-1, 1]) { m.part(BG.sph(), c2, m.head, 0.14 * s, 0.14, 0.42, 0.05, 0.04, 0.03, false); const h = m.part(BG.cone(), c2, m.head, 0.12 * s, 0.3, 0.1, 0.04, 0.3, 0.04, false); h.rotation.x = -0.7; } },
    anim(m, dt, a, k) { m.ph += dt * 4;
      m.segs.forEach((g, i) => g.position.set(Math.sin(m.ph - i * 0.8) * 0.12 * i * 0.3, Math.sin(m.ph - i * 0.7) * 0.18, -i * 0.36 + k.atk * 0.6 * (1 - i / 9)));
      m.head.rotation.x = -k.wind * 0.5 + k.atk * 0.3; }
  }
};

/** Mô hình thú thủ tục (rabbit, slime, boar, wolf, bird, golem, tree, serpent). */
class BeastModel {
  constructor(type, c1, c2, scale = 1, rim = 0xff6a50) {
    const T = BEASTS[type]; this.T = T; this.c1 = c1; this.c2 = c2;
    this.U = ShaderLibrary.makeUnitUniforms(rim); this.U.uRimStrength.value = 0.45; this.U.uEdgeColor.value.set(rim);
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); this.mats = new Map(); this.owned = []; this.outlines = []; this.meshes = [];
    this.ph = Math.random() * 10; this.time = 0; this.yaw = FACE_YAW; this.act = null; this.dead = 0; this.flashT = 0; this.hitOff = 0;
    T.build(this);
    if (!RIG_BLOB_MAT) { RIG_BLOB_MAT = new THREE.MeshBasicMaterial({ map: vfx.blobTex, transparent: true, depthWrite: false }); RIG_BLOB_MAT.userData.shared = true; }
    this.blob = new THREE.Mesh(sharedGeo('b_blob', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), RIG_BLOB_MAT); this.blob.scale.setScalar(T.w * 0.9); this.root.add(this.blob);
    this.setScale(scale); this.setOutline(Q().outline); scene.add(this.root);
  }
  setScale(s) { this.scale = s; this.root.scale.setScalar(s); this.height = this.T.h * s; this.width = this.T.w * s; }
  own(m) { this.owned.push(m); return m; }
  mat(color) { const key = typeof color === 'number' ? color : color.getHex(); let m = this.mats.get(key); if (!m) { m = ShaderLibrary.toon(key, this.U); this.mats.set(key, m); } return m; }
  part(geo, color, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, outline = true) {
    const m = new THREE.Mesh(geo, this.mat(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); this.meshes.push(m);
    if (outline) { const o = new THREE.Mesh(geo, this.outlineMat || (this.outlineMat = this.own(ShaderLibrary.linkOutline(ShaderLibrary.outline(this.U, 0.07), this.U))));
      m.add(o); this.outlines.push(o); }   // viền là con của phần → theo mọi phép xoay / co giãn đặt sau
    return m;
  }
  play(name, timing) { this.act = { t: 0, dur: timing.dur, wind: timing.windup, active: timing.active }; }
  hold(name, on) { if (name === 'Death') this.dead = on ? Math.max(this.dead, 0.001) : 0; }
  hit(fromFront, strength) { this.hitOff = (fromFront ? -1 : 1) * strength * 0.25; }
  flash(color, t = 0.12) { this.U.uFlash.value.set(color); this.flashT = t; }
  update(dt, a) {
    this.time += dt;
    this.yaw = damp(this.yaw, a.facing > 0 ? FACE_YAW : -FACE_YAW, 10, dt);
    let wind = 0, atk = 0;
    if (this.act) { const c = this.act; c.t += dt;
      if (c.t < c.wind) wind = easeInOut(c.t / c.wind); else if (c.t < c.active + 0.1) { atk = easeOutExpo((c.t - c.wind) / Math.max(0.01, c.active - c.wind)); wind = 1 - atk; }
      else atk = 1 - clamp((c.t - c.active - 0.1) / Math.max(0.05, c.dur - c.active - 0.1), 0, 1);
      if (c.t >= c.dur) this.act = null; }
    this.T.anim(this, dt, a, { wind, atk });
    this.hitOff = damp(this.hitOff, 0, 10, dt); this.body.position.z += this.hitOff;
    if (this.dead) { this.dead = Math.min(1, this.dead + dt * 2.5); this.body.rotation.z = easeOut(this.dead) * 1.5; this.body.position.y *= 1 - this.dead * 0.6; }
    this.root.position.copy(a.pos); this.root.rotation.y = this.yaw;
    const ground = World.supportAt(a.pos.x, a.pos.y), alt = a.pos.y - ground;
    this.blob.position.y = -alt / this.scale + 0.06; this.blob.visible = alt < 14 && !a.dead;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.U.uFlash.value.setRGB(0, 0, 0); else this.U.uFlash.value.multiplyScalar(Math.max(0, 1 - dt * 10)); }
  }
  setOutline(on) { this.outlines.forEach(o => (o.visible = on)); }
  setShadows(on) { this.meshes.forEach(m => (m.castShadow = on)); }
  tipPos(out) { return out.set(this.root.position.x + (this.yaw > 0 ? 1 : -1) * this.width * 0.5, this.root.position.y + this.height * 0.5, 0); }
  dispose() { scene.remove(this.root); this.mats.forEach(m => m.dispose()); this.owned.forEach(m => m.dispose()); }
}

/** Dựng mô hình theo định nghĩa quái / NPC. */
function makeModel(def, scale, rim) {
  if (def.model === 'human') { const m = new HumanModel(def.look, scale, rim); if (def.ghost) { m.U.uRimStrength.value = 1.6; m.U.uRimColor.value.set(0x9fd8ff); } return m; }
  return new BeastModel(def.model, def.c1, def.c2, scale, rim);
}

/* =====================================================================
 *  Actor – mọi thực thể trong thế giới (người chơi, quái, NPC, người chơi ảo)
 * ===================================================================*/
let actorSeq = 0;
class Actor {
  constructor(o) {
    this.id = ++actorSeq; this.kind = o.kind; this.team = o.team; this.name = o.name || '';
    this.pos = new V3(o.x || 0, o.y != null ? o.y : World.groundAt(o.x || 0), 0); this.vel = new V3(); this.facing = o.facing || 1;
    this.model = o.model; this.onGround = true; this.flying = false; this.canFly = !!o.canFly; this.dropT = 0;
    this.maxHp = this.hp = o.hp || 100; this.maxMp = this.mp = o.mp || 0; this.atk = o.atk || 10; this.def = o.def || 0; this.crit = o.crit || 0.05; this.critDmg = 1.5; this.level = o.level || 1;
    this.dead = false; this.deadT = 0; this.stun = 0; this.slowT = 0; this.slowK = 0; this.shield = 0; this.shieldT = 0; this.drT = 0; this.drK = 0; this.lastCombat = -99; this.busy = 0;
  }
  get alive() { return !this.dead; }
  get w() { return this.model ? this.model.width : 0.8; }
  get h() { return this.model ? this.model.height : 1.9; }
  center(out) { return out.set(this.pos.x, this.pos.y + this.h * 0.5, 0); }
  /** Vật lý màn ngang: trọng lực (trừ khi bay), va chạm mặt đất / bục nổi một chiều, mép bản đồ, trần bay. */
  physics(dt) {
    const prevY = this.pos.y;
    if (!this.flying) this.vel.y -= RPG_BAL.gravity * dt * (this.vel.y < 0 ? 1.25 : 1);
    this.vel.y = Math.max(this.vel.y, -30);
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt;
    this.pos.x = clamp(this.pos.x, 0.4, World.width - 0.4);
    if (this.dropT > 0) this.dropT -= dt;
    const support = this.dropT > 0 ? World.groundAt(this.pos.x) : World.supportAt(this.pos.x, prevY);
    if (this.pos.y <= support && this.vel.y <= 0.01) {
      this.pos.y = support; if (this.vel.y < -14 && this.kind === 'player') onHeavyLand(this);
      this.vel.y = 0; this.onGround = true; if (this.flying && !this.hover) this.flying = false;
    } else this.onGround = this.pos.y - support < 0.02;
    const ceil = World.groundAt(this.pos.x) + RPG_BAL.maxAlt + (this.spec && this.spec.boss ? 4 : 0);
    if (this.pos.y > ceil) { this.pos.y = ceil; this.vel.y = Math.min(0, this.vel.y); }
    if (World.biome && World.biome.cave) this.pos.y = Math.min(this.pos.y, 15 - this.h);
  }
  /** Hiệu ứng thời gian: choáng, chậm, khiên, giảm sát thương. */
  tickStatus(dt) {
    if (this.stun > 0) this.stun -= dt;
    if (this.slowT > 0 && (this.slowT -= dt) <= 0) this.slowK = 0;
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
    if (this.drT > 0 && (this.drT -= dt) <= 0) this.drK = 0;
    if (this.busy > 0) this.busy -= dt;
  }
  speedMul() { return (1 - this.slowK) * (this.stun > 0 ? 0 : 1); }
  dispose() { if (this.model) { this.model.dispose(); this.model = null; } }
}
/** Rơi mạnh từ trên cao xuống: bụi + rung nhẹ (chỉ người chơi). */
function onHeavyLand(a) { vfx.particles.burst(_v1.set(a.pos.x, a.pos.y + 0.1, 0), COLORS.white, 14, 4, 0.5, 0.3, { up: 1, gravity: 4 }); SideCam.shake(0.15); }
