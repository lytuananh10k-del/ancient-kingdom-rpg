// Vạn Kiếm Kỳ Trận – Phiêu Lưu: chiến đấu hành động – sát thương (chí mạng, giáp, khiên, giảm sát thương, hút máu), choáng / chậm,
// đạn bay, hẹn giờ theo đồng hồ game, vật phẩm rơi (linh thạch, đan dược, nguyên liệu, Long Châu) và số sát thương nổi.
// Script thường (không phải module): nạp sau js/rpg/actors.js.
'use strict';

/** Mọi thực thể đang có trong bản đồ hiện tại. */
const Ents = { player: null, monsters: [], npcs: [], bots: [], drops: [], projectiles: [] };
const clock = { t: 0 };   // đồng hồ game (giây) – dừng khi tạm dừng
let hitStopTimer = 0;
function hitStop(d) { if (options.hitstop) hitStopTimer = Math.max(hitStopTimer, d); }
/** Phe: 'good' (người chơi, người chơi ảo) đánh 'evil' (quái). */
const foesOf = team => (team === 'good' ? Ents.monsters : [Ents.player, ...Ents.bots].filter(Boolean));

/* ---------- Số nổi (vẽ trên lớp 2D) ---------- */
const floaters = [];
function floatText(x, y, text, color, size = 1) {
  if (floaters.length > 70) floaters.shift();
  floaters.push({ x: x + rand(-0.3, 0.3), y: y + 0.4, text, color, size, t: 0 });
}

/* ---------- Hẹn giờ theo đồng hồ game (không dùng setTimeout → tạm dừng / tua nhanh đúng) ---------- */
const Tasks = {
  list: [],
  after(d, fn) { this.list.push({ t: clock.t + d, fn }); },
  update() { for (let i = this.list.length - 1; i >= 0; i--) { const k = this.list[i]; if (clock.t >= k.t) { this.list.splice(i, 1); try { k.fn(); } catch (e) { console.error('[Tasks]', e); } } } },
  clear() { this.list.length = 0; }
};

/* ---------- Sát thương ----------
 * opts: kind 'basic' | 'skill' | 'proc' (sát thương phụ – không kích hoạt nội tại), crit (ép chí mạng), knock (m/s hất lùi), lift (hất tung),
 *       stun (giây), slow {k, t}, pen (bỏ qua tỉ lệ giáp), color. Trả về sát thương thực. */
