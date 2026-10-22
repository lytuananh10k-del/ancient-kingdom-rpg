// Vạn Kiếm Kỳ Trận – Định nghĩa tướng, Unit, AnimationController (mục 14–15)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 14. Định nghĩa đơn vị & kỹ năng (SkillDefinitions)
 * ===================================================================*/
const LOOKS = {
  kiemtien: { robe: 0xeef2f6, trim: 0x3d7fc4, inner: 0x2b4d78, hair: 0x15181f, skin: 0xf2d3bd, accent: 0xe2c06a, weapon: 'sword', hairLen: 8, trailColor: new THREE.Color(0x9fd8ff), crown: true },
  loi: { robe: 0x2c3a6b, trim: 0x9fc7ff, inner: 0x1d2647, hair: 0xd8dde8, skin: 0xf0d0b8, accent: 0x9fc7ff, weapon: 'staff', orb: 0x9fd0ff, hairLen: 7, trailColor: new THREE.Color(0x9fd0ff) },
  hoa: { robe: 0x8e2b24, trim: 0xffb347, inner: 0x4a1612, hair: 0x2a0f0b, skin: 0xf3d2bc, accent: 0xffb347, weapon: 'staff', orb: 0xff9a4a, hairLen: 8, trailColor: new THREE.Color(0xffa055) },
  hophap: { robe: 0x5b6b4a, trim: 0xd9b45a, inner: 0x343d2a, hair: 0x1a1612, skin: 0xe6c3a5, accent: 0xd9b45a, weapon: 'spear', bulk: 1.12, hairLen: 5, trailColor: new THREE.Color(0xe9d58a) },
  huyetkiem: { robe: 0x2a1216, trim: 0xc2302a, inner: 0x1a0a0c, hair: 0x0a0a0c, skin: 0xd8b8a8, accent: 0xc2302a, weapon: 'blade', hairLen: 8, trailColor: new THREE.Color(0xff4a3a), mask: 0x1a1a1a },
  uminh: { robe: 0x3a2350, trim: 0xb07cff, inner: 0x22143a, hair: 0x6a4a8a, skin: 0xcfc0d8, accent: 0xb07cff, weapon: 'staff', orb: 0xb07cff, hairLen: 7, trailColor: new THREE.Color(0xc08cff) },
  mathu: { robe: 0x4a3a2c, trim: 0xa83a2a, inner: 0x2a1f18, hair: 0x2a1a10, skin: 0xb88a70, accent: 0xa83a2a, weapon: 'claws', bulk: 1.3, hairLen: 5, trailColor: new THREE.Color(0xff5a3a) },
  kiemdong: { robe: 0xd6e4f0, trim: 0x5b9bd5, inner: 0x3b5f86, hair: 0x2a1d14, skin: 0xf2d6c2, accent: 0xc0c8d0, weapon: 'sword', hairLen: 6, trailColor: new THREE.Color(0x9fd8ff) },
  thietve: { robe: 0x4f5560, trim: 0xb0b8c0, inner: 0x2c3038, hair: 0x141414, skin: 0xe2c0a2, accent: 0xb0b8c0, weapon: 'spear', bulk: 1.15, hairLen: 4, crown: true, trailColor: new THREE.Color(0xd8e0e8) },
  anhkiem: { robe: 0x1d2433, trim: 0x6fb7ff, inner: 0x101522, hair: 0x0c0c10, skin: 0xe8cdb8, accent: 0x6fb7ff, weapon: 'blade', hairLen: 8, mask: 0x2a3550, trailColor: new THREE.Color(0x8fc8ff) },
  uhon: { robe: 0x2c2448, trim: 0x9fa8ff, inner: 0x1a1630, hair: 0xe8e8f0, skin: 0xe6d6e6, accent: 0x9fa8ff, weapon: 'staff', orb: 0x9fa8ff, hairLen: 8, trailColor: new THREE.Color(0xa8b0ff) }
};

