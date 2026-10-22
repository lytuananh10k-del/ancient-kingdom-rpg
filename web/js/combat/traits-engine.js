// Vạn Kiếm Kỳ Trận – Synergy Engine (V1.5 tuần 2): TraitCounter, TraitEvents, TraitEngine (TraitEffectEngine), TraitSwords, TraitVFX.
// Dữ liệu + TraitRegistry ở js/data/traits.js. Nạp sau js/data/traits.js, trước js/14-game.js.
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục.
//
// Quy trình chỉ số:  gốc → × sao (STAR) → × (1 + Σ% tộc/hệ) → trang bị → hiệu ứng tạm thời (EffectSet) → chỉ số cuối.
//   - Lớp tộc/hệ được tính lại TỪ ĐẦU mỗi lần đội hình đổi (computeBonus) → không bao giờ cộng dồn qua các vòng / lần vẽ lại giao diện.
//   - Hiệu ứng theo trận (lá chắn đầu trận, phi kiếm, hồi máu khi máu thấp, sát thương phép bùng nổ) chỉ đăng ký trong trận và gỡ ở battleEnd.
'use strict';

/* ---------- TraitEvents: bus sự kiện dùng chung cho hiệu ứng tộc/hệ (không cấp phát khi phát sự kiện) ---------- */
const TRAIT_EVENTS = ['onBattleStart', 'onAttack', 'onHit', 'onDamageTaken', 'onSkillCast', 'onHeal', 'onUnitDeath', 'onBattleEnd'];
const TraitEvents = {
  h: {},
  on(ev, fn) { if (!this.h[ev]) throw new Error('Sự kiện tộc/hệ lạ: ' + ev); this.h[ev].push(fn); return fn; },
  emit(ev, a, b, c, d) {
    const L = this.h[ev];
    for (let i = 0; i < L.length; i++) { try { L[i](a, b, c, d); } catch (e) { console.error('[Tộc/hệ ' + ev + ']', e); } }
  },
  clear() { for (const k of TRAIT_EVENTS) this.h[k].length = 0; },
  size() { let n = 0; for (const k of TRAIT_EVENTS) n += this.h[k].length; return n; }
};
TRAIT_EVENTS.forEach(k => { TraitEvents.h[k] = []; });

/* ---------- TraitCounter: đếm tướng KHÁC NHAU đang đứng trên bàn (không tính hàng chờ, không tính bản trùng / sao) ---------- */
const TraitCounter = {
  dirty: true, cache: {}, recounts: 0,
  /** Gọi khi đội hình trên bàn đổi (placeUnit / removeUnit). Chỉ đánh dấu – lần đọc kế tiếp mới đếm lại. */
  invalidate() { this.dirty = true; },
  counts() {
    if (this.dirty) {
      const seen = new Set(), c = {};
      for (const u of units) {
        if (u.team !== 'ally' || seen.has(u.key)) continue;
        seen.add(u.key);
        for (const t of TraitRegistry.of(u.def)) c[t] = (c[t] || 0) + 1;
      }
      this.cache = c; this.dirty = false; this.recounts++;
    }
    return this.cache;
  },
  /** Đếm cho một phe bất kỳ (không cache) – phe địch chỉ dùng khi battle.enemyTraits (thí nghiệm cân bằng đối xứng). */
  compute(team) {
    const seen = new Set(), c = {};
    for (const u of units) { if (u.team !== team || seen.has(u.key)) continue; seen.add(u.key); for (const t of TraitRegistry.of(u.def)) c[t] = (c[t] || 0) + 1; }
    return c;
  }
};

const isMember = (u, id) => u.def.origin === id || (u.def.traits || []).includes(id);
const adjacent = (a, b) => a !== b && Math.max(Math.abs(a.homeTile.c - b.homeTile.c), Math.abs(a.homeTile.r - b.homeTile.r)) === 1;

