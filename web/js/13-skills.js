// Vạn Kiếm Kỳ Trận – SKILLS – kỹ năng dựng bằng SkillTimeline (mục 19)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 19. SKILLS – định nghĩa kỹ năng bằng SkillTimeline
 * ===================================================================*/
/** Chọn mục tiêu cho kỹ năng (mỗi kỹ năng một cách). Trả về đơn vị địch hoặc null. */
const SkillAI = {
  /** Địch có nhiều đồng đội đứng quanh nhất trong bán kính r (tâm vùng AoE); hoà thì lấy gần caster hơn. */
  densest(caster, r) {
    const foes = caster.enemies(); let best = null, bc = -1, bd = Infinity;
    for (const f of foes) {
      let n = 0; for (const g of foes) if (Math.hypot(g.pos.x - f.pos.x, g.pos.z - f.pos.z) <= r) n++;
      const d = f.pos.distanceTo(caster.pos);
      if (n > bc || (n === bc && d < bd)) { best = f; bc = n; bd = d; }
    }
    return best;
  },
  /** Địch máu thấp nhất (theo %), ưu tiên tuyến sau đánh xa; trong tầm maxDist nếu có. */
  weakest(caster, maxDist = Infinity) {
    const foes = caster.enemies(), near = foes.filter(f => f.pos.distanceTo(caster.pos) <= maxDist), list = near.length ? near : foes;
    let best = null, bs = Infinity;
    for (const f of list) { const s = f.hp / f.maxHp - (f.def.ranged ? 0.25 : 0); if (s < bs) { bs = s; best = f; } }
    return best;
  },
  /** Hướng bắn thẳng xuyên thấu trúng nhiều địch nhất (đường dài len, rộng w). */
  line(caster, len, w) {
    const foes = caster.enemies(); let best = null, bc = -1, bd = Infinity;
    for (const f of foes) {
      const dx = f.pos.x - caster.pos.x, dz = f.pos.z - caster.pos.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      let n = 0;
      for (const g of foes) { const gx = g.pos.x - caster.pos.x, gz = g.pos.z - caster.pos.z, along = gx * ux + gz * uz; if (along > 0 && along < len && Math.abs(gx * uz - gz * ux) < w) n++; }
      if (n > bc || (n === bc && l < bd)) { best = f; bc = n; bd = l; }
    }
    return best;
  },
  countNear(caster, r) { return caster.enemies().filter(f => f.pos.distanceTo(caster.pos) <= r).length; }
};

