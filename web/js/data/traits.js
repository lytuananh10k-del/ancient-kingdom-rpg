// Vạn Kiếm Kỳ Trận – Dữ liệu tộc / hệ (V1.5 tuần 2) + TraitRegistry. Nạp trước js/combat/traits-engine.js và js/14-game.js.
// Mọi hệ số nằm ở đây (không viết cứng trong mã chiến đấu). Mỗi tướng có đúng 1 tộc (origin) và ít nhất 1 hệ (traits).
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục.
'use strict';

/** Chỉ số tộc/hệ được phép cộng (đều là phần trăm, dạng 0.15 = +15%). Cùng một chỉ số từ nhiều tộc/hệ khác nhau thì CỘNG lại
 *  (Nhân Tộc +12% tốc đánh và Yêu Tộc +8% tốc đánh → +20%); mỗi tộc/hệ chỉ áp mốc cao nhất đã đạt (các mốc không cộng dồn với nhau). */
const TRAIT_STATS = {
  atk: 'công', hp: 'máu tối đa', def: 'giáp', aspd: 'tốc đánh', skill: 'sức mạnh kỹ năng',
  omni: 'hút máu toàn phần', mana: 'năng lượng nhận được', heal: 'hiệu quả hồi máu'
};

/* Mỗi mốc (levels[i] ứng với tiers[i]) là cấu hình ĐẦY ĐỦ của mốc đó:
 *   scope: 'members' (chỉ tướng thuộc tộc/hệ) | 'team' (mọi tướng phe ta trên bàn)
 *   stats: { chỉ số: phần trăm }
 *   startShield: { pct, dur, to: 'self' | 'adjacent' } – lá chắn lúc bắt đầu trận (pct × máu tối đa của người nhận)
 *   swords: { count, mult } – mỗi lần tướng thuộc hệ tung kỹ năng phóng `count` phi kiếm phụ, mỗi kiếm `mult` × công, trúng đúng 1 lần
 *   mageBurst: { pct } – kỹ năng trúng địch gây thêm sát thương phép = pct × máu tối đa của mục tiêu, tối đa 1 lần / mục tiêu / lần thi triển
 *   lowHpHeal: { below, pct, dur } – lần đầu mỗi đồng minh xuống dưới `below` máu: hồi `pct` máu tối đa trong `dur` giây */
const TRAITS = {
  // ---------------- 4 Tộc ----------------
  nhan: { kind: 'origin', name: 'Nhân Tộc', han: '人', color: '#5fd6a8', vfx: 'jade', tiers: [2, 4, 6],
    blurb: 'Linh hoạt, tăng trưởng theo thời gian.',
    levels: [
      { scope: 'team', stats: { aspd: 0.05 } },
      { scope: 'team', stats: { aspd: 0.12 } },
      { scope: 'team', stats: { aspd: 0.20, atk: 0.10 } }] },
  ma: { kind: 'origin', name: 'Ma Tộc', han: '魔', color: '#e0508a', vfx: 'demon', tiers: [2, 4, 6],
    blurb: 'Sức mạnh bóng tối, hút máu và gây sát thương.',
    levels: [
      { scope: 'members', stats: { omni: 0.08 } },
      { scope: 'members', stats: { omni: 0.15, atk: 0.10 } },
      { scope: 'members', stats: { omni: 0.22, atk: 0.20 } }] },
  tien: { kind: 'origin', name: 'Tiên Tộc', han: '仙', color: '#ffe08a', vfx: 'halo', tiers: [2, 4, 6],
    blurb: 'Linh lực, hồi phục và bảo vệ.',
    levels: [
      { scope: 'members', stats: { mana: 0.10 } },
      { scope: 'members', stats: { mana: 0.20 }, startShield: { pct: 0.10, dur: 15, to: 'self' } },
      { scope: 'members', stats: { mana: 0.30 }, startShield: { pct: 0.20, dur: 15, to: 'self' } }] },
  yeu: { kind: 'origin', name: 'Yêu Tộc', han: '妖', color: '#8fe06a', vfx: 'beast', tiers: [2, 4, 6],
    blurb: 'Sinh tồn, tốc độ và sức mạnh thể chất.',
    levels: [
      { scope: 'members', stats: { hp: 0.08 } },
      { scope: 'members', stats: { hp: 0.18, aspd: 0.08 } },
      { scope: 'members', stats: { hp: 0.30, aspd: 0.15 } }] },
  // ---------------- 4 Hệ ----------------
  kiemtu: { kind: 'class', name: 'Kiếm Tu', han: '劍', color: '#9fd8ff', vfx: 'sword', tiers: [2, 4, 6],
    blurb: 'Sát thương vật lý và phi kiếm.',
    levels: [
      { scope: 'members', stats: { atk: 0.15 } },
      { scope: 'members', stats: { atk: 0.30 }, swords: { count: 1, mult: 0.35 } },
      { scope: 'members', stats: { atk: 0.50 }, swords: { count: 3, mult: 0.35 } }] },
  phaptu: { kind: 'class', name: 'Pháp Tu', han: '法', color: '#b48cff', vfx: 'arcane', tiers: [2, 4, 6],
    blurb: 'Sát thương pháp thuật và kỹ năng diện rộng.',
    levels: [
      { scope: 'members', stats: { skill: 0.15 } },
      { scope: 'members', stats: { skill: 0.35 } },
      { scope: 'members', stats: { skill: 0.60 }, mageBurst: { pct: 0.05 } }] },
  hophap: { kind: 'class', name: 'Hộ Pháp', han: '護', color: '#e9c46a', vfx: 'guard', tiers: [2, 4, 6],
    blurb: 'Chống chịu và bảo vệ đồng minh.',
    levels: [
      { scope: 'members', stats: { def: 0.15 } },
      { scope: 'members', stats: { def: 0.30 }, startShield: { pct: 0.08, dur: 15, to: 'adjacent' } },
      { scope: 'members', stats: { def: 0.50 }, startShield: { pct: 0.15, dur: 15, to: 'adjacent' } }] },
  dantu: { kind: 'class', name: 'Đan Tu', han: '丹', color: '#5fe0d0', vfx: 'lotus', tiers: [2, 3, 4],
    blurb: 'Hồi phục và hỗ trợ.',
    levels: [
      { scope: 'members', stats: { heal: 0.15 } },
      { scope: 'members', stats: { heal: 0.30 } },
      { scope: 'members', stats: { heal: 0.50 }, lowHpHeal: { below: 0.30, pct: 0.12, dur: 3 } }] }
};

