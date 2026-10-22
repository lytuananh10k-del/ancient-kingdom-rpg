// Vạn Kiếm Kỳ Trận – PathFinder (V1.5 tuần 3): lưới dẫn đường + A* cho AI giao chiến.
// Bàn 8×8 ô (BOARD.tile m) được chia 2×2 → lưới 16×16 ô dẫn đường (mỗi ô ≈ 1,15 m, vừa một tướng).
//   - Ô có tướng KHÁC đang đứng = chặn (không đi xuyên qua đơn vị cản đường); mục tiêu và chính mình không chặn.
//   - Ô đích (chỗ đứng đánh) được ĐẶT CHỖ: hai tướng không chọn cùng một ô → không đứng chồng lên nhau.
//   - Đường đi lưu trong unit.nav, chỉ tính lại khi đổi mục tiêu, ô đích / ô kế tiếp bị chiếm, đi hết đường hoặc sau NAV.repath giây.
// Nạp trước js/11-units.js. Script thường (không phải module).
'use strict';
const NAV = { div: 2, repath: 0.6, arrive: 0.25 };
const NavGrid = {
  n: 0, cell: 0, half: 0, occ: null, resv: null, stamp: -1, searches: 0,
  init() {
    this.n = BOARD.cols * NAV.div; this.cell = BOARD.tile / NAV.div; this.half = this.n * this.cell / 2;
    this.occ = new Int32Array(this.n * this.n); this.resv = new Int32Array(this.n * this.n);
    // bộ nhớ A* dùng lại (không cấp phát trong vòng lặp)
    const N = this.n * this.n;
    this.g = new Float32Array(N); this.f = new Float32Array(N); this.from = new Int32Array(N); this.seen = new Int32Array(N); this.closed = new Int32Array(N); this.gen = 0;
    this.heap = new Int32Array(N * 8); this.hn = 0;
  },
  idx(cx, cz) { return cz * this.n + cx; },
  cellOf(x, z) { const n = this.n; return this.idx(clamp(Math.floor((x + this.half) / this.cell), 0, n - 1), clamp(Math.floor((z + this.half) / this.cell), 0, n - 1)); },
  center(i, out) { const n = this.n; return out.set(-this.half + ((i % n) + 0.5) * this.cell, 0, -this.half + (Math.floor(i / n) + 0.5) * this.cell); },
  /** Bản đồ chiếm chỗ: dựng lại tối đa 1 lần mỗi bước mô phỏng. occ[i] = id tướng đứng ở ô i (0 = trống). */
  refresh() {
    if (this.stamp === battle.time && this.occ) return;
    if (!this.occ) this.init();
    this.stamp = battle.time; this.occ.fill(0); this.resv.fill(0);
    for (const u of units) {
      if (!u.alive) continue;
      this.occ[this.cellOf(u.pos.x, u.pos.z)] = u.id;
      if (u.nav && u.nav.goal >= 0) this.resv[u.nav.goal] = u.id;
    }
  },
  blocked(i, self, target) { const o = this.occ[i]; return o !== 0 && o !== self.id && !(target && o === target.id); },
  reservedByOther(i, self) { const r = this.resv[i]; return r !== 0 && r !== self.id; },
  /** Ô đứng đánh: ô trống (không ai đứng / đặt chỗ) có tâm cách mục tiêu ≤ reach, gần mình nhất (tính cả độ dài vòng). */
  pickGoal(self, target, reach) {
    this.refresh();
    const n = this.n, c = _v3; let best = -1, bs = Infinity;
    const tc = this.cellOf(target.pos.x, target.pos.z), span = Math.ceil(reach / this.cell) + 1, tx = tc % n, tz = Math.floor(tc / n);
    for (let dz = -span; dz <= span; dz++) for (let dx = -span; dx <= span; dx++) {
      const cx = tx + dx, cz = tz + dz; if (cx < 0 || cz < 0 || cx >= n || cz >= n) continue;
      const i = this.idx(cx, cz); this.center(i, c);
      const dt = Math.hypot(c.x - target.pos.x, c.z - target.pos.z); if (dt > reach) continue;
      if (this.blocked(i, self, null) || this.reservedByOther(i, self)) continue;
      const s = Math.hypot(c.x - self.pos.x, c.z - self.pos.z) + dt * 0.15;
      if (s < bs) { bs = s; best = i; }
    }
    return best;
  },
  /** A* 8 hướng (không cắt góc qua ô bị chặn). Trả về mảng ô từ sau ô xuất phát tới ô đích, hoặc null nếu không tới được. */
  astar(self, start, goal, target) {
    this.searches++;
    const n = this.n, g = this.g, f = this.f, from = this.from, seen = this.seen, closed = this.closed, gen = ++this.gen;
    const gx = goal % n, gz = Math.floor(goal / n), H = i => { const dx = Math.abs(i % n - gx), dz = Math.abs(Math.floor(i / n) - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    this.hn = 0; seen[start] = gen; g[start] = 0; f[start] = H(start); from[start] = -1; this.push(start);
    let iter = 0;
    while (this.hn && iter++ < 2000) {
      const cur = this.pop(); if (closed[cur] === gen) continue; closed[cur] = gen;
      if (cur === goal) { const path = []; for (let i = cur; i !== start; i = from[i]) path.push(i); return path.reverse(); }
      const cx = cur % n, cz = Math.floor(cur / n);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        const ni = this.idx(nx, nz);
        if (ni !== goal && this.blocked(ni, self, target)) continue;
        if (dx && dz && (this.blocked(this.idx(cx + dx, cz), self, target) || this.blocked(this.idx(cx, cz + dz), self, target))) continue;   // không lách chéo qua khe
        const ng = g[cur] + (dx && dz ? 1.414 : 1);
        if (seen[ni] === gen && ng >= g[ni]) continue;
        seen[ni] = gen; g[ni] = ng; f[ni] = ng + H(ni); from[ni] = cur; this.push(ni);
      }
    }
    return null;
  },
  push(i) { const h = this.heap, f = this.f; let k = this.hn++; h[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (f[h[p]] <= f[h[k]]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; } },
  pop() {
    const h = this.heap, f = this.f, top = h[0]; h[0] = h[--this.hn]; let k = 0;
    for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < this.hn && f[h[l]] < f[h[m]]) m = l; if (r < this.hn && f[h[r]] < f[h[m]]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; }
    return top;
  }
};

/** Bước đi theo đường A*: trả về hướng (đã chuẩn hoá) tới điểm kế tiếp, hoặc null nếu không có đường (khi đó AI dùng lái trực tiếp). */
function navSteer(u, t, reach, dt, out) {
  const g = NavGrid; g.refresh();
  const nav = u.nav || (u.nav = { path: null, k: 0, goal: -1, tid: 0, t: 0 });
  nav.t -= dt;
  const need = !nav.path || nav.tid !== t.id || nav.t <= 0 || nav.k >= nav.path.length ||
    (nav.goal >= 0 && g.blocked(nav.goal, u, null)) ||
    (nav.path && nav.k < nav.path.length && g.blocked(nav.path[nav.k], u, t));
  if (need) {
    nav.tid = t.id; nav.t = NAV.repath; nav.k = 0; nav.path = null; nav.goal = -1;
    const goal = g.pickGoal(u, t, reach);
    if (goal >= 0) {
      const start = g.cellOf(u.pos.x, u.pos.z);
      nav.path = start === goal ? [goal] : g.astar(u, start, goal, t);
      if (nav.path) { nav.goal = goal; g.resv[goal] = u.id; }
    }
    combatLog.repaths = (combatLog.repaths || 0) + 1;
  }
  if (!nav.path || nav.k >= nav.path.length) return null;
  const wp = g.center(nav.path[nav.k], _v3);
  let dx = wp.x - u.pos.x, dz = wp.z - u.pos.z, d = Math.hypot(dx, dz);
  if (d < NAV.arrive && nav.k < nav.path.length - 1) { nav.k++; g.center(nav.path[nav.k], wp); dx = wp.x - u.pos.x; dz = wp.z - u.pos.z; d = Math.hypot(dx, dz); }
  if (d < 1e-3) return null;
  return out.set(dx / d, 0, dz / d);
}
