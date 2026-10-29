// Vạn Kiếm Kỳ Trận – Phiêu Lưu: NPC sơn môn, người chơi ảo (mô phỏng "thế giới online" khi chơi một mình, không dùng mạng) và kênh chat.
// Script thường (không phải module): nạp sau js/rpg/monsters.js.
'use strict';

/* ---------- Kênh chat: hệ thống + thế giới (người chơi ảo) ---------- */
const Chat = {
  lines: [], listeners: [],
  push(kind, who, text) { const l = { kind, who, text, t: clock.t }; this.lines.push(l); if (this.lines.length > 60) this.lines.shift(); this.listeners.forEach(f => f(l)); return l; },
  sys(text) { return this.push('sys', 'Hệ thống', text); },
  world(who, text) { return this.push('world', who, text); },
  npc(who, text) { return this.push('npc', who, text); }
};

/* ---------- NPC ---------- */
class NPC extends Actor {
  constructor(n, sect) {
    const has = n.role !== 'tree' && n.role !== 'altar';
    super({ kind: 'npc', team: 'npc', name: has ? n.name : NPC_ROLES[n.role].title, x: n.x, model: has ? new HumanModel(n.look, 1.05, 0xffe08a) : null });
    this.role = n.role; this.sect = sect; this.title = NPC_ROLES[n.role].title; this.invuln = true; this.facing = -1; this.talkR = 2.6;
  }
  get w() { return this.model ? this.model.width : 2; }
  get h() { return this.model ? this.model.height : this.role === 'tree' ? 4.5 : 2.6; }
  update(dt) {
    const P = Ents.player;
    if (P && Math.abs(P.pos.x - this.pos.x) < 6) this.facing = P.pos.x > this.pos.x ? 1 : -1;
    return true;
  }
  /** Dấu trên đầu: ! = có việc nhiệm vụ, ? = nộp nhiệm vụ. */
  mark() { return Quests.npcMark(this); }
}

