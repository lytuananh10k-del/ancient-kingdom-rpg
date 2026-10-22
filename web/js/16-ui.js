// Vạn Kiếm Kỳ Trận – Giao diện HTML, áp dụng chất lượng, lớp 2D (mục 22–24)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 22. UI
 * ===================================================================*/
const $ = id => document.getElementById(id);
const ui = {
  toastTimer: 0, bannerTimer: 0,
  update() {
    syncBench();
    const a = units.filter(u => u.team === 'ally' && u.alive).length, e = units.filter(u => u.team === 'enemy' && u.alive).length;
    $('round-title').textContent = 'Vòng ' + battle.round;
    $('ally-count').textContent = 'Đồng minh ' + a; $('enemy-count').textContent = 'Địch ' + e;
    const st = $('btn-start'), prep = battle.phase === 'prep' && !game.over;
    if (game.over && battle.phase !== 'fight') { $('phase-label').textContent = 'Kết thúc ván – trụ được ' + battle.round + ' vòng'; st.textContent = 'Ván mới'; st.disabled = false; }
    else if (prep) { $('phase-label').textContent = 'Chuẩn bị – mua tu sĩ rồi kéo lên ô xanh'; st.textContent = 'Bắt đầu giao chiến'; st.disabled = false; }
    else if (battle.phase === 'fight') { $('phase-label').textContent = battle.bench ? 'Đang kiểm tra hiệu năng…' : 'Giao chiến – các tu sĩ tự chiến đấu'; st.textContent = 'Đang giao chiến'; st.disabled = true; }
    else { $('phase-label').textContent = game.lastSummary || (battle.result === 'win' ? 'Thắng' : 'Thua'); st.textContent = 'Vòng tiếp theo'; st.disabled = false; }
    $('btn-ult').disabled = !(battle.phase === 'fight' && units.some(u => u.key === 'kiemtien' && u.team === 'ally' && u.alive));
    // Kinh tế
    $('hud-mini').innerHTML = `<b class="h">♥ ${game.hp}</b> · <b class="g">◆ ${game.gold}</b> · <b class="l">Cấp ${game.level}</b>`;
    $('hp-val').textContent = game.hp; $('gold-val').textContent = game.gold; $('lvl-val').textContent = game.level;
    $('cap-val').textContent = boardAllies().length + '/' + boardCap();
    $('xp-fill').style.transform = 'scaleX(' + (game.level >= MAX_LEVEL ? 1 : game.xp / XP_NEED[game.level]) + ')';
    $('xp-val').textContent = game.level >= MAX_LEVEL ? 'tối đa' : game.xp + '/' + XP_NEED[game.level];
    $('prep-panel').hidden = !prep;
    $('hint').textContent = prep ? 'Kéo tu sĩ giữa bàn cờ và hàng chờ · kéo vào cửa hàng để bán' : 'Kéo để xoay bàn cờ · Chụm hai ngón / lăn chuột để phóng to';
    if (prep) { renderShop(); renderSelActions(); }
    renderTraits();
  },
  toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; this.toastTimer = 2.4; },
  result(text) { const r = $('result'); r.hidden = !text; r.textContent = text || ''; },
  tick(dt) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) $('toast').hidden = true; }
    if (this.bannerTimer > 0) { this.bannerTimer -= dt; if (this.bannerTimer <= 0) $('skill-banner').classList.remove('show'); }
  }
};
const TIER_LABEL = ['', 'Phàm', 'Linh', 'Tiên'];
function renderShop() {
  const el = $('shop'); el.textContent = '';
  game.shop.forEach((key, i) => {
    const b = document.createElement('button');
    if (!key) { b.className = 'card sold'; b.disabled = true; b.setAttribute('aria-label', 'Đã mua'); el.appendChild(b); return; }
    const d = UNIT_DEFS[key], owned = countCopies(key, 1);
    b.className = 'card t' + d.cost + (game.gold < d.cost ? ' poor' : '') + (owned >= 2 ? ' ready' : '');
    b.innerHTML = `<span class="nm">${d.name}</span><span class="tr">${d.traits.map(t => TRAITS[t].name).join(' · ')}</span>` +
      `<span class="ft"><span class="cost">${d.cost}</span>${owned ? `<span class="own">${owned}/3</span>` : ''}</span>`;
    b.setAttribute('aria-label', `Mua ${d.name}, giá ${d.cost} linh thạch${owned ? ', đang có ' + owned : ''}`);
    b.addEventListener('click', () => buyShop(i));
    el.appendChild(b);
  });
  $('btn-reroll').disabled = game.gold < REROLL_COST;
  $('btn-xp').disabled = game.gold < XP_COST || game.level >= MAX_LEVEL;
}
function renderSelActions() {
  const sel = game.sel, sell = $('btn-sell'), back = $('btn-tobench');
  let key = null, star = 1;
  if (sel && sel.type === 'bench' && game.bench[sel.i]) { key = game.bench[sel.i].key; star = game.bench[sel.i].star; }
  if (sel && sel.type === 'board') { key = sel.unit.key; star = sel.unit.star; }
  sell.hidden = !key; back.hidden = !(sel && sel.type === 'board');
  if (key) sell.textContent = 'Bán ' + (UNIT_DEFS[key].short || UNIT_DEFS[key].name) + ' +' + sellPrice(key, star);
}
function renderTraits() {
  const counts = traitCounts(), el = $('traits'); el.textContent = '';
  Object.keys(TRAITS).filter(t => counts[t]).sort((a, b) => traitLevel(b, counts[b]) - traitLevel(a, counts[a]) || counts[b] - counts[a]).forEach(t => {
    const T = TRAITS[t], n = counts[t], lv = traitLevel(t, n), div = document.createElement('div');
    div.className = 'trait' + (lv ? ' on' : ''); div.style.setProperty('--c', T.color);
    div.innerHTML = `<b>${T.name}</b> <span class="cnt">${n}/${T.tiers.find(m => m > n) || T.tiers[T.tiers.length - 1]}</span>${lv ? `<span class="fx">${T.desc[lv - 1]}</span>` : ''}`;
    el.appendChild(div);
  });
}
function showBanner(name, team) { const b = $('skill-banner'); b.textContent = name; b.classList.toggle('enemy', team !== 'ally'); b.classList.add('show'); ui.bannerTimer = 1.6; }
function nextRound() {
  if (game.over) { newGame(); return; }
  battle.round++; rollShop(); setupRound();
}
function forceUltimate() {
  if (battle.phase !== 'fight') { ui.toast('Bắt đầu giao chiến trước, rồi thi triển'); return; }
  const k = units.find(u => u.key === 'kiemtien' && u.team === 'ally' && u.alive);
  if (!k) { ui.toast('Chưa có Kiếm Tiên trên bàn – mua ở cửa hàng (3 linh thạch)'); return; }
  if (k.fsm.name === 'cast') { ui.toast('Kiếm Tiên đang thi triển'); return; }
  k.mana = k.maxMana; if (k.fsm.name !== 'dead' && k.fsm.name !== 'stun') k.fsm.set('move');
}
function togglePause() { battle.paused = !battle.paused; $('btn-pause').setAttribute('aria-pressed', battle.paused); $('btn-pause').textContent = battle.paused ? 'Tiếp tục' : 'Tạm dừng'; timelines.forEach(t => (battle.paused ? t.pause() : t.resume())); }
$('btn-start').addEventListener('click', () => { Sfx.init(); if (game.over) newGame(); else if (battle.phase === 'prep') startBattle(); else if (battle.phase === 'end') nextRound(); });
$('btn-reroll').addEventListener('click', reroll);
$('btn-xp').addEventListener('click', buyXP);
$('btn-sell').addEventListener('click', sellSelected);
$('btn-tobench').addEventListener('click', () => { const s = game.sel; if (s && s.type === 'board' && moveToBench(s.unit)) { select(null); afterRosterChange(); } });
$('btn-ult').addEventListener('click', forceUltimate);
$('btn-cam').addEventListener('click', () => combatCam.reset());
$('btn-pause').addEventListener('click', togglePause);
$('btn-speed').addEventListener('click', () => { battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 0.5 : 1; $('btn-speed').textContent = 'Tốc độ ×' + (battle.speed === 0.5 ? '½' : battle.speed); $('btn-speed').setAttribute('aria-pressed', battle.speed !== 1); });
$('btn-settings').addEventListener('click', () => {
  const s = $('settings'); s.hidden = !s.hidden; $('btn-settings').setAttribute('aria-expanded', !s.hidden);
  if (!s.hidden) {   // đặt bảng ngay dưới hàng nút trên cùng (màn dọc hàng nút xuống 2 dòng) để nút Cài đặt không bị che
    const top = document.querySelector('.top-actions').getBoundingClientRect().bottom + 8;
    s.style.top = top + 'px'; s.style.maxHeight = `calc(100% - ${top + 12}px - env(safe-area-inset-bottom, 0px))`;
  }
});
function closeSettings() { if ($('settings').hidden) return; $('settings').hidden = true; $('btn-settings').setAttribute('aria-expanded', 'false'); }
/** Thu gọn / mở rộng bảng thông tin bên trái (lưu trên máy); lúc chuẩn bị thì căn lại camera cho vùng trống mới. */
function setHudCollapsed(on) {
  $('left-col').classList.toggle('collapsed', on);
  const b = $('btn-hud-toggle'); b.setAttribute('aria-expanded', String(!on)); b.setAttribute('aria-label', on ? 'Mở rộng bảng thông tin' : 'Thu gọn bảng thông tin');
  store.set('hudCollapsed', on);
  if (battle.phase === 'prep') requestAnimationFrame(applyPrepCamera);
}
$('btn-hud-toggle').addEventListener('click', () => setHudCollapsed(!$('left-col').classList.contains('collapsed')));
setHudCollapsed(store.get('hudCollapsed', false));
$('btn-close-settings').addEventListener('click', () => { closeSettings(); $('btn-settings').focus(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); });
$('opt-sound').checked = !Sfx.muted; $('opt-sound').addEventListener('change', e => { Sfx.muted = !e.target.checked; store.set('mute', Sfx.muted); });
$('btn-enter').addEventListener('click', () => { Sfx.init(); $('intro').hidden = true; canvas.focus(); });
$('btn-newgame').addEventListener('click', () => { Sfx.init(); newGame(); $('intro').hidden = true; canvas.focus(); });
function syncQualityButtons() { document.querySelectorAll('#quality-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.q === QualityManager.level)); }
document.querySelectorAll('#quality-seg button').forEach(b => b.addEventListener('click', () => QualityManager.set(b.dataset.q, 'user')));
$('opt-auto').checked = QualityManager.auto; $('opt-auto').addEventListener('change', e => { QualityManager.auto = e.target.checked; store.set('autoQuality', e.target.checked); });
$('opt-cine').checked = combatCam.enableCinematic; $('opt-cine').addEventListener('change', e => { combatCam.enableCinematic = e.target.checked; store.set('cine', e.target.checked); if (!e.target.checked) combatCam.cine = null; });
$('opt-shake').checked = combatCam.enableShake; $('opt-shake').addEventListener('change', e => { combatCam.enableShake = e.target.checked; store.set('shake', e.target.checked); });
$('opt-reduce').checked = combatCam.reduceShake; $('opt-reduce').addEventListener('change', e => { combatCam.reduceShake = e.target.checked; store.set('reduce', e.target.checked); });
function syncSwordUI() {
  const auto = options.swordCount <= 0;
  $('opt-sword-auto').checked = auto; $('opt-swords').disabled = auto;
  $('opt-swords').value = swordCount(); $('sword-val').textContent = swordCount() + (auto ? ' (theo mức ' + Q().label + ')' : '');
}
$('opt-sword-auto').addEventListener('change', e => { options.swordCount = e.target.checked ? 0 : Q().swords; store.set('swords', options.swordCount); syncSwordUI(); });
$('opt-swords').addEventListener('input', e => { options.swordCount = +e.target.value; store.set('swords', options.swordCount); syncSwordUI(); });
$('opt-ik').checked = options.footIK; $('opt-ik').addEventListener('change', e => { options.footIK = e.target.checked; store.set('footIK', e.target.checked); });
$('opt-hitstop').checked = options.hitstop; $('opt-hitstop').addEventListener('change', e => { options.hitstop = e.target.checked; store.set('hitstop', e.target.checked); });

/* =====================================================================
 * 23. Áp dụng chất lượng
 * ===================================================================*/
function applyQuality(cur, reason) {
  const pr = Math.min(window.devicePixelRatio || 1, cur.pr);
  renderer.setPixelRatio(pr);
  const wantShadows = cur.shadows;
  if (renderer.shadowMap.enabled !== wantShadows) {
    renderer.shadowMap.enabled = wantShadows; sun.castShadow = wantShadows;
    scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  }
  if (wantShadows && sun.shadow.mapSize.x !== cur.shadowSize) { sun.shadow.mapSize.set(cur.shadowSize, cur.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  units.concat(benchUnits.filter(Boolean)).forEach(u => { u.rig.setOutline && u.rig.setOutline(cur.outline); });
  vfx.particles.setBudget(cur.particles);
  resize();
  bloom.setLevel(cur.bloom, window.innerWidth, window.innerHeight);
  syncQualityButtons();
  if (typeof syncSwordUI === 'function') syncSwordUI();
  if (reason === 'auto') ui.toast('FPS thấp kéo dài – đã giảm đồ hoạ xuống ' + cur.label);
}
QualityManager.onChange(applyQuality);

/* =====================================================================
 * 24. Lớp 2D: thanh máu / linh lực / khiên, số sát thương
 * ===================================================================*/
const fx2d = $('fx2d'), g2 = fx2d.getContext('2d');
let fxScale = 1;
function draw2D(dt) {
  const W = fx2d.width, H = fx2d.height; g2.clearRect(0, 0, W, H);
  const s = fxScale;
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  for (const u of units) {
    if (!u.alive || !u.rig.root.visible) continue;
    _v1.set(u.pos.x, 2.35 * (u.def.look === 'mathu' ? 1.2 : 1), u.pos.z).project(camera);
    if (_v1.z > 1) continue;
    const x = (_v1.x * 0.5 + 0.5) * W, y = (-_v1.y * 0.5 + 0.5) * H;
    const w = 62 * s, h = 7 * s;
    g2.fillStyle = 'rgba(0,0,0,0.65)'; g2.fillRect(x - w / 2 - 1, y - 1, w + 2, h * 1.7 + 3);
    g2.fillStyle = u.team === 'ally' ? '#4fcf8f' : '#e2553f'; g2.fillRect(x - w / 2, y, w * (u.hp / u.maxHp), h);
    if (u.shield > 0) { g2.fillStyle = 'rgba(220,255,245,0.85)'; g2.fillRect(x - w / 2, y, Math.min(w, w * (u.shield / u.maxHp)), h * 0.45); }
    g2.fillStyle = u.mana >= u.maxMana ? '#ffe08a' : '#6aa8ff'; g2.fillRect(x - w / 2, y + h + 1, w * (u.mana / u.maxMana), h * 0.6);
    if (battle.selected === u) { g2.strokeStyle = '#e9c46a'; g2.lineWidth = 2 * s; g2.strokeRect(x - w / 2 - 3, y - 3, w + 6, h * 1.7 + 7); }
    if (battle.phase === 'prep' || u.status.stun > 0) {
      g2.font = `600 ${11 * s}px "Be Vietnam Pro", system-ui, sans-serif`; g2.fillStyle = u.status.stun > 0 ? '#ffe08a' : 'rgba(236,228,208,0.9)';
      g2.fillText(u.status.stun > 0 ? 'Choáng' : u.def.name, x, y - 9 * s);
    }
    if (u.star > 1) {
      g2.font = `700 ${12 * s}px system-ui, sans-serif`; g2.fillStyle = u.star === 3 ? '#ffd166' : '#d8e2ea';
      g2.fillText('★'.repeat(u.star), x, y - (battle.phase === 'prep' || u.status.stun > 0 ? 21 : 9) * s);
    }
  }
  g2.font = `700 ${12 * s}px system-ui, sans-serif`;
  for (const u of benchUnits) {
    if (!u) continue;
    _v1.set(u.pos.x, 2.1 * STAR_SCALE[u.star] + u.pos.y, u.pos.z).project(camera); if (_v1.z > 1) continue;
    const x = (_v1.x * 0.5 + 0.5) * W, y = (-_v1.y * 0.5 + 0.5) * H;
    g2.lineWidth = 3 * s; g2.strokeStyle = 'rgba(0,0,0,0.75)'; const txt = '★'.repeat(u.star);
    g2.strokeText(txt, x, y); g2.fillStyle = u.star === 3 ? '#ffd166' : u.star === 2 ? '#d8e2ea' : '#c79a6a'; g2.fillText(txt, x, y);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt;
    if (f.t > 0.95) { floaters.splice(i, 1); continue; }
    _v1.set(f.x, f.y + f.t * 1.4, f.z).project(camera); if (_v1.z > 1) continue;
    const x = (_v1.x * 0.5 + 0.5) * W, y = (-_v1.y * 0.5 + 0.5) * H;
    const pop = f.t < 0.08 ? lerp(1.7, 1, f.t / 0.08) : 1;
    g2.globalAlpha = f.t > 0.6 ? 1 - (f.t - 0.6) / 0.35 : 1;
    g2.font = `700 ${Math.round(20 * f.size * pop * s)}px "Be Vietnam Pro", system-ui, sans-serif`;
    g2.lineWidth = 3.5 * s; g2.strokeStyle = 'rgba(0,0,0,0.85)'; g2.strokeText(f.text, x, y); g2.fillStyle = f.color; g2.fillText(f.text, x, y);
    g2.globalAlpha = 1;
  }
}
