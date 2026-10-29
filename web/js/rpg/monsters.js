// Vạn Kiếm Kỳ Trận – Phiêu Lưu: quái vật & boss – AI (tuần tra, đuổi, tấn công cận chiến / bắn xa / bay, quay về khi bị kéo quá xa),
// phần thưởng khi hạ (tu vi, linh thạch, đan dược, nguyên liệu pháp bảo, Yêu Đan, Long Châu), hồi sinh theo giờ, boss nhiều chiêu.
// Script thường (không phải module): nạp sau js/rpg/player.js.
'use strict';

const MON_TIMING = { dur: 0.8, windup: 0.45, active: 0.55 };
class Monster extends Actor {
  constructor(type, level, x, opts = {}) {
    const spec = MONSTERS[type], st = monsterStats(level, spec);
    super({ kind: 'monster', team: 'evil', name: spec.name, x, level, hp: st.hp, atk: st.atk, def: st.def, model: makeModel(spec, spec.scale, 0xff6a50) });
    this.type = type; this.spec = spec; this.gold = st.gold; this.home = x; this.heavy = !!spec.boss; this.dmgBy = new Map(); this.mapToken = World.token;
    this.flying = this.hover = !!spec.fly; this.alt = spec.fly ? rand(2.5, 5) : 0;
    if (spec.fly) this.pos.y = World.groundAt(x) + this.alt;
    this.state = 'patrol'; this.wait = rand(0.5, 3); this.goal = x; this.atkCd = rand(0.5, 1.5); this.aggroR = spec.boss ? 16 : spec.ai === 'aggro' ? 7 : 0;
    this.speed = (spec.boss ? 3.4 : spec.model === 'golem' || spec.model === 'tree' ? 2.2 : spec.model === 'rabbit' || spec.model === 'wolf' ? 4.2 : 3) * (spec.fly ? 1.2 : 1);
    this.range = spec.ranged ? 9 : (this.w * 0.5 + 1.4); this.casting = null; this.opts = opts;
    this.facing = Math.random() < 0.5 ? 1 : -1;
  }
  /** Chọn mục tiêu: kẻ đã đánh mình gần nhất hoặc (quái chủ động) người lại gần. */
  pickTarget() {
    const cands = [Ents.player, ...Ents.bots].filter(a => a && !a.dead && !a.invuln);
    if (this.target && (this.target.dead || Math.abs(this.target.pos.x - this.home) > (this.spec.boss ? 40 : 22))) this.target = null;
    if (this.target) return;
    for (const a of cands) if (Math.abs(a.pos.x - this.pos.x) < this.aggroR && Math.abs(a.pos.y - this.pos.y) < 6) { this.target = a; return; }
  }
  onDamaged(src, dmg) {
    if (src) { this.dmgBy.set(src, (this.dmgBy.get(src) || 0) + dmg); if (!this.target || Math.random() < 0.15) this.target = src; }
    if (this.casting && this.spec.boss === undefined) { this.casting = null; this.atkCd = Math.max(this.atkCd, 0.4); }   // quái thường bị ngắt chiêu khi trúng đòn
  }
  update(dt) {
    if (this.dead) {
      this.deadT += dt; this.vel.x *= 0.9;
      if (!this.hover) this.physics(dt);
      if (this.deadT > 0.6) this.model.U.uDissolve.value = Math.min(1, (this.deadT - 0.6) / 0.9);
      return this.deadT < 1.6;
    }
    this.tickStatus(dt);
    if (this.stun > 0) { this.vel.x = damp(this.vel.x, 0, 6, dt); this.casting = null; this.physics(dt); return true; }
    this.pickTarget(); this.atkCd -= dt;
    const t = this.target, sp = this.speed * this.speedMul();
    if (this.casting) this.tickCast(dt);
    else if (t) {
      const dx = t.pos.x - this.pos.x, dy = t.pos.y - this.pos.y, adx = Math.abs(dx);
      this.facing = dx >= 0 ? 1 : -1;
      const inRange = this.spec.ranged ? adx < this.range && Math.abs(dy) < 8 : adx < this.range + t.w * 0.5 && Math.abs(dy + (this.flying ? 0.4 : 0)) < 1.8 + this.h * 0.3;
      if (inRange && this.atkCd <= 0) this.beginAttack(t);
      else {
        const want = this.spec.ranged ? (adx > this.range * 0.75 ? Math.sign(dx) : adx < 3 ? -Math.sign(dx) : 0) : (adx > this.range * 0.7 + t.w * 0.4 ? Math.sign(dx) : 0);
        this.vel.x = damp(this.vel.x, want * sp, 6, dt);
        if (this.flying) this.vel.y = damp(this.vel.y, clamp((t.pos.y + 0.3 - this.pos.y) * 1.5, -sp, sp), 4, dt);
        else if (dy > 1.5 && dy < 6 && this.onGround && adx < 4 && Math.random() < dt * 1.2 && !this.heavy) { this.vel.y = RPG_BAL.jumpV * 0.95; this.onGround = false; }
      }
      if (Math.abs(this.pos.x - this.home) > (this.spec.boss ? 45 : 26)) { this.target = null; this.state = 'return'; }
    } else {
      // tuần tra quanh điểm sinh; quay về khi bị kéo xa thì hồi máu
      if (this.state === 'return') { this.goal = this.home; if (Math.abs(this.pos.x - this.home) < 1) { this.state = 'patrol'; this.hp = this.maxHp; this.dmgBy.clear(); } }
      else if ((this.wait -= dt) <= 0) { this.goal = this.home + rand(-6, 6); this.wait = rand(2, 5); }
      const dx = this.goal - this.pos.x;
      this.vel.x = damp(this.vel.x, Math.abs(dx) > 0.4 ? Math.sign(dx) * sp * (this.state === 'return' ? 1.6 : 0.45) : 0, 5, dt);
      if (Math.abs(dx) > 0.4) this.facing = Math.sign(dx);
      if (this.flying) { const gy = World.groundAt(this.pos.x) + this.alt + Math.sin(clock.t * 1.3 + this.id) * 0.5; this.vel.y = damp(this.vel.y, (gy - this.pos.y) * 2, 3, dt); }
    }
    this.physics(dt);
    return true;
  }
  /** Tấn công: lấy đà (windup, chớp đỏ cảnh báo) → trúng. Boss chọn chiêu trong bảng riêng. */
  beginAttack(t) {
    if (this.spec.boss) return Boss.begin(this, t);
    this.casting = { t: 0, kind: this.spec.ranged ? 'shoot' : 'melee', target: t, done: false };
    this.model.play(this.spec.model === 'human' ? (this.spec.ranged ? 'SkillCast' : 'Attack01') : 'Attack', MON_TIMING);
    this.model.flash(0xff2a10, 0.25);
    this.vel.x *= 0.3;
  }
  tickCast(dt) {
    const c = this.casting; c.t += dt; this.vel.x = damp(this.vel.x, 0, 8, dt);
    if (this.flying) this.vel.y = damp(this.vel.y, 0, 6, dt);
    if (this.spec.boss) return Boss.tick(this, c, dt);
    if (!c.done && c.t >= MON_TIMING.windup) {
      c.done = true;
      if (c.kind === 'melee') {
        const r = this.range, x0 = this.facing > 0 ? this.pos.x : this.pos.x - r, x1 = this.facing > 0 ? this.pos.x + r : this.pos.x;
        if (this.flying || this.spec.model === 'wolf' || this.spec.model === 'boar') this.vel.x = this.facing * 7;
        for (const e of foesInBox('evil', x0, x1, this.pos.y - 0.6, this.pos.y + this.h + 0.4, _hitList)) hurt(this, e, this.atk, { kind: 'basic', knock: 3 });
        vfx.slash(_v1.set(this.pos.x + this.facing * 0.4, this.pos.y, 0.2), this.facing > 0 ? Math.PI / 2 : -Math.PI / 2, COLORS.enemyA, r, 1.3, 0.2, this.h * 0.5);
      } else {
        const tg = c.target; tg.center(_v2); const sx = this.pos.x + this.facing * 0.5, sy = this.pos.y + this.h * 0.6, dx = _v2.x - sx, dy = _v2.y - sy, d = Math.hypot(dx, dy) || 1;
        fireProjectile({ owner: this, type: this.spec.ranged, x: sx, y: sy, vx: dx / d * 13, vy: dy / d * 13, dmg: this.atk, kind: 'basic', life: 1.2 });
      }
    }
    if (c.t >= MON_TIMING.dur) { this.casting = null; this.atkCd = rand(1.4, 2.2); }
  }
  /** Hạ quái: phần thưởng cho người chơi nếu là người kết liễu hoặc gây ≥ 25% sát thương; hẹn giờ hồi sinh. */
  onDeath(src) {
    const P = Ents.player, total = Array.from(this.dmgBy.values()).reduce((s, v) => s + v, 0) || 1, mine = this.dmgBy.get(P) || 0;
    const earn = P && (src === P || mine / total >= 0.25);
    if (earn) Rewards.onKill(this, src === P);
    if (this.spec.boss) Boss.onDeath(this, src, earn);
    if (!this.opts.noRespawn) { const tok = World.token, type = this.type, home = this.home, L = this.level;
      Tasks.after(this.spec.boss ? 1e9 : rand(...RPG_BAL.respawnMonster), () => { if (World.token === tok) spawnMonster(type, L, home); }); }
  }
}
function spawnMonster(type, level, x, opts) { const m = new Monster(type, level, x, opts); Ents.monsters.push(m); return m; }