/** Lôi pháp: N tia sét giáng vào các địch quanh vùng đông nhất (Thiên Lôi Quyết, Cửu Thiên Lôi Kiếp). */
function thunderSkill(cfg) {
  cfg.times = Array.from({ length: cfg.strikes }, (_, i) => 0.65 + i * cfg.gap);
  cfg.end = cfg.times[cfg.times.length - 1] + 0.25;
  return {
    name: cfg.name, desc: cfg.desc,
    pick: c => SkillAI.densest(c, cfg.radius),
    build(caster, target, release) {
      const tl = new SkillTimeline(cfg.name, caster);
      const spots = [];
      tl.at(0, 'AnimationEvent', () => caster.anim.play('SkillCast', { dur: cfg.end, windup: 0.35, active: 0.5, hold: cfg.end - 0.8 }));
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 1.6, COLORS.thunder, COLORS.enemyB, { reveal: 0.35, life: cfg.end }));
      tl.at(0.35, 'SpawnVFX', () => {
        const c = target.alive ? target.pos : caster.pos;
        const foes = caster.enemies().sort((a, b) => a.pos.distanceTo(c) - b.pos.distanceTo(c));
        for (let i = 0; i < cfg.strikes; i++) { const f = foes[i % Math.max(1, foes.length)]; spots.push((f ? f.pos : c).clone().add(new V3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)))); }
        spots.forEach(s => vfx.magicCircle(s, 1.3, COLORS.thunder, COLORS.white, { reveal: 0.2, spin: 3, life: 0.9, alpha: 0.8 }));
      });
      cfg.times.forEach((at, i) => {
        tl.at(at, 'SpawnVFX', () => { const s = spots[i]; if (s) lightningBolt(new V3(s.x + rand(-3, 3), 18, s.z + rand(-3, 3)), new V3(s.x, 0.1, s.z), COLORS.thunder, 0.22); });
        tl.at(at, 'ApplyDamage', (self) => { const s = spots[i]; if (!s) return; self.hit = aoe(caster, s, cfg.radius, cfg.mult, { color: COLORS.thunder }); combatCam.shake(0.25); hitStop(0.04); flashLight(_v1.set(s.x, 3, s.z), 0xbfe0ff, 7); Sfx.thunder(); vfx.shockwave(new V3(s.x, 0, s.z), 2.6, COLORS.thunder, 0.4); });
        tl.at(at, 'ApplyStatusEffect', (self) => (self.hit || []).forEach(u => applyStun(u, cfg.stun)));
      });
      tl.at(cfg.end, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  };
}
/** Hỏa pháp: phóng N hỏa phượng truy đuổi, nổ diện rộng + thiêu đốt (Hỏa Phượng Phần Thiên, Song Phượng Diệt Thế). */
function phoenixSkill(cfg) {
  return {
    name: cfg.name, desc: cfg.desc,
    pick: c => SkillAI.densest(c, 3),
    build(caster, target, release) {
      const tl = new SkillTimeline(cfg.name, caster);
      // Phượng thứ 2+ bay vào cụm địch khác (cách mục tiêu đầu > 3 m) nếu có.
      const targets = [target];
      for (let k = 1; k < cfg.count; k++) { const o = caster.enemies().filter(f => targets.every(tg => f.pos.distanceTo(tg.pos) > 3)).sort((x, y) => x.pos.distanceTo(caster.pos) - y.pos.distanceTo(caster.pos))[0]; targets.push(o || target); }
      tl.at(0, 'AnimationEvent', () => caster.anim.play('SkillCast', { dur: 1.1, windup: 0.45, active: 0.55, hold: 0.3 }));
      tl.track(0, 0.5, 'SpawnVFX', () => { const p = caster.rig.getSocket('weaponTip').getWorldPosition(_v1); for (let i = 0; i < 3; i++) { const a = Math.random() * TAU, r = rand(0.8, 1.6); vfx.particles.emit(p.x + Math.sin(a) * r, p.y + rand(-0.5, 0.8), p.z + Math.cos(a) * r, -Math.sin(a) * r * 3, 0, -Math.cos(a) * r * 3, 0.32, 0.3, 0.05, Math.random() < 0.5 ? COLORS.fire : COLORS.fireHot, 0.9, 0.5); } });
      targets.forEach((tg, k) => tl.at(0.5 + k * 0.25, 'LaunchProjectile', () => {
        Sfx.fire();
        Projectiles.spawn({ src: caster, target: tg.alive ? tg : target, pos: caster.rig.getSocket('weaponTip').getWorldPosition(new V3()), speed: 11, homing: true, turn: 4, color: COLORS.fire, size: 1.1, life: 3, radius: 1.1,
          update: (p) => { for (let i = 0; i < 3; i++) vfx.particles.emit(p.pos.x + rand(-0.4, 0.4), p.pos.y + rand(-0.4, 0.4), p.pos.z + rand(-0.4, 0.4), rand(-1, 1), rand(0.5, 2), rand(-1, 1), 0.5, 0.5, 0.05, Math.random() < 0.4 ? COLORS.fireHot : COLORS.fire, 0.8, 1.5);
            const side = _v3.set(-p.vel.z, 0, p.vel.x).normalize(); // đôi cánh phượng
            for (const sgn of [-1, 1]) vfx.particles.emit(p.pos.x + side.x * sgn * 1.2, p.pos.y + 0.3, p.pos.z + side.z * sgn * 1.2, side.x * sgn * 2 - p.vel.x * 0.2, 0.8, side.z * sgn * 2 - p.vel.z * 0.2, 0.4, 0.45, 0.05, COLORS.fire, 0.7, 2); },
          onHit: (p) => {
            const c = new V3(p.pos.x, 0, p.pos.z);
            aoe(caster, c, 3, cfg.mult, { color: COLORS.fire, burn: cfg.burn });
            vfx.shockwave(c, 3.6, COLORS.fire, 0.55, 0.1); vfx.magicCircle(c, 3, COLORS.fire, COLORS.fireHot, { reveal: 0.1, life: 0.6, spin: 2 });
            vfx.particles.burst(_v1.set(c.x, 0.6, c.z), COLORS.fire, 60, 9, 0.9, 0.55, { up: 3, gravity: -2, drag: 2 });
            vfx.particles.burst(_v1.set(c.x, 0.6, c.z), COLORS.fireHot, 25, 5, 0.5, 0.7, { drag: 3 });
            flashLight(_v1.set(c.x, 2, c.z), 0xff9a4a, 8); combatCam.shake(0.35); hitStop(0.06); Sfx.boom();
          } });
      }));
      tl.at(1.0 + (cfg.count - 1) * 0.25, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  };
}
/** Hộ pháp: khiên cho N đồng minh đang yếu nhất (luôn gồm bản thân) (Hộ Thể Chân Khí, Kim Cương Bất Hoại). */
function shieldSkill(cfg) {
  return {
    name: cfg.name, desc: cfg.desc,
    pick: c => c.findTarget(), ready: c => c.allies().some(a => a.hp < a.maxHp * 0.8) || SkillAI.countNear(c, 5) >= 1,   // khiên khi có người bị thương / địch áp sát
    build(caster, target, release) {
      const tl = new SkillTimeline(cfg.name, caster);
      tl.at(0, 'AnimationEvent', () => caster.anim.play('SkillCast', { dur: 1.0, windup: 0.35, active: 0.45, hold: 0.3 }));
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 2, COLORS.shield, COLORS.allyB, { reveal: 0.3, life: 1.2 }));
      tl.at(0.4, 'ApplyStatusEffect', () => {
        Sfx.shield();
        const list = caster.allies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, cfg.count);
        if (!list.includes(caster)) list[list.length - 1] = caster;
        list.forEach(u => {
          u.shield = caster.maxHp * cfg.pct; u.shieldTime = 6;
          if (!u.shieldFx) u.shieldFx = makeShield(u);
          floatText(u.chest(new V3()), '+Khiên ' + Math.round(u.shield), '#9ff0d0', 0.9);
          vfx.particles.burst(u.chest(new V3()), COLORS.shield, 20, 4, 0.6, 0.3, { up: 2, drag: 2 });
        });
      });
      tl.at(1.0, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  };
}

const SKILLS = {
  /* -------- VẠN KIẾM QUY TÔNG (kỹ năng mẫu đầy đủ 5 giai đoạn) -------- */
  vanKiem: {
    name: 'Vạn Kiếm Quy Tông',
    desc: 'Triệu hồi phi kiếm vây quanh vùng địch đông nhất: 10 nhát chém liên tiếp (32% công mỗi nhát, bán kính 3,4 m), rồi cự kiếm giáng xuống gây 300% công trong bán kính 5 m, hất lùi và choáng 1,2 giây.',
    pick: c => SkillAI.densest(c, 3.4),
    build(caster, target, release) {
      const tl = new SkillTimeline('Vạn Kiếm Quy Tông', caster);
      const N = swordCount(), A = COLORS.allyA, B = COLORS.allyB;
      const T = { summon: 0.75, point: 1.35, launch: 1.5, array: 2.15, giant: 3.3, slam: 3.85, end: 5.1 };
      const center = new V3().copy(target.pos);
      let circle = null, circle2 = null, swarm = null, giant = null, giantGlow = null;
      const swords = [];
      const behind = () => new V3(-Math.sin(caster.yaw), 0, -Math.cos(caster.yaw));
      caster.manaLock = true;

      // ---- Giai đoạn 1: Tụ kiếm – kết ấn, pháp trận, phù văn xoay
      tl.at(0, 'AnimationEvent', () => { caster.anim.hold('UltimateCast', true); caster.snapFace(target.pos); });
      tl.at(0, 'CameraImpulse', () => combatCam.cinematic(caster, T.slam + 0.9, { dist: 14, yawOff: 0.55, pitch: 28 * DEG,
        focusFn: out => { const k = smooth(T.launch, T.array, tl.t); out.set(lerp(caster.pos.x, center.x, k * 0.7), 1.3, lerp(caster.pos.z, center.z, k * 0.7)); } }));
      tl.at(0, 'SpawnVFX', () => { circle = vfx.magicCircle(caster.pos, 2.4, A, B, { reveal: 0.6, spin: 1.2 }); });
      tl.at(0, 'PlaySound', () => Sfx.chime());
      tl.track(0, T.launch, 'SpawnVFX', (k, lt) => {
        const p = caster.pos, n = Math.max(2, Math.round(Q().particles / 900));
        for (let i = 0; i < n; i++) { // linh khí xoáy vào
          const a = lt * 3 + i * 2.1 + Math.random(), r = rand(2.5, 4.5);
          const sx = p.x + Math.sin(a) * r, sz = p.z + Math.cos(a) * r, sy = rand(0.2, 2.8);
          vfx.particles.emit(sx, sy, sz, (p.x - sx) * 2.2 + Math.cos(a) * 3, (1.3 - sy) * 1.5, (p.z - sz) * 2.2 - Math.sin(a) * 3, 0.55, 0.2, 0.04, Math.random() < 0.6 ? A : B, 0.85, 0.3);
        }
        for (let i = 0; i < 2; i++) { // phù văn bay vòng
          const a = lt * 2.2 + i * Math.PI;
          vfx.particles.emit(p.x + Math.sin(a) * 1.6, 0.3 + (lt * 0.8 % 1.6), p.z + Math.cos(a) * 1.6, 0, 0.4, 0, 0.5, 0.28, 0.1, B, 0.9, 0);
        }
      });

      // ---- Giai đoạn 2: Triệu hồi – phi kiếm hiện sau lưng theo vòng cung
      tl.at(T.summon, 'SpawnVFX', () => {
        swarm = new SwordSwarm(N);
        const bk = behind(), side = new V3(bk.z, 0, -bk.x);
        for (let i = 0; i < N; i++) {
          const row = i % 2, k = N > 1 ? Math.floor(i / 2) / Math.max(1, Math.ceil(N / 2) - 1) : 0.5;
          const ang = lerp(-1.2, 1.2, k);
          const r = 2.0 + row * 0.6;
          const home = new V3(caster.pos.x + bk.x * Math.cos(ang) * r * 0.55 + side.x * Math.sin(ang) * r, 1.6 + Math.cos(ang) * 1.6 + row * 0.5, caster.pos.z + bk.z * Math.cos(ang) * r * 0.55 + side.z * Math.sin(ang) * r);
          swords.push({ home, pos: home.clone(), dir: new V3(0, 1, 0), appear: i * (0.5 / N), scale: 0, hist: [], phase: 'hover', t0: 0, flight: 0, from: new V3(), ctrl: new V3(), to: new V3(), orbitA: (i / N) * TAU, orbitR: rand(2.6, 3.6), orbitH: rand(0.9, 2.2), striking: -1 });
        }
        swarm.setCount(N);
      });
      tl.at(T.summon, 'PlaySound', () => Sfx.chime());
      tl.track(T.summon, T.launch, 'SpawnVFX', (k, lt) => {
        swords.forEach((s, i) => {
          const a = clamp((lt - s.appear) / 0.18, 0, 1);
          if (a > 0 && s.scale === 0) vfx.particles.burst(s.home, B, 6, 3, 0.3, 0.25, { drag: 4 });
          s.scale = easeOut(a);
          s.pos.copy(s.home); s.pos.y += Math.sin(lt * 3 + i) * 0.08;
          s.dir.set(center.x - s.pos.x, 0.0, center.z - s.pos.z).normalize().lerp(UP, 0.65);
        });
      });

      // ---- Giai đoạn 3: Xuất kiếm – chỉ tay, phi kiếm bay theo đường cong
      tl.at(T.point, 'AnimationEvent', () => { caster.anim.hold('UltimateCast', false); caster.anim.play('UltimatePoint', { dur: 1.3, windup: 0.12, active: 0.22, hold: 0.8 }); });
      tl.at(T.launch, 'LaunchProjectile', () => {
        center.copy(target.alive ? target.pos : center);
        swords.forEach((s, i) => {
          s.phase = 'fly'; s.t0 = T.launch + i * (0.4 / N); s.flight = rand(0.42, 0.6);
          s.from.copy(s.pos);
          s.to.set(center.x + Math.sin(s.orbitA) * s.orbitR, s.orbitH, center.z + Math.cos(s.orbitA) * s.orbitR);
          s.ctrl.set((s.from.x + s.to.x) / 2 + rand(-3, 3), Math.max(s.from.y, s.to.y) + rand(3, 6), (s.from.z + s.to.z) / 2 + rand(-3, 3));
        });
        Sfx.whoosh();
      });
      tl.at(T.launch + 0.2, 'SpawnVFX', () => { circle2 = vfx.magicCircle(center, 4.2, B, A, { reveal: 0.5, spin: -0.8, alpha: 0.9 }); });

      // ---- Giai đoạn 4: Kiếm trận – xoay quanh vùng mục tiêu, một số kiếm lao đánh liên tiếp
      const STRIKES = 10, strikeDt = (T.giant - 0.2 - T.array) / STRIKES;
      for (let i = 0; i < STRIKES; i++) {
        const at = T.array + i * strikeDt;
        tl.at(at - 0.14, 'SpawnVFX', () => { const s = swords[(i * 7) % swords.length]; if (s) { s.striking = at; s.strikeFrom = s.pos.clone(); } });
        tl.at(at, 'ApplyDamage', () => {
          const hit = aoe(caster, center, 3.4, 0.32, { color: COLORS.allyCore });
          vfx.particles.burst(_v1.set(center.x + rand(-1, 1), 0.6, center.z + rand(-1, 1)), A, 10, 7, 0.3, 0.22, { drag: 4, gravity: 4 });
          if (hit.length) { hitStop(0.025); combatCam.shake(0.06); }
        });
      }
      tl.track(T.launch, T.slam + 0.15, 'SpawnVFX', (k, lt, dt) => {
        const now = T.launch + lt;
        swords.forEach((s, i) => {
          const prev = _v2.copy(s.pos);
          if (s.phase === 'fly') {
            const f = clamp((now - s.t0) / s.flight, 0, 1);
            const e = f * f * (2.2 - 1.2 * f); // nhịp: chậm đầu, tăng tốc giữa, hãm nhẹ cuối
            bezier(s.pos, s.from, s.ctrl, s.to, e);
            if (f >= 1) s.phase = 'orbit';
          } else if (s.phase === 'orbit') {
            const a = s.orbitA + (now - T.array) * 1.6;
            s.pos.set(center.x + Math.sin(a) * s.orbitR, s.orbitH + Math.sin(now * 3 + i) * 0.25, center.z + Math.cos(a) * s.orbitR);
            if (s.striking > 0) {
              const f = clamp(1 - (s.striking - now) / 0.14, 0, 1);
              if (f < 1) { s.pos.lerpVectors(s.strikeFrom, _v3.set(center.x + rand(-0.4, 0.4), 0.3, center.z + rand(-0.4, 0.4)), easeIn(f)); }
              else if (now < s.striking + 0.2) { const r = (now - s.striking) / 0.2; s.pos.lerp(_v3.set(center.x, 0.4, center.z), 1 - r); }
              else s.striking = -1;
            }
          }
          _v3.subVectors(s.pos, prev);
          if (_v3.lengthSq() > 1e-6) s.dir.lerp(_v3.normalize(), 0.5);
          if (s.phase === 'fly' || s.striking > 0) { s.hist.unshift(s.pos.clone()); if (s.hist.length > Q().trail) s.hist.pop(); }
          else if (s.hist.length) s.hist.pop();
          if (s.hist.length > 1) vfx.simJobs.push({ points: s.hist, n: s.hist.length, width: t => lerp(0.28, 0.02, t), color: (t, c) => { c.copy(t < 0.3 ? COLORS.allyCore : A); c.a = (1 - t) * 0.85; } });
        });
      });

      // ---- Giai đoạn 5: Cự kiếm giáng xuống, vòng xung kích, tan biến
      tl.at(T.giant, 'SpawnVFX', () => {
        giant = new THREE.Mesh(SWORD_GEO, new THREE.MeshBasicMaterial({ color: 0xc8e6ff }));
        giantGlow = new THREE.Mesh(SWORD_GEO, ShaderLibrary.glow(0x4d9ae8, 0.3));
        giant.scale.setScalar(6.5); giantGlow.scale.set(14, 7.2, 14); giant.rotation.x = Math.PI; giantGlow.rotation.x = Math.PI;
        scene.add(giant, giantGlow);
        vfx.magicCircle(center, 2.4, B, COLORS.white, { reveal: 0.25, spin: 2, life: T.slam - T.giant + 0.3 });
      });
      tl.at(T.giant, 'AnimationEvent', () => caster.anim.play('UltimateRaise', { dur: 0.9, windup: 0.1, active: 0.3, hold: 0.4 }));
      tl.track(T.giant, T.slam, 'SpawnVFX', (k) => {
        const y = lerp(15, 6.85, easeIn(k)); // mũi kiếm chạm đất đúng lúc slam
        if (giant) { giant.position.set(center.x, y, center.z); giantGlow.position.copy(giant.position); giant.scale.setScalar(6.5 * easeOut(Math.min(1, k * 4))); }
        vfx.particles.emit(center.x + rand(-0.6, 0.6), y - rand(0, 4), center.z + rand(-0.6, 0.6), 0, 6, 0, 0.3, 0.4, 0.05, A, 0.8, 0);
      });
      tl.at(T.slam, 'ApplyDamage', (self) => { self.hitList = aoe(caster, center, 5, 3.0, { heavy: true, knock: 2.2, color: COLORS.white }); });
      tl.at(T.slam, 'ApplyStatusEffect', (self) => { (self.hitList || []).forEach(u => applyStun(u, 1.2)); });
      tl.at(T.slam, 'CameraImpulse', () => { hitStop(0.12); combatCam.shake(0.85); combatCam.kick(new V3(0, -1, 0), 14); flashLight(_v1.set(center.x, 2, center.z), 0xbfe4ff, 9, 4); });
      tl.at(T.slam, 'SpawnVFX', () => {
        const g = new V3(center.x, 0, center.z);
        vfx.shockwave(g, 7, A, 0.7, 0.07); vfx.shockwave(g, 4.5, B, 0.55, 0.12);
        vfx.particles.burst(_v1.set(center.x, 0.5, center.z), A, 70, 16, 0.8, 0.4, { up: 4, gravity: 9, drag: 1.8 });
        vfx.particles.burst(_v1.set(center.x, 0.5, center.z), COLORS.allyCore, 18, 10, 0.5, 0.45, { drag: 3 });
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; vfx.particles.emit(center.x, 0.25, center.z, Math.sin(a) * 14, 0.5, Math.cos(a) * 14, 0.45, 0.5, 0.05, B, 1, 3); }
      });
      tl.at(T.slam + 0.03, 'PlaySound', () => Sfx.boom());
      tl.at(T.slam + 0.35, 'AnimationEvent', () => { release(); });
      tl.track(T.slam, T.end, 'SpawnVFX', (k) => {
        const fade = 1 - k;
        if (giant) { giant.scale.set(6.5 * fade, 6.5, 6.5 * fade); giantGlow.material.opacity = 0.3 * fade; giant.position.y = 6.85 + k * 2; giantGlow.position.copy(giant.position); }
        if (swarm) {
          swords.forEach((s, i) => { s.pos.y += 0.04 + i * 0.0005; s.scale = Math.max(0, 1 - k * 1.4); if (Math.random() < 0.15 * fade) vfx.particles.emit(s.pos.x, s.pos.y, s.pos.z, 0, 1, 0, 0.5, 0.2, 0.02, A, 0.8, 0.5); });
          swarm.glow.material.opacity = 0.28 * fade;
        }
        if (k > 0.05 && circle && !circle.fading) circle.fadeOut(0.6);
        if (k > 0.1 && circle2 && !circle2.fading) circle2.fadeOut(0.8);
      });
      // Ghi ma trận phi kiếm mỗi bước (sau mọi track).
      tl.track(T.summon, T.end, 'SpawnVFX', () => {
        if (!swarm) return;
        swords.forEach((s, i) => swarm.write(i, s.pos, s.dir, s.scale * 1.15, 1 + 0.15 * Math.sin(tl.t * 20 + i)));
        swarm.commit();
      });
      tl.at(T.end, 'Cleanup', () => {});
      tl.onCleanup((cancelled) => {
        caster.manaLock = false; caster.anim.hold('UltimateCast', false);
        if (swarm) swarm.dispose();
        if (giant) { scene.remove(giant, giantGlow); giant.material.dispose(); giantGlow.material.dispose(); }
        if (circle && !circle.fading) circle.fadeOut(0.3); if (circle2 && !circle2.fading) circle2.fadeOut(0.3);
        if (cancelled) release();
      });
      return tl;
    }
  },

  /* -------- KIẾM KHÍ TRẢM (Kiếm Đồng): lưỡi kiếm khí bán nguyệt bay thẳng, xuyên mục tiêu -------- */
  kiemKhi: {
    name: 'Kiếm Khí Trảm',
    desc: 'Chém một đạo kiếm khí bán nguyệt bay thẳng, xuyên qua mọi kẻ địch trên đường, gây 190% công.',
    pick: c => SkillAI.line(c, 12, 1.4),
    build(caster, target, release) {
      const tl = new SkillTimeline('Kiếm Khí Trảm', caster);
      const col = caster.team === 'ally' ? COLORS.allyA : COLORS.enemyA;
      tl.at(0, 'AnimationEvent', () => { caster.snapFace(target.pos); caster.anim.play('Attack03', { dur: 0.75, windup: 0.28, active: 0.36 }); });
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 1.2, col, COLORS.allyB, { reveal: 0.25, life: 0.6, spin: 2 }));
      tl.at(0.32, 'LaunchProjectile', () => {
        const dir = new V3(Math.sin(caster.yaw), 0, Math.cos(caster.yaw)), side = new V3(-dir.z, 0, dir.x);
        Sfx.whoosh();
        vfx.slash(caster.pos, caster.yaw, col, 2.2, Math.PI / 2, 0.25, 1.1);
        Projectiles.spawn({ src: caster, target: null, pierce: true, hitSet: new Set(), pos: caster.pos.clone().setY(1.1).addScaledVector(dir, 0.8),
          vel: dir.clone().multiplyScalar(17), speed: 17, color: col, size: 0.45, life: 0.75, radius: 1.4,
          update: (p) => { for (let k = -3; k <= 3; k++) { const w = k / 3; // hình bán nguyệt
            vfx.particles.emit(p.pos.x + side.x * w * 1.3 - dir.x * Math.abs(w) * 0.55, p.pos.y + w * 0.12, p.pos.z + side.z * w * 1.3 - dir.z * Math.abs(w) * 0.55, 0, 0, 0, 0.12, 0.38 * (1 - Math.abs(w) * 0.5), 0.05, col, 0.9, 0); } },
          onHit: (p, u) => { dealDamage(caster, u, 1.9, { skill: true, color: col }); hitStop(0.03); combatCam.shake(0.08); } });
      });
      tl.at(0.75, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  },

  /* -------- THIÊN LÔI QUYẾT: 3 đạo sét thủ tục -------- */
  thienLoi: thunderSkill({ name: 'Thiên Lôi Quyết', strikes: 3, gap: 0.25, radius: 2.4, mult: 1.6, stun: 0.8,
    desc: 'Gọi 3 tia sét giáng quanh mục tiêu: mỗi tia gây 160% công trong bán kính 2,4 m và choáng 0,8 giây.' }),
  cuuThienLoi: thunderSkill({ name: 'Cửu Thiên Lôi Kiếp', strikes: 6, gap: 0.2, radius: 2.6, mult: 1.8, stun: 1.0,
    desc: 'Gọi 6 tia sét giáng xuống các kẻ địch quanh vùng đông nhất: mỗi tia gây 180% công trong bán kính 2,6 m và choáng 1 giây.' }),

  /* -------- HỎA PHƯỢNG PHẦN THIÊN: cầu lửa lớn → nổ + thiêu đốt -------- */
  hoaPhuong: phoenixSkill({ name: 'Hỏa Phượng Phần Thiên', count: 1, mult: 2.0, burn: 0.18,
    desc: 'Phóng hỏa phượng truy đuổi mục tiêu, nổ gây 200% công trong bán kính 3 m và thiêu đốt theo thời gian.' }),
  songPhuong: phoenixSkill({ name: 'Song Phượng Diệt Thế', count: 2, mult: 2.6, burn: 0.25,
    desc: 'Phóng 2 hỏa phượng vào 2 cụm địch khác nhau, mỗi con nổ gây 260% công trong bán kính 3 m và thiêu đốt mạnh.' }),

  /* -------- HỘ THỂ CHÂN KHÍ: khiên Fresnel cho đồng đội yếu nhất -------- */
  hoThe: shieldSkill({ name: 'Hộ Thể Chân Khí', count: 3, pct: 0.3,
    desc: 'Tạo khiên bằng 30% máu tối đa của bản thân cho 3 đồng minh đang yếu nhất (luôn gồm bản thân), giữ 6 giây.' }),
  kimCuong: shieldSkill({ name: 'Kim Cương Bất Hoại', count: 5, pct: 0.4,
    desc: 'Tạo khiên bằng 40% máu tối đa của bản thân cho 5 đồng minh đang yếu nhất (luôn gồm bản thân), giữ 6 giây.' }),

  /* -------- HUYẾT ẢNH TRẢM (địch): lướt xuyên mục tiêu, vết chém đỏ góc cạnh -------- */
  huyetAnh: {
    name: 'Huyết Ảnh Trảm',
    desc: 'Lướt xuyên qua mục tiêu, chém 210% công trong bán kính 1,8 m quanh mục tiêu.',
    pick: c => SkillAI.weakest(c, 9),   // sát thủ: lướt vào kẻ yếu / tuyến sau
    build(caster, target, release) {
      const tl = new SkillTimeline('Huyết Ảnh Trảm', caster);
      const C1 = caster.team === 'ally' ? COLORS.allyA : COLORS.enemyA, C2 = caster.team === 'ally' ? COLORS.allyViolet : COLORS.blood;
      const dir = new V3(); let start = new V3();
      tl.at(0, 'AnimationEvent', () => { caster.anim.play('Dash', { dur: 0.6, windup: 0.25, active: 0.35 }); caster.snapFace(target.pos); });
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 1.5, C1, C2, { reveal: 0.2, life: 0.5, spin: -3 }));
      tl.at(0.25, 'SpawnVFX', () => { start = caster.pos.clone(); dir.set(target.pos.x - start.x, 0, target.pos.z - start.z); const len = dir.length(); dir.normalize().multiplyScalar(len + 2.5); Sfx.whoosh(); });
      tl.track(0.25, 0.45, 'AnimationEvent', (k) => { caster.pos.copy(start).addScaledVector(dir, easeOut(k)); vfx.particles.emit(caster.pos.x, rand(0.4, 1.6), caster.pos.z, 0, 0, 0, 0.4, 0.5, 0.1, C2, 0.6, 0); });
      tl.at(0.4, 'ApplyDamage', () => { aoe(caster, target.pos, 1.8, 2.1, { color: C2 }); hitStop(0.06); combatCam.shake(0.3); });
      tl.at(0.42, 'SpawnVFX', () => { for (let i = 0; i < 3; i++) vfx.slash(target.pos, caster.yaw + rand(-0.6, 0.6), C2, 2.2, rand(-1.2, 1.2), 0.3, 1.1); });
      tl.at(0.75, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  },

  /* -------- U MINH CHÚ (địch): 3 u hồn tím truy đuổi -------- */
  uMinh: {
    name: 'U Minh Chú',
    desc: 'Phóng 3 u hồn truy đuổi 3 kẻ địch, mỗi u hồn gây 120% công.',
    pick: c => SkillAI.weakest(c),
    build(caster, target, release) {
      const tl = new SkillTimeline('U Minh Chú', caster);
      const CV = caster.team === 'ally' ? COLORS.allyViolet : COLORS.enemyB, CR = caster.team === 'ally' ? COLORS.allyA : COLORS.enemyA;
      tl.at(0, 'AnimationEvent', () => caster.anim.play('SkillCast', { dur: 1.2, windup: 0.4, active: 0.5, hold: 0.4 }));
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 1.8, CV, CR, { reveal: 0.3, life: 1.2, spin: -1.5 }));
      [0.45, 0.6, 0.75].forEach((at, i) => tl.at(at, 'LaunchProjectile', () => {
        const foes = caster.enemies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp); const t = foes[i % Math.max(1, foes.length)] || target;   // 3 kẻ yếu nhất
        Projectiles.spawn({ src: caster, target: t, pos: caster.chest(new V3()).add(new V3(rand(-1, 1), 1, rand(-1, 1))), speed: 9, homing: true, turn: 3, arc: 6, color: CV, size: 0.55, life: 3,
          onHit: (p, u) => { dealDamage(caster, u, 1.2, { color: CV, skill: true }); vfx.particles.burst(p.pos, CV, 18, 6, 0.5, 0.3, { drag: 3 }); } });
      }));
      tl.at(1.0, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  },

  /* -------- PHÁ ĐỊA HỐNG (địch): nhảy lên đập đất, xung kích đỏ hất lùi -------- */
  phaDia: {
    name: 'Phá Địa Hống', allyName: 'Trấn Sơn Kích',
    desc: 'Dậm đất gây 160% công trong bán kính 3,6 m quanh bản thân và hất lùi kẻ địch.',
    pick: c => c.findTarget(), ready: c => SkillAI.countNear(c, 3.6) >= 1,   // dậm quanh mình: chỉ tung khi có địch trong 3,6 m
    build(caster, target, release) {
      const tl = new SkillTimeline('Phá Địa Hống', caster);
      const C1 = caster.team === 'ally' ? COLORS.allyB : COLORS.enemyA, C2 = caster.team === 'ally' ? COLORS.allyA : COLORS.blood;
      tl.at(0, 'AnimationEvent', () => caster.anim.play('HeavyAttack', { dur: 1.2, windup: 0.55, active: 0.7, hold: 0.25 }));
      tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, 3.4, C1, C2, { reveal: 0.6, life: 1.0, spin: 0.6 }));
      tl.at(0.7, 'ApplyDamage', () => { aoe(caster, caster.pos, 3.6, 1.6, { heavy: true, knock: 2.5, color: C1 }); combatCam.shake(0.45); hitStop(0.07); Sfx.boom(); });
      tl.at(0.7, 'SpawnVFX', () => { const g = new V3(caster.pos.x, 0, caster.pos.z); vfx.shockwave(g, 4.2, C1, 0.55, 0.1); vfx.particles.burst(_v1.set(g.x, 0.3, g.z), C1, 40, 9, 0.6, 0.35, { up: 4, gravity: 10, drag: 1.5 }); flashLight(_v1.set(g.x, 1.5, g.z), caster.team === 'ally' ? 0xffd27a : 0xff5a3a, 6); });
      tl.at(1.1, 'Cleanup', () => release());
      tl.onCleanup(c => { if (c) release(); });
      return tl;
    }
  }
};

