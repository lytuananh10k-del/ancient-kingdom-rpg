// Vạn Kiếm Kỳ Trận – CharacterRig – nhân vật thủ tục, IK chân, chuyển động phụ (mục 7)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  7. CharacterRig – nhân vật thủ tục có "xương", chuyển động phụ (tóc, áo)
 *     Giao diện chung với GLTFRig: setLoco, playAction, hold, hitReact,
 *     setLookTarget, update, getSocket, dispose.
 * ===================================================================*/
const JOINTS = ['hips', 'spine', 'chest', 'head', 'lArm', 'lFore', 'rArm', 'rFore', 'lThigh', 'lShin', 'rThigh', 'rShin'];
const JI = Object.fromEntries(JOINTS.map((n, i) => [n, i]));
const PL = JOINTS.length * 3 + 4, R_HY = JOINTS.length * 3, R_HZ = R_HY + 1, R_YAW = R_HY + 2, R_PITCH = R_HY + 3;
function pose(def) {
  const p = new Float32Array(PL);
  for (const k in def) {
    if (k in JI) { const i = JI[k] * 3, v = def[k]; p[i] = (v[0] || 0) * DEG; p[i + 1] = (v[1] || 0) * DEG; p[i + 2] = (v[2] || 0) * DEG; }
  }
  p[R_HY] = def.hipY || 0; p[R_HZ] = def.hipZ || 0; p[R_YAW] = (def.yaw || 0) * DEG; p[R_PITCH] = (def.pitch || 0) * DEG;
  return p;
}
const lerpPose = (out, a, b, t) => { for (let i = 0; i < PL; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; };

/* Thư viện động tác: [Anticipation (chuẩn bị), Impact (tư thế va chạm)].
 * Tay phải ở phía -X; nhân vật nhìn +Z; khớp tay xoay thứ tự YXZ (nâng tay rồi quét ngang). */
const ACT = {
  sword: {
    Attack01: [pose({ rArm: [-80, -105, 0], rFore: [-40], lArm: [-30, 0, 25], chest: [0, -40, 0], spine: [5, -10], lThigh: [-25], lShin: [30], rThigh: [15], hipY: -0.08 }),
               pose({ rArm: [-85, 70, 0], rFore: [-5], lArm: [-20, 0, 45], chest: [8, 38, 0], spine: [10, 10], lThigh: [-38], lShin: [25], rThigh: [25], rShin: [10], hipY: -0.13, hipZ: 0.18 })],
    Attack02: [pose({ rArm: [-80, 78, 0], rFore: [-55], chest: [0, 38, 0], lArm: [-15, 0, 20], lThigh: [10], rThigh: [-10], hipY: -0.06 }),
               pose({ rArm: [-85, -88, 0], rFore: [-5], chest: [8, -38, 0], rThigh: [-38], rShin: [25], lThigh: [22], hipY: -0.12, hipZ: 0.15 })],
    Attack03: [pose({ rArm: [-175, -10, 0], rFore: [-30], lArm: [-165, 10, 0], lFore: [-30], chest: [-15, 0, 0], head: [-10], hipY: 0.03 }),
               pose({ rArm: [-35, -5, 0], rFore: [-5], lArm: [-40, 5, 0], chest: [30, 0, 0], spine: [10], lThigh: [-48], lShin: [35], rThigh: [30], rShin: [20], hipY: -0.24, hipZ: 0.22 })],
    HeavyAttack: [pose({ rArm: [-80, -85, 0], rFore: [-20], lArm: [-50, 65, 0], chest: [0, -35, 0], yaw: -50, hipY: -0.12, lThigh: [-20], lShin: [30], rThigh: [10], rShin: [30] }),
                  pose({ rArm: [-88, -85, 0], rFore: [-5], lArm: [-50, 65, 0], chest: [6, 10, 0], yaw: 360, hipY: -0.18, lThigh: [-25], lShin: [30], rThigh: [15], rShin: [25] })]
  },
  spear: {
    Attack01: [pose({ rArm: [-30, -20, -25], rFore: [-85], lArm: [-60, 30, 0], lFore: [-70], chest: [0, -30, 0], rThigh: [10], hipY: -0.05 }),
               pose({ rArm: [-90, 0, 0], rFore: [-5], lArm: [-80, 10, 0], lFore: [-30], chest: [14, 15, 0], lThigh: [-50], lShin: [40], rThigh: [30], hipY: -0.25, hipZ: 0.35 })],
    Attack02: [pose({ rArm: [-60, -90, 0], rFore: [-30], lArm: [-50, -60, 0], lFore: [-40], chest: [0, -45, 0], hipY: -0.08 }),
               pose({ rArm: [-70, 60, 0], rFore: [-10], lArm: [-60, 70, 0], lFore: [-30], chest: [8, 40, 0], lThigh: [-25], rThigh: [20], hipY: -0.15 })],
    Attack03: [pose({ rArm: [-30, -20, -25], rFore: [-85], lArm: [-60, 30, 0], lFore: [-70], chest: [0, -30, 0], hipY: -0.05 }),
               pose({ rArm: [-92, 5, 0], rFore: [-3], lArm: [-85, 15, 0], lFore: [-25], chest: [16, 10, 0], lThigh: [-55], lShin: [42], rThigh: [32], hipY: -0.28, hipZ: 0.4 })],
    HeavyAttack: [pose({ rArm: [-170, 0, 0], rFore: [-25], lArm: [-160, 0, 0], lFore: [-30], chest: [-18, 0, 0], hipY: 0.1 }),
                  pose({ rArm: [-50, 0, 0], rFore: [-10], lArm: [-55, 0, 0], lFore: [-15], chest: [35, 0, 0], spine: [12], lThigh: [-50], lShin: [45], rThigh: [35], rShin: [30], hipY: -0.32, hipZ: 0.25 })]
  },
  staff: {
    Attack01: [pose({ rArm: [-40, -30, 0], rFore: [-80], lArm: [-30, 0, 20], chest: [-5, -20, 0], hipY: -0.03 }),
               pose({ rArm: [-100, 10, 0], rFore: [-10], lArm: [-10, 0, 35], chest: [8, 15, 0], lThigh: [-20], hipY: -0.06, hipZ: 0.08 })],
    Attack02: [pose({ rArm: [-120, -40, 0], rFore: [-50], lArm: [-20, 0, 20], chest: [-8, -25, 0] }),
               pose({ rArm: [-80, 30, 0], rFore: [-5], lArm: [-60, -20, 0], lFore: [-60], chest: [10, 20, 0], rThigh: [-20], hipY: -0.06 })],
    Attack03: [pose({ rArm: [-40, -30, 0], rFore: [-80], lArm: [-70, 30, 0], lFore: [-90], chest: [-5, -15, 0] }),
               pose({ rArm: [-105, 0, 0], rFore: [-8], lArm: [-95, -10, 0], lFore: [-8], chest: [10, 0, 0], lThigh: [-25], hipY: -0.08, hipZ: 0.1 })],
    HeavyAttack: [pose({ rArm: [-170, 0, 0], rFore: [-10], lArm: [-150, 0, 30], lFore: [-10], chest: [-15, 0, 0], head: [-15], hipY: 0.05 }),
                  pose({ rArm: [-95, 0, 0], rFore: [-5], lArm: [-95, 0, -10], lFore: [-5], chest: [14, 0, 0], lThigh: [-35], lShin: [30], rThigh: [20], hipY: -0.14, hipZ: 0.12 })]
  },
  claws: {
    Attack01: [pose({ rArm: [-40, -40, -20], rFore: [-110], lArm: [-60, 20, 0], lFore: [-100], chest: [0, -35, 0], hipY: -0.08 }),
               pose({ rArm: [-90, 15, 0], rFore: [-5], lArm: [-40, 0, 20], lFore: [-90], chest: [10, 30, 0], lThigh: [-30], rThigh: [20], hipY: -0.12, hipZ: 0.18 })],
    Attack02: [pose({ lArm: [-40, 40, 20], lFore: [-110], rArm: [-60, -20, 0], rFore: [-100], chest: [0, 35, 0], hipY: -0.08 }),
               pose({ lArm: [-90, -15, 0], lFore: [-5], rArm: [-40, 0, -20], rFore: [-90], chest: [10, -30, 0], rThigh: [-30], lThigh: [20], hipY: -0.12, hipZ: 0.18 })],
    Attack03: [pose({ rArm: [10, 0, -10], rFore: [-90], chest: [10, -20, 0], lThigh: [-20], lShin: [50], hipY: -0.22 }),
               pose({ rArm: [-160, 0, 0], rFore: [-20], chest: [-15, 15, 0], lThigh: [-10], rThigh: [10], hipY: 0.05, hipZ: 0.1 })],
    HeavyAttack: [pose({ rArm: [-170, 0, -10], rFore: [-30], lArm: [-170, 0, 10], lFore: [-30], chest: [-20, 0, 0], hipY: 0.12 }),
                  pose({ rArm: [-40, 0, 0], rFore: [-10], lArm: [-40, 0, 0], lFore: [-10], chest: [45, 0, 0], spine: [15], lThigh: [-55], lShin: [55], rThigh: [40], rShin: [40], hipY: -0.42, hipZ: 0.2 })]
  },
  common: {
    Dash: [pose({ chest: [38, 0, 0], spine: [12], head: [-15], rArm: [30, 0, -30], rFore: [-20], lArm: [30, 0, 30], lFore: [-20], lThigh: [-60], lShin: [70], rThigh: [30], rShin: [60], hipY: -0.22 }),
           pose({ chest: [30, 0, 0], spine: [10], head: [-10], rArm: [40, 0, -35], lArm: [40, 0, 35], lThigh: [-50], lShin: [60], rThigh: [25], rShin: [70], hipY: -0.18, hipZ: 0.1 })],
    SkillCast: [pose({ rArm: [-60, 40, 0], rFore: [-90], lArm: [-60, -40, 0], lFore: [-90], chest: [-6, 0, 0], head: [-6], hipY: -0.04 }),
                pose({ rArm: [-95, -25, 0], rFore: [-10], lArm: [-50, -30, 0], lFore: [-80], chest: [10, -20, 0], lThigh: [-25], lShin: [20], hipY: -0.08, hipZ: 0.08 })],
    UltimateCast: [pose({ rArm: [-55, 38, 0], rFore: [-95], lArm: [-55, -38, 0], lFore: [-95], chest: [-8, 0, 0], head: [-8], lThigh: [-12], lShin: [18], rThigh: [8], rShin: [15], hipY: -0.06 }),
                   pose({ rArm: [-58, 36, 0], rFore: [-92], lArm: [-58, -36, 0], lFore: [-92], chest: [-12, 0, 0], head: [-12], lThigh: [-12], lShin: [18], rThigh: [8], rShin: [15], hipY: -0.08 })],
    UltimatePoint: [pose({ rArm: [-120, -20, 0], rFore: [-40], lArm: [-40, 0, 30], lFore: [-60], chest: [-10, -25, 0], hipY: -0.02 }),
                    pose({ rArm: [-96, 18, 0], rFore: [-2], lArm: [-25, 0, 30], lFore: [-70], chest: [6, 20, 0], lThigh: [-30], lShin: [25], rThigh: [15], hipY: -0.1, hipZ: 0.12 })],
    UltimateRaise: [pose({ rArm: [-100, 0, 0], rFore: [-40], lArm: [-30, 0, 30], chest: [-5, 0, 0] }),
                    pose({ rArm: [-172, 0, 0], rFore: [-4], lArm: [-30, 0, 40], lFore: [-30], chest: [-14, 0, 0], head: [-18], hipY: 0.02 })],
    Hit: [pose({ chest: [-22, 0, 0], head: [-15], rArm: [20, 0, -30], lArm: [20, 0, 30], hipY: -0.05, hipZ: -0.08 }),
          pose({ chest: [-14, 0, 0], head: [-8], rArm: [10, 0, -20], lArm: [10, 0, 20], hipY: -0.03 })],
    Knockback: [pose({ chest: [-35, 0, 0], spine: [-10], head: [-20], rArm: [40, 0, -50], lArm: [40, 0, 50], lThigh: [-40], lShin: [50], rThigh: [-20], rShin: [30], hipY: -0.1, pitch: -12 }),
                pose({ chest: [10, 0, 0], head: [5], rArm: [-20, 0, -30], lArm: [-20, 0, 30], lThigh: [-35], lShin: [60], rThigh: [10], rShin: [70], hipY: -0.3 })],
    Stun: [pose({ chest: [12, 0, 10], head: [20, 0, 15], rArm: [5, 0, -12], rFore: [-10], lArm: [5, 0, 12], lFore: [-10], lShin: [15], rShin: [15], hipY: -0.08 }),
           pose({ chest: [12, 0, -10], head: [20, 0, -15], rArm: [5, 0, -12], rFore: [-10], lArm: [5, 0, 12], lFore: [-10], lShin: [15], rShin: [15], hipY: -0.08 })],
    Death: [pose({ chest: [-20, 0, 0], head: [-25], rArm: [-30, 0, -70], lArm: [-30, 0, 70], hipY: -0.05, pitch: -20 }),
            pose({ chest: [-8, 0, 0], head: [-15], rArm: [-10, 0, -80], lArm: [-10, 0, 80], lThigh: [-15], rThigh: [10], hipY: -0.12, pitch: -84 })],
    Victory: [pose({ rArm: [-120, 0, 0], rFore: [-60], lArm: [-30, 0, 30], chest: [-5, 0, 0] }),
              pose({ rArm: [-172, -8, 0], rFore: [-6], lArm: [-20, 0, 40], lFore: [-40], chest: [-12, 10, 0], head: [-14], hipY: 0.03 })],
    Parry: [pose({ rArm: [-80, 40, 0], rFore: [-60], chest: [0, 20, 0] }), pose({ rArm: [-120, -30, 0], rFore: [-20], chest: [-5, -20, 0] })]
  }
};
ACT.bow = ACT.staff;   // cung: dùng tư thế phóng về phía trước của pháp trượng

/** Dựng geometry kiếm (lưỡi thuôn nhọn + chắn + chuôi) – dùng cho tay cầm, phi kiếm, cự kiếm. */
function buildSwordGeometry(bladeLen = 0.9, width = 0.06) {
  const parts = [];
  // Lưỡi: lăng trụ thoi thuôn tới mũi.
  const b = new THREE.BufferGeometry();
  const h = bladeLen, w = width / 2, t = width * 0.18;
  const v = [ // đáy (4 điểm) ở y=0.12, mũi ở y=0.12+h
    -w, 0.12, 0, 0, 0.12, t, w, 0.12, 0, 0, 0.12, -t,
    -w * 0.85, 0.12 + h * 0.85, 0, 0, 0.12 + h * 0.85, t * 0.8, w * 0.85, 0.12 + h * 0.85, 0, 0, 0.12 + h * 0.85, -t * 0.8,
    0, 0.12 + h, 0];
  const idx = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 8, 5, 6, 8, 6, 7, 8, 7, 4, 8, 0, 3, 2, 0, 2, 1];
  b.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); b.setIndex(idx);
  parts.push(b.toNonIndexed());
  const guard = new THREE.BoxGeometry(width * 3, 0.035, width * 0.9); guard.translate(0, 0.1, 0); parts.push(guard.toNonIndexed());
  const grip = new THREE.CylinderGeometry(0.016, 0.018, 0.17, 6); grip.translate(0, 0.0, 0); parts.push(grip.toNonIndexed());
  const pommel = new THREE.OctahedronGeometry(0.03); pommel.translate(0, -0.1, 0); parts.push(pommel.index ? pommel.toNonIndexed() : pommel);
  return mergeGeometries(parts);
}
function mergeGeometries(list) {
  let n = 0; list.forEach(g => (n += g.attributes.position.count));
  const pos = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.computeVertexNormals();
  return out;
}
const SWORD_GEO = buildSwordGeometry(0.9, 0.06);

