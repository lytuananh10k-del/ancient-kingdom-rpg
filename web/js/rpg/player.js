// Vạn Kiếm Kỳ Trận – Phiêu Lưu: nhân vật người chơi – trạng thái lưu (G), chỉ số theo cảnh giới / linh căn / trang bị / pháp bảo,
// điều khiển chạy – nhảy – bay – đánh – kỹ năng, tu vi & linh căn, đột phá cảnh giới, tử trận / hồi sinh.
// Script thường (không phải module): nạp sau js/rpg/skills.js.
'use strict';

/** Trạng thái game cần lưu (một đối tượng thuần JSON – xem js/rpg/save.js). */
let G = null;
function newGameState(name, sect, look) {
  const S = SECTS[sect];
  return {
    v: 1, created: Date.now(), name, sect, look, map: S.home, x: 30, tv: 0, lc: 0, gold: 300, gem: 5,
    points: { hp: 0, mp: 0, atk: 0, def: 0, crit: 0 }, skills: { [S.skills[0]]: 1, [S.skills[1]]: 1 }, hotbar: [S.skills[1], S.skills[2], S.skills[3], S.skills[4]],
    bag: [], equip: {}, arts: [null, null], uid: 1, quest: { i: 0, n: 0, done: [] }, tree: { lv: 1, t: Date.now(), stock: 2 }, balls: [], wishes: 0,
    buffs: {}, kills: 0, bossKills: 0, deaths: 0, playT: 0, bounty: null, bossT: {}, hp: 1, mp: 1, quick: 'hp_s', tut: {}
  };
}

