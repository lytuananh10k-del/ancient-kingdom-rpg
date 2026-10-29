// Vạn Kiếm Kỳ Trận – Phiêu Lưu: túi đồ, trang bị 5 ô + 2 ô pháp bảo, nội tại pháp bảo (29 loại của bản cờ, chuyển sang luật phiêu lưu),
// phần thưởng hạ quái & nhặt đồ, luyện pháp bảo (ghép 2 nguyên liệu – dùng lại 36 công thức), cường hoá, Linh Đan Thụ, Long Châu & Thần Long.
// Script thường (không phải module): nạp sau js/rpg/npcs.js.
'use strict';

/* ---------- Mô tả vật phẩm ---------- */
const STAT_LABEL = { hp: 'Sinh lực', mp: 'Linh lực', atk: 'Sức đánh', def: 'Giáp', crit: 'Chí mạng', critDmg: 'ST chí mạng', aspd: 'Tốc đánh', skillDmg: 'ST kỹ năng', ls: 'Hút máu', dr: 'Giảm ST nhận' };
const PCT_STATS = new Set(['crit', 'critDmg', 'aspd', 'skillDmg', 'ls', 'dr']);
const statLine = s => Object.keys(s).filter(k => s[k]).map(k => '+' + (PCT_STATS.has(k) ? Math.round(s[k] * 1000) / 10 + '%' : fmtFull(s[k])) + ' ' + STAT_LABEL[k]).join(' · ');
function itemInfo(it) {
  switch (it.kind) {
    case 'equip': { const T = TIERS[it.tier], S = EQUIP_SLOTS[it.slot]; return { name: T.name + ' ' + S.name + (it.plus ? ' +' + it.plus : ''), glyph: ['', '銅', '銀', '金', '鐵', '紫', '星'][it.tier], color: ['', '#c8a070', '#d8e2ea', '#ffd166', '#8aa0b8', '#c9a0ff', '#ff7a5a'][it.tier], desc: statLine(equipStats(it.slot, it.tier, it.plus || 0)), req: T.realm }; }
    case 'art': { const A = ARTIFACTS[it.id]; return { name: A.name + (it.plus ? ' +' + it.plus : ''), glyph: A.glyph, color: A.color, desc: statLine(artifactStats(A, it.plus || 0)) + '\nNội tại: ' + artPassiveText(A), art: true }; }
    case 'comp': { const C = COMPONENTS[it.id]; return { name: C.name, glyph: C.glyph, color: C.color, desc: 'Nguyên liệu pháp bảo – đưa 2 món cho Luyện Khí Sư để luyện (36 công thức).' }; }
    case 'cons': { const C = CONSUMABLES[it.id]; return { name: C.name, glyph: C.glyph, color: C.color, desc: C.desc }; }
    case 'dan': return { name: 'Linh Đan cấp ' + it.lv, glyph: '丹', color: '#ffd166', desc: 'Hồi ' + Math.round(LINHDAN.pct(it.lv) * 100) + '% sinh lực và linh lực tối đa (hồi chiêu ' + RPG_BAL.linhdanCd + ' giây).' };
    case 'quest': { const q = QUEST_ITEMS[it.id]; return { name: q.name, glyph: q.glyph, color: q.color, desc: q.desc }; }
  }
  return { name: '?', glyph: '?', color: '#fff', desc: '' };
}
const STACK = new Set(['comp', 'cons', 'dan', 'quest']);
const sellPrice = it => it.kind === 'equip' ? Math.round((TIERS[it.tier].price || 20000 * it.tier) * 0.25 * (1 + (it.plus || 0) * 0.3)) : it.kind === 'art' ? 600 * (1 + (it.plus || 0)) : it.kind === 'comp' ? 120 : it.kind === 'cons' ? Math.round((CONSUMABLES[it.id].price || 50) * 0.3) : it.kind === 'dan' ? 20 * it.lv : 0;

