// Vạn Kiếm Kỳ Trận – Sát thương, khiên, hit stop, đạn, phi kiếm (mục 16–18)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 16. Sát thương, khiên, trạng thái, hit stop
 * ===================================================================*/
let hitStopTimer = 0;
const options = { hitstop: store.get('hitstop', true), swordCount: store.get('swords', 0), footIK: store.get('footIK', true), haptics: store.get('haptics', true), prepTimer: store.get('prepTimer', true) };
/** Thời gian: chuẩn bị (đếm ngược, tắt được), trận tối đa 60 s; từ giây 40 "linh khí hỗn loạn" – sát thương +6%/giây để trận ngã ngũ. */
const PREP_TIME = 30, FIRST_PREP_TIME = 45, FIGHT_LIMIT = 60, OVERTIME_AT = 40;
const overtimeMul = () => (battle.phase === 'fight' && battle.time > OVERTIME_AT ? 1 + (battle.time - OVERTIME_AT) * 0.06 : 1);
/** 0 = theo mức đồ hoạ; > 0 = số người chơi chọn. */
const swordCount = () => (options.swordCount > 0 ? options.swordCount : Q().swords);
function hitStop(d) { if (options.hitstop) hitStopTimer = Math.max(hitStopTimer, d); }
const floaters = [];
function floatText(pos, text, color, size = 1, crit = false) {
  if (floaters.length > 60) floaters.shift();
  floaters.push({ x: pos.x + rand(-0.3, 0.3), y: pos.y + 0.5, z: pos.z + rand(-0.3, 0.3), text, color, size, crit, t: 0 });
}

/** Thống kê giao chiến (cộng dồn) – dùng cho bài kiểm thử AI và để soi cân bằng. */
/** Màu VFX theo hệ nguyên tố (đạn đánh thường và kỹ năng). */
const SKILL_COLORS = {
  fire: COLORS.fire, thunder: COLORS.thunder, nether: COLORS.enemyB, ice: new THREE.Color(0xbfe8ff), wood: new THREE.Color(0x9fe08a),
  arrow: new THREE.Color(0xffe8a8), light: new THREE.Color(0xfff0b0), sword: new THREE.Color(0xb8d0ff), blood: COLORS.blood, shadow: new THREE.Color(0x9a7aff), chaos: new THREE.Color(0xff3a7a), earth: new THREE.Color(0xffc070)
};
const combatLog = { dodges: 0, crits: 0, stuns: 0, resisted: 0, kites: 0, unstuck: 0, syncChecks: 0, syncMaxErr: 0, casts: {}, badCasts: 0 };

/** Khống chế: thời gian choáng nhân theo vai trò (tướng đỡ đòn kháng 40%), và sau khi hết choáng được miễn
 *  khống chế 0,8 giây để không bị khoá choáng liên hoàn. Tướng đang tung chiêu có giáp chiêu (không bị ngắt). */
/** kind = 'freeze': đóng băng – giống choáng về luật (không hành động, có kháng / miễn khống chế) nhưng nhân vật đứng im phủ băng. */
function applyStun(u, dur, kind = 'stun') {
  if (!u || !u.alive || dur <= 0) return false;
  if (u.ccImmune > 0) { combatLog.resisted++; floatText(u.chest(_v2.clone()), 'Kháng', '#c9d6df', 0.75); return false; }
  const d = dur * (ROLES[u.def.role] ? ROLES[u.def.role].tenacity : 1);
  const freeze = kind === 'freeze';
  if (u.status.stun <= 0 || (freeze && u.status.frozen <= 0)) floatText(u.chest(_v2.clone()), freeze ? 'Đóng băng' : 'Choáng', freeze ? '#cfeeff' : '#ffe08a', 0.8);
  u.status.stun = Math.max(u.status.stun, d);
  if (freeze) { u.status.frozen = Math.max(u.status.frozen, d); combatLog.freezes = (combatLog.freezes || 0) + 1; vfx.particles.burst(u.chest(_v2.clone()), SKILL_COLORS.ice, 24, 3, 0.7, 0.3, { drag: 3 }); }
  else combatLog.stuns++;
  return true;
}