class Player extends Actor {
  constructor() {
    const S = SECTS[G.sect];
    super({ kind: 'player', team: 'good', name: G.name, x: G.x, model: new HumanModel(G.look, 1, 0x9fd8ff), canFly: true });
    this.sect = S; this.cd = {}; this.target = null; this.boltType = G.sect === 'phap' ? 'orb' : 'orb'; this.stats = {};
    this.recompute(true);
    this.hp = Math.max(1, Math.round(this.maxHp * clamp(G.hp, 0.05, 1))); this.mp = Math.round(this.maxMp * clamp(G.mp, 0, 1));
  }
  /** Tính lại chỉ số: gốc tông môn + linh căn → × thưởng cảnh giới → + trang bị / pháp bảo. Giữ tỉ lệ máu khi tối đa đổi. */
  recompute(init) {
    const B = this.sect.base, P = G.points, rl = realmOf(G.tv), k = 1 + REALMS[rl.r].bonus + (rl.layer - 1) * 0.012, E = equipTotals();
    const hpR = init ? 1 : this.hp / this.maxHp, mpR = init ? 1 : this.mp / Math.max(1, this.maxMp);
    const s = this.stats = {
      hp: Math.round((B.hp + P.hp * POINT_STATS.hp.step) * k + (E.hp || 0)),
      mp: Math.round((B.mp + P.mp * POINT_STATS.mp.step) * k + (E.mp || 0)),
      atk: Math.round((B.atk + P.atk) * k + (E.atk || 0)),
      def: Math.round((B.def + P.def) * (1 + (k - 1) * 0.6) + (E.def || 0)),
      crit: Math.min(0.75, B.crit + P.crit * 0.01 + (E.crit || 0)), critDmg: 1.5 + (E.critDmg || 0), aspd: 1 + (E.aspd || 0),
      skillDmg: E.skillDmg || 0, ls: Math.min(0.3, E.ls || 0), dr: Math.min(0.4, E.dr || 0)
    };
    this.maxHp = s.hp; this.maxMp = s.mp; this.def = s.def; this.crit = s.crit; this.critDmg = s.critDmg; this.atk = s.atk;
    this.hp = clamp(Math.round(this.maxHp * hpR), this.dead ? 0 : 1, this.maxHp); this.mp = clamp(Math.round(this.maxMp * mpR), 0, this.maxMp);
    this.realm = rl;
  }
  /** Công hiện tại (cộng dồn nội tại pháp bảo, biến thân). */
  atkNow() { return this.stats.atk * (1 + ArtPassives.atkBonus(this) + (this.transformK ? 0.5 : 0)); }
  get def() { return this._def * (this.transformK ? 1.5 : 1) + ArtPassives.defBonus(this); }
  set def(v) { this._def = v; }
  passiveDR() { return this.stats.dr || 0; }
  aspdNow() { return this.stats.aspd * (1 + ArtPassives.aspdBonus(this)); }
  learned(id) { return G.skills[id] || 0; }
  /** Kỹ năng đã mở khoá (đủ cảnh giới / xong nhiệm vụ) – chưa học thì học được ở Sư Phụ. */
  unlocked(id) { const sk = RPG_SKILLS[id]; if (sk.unlockQuest) return G.quest.done.includes(sk.unlockQuest); return this.realm.r >= (sk.unlock || 0); }
  cdLeft(id) { return Math.max(0, (this.cd[id] || 0) - clock.t); }
  /** Dùng kỹ năng: kiểm tra đã học, hồi chiêu, linh lực, khống chế. */
  useSkill(id, quiet) {
    if (this.dead || this.stun > 0 || !id) return false;
    const sk = RPG_SKILLS[id], lv = this.learned(id);
    if (!lv) { if (!quiet) ui.toast('Chưa học ' + sk.name + (this.unlocked(id) ? ' – tới Sư Phụ để học' : '')); return false; }
    if (this.cdLeft(id) > 0 || this.busy > 0) return false;
    const cost = Math.round(sk.cost * (1 + this.realm.r * 0.6));
    if (this.mp < cost) { if (!quiet) { ui.toast('Không đủ linh lực'); floatText(this.pos.x, this.pos.y + this.h, 'Thiếu linh lực', '#7cc4ff', 0.8); } return false; }
    this.mp -= cost;
    const basic = id === this.sect.skills[0];
    this.cd[id] = clock.t + (basic ? sk.cd / this.aspdNow() : sk.cd);
    this.busy = Math.max(this.busy, castSkill(this, id, lv) * (basic ? 1 / this.aspdNow() : 1));
    if (!basic) { ArtPassives.onCast(this, sk); Quests.on('cast', id); }
    return true;
  }
  /** Điều khiển mỗi bước mô phỏng. inp: trạng thái phím / nút ảo (js/rpg/input.js). */
  control(dt, inp) {
    if (this.dead) { this.vel.x = 0; return; }
    const sm = this.speedMul(), can = this.stun <= 0 && !this.dashing;
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), vert = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    // tự tiến tới mục tiêu khi giữ nút đánh mà mục tiêu ngoài tầm (giống bấm quái để đánh)
    const t = this.target && !this.target.dead ? this.target : null, basic = this.sect.skills[0], br = RPG_SKILLS[basic].range;
    if (inp.attack && t && !dir && options.autoTarget) {
      const dx = t.pos.x - this.pos.x, dy = t.pos.y - this.pos.y, reach = br + t.w * 0.5;
      if (Math.abs(dx) > reach) dir = Math.sign(dx);
      if (this.flying || Math.abs(dy) > 2.2) { if (!this.flying && dy > 2.2 && this.mp > 5) this.startFly(); if (this.flying) vert = clamp(dy * 0.8, -1, 1); }
    }
    if (dir && can && this.busy <= 0.05) this.facing = dir;
    if (this.flying) {
      const sp = RPG_BAL.flySpeed * sm;
      this.vel.x = damp(this.vel.x, can ? dir * sp : 0, 8, dt); this.vel.y = damp(this.vel.y, can ? vert * sp * 0.85 : 0, 8, dt);
      this.mp -= RPG_BAL.flyCost * (1 + this.realm.r * 0.3) * dt;
      if (this.mp <= 0) { this.mp = 0; this.flying = false; ui.toast('Hết linh lực – không thể bay'); }
      if (inp.down && this.onGround) this.flying = false;
    } else {
      const sp = RPG_BAL.runSpeed * sm * (this.busy > 0.05 && this.onGround ? 0.35 : 1);
      this.vel.x = damp(this.vel.x, can ? dir * sp : 0, this.onGround ? 14 : 5, dt);
      if (inp.jumpPressed && can) {
        if (this.onGround) { this.vel.y = RPG_BAL.jumpV; this.onGround = false; Sfx.whoosh(); }
        else this.startFly();
      }
      if (inp.downPressed && this.onGround && can && World.supportAt(this.pos.x, this.pos.y) > World.groundAt(this.pos.x) + 0.5) { this.dropT = 0.3; this.onGround = false; }
    }
    if (inp.jumpPressed && this.flying && can && !inp.up) { /* đang bay: nhấn nhảy = lên cao (đã xử lý qua vert khi giữ) */ }
    if (inp.attack && can) this.useSkill(basic, true);
    for (let i = 0; i < 4; i++) if (inp.skill[i] && can) this.useSkill(G.hotbar[i]);
  }
  startFly() {
    if (this.flying) return;
    if (this.mp < 5) { ui.toast('Cần linh lực để bay'); return; }
    this.flying = true; this.vel.y = Math.max(this.vel.y, 4); this.onGround = false;
    vfx.particles.burst(_v1.set(this.pos.x, this.pos.y + 0.2, 0), COLORS.allyA, 12, 3, 0.4, 0.3, { up: -1 }); Sfx.whoosh();
    Quests.tut('fly');
  }
  /** Tu vi (và linh căn) nhận được khi gây sát thương lên quái – giảm khi quái quá yếu so với cảnh giới. */
  onDealt(dst, dmg, opts, crit) {
    if (dst.kind === 'monster') this.gainTv(dmg * RPG_BAL.tvPerDmg * (dst.spec.boss ? 0.25 : 1) * levelFactor(this, dst.level), true);   // boss máu rất dày → tu vi / sát thương thấp hơn
    ArtPassives.onHit(this, dst, dmg, opts, crit);
  }
  onDamaged(src, dmg, opts) { ArtPassives.onDamaged(this, src, dmg, opts); }
  onLethal(left) { return ArtPassives.onLethal(this, left); }
  ccGuard() { return ArtPassives.ccGuard(this); }
  exec(dst) { return ArtPassives.execMul(this, dst); }
  gainTv(v, quiet) {
    if (v <= 0) return;
    const mul = G.buffs.tv && G.buffs.tv > G.playT ? 2 : 1;
    v = Math.max(1, Math.round(v * mul));
    const r0 = this.realm.r, l0 = this.realm.layer;
    G.tv += v; G.lc += Math.round(v * RPG_BAL.lcRatio);
    this.tvAcc = (this.tvAcc || 0) + v;
    const rl = realmOf(G.tv);
    if (rl.r !== r0 || rl.layer !== l0) { this.recompute(); if (rl.r > r0) this.breakthrough(rl); else if (rl.layer > l0) { floatText(this.pos.x, this.pos.y + this.h + 0.6, rl.name + ' tầng ' + rl.layer, rl.color, 1.1); } }
    if (!quiet) floatText(this.pos.x, this.pos.y + this.h + 0.3, '+' + fmtNum(v) + ' tu vi', '#c9f0ff', 0.85);
  }
  /** Đột phá cảnh giới: hồi đầy, cột sáng + lôi kiếp, thông báo, mở kỹ năng mới. */
  breakthrough(rl) {
    this.hp = this.maxHp; this.mp = this.maxMp;
    for (let k = 0; k < 4; k++) Tasks.after(k * 0.18, () => lightning(this.pos.x + rand(-1, 1), this.pos.y + 14, this.pos.y + 0.5, 0xe8f4ff, 0.6));
    vfx.shockwave(_v1.set(this.pos.x, this.pos.y, 0), 6, COLORS.allyB, 0.9, 0.12); vfx.magicCircle(_v1.set(this.pos.x, 0, 0), 2.5, COLORS.allyB, COLORS.white, { y: this.pos.y, life: 2 });
    SideCam.shake(0.4); Sfx.thunder(); Sfx.chime();
    ui.banner('Đột phá ' + rl.name + '!', 'Chỉ số gốc +' + Math.round(REALMS[rl.r].bonus * 100) + '% · hồi đầy sinh lực, linh lực');
    Chat.sys(G.name + ' đột phá ' + rl.name + '!');
    const fresh = this.sect.skills.filter(id => !this.learned(id) && RPG_SKILLS[id].unlock === rl.r);
    if (fresh.length) Tasks.after(2.2, () => ui.toast('Mở khoá kỹ năng: ' + fresh.map(id => RPG_SKILLS[id].name).join(', ') + ' – tới Sư Phụ để học'));
    Quests.on('realm', rl.r); Save.soon();
  }
  onDeath(src) {
    G.deaths++; this.flying = false; this.target = null; GameFx.clear(this);
    Chat.sys(G.name + ' bị ' + (src ? src.name : 'yêu thú') + ' đánh trọng thương');
    Tasks.after(1.3, () => { if (this.dead && Ents.player === this) ui.showDeath(); });
  }
  revive(atHome) {
    this.dead = false; this.hp = this.maxHp; this.mp = this.maxMp; this.stun = 0; this.shield = 0; this.invuln = true;
    this.model.hold('Death', false); this.model.U.uDissolve.value = 0;
    Tasks.after(2, () => (this.invuln = false));
    if (atHome) Game.travel(this.sect.home, null, 30); else vfx.shockwave(_v1.set(this.pos.x, this.pos.y, 0), 3, COLORS.allyB, 0.6, 0.1);
  }
  /** Hồi phục tự nhiên: ngoài giao chiến hồi nhanh sinh lực / linh lực; trong giao chiến hồi linh lực chậm. */
  regen(dt) {
    if (this.dead) return;
    const out = clock.t - this.lastCombat > RPG_BAL.combatWindow;
    if (out) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02 * dt); }
    if (!this.flying) this.mp = Math.min(this.maxMp, this.mp + this.maxMp * (out ? 0.04 : 0.006) * dt);
    ArtPassives.tick(this, dt);
  }
}
/** Hệ số tu vi theo chênh lệch cấp: đánh quái thấp hơn nhiều → giảm (tối thiểu 10%), quái mạnh hơn → tới 130%. */
function levelFactor(p, L) { const d = L - effLevel(G.tv); return clamp(1 + d * 0.06, 0.1, 1.3); }
