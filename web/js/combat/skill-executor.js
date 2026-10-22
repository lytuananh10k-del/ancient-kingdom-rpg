// Vạn Kiếm Kỳ Trận – SkillExecutor: chạy kỹ năng mô tả bằng dữ liệu (js/data/skills.js).
// Tách riêng: chọn mục tiêu (TARGETING / READY) · logic hiệu ứng (hitEnemies / applyAllyEffects) · tính sát thương (dealDamage, js/12-combat.js)
// · animation (caster.anim) · VFX (skillVfx). Mọi bước chạy trên SkillTimeline theo thời gian mô phỏng nên không phụ thuộc FPS.
// Script thường (không phải module): nạp sau js/13-skills.js (dùng SkillAI, SKILLS), trước js/data/skills.js.
'use strict';

/* ---------- Chọn mục tiêu ---------- */
const TARGETING = {
  nearest: c => c.findTarget(),
  densest: (c, s) => SkillAI.densest(c, s.radius || 2.5),
  weakest: (c, s) => SkillAI.weakest(c, s.maxDist || Infinity),
  line: (c, s) => SkillAI.line(c, s.length || 10, s.width || 1.2),
  /** Tuyến sau: kẻ địch đánh xa ở xa nhất, không có thì kẻ xa nhất. */
  backline: c => {
    const foes = c.enemies(); let best = null, bs = -Infinity;
    for (const f of foes) { const s = f.pos.distanceTo(c.pos) + (f.def.ranged ? 6 : 0) - f.hp / f.maxHp * 2; if (s > bs) { bs = s; best = f; } }
    return best;
  },
  self: c => c.findTarget()   // kỹ năng lên bản thân / đồng minh vẫn cần 1 địch để quay mặt và để biết trận còn diễn ra
};
/* ---------- Điều kiện tung chiêu (chờ tối đa 4 s, xem Unit.castReady) ---------- */
// Tầm "địch ở gần": chiêu nổ quanh mình thì phải nằm trong bán kính nổ (trừ hao thân người), không thì chiêu trượt hết.
const readyRange = s => s.readyRange || (s.center === 'self' && s.radius ? s.radius - 0.3 : 3.5);
const READY = {
  allyHurt: (c, s) => c.allies().some(a => a.hp < a.maxHp * (s.hurtPct || 0.75)),
  enemyNear: (c, s) => SkillAI.countNear(c, readyRange(s)) >= 1,
  hurtOrNear: (c, s) => c.hp < c.maxHp * 0.5 || SkillAI.countNear(c, readyRange(s)) >= 1
};
const SKILL_TYPE_LABEL = { strike: 'Đơn mục tiêu', multi: 'Liên kích đơn mục tiêu', projectile: 'Phóng đạn', volley: 'Phóng nhiều mục tiêu', line: 'Xuyên tuyến', area: 'Diện rộng', zone: 'Vùng duy trì', dash: 'Đột kích', summon: 'Triệu hồi phi kiếm', support: 'Hỗ trợ' };
const SKILL_TARGET_LABEL = { nearest: 'Kẻ gần nhất', densest: 'Vùng địch đông nhất', weakest: 'Kẻ yếu nhất', line: 'Hướng trúng nhiều nhất', backline: 'Tuyến sau', self: 'Bản thân / đồng minh' };