function dealDamage(src, dst, mult, opts = {}) {
  if (!dst || !dst.alive || !src) return 0;
  // Né tránh: chỉ với đòn đánh thường (kỹ năng và sát thương theo thời gian luôn trúng); đang choáng / tung chiêu thì không né được.
  if (!opts.skill && !opts.dot && dst.def.dodge > 0 && dst.status.stun <= 0 && dst.fsm.name !== 'cast' && Math.random() < dst.def.dodge) {
    combatLog.dodges++;
    floatText(dst.chest(_v2.clone()), 'Né', '#bfe3ff', 0.85);
    dst.anim.hit(src.pos, 0.3);   // nghiêng người tránh
    if (!src.manaLock && src.alive) src.mana = Math.min(src.maxMana, src.mana + 10);
    return 0;
  }
  const crit = opts.crit !== undefined ? opts.crit : Math.random() < src.def.crit;
  if (crit && !opts.dot) combatLog.crits++;
  // Giáp sau xuyên giáp (opts.pen = tỉ lệ giáp bị bỏ qua); dst.fx 'dmgTaken' = giảm / tăng sát thương nhận vào.
  const armor = (dst.defNow ? dst.defNow() : dst.def_) * (1 - clamp(opts.pen || 0, 0, 1));
  const mitig = armor / (armor + 100);
  let dmg = (src.atkNow ? src.atkNow() : src.atk) * mult * (1 - mitig) * (crit ? src.def.critDmg : 1) * rand(0.95, 1.05) * overtimeMul();
  if (dst.fx) dmg *= dst.fx.mul('dmgTaken');
  if (opts.skill && src.bonus) dmg *= src.bonus.skill * (STAR.skill[src.star] || 1);   // sức mạnh kỹ năng: tộc/hệ × sao
  dmg = Math.round(dmg);
  dmg = Math.max(1, dmg);
  if (battle.bench) { dst.hp = dst.maxHp; }
  let absorbed = 0;
  if (dst.shield > 0) { absorbed = Math.min(dst.shield, dmg); dst.shield -= absorbed; dmg -= absorbed; if (dst.shieldFx) dst.shieldFx.hit(); if (dst.shield <= 0 && dst.shieldFx) { dst.shieldFx.shatter(); dst.shieldFx = null; } }
  dst.hp = Math.max(0, dst.hp - dmg);
  const ls = (src.bonus ? src.bonus.ls : 0) + (src.fx ? src.fx.sum('ls') : 0);
  if (ls > 0 && src.alive && !opts.dot) src.hp = Math.min(src.maxHp, src.hp + dmg * ls);
  combatLog.dealt = (combatLog.dealt || 0) + dmg;
  if (!dst.manaLock) dst.mana = Math.min(dst.maxMana, dst.mana + Math.min(12, (dmg + absorbed) * 0.04 + 2));
  if (!opts.dot && !src.manaLock && src.alive) src.mana = Math.min(src.maxMana, src.mana + (opts.skill ? 0 : 10));
  dst.flash = Math.max(dst.flash, opts.dot ? 0.25 : opts.skill ? 0.55 : 1);
  const c = dst.chest(_v2.clone());
  if (absorbed > 0 && dmg === 0) floatText(c, 'Khiên −' + absorbed, '#9ff0d0', 0.9);
  else floatText(c, (crit ? dmg + '!' : '' + dmg), opts.dot ? '#ffb070' : crit ? '#ffd166' : dst.team === 'ally' ? '#ff8a7a' : '#ffffff', crit ? 1.45 : opts.dot ? 0.8 : 1, crit);
  if (!opts.dot) {
    const col = src.team === 'ally' ? (opts.color || COLORS.allyCore) : (opts.color || COLORS.enemyA);
    vfx.particles.burst(c, col, crit ? 18 : 10, crit ? 9 : 6, 0.35, 0.22, { drag: 4, gravity: 6 });
    dst.anim.hit(src.pos, opts.heavy || crit ? 1 : 0.55);
    Sfx.hit(opts.heavy || crit);
  }
  if (opts.knock && dst.alive && dst.hp > 0 && dst.fsm.name !== 'cast' && dst.def.poise < 85) {
    const dx = dst.pos.x - (opts.from || src.pos).x, dz = dst.pos.z - (opts.from || src.pos).z, l = Math.hypot(dx, dz) || 1;
    dst.knock.set(dx / l * opts.knock * 2.2, 0, dz / l * opts.knock * 2.2); dst.fsm.set('knockback');
  }
  if (opts.stun && dst.hp > 0) applyStun(dst, opts.stun);
  if (opts.burn && dst.hp > 0) { dst.status.burn = 3; dst.status.burnSrc = src; dst.status.burnDmg = opts.burn; }
  if (dst.hp <= 0) { dst.fsm.set('dead'); onUnitDeath(dst); }
  return dmg;
}
function aoe(src, center, radius, mult, opts = {}) {
  const hit = [];
  for (const u of units) if (u.team !== src.team && u.alive && Math.hypot(u.pos.x - center.x, u.pos.z - center.z) <= radius) { dealDamage(src, u, mult, Object.assign({ skill: true, from: center }, opts)); hit.push(u); }
  return hit;
}

/* =====================================================================
 * 17. ProjectileSystem – đạn pháp, cầu lửa, u hồn truy đuổi, lưỡi kiếm khí
 * ===================================================================*/
