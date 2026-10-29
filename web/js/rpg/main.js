// Vạn Kiếm Kỳ Trận – Phiêu Lưu: luồng game – màn mở đầu, tạo nhân vật (xem trước mô hình 3D), vào / chuyển bản đồ, vòng lặp
// mô phỏng bước cố định 60 Hz + render theo khung, vòng đời ứng dụng (ẩn tab, mất WebGL), móc kiểm thử window.__vkkt.
// Script thường (không phải module): nạp sau js/rpg/ui.js.
'use strict';

const Game = {
  playing: false, paused: false, preview: null, walkTo: null, guideCache: null, guideT: 0, bossT: 0,
  /** Dọn mọi thực thể của bản đồ hiện tại (trừ người chơi). */
  clearMap() {
    for (const a of [...Ents.monsters, ...Ents.npcs, ...Ents.bots]) a.dispose();
    Ents.monsters.length = 0; Ents.npcs.length = 0; Ents.bots.length = 0;
    for (const p of Ents.projectiles) ProjPool.give(p.mesh); Ents.projectiles.length = 0;
    clearDrops(); GameFx.clear(); SwordRain.clear(); vfx.clear(); floaters.length = 0; ui.bossBar(null);
  },
  /** Dựng bản đồ id + NPC, quái theo bảng sinh, người chơi ảo, boss nếu tới giờ. */
  enter(id) {
    this.clearMap(); World.token = (World.token || 0) + 1; World.load(id);
    if (Ents.player) Ents.player.target = null;   // mục tiêu thuộc bản đồ cũ đã bị huỷ
    const d = MAPS[id];
    if (d.home) for (const n of HOME_NPCS[d.home]) Ents.npcs.push(new NPC(n, d.home));
    const rng = seededRng(d.seed + Math.floor(Math.random() * 1000));
    for (const [type, count] of d.spawns || []) for (let k = 0; k < count; k++) {
      const x = lerp(12, d.width - 10, rng()), L = Math.round(lerp(d.level[0], d.level[1], rng()));
      spawnMonster(type, L, x);
    }
    if (d.boss && G.bossT[id] != null && G.bossT[id] >= 0 && G.playT >= G.bossT[id]) BossClock.spawn(id);
    else if (d.boss && G.bossT[id] === -1) BossClock.spawn(id);
    Bots.populate();
    Tree.sync(); this.syncSpots();
  },
  /** Chuyển bản đồ (qua cổng hoặc truyền tống): mờ màn → dựng bản đồ mới → đặt người chơi. */
  travel(id, fromDir, x) {
    if (this.traveling) return; this.traveling = true;
    ui.fade(MAPS[id].name, () => { try { this.arrive(id, fromDir, x); } finally { this.traveling = false; } });
  },
  arrive(id, fromDir, x) {
    const P = Ents.player;
    this.enter(id);
    const d = MAPS[id], px = x != null ? x : fromDir > 0 ? 4 : d.width - 4;
    P.pos.set(px, World.groundAt(px) + (P.flying ? 2 : 0), 0); P.vel.set(0, 0, 0); P.facing = fromDir < 0 ? -1 : 1; P.target = null;
    SideCam.snap(P); this.walkTo = null;
    Chat.sys('Tới ' + d.name + (d.level ? ' (quái cấp ' + d.level[0] + '–' + d.level[1] + ')' : ''));
    ui.quest(); Save.now();
  },
  nearNpc() { const P = Ents.player; if (!P) return null; let best = null, bd = 99; for (const n of Ents.npcs) { const d = Math.abs(n.pos.x - P.pos.x); if (d < n.talkR && d < bd && P.pos.y - n.pos.y < 3) { bd = d; best = n; } } return best; },
  interact() { const n = this.nearNpc(); if (n) ui.dialog(n); },
  cycleTarget() {
    const P = Ents.player, list = Ents.monsters.filter(m => !m.dead && Math.abs(m.pos.x - P.pos.x) < 16).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x));
    if (!list.length) { P.target = null; return; }
    const i = list.indexOf(P.target); P.target = list[(i + 1) % list.length];
  },
  togglePause() { this.paused = !this.paused; ui.toast(this.paused ? 'Tạm dừng – nhấn P / ☰ để tiếp tục' : 'Tiếp tục'); },
  /** Quả trên Linh Đan Thụ + ngọc trên Tế Đàn khớp trạng thái. */
  syncSpots() {
    const T = World.spots.tree; if (T) T.fruits.forEach((f, i) => (f.visible = i < G.tree.stock));
    const A = World.spots.altar; if (A) A.orbs.forEach((o, i) => o.material.color.set(G.balls.includes(i + 1) ? 0xffa040 : 0x3a3a3a));
  },
  start() {
    Ents.player = new Player();
    this.enter(G.map);
    const P = Ents.player; P.pos.set(clamp(G.x, 2, World.width - 2), 0, 0); P.pos.y = World.groundAt(P.pos.x);
    SideCam.snap(P); this.playing = true; ui.initHud(); bindTouchControls();
    Chat.sys('Chào mừng ' + G.name + ' tới ' + SECTS[G.sect].name + '. Đi sang phải để xuống núi, nói chuyện với Sư Phụ (dấu !) để nhận nhiệm vụ.');
    if (!G.tut.move) { G.tut.move = 1; Tasks.after(1, () => ui.toast(isTouch ? 'Cần ảo trái để chạy, nút ⇑ để nhảy – nhấn ⇑ lần 2 trên không để bay' : 'A/D chạy · Space nhảy, nhấn lần 2 để bay · J đánh · E nói chuyện', 5)); }
    Quests.on('check'); applyQuality(Q(), 'init'); Save.now();
  },
  simStep(dt) {
    clock.t += dt; G.playT += dt;
    const P = Ents.player;
    let I = inp;
    if (this.walkTo != null) { const dx = this.walkTo - P.pos.x; if (inp.left || inp.right || Math.abs(dx) < 1.2) this.walkTo = null; else I = Object.assign({}, inp, { left: dx < 0, right: dx > 0 }); }
    if (!ui.modalOpen()) P.control(dt, I); else P.vel.x = damp(P.vel.x, 0, 10, dt);
    consumeEdges();
    P.tickStatus(dt); P.physics(dt); P.regen(dt);
    if (P.dead) { P.deadT += dt; }
    for (let i = Ents.monsters.length - 1; i >= 0; i--) if (!Ents.monsters[i].update(dt)) { if (P.target === Ents.monsters[i]) P.target = null; Ents.monsters[i].dispose(); Ents.monsters.splice(i, 1); }
    for (const n of Ents.npcs) n.update(dt);
    Bots.update(dt);
    updateProjectiles(dt); updateDrops(dt); GameFx.update(dt); SwordRain.update(dt); Tasks.update();
    if ((this.bossT -= dt) <= 0) { this.bossT = 1; BossClock.tick(); if (!ui.boss) { const b = Ents.monsters.find(m => m.spec.boss && !m.dead); if (b) ui.bossBar(b); } this.syncSpots(); }
    // cổng hai mép: đi ra mép → sang bản đồ kế (khoá theo cảnh giới)
    const d = World.def;
    if (!this.traveling && !P.dead) {
      const side = P.pos.x <= 0.6 && P.vel.x <= 0 ? -1 : P.pos.x >= World.width - 0.6 && P.vel.x >= 0 ? 1 : 0, to = side < 0 ? d.left : side > 0 ? d.right : null;
      if (to) { const td = MAPS[to]; if (td.minRealm && P.realm.r < td.minRealm) { P.pos.x -= side * 1.5; P.vel.x = 0; ui.toast(td.name + ': cần cảnh giới ' + REALMS[td.minRealm].name); } else this.travel(to, side); }
    }
    if ((this.guideT -= dt) <= 0) { this.guideT = 0.5; this.guideCache = Quests.guide(); }
    Save.tick(dt);
  }
};

