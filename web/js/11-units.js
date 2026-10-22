// Vạn Kiếm Kỳ Trận – Định nghĩa tướng, Unit, AnimationController (mục 14–15)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 14. Định nghĩa đơn vị & kỹ năng (SkillDefinitions)
 * ===================================================================*/
/* LOOKS, ROLES, UNIT_DEFS, STAR: xem js/data/champions.js (nạp trước file này). */
/** Nhà máy rig riêng theo tướng (vd. mô hình GLB nhập cho một tướng): RIG_FACTORIES[id] = () => rig. Không có thì dùng rig thủ tục. */
const RIG_FACTORIES = {};

/* =====================================================================
 * 15. Đơn vị chiến đấu (Unit) – logic + AnimationController
 * ===================================================================*/
const units = [];
let battle = { phase: 'prep', round: 1, time: 0, result: null, selected: null, speed: 1, paused: false, bench: false };
const ATTACK_TIMING = {
  melee: { Attack01: { dur: 0.62, windup: 0.22, active: 0.3 }, Attack02: { dur: 0.6, windup: 0.18, active: 0.27 }, Attack03: { dur: 0.72, windup: 0.3, active: 0.38 }, HeavyAttack: { dur: 0.95, windup: 0.32, active: 0.6 } },
  ranged: { Attack01: { dur: 0.7, windup: 0.32, active: 0.4 }, Attack02: { dur: 0.7, windup: 0.3, active: 0.38 }, Attack03: { dur: 0.75, windup: 0.34, active: 0.42 }, HeavyAttack: { dur: 0.9, windup: 0.45, active: 0.55 } }
};

/** AnimationController: ánh xạ sự kiện logic → rig (thủ tục hoặc GLB), quản lý vệt kiếm. */
class AnimationController {
  constructor(unit) { this.unit = unit; }
  get rig() { return this.unit.rig; }
  locomotion(speed) { this.rig.setLoco(speed); }
  play(name, timing) { this.rig.playAction(name, timing); }
  hold(name, on) { this.rig.hold(name, on); }
  trail(on) { this.rig.setTrail && this.rig.setTrail(on); }
  hit(fromPos, strength) {
    const u = this.unit, dx = u.pos.x - fromPos.x, dz = u.pos.z - fromPos.z, len = Math.hypot(dx, dz) || 1;
    const s = Math.sin(-u.yaw), c = Math.cos(-u.yaw);
    const lx = (dx * c + dz * s) / len, lz = (-dx * s + dz * c) / len; // hướng bị đẩy trong hệ trục nhân vật
    this.rig.hitReact(lx, lz, strength);
  }
  look(target) { this.rig.setLookTarget(target ? target.pos : null); }
}