/* ---------- Túi đồ ---------- */
const Bag = {
  same: (a, b) => a.kind === b.kind && a.id === b.id && (a.lv || 0) === (b.lv || 0),
  /** Thêm vật phẩm (gộp chồng nếu được). false = túi đầy (không mất đồ: nơi gọi giữ lại / báo). */
  add(it, quiet) {
    it = Object.assign({}, it);
    if (STACK.has(it.kind)) { it.n = it.n || 1; const ex = G.bag.find(b => this.same(b, it)); if (ex) { ex.n += it.n; if (!quiet) this.note(it); return true; } }
    if (G.bag.length >= RPG_BAL.bagSize) { ui.toast('Túi đồ đầy (' + RPG_BAL.bagSize + ' ô)'); return false; }
    it.uid = G.uid++; G.bag.push(it); if (!quiet) this.note(it); return true;
  },
  note(it) { const I = itemInfo(it); floatText(Ents.player.pos.x, Ents.player.pos.y + 2.4, '+' + (it.n > 1 ? it.n + ' ' : '') + I.name, I.color, 0.8); },
  count(kind, id) { return G.bag.filter(b => b.kind === kind && (id == null || b.id === id)).reduce((s, b) => s + (b.n || 1), 0); },
  take(uid, n = 1) { const i = G.bag.findIndex(b => b.uid === uid); if (i < 0) return null; const b = G.bag[i];
    if (b.n > n) { b.n -= n; return Object.assign({}, b, { n }); } G.bag.splice(i, 1); return b; },
  takeKind(kind, id, n) { let left = n; for (const b of G.bag.slice()) { if (b.kind !== kind || b.id !== id || left <= 0) continue; const k = Math.min(left, b.n || 1); this.take(b.uid, k); left -= k; } return left === 0; },
  get(uid) { return G.bag.find(b => b.uid === uid); }
};
/** Cộng chỉ số trang bị + pháp bảo. */
function equipTotals() {
  const t = {};
  const add = s => { for (const k in s) t[k] = (t[k] || 0) + s[k]; };
  for (const slot of EQUIP_SLOT_KEYS) { const it = G.equip[slot]; if (it) add(equipStats(slot, it.tier, it.plus || 0)); }
  for (const it of G.arts) if (it) add(artifactStats(ARTIFACTS[it.id], it.plus || 0));
  return t;
}
function equipItem(uid) {
  const it = Bag.get(uid); if (!it) return false;
  const P = Ents.player;
  if (it.kind === 'equip') {
    if (P.realm.r < TIERS[it.tier].realm) { ui.toast('Cần cảnh giới ' + REALMS[TIERS[it.tier].realm].name); return false; }
    Bag.take(uid); const old = G.equip[it.slot]; G.equip[it.slot] = it; if (old) Bag.add(old, true);
  } else if (it.kind === 'art') {
    let i = G.arts.findIndex(a => !a); if (i < 0) i = 0;
    if (G.arts.some(a => a && a.id === it.id)) { ui.toast('Không mang 2 pháp bảo cùng loại'); return false; }
    Bag.take(uid); const old = G.arts[i]; G.arts[i] = it; if (old) Bag.add(old, true);
    Quests.on('equipArt');
  } else return false;
  P.recompute(); Sfx.shield(); Save.soon(); return true;
}
function unequip(slot) {
  const isArt = slot === 'art0' || slot === 'art1', cur = isArt ? G.arts[+slot[3]] : G.equip[slot]; if (!cur) return;
  if (G.bag.length >= RPG_BAL.bagSize) { ui.toast('Túi đồ đầy'); return; }
  if (isArt) G.arts[+slot[3]] = null; else delete G.equip[slot];
  Bag.add(cur, true); Ents.player.recompute(); Save.soon();
}
let quickCd = 0;
function useItem(uid) {
  const it = Bag.get(uid), P = Ents.player; if (!it || P.dead) return false;
  if (it.kind === 'equip' || it.kind === 'art') return equipItem(uid);
  if (it.kind === 'dan') { if (clock.t < quickCd) { ui.toast('Linh đan đang hồi (' + Math.ceil(quickCd - clock.t) + ' giây)'); return false; }
    quickCd = clock.t + RPG_BAL.linhdanCd; Bag.take(uid); const k = LINHDAN.pct(it.lv); healActor(P, P.maxHp * k); P.mp = Math.min(P.maxMp, P.mp + P.maxMp * k); danFx(P); return true; }
  if (it.kind === 'cons') {
    const C = CONSUMABLES[it.id];
    if (C.heal) { if (clock.t < quickCd - RPG_BAL.linhdanCd + 1.5) return false; Bag.take(uid); if (C.heal.hp) healActor(P, C.heal.hp); if (C.heal.mp) { P.mp = Math.min(P.maxMp, P.mp + C.heal.mp); floatText(P.pos.x, P.pos.y + P.h, '+' + C.heal.mp, '#7cc4ff', 1); } danFx(P); return true; }
    if (C.buff) { Bag.take(uid); G.buffs.tv = Math.max(G.buffs.tv || 0, G.playT) + C.buff.dur; ui.toast(C.name + ': tu vi ×2 trong ' + Math.round((G.buffs.tv - G.playT) / 60) + ' phút'); Sfx.chime(); return true; }
    if (it.id === 'revive') { ui.toast('Hoàn Hồn Phù tự dùng khi tử trận'); return false; }
  }
  return false;
}
function danFx(P) { vfx.particles.burst(_v1.set(P.pos.x, P.pos.y + 1, 0.3), COLORS.allyB, 16, 3, 0.6, 0.3, { up: 2 }); Sfx.chime(); Save.soon(); }
/** Phím H / nút đan: ưu tiên linh đan (hồi %) rồi tới hồi huyết đan. */
function quickHeal() {
  const dans = G.bag.filter(b => b.kind === 'dan').sort((a, b) => b.lv - a.lv);
  if (dans.length) return useItem(dans[0].uid);
  const P = Ents.player, needMp = P.mp / P.maxMp < P.hp / P.maxHp;
  const pick = ['hp_m', 'hp_s', 'mp_m', 'mp_s'].map(id => G.bag.find(b => b.kind === 'cons' && b.id === id)).filter(Boolean).sort((a, b) => (needMp ? (a.id.startsWith('mp') ? -1 : 1) : (a.id.startsWith('hp') ? -1 : 1)))[0];
  if (pick) return useItem(pick.uid);
  ui.toast('Hết đan dược – thu hoạch Linh Đan Thụ hoặc mua ở Linh Thương'); return false;
}