/** Tia sét thủ tục: đường gấp khúc tái tạo mỗi bước, nhánh phụ, dùng ribbon cộng sáng. */
function lightningBolt(from, to, color, dur) {
  let t = 0, regen = 0; const pts = [], branch = []; const N = 14;
  const build = () => {
    pts.length = 0; branch.length = 0;
    for (let i = 0; i < N; i++) { const k = i / (N - 1), j = Math.sin(k * Math.PI) * 1.2; pts.push(new V3(lerp(from.x, to.x, k) + rand(-j, j), lerp(from.y, to.y, k), lerp(from.z, to.z, k) + rand(-j, j))); }
    const s = 4 + (Math.random() * 5 | 0); branch.push(pts[s].clone()); for (let i = 1; i < 6; i++) branch.push(branch[i - 1].clone().add(new V3(rand(-0.9, 0.9), -rand(0.6, 1.4), rand(-0.9, 0.9))));
  };
  build();
  vfx.add({ update: (dt) => {
    t += dt; regen -= dt; if (regen <= 0) { build(); regen = 0.04; }
    const a = 1 - smooth(dur * 0.4, dur, t);
    vfx.trailJobs.push({ points: pts, n: pts.length, width: () => 0.55, color: (k, c) => { c.copy(color); c.a = a; } });
    vfx.trailJobs.push({ points: branch, n: branch.length, width: k => lerp(0.3, 0.05, k), color: (k, c) => { c.copy(color); c.a = a * 0.8; } });
    if (Math.random() < 0.6) vfx.particles.emit(to.x, 0.3, to.z, rand(-4, 4), rand(2, 6), rand(-4, 4), 0.35, 0.2, 0.02, COLORS.white, 1, 3);
    return t < dur;
  } });
}