/* ---------- Boss: 4 chiêu luân phiên + triệu hồi lâu la khi máu thấp ---------- */
const Boss = {
  moves: ['smash', 'barrage', 'charge', 'smash', 'quake'],
  begin(b, t) {
    b.moveI = (b.moveI || 0) + 1;
    let kind = this.moves[b.moveI % this.moves.length];
    if (b.spec.world && b.moveI % 4 === 0) kind = 'meteor';
    const ratio = b.hp / b.maxHp; b.summons = b.summons || 0;
    if ((ratio < 0.6 && b.summons === 0) || (ratio < 0.3 && b.summons === 1)) { kind = 'summon'; b.summons++; }
    b.casting = { t: 0, kind, target: t, done: false, x: t.pos.x, y: t.pos.y, step: 0 };
    b.model.play(kind === 'barrage' || kind === 'meteor' ? 'UltimateCast' : 'HeavyAttack', { dur: 1.4, windup: 0.8, active: 1 });
    b.model.flash(0xff2a10, 0.3);
    if (kind === 'smash' || kind === 'quake') { const R = kind === 'quake' ? 7 : 3.6; b.casting.zone = vfx.magicCircle(_v1.set(t.pos.x, 0, 0), R, COLORS.enemyA, COLORS.fire, { y: World.supportAt(t.pos.x, t.pos.y + 0.5), spin: 3, reveal: 0.9 }); b.casting.R = R; }
    if (kind === 'meteor') { b.casting.spots = []; for (let k = 0; k < 6; k++) { const x = clamp(t.pos.x + rand(-9, 9), 2, World.width - 2), y = World.groundAt(x); b.casting.spots.push({ x, y, z: vfx.magicCircle(_v1.set(x, 0, 0), 2.2, COLORS.enemyB, COLORS.enemyA, { y, spin: 2, reveal: 1 }) }); } }
    if (kind === 'summon') Chat.sys(b.name + ' gầm lên, triệu hồi thuộc hạ!');
  },
  tick(b, c, dt) {
    const T = 1.0;
    if (c.kind === 'smash' || c.kind === 'quake') {
      if (!c.done && c.t > T) { c.done = true; c.zone.fadeOut(0.3);
        const gy = World.supportAt(c.x, c.y + 0.5);
        if (c.kind === 'smash') { b.pos.x = clamp(c.x - b.facing * 1.2, 1, World.width - 1); }
        vfx.shockwave(_v1.set(c.x, gy, 0), c.R * 1.3, COLORS.enemyA, 0.6, 0.12); vfx.particles.burst(_v1.set(c.x, gy + 0.3, 0), COLORS.fire, 30, 8, 0.6, 0.45, { up: 3 });
        for (const e of foesInBox('evil', c.x - c.R, c.x + c.R, gy - 1, gy + 3.5, _hitList)) hurt(b, e, b.atk * (c.kind === 'quake' ? 1.6 : 2.2), { kind: 'skill', lift: 7, stun: 0.5 });
        SideCam.shake(0.4); Sfx.boom(); }
    } else if (c.kind === 'barrage') {
      if (c.t > 0.7 && c.step < 3 && c.t > 0.7 + c.step * 0.25) {
        c.step++; const tg = c.target; tg.center(_v2); const sx = b.pos.x + b.facing, sy = b.pos.y + b.h * 0.6, base = Math.atan2(_v2.y - sy, _v2.x - sx);
        for (let k = -2; k <= 2; k++) { const a = base + k * 0.16; fireProjectile({ owner: b, type: b.spec.ranged || 'nether', x: sx, y: sy, vx: Math.cos(a) * 15, vy: Math.sin(a) * 15, dmg: b.atk * 0.9, kind: 'skill', life: 1.4, scale: 1.3 }); }
        Sfx.fire();
      }
    } else if (c.kind === 'charge') {
      if (c.t < 0.8) b.vel.x = 0; else if (c.t < 1.3) { b.vel.x = b.facing * 18; b.invulnCharge = true;
        for (const e of foesInBox('evil', b.pos.x - b.w, b.pos.x + b.w, b.pos.y - 0.5, b.pos.y + b.h, _hitList)) if (!c.hitSet || !c.hitSet.has(e)) { (c.hitSet = c.hitSet || new Set()).add(e); hurt(b, e, b.atk * 1.8, { kind: 'skill', knock: 10, lift: 5 }); }
        if (Math.random() < 0.8) vfx.particles.emit(b.pos.x, b.pos.y + rand(0.3, b.h), 0, -b.facing * 4, 0, 0, 0.3, 0.5, 0.1, COLORS.enemyA, 0.8, 3); }
      else b.vel.x *= 0.8;
    } else if (c.kind === 'summon') {
      if (!c.done && c.t > 1) { c.done = true; const types = (World.def.spawns || []).map(s => s[0]);
        for (let k = 0; k < 3; k++) { const x = clamp(b.pos.x + rand(-6, 6), 2, World.width - 2); spawnMonster(types[k % types.length] || 'linhtho', Math.max(1, b.level - 6), x, { noRespawn: true }); vfx.magicCircle(_v1.set(x, 0, 0), 1.5, COLORS.enemyB, COLORS.enemyA, { y: World.groundAt(x), life: 1 }); } }
    } else if (c.kind === 'meteor') {
      if (!c.done && c.t > 1.2) { c.done = true;
        for (const s of c.spots) { s.z.fadeOut(0.3); lightning(s.x, s.y + 14, s.y, 0xff4a8a, 0.8); vfx.shockwave(_v1.set(s.x, s.y, 0), 3, COLORS.enemyB, 0.5, 0.1);
          for (const e of foesInBox('evil', s.x - 2.2, s.x + 2.2, s.y - 1, s.y + 4, _hitList)) hurt(b, e, b.atk * 1.5, { kind: 'skill', stun: 0.4 }); }
        SideCam.shake(0.5); Sfx.thunder(); }
    }
    if (c.t > 1.6) { b.casting = null; b.atkCd = rand(0.6, 1.2); b.invulnCharge = false; }
  },
  onDeath(b, src, earn) {
    const def = World.def;
    G.bossT[World.id] = G.playT + b.spec.respawn;
    Chat.sys(b.name + ' đã bị ' + (src ? src.name : 'đồng đạo') + ' tiêu diệt tại ' + def.name + '!');
    ui.bossBar(null);
    if (earn) { G.bossKills++; Quests.on('boss', World.id); }
    SideCam.shake(0.5); Sfx.boom();
    vfx.shockwave(_v1.set(b.pos.x, b.pos.y, 0), 8, COLORS.allyB, 1, 0.12);
  }
};
/** Boss xuất hiện theo giờ: khi tới hạn mà người chơi đang ở bản đồ → xuất hiện ngay (có thông báo); ở nơi khác → thông báo thế giới,
 *  sau một lúc nếu người chơi không tới, "đồng đạo" (người chơi ảo) hạ boss và hẹn giờ lại. */
