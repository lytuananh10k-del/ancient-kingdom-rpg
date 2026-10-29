// Vạn Kiếm Kỳ Trận – Phiêu Lưu: thi triển kỹ năng (người chơi + người chơi ảo) – combo cận chiến, đạn, kiếm khí, lướt chém, phi kiếm,
// mưa kiếm Vạn Kiếm Quy Tông, hỏa trận, hồi phục, thiên lôi, dậm đất, khiên, biến thân. VFX dùng lại VFXManager / ParticlePool.
// Script thường (không phải module): nạp sau js/rpg/combat.js.
'use strict';

/** Hiệu ứng kéo dài theo thời gian game (phi kiếm quanh thân, hỏa trận, biến thân…). update(dt) trả false khi xong. */
const GameFx = {
  list: [],
  add(fx) { this.list.push(fx); return fx; },
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { let ok = false; try { ok = this.list[i].update(dt) !== false; } catch (e) { console.error('[GameFx]', e); } if (!ok) { const f = this.list.splice(i, 1)[0]; if (f.end) try { f.end(); } catch (e) { /* bỏ qua */ } } } },
  clear(owner) { for (let i = this.list.length - 1; i >= 0; i--) if (!owner || this.list[i].owner === owner) { const f = this.list.splice(i, 1)[0]; if (f.end) try { f.end(); } catch (e) { /* bỏ qua */ } } }
};
/** Hiệu ứng camera chỉ áp cho chiêu của người chơi (người chơi ảo dùng chung hàm thi triển). */
const NO_CAM = { shake() {}, kick() {}, cinematic() {} };
const camFx = a => (a === Ents.player ? SideCam : NO_CAM);
/** Mưa phi kiếm (hình ảnh): MỘT InstancedMesh lưỡi kiếm + MỘT InstancedMesh hào quang cho mọi thanh kiếm đang rơi → 2 lần vẽ dù có hàng trăm thanh. */
const SwordRain = {
  cap: 160, list: [], mesh: null, glow: null,
  init() {
    this.mesh = new THREE.InstancedMesh(SWORD_GEO, new THREE.MeshBasicMaterial({ color: 0xe8f4ff }), this.cap);
    this.glow = new THREE.InstancedMesh(sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), ShaderLibrary.glow(0xa8c0ff, 0.35), this.cap);
    for (const m of [this.mesh, this.glow]) { m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
  },
  drop(x, y, gy, col) { if (!this.mesh) this.init(); if (this.list.length >= this.cap) return; this.list.push({ x, y, gy, z: rand(-0.8, 0.8), col }); },
  update(dt) {
    if (!this.mesh) return;
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) { const s = this.list[i]; s.y -= 34 * dt;
      if (s.y <= s.gy + 0.3) { vfx.particles.burst(_v1.set(s.x, s.gy + 0.2, 0), s.col, 4, 3, 0.3, 0.25, { up: 1 }); this.list.splice(i, 1); } }
    for (const s of this.list) {
      _m1.compose(_v1.set(s.x, s.y, s.z), _q1.setFromAxisAngle(_v2.set(0, 0, 1), Math.PI), _v3.set(1, 1, 1)); this.mesh.setMatrixAt(n, _m1);
      _m1.compose(_v1.set(s.x, s.y - 0.5, s.z), _q1.identity(), _v3.set(0.12, 0.6, 0.12)); this.glow.setMatrixAt(n, _m1); n++;
    }
    this.mesh.count = this.glow.count = n; this.mesh.instanceMatrix.needsUpdate = this.glow.instanceMatrix.needsUpdate = true;
  },
  clear() { this.list.length = 0; this.update(0); }
};
const MELEE_TIMING = [{ dur: 0.36, windup: 0.07, active: 0.13 }, { dur: 0.36, windup: 0.07, active: 0.13 }, { dur: 0.5, windup: 0.12, active: 0.2 }];
const CAST_TIMING = { dur: 0.5, windup: 0.12, active: 0.22 };

