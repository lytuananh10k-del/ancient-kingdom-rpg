// Vạn Kiếm Kỳ Trận – Sát thương, khiên, hit stop, đạn, phi kiếm (mục 16–18)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 16. Sát thương, khiên, trạng thái, hit stop
 * ===================================================================*/
let hitStopTimer = 0;
const prefersReducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
/** Giảm chuyển động của hệ điều hành → mặc định tắt khựng hình (người chơi bật lại được trong Cài đặt). */
const options = { hitstop: store.get('hitstop', !prefersReducedMotion), swordCount: store.get('swords', 0), footIK: store.get('footIK', true), haptics: store.get('haptics', true), prepTimer: store.get('prepTimer', true) };
/** Thời gian: chuẩn bị (đếm ngược, tắt được), trận tối đa 60 s; từ giây 40 "linh khí hỗn loạn" – sát thương +6%/giây để trận ngã ngũ. */
const PREP_TIME = 30, FIRST_PREP_TIME = 45, FIGHT_LIMIT = BATTLE_RULES.limit, OVERTIME_AT = BATTLE_RULES.overtimeAt;
const overtimeMul = () => (battle.phase === 'fight' && battle.time > OVERTIME_AT ? 1 + (battle.time - OVERTIME_AT) * BATTLE_RULES.overtimePerSec : 1);
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
/** Kiểm toán logic (CombatTestRunner đọc): đòn thường gây sát thương 2 lần, đánh xác, tung chiêu thiếu năng lượng, chỉ số NaN… */
const CombatAudit = { doubleHits: 0, deadTargetAttacks: 0, badCasts: 0, nonFinite: 0, hitKeys: new Set(),
  reset() { this.doubleHits = this.deadTargetAttacks = this.badCasts = this.nonFinite = 0; this.hitKeys.clear(); } };
const combatLog = { dodges: 0, crits: 0, stuns: 0, resisted: 0, kites: 0, unstuck: 0, syncChecks: 0, syncMaxErr: 0, casts: {}, badCasts: 0 };

/** Khống chế: thời gian nhân (1 − kháng khống chế) theo vai trò (đỡ đòn kháng 40%); hết choáng được miễn khống chế 0,8 giây
 *  để không bị khoá liên hoàn. kind = 'freeze': đóng băng – luật như choáng nhưng nhân vật đứng im phủ băng.
 *  Choáng / đóng băng là trạng thái trong StatusEffectManager (đồng hồ mô phỏng, thanh tẩy được, cộng dồn: giữ mốc kết thúc xa nhất). */
function applyStun(u, dur, kind = 'stun', src) {
  if (!u || !u.alive || dur <= 0) return false;
  if (u.ccImmune > 0) { combatLog.resisted++; floatText(u.chest(_v2.clone()), 'Kháng', '#c9d6df', 0.75); return false; }
  const d = dur * (1 - u.tenacity());
  const freeze = kind === 'freeze';
  if (u.status.stun <= 0 || (freeze && u.status.frozen <= 0)) floatText(u.chest(_v2.clone()), freeze ? 'Đóng băng' : 'Choáng', freeze ? '#cfeeff' : '#ffe08a', 0.8);
  u.fx.push({ type: freeze ? 'freeze' : 'stun', dur: d, src });
  if (freeze) { combatLog.freezes = (combatLog.freezes || 0) + 1; vfx.particles.burst(u.chest(_v2.clone()), SKILL_COLORS.ice, 24, 3, 0.7, 0.3, { drag: 3 }); }
  else combatLog.stuns++;
  return true;
}