/* ---------- Màn mở đầu + tạo nhân vật ---------- */
const Creator = {
  sect: 'kiem', look: null, model: null,
  open() {
    $('intro').hidden = true; $('create').hidden = false;
    $('c-sects').innerHTML = SECT_KEYS.map(k => { const S = SECTS[k]; return `<button class="sect" data-s="${k}" style="--c:${S.color}"><b>${S.glyph} ${S.name}</b><p>${S.desc}</p></button>`; }).join('');
    $('c-name').value = $('c-name').value || BOT_NAMES[(Math.random() * BOT_NAMES.length) | 0].replace(/_\d+$/, '');
    this.pick(this.sect, true);
  },
  pick(sect, init) {
    if (sect !== this.sect || init) { this.sect = sect; this.look = SECTS[sect].looks[0]; Game.preview = 'map'; World.token = (World.token || 0) + 1; World.load(SECTS[sect].home); }
    document.querySelectorAll('.sect').forEach(b => b.classList.toggle('on', b.dataset.s === sect));
    $('c-looks').innerHTML = SECTS[sect].looks.map(l => { const c = CHAMPIONS.find(x => x.model.look === l) || ENEMY_DEFS.find(x => x.model.look === l); return `<button class="look${l === this.look ? ' on' : ''}" data-l="${l}">${c ? c.short || c.name : l}</button>`; }).join('');
    $('c-skills').textContent = 'Kỹ năng: ' + SECTS[sect].skills.map(id => RPG_SKILLS[id].name).join(' · ');
    this.showModel();
  },
  showModel() {
    if (this.model) this.model.dispose();
    this.model = new HumanModel(this.look, 1.15, 0x9fd8ff); this.model.setOutline(Q().outline);
    this.dummy = { pos: new V3(36, World.groundAt(36), 0.6), vel: new V3(), facing: 1, onGround: true, flying: false, dead: false };
    this.model.play('Victory', { dur: 1.4, windup: 0.4, active: 0.7 });
  },
  close() { if (this.model) { this.model.dispose(); this.model = null; } Game.preview = null; $('create').hidden = true; }
};
$('c-sects').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) Creator.pick(b.dataset.s); });
$('c-looks').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) { Creator.look = b.dataset.l; Creator.pick(Creator.sect); } });
$('c-back').addEventListener('click', () => { Creator.close(); $('intro').hidden = false; });
$('c-go').addEventListener('click', () => {
  const name = $('c-name').value.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Đạo hữu';
  Save.wipe(); G = newGameState(name, Creator.sect, Creator.look); Creator.close(); Sfx.init(); Game.start();
});
$('btn-new').addEventListener('click', () => { Sfx.init(); Creator.open(); });
$('btn-continue').addEventListener('click', () => { Sfx.init(); $('intro').hidden = true; Game.preview = null; Game.start(); });

