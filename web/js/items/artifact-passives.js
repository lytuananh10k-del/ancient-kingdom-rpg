// Vạn Kiếm Kỳ Trận – Nội tại pháp bảo trong giao tranh (V1.6) + ArtifactVFX.
// Logic chạy hoàn toàn trong BƯỚC MÔ PHỎNG (60 Hz, đồng hồ battle.time, RNG có seed) – mức đồ hoạ chỉ đổi VFX, không đổi sát thương / thời điểm.
// Nghe sự kiện qua TraitEvents (đăng ký khi vào trận, gỡ khi TraitEngine.battleEnd xoá bus) + các móc nhỏ trong dealDamage / applyStun.
//
// Chuỗi sự kiện (chặn vòng lặp vô hạn):
//   - Nội tại "theo đòn đánh" chỉ chạy với ĐÒN ĐÁNH THƯỜNG (opts.attack, không proc / dot). Nội tại "theo kỹ năng" chỉ với kỹ năng gốc (không proc).
//   - Mọi sát thương do nội tại gây ra mang opts.proc (+ reflect với phản đòn) → không kích hoạt nội tại nào nữa (kể cả phản đòn của đối phương).
//   - Lưới an toàn: độ sâu lồng tối đa MAX_DEPTH; vượt thì bỏ qua và ghi CombatAudit.artDepthBlocked.
// Nạp sau js/items/artifact-system.js. Script thường (không phải module).
'use strict';

