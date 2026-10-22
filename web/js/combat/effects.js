// Vạn Kiếm Kỳ Trận – StatusEffectManager (V1.5 tuần 3): mọi trạng thái chiến đấu của một tướng – khống chế (choáng, đóng băng),
// làm chậm, thiêu đốt / sát thương theo thời gian, lá chắn, tăng / giảm chỉ số, hồi máu theo thời gian, hút máu, giảm giáp / kháng phép.
// Thời gian tính theo đồng hồ MÔ PHỎNG (battle.time, bước cố định 60 Hz) – không dùng setTimeout, không phụ thuộc FPS.
// Nạp trước js/11-units.js. Script thường (không phải module): các file chia sẻ phạm vi toàn cục.
'use strict';

/** Loại trạng thái. stack: quy tắc cộng dồn khi cùng loại được áp lại:
 *   refresh   – cùng loại + cùng tag (hoặc cùng nguồn nếu không có tag): thay sức mạnh bằng lần mới, kéo dài tới mốc xa hơn; khác nguồn thì tồn tại song song (nhân với nhau)
 *   strongest – chỉ 1 bản mỗi loại: mạnh hơn thì thay (tính lại thời gian), bằng thì kéo dài, yếu hơn thì bỏ qua
 *   longest   – chỉ 1 bản: giữ mốc kết thúc xa nhất (choáng, đóng băng)
 *   max       – chỉ 1 bản: lượng = max(còn lại, mới), thời gian = mốc xa nhất (lá chắn)
 *  cleanse: Linh Y (và hiệu ứng thanh tẩy sau này) gỡ được. debuff: hiệu ứng bất lợi. */
const STATUS = {
  stun:           { name: 'Choáng',            debuff: true,  cleanse: true,  stack: 'longest',   color: '#ffe08a' },
  freeze:         { name: 'Đóng băng',         debuff: true,  cleanse: true,  stack: 'longest',   color: '#cfeeff' },
  slow:           { name: 'Làm chậm',          debuff: true,  cleanse: true,  stack: 'strongest', color: '#a8dcff' },
  burn:           { name: 'Thiêu đốt',         debuff: true,  cleanse: true,  stack: 'refresh',   color: '#ffb070', tick: 0.5 },
  dot:            { name: 'Sát thương liên tục', debuff: true, cleanse: true, stack: 'refresh',   color: '#ff9a8a', tick: 0.5 },
  shield:         { name: 'Lá chắn',           debuff: false, cleanse: false, stack: 'max',       color: '#9ff0d0' },
  atkBuff:        { name: 'Tăng công',         debuff: false, cleanse: false, stack: 'refresh',   color: '#ffe08a' },
  atkDown:        { name: 'Giảm công',         debuff: true,  cleanse: true,  stack: 'strongest', color: '#ffb0a0' },
  defBuff:        { name: 'Tăng giáp',         debuff: false, cleanse: false, stack: 'refresh',   color: '#e9c46a' },
  armorReduction: { name: 'Giảm giáp',         debuff: true,  cleanse: true,  stack: 'strongest', color: '#ff8a7a' },
  mrBuff:         { name: 'Tăng kháng phép',   debuff: false, cleanse: false, stack: 'refresh',   color: '#b48cff' },
  mrReduction:    { name: 'Giảm kháng phép',   debuff: true,  cleanse: true,  stack: 'strongest', color: '#d08aff' },
  aspdBuff:       { name: 'Tăng tốc đánh',     debuff: false, cleanse: false, stack: 'refresh',   color: '#ffe08a' },
  aspdDown:       { name: 'Giảm tốc đánh',     debuff: true,  cleanse: true,  stack: 'strongest', color: '#a8dcff' },
  apBuff:         { name: 'Tăng phép thuật',   debuff: false, cleanse: false, stack: 'refresh',   color: '#b48cff' },
  dmgReduction:   { name: 'Giảm sát thương nhận', debuff: false, cleanse: false, stack: 'refresh', color: '#9ff0d0' },
  dmgAmp:         { name: 'Tăng sát thương nhận', debuff: true, cleanse: true, stack: 'strongest', color: '#ff8a7a' },
  hot:            { name: 'Hồi máu liên tục',  debuff: false, cleanse: false, stack: 'refresh',   color: '#7fe0a0', tick: 0.5 },
  lifesteal:      { name: 'Hút máu',           debuff: false, cleanse: false, stack: 'refresh',   color: '#ff7a8a' }
};
let statusUid = 0;
const simNow = () => battle.time;

