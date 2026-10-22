// Vạn Kiếm Kỳ Trận – EffectManager: hiệu ứng có thời hạn trên từng tướng (buff / debuff chỉ số, làm chậm, giảm sát thương nhận vào,
// sát thương theo thời gian, hồi máu theo thời gian) + hàm hồi máu / lá chắn dùng chung. Nạp trước js/11-units.js.
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục.
'use strict';

/**
 * Mỗi hiệu ứng: { stat, mul?, add?, dur, tag?, src?, dot?, hot?, tick? }
 *   stat: 'atk' | 'def' | 'aspd' | 'speed' | 'dmgTaken' (nhân sát thương nhận vào) | 'ls' (hút máu cộng thêm)
 *   mul: hệ số nhân, add: cộng thẳng; tag: cùng tag + stat thì làm mới thời gian thay vì cộng dồn (chống chồng vô hạn).
 *   dot: hệ số công mỗi nhịp (sát thương theo thời gian, nguồn = src); hot: máu hồi mỗi nhịp (số tuyệt đối).
 */
class EffectSet {
  constructor(unit) { this.u = unit; this.list = []; }
  clear() { this.list.length = 0; }
  push(e) {
    const tick = e.tick || 0.5;
    if (e.tag) {
      const old = this.list.find(x => x.tag === e.tag && x.stat === e.stat);
      if (old) { old.t = Math.max(old.t, e.dur); if (e.mul !== undefined) old.mul = e.mul; if (e.add !== undefined) old.add = e.add; if (e.dot) old.dot = e.dot; if (e.hot) old.hot = e.hot; old.src = e.src || old.src; return old; }
    }
    const x = Object.assign({}, e, { t: e.dur, acc: 0, tick });
    this.list.push(x);
    return x;
  }
  mul(stat) { let m = 1; for (const e of this.list) if (e.stat === stat && e.mul !== undefined) m *= e.mul; return m; }
  sum(stat) { let a = 0; for (const e of this.list) if (e.stat === stat && e.add !== undefined) a += e.add; return a; }
  has(tag) { return this.list.some(e => e.tag === tag); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.t -= dt;
      if (e.dot || e.hot) {
        e.acc += dt;
        while (e.acc >= e.tick && this.u.alive) {
          e.acc -= e.tick;
          if (e.dot && e.src) dealDamage(e.src, this.u, e.dot, { dot: true, skill: true });
          if (e.hot) healUnit(e.src || this.u, this.u, e.hot, true);
        }
      }
      if (e.t <= 0) this.list.splice(i, 1);
    }
  }
}

/** Hồi máu (không vượt máu tối đa). quiet = không hiện số (dùng cho hồi theo nhịp nhỏ). Trả về lượng hồi thực tế. */
function healUnit(src, dst, amount, quiet) {
  if (!dst || !dst.alive || amount <= 0) return 0;
  const before = dst.hp;
  dst.hp = Math.min(dst.maxHp, dst.hp + amount);
  const got = dst.hp - before;
  if (got > 0) {
    combatLog.healed = (combatLog.healed || 0) + got;
    if (!quiet || got >= 25) floatText(dst.chest(_v2.clone()), '+' + Math.round(got), '#7fe0a0', quiet ? 0.75 : 1);
    if (!quiet) vfx.particles.burst(dst.chest(_v2.clone()), COLORS.shield, 14, 3, 0.6, 0.25, { up: 2.5, drag: 2 });
  }
  return got;
}
/** Lá chắn: lấy giá trị lớn hơn giữa khiên đang có và khiên mới, kèm hiệu ứng Fresnel. */
function giveShield(dst, amount, dur) {
  if (!dst || !dst.alive || amount <= 0) return;
  dst.shield = Math.max(dst.shield, amount); dst.shieldTime = Math.max(dst.shieldTime, dur);
  if (!dst.shieldFx) dst.shieldFx = makeShield(dst);
  floatText(dst.chest(_v2.clone()), '+Khiên ' + Math.round(amount), '#9ff0d0', 0.9);
}
/** Làm chậm: giảm tốc chạy theo amount, tốc đánh giảm một nửa mức đó. Cùng nguồn làm mới thời gian, không cộng dồn. */
function applySlow(dst, amount, dur) {
  if (!dst || !dst.alive) return;
  const fresh = !dst.fx.has('slow');
  dst.fx.push({ stat: 'speed', mul: 1 - amount, dur, tag: 'slow' });
  dst.fx.push({ stat: 'aspd', mul: 1 - amount * 0.5, dur, tag: 'slow' });
  if (fresh) floatText(dst.chest(_v2.clone()), 'Chậm', '#a8dcff', 0.75);
  combatLog.slows = (combatLog.slows || 0) + 1;
}