const ArtifactPassives = {
  MAX_DEPTH: 2,
  active: false, list: [], depth: 0, maxDepthSeen: 0,
  /** Vào trận: dựng trạng thái nội tại cho mọi tướng đang mang pháp bảo (cả hai phe – phe địch chỉ có khi thử nghiệm). */
  battleStart() {
    this.battleEnd();
    this.active = true; this.depth = 0; this.maxDepthSeen = 0;
    for (const u of units) {
      const ids = u.items;
      u.art = null; u.artStats = null; u.critStack = 0;
      if (!ids || !ids.length) continue;
      const seen = new Set(), list = [];
      u.artStats = ids.map(id => ({ id, procs: 0, dmg: 0, heal: 0, shield: 0, mana: 0 }));
      ids.forEach((id, i) => {
        const A = ARTIFACTS[id]; if (!A || !A.unique || seen.has(id)) return;   // nội tại cùng loại: 1 lần / tướng (chỉ số vẫn cộng dồn)
        seen.add(id); list.push({ A, p: A.passive, k: A.passive.kind, i, st: { t: 0, n: 0, stacks: 0, cd: -1, used: false, pending: false, vfxT: -1 } });
      });
      if (!list.length) continue;
      u.art = list; this.list.push(u);
    }
    for (const u of this.list) for (const a of u.art) this.start(u, a);
    if (!this.list.length) return;
    TraitEvents.on('onHit', (s, d, dmg, o, crit) => this.onHit(s, d, dmg, o, crit));
    TraitEvents.on('onDamageTaken', (d, s, dmg, o) => this.onDamageTaken(d, s, dmg, o));
    TraitEvents.on('onSkillCast', (u, sk, t) => this.onSkillCast(u, sk, t));
  },
  /** Hết trận: ngừng xử lý (thống kê artStats giữ lại để xem sau trận). Sự kiện đã được TraitEngine.battleEnd gỡ. */
  battleEnd() { for (const u of this.list) u.art = null; this.list.length = 0; this.active = false; },
  /** Ghi nhận cho giao diện. */
  rec(u, a, field, v) { const s = u.artStats && u.artStats[a.i]; if (!s) return; s.procs += field === 'procs' ? v : 0; if (field !== 'procs') { s[field] += v; } },
  fired(u, a) { const s = u.artStats && u.artStats[a.i]; if (s) s.procs++; combatLog.artProcs = (combatLog.artProcs || 0) + 1; const by = combatLog.artByKind || (combatLog.artByKind = {}); by[a.k] = (by[a.k] || 0) + 1; ArtifactVFX.play(a.A.group, u, a); },
  /** Sát thương phụ do nội tại: luôn proc (không kích hoạt nội tại khác), không chí mạng. */
  proc(src, dst, a, mult, opts) {
    if (!dst || !dst.alive) return 0;
    if (this.depth >= this.MAX_DEPTH) { CombatAudit.artDepthBlocked = (CombatAudit.artDepthBlocked || 0) + 1; return 0; }
    this.depth++; this.maxDepthSeen = Math.max(this.maxDepthSeen, this.depth);
    try { const d = dealDamage(src, dst, mult, Object.assign({ proc: true, crit: false, art: a.A.id, color: ArtifactVFX.col(a.A.group) }, opts)); this.rec(src, a, 'dmg', d); return d; }
    finally { this.depth--; }
  },
  heal(src, dst, a, amount) { const g = healUnit(src, dst, amount, true, true); this.rec(src, a, 'heal', g); return g; },
  shield(u, a, amount, dur) { giveShield(u, amount, dur, u); this.rec(u, a, 'shield', amount); },
  mana(u, a, amount) { if (u.manaLock || !u.alive) return 0; const m0 = u.mana; addMana(u, amount); this.rec(u, a, 'mana', u.mana - m0); return u.mana - m0; },
  /** Đồng minh đứng cạnh (cả bản thân) theo ô xuất phát. */
  near(u) { return units.filter(o => o.alive && o.team === u.team && Math.max(Math.abs(o.homeTile.c - u.homeTile.c), Math.abs(o.homeTile.r - u.homeTile.r)) <= 1); },

  /* ---------- đầu trận ---------- */
  start(u, a) {
    const p = a.p;
    switch (a.k) {
      case 'startShield': this.shield(u, a, u.maxHp * p.pct, p.dur); this.fired(u, a); break;
      case 'startDR': u.fx.push({ stat: 'dmgTaken', mul: 1 - p.pct, dur: p.dur, src: u, tag: 'art:startDR' }); this.fired(u, a); break;
      case 'allyAura':   // một tag chung → nhiều người mang không cộng dồn (refresh cùng khoá)
        for (const o of this.near(u)) o.fx.push({ type: 'defBuff', mods: [{ stat: 'def', add: p.def }, { stat: 'mr', add: p.mr }], power: p.def + p.mr, dur: 999, tag: 'art:aura' });
        this.fired(u, a); break;
      case 'teamManaStart':   // năng lượng cho đồng minh cạnh – ghi thống kê vào người mang
        for (const o of this.near(u)) { if (o.manaLock) continue; const m0 = o.mana; addMana(o, p.amount); this.rec(u, a, 'mana', o.mana - m0); }
        this.fired(u, a); break;
    }
  },
  /* ---------- đòn đánh / kỹ năng gây sát thương ---------- */
  onHit(src, dst, dmg, opts, crit) {
    if (!src || !src.art || this.depth >= this.MAX_DEPTH) return;
    const basic = opts.attack !== undefined && !opts.proc && !opts.dot, skill = !!opts.skill && !opts.proc && !opts.dot;
    if (!basic && !skill) return;
    for (const a of src.art) {
      const p = a.p, st = a.st;
      switch (a.k) {
        case 'chainBolt':
          if (!basic) break;
          if (++st.n % p.nth) break;
          this.fired(src, a);
          this.proc(src, dst, a, p.mult, { type: 'magic' });
          { const o = this.nearestFoe(src, dst, dst.pos, p.radius); if (o) this.proc(src, o, a, p.mult, { type: 'magic' }); }
          break;
        case 'multiShot':
          if (!basic) break;
          if (++st.n % p.nth) break;
          { const o = this.nearestFoe(src, dst, src.pos, 99); if (o) { this.fired(src, a); this.proc(src, o, a, p.mult, { type: 'physical' }); } }
          break;
        case 'aspdStack':
          if (!basic || st.stacks >= p.max) break;
          st.stacks++; src.fx.push({ stat: 'aspd', mul: 1 + p.pct * st.stacks, dur: 999, src, tag: 'art:aspdStack' });
          if (st.stacks === 1 || st.stacks === p.max) this.fired(src, a); else this.rec(src, a, 'procs', 1);
          break;
        case 'shredOnHit':
          if (!basic || !dst.alive) break;
          dst.fx.push({ stat: p.stat, mul: 1 - p.pct, dur: p.dur, src, tag: 'art:shred:' + p.stat }); this.rec(src, a, 'procs', 1);
          if (battle.time > st.vfxT) { st.vfxT = battle.time + 1; this.fired(src, a); }
          break;
        case 'shredOnSkill':
          if (!skill || !dst.alive) break;
          dst.fx.push({ stat: p.stat, mul: 1 - p.pct, dur: p.dur, src, tag: 'art:shred:' + p.stat }); this.fired(src, a);
          break;
        case 'manaOnHit': if (basic) { this.mana(src, a, p.amount); this.rec(src, a, 'procs', 1); } break;
        case 'healOnHit': if (basic) { this.heal(src, src, a, src.maxHp * p.pct); this.rec(src, a, 'procs', 1); } break;
        case 'execute':
          if (!basic || !dst.alive || dst.hp >= dst.maxHp * p.below) break;
          this.fired(src, a); this.proc(src, dst, a, 0, { flat: Math.max(1, dmg * p.pct), type: 'true' });
          break;
        case 'aspdOnCrit':
          if (!basic || !crit || st.stacks >= p.max) break;
          st.stacks++; src.fx.push({ stat: 'aspd', mul: 1 + p.pct * st.stacks, dur: 999, src, tag: 'art:aspdCrit' }); this.fired(src, a);
          break;
        case 'critMana':
          if (!basic || !crit || battle.time < st.cd) break;
          st.cd = battle.time + p.cd; this.mana(src, a, p.amount); this.fired(src, a);
          break;
        case 'critStack':
          if (!basic || !crit || st.stacks >= p.max) break;
          st.stacks++; src.critStack = p.pct * st.stacks; this.fired(src, a);
          break;
      }
    }
  },
  /* ---------- nhận sát thương ---------- */
  onDamageTaken(dst, src, dmg, opts) {
    if (!dst || !dst.art) return;
    for (const a of dst.art) {
      const p = a.p, st = a.st;
      switch (a.k) {
        case 'thorns':   // chỉ phản ĐÒN ĐÁNH THƯỜNG thật (không phản sát thương phụ / phản đòn) → không có chuỗi phản vô hạn
          if (opts.attack === undefined || opts.proc || opts.reflect || !src || src === dst || !src.alive || !(dmg > 0)) break;
          this.fired(dst, a); this.proc(dst, src, a, 0, { flat: Math.max(1, dmg * p.pct), type: 'magic', reflect: true });
          break;
        case 'manaOnDamaged':
          if (!(dmg > 0) || battle.time < st.cd || !dst.alive) break;
          st.cd = battle.time + p.cd; this.mana(dst, a, p.amount); this.rec(dst, a, 'procs', 1);
          break;
        case 'lowHpShield':
          if (st.used || !dst.alive || dst.hp >= dst.maxHp * p.below) break;
          st.used = true; this.shield(dst, a, dst.maxHp * p.pct, p.dur); this.fired(dst, a);
          break;
      }
    }
  },
  /* ---------- thi triển ---------- */
  onSkillCast(u, sk, t) {
    if (!u || !u.art) return;
    for (const a of u.art) {
      const p = a.p, st = a.st;
      switch (a.k) {
        case 'aspdOnCast': u.fx.push({ stat: 'aspd', mul: 1 + p.pct, dur: p.dur, src: u, tag: 'art:aspdCast' }); this.fired(u, a); break;
        case 'manaAfterCast': st.pending = true; break;   // cộng khi thi triển XONG (update) – không cộng trong lúc khoá năng lượng
        case 'healOnCast': {
          if (battle.time < st.cd) break;
          st.cd = battle.time + p.cd;
          const allies = units.filter(o => o.alive && o.team === u.team);
          let who;
          if (p.who === 'weakest') who = allies.sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp).slice(0, 1);
          else { const others = allies.filter(o => o !== u).sort((x, y) => x.pos.distanceTo(u.pos) - y.pos.distanceTo(u.pos)); who = [u].concat(others.slice(0, 1)); }
          for (const o of who) this.heal(u, o, a, o.maxHp * p.pct);
          this.fired(u, a);
          break;
        }
      }
    }
  },
  /** Móc trong dealDamage: sát thương chí tử → Bất Diệt Thần Giáp giữ 1 máu (1 lần / trận). Trả về true nếu cứu. */
  onLethal(u) {
    if (!u.art) return false;
    for (const a of u.art) if (a.k === 'deathSave' && !a.st.used) {
      a.st.used = true; u.hp = 1; this.shield(u, a, u.maxHp * a.p.shield, a.p.dur); this.fired(u, a);
      floatText(u.chest(_v2.clone()), 'Bất Diệt!', '#e9c46a', 1.1, true);
      return true;
    }
    return false;
  },
  /** Móc trong applyStun: miễn khống chế lần đầu (Huyền Linh Pháp Bào). Trả về true nếu chặn. */
  onCC(u) {
    if (!u.art) return false;
    for (const a of u.art) if (a.k === 'cleanseOnce' && !a.st.used) {
      a.st.used = true; u.ccImmune = Math.max(u.ccImmune || 0, a.p.immune); this.fired(u, a);
      floatText(u.chest(_v2.clone()), 'Giải trừ', '#8fd3ff', 0.9);
      return true;
    }
    return false;
  },
  /* ---------- theo thời gian (bước mô phỏng) ---------- */
  update(dt) {
    if (!this.active || battle.phase !== 'fight') return;
    for (const u of this.list) {
      if (!u.alive || !u.art) continue;
      for (const a of u.art) {
        const p = a.p, st = a.st;
        switch (a.k) {
          case 'rampAtk':
            st.t += dt;
            while (st.t >= p.every - 1e-9 && st.stacks < p.max) { st.t -= p.every; st.stacks++; u.fx.push({ stat: 'atk', mul: 1 + p.pct * st.stacks, dur: 999, src: u, tag: 'art:ramp' }); this.fired(u, a); }
            break;
          case 'burnAura':
            st.t += dt;
            if (st.t >= p.every - 1e-9) {
              st.t -= p.every; let n = 0;
              for (const o of units) if (o.alive && o.team !== u.team && Math.hypot(o.pos.x - u.pos.x, o.pos.z - u.pos.z) <= p.radius) { applyBurn(o, u, p.power); n++; }
              if (n) this.fired(u, a);
            }
            break;
          case 'regen': case 'regenLow': case 'manaRegen':
            st.t += dt;
            if (st.t >= 1 - 1e-9) {
              st.t -= 1;
              if (a.k === 'manaRegen') { this.mana(u, a, p.amount); this.rec(u, a, 'procs', 1); }
              else if (a.k === 'regen' || u.hp < u.maxHp * p.below) { if (u.hp < u.maxHp) { this.heal(u, u, a, u.maxHp * p.pct); this.rec(u, a, 'procs', 1); } }
            }
            break;
          case 'manaAfterCast':
            if (st.pending && !u.manaLock && u.fsm.name !== 'cast') { st.pending = false; this.mana(u, a, p.amount); this.fired(u, a); }
            break;
        }
      }
    }
  },
  nearestFoe(src, not, from, radius) {
    let best = null, bd = radius;
    for (const o of units) if (o.alive && o.team !== src.team && o !== not) { const d = Math.hypot(o.pos.x - from.x, o.pos.z - from.z); if (d <= bd) { bd = d; best = o; } }
    return best;
  }
};