/* ---------- TraitEngine (TraitEffectEngine) ---------- */
const TraitEngine = {
  active: {},          // id → mốc đang đạt (theo đội hình hiện tại)
  inBattle: false, snapshot: null,
  levels(counts) { const o = {}; for (const id in TRAITS) { const lv = TraitRegistry.level(id, counts[id] || 0); if (lv) o[id] = lv; } return o; },
  cfg(id) { return TRAITS[id].levels[this.active[id] - 1]; },
  /** Tổng phần trăm tộc/hệ mà một tướng nhận được (cộng các tộc/hệ khác nhau, mỗi tộc/hệ lấy mốc cao nhất). */
  layerFor(u, active) {
    const s = { atk: 0, hp: 0, def: 0, aspd: 0, skill: 0, omni: 0, mana: 0, heal: 0 };
    for (const id in active) {
      const L = TRAITS[id].levels[active[id] - 1];
      if (L.scope === 'team' || isMember(u, id)) for (const k in L.stats) s[k] += L.stats[k];
    }
    return s;
  },
  /** Hệ số cộng thêm của tướng = lớp tộc/hệ rồi tới trang bị. Luôn dựng từ defaultBonus() – hàm thuần, gọi bao nhiêu lần cũng ra cùng kết quả. */
  computeBonus(u, active) {
    const b = defaultBonus(), s = this.layerFor(u, active);
    b.atk = 1 + s.atk; b.hp = 1 + s.hp; b.defMul = 1 + s.def; b.aspd = 1 + s.aspd; b.skill = 1 + s.skill;
    b.omni = s.omni; b.manaGain = 1 + s.mana; b.heal = 1 + s.heal; b.traitStats = s;
    for (const it of u.items || []) if (ITEMS[it]) ITEMS[it].apply(b);
    return b;
  },
  /** Áp lớp tộc/hệ cho mọi tướng theo đội hình hiện tại (giai đoạn chuẩn bị & lúc vào trận). announce: hiệu ứng khi mốc mới bật. */
  apply(announce) {
    const counts = TraitCounter.counts(), prev = this.active, active = this.levels(counts);
    this.active = active;
    // Phe địch trong game không có tộc/hệ (đã nhân theo vòng); CombatTestRunner bật battle.enemyTraits để so đội hình đối xứng.
    this.enemyActive = battle.enemyTraits ? this.levels(TraitCounter.compute('enemy')) : {};
    for (const u of units) u.bonus = this.computeBonus(u, u.team === 'ally' ? active : this.enemyActive);
    if (announce && battle.phase === 'prep') for (const id in active) if ((prev[id] || 0) < active[id]) TraitVFX.activated(id);
    return counts;
  },
  /** Bắt đầu trận: chốt mốc (tướng chết giữa trận không làm tụt mốc), lá chắn đầu trận, đăng ký hiệu ứng theo sự kiện, VFX. */
  battleStart() {
    this.battleEnd();
    this.inBattle = true; this.snapshot = Object.assign({}, TraitCounter.counts());
    for (const u of units) u.tstate = { castSeq: 0, burst: null, lowHpUsed: false };
    for (const [team, act] of [['ally', this.active], ['enemy', this.enemyActive || {}]]) this.startTeam(team, act);
    TraitEvents.emit('onBattleStart', units.filter(u => u.team === 'ally'));
  },
  /** Lá chắn đầu trận + đăng ký hiệu ứng theo sự kiện + VFX cho một phe. */
  startTeam(team, active) {
    const allies = units.filter(u => u.team === team);
    for (const id in active) {
      const L = TRAITS[id].levels[active[id] - 1], members = allies.filter(u => isMember(u, id));
      if (L.startShield) {
        const sh = L.startShield;
        const who = sh.to === 'adjacent' ? allies.filter(a => members.some(g => adjacent(g, a))) : members;
        // Lá chắn không cộng dồn: giveShield giữ giá trị lớn hơn (Tiên Tộc + Hộ Pháp cùng lúc → lấy lá chắn lớn nhất).
        for (const a of who) { giveShield(a, a.maxHp * sh.pct, sh.dur); combatLog.traitShields = (combatLog.traitShields || 0) + 1; }
      }
      if (L.swords) TraitEvents.on('onSkillCast', (u, sk, tg) => { if (u.team === team && isMember(u, id)) TraitSwords.launch(u, tg, L.swords); });
      if (L.mageBurst) TraitEvents.on('onHit', (src, dst, dmg, opts) => {
        if (!opts.skill || opts.proc || src.team !== team || !dst.alive || !src.tstate || !isMember(src, id)) return;
        const m = src.tstate.burst || (src.tstate.burst = new Map());
        if (m.get(dst) === src.tstate.castSeq) return;            // 1 lần / mục tiêu / lần thi triển
        m.set(dst, src.tstate.castSeq);
        dealDamage(src, dst, 0, { proc: true, flat: dst.maxHp * L.mageBurst.pct, type: 'magic', crit: false, color: TraitVFX.col.arcane });   // sát thương phép: trừ theo kháng phép
        combatLog.traitBursts = (combatLog.traitBursts || 0) + 1;
      });
      if (L.lowHpHeal) TraitEvents.on('onDamageTaken', dst => {
        const h = L.lowHpHeal;
        if (dst.team !== team || !dst.alive || !dst.tstate || dst.tstate.lowHpUsed || dst.hp >= dst.maxHp * h.below) return;
        dst.tstate.lowHpUsed = true;
        dst.fx.push({ stat: 'hot', hot: dst.maxHp * h.pct * 0.5 / h.dur, dur: h.dur, tick: 0.5, src: dst, raw: true, tag: 'trait:dantu' });
        combatLog.traitLowHeals = (combatLog.traitLowHeals || 0) + 1;
        TraitVFX.lotus(dst);
      });
    }
    if (active.phaptu) TraitEvents.on('onSkillCast', u => { if (u.team === team && isMember(u, 'phaptu')) TraitVFX.arcane(u); });
    TraitVFX.battleStart(active, allies);
  },
  /** Kết thúc trận (hoặc dọn trước vòng mới): gỡ mọi đăng ký sự kiện, phi kiếm, hào quang, hiệu ứng tạm thời của tộc/hệ. */
  battleEnd() {
    if (this.inBattle) TraitEvents.emit('onBattleEnd', battle.result);
    TraitEvents.clear(); TraitSwords.clear(); TraitVFX.clear();
    for (const u of units) {
      u.tstate = null;
      for (let i = u.fx.list.length - 1; i >= 0; i--) if (u.fx.list[i].tag && u.fx.list[i].tag.startsWith('trait:')) u.fx.list.splice(i, 1);
    }
    this.inBattle = false; this.snapshot = null;
  },
  /** Bước mô phỏng cố định (không phụ thuộc FPS). */
  update(dt) { TraitSwords.update(dt); TraitVFX.update(dt); }
};