let unitIdSeq = 0;
class Unit {
  constructor(key, team, c, r, star = 1) {
    const d = UNIT_DEFS[key];
    this.id = ++unitIdSeq; this.key = key; this.def = d; this.team = team; this.homeTile = { c, r };
    this.star = star; this.bonus = defaultBonus();
    this.U = ShaderLibrary.makeUnitUniforms(team === 'ally' ? 0x9fd8ff : 0xff6a50);
    this.U.uEdgeColor.value.set(team === 'ally' ? 0x9fd8ff : 0xff5030);
    this.rig = RIG_FACTORIES[key] && team === 'ally' ? RIG_FACTORIES[key]() : new CharacterRig(LOOKS[d.look], this.U);
    scene.add(this.rig.root);
    this.rig.root.scale.setScalar(this.modelScale());
    this.fx = new EffectSet(this);
    this.anim = new AnimationController(this);
    this.pos = tileCenter(c, r); this.yaw = team === 'ally' ? 0 : Math.PI; this.vel = new V3();
    this.fsm = new AnimationStateMachine(this);
    this.setupStates();
    this.reset(1);
  }
  get alive() { return this.hp > 0; }
  modelScale() { return STAR.scale[this.star] * ((this.def.model && this.def.model.scale) || 1); }
  /* Chỉ số hiện hành = chỉ số trận (gốc × sao × tộc/hệ → trang bị, tính 1 lần ở reset) × hiệu ứng tạm thời (EffectSet) × nội tại. */
  atkNow() { const p = this.def.passive; return this.atk * this.fx.mul('atk') * (p && p.lowHpAtk ? 1 + p.lowHpAtk * (1 - this.hp / this.maxHp) : 1); }
  defNow() { return Math.max(0, this.def_ * this.fx.mul('def') + this.fx.sum('def')); }
  aspdNow() { return this.def.aspd * this.bonus.aspd * this.fx.mul('aspd'); }
  speedNow() { return this.def.speed * this.fx.mul('speed'); }
  reset(scale) {
    const d = this.def, b = this.bonus, s = this.star;
    // Gốc → × sao → × (1 + Σ% tộc/hệ) → trang bị (phẳng). Làm tròn: máu & giáp số nguyên, công 1 chữ số thập phân. Không sửa UNIT_DEFS.
    this.maxHp = Math.round(d.hp * scale * STAR.hp[s] * b.hp + (b.hpAdd || 0)); this.hp = this.maxHp;
    this.atk = Math.round(d.atk * scale * STAR.atk[s] * b.atk * 10) / 10;
    this.def_ = Math.round(d.def * Math.sqrt(scale) * (b.defMul || 1) + b.def);
    this.mana = Math.min(d.mana, d.mana0 + b.mana0); this.maxMana = d.mana; this.shield = 0; this.shieldTime = 0;
    this.status = { stun: 0, frozen: 0, burn: 0, burnTick: 0, burnDmg: 0 };
    this.fx.clear();
    this.target = null; this.retarget = 0; this.atkCd = rand(0, 0.4); this.attackIdx = 0; this.dashCd = 0;
    this.ccImmune = 0; this.avoid = null; this.stuckT = 0; this.progT = 0; this.progD = Infinity; this.fullManaT = 0;
    this.knock = new V3(); this.deathT = 0; this.casting = null; this.flash = 0; this.manaLock = false;
    tileCenter(this.homeTile.c, this.homeTile.r, this.pos); this.yaw = this.team === 'ally' ? 0 : Math.PI;
    this.U.uDissolve.value = 0; this.rig.root.visible = true;
    ['Death', 'Stun', 'Victory', 'UltimateCast'].forEach(h => this.anim.hold(h, false));
    if (this.rig.holdW) for (const k in this.rig.holdW) this.rig.holdW[k] = 0;
    this.rig.stopAction && this.rig.stopAction();
    if (this.shieldFx) { this.shieldFx.kill(); this.shieldFx = null; }
    this.fsm.set('idle');
  }
  setupStates() {
    const self = this;
    this.fsm
      .add('idle', { update() { self.anim.locomotion(0); if (battle.phase === 'fight') self.fsm.set('move'); } })
      .add('move', {
        update(dt) {
          if (battle.phase !== 'fight') { self.fsm.set('idle'); return; }
          if (self.castReady(dt)) { self.fsm.set('cast'); return; }
          const t = self.findTarget();
          if (!t) { self.anim.locomotion(0); return; }
          const dist = Math.hypot(t.pos.x - self.pos.x, t.pos.z - self.pos.z);
          if (self.def.ranged && self.kite(dt)) return;            // đánh xa: lùi khi cận chiến địch áp sát
          self.faceTo(t.pos, dt, 10);
          if (dist <= self.def.range + 0.35) {
            self.anim.locomotion(0); self.stuckT = 0; self.progD = dist;
            if (self.atkCd <= 0) self.fsm.set('attack');
          } else if (self.def.dash && dist > 6.5 && self.dashCd <= 0) {
            self.fsm.set('dash');
          } else {
            self.steerTo(t, dt);
            self.checkStuck(t, dist, dt);
          }
        }
      })
      .add('attack', {
        maxTime: 2.5, fallback: 'move',
        enter() { self.startAttack(); },
        update() { self.anim.locomotion(0); },
        exit() { self.anim.trail(false); if (self.attackTl && !self.attackTl.done) self.attackTl.cancel(); }
      })
      .add('dash', {
        maxTime: 0.6, fallback: 'move',
        enter() {
          const t = self.target; self.dashCd = 4; self.anim.play('Dash', { dur: 0.36, windup: 0.06, active: 0.14 });
          self.dashDir = t ? new V3(t.pos.x - self.pos.x, 0, t.pos.z - self.pos.z).normalize() : new V3(0, 0, self.team === 'ally' ? 1 : -1);
          Sfx.whoosh();
        },
        update(dt, time) {
          if (time > 0.06 && time < 0.3) {
            self.pos.addScaledVector(self.dashDir, 16 * dt);
            if (Math.random() < 0.8) vfx.particles.emit(self.pos.x + rand(-0.3, 0.3), rand(0.3, 1.6), self.pos.z + rand(-0.3, 0.3), -self.dashDir.x * 2, 0.3, -self.dashDir.z * 2, 0.35, 0.35, 0.05, self.team === 'ally' ? COLORS.allyA : COLORS.enemyA, 0.6);
          }
          const t = self.target;
          if (t && t.alive && t.pos.distanceTo(self.pos) <= self.def.range) { self.fsm.set('move'); return; }
          if (time > 0.36) self.fsm.set('move');
        }
      })
      .add('cast', {
        enter() { self.startCast(); },
        locked() { return true; },
        update() { self.anim.locomotion(0); if (!self.casting || self.casting.released) self.fsm.set('move'); },
        exit() { self.anim.hold('UltimateCast', false); }
      })
      .add('stun', {
        enter() { self.anim.hold('Stun', true); },
        update() { if (self.status.stun <= 0) self.fsm.set('move'); },
        exit() { self.anim.hold('Stun', false); self.ccImmune = 0.8; }   // miễn khống chế ngắn sau khi hết choáng
      })
      .add('knockback', {
        maxTime: 1, fallback: 'move',
        enter() { self.anim.play('Knockback', { dur: 0.6, windup: 0.08, active: 0.2 }); },
        update(dt, time) { self.pos.addScaledVector(self.knock, dt); self.knock.multiplyScalar(Math.max(0, 1 - 6 * dt)); if (time > 0.55) self.fsm.set(self.status.stun > 0 ? 'stun' : 'move'); }
      })
      .add('dead', {
        enter() { self.anim.hold('Death', true); self.deathT = 0; if (self.casting && !self.casting.tl.done) self.casting.tl.cancel(); },
        update(dt) { self.deathT += dt; self.U.uDissolve.value = clamp((self.deathT - 1.1) / 1.4, 0, 1.05);
          if (self.deathT > 1.1 && self.deathT < 2.4 && Math.random() < 0.6) { const p = self.pos; vfx.particles.emit(p.x + rand(-0.5, 0.5), rand(0.1, 0.6), p.z + rand(-0.5, 0.5), 0, rand(1, 2.5), 0, 0.8, 0.18, 0.02, self.team === 'ally' ? COLORS.allyA : COLORS.enemyA, 0.8, 0.5); }
          if (self.deathT > 2.6) self.rig.root.visible = false; }
      })
      .add('victory', { enter() { self.anim.hold('Victory', true); }, update() { self.anim.locomotion(0); }, exit() { self.anim.hold('Victory', false); } });
  }
  enemies() { return units.filter(u => u.team !== this.team && u.alive); }
  allies() { return units.filter(u => u.team === this.team && u.alive); }
  /** Chọn mục tiêu theo vai trò (xét lại mỗi 0,6 s):
   *  - mặc định: gần nhất, có ưu tiên giữ mục tiêu cũ để không đổi qua đổi lại;
   *  - sát thủ: ưu tiên tuyến sau đánh xa và kẻ máu thấp;
   *  - cận chiến: tránh dồn vào mục tiêu đã có ≥ 2 đồng minh cận chiến đang đánh (tản ra);
   *  - bỏ qua tạm thời mục tiêu vừa bị kẹt đường (this.avoid). */
  findTarget() {
    if (this.target && this.target.alive && this.retarget > 0) return this.target;
    const role = this.def.role, melee = !this.def.ranged;
    let best = null, bs = Infinity;
    for (const pass of [0, 1]) {   // lượt 2: bỏ điều kiện tránh nếu không còn ai khác
      for (const u of units) {
        if (u.team === this.team || !u.alive) continue;
        if (pass === 0 && this.avoid && this.avoid.t > 0 && this.avoid.unit === u) continue;
        const d = Math.hypot(u.pos.x - this.pos.x, u.pos.z - this.pos.z);
        let sc = d;
        if (role === 'assassin') sc = d * 0.4 + (u.def.ranged ? -2.5 : 0) + (u.hp / u.maxHp) * 2.5;
        if (role === 'marksman' && d <= this.def.range) sc = d - 3 + (u.hp / u.maxHp) * 3;   // xạ thủ: trong tầm thì bắn kẻ còn ít máu nhất
        if (u === this.target) sc -= 1;
        if (melee) {
          let crowd = 0;
          for (const m of units) if (m !== this && m.team === this.team && m.alive && !m.def.ranged && m.target === u && Math.hypot(m.pos.x - u.pos.x, m.pos.z - u.pos.z) < m.def.range + 0.6) crowd++;
          sc += Math.max(0, crowd - 1) * 1.2;
        }
        if (sc < bs) { bs = sc; best = u; }
      }
      if (best) break;
    }
    if (best !== this.target) { this.progD = Infinity; this.stuckT = 0; }
    this.target = best; this.retarget = 0.6; this.anim.look(best);
    return best;
  }
  /** Đủ linh lực và kỹ năng có mục tiêu hợp lệ; kỹ năng có điều kiện (ready) được chờ tối đa 4 s cho đúng thời điểm. */
  castReady(dt) {
    const sk = SKILLS[this.def.skill];
    if (!sk || this.manaLock || this.mana < this.maxMana) { this.fullManaT = 0; return false; }
    this.fullManaT += dt;
    if (sk.ready && !sk.ready(this) && this.fullManaT < 4) return false;
    return !!(sk.pick ? sk.pick(this) : this.findTarget());
  }
  /** Đánh xa: khi cận chiến địch áp sát (< 2,4 m) mà chưa tới lượt đánh thì lùi ra, miễn vẫn còn trong tầm mục tiêu và trong đài. */
  kite(dt) {
    if (this.atkCd < 0.2) return false;
    let th = null, td = 2.4;
    for (const u of units) if (u.team !== this.team && u.alive && !u.def.ranged) { const d = Math.hypot(u.pos.x - this.pos.x, u.pos.z - this.pos.z); if (d < td) { td = d; th = u; } }
    if (!th) return false;
    const ax = this.pos.x - th.pos.x, az = this.pos.z - th.pos.z, l = Math.hypot(ax, az) || 1, sp = this.speedNow() * 0.75;
    const nx = this.pos.x + ax / l * sp * dt, nz = this.pos.z + az / l * sp * dt, lim = BOARD.tile * 4 - 0.4;
    if (Math.abs(nx) > lim || Math.abs(nz) > lim) return false;                       // sát mép đài: đứng lại đánh
    const t = this.target;
    if (t && t.alive && Math.hypot(t.pos.x - nx, t.pos.z - nz) > this.def.range + 0.2) return false;   // lùi nữa là ra khỏi tầm
    this.pos.x = nx; this.pos.z = nz;
    this.faceTo(_v1.set(nx + ax, 0, nz + az), dt, 12); this.anim.locomotion(sp);
    combatLog.kites += dt;
    return true;
  }
  /** Tiến tới mục tiêu: cận chiến nhắm ô đánh quanh mục tiêu (tản theo góc theo thứ tự trong nhóm cùng đánh),
   *  đánh xa dừng ở rìa tầm; lách sang bên khi đồng đội chắn phía trước. */
  steerTo(t, dt) {
    let ax = this.pos.x - t.pos.x, az = this.pos.z - t.pos.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
    const ranged = !!this.def.ranged, reachD = ranged ? this.def.range - 0.4 : Math.max(0.9, this.def.range * 0.8);
    if (!ranged) {
      let k = 0;
      for (const u of units) if (u !== this && u.team === this.team && u.alive && !u.def.ranged && u.target === t && u.id < this.id) k++;
      if (k > 0) { const ang = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.8, c = Math.cos(ang), sn = Math.sin(ang); const rx = ax * c - az * sn; az = ax * sn + az * c; ax = rx; }
    }
    let vx = t.pos.x + ax * reachD - this.pos.x, vz = t.pos.z + az * reachD - this.pos.z;
    let vl = Math.hypot(vx, vz);
    if (vl < 0.05) { vx = t.pos.x - this.pos.x; vz = t.pos.z - this.pos.z; vl = Math.hypot(vx, vz) || 1; }
    vx /= vl; vz /= vl;
    let sx = 0, sz = 0;
    for (const o of units) {
      if (o === this || !o.alive || o.team !== this.team) continue;
      const ox = o.pos.x - this.pos.x, oz = o.pos.z - this.pos.z, od = Math.hypot(ox, oz);
      if (od > 1.8 || od < 1e-3) continue;
      const ahead = (ox * vx + oz * vz) / od; if (ahead < 0.3) continue;
      const side = -ox * vz + oz * vx, sgn = side > 0 || (side === 0 && this.id % 2) ? -1 : 1, w = (1.8 - od) / 1.8 * ahead;
      sx += -vz * sgn * w; sz += vx * sgn * w;   // vuông góc hướng đi, về phía không có đồng đội
    }
    vx += sx * 1.4; vz += sz * 1.4; const l2 = Math.hypot(vx, vz) || 1;
    const sp = this.speedNow();
    this.vel.set(vx / l2 * sp, 0, vz / l2 * sp); this.pos.addScaledVector(this.vel, dt); this.anim.locomotion(sp);
  }
  /** Kẹt đường: 1,2 s mà khoảng cách tới mục tiêu không giảm được 0,2 m mỗi nửa giây → bỏ qua mục tiêu đó 2,5 s. */
  checkStuck(t, dist, dt) {
    this.progT += dt;
    if (this.progT < 0.5) return;
    this.stuckT = this.progD - dist < 0.2 ? this.stuckT + this.progT : 0;
    this.progT = 0; this.progD = dist;
    if (this.stuckT >= 1.2) { this.avoid = { unit: t, t: 2.5 }; this.retarget = 0; this.stuckT = 0; combatLog.unstuck++; }
  }
  faceTo(p, dt, k) { const want = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.yaw += angDiff(this.yaw, want) * Math.min(1, k * dt); }
  snapFace(p) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
  get forward() { return _v1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  chest(out = new V3()) { return out.set(this.pos.x, 1.3 * (this.def.look === 'mathu' ? 1.25 : 1), this.pos.z); }

  /** Đòn đánh thường: mini-timeline với ApplyDamage / LaunchProjectile đúng khung va chạm. */
  startAttack() {
    const t = this.findTarget(); if (!t) { this.fsm.set('move'); return; }
    TraitEvents.emit('onAttack', this, t);
    this.snapFace(t.pos);
    const ranged = !!this.def.ranged;
    const seq = (this.def.animSet && this.def.animSet.attack) || ['Attack01', 'Attack02', 'Attack03', 'HeavyAttack'];
    const name = seq[this.attackIdx % seq.length];
    this.attackIdx++;
    const tim = ATTACK_TIMING[ranged ? 'ranged' : 'melee'][name];
    const heavy = name === 'HeavyAttack';
    this.anim.play(name, tim);
    this.atkCd = 1 / this.aspdNow();
    const act = this.rig.action || null;   // rig thủ tục: đo độ lệch giữa tư thế va chạm và lúc gây sát thương
    const tl = new SkillTimeline(name, this);
    tl.at(tim.windup, 'AnimationEvent', () => { if (!ranged) { this.anim.trail(true); Sfx.whoosh(); } });
    tl.at(tim.windup + 0.02, 'SpawnVFX', () => {
      if (ranged) return;
      const col = this.team === 'ally' ? COLORS.allyA : COLORS.enemyA;
      const tilt = name === 'Attack03' ? Math.PI / 2 : name === 'Attack02' ? -0.25 : name === 'HeavyAttack' ? 0 : 0.25;
      if (heavy && this.rig.weaponType !== 'spear' && this.rig.weaponType !== 'claws') { vfx.slash(this.pos, this.yaw, col, 2.6, 0, 0.35, 0.9); vfx.slash(this.pos, this.yaw + Math.PI, col, 2.6, 0, 0.35, 0.9); }
      else vfx.slash(this.pos, this.yaw, col, this.def.range * 0.95, tilt, 0.24, 1.1, name === 'Attack02');
    });
    tl.at(tim.active, ranged ? 'LaunchProjectile' : 'ApplyDamage', () => {
      if (act && this.rig.action === act) { combatLog.syncChecks++; combatLog.syncMaxErr = Math.max(combatLog.syncMaxErr, Math.abs(act.t - act.ae)); }
      if (!t.alive) return;
      if (ranged) Projectiles.basic(this, t, heavy);
      else if (t.pos.distanceTo(this.pos) <= this.def.range + 0.9) {
        dealDamage(this, t, heavy ? 1.6 : 1, { heavy, knock: heavy ? 3 : 0 });
        hitStop(heavy ? 0.07 : 0.035); combatCam.shake(heavy ? 0.22 : 0.08);
      }
    });
    tl.at(tim.active + 0.12, 'AnimationEvent', () => this.anim.trail(false));
    tl.at(tim.dur, 'Cleanup', () => { if (this.fsm.name === 'attack') this.fsm.set('move'); });
    this.attackTl = runTimeline(tl);
  }
  startCast() {
    const skill = SKILLS[this.def.skill], t = skill && (skill.pick ? skill.pick(this) : this.findTarget());
    if (!skill || !t) { this.fsm.set('move'); return; }
    combatLog.casts[this.def.skill] = (combatLog.casts[this.def.skill] || 0) + 1;
    if (skill.ready && !skill.ready(this)) combatLog.forcedCasts = (combatLog.forcedCasts || 0) + 1;
    this.mana = 0;
    this.casting = { released: false, tl: null };
    if (this.tstate) this.tstate.castSeq++;   // Pháp Tu (6): mỗi lần thi triển mới được nổ thêm 1 lần trên mỗi mục tiêu
    showBanner(this.team === 'ally' && skill.allyName ? skill.allyName : skill.name, this.team);
    this.casting.tl = runTimeline(skill.build(this, t, () => { if (this.casting) this.casting.released = true; }));
    TraitEvents.emit('onSkillCast', this, skill, t);
  }
  simStep(dt) {
    this.retarget -= dt; this.atkCd -= dt; this.dashCd -= dt;
    if (this.ccImmune > 0) this.ccImmune -= dt;
    if (this.avoid) { this.avoid.t -= dt; if (this.avoid.t <= 0) this.avoid = null; }
    if (this.alive) {
      if (this.status.stun > 0) { this.status.stun -= dt; if (this.fsm.name !== 'stun' && this.fsm.name !== 'cast' && this.fsm.name !== 'knockback') this.fsm.set('stun'); if (Math.random() < 0.25) vfx.particles.emit(this.pos.x + Math.sin(performance.now() * 0.01) * 0.4, 2.15, this.pos.z + Math.cos(performance.now() * 0.01) * 0.4, 0, 0.2, 0, 0.3, 0.16, 0.05, COLORS.allyB, 0.9, 0); }
      if (this.status.burn > 0) { this.status.burn -= dt; this.status.burnTick -= dt; if (this.status.burnTick <= 0) { this.status.burnTick = 0.5; dealDamage(this.status.burnSrc, this, this.status.burnDmg, { dot: true }); }
        if (Math.random() < 0.5) vfx.particles.emit(this.pos.x + rand(-0.3, 0.3), rand(0.3, 1.6), this.pos.z + rand(-0.3, 0.3), 0, rand(1, 2), 0, 0.5, 0.25, 0.05, COLORS.fire, 0.8, 1); }
      if (this.shieldTime > 0) { this.shieldTime -= dt; if (this.shieldTime <= 0) this.shield = 0; }
      if (this.status.frozen > 0) this.status.frozen -= dt;
      if (battle.phase === 'fight') {
        this.fx.update(dt);   // buff / debuff / chậm / sát thương & hồi máu theo thời gian
        const p = this.def.passive;
        if (p && p.regen && this.alive) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * p.regen * dt);   // nội tại tự hồi phục
      }
    }
    this.fsm.update(dt);
    // Tách đơn vị chồng lấn + giữ trong đài.
    if (this.alive && this.fsm.name !== 'dash' && !this.dragging) {
      for (const o of units) {
        if (o === this || !o.alive || o.dragging) continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d2 = dx * dx + dz * dz, min = 0.9;
        if (d2 > 0 && d2 < min * min) { const d = Math.sqrt(d2), push = (min - d) * 0.5; this.pos.x += dx / d * push; this.pos.z += dz / d * push; }
      }
    }
    const lim = BOARD.tile * 4 + 2.5;
    this.pos.x = clamp(this.pos.x, -lim, lim); this.pos.z = clamp(this.pos.z, -lim, lim);
    this.flash = Math.max(0, this.flash - dt * 6);
  }
  renderUpdate(dt) {
    const f = this.flash, ice = this.status.frozen > 0 && this.alive;
    if (ice) this.U.uFlash.value.setRGB(0.12 + f * 0.3, 0.3 + f * 0.3, 0.5 + f * 0.3);   // đóng băng: phủ màu băng
    else this.U.uFlash.value.setRGB(f * 0.42, f * 0.42, f * 0.45);
    this.rig.update(ice ? 0 : dt, this.pos, this.yaw);   // đóng băng: đứng im đúng tư thế bị đóng băng
    if (this.shieldFx) this.shieldFx.follow(this);
  }
  dispose() { this.rig.dispose(); }
}