/* ---------- Người chơi ảo ---------- */
class Bot extends Actor {
  constructor(sect, level, x) {
    const S = SECTS[sect], look = S.looks[(Math.random() * S.looks.length) | 0];
    const name = BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0] + (Math.random() < 0.3 ? '_' + ((Math.random() * 99) | 0) : '');
    super({ kind: 'bot', team: 'good', name, x, level, model: new HumanModel(look, 1, 0x9fffd0), canFly: true,
      hp: Math.round((S.base.hp * 0.6 + 40 * Math.pow(level, 1.5)) * 2.2), atk: Math.round((6 + 3.2 * Math.pow(level, 1.25)) * 0.9), def: Math.round(level * 0.6) });
    this.sect = S; this.skill = S.skills[1]; this.basic = S.skills[0]; this.cd = {}; this.think = 0; this.goal = x; this.realmName = REALMS[clamp(Math.floor(level / 7), 0, REALMS.length - 1)].name;
    this.leaveT = rand(80, 200); this.bubble = null; this.crit = 0.08;
  }
  onDamaged(src) { if (src && !this.target) this.target = src; }
  onDeath() { Tasks.after(2.5, () => { this.gone = true; }); if (Math.random() < 0.5) Tasks.after(1, () => Chat.world(this.name, ['Toang rồi, về thành đây', 'Quái mạnh quá', 'Ai cứu với'][(Math.random() * 3) | 0])); }
  say(text) { this.bubble = { text, t: 4 }; Chat.world(this.name, text); }
  update(dt) {
    if (this.gone) return false;
    if (this.dead) { this.deadT += dt; if (this.deadT > 0.6) this.model.U.uDissolve.value = Math.min(1, (this.deadT - 0.6) / 1.5); this.physics(dt); return true; }
    this.tickStatus(dt); if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
    this.think -= dt; this.leaveT -= dt;
    const home = !!World.def.home;
    if (this.think <= 0) {
      this.think = rand(0.4, 1);
      if (!home && (!this.target || this.target.dead)) {
        let best = null, bd = 30;
        for (const m of Ents.monsters) if (!m.dead) { const d = Math.abs(m.pos.x - this.pos.x) + (m.spec.boss ? -15 : 0); if (d < bd) { bd = d; best = m; } }
        this.target = best;
      }
      if (!this.target && Math.random() < 0.3) this.goal = clamp(this.pos.x + rand(-12, 12), 4, World.width - 4);
      if (this.leaveT < 0 && !this.target) this.goal = Math.random() < 0.5 ? 0 : World.width;
    }
    const t = this.target && !this.target.dead ? this.target : null;
    let dir = 0, vert = 0;
    if (t && this.stun <= 0) {
      const dx = t.pos.x - this.pos.x, dy = t.pos.y - this.pos.y, reach = RPG_SKILLS[this.basic].kind === 'bolt' ? 8 : 1.6 + t.w * 0.5;
      if (Math.abs(dx) > reach) dir = Math.sign(dx); else this.facing = Math.sign(dx) || this.facing;
      if (Math.abs(dy) > 2) { this.flying = true; this.hover = true; vert = clamp(dy, -1, 1); }
      if (Math.abs(dx) <= reach + 0.5 && Math.abs(dy) < 2.5 && this.busy <= 0) this.useSkill(Math.random() < 0.15 ? this.skill : this.basic);
    } else if (Math.abs(this.goal - this.pos.x) > 1) dir = Math.sign(this.goal - this.pos.x);
    if (dir && this.busy <= 0.05) this.facing = dir;
    const sp = (this.flying ? RPG_BAL.flySpeed : RPG_BAL.runSpeed) * 0.85 * this.speedMul();
    if (!this.dashing) this.vel.x = damp(this.vel.x, this.busy > 0.05 ? 0 : dir * sp, 8, dt);
    if (this.flying) { this.vel.y = damp(this.vel.y, vert * sp * 0.8, 6, dt); if (!t || Math.abs(t.pos.y - this.pos.y) < 1) { this.hover = false; if (this.onGround) this.flying = false; } }
    this.physics(dt);
    if (this.leaveT < 0 && (this.pos.x <= 0.5 || this.pos.x >= World.width - 0.5)) return false;   // đi qua cổng sang bản đồ khác
    return true;
  }
  useSkill(id) {
    if ((this.cd[id] || 0) > clock.t) return;
    const sk = RPG_SKILLS[id]; this.cd[id] = clock.t + Math.max(sk.cd, 0.5) * 1.2;
    this.busy = castSkill(this, id, 1 + Math.floor(this.level / 8));
  }
}
const Bots = {
  nextJoin: 20, nextChat: 12,
  /** Số người chơi ảo tối đa theo bản đồ: sơn môn đông vui, bản đồ khó vắng hơn. */
  cap() { const d = World.def; return d.home ? 3 : d.region === 'ma' ? 1 : 2; },
  levelFor() { const d = World.def; return d.level ? Math.round(rand(d.level[0], d.level[1] + 3)) : Math.round(rand(2, 20)); },
  add(x) {
    const sects = SECT_KEYS, sect = World.def.home && Math.random() < 0.6 ? World.def.home : sects[(Math.random() * 3) | 0];
    const b = new Bot(sect, this.levelFor(), x != null ? x : (Math.random() < 0.5 ? 1 : World.width - 1)); Ents.bots.push(b); return b;
  },
  populate() { const n = Math.round(rand(0, this.cap())); for (let k = 0; k < n; k++) this.add(rand(8, World.width - 8)); this.nextJoin = rand(25, 60); },
  rally(id) { if (World.id !== id) return; for (let k = 0; k < 2; k++) Tasks.after(rand(3, 12), () => { if (World.id === id) { const b = this.add(); b.leaveT = 400; Tasks.after(1, () => b.say(['Boss kìa, lên anh em!', 'Đánh boss nào!', 'Cùng hạ boss nhé'][k % 3])); } }); },
  update(dt) {
    for (let i = Ents.bots.length - 1; i >= 0; i--) if (!Ents.bots[i].update(dt)) { Ents.bots[i].dispose(); Ents.bots.splice(i, 1); }
    if ((this.nextJoin -= dt) <= 0) { this.nextJoin = rand(35, 90); if (Ents.bots.length < this.cap()) this.add(); }
    if ((this.nextChat -= dt) <= 0) {
      this.nextChat = rand(14, 32);
      const here = Ents.bots.filter(b => !b.dead);
      if (here.length && Math.random() < 0.6) here[(Math.random() * here.length) | 0].say(BOT_CHAT[(Math.random() * BOT_CHAT.length) | 0]);
      else Chat.world(BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0], BOT_CHAT[(Math.random() * BOT_CHAT.length) | 0]);
    }
  }
};