/** Đổi lời gọi kiểu cũ { stat, mul, add } sang loại trạng thái. */
function statusTypeOf(e) {
  if (e.type) return e.type;
  if (e.dot) return e.burn ? 'burn' : 'dot';
  if (e.hot) return 'hot';
  const up = e.mul !== undefined ? e.mul >= 1 : (e.add || 0) >= 0;
  switch (e.stat) {
    case 'atk': return up ? 'atkBuff' : 'atkDown';
    case 'def': return up ? 'defBuff' : 'armorReduction';
    case 'mr': return up ? 'mrBuff' : 'mrReduction';
    case 'aspd': return up ? 'aspdBuff' : 'aspdDown';
    case 'ap': return 'apBuff';
    case 'speed': return 'slow';
    case 'dmgTaken': return up ? 'dmgAmp' : 'dmgReduction';
    case 'ls': return 'lifesteal';
    default: return 'atkBuff';
  }
}

class StatusEffectManager {
  constructor(unit) { this.u = unit; this.list = []; }
  clear() { this.list.length = 0; this.sync(); }
  /** Áp trạng thái. o: { type?, stat?, mul?, add?, mods?, dur, src?, tag?, tick?, dot?, hot?, raw?, dtype?, amount? } – trả về bản ghi. */
  push(o) {
    const type = statusTypeOf(o), S = STATUS[type] || STATUS.atkBuff, now = simNow(), dur = Math.max(0, o.dur || 0);
    const mods = o.mods || (o.stat ? [{ stat: o.stat, mul: o.mul, add: o.add }] : []);
    const power = o.amount !== undefined ? o.amount : o.power !== undefined ? o.power : mods.reduce((a, m) => a + (m.mul !== undefined ? Math.abs(1 - m.mul) : Math.abs(m.add || 0)), 0) + (o.dot || 0) + (o.hot || 0);
    const srcId = o.src ? o.src.id : 0, key = type + '|' + (o.tag || srcId);
    const tick = o.tick || S.tick || 0.5;
    let old = null;
    if (S.stack === 'refresh') old = this.list.find(e => e.key === key);
    else old = this.list.find(e => e.type === type);
    if (old) {
      if (S.stack === 'longest') old.end = Math.max(old.end, now + dur);
      else if (S.stack === 'max') { old.power = Math.max(old.power, power); old.end = Math.max(old.end, now + dur); }
      else if (S.stack === 'strongest') {
        if (power > old.power + 1e-9) Object.assign(old, { power, mods, start: now, end: now + dur, src: o.src || old.src, srcId });
        else if (Math.abs(power - old.power) <= 1e-9) old.end = Math.max(old.end, now + dur);
      } else {   // refresh
        Object.assign(old, { power, mods, src: o.src || old.src, end: Math.max(old.end, now + dur) });
        if (o.dot) old.dot = o.dot;
        if (o.hot) { old.hot = o.hot; old.left = o.hot * dur / tick; }
      }
      this.sync(); return old;
    }
    const e = { uid: ++statusUid, id: type, type, key, name: S.name, debuff: S.debuff, cleanse: S.cleanse, src: o.src || null, srcId, target: this.u,
      start: now, end: now + dur, power, mods, tag: o.tag || null, tick, nextTick: now + tick,
      dot: o.dot || 0, hot: o.hot || 0, left: o.hot ? o.hot * dur / tick : 0, raw: !!o.raw, dtype: o.dtype || DAMAGE.dotType, skill: o.skill !== false && !o.burn, stat: o.stat };
    this.list.push(e);
    this.sync();
    return e;
  }
  /** Tích các hệ số nhân của một chỉ số (atk, def, mr, aspd, ap, speed, dmgTaken). */
  mul(stat) { let m = 1; for (const e of this.list) for (const d of e.mods) if (d.stat === stat && d.mul !== undefined) m *= d.mul; return m; }
  /** Tổng phần cộng thẳng của một chỉ số (def, mr, ls…). */
  sum(stat) { let a = 0; for (const e of this.list) for (const d of e.mods) if (d.stat === stat && d.add !== undefined) a += d.add; return a; }
  has(tag) { return this.list.some(e => e.tag === tag); }
  hasType(type) { return this.list.some(e => e.type === type); }
  remaining(type) { let r = 0; const now = simNow(); for (const e of this.list) if (e.type === type) r = Math.max(r, e.end - now); return Math.max(0, r); }
  /** Đồng bộ các trường cũ (status.stun / frozen / burn) mà FSM, AI và giao diện đang đọc. */
  sync() {
    const s = this.u.status; if (!s) return;
    const f = this.remaining('freeze');
    s.frozen = f; s.stun = Math.max(this.remaining('stun'), f); s.burn = this.remaining('burn');
  }
  /** Bước mô phỏng: nhịp DoT / HoT đúng mốc thời gian, hết hạn đúng end. */
  update() {
    const now = simNow();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.dot || e.hot) {
        while (now >= e.nextTick - 1e-9 && e.nextTick <= e.end + 1e-9 && this.u.alive) {
          e.nextTick += e.tick;
          if (e.dot && e.src) dealDamage(e.src, this.u, e.dot, { dot: true, skill: e.skill, type: e.dtype, burn: 0 });
          if (e.hot && e.left > 0) { const h = Math.min(e.hot, e.left); e.left -= h; healUnit(e.src || this.u, this.u, h, true, e.raw); }
          if (i >= this.list.length || this.list[i] !== e) break;   // tướng chết giữa nhịp → danh sách đã bị xoá
        }
      }
      if (this.list[i] !== e) continue;
      if (now >= e.end - 1e-9) {
        if (e.hot && e.left > 0.01 && this.u.alive) healUnit(e.src || this.u, this.u, e.left, true, e.raw);   // dư do làm tròn nhịp → hồi nốt, tổng luôn đủ
        this.list.splice(i, 1);
      }
    }
    this.sync();
  }
  /* ---------- Lá chắn ---------- */
  shieldAmount() { const e = this.list.find(x => x.type === 'shield'); return e ? e.power : 0; }
  setShield(v) {
    const i = this.list.findIndex(x => x.type === 'shield');
    if (v > 0) { if (i >= 0) this.list[i].power = v; else this.push({ type: 'shield', amount: v, dur: 15 }); }
    else if (i >= 0) this.list.splice(i, 1);
  }
  /** Lá chắn hấp thụ sát thương; trả về lượng đã hấp thụ. */
  absorb(dmg) {
    const i = this.list.findIndex(x => x.type === 'shield'); if (i < 0 || dmg <= 0) return 0;
    const e = this.list[i], a = Math.min(e.power, dmg); e.power -= a;
    if (e.power <= 1e-6) this.list.splice(i, 1);
    return a;
  }
  /* ---------- Thanh tẩy ---------- */
  /** Gỡ tối đa n hiệu ứng bất lợi có thể thanh tẩy (mới nhất trước). Trả về danh sách đã gỡ. */
  cleanse(n = 1) {
    const out = [];
    const cand = this.list.filter(e => e.debuff && e.cleanse).sort((a, b) => b.start - a.start || b.uid - a.uid).slice(0, n);
    for (const e of cand) { this.list.splice(this.list.indexOf(e), 1); out.push(e); }
    if (out.length) { this.sync(); combatLog.cleansed = (combatLog.cleansed || 0) + out.length; }
    return out;
  }
  /** Danh sách cho giao diện: tên, còn lại (s), bất lợi?, màu. */
  describe() {
    const now = simNow();
    return this.list.map(e => ({ type: e.type, name: STATUS[e.type].name, left: Math.max(0, e.end - now), debuff: e.debuff, color: STATUS[e.type].color, power: e.power }));
  }
}
const EffectSet = StatusEffectManager;   // tên cũ (tuần 1–2)

