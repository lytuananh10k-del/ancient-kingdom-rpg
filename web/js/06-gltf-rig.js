// Vạn Kiếm Kỳ Trận – GLTFRig – mô hình GLB/GLTF có xương, IK chân GLB (mục 8)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  8. GLTFRig – thay mô hình bằng GLB/GLTF có xương mà không đổi logic
 * ===================================================================*/
const CLIP_PATTERNS = {
  Idle: /idle|stand/i, Walk: /walk/i, Run: /run|jog/i, Dash: /dash|roll|dodge/i,
  Attack01: /attack.?0?1|slash.?1/i, Attack02: /attack.?0?2|slash.?2/i, Attack03: /attack.?0?3|slash.?3/i,
  HeavyAttack: /heavy|strong|power/i, SkillCast: /skill|cast|spell/i, UltimateCast: /ult|ultimate|special/i,
  Hit: /hit|hurt|damage/i, Stun: /stun|dizzy/i, Knockback: /knock|fall.?back/i, Death: /death|die|dead/i, Victory: /victory|win|cheer|dance/i
};
/* ---- IK chân 2 khớp cho xương bất kỳ (không gian thế giới), theo Daniel Holden ---- */
const _ikA = new V3(), _ikB = new V3(), _ikC = new V3(), _ikT1 = new V3(), _ikT2 = new V3(), _ikAx = new V3();
const _ikQ = new THREE.Quaternion(), _ikP = new THREE.Quaternion(), _ikPi = new THREE.Quaternion();
/** Xoay xương quanh trục thế giới (giữ vị trí khớp). */
function rotateBoneWorld(bone, axis, angle) {
  if (!isFinite(angle) || Math.abs(angle) < 1e-6) return;
  _ikQ.setFromAxisAngle(axis, angle);
  bone.parent.getWorldQuaternion(_ikP); _ikPi.copy(_ikP).invert();
  bone.quaternion.premultiply(_ikPi.multiply(_ikQ).multiply(_ikP));
  bone.updateMatrixWorld(true);
}
function setBoneWorldQuaternion(bone, q) {
  bone.parent.getWorldQuaternion(_ikP);
  bone.quaternion.copy(_ikP.invert().multiply(q));
  bone.updateMatrixWorld(true);
}
/**
 * Two-bone IK: đặt điểm cuối c (cổ chân) của chuỗi a→b→c tới target, giữ hướng gập theo poleHint
 * (hướng mặt nhân vật – gối gập về phía trước). Độ dài xương lấy từ tư thế hiện tại nên chạy với mọi rig.
 */
function solveTwoBoneIK(boneA, boneB, boneC, target, poleHint) {
  const a = boneA.getWorldPosition(_ikA), b = boneB.getWorldPosition(_ikB), c = boneC.getWorldPosition(_ikC);
  const lab = a.distanceTo(b), lcb = b.distanceTo(c);
  if (lab < 1e-4 || lcb < 1e-4) return false;
  const lat = clamp(a.distanceTo(target), 0.01, lab + lcb - 1e-3);
  const acab0 = Math.acos(clamp(_ikT1.subVectors(c, a).normalize().dot(_ikT2.subVectors(b, a).normalize()), -1, 1));
  const babc0 = Math.acos(clamp(_ikT1.subVectors(a, b).normalize().dot(_ikT2.subVectors(c, b).normalize()), -1, 1));
  const acab1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const babc1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  // Trục gập = mặt phẳng chân; cộng một chút hướng mặt để chân thẳng vẫn gập gối về phía trước.
  _ikT2.subVectors(b, a).addScaledVector(poleHint, 0.08 * lab);
  _ikAx.crossVectors(_ikT1.subVectors(c, a), _ikT2);
  if (_ikAx.lengthSq() < 1e-10) return false;
  _ikAx.normalize();
  const axis = _ikAx.clone();
  rotateBoneWorld(boneA, axis, acab1 - acab0);
  rotateBoneWorld(boneB, axis, babc1 - babc0);
  // Xoay cả chuỗi để cổ chân hướng đúng tới target.
  boneA.getWorldPosition(a); boneC.getWorldPosition(c);
  _ikT1.subVectors(c, a).normalize(); _ikT2.subVectors(target, a).normalize();
  const ang = Math.acos(clamp(_ikT1.dot(_ikT2), -1, 1));
  _ikAx.crossVectors(_ikT1, _ikT2);
  if (_ikAx.lengthSq() > 1e-10 && ang > 1e-5) rotateBoneWorld(boneA, _ikAx.normalize(), ang);
  return true;
}
/** Nhận diện bên trái / phải từ tên xương (Mixamo, Rigify, Unreal, VRM…). */
function boneSide(name) {
  const n = name.toLowerCase().replace(/mixamorig:?/, '');
  if (/left/.test(n) || /(^|[_.\s:-])l([_.\s:-]|$)/.test(n)) return 'l';
  if (/right/.test(n) || /(^|[_.\s:-])r([_.\s:-]|$)/.test(n)) return 'r';
  return null;
}