/* ---------- Nội tại pháp bảo (phiêu lưu) ----------
 * Dùng đúng tham số của 36 pháp bảo. "Trận" của bản cờ → "giao chiến": từ đòn đầu tiên tới khi 6 giây không đánh / bị đánh.
 * "1 lần / trận" → hồi chiêu riêng (ghi trong mô tả). Sát thương do nội tại gây ra là 'proc' → không kích hoạt nội tại khác. */
function artPassiveText(A) {
  const p = A.passive, P = x => Math.round(x * 1000) / 10 + '%';
  switch (p.kind) {
    case 'stat': return 'chỉ số đặc biệt (đã tính ở trên).';
    case 'rampAtk': return `khi giao chiến, mỗi ${p.every} giây +${P(p.pct)} công (tối đa ${p.max} lần).`;
    case 'chainBolt': return `mỗi đòn đánh thường thứ ${p.nth}: sét lan tới 3 kẻ địch gần, ${P(p.mult)} công.`;
    case 'aspdStack': return `mỗi đòn đánh trúng +${P(p.pct)} tốc đánh (tối đa ${p.max} lần, mất khi thoát giao chiến).`;
    case 'shredOnHit': return `đòn đánh giảm ${P(p.pct)} giáp mục tiêu trong ${p.dur} giây.`;
    case 'shredOnSkill': return `kỹ năng trúng giảm ${P(p.pct)} giáp mục tiêu trong ${p.dur} giây.`;
    case 'lowHpShield': return `sinh lực dưới ${P(p.below)}: khiên ${P(p.pct)} sinh lực tối đa trong ${p.dur} giây (hồi 60 giây).`;
    case 'manaOnHit': return `mỗi đòn đánh trúng hồi ${P(p.amount * 0.005)} linh lực tối đa.`;
    case 'aspdOnCast': return `sau mỗi kỹ năng +${P(p.pct)} tốc đánh trong ${p.dur} giây.`;
    case 'burnAura': return `khi giao chiến, mỗi ${p.every} giây thiêu đốt kẻ địch trong ${(p.radius * 1.5).toFixed(1)} m: ${P(p.power)} công.`;
    case 'manaAfterCast': return `sau mỗi kỹ năng hồi ${P(p.amount * 0.005)} linh lực tối đa.`;
    case 'healOnCast': return `khi dùng kỹ năng hồi ${P(p.pct)} sinh lực tối đa (hồi ${p.cd} giây).`;
    case 'multiShot': return `mỗi đòn đánh thường thứ ${p.nth}: bắn thêm 1 tia vào kẻ địch khác, ${P(p.mult)} công.`;
    case 'startShield': return `vào giao chiến: khiên ${P(p.pct)} sinh lực tối đa trong ${p.dur} giây.`;
    case 'startDR': return `${p.dur} giây đầu mỗi lần giao chiến giảm ${P(p.pct)} sát thương nhận.`;
    case 'healOnHit': return `mỗi đòn đánh trúng hồi ${P(p.pct)} sinh lực tối đa.`;
    case 'aspdOnCrit': return `mỗi đòn chí mạng +${P(p.pct)} tốc đánh (tối đa ${p.max} lần).`;
    case 'deathSave': return `nhận đòn chí tử: giữ 1 sinh lực + khiên ${P(p.shield)} trong ${p.dur} giây (hồi 120 giây).`;
    case 'allyAura': return `khi giao chiến +${p.def} giáp.`;
    case 'manaOnDamaged': return `khi bị đánh hồi ${P(p.amount * 0.005)} linh lực tối đa (hồi ${p.cd} giây).`;
    case 'thorns': return `phản ${P(p.pct)} sát thương đòn đánh nhận vào.`;
    case 'cleanseOnce': return 'miễn 1 lần choáng / làm chậm (hồi 30 giây).';
    case 'teamManaStart': return `vào giao chiến hồi ${P(p.amount * 0.005)} linh lực tối đa.`;
    case 'regen': return `mỗi giây hồi ${P(p.pct)} sinh lực tối đa.`;
    case 'execute': return `đánh mục tiêu dưới ${P(p.below)} sinh lực: +${P(p.pct)} sát thương.`;
    case 'manaRegen': return `mỗi giây hồi ${P(p.amount * 0.0025)} linh lực tối đa.`;
    case 'critMana': return `chí mạng hồi ${P(p.amount * 0.005)} linh lực tối đa (hồi ${p.cd} giây).`;
    case 'critStack': return `mỗi đòn chí mạng +${P(p.pct)} chí mạng (tối đa ${p.max} lần).`;
    case 'regenLow': return `khi sinh lực dưới ${P(p.below)}: mỗi giây hồi ${P(p.pct)}.`;
  }
  return '';
}
const ArtPassives = {
  st: {},   // trạng thái theo loại (cộng dồn, hồi chiêu); xoá khi thoát giao chiến
  equipped() { return G ? G.arts.filter(Boolean).map(it => ARTIFACTS[it.id]) : []; },
  has(kind) { return this.equipped().filter(A => A.passive.kind === kind).map(A => A.passive); },
  inCombat(p) { return clock.t - p.lastCombat < RPG_BAL.combatWindow; },
  cd(key, d) { const t = this.st['cd_' + key] || -99; if (clock.t < t) return false; this.st['cd_' + key] = clock.t + d; return true; },
  atkBonus(p) { let b = 0; for (const q of this.has('rampAtk')) b += (this.st.ramp || 0) * q.pct; return b; },
  defBonus(p) { let b = 0; if (this.inCombat(p)) for (const q of this.has('allyAura')) b += q.def; return b; },
  aspdBonus(p) { let b = 0;
    for (const q of this.has('aspdStack')) b += (this.st.aspdS || 0) * q.pct;
    for (const q of this.has('aspdOnCrit')) b += (this.st.aspdC || 0) * q.pct;
    for (const q of this.has('aspdOnCast')) if (clock.t < (this.st.castBuff || 0)) b += q.pct;
    return b; },
  critBonus() { let b = 0; for (const q of this.has('critStack')) b += (this.st.critS || 0) * q.pct; return b; },
  onHit(p, dst, dmg, opts, crit) {
    if (opts.kind === 'proc') return;
    const basic = opts.kind === 'basic';
    for (const A of this.equipped()) {
      const q = A.passive;
      if (basic) switch (q.kind) {
        case 'chainBolt': if ((this.st.nB = (this.st.nB || 0) + 1) % q.nth === 0) { let n = 0; for (const e of foesOf('good')) if (!e.dead && e !== dst && n < 3 && Math.abs(e.pos.x - dst.pos.x) < q.radius * 2 && Math.abs(e.pos.y - dst.pos.y) < 4) { n++; lightning(e.pos.x, e.pos.y + 6, e.pos.y + 0.5, 0x9fd0ff, 0.3); hurt(p, e, p.atkNow() * q.mult, { kind: 'proc', color: 0x9fd0ff }); } } break;
        case 'aspdStack': this.st.aspdS = Math.min(q.max, (this.st.aspdS || 0) + 1); break;
        case 'shredOnHit': dst.shred = Math.max(dst.shred || 0, q.pct); Tasks.after(q.dur, () => (dst.shred = 0)); break;
        case 'manaOnHit': p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.005); break;
        case 'healOnHit': healActor(p, p.maxHp * q.pct, true); break;
        case 'multiShot': if ((this.st.nM = (this.st.nM || 0) + 1) % q.nth === 0) { const e = foesOf('good').find(o => !o.dead && o !== dst && Math.abs(o.pos.x - p.pos.x) < 10); if (e) { e.center(_v2); const sy = p.pos.y + 1.2, dx = _v2.x - p.pos.x, dy = _v2.y - sy, d = Math.hypot(dx, dy) || 1; fireProjectile({ owner: p, type: 'arrow', x: p.pos.x, y: sy, vx: dx / d * 26, vy: dy / d * 26, dmg: p.atkNow() * q.mult, kind: 'proc', life: 0.8 }); } } break;
      }
      if (crit && basic) switch (q.kind) {
        case 'aspdOnCrit': this.st.aspdC = Math.min(q.max, (this.st.aspdC || 0) + 1); break;
        case 'critMana': if (this.cd('critMana', q.cd)) p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.005); break;
        case 'critStack': this.st.critS = Math.min(q.max, (this.st.critS || 0) + 1); p.crit = Math.min(0.75, p.stats.crit + this.critBonus()); break;
      }
      if (opts.kind === 'skill' && q.kind === 'shredOnSkill') { dst.shred = Math.max(dst.shred || 0, q.pct); Tasks.after(q.dur, () => (dst.shred = 0)); }
    }
  },
  onCast(p) {
    for (const q of this.equipped().map(A => A.passive)) switch (q.kind) {
      case 'aspdOnCast': this.st.castBuff = clock.t + q.dur; break;
      case 'manaAfterCast': p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.005); break;
      case 'healOnCast': if (this.cd('healCast', q.cd)) healActor(p, p.maxHp * q.pct); break;
    }
  },
  onDamaged(p, src, dmg, opts) {
    for (const q of this.equipped().map(A => A.passive)) switch (q.kind) {
      case 'thorns': if (src && opts.kind === 'basic' && !src.dead) hurt(p, src, dmg * q.pct, { kind: 'proc', crit: false, color: 0xd8e0e8 }); break;
      case 'manaOnDamaged': if (this.cd('manaDmg', q.cd)) p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.005); break;
      case 'lowHpShield': if (p.hp / p.maxHp < q.below && this.cd('lowShield', 60)) { p.shield += p.maxHp * q.pct; p.shieldT = Math.max(p.shieldT, q.dur); floatText(p.pos.x, p.pos.y + 2.4, 'Khiên', '#bff6e6', 0.9); } break;
    }
  },
  onLethal(p, left) {
    for (const q of this.has('deathSave')) if (this.cd('deathSave', 120)) { p.shield = p.maxHp * q.shield; p.shieldT = q.dur; floatText(p.pos.x, p.pos.y + 2.4, 'Bất Diệt!', '#ffe08a', 1.2); return Math.max(0, p.hp - 1); }
    return left;
  },
  ccGuard(p) { for (const q of this.has('cleanseOnce')) if (this.cd('cleanse', 30)) { floatText(p.pos.x, p.pos.y + 2.4, 'Miễn khống chế', '#bff6e6', 0.9); return true; } return false; },
  execMul(p, dst) { let m = 1; for (const q of this.has('execute')) if (dst.hp / dst.maxHp < q.below) m += q.pct; return m; },
  tick(p, dt) {
    const fight = this.inCombat(p);
    if (fight && !this.wasFight) {   // vào giao chiến
      for (const q of this.equipped().map(A => A.passive)) {
        if (q.kind === 'startShield') { p.shield += p.maxHp * q.pct; p.shieldT = Math.max(p.shieldT, q.dur); }
        if (q.kind === 'startDR') { p.drK = Math.max(p.drK, q.pct); p.drT = Math.max(p.drT, q.dur); }
        if (q.kind === 'teamManaStart') p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.005);
      }
    }
    if (!fight && this.wasFight) { this.st.ramp = 0; this.st.aspdS = 0; this.st.aspdC = 0; this.st.critS = 0; p.crit = p.stats.crit; }
    this.wasFight = fight;
    this.acc = (this.acc || 0) + dt; this.rampT = (this.rampT || 0) + (fight ? dt : 0);
    for (const q of this.equipped().map(A => A.passive)) {
      if (q.kind === 'rampAtk' && fight && this.rampT >= q.every) { this.rampT = 0; this.st.ramp = Math.min(q.max, (this.st.ramp || 0) + 1); }
      if (q.kind === 'burnAura' && fight && this.cd('burn', q.every)) { for (const e of foesOf('good')) if (!e.dead && Math.abs(e.pos.x - p.pos.x) < q.radius * 1.5 && Math.abs(e.pos.y - p.pos.y) < 3) { hurt(p, e, p.atkNow() * q.power, { kind: 'proc', color: 0xff8a3a }); vfx.particles.burst(_v1.set(e.pos.x, e.pos.y + 1, 0), COLORS.fire, 6, 2, 0.4, 0.3, { up: 2 }); } }
    }
    if (this.acc >= 1) { this.acc -= 1;
      for (const q of this.equipped().map(A => A.passive)) {
        if (q.kind === 'regen') healActor(p, p.maxHp * q.pct, true);
        if (q.kind === 'manaRegen') p.mp = Math.min(p.maxMp, p.mp + p.maxMp * q.amount * 0.0025);
        if (q.kind === 'regenLow' && p.hp / p.maxHp < q.below) healActor(p, p.maxHp * q.pct, true);
      } }
  },
  reset() { this.st = {}; this.wasFight = false; }
};