/* ---------- TraitSwords: phi kiếm phụ của Kiếm Tu – 1 InstancedMesh dùng lại suốt ván, đối tượng kiếm lấy từ pool ---------- */
const TraitSwords = {
  max: 48, swarm: null, list: [], pool: [], _d: new V3(), _c: new V3(),
  init() { if (!this.swarm) { this.swarm = new SwordSwarm(this.max); this.swarm.solid.material.color.set(0xd8ecff); } },
  launch(caster, target, cfg) {
    this.init();
    const prefer = target && target.team !== caster.team && target.alive ? target : null;
    for (let i = 0; i < cfg.count && this.list.length < this.max; i++) {
      const s = this.pool.pop() || { pos: new V3(), dir: new V3() };
      Object.assign(s, { caster, target: i === 0 ? prefer : null, want: i, mult: cfg.mult, t: -i * 0.09, phase: 'orbit', ang: (i / cfg.count) * Math.PI * 2, life: 3.5 });
      caster.chest(s.pos); s.dir.set(0, 1, 0);
      this.list.push(s);
    }
    combatLog.traitSwords = (combatLog.traitSwords || 0) + cfg.count;
  },
  /** Kẻ địch gần thứ `want` (kiếm 2, 3 nhắm kẻ khác nếu có) – mục tiêu chết thì đổi sang kẻ còn sống. */
  pick(s) {
    const foes = s.caster.enemies(); if (!foes.length) return null;
    const p = s.pos; foes.sort((a, b) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) - Math.hypot(b.pos.x - p.x, b.pos.z - p.z));
    return foes[s.want % foes.length];
  },
  update(dt) {
    if (!this.list.length) return;
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i], c = s.caster;
      s.t += dt; s.life -= dt;
      let done = s.life <= 0;
      if (!done && s.phase === 'orbit') {
        // bay vòng quanh người thi triển 0,35 s rồi lao đi
        const a = s.ang + Math.max(0, s.t) * 9, r = 0.95;
        s.pos.set(c.pos.x + Math.cos(a) * r, 1.7 + Math.sin(a * 0.5) * 0.15, c.pos.z + Math.sin(a) * r);
        s.dir.set(-Math.sin(a), 0.15, Math.cos(a));
        if (s.t >= 0.35) s.phase = 'fly';
      } else if (!done) {
        if (!s.target || !s.target.alive) s.target = this.pick(s);
        if (!s.target) done = true;
        else {
          const to = s.target.chest(this._c), d = this._d.subVectors(to, s.pos), len = d.length(), step = 24 * dt;
          s.dir.copy(d).multiplyScalar(1 / (len || 1));
          if (len <= step + 0.45) {
            dealDamage(c, s.target, s.mult, { proc: true, color: TraitVFX.col.sword });   // trúng đúng 1 lần rồi biến mất
            combatLog.traitSwordHits = (combatLog.traitSwordHits || 0) + 1;
            vfx.particles.burst(to, TraitVFX.col.sword, 10, 5, 0.35, 0.2, { drag: 4 });
            done = true;
          } else s.pos.addScaledVector(s.dir, step);
        }
      }
      if (done) { s.caster = s.target = null; this.pool.push(s); this.list.splice(i, 1); continue; }
      if (s.t >= 0) this.swarm.write(n++, s.pos, s.dir, 0.55, 1);
    }
    this.swarm.setCount(n); this.swarm.commit();
  },
  clear() {
    for (const s of this.list) { s.caster = s.target = null; this.pool.push(s); }
    this.list.length = 0;
    if (this.swarm) { this.swarm.setCount(0); this.swarm.commit(); }
  }
};