/** Phân loại phụ (chỉ hiển thị, không có cộng hưởng): giữ lại thông tin hệ / tộc của tuần 1 khi gộp về 8 tộc/hệ chính.
 *  Dùng làm điểm nối cho mùa sau (có thể nâng thành hệ thật bằng cách thêm vào TRAITS). */
const SUBCLASSES = {
  xatu: 'Xạ Tu', thuongtu: 'Thương Tu', sattu: 'Sát Tu', thetu: 'Thể Tu', linh: 'Linh thể'
};

const traitPct = x => Math.round(x * 100) + '%';
/** TraitRegistry: tra cứu, mô tả (sinh từ dữ liệu – mô tả luôn khớp hệ số thật) và kiểm tra cấu hình tộc/hệ. */
const TraitRegistry = {
  all: () => Object.keys(TRAITS),
  get: id => TRAITS[id],
  /** Mọi tộc/hệ của một định nghĩa tướng: [tộc, ...hệ]. */
  of: def => (def.origin && TRAITS[def.origin] ? [def.origin] : []).concat((def.traits || []).filter(t => TRAITS[t])),
  /** Mốc đã đạt (0 = chưa kích hoạt) với n tướng khác nhau. */
  level(id, n) { const T = TRAITS[id]; let lv = 0; if (T) T.tiers.forEach((m, i) => { if (n >= m) lv = i + 1; }); return lv; },
  next(id, n) { const T = TRAITS[id]; return T.tiers.find(m => m > n) || 0; },
  describe(id, lv) {
    const T = TRAITS[id], L = T.levels[lv - 1], who = L.scope === 'team' ? 'Toàn đội' : T.name, parts = [];
    for (const k in L.stats) parts.push('+' + traitPct(L.stats[k]) + ' ' + TRAIT_STATS[k]);
    let s = who + ' ' + parts.join(', ');
    if (L.startShield) s += L.startShield.to === 'adjacent' ? `; đồng minh đứng cạnh nhận lá chắn ${traitPct(L.startShield.pct)} máu tối đa khi vào trận` : `; lá chắn ${traitPct(L.startShield.pct)} máu tối đa khi vào trận`;
    if (L.swords) s += `; mỗi lần tung kỹ năng phóng ${L.swords.count} phi kiếm phụ, mỗi kiếm ${traitPct(L.swords.mult)} công`;
    if (L.mageBurst) s += `; kỹ năng trúng địch gây thêm ${traitPct(L.mageBurst.pct)} máu tối đa của mục tiêu (1 lần / mục tiêu / lần thi triển)`;
    if (L.lowHpHeal) s += `; lần đầu mỗi đồng minh xuống dưới ${traitPct(L.lowHpHeal.below)} máu: hồi ${traitPct(L.lowHpHeal.pct)} máu tối đa trong ${L.lowHpHeal.dur} giây`;
    return s;
  },
  /** Kiểm tra cấu hình: trả về danh sách lỗi (rỗng = hợp lệ). champions = danh sách tướng bán ở cửa hàng. */
  validate(champions) {
    const errs = [];
    for (const id in TRAITS) {
      const T = TRAITS[id];
      if (!['origin', 'class'].includes(T.kind)) errs.push(id + ': kind phải là origin | class');
      if (!T.tiers.length || T.tiers.some((m, i) => m < 1 || (i && m <= T.tiers[i - 1]))) errs.push(id + ': mốc phải tăng dần');
      if (T.levels.length !== T.tiers.length) errs.push(id + ': số mốc và số cấu hình hiệu ứng không khớp');
      T.levels.forEach((L, i) => {
        if (!['members', 'team'].includes(L.scope)) errs.push(`${id} mốc ${i + 1}: scope lạ`);
        for (const k in L.stats || {}) if (!TRAIT_STATS[k] || !(L.stats[k] > 0 && L.stats[k] < 3)) errs.push(`${id} mốc ${i + 1}: chỉ số lạ / sai ${k}`);
      });
      const members = champions.filter(c => TraitRegistry.of(c).includes(id)).length;
      if (members < T.tiers[T.tiers.length - 1]) errs.push(`${id}: mốc cao nhất ${T.tiers[T.tiers.length - 1]} không đạt được (chỉ có ${members} tướng)`);
      if (members && !champions.some(c => c.cost <= 2 && TraitRegistry.of(c).includes(id))) errs.push(id + ': không có tướng bậc 1–2 để mở mốc đầu');
    }
    for (const c of champions) {
      if (!TRAITS[c.origin] || TRAITS[c.origin].kind !== 'origin') errs.push(c.id + ': phải có đúng 1 tộc hợp lệ');
      if (!(c.traits || []).length || c.traits.some(t => !TRAITS[t] || TRAITS[t].kind !== 'class')) errs.push(c.id + ': phải có ít nhất 1 hệ hợp lệ');
      for (const s of c.sub || []) if (!SUBCLASSES[s]) errs.push(c.id + ': phân loại phụ lạ ' + s);
    }
    return errs;
  }
};