/* ---------- Vòng lặp ---------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const d = Math.min(2, window.devicePixelRatio || 1); fx2d.width = Math.round(w * d); fx2d.height = Math.round(h * d); fxScale = d * clamp(Math.min(w, h) / 600, 0.85, 1.25);
  vfx.particles.material.uniforms.uScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(camera.fov * DEG / 2));
  if (bloom.level) bloom.resize(w, h);
  // nút ảo co theo bề ngang màn hình hẹp (màn dọc điện thoại) để cần ảo và cụm nút không chồng nhau
  document.documentElement.style.setProperty('--pad', options.padSize * clamp(w / 470, 0.8, 1));
  // màn hẹp: khung mục tiêu / thanh boss vào cột HUD trái (dưới nhiệm vụ) thay vì chen giữa hai HUD
  const tm = document.getElementById('topmid'), narrow = w <= 560;
  if (narrow && tm.parentElement.id !== 'hud') document.getElementById('hud').appendChild(tm); else if (!narrow && tm.parentElement.id === 'hud') document.body.appendChild(tm);
}
window.addEventListener('resize', resize);
camera.fov = 40;
const STEP = 1 / 60;
let acc = 0, last = performance.now(), fpsAcc = 0, fpsFrames = 0;
const PerfStats = { update: 0, render: 0, calls: 0, tris: 0, fps: 0,
  push(u, r) { this.update += (u - this.update) * 0.05; this.render += (r - this.render) * 0.05; this.calls = renderer.info.render.calls; this.tris = renderer.info.render.triangles; } };
const appState = { glLost: false, hidden: false };
function renderModels(dt) {
  const P = Ents.player;
  if (P) P.model.update(dt, P);
  for (const a of Ents.monsters) a.model.update(dt, a);
  for (const a of Ents.npcs) if (a.model) a.model.update(dt, a);
  for (const a of Ents.bots) a.model.update(dt, a);
}
function frame(now) {
  requestAnimationFrame(frame);
  if (appState.glLost) { last = now; return; }
  const t0 = performance.now();
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  QualityManager.sample(dt);
  fpsAcc += dt; fpsFrames++; if (fpsAcc > 0.5) { PerfStats.fps = fpsFrames / fpsAcc; $('fps').textContent = Math.round(PerfStats.fps) + ' fps'; fpsAcc = 0; fpsFrames = 0; }
  const running = Game.playing && !Game.paused && !appState.hidden;
  let scale = running ? 1 : 0;
  if (hitStopTimer > 0) { hitStopTimer -= dt; scale *= 0.08; }
  const sdt = dt * scale;
  if (running) { acc += sdt; let n = 0; while (acc >= STEP && n < 6) { Game.simStep(STEP); acc -= STEP; n++; } if (n === 6) acc = 0; }
  if (Game.playing) { renderModels(sdt); SideCam.update(dt, Ents.player); }
  else if (Game.preview && Creator.model) {   // màn tạo nhân vật: xem trước mô hình trên sơn môn
    Creator.model.update(dt, Creator.dummy); if (!Creator.model.rig.action && Math.random() < 0.004) Creator.model.play('Attack03', { dur: 0.7, windup: 0.25, active: 0.35 });
    const wide = camera.aspect > 1; SideCam.x = damp(SideCam.x, 36 + (wide ? 2.6 : 0), 4, dt); SideCam.y = damp(SideCam.y, World.groundAt(36) + (wide ? 1.2 : 0.2), 4, dt); SideCam.dist = damp(SideCam.dist, wide ? 7.5 : 11, 3, dt); SideCam.apply();
  } else { SideCam.x = 40 + Math.sin(now * 0.00005) * 20; SideCam.y = 4; SideCam.dist = 20; SideCam.apply(); }
  world.sky.position.copy(camera.position); world.sea.position.x = camera.position.x;
  World.update(dt, SideCam.x, SideCam.y); vfx.update(sdt || (Game.playing ? 0 : dt), camera.position);
  world.sky.material.uniforms.uTime.value += dt; world.sea.material.uniforms.uTime.value += dt;
  for (const g of World.glow) if (g.material && g.material.opacity != null && g.isMesh && !g.isInstancedMesh) g.scale.setScalar(1 + Math.sin(now * 0.003 + g.position.x) * 0.06);
  sun.position.set(SideCam.x - 10, SideCam.y + 24, 14); sun.target.position.set(SideCam.x, SideCam.y - 1, 0);
  ui.update(dt);
  renderer.info.reset();
  const t1 = performance.now();
  try { bloom.render(scene, camera); } catch (e) { console.error('[Bloom] tắt bloom do lỗi', e); bloom.setLevel(0, window.innerWidth, window.innerHeight); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  const t2 = performance.now();
  draw2D(dt);
  PerfStats.push(t1 - t0, t2 - t1);
  if (typeof DebugPanel !== 'undefined') DebugPanel.tick(dt);
}

/* ---------- Vòng đời: ẩn tab → dừng + lưu; mất WebGL → chờ khôi phục ---------- */
document.addEventListener('visibilitychange', () => { appState.hidden = document.hidden; if (document.hidden) { if (Game.playing) Save.now(); } else last = performance.now(); });
window.addEventListener('pagehide', () => { if (Game.playing) Save.now(); });
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); appState.glLost = true; if (Game.playing) Save.now(); }, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  appState.glLost = false; last = performance.now();
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  applyQuality(Q(), 'restore'); ui.toast('Đã khôi phục đồ hoạ');
}, false);
setInterval(() => { if (Game.playing && !appState.hidden) Save.now(); }, 30000);