function hurt(src, dst, raw, opts = {}) {
  if (!dst || dst.dead || dst.invuln) return 0;
  const st = src && src.stats || null;
  let crit = opts.crit != null ? opts.crit : opts.kind !== 'proc' && src && Math.random() < (src.crit || 0);
  let dmg = raw * rand(0.92, 1.08);
  if (opts.kind === 'skill' && st && st.skillDmg) dmg *= 1 + st.skillDmg;
  if (crit) dmg *= src.critDmg || 1.5;
  if (src && src.exec) dmg *= src.exec(dst);   // nội tại hành quyết (pháp bảo)
  const def = Math.max(0, dst.def * (1 - (dst.shred || 0)) * (1 - (opts.pen || 0)));
  dmg = Math.max(dmg * 0.15, dmg - def);
  if (dst.drK) dmg *= 1 - dst.drK;
  if (dst.passiveDR) dmg *= 1 - dst.passiveDR();
  dmg = Math.max(1, Math.round(dmg));
  let left = dmg;
  if (dst.shield > 0) { const a = Math.min(dst.shield, left); dst.shield -= a; left -= a; if (a > 0) floatText(dst.pos.x, dst.pos.y + dst.h, '-' + fmtNum(a), '#bff6e6', 0.8); }
  if (left > 0 && dst.onLethal && dst.hp - left <= 0) left = dst.onLethal(left);
  const dealt = Math.min(dst.hp, left) + (dmg - left);   // phần sinh lực thật sự mất (+ phần khiên đỡ) – không tính sát thương thừa khi kết liễu
  dst.hp = Math.max(0, dst.hp - left);
  dst.lastCombat = clock.t; if (src) src.lastCombat = clock.t;
  // phản hồi: chớp sáng, giật người, hạt, âm thanh, số nổi
  const fromFront = src ? Math.sign(src.pos.x - dst.pos.x) === dst.facing : true;
  if (dst.model) { dst.model.flash(crit ? 0xffe08a : 0xffffff, crit ? 0.16 : 0.1); dst.model.hit(fromFront, crit ? 0.9 : 0.5); }
  dst.center(_v1);
  const col = opts.color != null ? _c1.set(opts.color) : dst.team === 'good' ? COLORS.blood : COLORS.allyB;
  vfx.particles.burst(_v1, col, crit ? 18 : 8, crit ? 7 : 4.5, 0.4, crit ? 0.4 : 0.28, { up: 1 });
  const mine = src === Ents.player || dst === Ents.player;
  floatText(dst.pos.x, dst.pos.y + dst.h, (crit ? '✦' : '') + fmtNum(dmg), dst === Ents.player ? '#ff7a6a' : crit ? '#ffd166' : opts.kind === 'skill' ? '#9fe8ff' : '#ffffff', crit ? 1.35 : opts.kind === 'skill' ? 1.1 : 0.95);
  if (mine) { Sfx.hit(crit); if (crit) { hitStop(0.05); SideCam.shake(0.18); } }
  if (opts.knock && !dst.heavy) { dst.vel.x += Math.sign(dst.pos.x - (src ? src.pos.x : dst.pos.x - dst.facing)) * opts.knock; }
  if (opts.lift && !dst.heavy) { dst.vel.y = Math.max(dst.vel.y, opts.lift); dst.onGround = false; }
  if (opts.stun) applyStun(dst, opts.stun);
  if (opts.slow) applySlowFx(dst, opts.slow.k, opts.slow.t);
  if (src && src.onDealt) src.onDealt(dst, dealt, opts, crit);
  if (dst.onDamaged) dst.onDamaged(src, dealt, opts);
  if (st && st.ls && opts.kind !== 'proc') healActor(src, dealt * st.ls, true);
  if (dst.hp <= 0) killActor(dst, src);
  return dmg;
}
function healActor(a, amount, quiet) {
  if (!a || a.dead || amount <= 0) return 0;
  const v = Math.min(a.maxHp - a.hp, Math.round(amount)); a.hp += v;
  if (!quiet && v > 0) floatText(a.pos.x, a.pos.y + a.h, '+' + fmtNum(v), '#7fe0a0', 1);
  return v;
}
function applyStun(a, d) {
  if (a.dead || a.heavy && d < 0.4) return;
  if (a.ccGuard && a.ccGuard()) return;
  const dur = a.heavy ? d * 0.5 : d; a.stun = Math.max(a.stun, dur);
  floatText(a.pos.x, a.pos.y + a.h + 0.4, 'Choáng', '#ffe08a', 0.8);
}
function applySlowFx(a, k, t) { if (a.dead || (a.ccGuard && a.ccGuard())) return; a.slowK = Math.max(a.slowK, k); a.slowT = Math.max(a.slowT, t); }
function killActor(a, src) {
  if (a.dead) return;
  a.dead = true; a.deadT = 0; a.hp = 0; a.vel.x = 0; a.stun = 0;
  if (a.model) a.model.hold('Death', true);
  if (a.onDeath) a.onDeath(src);
}
/** Kẻ địch (phe đối lập) có hộp va chạm chồng lên hình chữ nhật [x0,x1]×[y0,y1]. */
function foesInBox(team, x0, x1, y0, y1, out = []) {
  out.length = 0;
  for (const e of foesOf(team)) {
    if (e.dead || e.invuln) continue;
    const hw = e.w * 0.5;
    if (e.pos.x + hw >= x0 && e.pos.x - hw <= x1 && e.pos.y + e.h >= y0 && e.pos.y <= y1) out.push(e);
  }
  return out;
}
function nearestFoe(a, range, preferFacing = true) {
  let best = null, bd = Infinity;
  for (const e of foesOf(a.team)) {
    if (e.dead || e.invuln) continue;
    const dx = e.pos.x - a.pos.x, dy = (e.pos.y + e.h * 0.5) - (a.pos.y + a.h * 0.5), d = Math.hypot(dx, dy * 0.8);
    if (d > range) continue;
    const score = d + (preferFacing && Math.sign(dx) !== a.facing ? 3 : 0);
    if (score < bd) { bd = score; best = e; }
  }
  return best;
}
const fmtNum = n => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + ' tr' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)));
const fmtFull = n => Math.round(n).toLocaleString('vi-VN');

/* ---------- Đạn bay ----------
 * type: orb | ice | fire | nether | thunder | wave (kiếm khí xuyên) | sword (phi kiếm) | arrow. Mesh lấy từ pool theo loại. */