/** Hồi máu (không vượt máu tối đa). quiet = không hiện số (dùng cho hồi theo nhịp nhỏ). raw = không nhân hiệu quả hồi máu (Đan Tu)
 *  của người hồi – dùng cho lượng hồi cố định theo dữ liệu. Trả về lượng hồi thực tế. */
function healUnit(src, dst, amount, quiet, raw) {
  if (!dst || !dst.alive || !(amount > 0)) return 0;
  if (!raw && src && src.bonus && src.bonus.heal) amount *= src.bonus.heal;
  amount *= overtimeHealMul();   // giai đoạn hỗn loạn: hồi máu giảm
  const before = dst.hp;
  dst.hp = Math.min(dst.maxHp, dst.hp + amount);
  const got = dst.hp - before;
  if (got > 0) {
    combatLog.healed = (combatLog.healed || 0) + got;
    if (src && src.cs) src.cs.healed += got;
    if (!quiet || got >= 25) floatText(dst.chest(_v2.clone()), '+' + Math.round(got), '#7fe0a0', quiet ? 0.75 : 1);
    if (!quiet) vfx.particles.burst(dst.chest(_v2.clone()), COLORS.shield, 14, 3, 0.6, 0.25, { up: 2.5, drag: 2 });
    if (typeof TraitEvents !== 'undefined') TraitEvents.emit('onHeal', src, dst, got);
  }
  return got;
}
/** Lá chắn: lấy giá trị lớn hơn giữa khiên đang có và khiên mới (không cộng dồn), kèm hiệu ứng Fresnel. */
function giveShield(dst, amount, dur, src) {
  if (!dst || !dst.alive || !(amount > 0)) return;
  dst.fx.push({ type: 'shield', amount, dur, src });
  if (src && src.cs) src.cs.shielded += amount;
  if (!dst.shieldFx) dst.shieldFx = makeShield(dst);
  floatText(dst.chest(_v2.clone()), '+Khiên ' + Math.round(amount), '#9ff0d0', 0.9);
}
/** Làm chậm: giảm tốc chạy theo amount, tốc đánh giảm một nửa mức đó. Chỉ giữ hiệu ứng mạnh nhất. */
function applySlow(dst, amount, dur, src) {
  if (!dst || !dst.alive) return;
  const fresh = !dst.fx.hasType('slow');
  dst.fx.push({ type: 'slow', power: amount, mods: [{ stat: 'speed', mul: 1 - amount }, { stat: 'aspd', mul: 1 - amount * 0.5 }], dur, src, tag: 'slow' });
  if (fresh) floatText(dst.chest(_v2.clone()), 'Chậm', '#a8dcff', 0.75);
  combatLog.slows = (combatLog.slows || 0) + 1;
}
/** Thiêu đốt: power × công mỗi 0,5 s (sát thương phép, không nhân AP), 3 giây; áp lại thì làm mới. */
function applyBurn(dst, src, power, dur = 3) {
  if (!dst || !dst.alive || !(power > 0)) return;
  if (!dst.fx.hasType('burn')) floatText(dst.chest(_v2.clone()), 'Thiêu đốt', '#ffb070', 0.7);
  dst.fx.push({ type: 'burn', dot: power, burn: true, skill: false, dur, src, tag: 'burn', dtype: 'magic' });
  combatLog.burns = (combatLog.burns || 0) + 1;
}