/* cost: giá ở cửa hàng (bậc hiếm 1–3); traits: tộc/hệ. Đơn vị phe địch không có cost. */
const UNIT_DEFS = {
  kiemtien: { name: 'Kiếm Tiên', cost: 3, traits: ['kiemtu'], look: 'kiemtien', hp: 820, atk: 62, def: 28, aspd: 1.0, range: 2.2, speed: 4.6, mana: 100, mana0: 45, crit: 0.15, critDmg: 1.7, skill: 'vanKiem', dash: true, poise: 50 },
  loi: { name: 'Lôi Pháp Sư', short: 'Lôi Pháp', cost: 2, traits: ['phaptu'], look: 'loi', hp: 560, atk: 50, def: 16, aspd: 0.8, range: 8, speed: 3.6, mana: 80, mana0: 20, crit: 0.08, critDmg: 1.5, skill: 'thienLoi', ranged: 'thunder', poise: 30 },
  hoa: { name: 'Hỏa Linh', cost: 2, traits: ['phaptu'], look: 'hoa', hp: 540, atk: 54, def: 15, aspd: 0.75, range: 7.5, speed: 3.6, mana: 90, mana0: 30, crit: 0.08, critDmg: 1.5, skill: 'hoaPhuong', ranged: 'fire', poise: 30 },
  hophap: { name: 'Hộ Pháp', cost: 1, traits: ['hophap'], look: 'hophap', hp: 1100, atk: 42, def: 45, aspd: 0.85, range: 2.6, speed: 3.8, mana: 70, mana0: 30, crit: 0.05, critDmg: 1.5, skill: 'hoThe', poise: 80 },
  huyetkiem: { name: 'Huyết Ảnh Kiếm Khách', look: 'huyetkiem', hp: 700, atk: 58, def: 22, aspd: 1.05, range: 2.2, speed: 4.8, mana: 80, mana0: 20, crit: 0.15, critDmg: 1.6, skill: 'huyetAnh', dash: true, poise: 45 },
  uminh: { name: 'U Minh Ma Tu', look: 'uminh', hp: 520, atk: 48, def: 14, aspd: 0.8, range: 7.5, speed: 3.5, mana: 80, mana0: 20, crit: 0.08, critDmg: 1.5, skill: 'uMinh', ranged: 'nether', poise: 30 },
  mathu: { name: 'Ma Thú Hống', look: 'mathu', hp: 1250, atk: 46, def: 38, aspd: 0.75, range: 2.4, speed: 3.6, mana: 90, mana0: 25, crit: 0.05, critDmg: 1.5, skill: 'phaDia', poise: 90 },
  kiemdong: { name: 'Kiếm Đồng', cost: 1, traits: ['kiemtu'], look: 'kiemdong', hp: 600, atk: 48, def: 20, aspd: 0.95, range: 2.2, speed: 4.4, mana: 60, mana0: 20, crit: 0.1, critDmg: 1.5, skill: 'kiemKhi', poise: 40 },
  thietve: { name: 'Thiết Vệ', cost: 1, traits: ['hophap'], look: 'thietve', hp: 920, atk: 40, def: 40, aspd: 0.8, range: 2.6, speed: 3.8, mana: 80, mana0: 30, crit: 0.05, critDmg: 1.5, skill: 'phaDia', poise: 80 },
  anhkiem: { name: 'Ảnh Kiếm', cost: 2, traits: ['kiemtu', 'matu'], look: 'anhkiem', hp: 640, atk: 56, def: 20, aspd: 1.05, range: 2.2, speed: 4.8, mana: 70, mana0: 20, crit: 0.18, critDmg: 1.6, skill: 'huyetAnh', dash: true, poise: 45 },
  uhon: { name: 'U Hồn Sư', short: 'U Hồn', cost: 3, traits: ['phaptu', 'matu'], look: 'uhon', hp: 600, atk: 56, def: 16, aspd: 0.8, range: 7.5, speed: 3.5, mana: 80, mana0: 30, crit: 0.1, critDmg: 1.5, skill: 'uMinh', ranged: 'nether', poise: 30 }
};

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
    this.rig = customRigFactory && key === 'kiemtien' && team === 'ally' ? customRigFactory() : new CharacterRig(LOOKS[d.look], this.U);
    scene.add(this.rig.root);
    this.rig.root.scale.setScalar(STAR_SCALE[star]);
    this.anim = new AnimationController(this);
    this.pos = tileCenter(c, r); this.yaw = team === 'ally' ? 0 : Math.PI; this.vel = new V3();
    this.fsm = new AnimationStateMachine(this);
    this.setupStates();
    this.reset(1);
  }
  get alive() { return this.hp > 0; }
  reset(scale) {
    const d = this.def, b = this.bonus, sm = STAR_MUL[this.star];
    this.maxHp = Math.round(d.hp * scale * sm * b.hp); this.hp = this.maxHp; this.atk = d.atk * scale * sm * b.atk; this.def_ = d.def * Math.sqrt(scale) + b.def;
    this.mana = Math.min(d.mana, d.mana0 + b.mana0); this.maxMana = d.mana; this.shield = 0; this.shieldTime = 0;
    this.status = { stun: 0, burn: 0, burnTick: 0, burnDmg: 0 };
    this.target = null; this.retarget = 0; this.atkCd = rand(0, 0.4); this.attackIdx = 0; this.dashCd = 0;
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
          if (self.mana >= self.maxMana && !self.manaLock && SKILLS[self.def.skill] && self.findTarget()) { self.fsm.set('cast'); return; }
          const t = self.findTarget();
          if (!t) { self.anim.locomotion(0); return; }
          const dx = t.pos.x - self.pos.x, dz = t.pos.z - self.pos.z, dist = Math.hypot(dx, dz);
          self.faceTo(t.pos, dt, 10);
          if (dist <= self.def.range + 0.35) {
            self.anim.locomotion(0);
            if (self.atkCd <= 0) self.fsm.set('attack');
          } else if (self.def.dash && dist > 6.5 && self.dashCd <= 0) {
            self.fsm.set('dash');
          } else {
            const sp = self.def.speed;
            self.vel.set(dx / dist * sp, 0, dz / dist * sp);
            self.pos.addScaledVector(self.vel, dt);
            self.anim.locomotion(sp);
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
        exit() { self.anim.hold('Stun', false); }
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
  findTarget() {
    if (this.target && this.target.alive && this.retarget > 0) return this.target;
    let best = null, bd = Infinity;
    for (const u of units) if (u.team !== this.team && u.alive) { const d = u.pos.distanceToSquared(this.pos); if (d < bd) { bd = d; best = u; } }
    this.target = best; this.retarget = 0.6; this.anim.look(best);
    return best;
  }
  faceTo(p, dt, k) { const want = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.yaw += angDiff(this.yaw, want) * Math.min(1, k * dt); }
  snapFace(p) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
  get forward() { return _v1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  chest(out = new V3()) { return out.set(this.pos.x, 1.3 * (this.def.look === 'mathu' ? 1.25 : 1), this.pos.z); }

  /** Đòn đánh thường: mini-timeline với ApplyDamage / LaunchProjectile đúng khung va chạm. */
  startAttack() {
    const t = this.findTarget(); if (!t) { this.fsm.set('move'); return; }
    this.snapFace(t.pos);
    const ranged = !!this.def.ranged;
    const seq = ['Attack01', 'Attack02', 'Attack03'];
    const name = this.attackIdx % 4 === 3 ? 'HeavyAttack' : seq[this.attackIdx % 4];
    this.attackIdx++;
    const tim = ATTACK_TIMING[ranged ? 'ranged' : 'melee'][name];
    const heavy = name === 'HeavyAttack';
    this.anim.play(name, tim);
    this.atkCd = 1 / (this.def.aspd * this.bonus.aspd);
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
    const skill = SKILLS[this.def.skill], t = this.findTarget();
    if (!skill || !t) { this.fsm.set('move'); return; }
    this.mana = 0;
    this.casting = { released: false, tl: null };
    showBanner(this.team === 'ally' && skill.allyName ? skill.allyName : skill.name, this.team);
    this.casting.tl = runTimeline(skill.build(this, t, () => { if (this.casting) this.casting.released = true; }));
  }
  simStep(dt) {
    this.retarget -= dt; this.atkCd -= dt; this.dashCd -= dt;
    if (this.alive) {
      if (this.status.stun > 0) { this.status.stun -= dt; if (this.fsm.name !== 'stun' && this.fsm.name !== 'cast' && this.fsm.name !== 'knockback') this.fsm.set('stun'); if (Math.random() < 0.25) vfx.particles.emit(this.pos.x + Math.sin(performance.now() * 0.01) * 0.4, 2.15, this.pos.z + Math.cos(performance.now() * 0.01) * 0.4, 0, 0.2, 0, 0.3, 0.16, 0.05, COLORS.allyB, 0.9, 0); }
      if (this.status.burn > 0) { this.status.burn -= dt; this.status.burnTick -= dt; if (this.status.burnTick <= 0) { this.status.burnTick = 0.5; dealDamage(this.status.burnSrc, this, this.status.burnDmg, { dot: true }); }
        if (Math.random() < 0.5) vfx.particles.emit(this.pos.x + rand(-0.3, 0.3), rand(0.3, 1.6), this.pos.z + rand(-0.3, 0.3), 0, rand(1, 2), 0, 0.5, 0.25, 0.05, COLORS.fire, 0.8, 1); }
      if (this.shieldTime > 0) { this.shieldTime -= dt; if (this.shieldTime <= 0) this.shield = 0; }
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
    const f = this.flash;
    this.U.uFlash.value.setRGB(f * 0.42, f * 0.42, f * 0.45);
    this.rig.update(dt, this.pos, this.yaw);
    if (this.shieldFx) this.shieldFx.follow(this);
  }
  dispose() { this.rig.dispose(); }
}
