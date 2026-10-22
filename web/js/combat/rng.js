// Vạn Kiếm Kỳ Trận – Bộ sinh số ngẫu nhiên có seed cho LOGIC chiến đấu (né, chí mạng, dao động sát thương, nhịp đánh đầu trận…).
// VFX / âm thanh vẫn dùng Math.random → đổi mức đồ hoạ (nhiều / ít hạt) không làm lệch chuỗi số của trận.
// Cùng seed + cùng số bước mô phỏng → cùng kết quả (dùng để tái hiện lỗi). Nạp trước js/11-units.js.
'use strict';
const CombatRNG = {
  seed0: 1, state: 1, calls: 0,
  /** Đặt seed (số nguyên 32 bit). Gọi lúc bắt đầu mỗi trận. */
  seed(n) { this.seed0 = (n >>> 0) || 1; this.state = this.seed0; this.calls = 0; return this.seed0; },
  /** mulberry32: [0, 1) */
  next() {
    this.calls++;
    let a = (this.state = (this.state + 0x6D2B79F5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};
const crand = () => CombatRNG.next();
const crandR = (a, b) => a + CombatRNG.next() * (b - a);