const BossClock = {
  tick() {
    for (const id of MAP_KEYS) {
      const d = MAPS[id]; if (!d.boss) continue;
      const due = G.bossT[id] == null ? (G.bossT[id] = G.playT + 40 + Math.random() * 80) : G.bossT[id];
      const spec = MONSTERS[d.boss];
      if (G.playT >= due && due > 0) {
        if (World.id === id) { if (!Ents.monsters.some(m => m.spec.boss && !m.dead)) this.spawn(id); }
        else {
          if (!G.bossOut) G.bossOut = {};
          if (!G.bossOut[id]) { G.bossOut[id] = G.playT; Chat.sys('Boss ' + spec.name + ' vừa xuất hiện tại ' + d.name + '!'); }
          else if (G.playT - G.bossOut[id] > 150) { G.bossOut[id] = 0; G.bossT[id] = G.playT + spec.respawn; Chat.sys(spec.name + ' đã bị ' + BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0] + ' tiêu diệt tại ' + d.name); }
        }
      }
    }
  },
  spawn(id) {
    const d = MAPS[id], x = d.width * 0.7, b = spawnMonster(d.boss, d.bossLv, x);
    G.bossT[id] = -1; if (G.bossOut) G.bossOut[id] = 0;   // đang có mặt
    vfx.magicCircle(_v1.set(x, 0, 0), 4, COLORS.enemyA, COLORS.enemyB, { y: World.groundAt(x), life: 2 }); lightning(x, World.groundAt(x) + 16, World.groundAt(x), 0xff4a6a, 1);
    SideCam.shake(0.4); Sfx.thunder();
    ui.banner(b.name + ' xuất hiện!', 'Cấp ' + b.level + ' · ' + d.name); Chat.sys('Boss ' + b.name + ' xuất hiện tại ' + d.name + '!');
    Bots.rally(id);
    return b;
  },
  /** Thời gian còn lại tới khi boss ở bản đồ id xuất hiện (giây), 0 nếu đang có mặt. */
  left(id) { const t = G.bossT[id]; return t == null ? null : t < 0 ? 0 : Math.max(0, t - G.playT); }
};