/** Chuỗi Verlet cho tóc / dải lụa. */
class VerletChain {
  constructor(n, seg) { this.n = n; this.seg = seg; this.p = []; this.o = []; for (let i = 0; i < n; i++) { this.p.push(new V3()); this.o.push(new V3()); } this.init = false; }
  update(anchor, dt, gravity, wind, push) {
    if (!this.init) { for (let i = 0; i < this.n; i++) { this.p[i].set(anchor.x, anchor.y - i * this.seg, anchor.z); this.o[i].copy(this.p[i]); } this.init = true; }
    const d2 = dt * dt;
    for (let i = 1; i < this.n; i++) {
      const p = this.p[i], o = this.o[i];
      const vx = (p.x - o.x) * 0.94, vy = (p.y - o.y) * 0.94, vz = (p.z - o.z) * 0.94;
      o.copy(p);
      p.x += vx + (wind.x + push.x) * d2; p.y += vy - gravity * d2 + push.y * d2; p.z += vz + (wind.z + push.z) * d2;
    }
    this.p[0].copy(anchor); this.o[0].copy(anchor);
    for (let it = 0; it < 3; it++) for (let i = 1; i < this.n; i++) {
      const a = this.p[i - 1], b = this.p[i];
      _v1.subVectors(b, a); const len = _v1.length() || 1e-4; _v1.multiplyScalar((len - this.seg) / len);
      b.sub(_v1);
    }
  }
  reset() { this.init = false; }
}