class GLTFRig {
  constructor(gltf, look) {
    this.look = look; this.weaponType = look.weapon;
    this.root = new THREE.Group(); this.sockets = {};
    // Nhân bản cả bộ xương để mỗi đơn vị có rig riêng (dùng chung geometry/material với bản gốc).
    const model = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene; this.model = model;
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const box = new THREE.Box3().setFromObject(model); const h = Math.max(0.01, box.max.y - box.min.y);
    const sc = 1.8 / h; model.scale.setScalar(sc); model.position.y = -box.min.y * sc;
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {}; this.found = [];
    const pick = (re, exclude) => gltf.animations.find(c => re.test(c.name) && !(exclude && exclude.test(c.name)));
    for (const name in CLIP_PATTERNS) {
      let clip = pick(CLIP_PATTERNS[name]);
      if (!clip && name === 'Attack01') clip = pick(/attack|slash/i, /0?[23]|heavy/i);
      if (clip) { this.clips[name] = this.stripRootMotion(clip.clone()); this.found.push(name + ' ← ' + clip.name); }
    }
    this.loco = {};
    ['Idle', 'Walk', 'Run'].forEach(n => { if (this.clips[n]) { const a = this.mixer.clipAction(this.clips[n]); a.play(); a.setEffectiveWeight(n === 'Idle' ? 1 : 0); this.loco[n] = a; } });
    this.oneShot = null; this.holdAct = {};
    let hand = null;
    model.traverse(o => { if (!hand && o.isBone && /right.?hand|hand.?r(?![a-z])|hand_r|mixamorig:?righthand/i.test(o.name)) hand = o; });
    this.sockets.handR = hand || this.root; this.sockets.weaponTip = new THREE.Object3D(); this.sockets.handR.add(this.sockets.weaponTip);
    this.sockets.head = this.root; this.sockets.chest = this.root;
    this.mixer.addEventListener('finished', e => { if (e.action === this.oneShot) { e.action.fadeOut(0.15); this.oneShot = null; } });
    this.speed = 0; this.ikW = 0; this.ikRestore = [];
    this.setupFootIK();
  }
  /** Tìm chuỗi Đùi → Cẳng chân → Bàn chân: lấy xương bàn chân rồi đi ngược lên 2 xương cha. */
  setupFootIK() {
    const bones = []; this.model.traverse(o => { if (o.isBone) bones.push(o); });
    this.legs = [];
    for (const sd of ['l', 'r']) {
      const foot = bones.find(b => /foot|ankle/i.test(b.name) && !/toe|ik|pole|target|ctrl|end|ball/i.test(b.name) && boneSide(b.name) === sd);
      const lower = foot && foot.parent, upper = lower && lower.parent;
      if (!foot || !lower || !lower.isBone || !upper || !upper.isBone) continue;
      this.legs.push({ side: sd, upper, lower, foot, rest: 0 });
    }
    // Độ cao cổ chân khi đứng (tư thế gốc) – dùng làm mức tối thiểu so với mặt đất.
    this.root.updateMatrixWorld(true);
    for (const L of this.legs) L.rest = clamp(L.foot.getWorldPosition(new V3()).y - this.root.position.y, 0.02, 0.25);
    this.found.push(this.legs.length === 2
      ? `IK chân: ${this.legs[0].upper.name} → ${this.legs[0].lower.name} → ${this.legs[0].foot.name} (và bên phải)`
      : 'IK chân: không tìm thấy đủ xương chân (cần tên có Foot/Ankle và Left/Right hoặc .L/.R)');
  }
  solveFootIK(dt, worldPos, yaw) {
    const want = options.footIK && this.legs.length && !this.holdAct.Death ? 1 : 0;
    this.ikW = damp(this.ikW, want, 12, dt || 1);
    if (this.ikW < 0.01) return;
    this.root.updateMatrixWorld(true);
    const ground = groundHeight(worldPos.x, worldPos.z);
    const pole = _v2.set(Math.sin(yaw), 0, Math.cos(yaw));
    const footQ = new THREE.Quaternion();
    for (const L of this.legs) {
      const c = L.foot.getWorldPosition(_v1);
      const minY = ground + L.rest;
      if (c.y >= minY) continue;                          // chỉ sửa khi cổ chân xuyên xuống đất
      const target = _v3.set(c.x, lerp(c.y, minY, this.ikW), c.z);
      for (const bn of [L.upper, L.lower, L.foot]) this.ikRestore.push({ bone: bn, q: bn.quaternion.clone() });
      L.foot.getWorldQuaternion(footQ);
      if (solveTwoBoneIK(L.upper, L.lower, L.foot, target, pole)) setBoneWorldQuaternion(L.foot, footQ); // bàn chân giữ hướng
    }
  }
  /** Root motion có kiểm soát: giữ chuyển động dọc, bỏ dịch chuyển ngang của xương gốc (logic tự di chuyển). */
  stripRootMotion(clip) {
    clip.tracks.forEach(tr => {
      if (/\.position$/.test(tr.name) && /hips|pelvis|root/i.test(tr.name)) {
        const v = tr.values; const x0 = v[0], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
      }
    });
    return clip;
  }
  setLoco(speed) { this.speed = speed; }
  playAction(name, timing) {
    const clip = this.clips[name] || (name.startsWith('Ultimate') ? this.clips.UltimateCast || this.clips.SkillCast : null) || (name.startsWith('Attack') || name === 'HeavyAttack' ? this.clips.Attack01 : null);
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.timeScale = clip.duration / Math.max(0.1, timing.dur);
    if (this.oneShot && this.oneShot !== a) this.oneShot.fadeOut(0.08);
    a.fadeIn(0.08).play(); this.oneShot = a;
  }
  stopAction() { if (this.oneShot) { this.oneShot.fadeOut(0.15); this.oneShot = null; } }
  hold(name, on) {
    const clip = this.clips[name]; if (!clip) return;
    const a = this.mixer.clipAction(clip);
    if (on && !this.holdAct[name]) { a.reset(); a.setLoop(name === 'Death' ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = true; a.fadeIn(0.15).play(); this.holdAct[name] = a; }
    if (!on && this.holdAct[name]) { this.holdAct[name].fadeOut(0.2); delete this.holdAct[name]; }
  }
  hitReact() { if (this.clips.Hit && !this.oneShot) this.playAction('Hit', { dur: 0.35, windup: 0.05, active: 0.1 }); }
  setLookTarget() {}
  setTrail() {}
  setOutline() {}
  setShadows(on) { this.model.traverse(o => { if (o.isMesh) o.castShadow = on; }); }
  getSocket(n) { return this.sockets[n] || this.root; }
  update(dt, worldPos, yaw) {
    const s = this.speed;
    const wIdle = 1 - smooth(0.1, 1.6, s), wRun = smooth(1.8, 4.5, s), wWalk = Math.max(0, 1 - wIdle - wRun);
    if (this.loco.Idle) this.loco.Idle.setEffectiveWeight(this.loco.Walk || this.loco.Run ? wIdle : 1);
    if (this.loco.Walk) this.loco.Walk.setEffectiveWeight(this.loco.Run ? wWalk : wWalk + wRun);
    if (this.loco.Run) this.loco.Run.setEffectiveWeight(this.loco.Walk ? wRun : wWalk + wRun);
    // Trả các xương đã bị IK chỉnh về giá trị trước IK, để xương không có track animation không bị cộng dồn.
    for (const r of this.ikRestore) r.bone.quaternion.copy(r.q);
    this.ikRestore.length = 0;
    this.mixer.update(dt);
    this.root.position.copy(worldPos); this.root.rotation.y = yaw;
    this.solveFootIK(dt, worldPos, yaw);
  }
  /** Bản nhân bản dùng chung geometry/material với gltf gốc: chỉ gỡ khỏi scene, tài nguyên do disposeGltf() giải phóng. */
  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    if (this.root.parent) this.root.parent.remove(this.root);
  }
}