/* ---------- Phần thưởng hạ quái + nhặt đồ ---------- */
const mapIdx = id => +id[1];
const Rewards = {
  onKill(m, lastHit) {
    const P = Ents.player, L = m.level, boss = !!m.spec.boss, x = m.pos.x, y = m.pos.y + m.h * 0.5;
    G.kills++;
    P.gainTv(RPG_BAL.tvKill * L * (boss ? 40 : 1) * levelFactor(P, L));
    const n = boss ? 8 : Math.random() < 0.7 ? 1 : 0;
    for (let k = 0; k < n; k++) spawnDrop(x, y, 'gold', { n: Math.round(m.gold * rand(0.8, 1.25) * (boss ? 6 : 1)) });
    if (Math.random() < (boss ? 1 : 0.06)) spawnDrop(x, y, 'item', { it: { kind: 'cons', id: L >= 10 ? 'hp_m' : 'hp_s', n: boss ? 5 : 1 }, color: '#ff7a7a' });
    if (Math.random() < (boss ? 1 : 0.035)) for (let k = 0; k < (boss ? 3 : 1); k++) spawnDrop(x, y, 'comp', { id: COMPONENT_KEYS[(Math.random() * COMPONENT_KEYS.length) | 0] });
    if (Math.random() < (boss ? 0.6 : 0.012)) { const tier = clamp(1 + Math.floor(L / 7) + (boss ? 1 : 0), 1, 6); spawnDrop(x, y, 'item', { it: { kind: 'equip', slot: EQUIP_SLOT_KEYS[(Math.random() * 5) | 0], tier, plus: 0 } }); }
    if (boss && Math.random() < 0.25) spawnDrop(x, y, 'item', { it: { kind: 'art', id: ARTIFACT_LIST[(Math.random() * ARTIFACT_LIST.length) | 0][0], plus: 0 } });
    if (Math.random() < (boss ? 1 : 0.01)) spawnDrop(x, y, 'gem', { n: boss ? Math.round(5 + L / 4) : 1 });
    const q = Quests.cur();
    if (q && q.type === 'drop' && mapIdx(World.id) === q.idx && Math.random() < QUEST_ITEMS[q.item].rate) spawnDrop(x, y, 'quest', { id: q.item });
    // Long Châu: quái thường 0,4% (không ở sơn môn), boss 60% – luôn là viên còn thiếu
    const miss = []; for (let s = 1; s <= LONG_CHAU_COUNT; s++) if (!G.balls.includes(s)) miss.push(s);
    if (miss.length && !World.def.home && Math.random() < (boss ? 0.6 : 0.004) && !Ents.drops.some(d => d.kind === 'ball')) spawnDrop(x, y, 'ball', { star: miss[(Math.random() * miss.length) | 0] });
    Quests.on('kill', m);
  }
};
function pickupDrop(d) {
  const p = d.payload;
  switch (d.kind) {
    case 'gold': G.gold += p.n; floatText(d.x, d.y + 0.6, '+' + fmtNum(p.n) + ' linh thạch', '#ffd166', 0.8); Sfx.chime(); return true;
    case 'gem': G.gem += p.n; floatText(d.x, d.y + 0.6, '+' + p.n + ' tiên ngọc', '#7fe6ff', 0.9); Sfx.chime(); return true;
    case 'comp': if (!Bag.add({ kind: 'comp', id: p.id, n: 1 })) return false; Sfx.chime(); return true;
    case 'item': if (!Bag.add(p.it)) return false; Sfx.chime(); return true;
    case 'quest': if (!Bag.add({ kind: 'quest', id: p.id, n: 1 })) return false; Quests.on('item'); Sfx.chime(); return true;
    case 'ball': addBall(p.star); return true;
  }
  return true;
}
function addBall(star) {
  if (G.balls.includes(star)) return;
  G.balls.push(star); G.balls.sort((a, b) => a - b);
  ui.banner('Long Châu ' + star + ' sao!', 'Đã có ' + G.balls.length + ' / ' + LONG_CHAU_COUNT + ' viên' + (G.balls.length === LONG_CHAU_COUNT ? ' – về Tế Đàn ở sơn môn để triệu hồi Thần Long' : ''));
  Chat.sys(G.name + ' nhặt được Long Châu ' + star + ' sao'); Sfx.chime(); Quests.on('ball'); Save.soon();
}