(function boot() {
  const bad = validateChampions().concat(validateArtifacts());
  if (bad.length) console.error('[Vạn Kiếm] Dữ liệu lỗi:\n' + bad.join('\n'));
  if (!isTouch) document.body.classList.add('kb');
  resize(); applyQuality(Q(), 'init');
  const r = Save.load();
  World.token = 1; World.load(r.status === 'ok' ? r.state.map : 'A1');
  if (r.status === 'ok') {
    G = r.state; const rl = realmOf(G.tv);
    const b = $('btn-continue'); b.hidden = false; b.textContent = 'Tiếp tục – ' + G.name + ' · ' + rl.name + ' tầng ' + rl.layer;
    $('btn-new').classList.add('alt'); $('btn-new').textContent = 'Nhân vật mới';
  } else if (r.status !== 'none') setTimeout(() => ui.toast('Bản lưu không đọc được (' + r.reason + ') – đã giữ bản sao ' + RPG_SAVE_KEY + '_backup', 5), 400);
  // bàn phím trên thiết bị cảm ứng (máy tính bảng có bàn phím) → ẩn cần ảo; chạm màn hình → hiện lại
  window.addEventListener('keydown', () => document.body.classList.add('kb'), { once: false, passive: true });
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') document.body.classList.remove('kb'); }, { passive: true });
})();
requestAnimationFrame(frame);

/** Móc kiểm thử: chạy mô phỏng nhanh N giây (bỏ qua render, vẫn cập nhật mô hình). */
function simulate(seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) { if (!Game.playing) break; Game.simStep(STEP); renderModels(STEP); vfx.update(STEP, camera.position); }
}
window.__vkkt = { get G() { return G; }, set G(v) { G = v; }, Game, Ents, World, MAPS, MONSTERS, SECTS, RPG_SKILLS, QUESTS, REALMS, Player, Monster, Bot, NPC, Bag, Tree, Dragon, Quests, Save, Rewards, ArtPassives,
  ARTIFACTS, ARTIFACT_LIST, COMPONENTS, COMPONENT_KEYS, equipItem, unequip, useItem, quickHeal, craftArtifact, upgradeItem, shopStock, buy, sell, addBall, castSkill, hurt, spawnMonster, BossClock,
  realmOf, effLevel, monsterStats, newGameState, simulate, STEP, inp, keys, syncInput, consumeEdges, ui, clock, Tasks, GameFx, PerfStats, QualityManager, renderer, scene, camera, SideCam, Chat, Creator,
  buyPoints, learnSkill, pointCost, skillBookCost, equipTotals, artifactStats, artPassiveText, appState, options, store, vfx, BEASTS, LOOKS, CHAMPIONS };