/* ---------- DamageCalculator (hằng số ở js/data/balance.js) ---------- */
const DamageCalculator = {
  /** Loại sát thương: opts.type; theo thời gian → DAMAGE.dotType; kỹ năng → skillType của tướng / vai trò; đòn thường → vật lý. */
  typeOf(src, opts) {
    if (opts.type) return opts.type;
    if (opts.dot) return DAMAGE.dotType;
    if (opts.skill) return (src.def && src.def.skillType) || (ROLE_STATS[src.def && src.def.role] || {}).skillType || 'physical';
    return DAMAGE.basicType;
  },
  /** Hệ số phòng thủ của mục tiêu cho loại sát thương (xuyên giáp / xuyên kháng chỉ bớt phần phòng thủ dương). */
  factor(dst, type, pen) {
    if (type === 'true') return 1;
    const v = type === 'magic' ? (dst.mrNow ? dst.mrNow() : 0) : (dst.defNow ? dst.defNow() : dst.def_ || 0);
    return defenseFactor(v > 0 ? v * (1 - clamp(pen || 0, 0, 1)) : v);
  },
  /** Sát thương sau phòng thủ & giảm sát thương nhận (chưa trừ lá chắn). Dùng RNG có seed (CombatRNG). */
  compute(src, dst, mult, opts) {
    const type = this.typeOf(src, opts);
    const crit = opts.crit !== undefined ? opts.crit : opts.flat === undefined && !opts.dot && crand() < src.def.crit;
    let raw = opts.flat !== undefined ? opts.flat : (src.atkNow ? src.atkNow() : src.atk) * mult * (1 + (crand() * 2 - 1) * DAMAGE.variance);
    if (crit) raw *= src.def.critDmg;
    if (opts.skill && src.apNow) raw *= src.apNow() / 100;   // sức mạnh phép thuật (AP): sao × tộc/hệ × trang bị
    const f = this.factor(dst, type, opts.pen);
    let dmg = raw * f * overtimeMul() * (dst.fx ? dst.fx.mul('dmgTaken') : 1);
    if (!Number.isFinite(dmg)) dmg = 0;
    return { type, crit, raw, factor: f, dmg: Math.max(1, Math.round(dmg)) };
  }
};

/** Gây sát thương. opts: { type: physical|magic|true, skill, dot, proc, flat, pen, crit, knock, from, color, heavy, stun, burn, attack }.
 *  Quy trình: né (chỉ đòn thường) → DamageCalculator → lá chắn → máu → hút máu → năng lượng → hiệu ứng phụ → chết → sự kiện tộc/hệ. */