/* ---------- Logic hiệu ứng ---------- */
/** Áp hiệu ứng lên danh sách địch. Trả về tổng sát thương gây ra (để hút máu). Mục tiêu đã chết được bỏ qua an toàn. */
function hitEnemies(caster, list, effects, ctx) {
  let dealt = 0;
  for (const u of list) {
    if (!u || !u.alive) continue;
    for (const e of effects) {
      if (!u.alive) break;
      switch (e.kind) {
        case 'damage': dealt += dealDamage(caster, u, e.mult, { skill: true, pen: e.pen || 0, knock: e.knock || 0, from: ctx.center || caster.pos, color: ctx.color, heavy: !!e.heavy }); break;
        case 'dot': u.fx.push({ stat: 'dot', dot: e.mult * (STAR.skill[caster.star] || 1), dur: e.dur, tick: e.tick || 0.5, src: caster, tag: ctx.id + ':dot' }); break;
        case 'slow': applySlow(u, e.amount, e.dur); break;
        case 'stun': applyStun(u, e.dur); break;
        case 'freeze': applyStun(u, e.dur, 'freeze'); break;
        case 'debuff':
          if (!u.fx.has(ctx.id + ':debuff')) floatText(u.chest(_v2.clone()), e.label || '−' + e.stat, '#ffb0a0', 0.75);
          u.fx.push({ stat: e.stat, mul: e.mul, add: e.add, dur: e.dur, tag: ctx.id + ':debuff' });
          combatLog.debuffs = (combatLog.debuffs || 0) + 1;
          break;
      }
    }
  }
  const ls = effects.find(e => e.kind === 'damage' && e.lifesteal);
  if (ls && dealt > 0 && caster.alive) healUnit(caster, caster, dealt * ls.lifesteal);
  return dealt;
}
/** Chọn đồng minh cho hiệu ứng hỗ trợ: self | lowest (máu % thấp nhất, count người) | near (trong radius quanh caster) | all. */
function allyTargets(caster, e) {
  const allies = caster.allies();
  switch (e.targets || 'self') {
    case 'lowest': return allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, e.count || 1);
    case 'near': return allies.filter(a => a.pos.distanceTo(caster.pos) <= (e.radius || 3.5));
    case 'all': return allies;
    default: return caster.alive ? [caster] : [];
  }
}
/** Hồi máu / hồi theo thời gian / lá chắn / tăng chỉ số / tự hiến máu. Lượng hồi và lá chắn nhân sức mạnh kỹ năng (sao × tộc/hệ). */
function applyAllyEffects(caster, effects, ctx) {
  const power = (STAR.skill[caster.star] || 1) * (caster.bonus ? caster.bonus.skill : 1);
  for (const e of effects) {
    if (e.kind === 'selfDamage') { if (caster.alive) caster.hp = Math.max(1, caster.hp - caster.hp * e.pct); continue; }
    for (const u of allyTargets(caster, e)) {
      switch (e.kind) {
        case 'heal': healUnit(caster, u, (caster.maxHp * (e.pct || 0) + caster.atkNow() * (e.atk || 0)) * power); break;
        case 'hot': { const total = caster.maxHp * e.pct * power, tick = 0.5; u.fx.push({ stat: 'hot', hot: total * tick / e.dur, dur: e.dur, tick, src: caster, tag: ctx.id + ':hot' }); break; }
        case 'shield': giveShield(u, caster.maxHp * e.pct * power, e.dur || 5); break;
        case 'buff':
          if (!u.fx.has(ctx.id + ':buff')) floatText(u.chest(_v2.clone()), e.label || '+' + e.stat, '#ffe08a', 0.75);
          u.fx.push({ stat: e.stat, mul: e.mul, add: e.add, dur: e.dur, tag: ctx.id + ':buff' });
          combatLog.buffs = (combatLog.buffs || 0) + 1;
          break;
      }
    }
  }
}
const enemiesNear = (caster, center, r) => caster.enemies().filter(f => Math.hypot(f.pos.x - center.x, f.pos.z - center.z) <= r);

/* ---------- VFX (chỉ hình ảnh, không có logic) ---------- */
const skillVfx = {
  impact(pos, color, n = 18) { vfx.particles.burst(_v1.set(pos.x, 1.1, pos.z), color, n, 6, 0.4, 0.28, { drag: 3, gravity: 3 }); },
  slash(caster, color, tilt) { vfx.slash(caster.pos, caster.yaw, color, Math.max(2, caster.def.range * 1.05), tilt, 0.24, 1.15); },
  area(center, r, color, thunder) {
    vfx.shockwave(new V3(center.x, 0, center.z), r * 1.2, color, 0.55, 0.1);
    vfx.magicCircle(center, r, color, COLORS.white, { reveal: 0.12, life: 0.6, spin: 2, alpha: 0.85 });
    vfx.particles.burst(_v1.set(center.x, 0.6, center.z), color, Math.round(30 + r * 10), 7, 0.8, 0.45, { up: 3, drag: 2 });
    if (thunder) lightningBolt(new V3(center.x + rand(-2, 2), 16, center.z + rand(-2, 2)), new V3(center.x, 0.1, center.z), color, 0.25);
    combatCam.shake(0.2 + r * 0.03);
  }
};