const PROJ_LOOK = {
  orb: { color: 0xffb070, r: 0.28 }, ice: { color: 0xbfe8ff, r: 0.32, cone: true }, fire: { color: 0xff7a3a, r: 0.34 }, nether: { color: 0xb07cff, r: 0.32 },
  thunder: { color: 0xfff2a8, r: 0.36 }, wave: { color: 0x9fd8ff, r: 0.9, wave: true }, sword: { color: 0xa8c0ff, r: 0.2, sword: true }, arrow: { color: 0xffe8a8, r: 0.12, cone: true }
};
const ProjPool = {
  pools: {},
  take(type) {
    const p = this.pools[type] || (this.pools[type] = []);
    if (p.length) { const m = p.pop(); m.visible = true; scene.add(m); return m; }
    const L = PROJ_LOOK[type]; let m;
    if (L.wave) { m = new THREE.Mesh(vfx.arcGeo, ShaderLibrary.slash(L.color)); m.material.uniforms.uProg.value = 1; m.material.uniforms.uFade.value = 1; }
    else if (L.sword) { m = new THREE.Mesh(SWORD_GEO, new THREE.MeshBasicMaterial({ color: 0xe8f4ff })); const g = new THREE.Mesh(sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), ShaderLibrary.glow(L.color, 0.35)); g.scale.set(0.12, 0.6, 0.12); g.position.y = 0.5; m.add(g); }
    else {
      m = new THREE.Group();
      const core = new THREE.Mesh(L.cone ? sharedGeo('p_cone', () => new THREE.ConeGeometry(0.5, 2, 8).rotateZ(-Math.PI / 2)) : sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      core.scale.setScalar(L.r * 0.55); m.add(core);
      const halo = new THREE.Mesh(sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), ShaderLibrary.glow(L.color, 0.55)); halo.scale.setScalar(L.r * (L.cone ? 0.8 : 1.2)); m.add(halo);
    }
    m.userData.type = type; scene.add(m); return m;
  },
  give(m) { m.visible = false; scene.remove(m); (this.pools[m.userData.type] || (this.pools[m.userData.type] = [])).push(m); }
};
/** Bắn đạn: o = { owner, type, x, y, vx, vy, dmg, kind, pierce, life, homing (actor), onHit(e), opts (truyền cho hurt), radius }. */
function fireProjectile(o) {
  const L = PROJ_LOOK[o.type] || PROJ_LOOK.orb;
  const p = Object.assign({ life: 1.6, pierce: false, radius: L.r * 1.1, hit: new Set(), color: new THREE.Color(L.color), t: 0, scale: 1 }, o);
  p.mesh = ProjPool.take(o.type); p.mesh.scale.setScalar(p.scale);
  Ents.projectiles.push(p); return p;
}
function updateProjectiles(dt) {
  for (let i = Ents.projectiles.length - 1; i >= 0; i--) {
    const p = Ents.projectiles[i]; p.t += dt; p.life -= dt;
    if (p.homing && !p.homing.dead) { p.homing.center(_v2); const dx = _v2.x - p.x, dy = _v2.y - p.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(p.vx, p.vy);
      p.vx = lerp(p.vx, dx / d * sp, Math.min(1, dt * 6)); p.vy = lerp(p.vy, dy / d * sp, Math.min(1, dt * 6)); }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const ang = Math.atan2(p.vy, p.vx);
    const m = p.mesh; m.position.set(p.x, p.y, 0.2);
    if (p.type === 'wave') { m.rotation.set(0, 0, 0); m.rotation.y = p.vx > 0 ? Math.PI / 2 : -Math.PI / 2; m.rotateZ(Math.PI / 2); m.scale.set(p.scale * 1.4, p.scale * 1.4, p.scale * 0.7); m.material.uniforms.uTime.value += dt; m.material.uniforms.uFade.value = clamp(p.life * 3, 0, 1); }
    else if (p.type === 'sword') { m.rotation.set(0, 0, ang - Math.PI / 2); }
    else m.rotation.set(0, 0, ang);
    if (Q().particles > 900 || Math.random() < 0.5) vfx.particles.emit(p.x, p.y, 0.2, rand(-0.5, 0.5), rand(-0.5, 0.5), rand(-0.3, 0.3), 0.35, p.radius * 0.9, 0.05, p.color, 0.8, 2);
    let done = p.life <= 0 || p.y < World.groundAt(p.x) - 0.2 || p.x < -2 || p.x > World.width + 2;
    if (!done) {
      const r = p.radius;
      for (const e of foesInBox(p.owner.team, p.x - r, p.x + r, p.y - r, p.y + r, _hitList)) {
        if (p.hit.has(e)) continue; p.hit.add(e);
        hurt(p.owner, e, p.dmg, Object.assign({ kind: p.kind || 'skill' }, p.opts));
        if (p.onHit) p.onHit(e, p);
        if (!p.pierce) { done = true; break; }
      }
    }
    if (done) {
      vfx.particles.burst(_v1.set(p.x, p.y, 0.2), p.color, 10, 4, 0.35, 0.3);
      if (p.onEnd) p.onEnd(p);
      ProjPool.give(p.mesh); Ents.projectiles.splice(i, 1);
    }
  }
}
const _hitList = [], _hitList2 = [];