/* ---------- TraitVFX: hiệu ứng hình ảnh tộc/hệ (dùng lại pool pháp trận / hạt của VFXManager, không tạo material mới) ----------
 * LOW: chỉ chớp hạt · MEDIUM: 1 pháp trận / tướng · HIGH: pháp trận theo từng tộc/hệ + hào quang liên tục · ULTRA: thêm lớp + hạt dày hơn. */
const TraitVFX = {
  col: {
    jade: new THREE.Color(0x5fd6a8), demon: new THREE.Color(0xe0508a), demon2: new THREE.Color(0x8a3aff), halo: new THREE.Color(0xfff0c0),
    beast: new THREE.Color(0x8fe06a), sword: new THREE.Color(0xbfe6ff), arcane: new THREE.Color(0x6fa8ff), arcane2: new THREE.Color(0xb48cff),
    guard: new THREE.Color(0xe9c46a), lotus: new THREE.Color(0x5fe0d0)
  },
  auras: [],
  q() { return Math.max(0, QualityManager.order.indexOf(QualityManager.level)); },
  pair(kind) {
    const C = this.col;
    return { jade: [C.jade, COLORS.white], demon: [C.demon, C.demon2], halo: [C.halo, COLORS.white], beast: [C.beast, C.jade],
      sword: [C.sword, COLORS.white], arcane: [C.arcane, C.arcane2], guard: [C.guard, COLORS.white], lotus: [C.lotus, COLORS.white] }[kind];
  },
  battleStart(active, allies) {
    const q = this.q(), drawn = new Map();   // tướng → số pháp trận đã vẽ
    for (const id in active) {
      const T = TRAITS[id], L = T.levels[active[id] - 1], who = L.scope === 'team' ? allies : allies.filter(u => isMember(u, id)), [c1, c2] = this.pair(T.vfx);
      for (const u of who) {
        const chest = u.chest(_v1);
        vfx.particles.burst(chest, c1, q === 0 ? 8 : 14 + q * 4, 3, 0.7, 0.22, { up: 2.5, drag: 2 });
        const k = drawn.get(u) || 0;
        if (q >= 1 && (q >= 2 || k === 0)) {   // MEDIUM: 1 pháp trận mỗi tướng; HIGH+: mỗi tộc/hệ một vòng, bán kính lớn dần
          vfx.magicCircle(u.pos, 0.85 + 0.3 * k, c1, c2, { reveal: 0.25, life: 0.9 + 0.25 * q, spin: k % 2 ? -2 : 2, alpha: 0.75, follow: u.pos });
        }
        drawn.set(u, k + 1);
        if (q >= 2 && (T.vfx === 'demon' || T.vfx === 'beast' || T.vfx === 'halo')) this.auras.push({ u, c1, c2, kind: T.vfx, rate: q === 3 ? 14 : 8 });
      }
    }
  },
  update(dt) {
    if (battle.phase !== 'fight' || !this.auras.length) return;
    for (const a of this.auras) {
      const u = a.u; if (!u.alive || Math.random() > a.rate * dt) continue;
      const ang = Math.random() * Math.PI * 2, r = a.kind === 'halo' ? 0.7 : 0.45;
      const up = a.kind === 'demon' ? 1.2 : a.kind === 'beast' ? 0.8 : 0.4;
      vfx.particles.emit(u.pos.x + Math.cos(ang) * r, a.kind === 'halo' ? 0.08 : rand(0.3, 1.6), u.pos.z + Math.sin(ang) * r, 0, up, 0, 0.8, a.kind === 'demon' ? 0.32 : 0.22, 0.04, Math.random() < 0.6 ? a.c1 : a.c2, 0.8, 0.3);
    }
  },
  /** Mốc vừa bật lúc chuẩn bị: chớp sáng trên các tướng thuộc tộc/hệ đó. */
  activated(id) {
    const T = TRAITS[id], [c1] = this.pair(T.vfx), L = T.levels[TraitEngine.active[id] - 1];
    for (const u of units) if (u.team === 'ally' && (L.scope === 'team' || isMember(u, id))) vfx.particles.burst(u.chest(_v1), c1, 16, 4, 0.6, 0.25, { up: 3, drag: 2 });
  },
  /** Pháp Tu thi triển: pháp trận đa tầng xanh lam / tím. */
  arcane(u) {
    const q = this.q(), C = this.col;
    if (q === 0) { vfx.particles.burst(u.chest(_v1), C.arcane2, 14, 4, 0.5, 0.25, { up: 2, drag: 2 }); return; }
    vfx.magicCircle(u.pos, 1.1, C.arcane, C.arcane2, { reveal: 0.2, life: 0.8, spin: 3, alpha: 0.8, follow: u.pos });
    if (q >= 2) vfx.magicCircle(u.pos, 1.7, C.arcane2, C.arcane, { reveal: 0.3, life: 0.9, spin: -2, alpha: 0.6, follow: u.pos, y: 0.02 });
    if (q >= 3) vfx.magicCircle(u.pos, 0.7, COLORS.white, C.arcane, { reveal: 0.15, life: 0.7, spin: 5, alpha: 0.7, follow: u.pos, y: 0.04 });
  },
  /** Đan Tu: hoa sen linh khí khi cứu đồng minh máu thấp. */
  lotus(u) {
    const q = this.q(), C = this.col;
    vfx.particles.burst(u.chest(_v1), C.lotus, 12 + q * 6, 3, 0.9, 0.3, { up: 3, drag: 2 });
    if (q >= 1) vfx.magicCircle(u.pos, 1.0, C.lotus, COLORS.white, { reveal: 0.3, life: 2.5, spin: 1, alpha: 0.8, follow: u.pos });
    floatText(u.chest(_v2.clone()), 'Đan Tu cứu mệnh', '#7ff0e0', 0.85);
  },
  clear() { this.auras.length = 0; }
};
TraitSwords.init();   // tạo sẵn 1 lần lúc nạp → số object trong scene không đổi giữa các trận