function dealDamage(src, dst, mult, opts = {}) {
  if (!dst || !dst.alive || !src) return 0;
  if (battle.phase === 'end') return 0;   // trận đã phân định: chiêu / đạn còn dở không làm đổi kết quả hay máu
  // Né tránh: chỉ với đòn đánh thường (kỹ năng và sát thương theo thời gian luôn trúng); đang choáng / tung chiêu thì không né được.
  if (!opts.skill && !opts.dot && !opts.proc && dst.def.dodge > 0 && dst.status.stun <= 0 && dst.fsm.name !== 'cast' && crand() < dst.def.dodge) {
    combatLog.dodges++;
    floatText(dst.chest(_v2.clone()), 'Né', '#bfe3ff', 0.85);
    dst.anim.hit(src.pos, 0.3);   // nghiêng người tránh
    if (!src.manaLock && src.alive) addMana(src, DAMAGE.mana.onDodge);
    return 0;
  }
  const r = DamageCalculator.compute(src, dst, mult, opts), crit = r.crit;
  if (crit) combatLog.crits++;
  let dmg = r.dmg;
  if (battle.bench) { dst.hp = dst.maxHp; }
  const absorbed = dst.fx ? dst.fx.absorb(dmg) : 0;
  if (absorbed > 0) { dmg -= absorbed; if (dst.shieldFx) { dst.shieldFx.hit(); if (dst.shield <= 0) { dst.shieldFx.shatter(); dst.shieldFx = null; } } }
  dst.hp = Math.max(0, dst.hp - dmg);
  if (opts.attack) { const k = src.id + ':' + opts.attack; if (CombatAudit.hitKeys.has(k)) CombatAudit.doubleHits++; else CombatAudit.hitKeys.add(k); }
  if (!Number.isFinite(dst.hp) || !Number.isFinite(dmg)) CombatAudit.nonFinite++;
  if (src.cs) { src.cs.dealt += dmg + absorbed; src.cs[r.type] += dmg + absorbed; }
  if (dst.cs) dst.cs.taken += dmg + absorbed;
  const by = combatLog.byType || (combatLog.byType = { physical: 0, magic: 0, true: 0 }); by[r.type] = (by[r.type] || 0) + dmg + absorbed;
  const ls = (src.bonus ? src.bonus.ls : 0) + (src.fx ? src.fx.sum('ls') : 0);
  if (ls > 0 && src.alive && !opts.dot) src.hp = Math.min(src.maxHp, src.hp + dmg * ls * overtimeHealMul());
  // Hút máu toàn phần (Ma Tộc): mọi nguồn sát thương – đòn thường, kỹ năng, theo thời gian, phi kiếm / nổ phụ.
  if (src.bonus && src.bonus.omni > 0 && src.alive && dmg > 0) {
    const h = Math.min(src.maxHp - src.hp, dmg * src.bonus.omni * overtimeHealMul());
    if (h > 0) { src.hp += h; combatLog.omniHealed = (combatLog.omniHealed || 0) + h; TraitEvents.emit('onHeal', src, src, h); }
  }
  combatLog.dealt = (combatLog.dealt || 0) + dmg;
  const M = DAMAGE.mana;
  if (!dst.manaLock) addMana(dst, Math.min(M.onHitMax, (dmg + absorbed) * M.onHitPct + M.onHitBase));
  if (!opts.dot && !opts.proc && !src.manaLock && src.alive && !opts.skill) addMana(src, M.onAttack);
  dst.flash = Math.max(dst.flash, opts.dot ? 0.25 : opts.skill ? 0.55 : 1);
  const c = dst.chest(_v2.clone());
  if (absorbed > 0 && dmg === 0) floatText(c, 'Khiên −' + absorbed, '#9ff0d0', 0.9);
  else floatText(c, (crit ? dmg + '!' : '' + dmg), opts.dot ? '#ffb070' : crit ? '#ffd166' : r.type === 'magic' ? '#d6b8ff' : r.type === 'true' ? '#fff6c8' : dst.team === 'ally' ? '#ff8a7a' : '#ffffff', crit ? 1.45 : opts.dot ? 0.8 : 1, crit);
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
  if (opts.stun && dst.hp > 0) applyStun(dst, opts.stun, 'stun', src);
  if (opts.burn && dst.hp > 0) applyBurn(dst, src, opts.burn);
  if (dst.hp <= 0) { if (src.cs) src.cs.kills++; dst.fsm.set('dead'); onUnitDeath(dst); }
  // Sự kiện cho tộc/hệ – phát SAU khi xử lý chết để hiệu ứng phụ (nổ Pháp Tu) không làm một tướng chết hai lần.
  TraitEvents.emit('onHit', src, dst, dmg, opts);
  TraitEvents.emit('onDamageTaken', dst, src, dmg, opts);
  return dmg;
}
/** Nhận năng lượng (nhân hệ số năng lượng nhận được của Tiên Tộc). */
function addMana(u, x) { u.mana = Math.min(u.maxMana, u.mana + x * (u.bonus ? u.bonus.manaGain : 1)); }
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
  basic(src, target, heavy, attack) {
    const kind = src.def.ranged;
    const tip = src.launchPoint(new V3());
    const col = SKILL_COLORS[kind] || COLORS.thunder, arrow = kind === 'arrow';
    Sfx.whoosh();
    this.spawn({ src, target, pos: tip, speed: arrow ? 26 : heavy ? 15 : 18, homing: true, color: col, size: arrow ? 0.3 : heavy ? 0.6 : 0.42, life: 2,
      onHit: (p, u) => { dealDamage(src, u, heavy ? DAMAGE.heavyRangedMult : 1, { heavy, color: col, burn: kind === 'fire' && heavy ? 0.15 : 0, attack }); vfx.particles.burst(p.pos, col, heavy ? 22 : 12, 6, 0.4, 0.3, { drag: 3 }); if (heavy) { vfx.shockwave(new V3(u.pos.x, 0, u.pos.z), 1.6, col, 0.4); hitStop(0.05); } } });
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
 * SimTasks – tác vụ chiến đấu kéo dài chạy trong BƯỚC MÔ PHỎNG (vùng duy trì, phi kiếm triệu hồi…).
 * Trước tuần 3 các tác vụ này chạy trong vòng lặp VFX (theo FPS) → sát thương phụ thuộc tốc độ khung hình. Giờ: cố định 60 Hz.
 * ===================================================================*/
const SimTasks = {
  list: [],
  add(t) { this.list.push(t); return t; },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i]; let keep = false;
      try { keep = t.update(dt) !== false; } catch (e) { console.error('[SimTask]', e); }
      if (!keep) { this.list.splice(i, 1); if (t.cleanup) try { t.cleanup(); } catch (e) { console.error('[SimTask cleanup]', e); } }
    }
  },
  clear() { const l = this.list.splice(0); for (const t of l) if (t.cleanup) try { t.cleanup(); } catch (e) { console.error('[SimTask cleanup]', e); } }
};