const Projectiles = {
  list: [],
  spawn(p) { p.hist = []; this.list.push(p); return p; },
  basic(src, target, heavy) {
    const kind = src.def.ranged;
    const tip = src.rig.getSocket('weaponTip').getWorldPosition(new V3());
    const col = SKILL_COLORS[kind] || COLORS.thunder, arrow = kind === 'arrow';
    Sfx.whoosh();
    this.spawn({ src, target, pos: tip, speed: arrow ? 26 : heavy ? 15 : 18, homing: true, color: col, size: arrow ? 0.3 : heavy ? 0.6 : 0.42, life: 2,
      onHit: (p, u) => { dealDamage(src, u, heavy ? 1.5 : 1, { heavy, color: col, burn: kind === 'fire' && heavy ? 0.15 : 0 }); vfx.particles.burst(p.pos, col, heavy ? 22 : 12, 6, 0.4, 0.3, { drag: 3 }); if (heavy) { vfx.shockwave(new V3(u.pos.x, 0, u.pos.z), 1.6, col, 0.4); hitStop(0.05); } } });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.homing && p.target && p.target.alive) {
        const tp = p.target.chest(_v2);
        _v1.subVectors(tp, p.pos).normalize();
        if (!p.vel) p.vel = _v1.clone().multiplyScalar(p.speed).add(new V3(0, p.arc || 0, 0));
        p.vel.lerp(_v1.multiplyScalar(p.speed), Math.min(1, (p.turn || 6) * dt));
      } else if (!p.vel) p.vel = new V3(0, 0, p.speed);
      p.pos.addScaledVector(p.vel, dt);
      if (p.update) p.update(p, dt);
      // Hạt lõi + đuôi
      const c = p.color;
      vfx.particles.emit(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0.12, p.size * 1.5, p.size * 0.8, c, 1, 0);
      vfx.particles.emit(p.pos.x + rand(-0.08, 0.08), p.pos.y + rand(-0.08, 0.08), p.pos.z + rand(-0.08, 0.08), -p.vel.x * 0.1, -p.vel.y * 0.1 + 0.3, -p.vel.z * 0.1, 0.35, p.size * 0.8, 0.02, c, 0.7, 2);
      p.hist.unshift(p.pos.clone()); if (p.hist.length > 9) p.hist.pop();
      vfx.simJobs.push({ points: p.hist, n: p.hist.length, width: t => lerp(p.size * 1.1, 0.02, t), color: (t, cc) => { cc.copy(c); cc.a = (1 - t) * 0.8; } });
      // Va chạm
      let done = p.life <= 0;
      if (!done) {
        for (const u of units) {
          if (!u.alive || u.team === p.src.team || (p.pierce && p.hitSet.has(u))) continue;
          if (p.target && !p.pierce && u !== p.target) continue;
          const cc = u.chest(_v3);
          if (cc.distanceTo(p.pos) < (p.radius || 0.7)) {
            if (p.pierce) p.hitSet.add(u);
            try { p.onHit(p, u); } catch (e) { console.error('[Projectile]', e); }
            if (!p.pierce) { done = true; break; }
          }
        }
        if (p.target && !p.target.alive && !p.pierce) done = true;
      }
      if (done) { if (p.onEnd) p.onEnd(p); this.list.splice(i, 1); }
    }
  },
  clear() { this.list.length = 0; }
};

/* =====================================================================
 * 18. Phi kiếm (InstancedMesh) dùng cho Vạn Kiếm Quy Tông
 * ===================================================================*/
class SwordSwarm {
  constructor(max) {
    this.max = max;
    this.solid = new THREE.InstancedMesh(SWORD_GEO, new THREE.MeshBasicMaterial({ color: 0xa8d4f5 }), max);
    this.glow = new THREE.InstancedMesh(SWORD_GEO, ShaderLibrary.glow(0x3f8fe0, 0.28), max);
    this.solid.frustumCulled = this.glow.frustumCulled = false;
    this.solid.count = this.glow.count = 0;
    this.glow.renderOrder = 8;
    scene.add(this.solid, this.glow);
    this.items = []; this.mat = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new V3();
  }
  setCount(n) { this.solid.count = this.glow.count = Math.min(n, this.max); }
  write(i, pos, dir, scale, glowScale) {
    this.q.setFromUnitVectors(UP, _v3.copy(dir).normalize());
    this.s.setScalar(scale); this.mat.compose(pos, this.q, this.s); this.solid.setMatrixAt(i, this.mat);
    this.s.set(scale * glowScale * 2.2, scale * glowScale * 1.12, scale * glowScale * 2.2); this.mat.compose(pos, this.q, this.s); this.glow.setMatrixAt(i, this.mat);
  }
  commit() { this.solid.instanceMatrix.needsUpdate = true; this.glow.instanceMatrix.needsUpdate = true; }
  dispose() { scene.remove(this.solid, this.glow); this.solid.dispose(); this.glow.dispose(); this.solid.material.dispose(); this.glow.material.dispose(); }
}
const bezier = (out, a, b, c, t) => { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z); };