/* ---------- Luyện khí: ghép 2 nguyên liệu → pháp bảo (36 công thức của bản cờ); cường hoá trang bị / pháp bảo ---------- */
function craftArtifact(a, b) {
  const id = recipeOf(a, b); if (!id) return null;
  const need = a === b ? 2 : 1;
  if (Bag.count('comp', a) < need || Bag.count('comp', b) < (a === b ? 2 : 1)) { ui.toast('Thiếu nguyên liệu'); return null; }
  if (G.bag.length >= RPG_BAL.bagSize && !(Bag.count('comp', a) === need)) { ui.toast('Túi đồ đầy'); return null; }
  if (G.gold < 500) { ui.toast('Cần 500 linh thạch phí luyện'); return null; }
  G.gold -= 500; Bag.takeKind('comp', a, 1); Bag.takeKind('comp', b, 1);
  Bag.add({ kind: 'art', id, plus: 0 }, true); Sfx.chime(); Quests.on('craft'); Save.soon();
  return id;
}
function upgradeItem(where) {   // where: {bag uid} | {slot}
  const it = where.uid ? Bag.get(where.uid) : where.slot.startsWith('art') ? G.arts[+where.slot[3]] : G.equip[where.slot];
  if (!it || (it.kind !== 'equip' && it.kind !== 'art')) return null;
  const plus = it.plus || 0; if (plus >= UPGRADE_MAX) { ui.toast('Đã cường hoá tối đa +' + UPGRADE_MAX); return null; }
  const c = it.kind === 'equip' ? upgradeCost(it.tier, plus) : { gold: Math.round(1500 * Math.pow(1.8, plus)), rate: Math.max(0.3, 1 - plus * 0.1) };
  if (G.gold < c.gold) { ui.toast('Cần ' + fmtFull(c.gold) + ' linh thạch'); return null; }
  G.gold -= c.gold;
  const ok = Math.random() < c.rate;
  if (ok) { it.plus = plus + 1; Ents.player.recompute(); Sfx.chime(); } else Sfx.hit(false);
  Save.soon(); return { ok, plus: it.plus || 0, cost: c.gold, rate: c.rate };
}
/** Hàng của Linh Thương: đan dược + trang bị bậc ≤ cảnh giới + 2 (bậc 1–4). */
function shopStock() {
  const P = Ents.player, out = [];
  for (const id in CONSUMABLES) { const C = CONSUMABLES[id]; if (C.realm && P.realm.r < C.realm) continue; out.push({ it: { kind: 'cons', id, n: 1 }, gold: C.price || 0, gem: C.gem || 0 }); }
  for (let t = 1; t <= 4; t++) if (TIERS[t].realm <= P.realm.r + 1) for (const s of EQUIP_SLOT_KEYS) out.push({ it: { kind: 'equip', slot: s, tier: t, plus: 0 }, gold: TIERS[t].price, gem: 0 });
  return out;
}
function buy(entry, n = 1) {
  const g = entry.gold * n, m = entry.gem * n;
  if (G.gold < g || G.gem < m) { ui.toast('Không đủ ' + (G.gold < g ? 'linh thạch' : 'tiên ngọc')); return false; }
  if (!Bag.add(Object.assign({}, entry.it, { n }))) return false;
  G.gold -= g; G.gem -= m; Sfx.chime(); Save.soon(); return true;
}
function sell(uid) { const it = Bag.get(uid); if (!it) return; const p = sellPrice(it) * (it.n || 1); if (!p) { ui.toast('Không bán được'); return; } Bag.take(uid, it.n || 1); G.gold += p; Sfx.chime(); Save.soon(); return p; }