/* ---------- Thi triển ---------- */
function buildDataSkill(spec, caster, target, release) {
  const tl = new SkillTimeline(spec.name, caster);
  const T = Object.assign({ windup: 0.3, impact: 0.45, end: 0.9 }, spec.timing);
  const color = SKILL_COLORS[spec.color] || (caster.team === 'ally' ? COLORS.allyA : COLORS.enemyA);
  const ctx = { id: spec.id, color, center: null };
  const effects = spec.effects || [], ally = spec.ally || [];
  const animName = spec.anim || (caster.def.animSet && caster.def.animSet.cast) || 'SkillCast';
  const ultimate = animName === 'UltimateCast';
  /** Mục tiêu còn sống, hoặc chọn lại theo cùng luật nếu mục tiêu đã chết giữa chừng. */
  const live = () => (target && target.alive ? target : (TARGETING[spec.target] || TARGETING.nearest)(caster, spec));
  let end = T.end;

  tl.at(0, 'AnimationEvent', () => {
    if (target && target.alive) caster.snapFace(target.pos);
    if (ultimate) caster.anim.hold('UltimateCast', true);
    else caster.anim.play(animName, { dur: T.end, windup: T.windup, active: T.impact, hold: Math.max(0.05, T.end - T.impact - 0.2) });
  });
  tl.at(0, 'SpawnVFX', () => vfx.magicCircle(caster.pos, spec.circle || 1.3, color, COLORS.white, { reveal: 0.25, life: T.end + 0.2, alpha: 0.8, spin: 2 }));
  tl.at(T.windup, 'PlaySound', () => Sfx.whoosh());

  switch (spec.type) {
    case 'strike':
      tl.at(T.impact, 'ApplyDamage', () => {
        const tg = live(); if (!tg) return;
        caster.snapFace(tg.pos); ctx.center = tg.pos;
        if (!caster.def.ranged) skillVfx.slash(caster, color, 0.3);
        skillVfx.impact(tg.pos, color, 26); hitStop(0.05); combatCam.shake(0.15);
        hitEnemies(caster, spec.radius ? enemiesNear(caster, tg.pos, spec.radius) : [tg], effects, ctx);
      });
      break;
    case 'multi':
      for (let i = 0; i < spec.hits; i++) {
        const at = T.impact + i * (spec.gap || 0.15);
        tl.at(at, 'ApplyDamage', () => {
          const tg = live(); if (!tg) return;
          caster.snapFace(tg.pos); skillVfx.slash(caster, color, i % 2 ? -0.5 : 0.5); skillVfx.impact(tg.pos, color);
          hitEnemies(caster, [tg], effects, ctx); hitStop(0.02);
        });
        end = Math.max(end, at + 0.2);
      }
      break;
    case 'projectile':
    case 'volley':
      for (let i = 0; i < (spec.count || 1); i++) {
        const at = T.impact + i * (spec.gap || 0.12);
        tl.at(at, 'LaunchProjectile', () => {
          let tg;
          if (spec.type === 'volley') { const foes = caster.enemies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp); tg = foes[i % Math.max(1, foes.length)]; }
          else tg = live();
          if (!tg) return;
          Projectiles.spawn({ src: caster, target: tg, pos: caster.rig.getSocket('weaponTip').getWorldPosition(new V3()), speed: spec.speed || 16, homing: true, turn: 6,
            color, size: spec.size || 0.5, life: 3, radius: 0.9,
            onHit: (p, u) => {
              const c = new V3(p.pos.x, 0, p.pos.z); ctx.center = c;
              hitEnemies(caster, spec.radius ? enemiesNear(caster, c, spec.radius) : [u], effects, ctx);
              if (spec.radius) skillVfx.area(c, spec.radius, color, spec.color === 'thunder'); else skillVfx.impact(p.pos, color);
            } });
        });
        end = Math.max(end, at + 0.15);
      }
      break;
    case 'line':
      tl.at(T.impact, 'LaunchProjectile', () => {
        const tg = live(); if (tg) caster.snapFace(tg.pos);
        const dir = new V3(Math.sin(caster.yaw), 0, Math.cos(caster.yaw)), v = spec.speed || 20;
        vfx.slash(caster.pos, caster.yaw, color, 2.4, Math.PI / 2, 0.25, 1.1);
        Projectiles.spawn({ src: caster, target: null, pierce: true, hitSet: new Set(), pos: caster.pos.clone().setY(1.1).addScaledVector(dir, 0.8),
          vel: dir.clone().multiplyScalar(v), speed: v, color, size: 0.5, life: (spec.length || 10) / v, radius: spec.width || 1.2,
          update: p => { vfx.particles.emit(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0.15, 0.45, 0.05, color, 0.9, 0); },
          onHit: (p, u) => { ctx.center = caster.pos; hitEnemies(caster, [u], effects, ctx); skillVfx.impact(u.pos, color); hitStop(0.02); } });
      });
      break;
    case 'area':
      tl.at(T.impact, 'ApplyDamage', () => {
        const tg = live();
        const c = spec.center === 'self' ? caster.pos.clone() : tg ? tg.pos.clone() : null; if (!c) return;
        ctx.center = c;
        skillVfx.area(c, spec.radius, color, spec.color === 'thunder'); hitStop(0.05);
        hitEnemies(caster, enemiesNear(caster, c, spec.radius), effects, ctx);
      });
      break;
    case 'zone':
      tl.at(T.impact, 'SpawnVFX', () => {
        const tg = live(); if (!tg) return;
        const c = tg.pos.clone(); c.y = 0; ctx.center = c;
        vfx.magicCircle(c, spec.radius, color, COLORS.white, { reveal: 0.2, life: spec.dur, spin: 1.5, alpha: 0.9 });
        skillVfx.area(c, spec.radius * 0.8, color, false);
        let t = 0, acc = 0, alive = true;
        // Vùng duy trì: tự dừng khi hết giờ hoặc trận kết thúc; vfx.clear() khi sang vòng sẽ gọi cleanup.
        vfx.add({
          update: dt => {
            if (!alive || battle.phase !== 'fight') return false;
            t += dt; acc += dt;
            if (Math.random() < 0.7) vfx.particles.emit(c.x + rand(-spec.radius, spec.radius) * 0.8, 0.2, c.z + rand(-spec.radius, spec.radius) * 0.8, 0, rand(1, 2.5), 0, 0.6, 0.35, 0.05, color, 0.8, 0.5);
            while (acc >= (spec.tick || 0.5)) { acc -= spec.tick || 0.5; hitEnemies(caster, enemiesNear(caster, c, spec.radius), effects, ctx); combatLog.zoneTicks = (combatLog.zoneTicks || 0) + 1; }
            return t < spec.dur;
          },
          cleanup: () => { alive = false; }
        });
      });
      break;
    case 'dash': {
      const st = { from: null, to: null };
      tl.at(T.windup, 'AnimationEvent', () => {
        const tg = live(); if (!tg) return;
        st.from = caster.pos.clone();
        const dx = tg.pos.x - caster.pos.x, dz = tg.pos.z - caster.pos.z, l = Math.hypot(dx, dz) || 1, lim = BOARD.tile * 4 - 0.5;
        st.to = new V3(clamp(tg.pos.x + dx / l * 1.1, -lim, lim), 0, clamp(tg.pos.z + dz / l * 1.1, -lim, lim));   // xuất hiện sau lưng mục tiêu
        combatLog.dashes = (combatLog.dashes || 0) + 1;
      });
      tl.track(T.windup, T.impact, 'AnimationEvent', k => {
        if (!st.to) return;
        caster.pos.lerpVectors(st.from, st.to, easeOut(k));
        vfx.particles.emit(caster.pos.x, rand(0.4, 1.6), caster.pos.z, 0, 0, 0, 0.4, 0.45, 0.08, color, 0.7, 0);
      });
      tl.at(T.impact, 'ApplyDamage', () => {
        const tg = live(); if (!tg) return;
        caster.snapFace(tg.pos); ctx.center = caster.pos.clone();
        skillVfx.slash(caster, color, 0); skillVfx.impact(tg.pos, color, 30); hitStop(0.06); combatCam.shake(0.25);
        hitEnemies(caster, spec.radius ? enemiesNear(caster, tg.pos, spec.radius) : [tg], effects, ctx);
        if (spec.radius) skillVfx.area(tg.pos, spec.radius, color, false);
      });
      break;
    }
    case 'summon':
      tl.at(T.impact, 'SpawnVFX', () => {
        const n = (spec.count || 4) + (caster.star - 1), swarm = new SwordSwarm(n), swords = [];
        for (let i = 0; i < n; i++) swords.push({ a: i / n * TAU, strike: null, pos: new V3(), dir: new V3(0, 1, 0) });
        let t = 0, next = 0.3, rr = 0, done = false;
        const finish = () => { if (done) return; done = true; swarm.dispose(); };
        combatLog.summons = (combatLog.summons || 0) + 1;
        vfx.add({
          update: dt => {
            if (done) return false;
            if (!caster.alive || battle.phase !== 'fight' || t > spec.dur) { finish(); return false; }
            t += dt; next -= dt;
            if (next <= 0) {   // lần lượt từng thanh lao vào kẻ địch gần nhất
              next = spec.interval || 0.7;
              const tg = caster.findTarget(), s = swords[rr++ % n];
              if (tg && !s.strike) s.strike = { t: 0, from: s.pos.clone(), tg };
            }
            swords.forEach((s, i) => {
              if (s.strike) {
                const st = s.strike; st.t += dt / 0.2;
                const to = st.tg.alive ? st.tg.chest(_v3) : s.pos;
                s.pos.lerpVectors(st.from, to, Math.min(1, st.t)); s.dir.subVectors(to, st.from).normalize();
                if (st.t >= 1) { if (st.tg.alive) { ctx.center = s.pos; hitEnemies(caster, [st.tg], effects, ctx); skillVfx.impact(s.pos, color, 10); } s.strike = null; }
              } else {
                s.a += dt * 2.2;
                const target = _v1.set(caster.pos.x + Math.sin(s.a) * 1.3, 2.1 + Math.sin(t * 3 + i) * 0.15, caster.pos.z + Math.cos(s.a) * 1.3);
                s.pos.lerp(target, Math.min(1, dt * 10)); s.dir.set(Math.cos(s.a), 0.2, -Math.sin(s.a)).normalize();
              }
              swarm.write(i, s.pos, s.dir, 0.55, 1);
            });
            swarm.setCount(n); swarm.commit();
            return true;
          },
          cleanup: finish
        });
      });
      break;
    case 'support':
    default:
      break;
  }
  if (ally.length) tl.at(T.impact + (spec.allyDelay || 0), 'ApplyStatusEffect', () => applyAllyEffects(caster, ally, ctx));
  tl.at(end, 'Cleanup', () => release());
  tl.onCleanup(c => { if (ultimate) caster.anim.hold('UltimateCast', false); if (c) release(); });
  return tl;
}

/** Tạo đối tượng kỹ năng (cùng giao diện với kỹ năng viết tay trong SKILLS: name, desc, pick, ready, build). */
function makeDataSkill(id, spec) {
  spec.id = id;
  return {
    id, name: spec.name, desc: spec.desc, data: spec,
    meta: { type: SKILL_TYPE_LABEL[spec.type] || spec.type, target: SKILL_TARGET_LABEL[spec.target] || spec.target,
      mult: (spec.effects || []).filter(e => e.kind === 'damage').reduce((a, e) => a + e.mult * (spec.hits || spec.count || 1), 0),
      duration: spec.dur || Math.max(0, ...(spec.effects || []).concat(spec.ally || []).map(e => e.dur || 0)),
      effects: [...new Set((spec.effects || []).concat(spec.ally || []).map(e => e.kind))] },
    pick: c => (TARGETING[spec.target] || TARGETING.nearest)(c, spec),
    ready: spec.ready ? c => READY[spec.ready](c, spec) : undefined,
    build: (caster, target, release) => buildDataSkill(spec, caster, target, release)
  };
}