/** Khiên chân khí (Fresnel) bám theo đơn vị. */
function makeShield(u) {
  const mat = ShaderLibrary.fresnelShield(0x8ff0d0);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 16), mat); mesh.scale.set(1, 1.15, 1); mesh.renderOrder = 7; scene.add(mesh);
  let t = 0, hit = 0, dying = 0, dead = false;
  const remove = () => { if (dead) return; dead = true; scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); if (u.shieldFx === fx) u.shieldFx = null; };
  const fx = {
    cleanup: remove,   // vfx.clear() khi sang vòng
    follow(unit) { mesh.position.set(unit.pos.x, 1.0, unit.pos.z); },
    hit() { hit = 1; },
    shatter() { dying = 0.001; vfx.particles.burst(mesh.position, COLORS.shield, 30, 7, 0.6, 0.25, { drag: 3, gravity: 3 }); },
    kill() { dying = dying || 0.001; },
    update(dt) {
      t += dt; hit = Math.max(0, hit - dt * 4); mat.uniforms.uTime.value = t; mat.uniforms.uHit.value = hit;
      let a = smooth(0, 0.3, t);
      if (u.shield <= 0 && !dying) dying = 0.001;
      if (dying) { dying += dt; a *= 1 - dying / 0.35; mesh.scale.multiplyScalar(1 + dt); }
      mat.uniforms.uAlpha.value = a;
      if (dying > 0.35 || !u.alive) { remove(); return false; }
      return true;
    }
  };
  vfx.add(fx);
  return fx;
}