/* ---------- StatusVFX: hạt theo trạng thái đang có (chỉ hình ảnh; ít hạt ở LOW) ---------- */
const StatusVFX = {
  emit(u, dt) {
    const q = Math.max(0, QualityManager.order.indexOf(QualityManager.level)), k = (0.4 + q * 0.35) * dt * 60, s = u.status;
    if (s.stun > 0 && s.frozen <= 0 && Math.random() < 0.25 * k) { const a = performance.now() * 0.01; vfx.particles.emit(u.pos.x + Math.sin(a) * 0.4, 2.15, u.pos.z + Math.cos(a) * 0.4, 0, 0.2, 0, 0.3, 0.16, 0.05, COLORS.allyB, 0.9, 0); }
    if (s.burn > 0 && Math.random() < 0.5 * k) vfx.particles.emit(u.pos.x + rand(-0.3, 0.3), rand(0.3, 1.6), u.pos.z + rand(-0.3, 0.3), 0, rand(1, 2), 0, 0.5, 0.25, 0.05, COLORS.fire, 0.8, 1);
    if (q >= 1 && u.fx.list.length) {
      for (const e of u.fx.list) {
        if (e.type === 'slow' && Math.random() < 0.2 * k) vfx.particles.emit(u.pos.x + rand(-0.4, 0.4), 0.15, u.pos.z + rand(-0.4, 0.4), 0, 0.3, 0, 0.6, 0.2, 0.05, SKILL_COLORS.ice, 0.7, 0);
        else if ((e.type === 'armorReduction' || e.type === 'mrReduction') && Math.random() < 0.15 * k) vfx.particles.emit(u.pos.x + rand(-0.35, 0.35), rand(0.5, 1.7), u.pos.z + rand(-0.35, 0.35), 0, -0.6, 0, 0.5, 0.18, 0.04, e.type === 'mrReduction' ? COLORS.enemyB : COLORS.enemyA, 0.8, 0);
        else if ((e.type === 'atkBuff' || e.type === 'defBuff' || e.type === 'aspdBuff' || e.type === 'dmgReduction') && Math.random() < 0.12 * k) vfx.particles.emit(u.pos.x + rand(-0.4, 0.4), 0.2, u.pos.z + rand(-0.4, 0.4), 0, 1.6, 0, 0.7, 0.16, 0.03, e.type === 'defBuff' || e.type === 'dmgReduction' ? COLORS.allyB : COLORS.fireHot, 0.7, 0.2);
        else if (e.type === 'hot' && Math.random() < 0.15 * k) vfx.particles.emit(u.pos.x + rand(-0.4, 0.4), rand(0.3, 1.2), u.pos.z + rand(-0.4, 0.4), 0, 1.2, 0, 0.7, 0.2, 0.04, COLORS.shield, 0.7, 0.2);
      }
    }
  }
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