/* ---------- Linh Đan Thụ: kết linh đan theo thời gian thật (kể cả khi tắt game), thu hoạch, nâng cấp ---------- */
const Tree = {
  sync() { const T = G.tree, iv = LINHDAN.interval * 1000, cap = LINHDAN.cap(T.lv); const now = Date.now();
    if (T.stock >= cap) { T.t = now; return; }
    const n = Math.floor((now - T.t) / iv); if (n > 0) { T.stock = Math.min(cap, T.stock + n); T.t += n * iv; if (T.stock >= cap) T.t = now; } },
  nextIn() { const T = G.tree; if (T.stock >= LINHDAN.cap(T.lv)) return 0; return Math.max(0, Math.ceil((T.t + LINHDAN.interval * 1000 - Date.now()) / 1000)); },
  harvest() { this.sync(); const T = G.tree; if (!T.stock) { ui.toast('Chưa có linh đan – chờ ' + this.nextIn() + ' giây'); return 0; }
    const n = T.stock; if (!Bag.add({ kind: 'dan', id: 'dan' + T.lv, lv: T.lv, n })) return 0; T.stock = 0; T.t = Date.now(); Quests.on('harvest'); Save.soon(); return n; },
  upgrade() { const T = G.tree; if (T.lv >= LINHDAN.maxLv) return false; const c = LINHDAN.upCost(T.lv); if (G.gold < c) { ui.toast('Cần ' + fmtFull(c) + ' linh thạch'); return false; } G.gold -= c; T.lv++; Sfx.chime(); Save.soon(); return true; }
};