/** Geometry dùng chung cho mọi nhân vật thủ tục (cùng tham số → cùng 1 geometry trên GPU); không bị dispose theo từng rig. */
const RIG_GEO = new Map();
function sharedGeo(key, make) {
  let g = RIG_GEO.get(key);
  if (!g) { g = make(); g.userData.shared = true; RIG_GEO.set(key, g); }
  return g;
}
class CharacterRig {
  constructor(look, U) {
    this.look = look; this.U = U; this.weaponType = look.weapon;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);
    this.j = {}; this.meshes = []; this.outlines = []; this.sockets = {}; this.materials = [];
    this.locoPhase = 0; this.speed = 0; this.time = Math.random() * 10;
    this.action = null; this.holds = {}; this.holdW = {};
    this.poseLoco = new Float32Array(PL); this.poseOut = new Float32Array(PL); this.tmpA = new Float32Array(PL); this.tmpB = new Float32Array(PL);
    this.hitVel = new THREE.Vector2(); this.hitOff = new THREE.Vector2();
    this.lookTarget = null; this.headYaw = 0;
    this.prevPos = new V3(); this.vel = new V3(); this.yawVel = 0; this.prevYaw = 0;
    this.trailOn = false; this.trail = []; this.trailMax = 14;
    this.build();
  }
  mat(color, opts) { const m = ShaderLibrary.toon(color, this.U, opts); this.materials.push(m); return m; }
  part(geo, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, outline = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true;
    parent.add(m); this.meshes.push(m);
    if (outline) {
      const o = new THREE.Mesh(geo, ShaderLibrary.linkOutline(ShaderLibrary.outline(this.U, 0.016 / Math.max(sx, sy, sz)), this.U));
      o.position.copy(m.position); o.scale.copy(m.scale); o.rotation.copy(m.rotation); parent.add(o); this.outlines.push(o); m.userData.outline = o;
    }
    return m;
  }
  group(name, parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); g.rotation.order = 'YXZ'; parent.add(g); this.j[name] = g; return g; }
  build() {
    const L = this.look, s = L.bulk || 1;
    const robe = this.mat(L.robe), trim = this.mat(L.trim), skin = this.mat(L.skin), hair = this.mat(L.hair), inner = this.mat(L.inner || L.trim), dark = this.mat(0x1a1c22);
    const sph = sharedGeo('sph', () => new THREE.SphereGeometry(1, 16, 12)), cyl = sharedGeo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 12)), box = sharedGeo('box', () => new THREE.BoxGeometry(1, 1, 1));
    this.geos = [];
    const hips = this.group('hips', this.body, 0, 0.95, 0);
    this.part(cyl, robe, hips, 0, -0.02, 0, 0.17 * s, 0.16, 0.13 * s);
    this.part(cyl, trim, hips, 0, 0.07, 0, 0.175 * s, 0.05, 0.135 * s, false);
    // Váy áo bào: 8 tấm có lò xo (secondary motion).
    this.skirt = [];
    const panelGeo = box;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, piv = new THREE.Group();
      piv.position.set(Math.sin(a) * 0.15 * s, -0.02, Math.cos(a) * 0.12 * s); piv.rotation.y = a; hips.add(piv);
      const flare = new THREE.Group(); piv.add(flare);
      this.part(panelGeo, i % 2 ? robe : inner, flare, 0, -0.27, 0, 0.13 * s, 0.52, 0.025, false);
      this.part(panelGeo, trim, flare, 0, -0.53, 0, 0.13 * s, 0.03, 0.03, false);
      this.skirt.push({ a, flare, ang: 0.12, vel: 0, out: new V3(Math.sin(a), 0, Math.cos(a)) });
    }
    const spine = this.group('spine', hips, 0, 0.08, 0);
    this.part(cyl, robe, spine, 0, 0.17, 0, 0.17 * s, 0.34, 0.13 * s);
    const chest = this.group('chest', spine, 0, 0.3, 0);
    this.part(sph, robe, chest, 0, 0.05, 0, 0.23 * s, 0.18, 0.16 * s);
    this.part(box, trim, chest, 0, 0.1, 0.12 * s, 0.06, 0.2, 0.03, false); // vạt áo chéo
    this.part(cyl, inner, chest, 0, 0.19, 0, 0.07, 0.08, 0.07, false);
    const head = this.group('head', chest, 0, 0.27, 0);
    this.part(sph, skin, head, 0, 0.1, 0, 0.12, 0.135, 0.125);
    this.part(sph, hair, head, 0, 0.14, -0.018, 0.13, 0.13, 0.13);
    this.part(box, hair, head, 0, 0.17, 0.085, 0.2, 0.06, 0.06, false); // mái tóc
    this.part(sph, dark, head, -0.045, 0.1, 0.112, 0.02, 0.028, 0.012, false);
    this.part(sph, dark, head, 0.045, 0.1, 0.112, 0.02, 0.028, 0.012, false);
    if (L.crown) this.part(cyl, this.mat(L.accent), head, 0, 0.28, -0.02, 0.035, 0.05, 0.035, false);
    else this.part(sph, hair, head, 0, 0.27, -0.05, 0.06, 0.055, 0.06, false);
    this.part(box, this.mat(L.accent), head, 0, 0.29, -0.05, 0.16, 0.012, 0.012, false); // trâm cài
    if (L.mask) this.part(box, this.mat(L.mask), head, 0, 0.05, 0.115, 0.17, 0.06, 0.03, false);
    this.sockets.head = head; this.sockets.chest = chest;
    this.hairAnchor = new THREE.Object3D(); this.hairAnchor.position.set(0, 0.24, -0.1); head.add(this.hairAnchor);
    this.hair = new VerletChain(L.hairLen || 7, 0.085);
    this.sashAnchors = [-0.06, 0.06].map(x => { const o = new THREE.Object3D(); o.position.set(x, 0.06, -0.13 * s); hips.add(o); return o; });
    this.sashes = [new VerletChain(6, 0.09), new VerletChain(6, 0.09)];
    const arm = (side) => {
      const pre = side > 0 ? 'l' : 'r';
      const sh = this.group(pre + 'Arm', chest, 0.22 * side * s, 0.13, 0);
      sh.rotation.z = 0.1 * side;
      const sleeveG = sharedGeo('sleeve', () => new THREE.CylinderGeometry(0.06, 0.085, 1, 10));
      this.part(sleeveG, robe, sh, 0, -0.14, 0, s, 0.28, s);
      const fore = this.group(pre + 'Fore', sh, 0, -0.28, 0);
      const cuffG = sharedGeo('cuff', () => new THREE.CylinderGeometry(0.075, 0.1, 1, 10));
      this.part(cuffG, robe, fore, 0, -0.11, 0, s, 0.22, s);
      this.part(cyl, trim, fore, 0, -0.225, 0, 0.1 * s, 0.025, 0.1 * s, false);
      this.part(sph, skin, fore, 0, -0.27, 0, 0.045 * s, 0.05, 0.045 * s);
      const hand = new THREE.Group(); hand.position.set(0, -0.27, 0.01); fore.add(hand);
      this.sockets[pre === 'l' ? 'handL' : 'handR'] = hand;
    };
    arm(1); arm(-1);
    const leg = (side) => {
      const pre = side > 0 ? 'l' : 'r';
      const th = this.group(pre + 'Thigh', hips, 0.09 * side * s, -0.04, 0);
      this.part(cyl, inner, th, 0, -0.22, 0, 0.075 * s, 0.44, 0.075 * s);
      const sh = this.group(pre + 'Shin', th, 0, -0.44, 0);
      this.part(cyl, inner, sh, 0, -0.2, 0, 0.065 * s, 0.4, 0.065 * s);
      this.feet[pre] = this.part(box, dark, sh, 0, -0.43, 0.04, 0.09 * s, 0.07, 0.22, false);
    };
    this.feet = {};
    leg(1); leg(-1);
    this.buildWeapon();
    // Bóng tròn dưới chân (luôn có, nhẹ hơn shadow map).
    const blob = new THREE.Mesh(sharedGeo('blob' + s.toFixed(2), () => new THREE.PlaneGeometry(1.4 * s, 1.4 * s).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: vfx.blobTex, transparent: true, depthWrite: false }));
    blob.position.y = 0.085; blob.renderOrder = 0; this.root.add(blob); this.blob = blob;
    this.setOutline(Q().outline);
  }
  buildWeapon() {
    const L = this.look, hand = this.sockets.handR, w = new THREE.Group();
    this.weapon = w; this.tip = new THREE.Object3D(); this.base = new THREE.Object3D();
    if (L.weapon === 'sword' || L.weapon === 'blade') {
      const blade = this.part(SWORD_GEO, this.mat(L.weapon === 'blade' ? 0x5a1418 : 0xd8e6f2, { emissive: new THREE.Color(L.weapon === 'blade' ? 0x501010 : 0x203040) }), w, 0, 0, 0, 1, 1, 1);
      blade.castShadow = true;
      this.base.position.set(0, 0.2, 0); this.tip.position.set(0, 1.02, 0);
      w.rotation.set(Math.PI * 0.88, 0, 0);
    } else if (L.weapon === 'spear') {
      const shaft = sharedGeo('spearShaft', () => new THREE.CylinderGeometry(0.02, 0.022, 2.0, 8));
      this.part(shaft, this.mat(0x4a3220), w, 0, 0.4, 0, 1, 1, 1);
      const head = sharedGeo('spearHead', () => new THREE.ConeGeometry(0.05, 0.32, 6));
      this.part(head, this.mat(0xd8e6f2), w, 0, 1.55, 0, 1, 1, 1);
      this.part(sharedGeo('spearTassel', () => new THREE.SphereGeometry(0.06, 8, 6)), this.mat(L.trim), w, 0, 1.35, 0, 1, 1.3, 1, false);
      this.base.position.set(0, 0.9, 0); this.tip.position.set(0, 1.7, 0);
      w.rotation.set(Math.PI * 0.92, 0, 0);
    } else if (L.weapon === 'staff') {
      const shaft = sharedGeo('staffShaft', () => new THREE.CylinderGeometry(0.022, 0.025, 1.7, 8));
      this.part(shaft, this.mat(0x3b2a1e), w, 0, 0.1, 0, 1, 1, 1);
      const orbMat = ShaderLibrary.glow(L.orb || 0x9fd0ff, 0.85);
      const orb = new THREE.Mesh(sharedGeo('staffOrb', () => new THREE.IcosahedronGeometry(0.09, 1)), orbMat); orb.position.y = 1.02; w.add(orb); this.orb = orb;
      this.part(sharedGeo('staffRing', () => new THREE.TorusGeometry(0.11, 0.012, 6, 16)), this.mat(L.accent), w, 0, 1.02, 0, 1, 1, 1, false);
      this.base.position.set(0, 0.8, 0); this.tip.position.set(0, 1.02, 0);
      w.rotation.set(0.12, 0, 0);
    } else if (L.weapon === 'bow') { // cung: cánh cung (nửa vòng xuyến) + dây cung
      // Nửa vòng xuyến bán kính 0,5 xoay 90° → cánh cung đứng, hai đầu ở x = 0,5; tay cầm (giữa cánh cung) nằm tại gốc tay.
      const limb = this.part(sharedGeo('bowLimb', () => new THREE.TorusGeometry(0.5, 0.022, 6, 18, Math.PI)), this.mat(0x6a4a2a), w, 0.5, 0, 0, 1, 1, 1);
      limb.rotation.z = Math.PI / 2; if (limb.userData.outline) limb.userData.outline.rotation.z = Math.PI / 2;
      this.part(sharedGeo('bowString', () => new THREE.CylinderGeometry(0.004, 0.004, 1.0, 4)), this.mat(0xf0e8d0), w, 0.5, 0, 0, 1, 1, 1, false);
      this.part(sharedGeo('bowGrip', () => new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8)), this.mat(L.accent), w, 0, 0, 0, 1, 1, 1, false);
      this.base.position.set(0, 0, 0); this.tip.position.set(0.1, 0, 0.15);
      w.rotation.set(0, Math.PI / 2, 0.15);
    } else { // claws – găng vuốt
      const claw = sharedGeo('claw', () => new THREE.ConeGeometry(0.02, 0.14, 4));
      for (let i = -1; i <= 1; i++) { const c = this.part(claw, this.mat(0xd0c8c0), w, i * 0.03, -0.08, 0.02, 1, 1, 1, false); c.rotation.x = Math.PI; }
      this.base.position.set(0, 0, 0); this.tip.position.set(0, -0.15, 0);
    }
    w.add(this.tip, this.base); hand.add(w);
    this.sockets.weaponTip = this.tip; this.sockets.weaponBase = this.base;
  }
  setOutline(on) { this.outlines.forEach(o => (o.visible = on)); }
  setShadows(on) { this.meshes.forEach(m => (m.castShadow = on)); }
  getSocket(name) { return this.sockets[name] || this.root; }
  setLookTarget(v) { this.lookTarget = v; }

  /** Locomotion: speed (m/s) thật của nhân vật – bước chân khớp quãng đường để không trượt. */
  setLoco(speed) { this.speed = speed; }

  /** Phát động tác: timing = {dur, windup, active} (giây). Windup = chuẩn bị, active = tới tư thế va chạm. */
  playAction(name, timing) {
    const set = (ACT[this.weaponType] && ACT[this.weaponType][name]) || ACT.common[name] || (ACT.sword[name]);
    if (!set) return;
    this.action = { name, A: set[0], B: set[1], t: 0, dur: timing.dur, ws: timing.windup, ae: timing.active, hold: timing.hold || 0.08 };
  }
  stopAction() { this.action = null; }
  hold(name, on) { this.holds[name] = on; if (!(name in this.holdW)) this.holdW[name] = 0; }
  hitReact(dirLocalX, dirLocalZ, strength) { this.hitVel.x += dirLocalX * strength * 9; this.hitVel.y += dirLocalZ * strength * 9; }
  setTrail(on) { if (on && !this.trailOn) this.trail.length = 0; this.trailOn = on; }

  locomotionPose(out, dt) {
    const sp = this.speed, k = clamp(sp / 4.5, 0, 1), m = clamp(sp / 0.6, 0, 1);
    this.locoPhase += sp * dt / 0.95 * Math.PI;
    const ph = this.locoPhase, sn = Math.sin(ph);
    const swing = lerp(26, 48, k) * m, knee = lerp(30, 85, k) * m;
    const t = this.time, br = Math.sin(t * 2.1) * (1 - m);
    const ready = this.weaponType === 'staff' ? [-15, 0, -8] : this.weaponType === 'spear' ? [-35, 10, -10] : [-22, 0, -10];
    out.fill(0);
    const set = (n, x, y = 0, z = 0) => { const i = JI[n] * 3; out[i] = x * DEG; out[i + 1] = y * DEG; out[i + 2] = z * DEG; };
    set('lThigh', -swing * sn - 4 * (1 - m)); set('rThigh', swing * sn - 4 * (1 - m));
    set('lShin', Math.max(0, Math.sin(ph + 1.3)) * knee + 6 * (1 - m)); set('rShin', Math.max(0, Math.sin(ph + 1.3 + Math.PI)) * knee + 6 * (1 - m));
    set('lArm', swing * 0.8 * sn + br * 2, 0, 8 + 4 * (1 - m)); set('lFore', -lerp(15, 70, k) - 8);
    set('rArm', lerp(ready[0], -swing * 0.8 * sn, m), ready[1] * (1 - m), ready[2]); set('rFore', -lerp(35, 70, k));
    set('chest', 3 + 14 * k + br * 2, sn * 8 * k, 0); set('spine', 3 * k, -sn * 4 * k); set('head', -8 * k - br, -sn * 4 * k);
    out[R_HY] = -Math.abs(Math.cos(ph)) * 0.05 * k - 0.03 * k + br * 0.004;
  }
  update(dt, worldPos, yaw) {
    this.time += dt;
    // Vận tốc thật để lái chuyển động phụ.
    if (dt > 0) { this.vel.subVectors(worldPos, this.prevPos).divideScalar(dt); this.yawVel = angDiff(this.prevYaw, yaw) / dt; }
    this.prevPos.copy(worldPos); this.prevYaw = yaw;
    this.locomotionPose(this.poseLoco, dt);
    const out = this.poseOut; out.set(this.poseLoco);

    // Lớp động tác: Anticipation → Strike (nhanh) → Impact hold → Recovery (blend về locomotion).
    const a = this.action;
    if (a) {
      a.t += dt;
      const t = a.t;
      let cur;
      if (t < a.ws) cur = lerpPose(this.tmpA, this.poseLoco, a.A, easeInOut(t / Math.max(0.01, a.ws)));
      else if (t < a.ae) cur = lerpPose(this.tmpA, a.A, a.B, easeOutExpo((t - a.ws) / Math.max(0.01, a.ae - a.ws)));
      else cur = this.tmpA.set(a.B), cur = this.tmpA;
      const rec = Math.max(0.05, a.dur - a.ae - a.hold);
      const w = t < a.ae + a.hold ? 1 : 1 - easeInOut(clamp((t - a.ae - a.hold) / rec, 0, 1));
      // Không nội suy yaw quay vòng về 0 qua 360 độ: giữ yaw tuyệt đối khi đã xoay hết vòng.
      lerpPose(out, this.poseLoco, cur, w);
      if (a.B[R_YAW] >= TAU - 0.01 && t >= a.ae) out[R_YAW] = 0;
      if (t >= a.dur) this.action = null;
    }
    // Lớp giữ (Stun, Death, Victory, UltimateCast…).
    for (const name in this.holds) {
      const target = this.holds[name] ? 1 : 0;
      this.holdW[name] = damp(this.holdW[name], target, name === 'Death' ? 3.2 : 9, dt);
      const w = this.holdW[name];
      if (w < 0.001) continue;
      const set = ACT.common[name] || (ACT[this.weaponType] && ACT[this.weaponType][name]);
      if (!set) continue;
      const osc = name === 'Stun' ? 0.5 + 0.5 * Math.sin(this.time * 4) : name === 'UltimateCast' ? 0.5 + 0.5 * Math.sin(this.time * 6) : 1;
      lerpPose(this.tmpB, set[0], set[1], name === 'Death' ? easeOut(w) : osc);
      lerpPose(out, out, this.tmpB, name === 'Death' ? Math.min(1, w * 1.6) : w);
    }
    // Phản ứng trúng đòn theo hướng (lò xo tắt dần – follow-through).
    // Bước con ≤ 1/120 s: lò xo luôn ổn định kể cả khi FPS thấp.
    for (let rem = dt; rem > 1e-6; rem -= 1 / 120) {
      const h = Math.min(rem, 1 / 120);
      this.hitVel.x += (-this.hitOff.x * 160 - this.hitVel.x * 14) * h; this.hitVel.y += (-this.hitOff.y * 160 - this.hitVel.y * 14) * h;
      this.hitOff.x += this.hitVel.x * h; this.hitOff.y += this.hitVel.y * h;
    }
    this.hitOff.x = clamp(this.hitOff.x, -0.6, 0.6); this.hitOff.y = clamp(this.hitOff.y, -0.6, 0.6);
    out[JI.chest * 3] += this.hitOff.y * 0.9; out[JI.chest * 3 + 2] += -this.hitOff.x * 0.9; out[JI.head * 3] += this.hitOff.y * 0.6;
    out[R_HZ] += this.hitOff.y * 0.12;

    // IK hướng nhìn: quay đầu về mục tiêu (giới hạn ±70°).
    let wantHead = 0;
    if (this.lookTarget) {
      const dx = this.lookTarget.x - worldPos.x, dz = this.lookTarget.z - worldPos.z;
      wantHead = clamp(angDiff(yaw, Math.atan2(dx, dz)), -70 * DEG, 70 * DEG);
    }
    this.headYaw = damp(this.headYaw, wantHead, 8, dt);

    // Áp tư thế.
    for (let i = 0; i < JOINTS.length; i++) {
      const g = this.j[JOINTS[i]]; if (!g) continue;
      const x = out[i * 3], y = out[i * 3 + 1], z = out[i * 3 + 2];
      const bz = JOINTS[i] === 'lArm' ? 0.1 : JOINTS[i] === 'rArm' ? -0.1 : 0;
      g.rotation.set(x, y, z + bz);
    }
    this.j.head.rotation.y += this.headYaw * 0.7; this.j.chest.rotation.y += this.headYaw * 0.3;
    this.j.hips.position.set(0, 0.95 + out[R_HY], out[R_HZ]);
    this.body.rotation.set(out[R_PITCH], out[R_YAW], 0);
    this.root.position.copy(worldPos); this.root.rotation.y = yaw;
    this.blob.visible = (this.holdW.Death || 0) < 0.9;
    this.solveFootIK(dt, out, worldPos);

    this.root.updateMatrixWorld(true);
    this.updateSecondary(dt, yaw);
    this.updateTrail();
    if (this.orb) this.orb.scale.setScalar(1 + Math.sin(this.time * 6) * 0.12);
  }
  /**
   * IK chân 2 khớp (giải tích, luật cos) trong mặt phẳng dọc của chân:
   * khi tư thế hạ hông làm cổ chân xuyên xuống đất, tính lại góc đùi / gối để cổ chân nằm đúng
   * trên mặt đất (giữ nguyên vị trí trước–sau), gối gập tự nhiên, bàn chân xoay phẳng.
   * Tắt khi thân người ngã (chết / bị hất văng mạnh).
   */
  solveFootIK(dt, out, worldPos) {
    const want = options.footIK && Math.abs(out[R_PITCH]) < 0.25 && (this.holdW.Death || 0) < 0.05 ? 1 : 0;
    this.ikW = damp(this.ikW || 0, want, 12, dt || 1);
    if (this.ikW < 0.01) { for (const k in this.feet) this.feet[k].rotation.x = 0; return; }
    const L1 = 0.44, L2 = 0.43, ankleMin = 0.05;
    const ground = groundHeight(worldPos.x, worldPos.z) - worldPos.y;
    const hipY = this.j.hips.position.y - 0.04 - ground;   // độ cao khớp háng so với mặt đất
    for (const side of ['l', 'r']) {
      const th = this.j[side + 'Thigh'], sh = this.j[side + 'Shin'], foot = this.feet[side];
      const a = th.rotation.x, b = sh.rotation.x;
      const z = -L1 * Math.sin(a) - L2 * Math.sin(a + b);   // FK: cổ chân so với háng (z trước, y lên)
      const y = -L1 * Math.cos(a) - L2 * Math.cos(a + b);
      let na = a, nb = b;
      if (hipY + y < ankleMin) {
        let dz = z, dy = hipY - ankleMin;                     // dy: khoảng cách xuống từ háng tới mục tiêu
        let d = Math.hypot(dz, dy);
        const maxD = L1 + L2 - 1e-3;
        if (d > maxD) { dz *= maxD / d; dy *= maxD / d; d = maxD; }
        d = Math.max(d, 0.05);
        const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
        const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
        na = Math.atan2(-dz, dy) - alpha; nb = knee;
      }
      th.rotation.x = lerp(a, na, this.ikW); sh.rotation.x = lerp(b, nb, this.ikW);
      // Bàn chân phẳng với mặt đất khi đang chạm đất.
      const footH = hipY - L1 * Math.cos(th.rotation.x) - L2 * Math.cos(th.rotation.x + sh.rotation.x);
      const planted = 1 - smooth(ankleMin + 0.02, ankleMin + 0.12, footH);
      foot.rotation.x = -(th.rotation.x + sh.rotation.x) * planted * this.ikW;
    }
  }
  updateSecondary(dt, yaw) {
    if (!this.hairColor) { this.hairColor = new THREE.Color(this.look.hair); this.trimColor = new THREE.Color(this.look.trim); }
    const hc = this.hairColor, tc = this.trimColor;
    if (dt <= 0) { this.pushHairJobs(hc, tc); return; }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
    // Váy: tấm phía sau hướng chạy bị gió hất lên, tấm trước bị đùi đẩy.
    const thighL = this.j.lThigh.rotation.x, thighR = this.j.rThigh.rotation.x;
    for (const p of this.skirt) {
      const ox = p.out.x * cosY + p.out.z * sinY, oz = -p.out.x * sinY + p.out.z * cosY;
      const drag = sp > 0.1 ? Math.max(0, -(ox * this.vel.x + oz * this.vel.z) / sp) : 0;
      const legPush = p.out.z > 0.3 ? Math.max(0, -(p.out.x > 0 ? thighL : thighR)) * 0.55 : 0;
      const spin = Math.abs(this.yawVel) * 0.04;
      const target = 0.1 + drag * Math.min(sp, 9) * 0.075 + legPush + spin + Math.sin(this.time * 3 + p.a * 2) * 0.02;
      for (let rem = dt; rem > 1e-6; rem -= 1 / 120) { const h = Math.min(rem, 1 / 120); p.vel += ((target - p.ang) * 120 - p.vel * 11) * h; p.ang += p.vel * h; }
      p.ang = clamp(p.ang, -0.1, 1.2);
      p.flare.rotation.x = -p.ang;
    }
    // Tóc & dải lụa: Verlet trong không gian thế giới.
    const wind = _v2.set(Math.sin(this.time * 0.7) * 1.5, 0, Math.cos(this.time * 0.5) * 1.5);
    const push = _v3.set(-this.vel.x * 3, Math.min(0, -this.vel.y) * 2, -this.vel.z * 3);
    this.hairAnchor.getWorldPosition(_v1);
    const vdt = Math.min(dt, 1 / 30);
    this.hair.update(_v1, vdt, 9, wind, push);
    this.sashAnchors.forEach((o, i) => { o.getWorldPosition(_v1); this.sashes[i].update(_v1, vdt, 9, wind, push); });
    this.pushHairJobs(hc, tc);
  }
  pushHairJobs(hc, tc) {
    if (!this.hair.init) return;
    vfx.hairJobs.push({ points: this.hair.p, n: this.hair.n, width: t => lerp(0.13, 0.03, t), color: (t, c) => { c.copy(hc); c.a = 1; } });
    this.sashes.forEach(s => vfx.hairJobs.push({ points: s.p, n: s.n, width: t => lerp(0.06, 0.035, t), color: (t, c) => { c.copy(tc); c.a = 1; } }));
  }
  updateTrail() {
    if (!this.trailOn && this.trail.length === 0) return;
    const max = Q().trail;
    if (this.trailOn) {
      const tip = this.tip.getWorldPosition(new V3());
      this.trail.unshift(tip);
    } else this.trail.pop();
    while (this.trail.length > max) this.trail.pop();
    if (this.trail.length > 1) {
      const col = this.look.trailColor;
      vfx.trailJobs.push({ points: this.trail, n: this.trail.length, width: t => lerp(0.42, 0.02, t), color: (t, c) => { c.copy(col); c.a = (1 - t) * 0.9; } });
    }
  }
  dispose() {
    // Giải phóng mọi geometry riêng của rig (kể cả loại tạo ngay trong dòng như ngọc trượng), trừ geometry dùng chung toàn cục.
    const geos = new Set(this.geos);
    this.root.traverse(o => {
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose && m.dispose()); }
      if (o.geometry && o.geometry !== SWORD_GEO && !o.geometry.userData.shared) geos.add(o.geometry);
    });
    geos.forEach(g => { if (!g.userData.shared) g.dispose(); });
    if (this.root.parent) this.root.parent.remove(this.root);
  }
}