/* =====================================================================
 *  ArtifactVFX – hiệu ứng theo nhóm pháp bảo. CHỈ HÌNH ẢNH (Math.random, không đụng RNG trận): dùng lại pool hạt / pháp trận / sóng / vệt chém
 *  của VFXManager, không tạo material / geometry mới. LOW: ít hạt, không pháp trận; ULTRA: nhiều hạt + sóng phụ. Giãn cách tối thiểu mỗi tướng.
 * ===================================================================*/
const ArtifactVFX = {
  _col: {}, _v: null,
  col(group) { return this._col[group] || (this._col[group] = new THREE.Color(COMPONENTS[group] ? COMPONENTS[group].color : '#ffffff')); },
  level() { return QualityManager.order.indexOf(QualityManager.level); },   // 0 LOW … 3 ULTRA
  play(group, u, a) {
    if (!u) return;
    const L = this.level(), gap = [0.6, 0.35, 0.25, 0.18][L] || 0.3;
    if (a) { if (a.vfxNext !== undefined && battle.time < a.vfxNext) return; a.vfxNext = battle.time + gap; }
    const c = this.col(group), k = [0.35, 0.7, 1, 1.5][L] || 1, n = x => Math.max(2, Math.round(x * k));
    const p = this._v || (this._v = new V3()); u.chest(p);
    switch (group) {
      case 'sword': vfx.particles.burst(p, c, n(14), 7, 0.3, 0.2, { drag: 4 }); if (L >= 1) vfx.slash(u.pos, u.yaw, c, 1.4, 0.3, 0.2, 1.1); break;
      case 'staff': vfx.particles.burst(p, c, n(16), 3, 0.6, 0.28, { up: 2.5, drag: 2 }); if (L >= 1) vfx.magicCircle(u.pos, 1.0, c, c, { reveal: 0.2, life: 0.6, spin: 2 }); break;
      case 'bow': vfx.particles.burst(p, c, n(12), 9, 0.25, 0.16, { drag: 6 }); break;
      case 'armor': vfx.particles.burst(p, c, n(12), 3, 0.5, 0.3, { up: 1, drag: 3 }); if (L >= 2) vfx.shockwave(u.pos, 1.2, c, 0.45, 0.06); break;
      case 'cloak': vfx.particles.burst(_v1.set(u.pos.x, 0.5, u.pos.z), c, n(18), 1.5, 0.9, 0.45, { up: 0.6, drag: 1.5 }); break;
      case 'crystal': vfx.particles.burst(p, c, n(14), 4, 0.5, 0.2, { up: 3, drag: 3 }); if (L >= 3) vfx.shockwave(u.pos, 0.9, c, 0.35, 0.05); break;
      case 'jade': vfx.particles.burst(p, c, n(14), 2.5, 0.7, 0.26, { up: 2.5, drag: 2 }); if (L >= 1) vfx.magicCircle(u.pos, 0.9, c, COLORS.shield, { reveal: 0.25, life: 0.7, spin: 1 }); break;
      case 'glove': vfx.particles.burst(p, c, n(16), 10, 0.25, 0.22, { drag: 5 }); break;
    }
  },
  /** Khi gắn pháp bảo lên tướng (giai đoạn chuẩn bị). */
  equip(u, itemId) {
    if (!u) return;
    const A = ITEM_DB[itemId], g = A && A.group ? A.group : itemId, c = this.col(g), L = this.level();
    vfx.particles.burst(u.chest(new V3()), c, [10, 20, 28, 40][L] || 20, 4, 0.6, 0.3, { up: 2, drag: 2 });
    if (L >= 1) vfx.magicCircle(u.pos, 1.2, c, COLORS.allyB, { reveal: 0.25, life: 0.7, spin: 2 });
    floatText(u.chest(new V3()), '+' + A.name, A.color || '#ffffff', 0.9);
  }
};