/* ---------- Tia sét (dải sáng zigzag) ---------- */
function lightning(x, y0, y1, color = 0xfff2a8, width = 0.4) {
  const pts = [], n = 9;
  for (let i = 0; i < n; i++) pts.push(new V3(x + (i && i < n - 1 ? rand(-0.6, 0.6) : 0), lerp(y0, y1, i / (n - 1)), 0.3));
  const col = new THREE.Color(color); let t = 0;
  const job = { points: pts, n, width: () => width * (1 - t / 0.35), color: (k, c) => { c.copy(col); c.a = 1 - t / 0.35; } };
  vfx.add({ update: dt => { t += dt; if (t > 0.35) return false; vfx.trailJobs.push(job); return true; } });
  flashLight(_v1.set(x, y1 + 1, 2), color, 6, 8);
}

/* ---------- Vật phẩm rơi: bay lên, rơi xuống đất, hút về người chơi khi lại gần ---------- */
const DROP_LOOK = { gold: [0xffd166, 0.16], gem: [0x7fe6ff, 0.2], item: [0xffffff, 0.22], ball: [0xffa040, 0.26], quest: [0xc9a0ff, 0.2], comp: [0xffffff, 0.22] };
function spawnDrop(x, y, kind, payload) {
  const [color, r] = DROP_LOOK[kind] || DROP_LOOK.item;
  const c = kind === 'comp' && COMPONENTS[payload.id] ? new THREE.Color(COMPONENTS[payload.id].color).getHex() : kind === 'item' && payload.color ? new THREE.Color(payload.color).getHex() : color;
  const m = new THREE.Group();
  const core = new THREE.Mesh(kind === 'gold' || kind === 'gem' ? sharedGeo('d_oct', () => new THREE.OctahedronGeometry(1, 0)) : sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), new THREE.MeshBasicMaterial({ color: c }));
  core.scale.setScalar(r); m.add(core);
  const halo = new THREE.Mesh(sharedGeo('p_sph', () => new THREE.SphereGeometry(1, 10, 8)), ShaderLibrary.glow(c, kind === 'ball' ? 0.5 : 0.3)); halo.scale.setScalar(r * 2.2); m.add(halo);
  scene.add(m);
  Ents.drops.push({ x, y, vx: rand(-2.5, 2.5), vy: rand(5, 8), kind, payload, mesh: m, t: 0, life: kind === 'ball' ? 300 : 60 });
}
function updateDrops(dt) {
  const P = Ents.player;
  for (let i = Ents.drops.length - 1; i >= 0; i--) {
    const d = Ents.drops[i]; d.t += dt; d.life -= dt;
    const g = World.supportAt(d.x, d.y) + 0.3;
    let picked = false;
    if (P && !P.dead && d.t > 0.45) {
      const dx = P.pos.x - d.x, dy = P.pos.y + 0.9 - d.y, dist = Math.hypot(dx, dy);
      if (dist < 3.2) { d.x += dx * Math.min(1, dt * 9); d.y += dy * Math.min(1, dt * 9); d.vy = 0; if (dist < 0.7) picked = pickupDrop(d); }
    }
    if (!picked) {
      d.vy -= 18 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 1 - dt * 2;
      if (d.y < g) { d.y = g; d.vy = Math.abs(d.vy) > 2 ? -d.vy * 0.35 : 0; d.vx *= 0.6; }
      d.mesh.position.set(d.x, d.y + Math.sin(d.t * 3) * 0.08, 0.3); d.mesh.rotation.y += dt * 2;
    }
    if (picked || d.life <= 0) { scene.remove(d.mesh); d.mesh.children.forEach(c => c.material.dispose()); Ents.drops.splice(i, 1); }
  }
}
function clearDrops() { for (const d of Ents.drops) { scene.remove(d.mesh); d.mesh.children.forEach(c => c.material.dispose()); } Ents.drops.length = 0; }