/** Sức mạnh kỹ năng theo cấp. */
const skillMult = (sk, lv) => sk.mult + (sk.perLv || 0) * Math.max(0, lv - 1);
/** Điểm nhắm: mục tiêu đang chọn (nếu trong tầm) → kẻ gần nhất phía trước → điểm trước mặt. */
function aimPoint(a, range, out) {
  const t = a.target && !a.target.dead && Math.abs(a.target.pos.x - a.pos.x) < range ? a.target : nearestFoe(a, range);
  if (t) { t.center(out); return t; }
  out.set(a.pos.x + a.facing * Math.min(range, 6), a.pos.y + a.h * 0.55, 0); return null;
}
function faceTo(a, x) { if (Math.abs(x - a.pos.x) > 0.15) a.facing = x > a.pos.x ? 1 : -1; }

/** Thi triển kỹ năng id (đã kiểm tra hồi chiêu / linh lực ở nơi gọi). Trả về thời gian bận (khoá di chuyển ngắn). */
function castSkill(a, id, lv = 1) {
  const sk = RPG_SKILLS[id], mult = skillMult(sk, lv), atk = a.atkNow ? a.atkNow() : a.atk, col = new THREE.Color(sk.color);
  const M = a.model, origin = new V3();   // điểm nhắm riêng cho lần thi triển (đọc lại khi trúng, sau vài khung)
  switch (sk.kind) {
    case 'melee': {
      const c = a.combo = clock.t - (a.comboT || -9) < 0.9 ? ((a.combo || 0) + 1) % 3 : 0; a.comboT = clock.t;
      const tgt = aimPoint(a, sk.range + 1.5, origin); if (tgt) faceTo(a, origin.x);
      const T = MELEE_TIMING[c]; M.play(['Attack01', 'Attack02', 'Attack03'][c], T);
      Tasks.after(T.active * 0.9, () => {
        if (a.dead) return;
        const x0 = a.facing > 0 ? a.pos.x - 0.3 : a.pos.x - sk.range, x1 = a.facing > 0 ? a.pos.x + sk.range : a.pos.x + 0.3;
        vfx.slash(_v1.set(a.pos.x + a.facing * 0.5, a.pos.y, 0.2), a.facing > 0 ? Math.PI / 2 : -Math.PI / 2, col, sk.range * (c === 2 ? 1.25 : 1), (c === 1 ? -1 : 1) * 1.25, 0.22, a.h * 0.55, c === 1);
        Sfx.whoosh();
        for (const e of foesInBox(a.team, x0, x1, a.pos.y - 0.5, a.pos.y + a.h + 0.5, _hitList)) hurt(a, e, atk * mult * (c === 2 ? 1.6 : 1), { kind: 'basic', knock: c === 2 ? (id === 'vo_basic' ? 7 : 4) : 1.5, lift: c === 2 && id === 'vo_basic' ? 5 : 0 });
      });
      return T.dur * 0.75;
    }
    case 'bolt': {
      const tgt = aimPoint(a, sk.range, origin); faceTo(a, origin.x);
      M.play(sk.big ? 'Attack03' : (a.combo = ((a.combo || 0) + 1) % 2) ? 'Attack01' : 'Attack02', CAST_TIMING);
      Tasks.after(CAST_TIMING.active * 0.8, () => {
        if (a.dead) return;
        M.tipPos(_v1); const sx = a.pos.x + a.facing * 0.6, sy = a.pos.y + a.h * 0.62;
        const dx = origin.x - sx, dy = origin.y - sy, d = Math.hypot(dx, dy) || 1, sp = sk.speed || 22;
        const type = id === 'phap_bang' ? 'ice' : a.boltType || 'orb';
        fireProjectile({ owner: a, type, x: sx, y: sy, vx: dx / d * sp, vy: dy / d * sp, dmg: atk * mult, kind: id.endsWith('basic') ? 'basic' : 'skill', life: sk.range / sp + 0.2,
          homing: id.endsWith('basic') ? tgt : null, pierce: !!sk.big, scale: sk.big ? 1.3 : 1, opts: sk.slow ? { slow: { k: sk.slow, t: 2.5 }, pen: 0.3 } : {} });
        Sfx.whoosh();
      });
      return 0.3;
    }
    case 'wave': {
      aimPoint(a, sk.range, origin); faceTo(a, origin.x);
      M.play('Attack03', { dur: 0.5, windup: 0.12, active: 0.2 });
      Tasks.after(0.17, () => {
        if (a.dead) return;
        fireProjectile({ owner: a, type: 'wave', x: a.pos.x + a.facing * 0.8, y: a.pos.y + a.h * 0.5, vx: a.facing * 21, vy: 0, dmg: atk * mult, kind: 'skill', pierce: true, life: sk.range / 21, scale: 1.6, radius: 1.1, opts: { knock: 3 } });
        Sfx.whoosh(); camFx(a).kick(a.facing * 0.15);
      });
      return 0.35;
    }
    case 'dash': {
      const tgt = aimPoint(a, sk.range + 2, origin); if (tgt) faceTo(a, origin.x);
      M.play('Dash', { dur: 0.42, windup: 0.05, active: 0.12 }); a.invuln = true; a.dashing = 0.3;
      const hits = new Map(), dir = a.facing; let t = 0, tick = 0;
      a.vel.x = dir * (sk.range / 0.3); a.vel.y = 0; a.hover = a.flying;
      GameFx.add({ owner: a, update: dt => {
        t += dt; tick -= dt;
        if (t < 0.3) { a.vel.x = dir * (sk.range / 0.3); a.vel.y = Math.max(a.vel.y, a.flying ? 0 : -2); if (Math.random() < 0.8) vfx.particles.emit(a.pos.x, a.pos.y + rand(0.3, 1.6), 0, -dir * 3, 0, 0, 0.3, 0.3, 0.05, col, 0.8, 3); }
        if (tick <= 0 && t < 0.42) { tick = 0.07;
          for (const e of foesInBox(a.team, a.pos.x - 1.4, a.pos.x + 1.4, a.pos.y - 0.6, a.pos.y + a.h + 0.6, _hitList)) {
            const n = hits.get(e) || 0; if (n >= (sk.hits || 1)) continue; hits.set(e, n + 1);
            hurt(a, e, atk * mult, { kind: 'skill', stun: sk.stun || 0, knock: n + 1 === (sk.hits || 1) ? 4 : 0.5 });
            vfx.slash(_v1.set(e.pos.x, e.pos.y, 0.3), rand(-3, 3), col, 1.3, rand(-1.5, 1.5), 0.18, e.h * 0.5);
          } }
        if (t >= 0.3 && a.dashing) { a.dashing = 0; a.vel.x *= 0.2; a.invuln = false; a.hover = false; }
        return t < 0.45;
      }, end: () => { a.invuln = false; a.dashing = 0; a.hover = false; } });
      Sfx.whoosh();
      return 0.4;
    }
    case 'orbit': {
      M.play('SkillCast', CAST_TIMING);
      const swords = []; for (let k = 0; k < sk.count; k++) swords.push(ProjPool.take('sword'));
      let t = 0, tick = 0;
      vfx.magicCircle(a.pos, 1.6, col, COLORS.white, { life: 0.8 });
      GameFx.add({ owner: a, update: dt => {
        t += dt; tick -= dt;
        swords.forEach((m, k) => { const ang = t * 4.2 + k / swords.length * TAU; m.position.set(a.pos.x + Math.cos(ang) * 1.5, a.pos.y + 1 + Math.sin(ang) * 1.1, Math.sin(ang * 0.5) * 0.4 + 0.3); m.rotation.set(0, 0, ang); });
        if (tick <= 0) { tick = 0.4;
          for (const e of foesInBox(a.team, a.pos.x - sk.range, a.pos.x + sk.range, a.pos.y - 1, a.pos.y + a.h + 1.2, _hitList)) hurt(a, e, atk * mult, { kind: 'skill', color: sk.color }); }
        return t < sk.dur && !a.dead;
      }, end: () => swords.forEach(m => ProjPool.give(m)) });
      Sfx.chime();
      return 0.35;
    }
    case 'rain': {
      aimPoint(a, sk.range, origin); faceTo(a, origin.x);
      const cx = Math.abs(origin.x - a.pos.x) < 2 ? a.pos.x + a.facing * 4.5 : origin.x, gy = World.supportAt(cx, origin.y + 1), half = 4.6;
      M.play('UltimateRaise', { dur: 0.9, windup: 0.3, active: 0.5 }); a.busy = 0.8;
      const circle = vfx.magicCircle(_v1.set(cx, 0, 0), half, col, COLORS.allyB, { y: gy, spin: 2 });
      camFx(a).cinematic(0.9); Sfx.chime(); flashLight(_v1.set(a.pos.x, a.pos.y + 3, 2), 0xe8f4ff, 4);
      let t = 0, wave = 0, n = sk.hits;
      GameFx.add({ owner: a, update: dt => {
        t += dt;
        if (t > 0.45 && Math.random() < 0.9) for (let k = 0; k < 2; k++) SwordRain.drop(cx + rand(-half, half), gy + rand(9, 13), gy, col);   // phi kiếm trút xuống (hình ảnh)
        if (t > 0.6 + wave * 0.17 && wave < n) {
          wave++;
          const last = wave === n;
          for (const e of foesInBox(a.team, cx - half, cx + half, gy - 1, gy + 9, _hitList)) hurt(a, e, atk * mult * (last ? 2.5 : 1), { kind: 'skill', stun: last ? 1 : 0, lift: last ? 6 : 0, color: sk.color });
          if (last) { vfx.shockwave(_v1.set(cx, gy, 0), half * 1.3, COLORS.white, 0.6, 0.1); camFx(a).shake(0.45); hitStop(0.08); Sfx.boom(); circle.fadeOut(0.6); }
        }
        return wave < n;
      } });
      return 0.8;
    }
    case 'zone': {
      const tgt = aimPoint(a, sk.range, origin); faceTo(a, origin.x);
      M.play('SkillCast', CAST_TIMING);
      const cx = origin.x, gy = World.supportAt(cx, origin.y + 0.5), R = sk.radius;
      const circle = vfx.magicCircle(_v1.set(cx, 0, 0), R, col, COLORS.fireHot, { y: gy, spin: 1.5 });
      let t = 0, tick = 0.3; Sfx.fire();
      GameFx.add({ owner: a, update: dt => {
        t += dt; tick -= dt;
        for (let k = 0; k < 3; k++) vfx.particles.emit(cx + rand(-R, R), gy + 0.1, rand(-1, 1), 0, rand(2, 4.5), 0, rand(0.5, 0.9), rand(0.3, 0.55), 0.05, Math.random() < 0.5 ? COLORS.fire : COLORS.fireHot, 0.9, 0.5, -1);
        if (tick <= 0) { tick = 0.5; for (const e of foesInBox(a.team, cx - R, cx + R, gy - 1, gy + 4.5, _hitList)) hurt(a, e, atk * mult, { kind: 'skill', color: sk.color }); }
        if (t >= sk.dur) { circle.fadeOut(0.4); return false; } return true;
      } });
      return 0.35;
    }
    case 'heal': {
      M.play('SkillCast', CAST_TIMING);
      healActor(a, a.maxHp * mult); let t = 0, tick = 1;
      vfx.magicCircle(_v1.set(a.pos.x, 0, 0), 1.8, col, COLORS.white, { y: a.pos.y, life: 1.2 }); Sfx.chime();
      GameFx.add({ owner: a, update: dt => {
        t += dt; tick -= dt;
        if (Math.random() < 0.6) vfx.particles.emit(a.pos.x + rand(-0.6, 0.6), a.pos.y + rand(0, 0.5), 0.2, 0, rand(1.5, 2.5), 0, 0.8, 0.22, 0.05, col, 0.9, 0.5);
        if (tick <= 0) { tick = 1; healActor(a, a.maxHp * mult * 0.12); }
        return t < sk.dur && !a.dead;
      } });
      return 0.3;
    }
    case 'strike': {
      M.play('UltimateRaise', { dur: 0.9, windup: 0.3, active: 0.5 }); a.busy = 0.6;
      camFx(a).cinematic(0.8); Sfx.thunder();
      let t = 0, k = 0;
      GameFx.add({ owner: a, update: dt => {
        t += dt;
        if (t > 0.4 + k * 0.16 && k < sk.hits) {
          k++;
          const foes = foesOf(a.team).filter(e => !e.dead && Math.abs(e.pos.x - a.pos.x) < sk.range && Math.abs(e.pos.y - a.pos.y) < 9);
          const e = foes.length ? foes[(Math.random() * foes.length) | 0] : null;
          const x = e ? e.pos.x : a.pos.x + a.facing * rand(2, sk.range * 0.7), gy = e ? e.pos.y : World.supportAt(x, a.pos.y + 1);
          lightning(x, gy + 14, gy, sk.color, 0.55);
          vfx.particles.burst(_v1.set(x, gy + 0.3, 0), COLORS.thunder, 12, 6, 0.4, 0.3, { up: 2 });
          if (e) hurt(a, e, atk * mult, { kind: 'skill', stun: 0.6, color: sk.color });
          for (const o of foesInBox(a.team, x - 1.2, x + 1.2, gy - 1, gy + 3, _hitList2)) if (o !== e) hurt(a, o, atk * mult * 0.5, { kind: 'skill', color: sk.color });
          if (k % 3 === 0) { camFx(a).shake(0.2); Sfx.thunder(); }
        }
        return k < sk.hits;
      } });
      return 0.6;
    }
    case 'slam': {
      M.play('HeavyAttack', { dur: 0.7, windup: 0.25, active: 0.4 });
      if (!a.onGround) { a.flying = false; a.vel.y = -24; }
      let t = 0;
      GameFx.add({ owner: a, update: dt => {
        t += dt;
        if (t >= 0.32 && (a.onGround || t > 0.9)) {
          const gy = a.pos.y;
          vfx.shockwave(_v1.set(a.pos.x, gy, 0), sk.radius * 1.2, col, 0.55, 0.12); vfx.particles.burst(_v1.set(a.pos.x, gy + 0.2, 0), _c1.set(World.biome ? World.biome.soil : 0x886644), 24, 7, 0.6, 0.4, { up: 3, gravity: 9 });
          for (const e of foesInBox(a.team, a.pos.x - sk.radius, a.pos.x + sk.radius, gy - 1, gy + 3.5, _hitList)) hurt(a, e, atk * mult, { kind: 'skill', lift: 8, knock: 5 });
          camFx(a).shake(0.35); hitStop(0.06); Sfx.boom();
          return false;
        }
        return true;
      } });
      return 0.55;
    }
    case 'shield': {
      M.play('SkillCast', CAST_TIMING);
      a.shield = a.maxHp * mult; a.shieldT = sk.dur; a.drK = Math.max(a.drK, 0.3); a.drT = sk.dur;
      const mesh = new THREE.Mesh(sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), ShaderLibrary.fresnelShield(sk.color)); scene.add(mesh);
      let t = 0; Sfx.shield();
      GameFx.add({ owner: a, update: dt => { t += dt; mesh.position.set(a.pos.x, a.pos.y + a.h * 0.5, 0); mesh.scale.set(a.w * 1.3, a.h * 0.75, 1.2);
        const u = mesh.material.uniforms; u.uTime.value += dt; u.uAlpha.value = Math.min(1, t * 4) * (a.shield > 0 ? 1 : 0.2); return t < sk.dur && a.shieldT > 0 && !a.dead; },
        end: () => { scene.remove(mesh); mesh.material.dispose(); } });
      return 0.3;
    }
    case 'transform': {
      M.play('UltimateRaise', { dur: 0.8, windup: 0.3, active: 0.5 }); a.busy = 0.6;
      const s0 = M.scale, U = M.U, rim0 = U.uRimColor.value.clone(), str0 = U.uRimStrength.value;
      let t = 0, tick = 1; a.transformK = mult; camFx(a).cinematic(0.7); Sfx.boom();
      vfx.shockwave(_v1.set(a.pos.x, a.pos.y, 0), 4, col, 0.7, 0.1); flashLight(_v1.set(a.pos.x, a.pos.y + 2, 2), sk.color, 6);
      GameFx.add({ owner: a, update: dt => {
        t += dt; tick -= dt;
        M.setScale(s0 * (1 + 0.35 * smooth(0, 0.4, t) * (1 - smooth(sk.dur - 0.4, sk.dur, t))));
        U.uRimColor.value.set(sk.color); U.uRimStrength.value = 1.1 + Math.sin(t * 8) * 0.2;
        if (Math.random() < 0.7) vfx.particles.emit(a.pos.x + rand(-0.7, 0.7), a.pos.y + rand(0, a.h), 0.2, 0, rand(1.5, 3), 0, 0.6, 0.3, 0.05, col, 0.9, 0.5);
        if (tick <= 0) { tick = 1; healActor(a, a.maxHp * 0.02, true); }
        return t < sk.dur && !a.dead;
      }, end: () => { M.setScale(s0); U.uRimColor.value.copy(rim0); U.uRimStrength.value = str0; a.transformK = 0; } });
      return 0.6;
    }
  }
  return 0.3;
}