/* ---------- Thần Long: triệu hồi (đủ 7 Long Châu ở Tế Đàn) → 1 điều ước ---------- */
const Dragon = {
  model: null,
  summon() {
    if (G.balls.length < LONG_CHAU_COUNT) { ui.toast('Cần đủ 7 viên Long Châu (đang có ' + G.balls.length + ')'); return; }
    const spot = World.spots.altar; if (!spot) return;
    Ents.player.invuln = true; this.show(spot.x); SideCam.cinematic(3);
    Chat.sys(G.name + ' triệu hồi Thần Long!'); Sfx.thunder();
    Tasks.after(2.4, () => ui.wishDialog());
  },
  /** Thân rồng: chuỗi đốt cầu toon vàng uốn sóng sau Tế Đàn, mắt + râu phát sáng (mô hình thủ tục, không dùng tài nguyên ngoài). */
  show(x) {
    const g = new THREE.Group(), U = ShaderLibrary.makeUnitUniforms(0xffe08a); U.uRimStrength.value = 1;
    const body = ShaderLibrary.toon(0x3fae6a, U), belly = ShaderLibrary.toon(0xe9d58a, U), segs = [];
    for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(BG.sph(), i % 3 === 0 ? belly : body); const r = 0.9 * (1 - i / 34); s.scale.set(r, r, r * 1.4); g.add(s); segs.push(s); }
    const head = segs[0]; const hm = new THREE.Mesh(BG.sph(), body); hm.scale.set(1.3, 1, 1.6); hm.position.z = 0.6; head.add(hm);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(BG.sph(), ShaderLibrary.glow(0xff4a3a, 0.9)); e.scale.setScalar(0.18); e.position.set(0.45 * s, 0.35, 1.3); head.add(e);
      const h = new THREE.Mesh(BG.cone(), belly); h.scale.set(0.12, 0.9, 0.12); h.position.set(0.4 * s, 0.9, 0.2); h.rotation.x = -0.6; head.add(h); }
    scene.add(g); g.position.set(x, World.groundAt(x), -6);
    const mats = [body, belly]; let t = 0;
    this.model = { g, mats };
    hemi.intensity = 0.35; scene.fog.color.set(0x1a1a28);
    vfx.add({ update: dt => {
      if (!this.model) return false; t += dt;
      segs.forEach((s, i) => { const k = Math.max(0, t * 1.4 - i * 0.12), ph = k * 2 - i * 0.35;
        s.position.set(Math.sin(ph) * (4 - i * 0.05) , Math.min(14, k * 4) - i * 0.25 + Math.cos(ph * 0.7) * 1.2, Math.cos(ph) * 2); });
      head.lookAt(_v1.set(x, World.groundAt(x) + 4, 8));
      if (Math.random() < 0.6) vfx.particles.emit(x + rand(-6, 6), World.groundAt(x) + rand(0, 14), -6, 0, rand(0.5, 1.5), 0, 1.5, 0.3, 0.05, COLORS.allyB, 0.8, 0.3);
      return true;
    } });
  },
  grant(id) {
    const P = Ents.player, rl = P.realm;
    switch (id) {
      case 'tv': P.gainTv(Math.max(3000, (rl.next - G.tv) * 0.35)); break;
      case 'gold': G.gold += 20000 * (rl.r + 1); break;
      case 'art': Bag.add({ kind: 'art', id: ARTIFACT_LIST[(Math.random() * ARTIFACT_LIST.length) | 0][0], plus: 3 }, true); Bag.add({ kind: 'equip', slot: EQUIP_SLOT_KEYS[(Math.random() * 5) | 0], tier: clamp(rl.r + 2, 1, 6), plus: 0 }, true); break;
      case 'skill': for (const k in G.skills) G.skills[k] = Math.min(SKILL_MAX_LV, G.skills[k] + 1); break;
      case 'gem': G.gem += 60; Bag.add({ kind: 'cons', id: 'tv_x2', n: 3 }, true); break;
    }
    G.balls = []; G.wishes++;
    Chat.sys('Thần Long: "Điều ước của ngươi đã thành hiện thực." Long Châu phân tán khắp thế gian.');
    ui.banner('Điều ước thành hiện thực', WISHES.find(w => w.id === id).name);
    Quests.on('wish'); this.dismiss(); Save.now();
  },
  dismiss() {
    if (!this.model) return;
    const { g, mats } = this.model; scene.remove(g); mats.forEach(m => m.dispose()); g.traverse(o => { if (o.material && !mats.includes(o.material)) o.material.dispose(); });
    this.model = null; Ents.player.invuln = false; World.load && (hemi.intensity = World.biome.cave ? 0.55 : 0.78, scene.fog.color.set(World.biome.fog));
  }
};
