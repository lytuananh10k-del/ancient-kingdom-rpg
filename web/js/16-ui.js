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
    $('round-title').innerHTML = 'Vòng ' + battle.round + (isMonsterRound(battle.round) ? '<span class="monster-tag">Yêu thú</span>' : '');
    $('ally-count').textContent = 'Đồng minh ' + a; $('enemy-count').textContent = 'Địch ' + e;
    const st = $('btn-start'), prep = battle.phase === 'prep' && !game.over;
    if (game.over && battle.phase !== 'fight') { $('phase-label').textContent = 'Kết thúc ván – trụ được ' + battle.round + ' vòng'; st.textContent = 'Ván mới'; st.disabled = false; }
    else if (prep) { $('phase-label').textContent = 'Chuẩn bị – mua tu sĩ rồi kéo lên ô xanh'; st.textContent = '⚔ Giao chiến'; st.disabled = false; }
    else if (battle.phase === 'fight') { $('phase-label').textContent = battle.bench ? 'Đang kiểm tra hiệu năng…' : 'Giao chiến – các tu sĩ tự chiến đấu'; st.textContent = 'Đang giao chiến'; st.disabled = true; }
    else { $('phase-label').textContent = game.lastSummary || (battle.result === 'win' ? 'Thắng' : 'Thua'); st.textContent = 'Vòng tiếp theo ▸'; st.disabled = false; }
    // Nút chính: lúc chuẩn bị nằm trong hàng nút cửa hàng; hết trận / hết ván thì nổi giữa đáy màn hình; đang đánh thì ẩn.
    const home = prep ? document.querySelector('.shop-actions') : $('next-dock');
    if (st.parentElement !== home) home.appendChild(st);
    $('next-dock').hidden = prep || battle.phase === 'fight';
    $('btn-ult').disabled = !(battle.phase === 'fight' && units.some(u => u.key === 'kiemtien' && u.team === 'ally' && u.alive));
    // Kinh tế
    $('hud-mini').innerHTML = `<b class="h">♥ ${game.hp}</b> · <b class="g">◆ ${game.gold}</b> · <b class="l">Cấp ${game.level}</b>`;
    $('hp-val').textContent = game.hp; $('gold-val').textContent = game.gold; $('lvl-val').textContent = game.level;
    $('cap-val').textContent = boardAllies().length + '/' + boardCap();
    { const it = interestOf(game.gold), next = it < 5 ? (it + 1) * 10 : 0;
      $('int-val').innerHTML = `Lãi <b>+${it}</b>` + (next ? ` · giữ ${next} để +${it + 1}` : ' (tối đa)'); }
    $('xp-fill').style.transform = 'scaleX(' + (game.level >= MAX_LEVEL ? 1 : game.xp / XP_NEED[game.level]) + ')';
    $('xp-val').textContent = game.level >= MAX_LEVEL ? 'tối đa' : game.xp + '/' + XP_NEED[game.level];
    $('prep-panel').hidden = !prep;
    if (typeof ArtifactUI !== 'undefined') ArtifactUI.render();   // Kho pháp bảo (js/items/artifact-ui.js)
    $('hint').textContent = prep ? 'Kéo tu sĩ giữa bàn cờ và hàng chờ, kéo vào cửa hàng để bán. Kéo nền để xoay, chụm hai ngón để phóng to.' : 'Kéo để xoay bàn cờ · chụm hai ngón / lăn chuột để phóng to.';
    if (prep) {
      renderShop(); renderSelActions(); renderOdds();
      // Mép trên cửa hàng dịch chuyển (túi trang bị hiện / ẩn…): căn lại khoảng cách camera (không xoay lại góc nhìn) để hàng chờ không bị che.
      if (prepFit.dist && Math.abs($('prep-panel').getBoundingClientRect().top - prepFit.panelTop) > 6) requestAnimationFrame(() => { fitPrepCamera(); combatCam.tDist = prepFit.dist; });
    }
    renderTraits(); fitTraitsPanel();
  },
  toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; this.toastTimer = 2.4; },
  result(text) { const r = $('result'); r.hidden = !text; r.textContent = text || ''; },
  tick(dt) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) $('toast').hidden = true; }
    if (this.bannerTimer > 0) { this.bannerTimer -= dt; if (this.bannerTimer <= 0) $('skill-banner').classList.remove('show'); }
    if (info.key && info.unit) { info.refresh -= dt; if (info.refresh <= 0) { info.refresh = 0.2; renderUnitInfo(); } }   // máu / linh lực trực tiếp
    this.timer();
  },
  /** Đồng hồ: đếm ngược chuẩn bị (nếu bật) / thời gian trận còn lại; đỏ khi sắp hết, vàng khi đã vào giai đoạn hỗn loạn. */
  timer() {
    const el = $('timer'); let txt = '', cls = '';
    if (battle.phase === 'prep' && !game.over && options.prepTimer && !battle.bench) { const t = Math.ceil(game.prepT); txt = '⏱ ' + t + 's'; cls = t <= 5 ? 'low' : ''; }
    else if (battle.phase === 'fight' && !battle.bench) { const t = Math.max(0, Math.ceil(FIGHT_LIMIT - battle.time)); txt = '⚔ ' + t + 's'; cls = battle.time > OVERTIME_AT ? 'ot' : ''; }
    if (el.textContent !== txt) el.textContent = txt;
    el.hidden = !txt; el.className = 'timer' + (cls ? ' ' + cls : '');
  }
};

/* ---------- Thông tin tướng: chạm vào nhân vật (ta, hàng chờ, địch) hoặc nhấn giữ thẻ cửa hàng ---------- */
const info = { unit: null, key: null, star: 1, refresh: 0 };
function showUnitInfo(u) { if (!u) return; Object.assign(info, { unit: u, key: u.key, star: u.star, refresh: 0.2 }); renderUnitInfo(); placeUnitInfo(u); }
function showDefInfo(key, star = 1) { Object.assign(info, { unit: null, key, star }); renderUnitInfo(); placeUnitInfo(null); }
/** Đặt bảng thông tin (đo kích thước thật): không đè lên tướng vừa chạm, và không bao giờ đè lên cửa hàng /
 *  cụm nút dưới (để vẫn mua, bán, bắt đầu được khi bảng đang mở). Xem trước từ cửa hàng (u = null) thì đặt phía trên. */
function placeUnitInfo(u) {
  const el = $('unit-info'), W = window.innerWidth, H = window.innerHeight, st = el.style;
  st.left = st.right = st.top = st.bottom = ''; st.maxHeight = ''; el.hidden = false;
  const pw = el.offsetWidth;
  // Màn dọc / màn thấp: được phủ tạm lên vùng thông tin trên cùng (bảng có nút ✕); màn lớn thì nằm dưới hàng nút.
  const top = W < H || H < 520 ? 8 : document.querySelector('.top-actions').getBoundingClientRect().bottom + 6;
  let sx = -1, sy = -1;
  if (u) { const v = _v1.set(u.pos.x, 1, u.pos.z).project(camera); sx = (v.x * 0.5 + 0.5) * W; sy = (-v.y * 0.5 + 0.5) * H; }
  const obstacles = [$('prep-panel'), $('next-dock')]
    .filter(e => e && !e.hidden && e.offsetParent !== null).map(e => e.getBoundingClientRect());
  /** Mép dưới dùng được nếu bảng chiếm dải ngang [x0, x1]. */
  const floor = (x0, x1) => obstacles.reduce((lim, r) => (r.right > x0 && r.left < x1 ? Math.min(lim, r.top - 8) : lim), H - 10);
  const covers = (x0, x1, y0, y1) => !!u && sx > x0 - 24 && sx < x1 + 24 && sy + 30 > y0 && sy - 70 < y1;   // tướng cao ~ 70 px trên điểm ngực
  if (W > H) {
    const ri = typeof ArtifactUI !== 'undefined' ? ArtifactUI.rightInset() : 12;   // chừa chỗ Kho pháp bảo bên phải
    const sides = [{ k: 'left', x0: 12, x1: 12 + pw, inset: 12 }, { k: 'right', x0: W - ri - pw, x1: W - ri, inset: ri }].map(sd => ({ ...sd, room: floor(sd.x0, sd.x1) - top }));
    const fit = sd => !covers(sd.x0, sd.x1, top, top + Math.min(el.scrollHeight, sd.room));
    sides.sort((a, b) => (fit(b) - fit(a)) || (Math.min(b.room, el.scrollHeight) - Math.min(a.room, el.scrollHeight)) || (u ? 0 : a.k === 'right' ? -1 : 1));
    const sd = sides[0];
    st[sd.k] = sd.inset + 'px'; st.top = top + 'px'; st.maxHeight = Math.max(100, sd.room) + 'px';
  } else {
    const x0 = W - 12 - pw, lim = floor(x0, W - 12), maxH = Math.min((lim - top) * 0.55, 340), ph = Math.min(el.scrollHeight, maxH);
    st.right = '12px'; st.maxHeight = maxH + 'px';
    if (covers(x0, W - 12, top, top + ph) && !covers(x0, W - 12, lim - ph, lim)) st.bottom = (H - lim) + 'px'; else st.top = top + 'px';
  }
}
function closeUnitInfo() { info.unit = null; info.key = null; $('unit-info').hidden = true; }
function renderUnitInfo() {
  const u = info.unit;
  if (u && !units.includes(u) && !benchUnits.includes(u)) { closeUnitInfo(); return; }   // quân đã bán / gộp / huỷ
  const d = UNIT_DEFS[info.key], star = info.star, enemy = !!u && u.team === 'enemy', onBench = !!u && benchUnits.includes(u);
  let hp, maxHp, atk, def, aspd, mana, maxMana, shield = 0, ap = (d.ap || 100) * (STAR.skill[star] || 1), mr = d.mr || 0, ls = 0;
  if (u) { hp = Math.max(0, u.hp); maxHp = u.maxHp; atk = u.atk; def = u.def_; aspd = d.aspd * u.bonus.aspd; mana = u.mana; maxMana = u.maxMana; shield = u.shield; }
  else { maxHp = Math.round(d.hp * STAR.hp[star]); hp = maxHp; atk = d.atk * STAR.atk[star]; def = d.def; aspd = d.aspd; mana = d.mana0; maxMana = d.mana; }
  if (u) { const S = u.statsNow(); atk = S.atk; def = S.armor; aspd = S.aspd; ap = S.ap; mr = S.mr; ls = S.lifesteal + S.omnivamp; }   // chỉ số hiện hành (gồm buff / debuff đang có)
  const box = $('unit-info'); box.classList.toggle('enemy', enemy);
  $('ui-name').textContent = d.name; $('ui-stars').textContent = '★'.repeat(star);
  const counts = traitCounts(), tags = [];
  if (enemy) tags.push('<span class="ui-tag foe">Phe địch</span>');
  if (ROLES[d.role]) tags.push(`<span class="ui-tag role">${ROLES[d.role].name}</span>`);
  if (d.cost) tags.push(`<span class="ui-tag cost" style="color:${RARITY_COLOR[d.cost]};border-color:${RARITY_COLOR[d.cost]}">◆ ${d.cost} · ${RARITY[d.cost]}</span>`);
  TraitRegistry.of(d).forEach(t => {
    const T = TRAITS[t], n = enemy ? 0 : counts[t] || 0, lv = !enemy && !onBench && u ? traitLevel(t, n) : 0;
    tags.push(`<span class="ui-tag${lv ? ' on' : ''}" style="--c:${T.color}">${T.han} ${T.name}${!enemy ? ` ${n}/${TraitRegistry.next(t, n) || T.tiers[T.tiers.length - 1]}` : ''}</span>`);
  });
  (d.sub || []).forEach(s => tags.push(`<span class="ui-tag sub" title="Phân loại phụ – chưa có cộng hưởng">${SUBCLASSES[s]}</span>`));
  $('ui-tags').innerHTML = tags.join('');
  // Phần cộng thêm từ tộc/hệ đang áp lên tướng này (đọc từ bonus thật, không tính lại)
  const ts = u && u.team === 'ally' && !onBench && u.bonus.traitStats, tl = [];
  if (ts) for (const k in ts) if (ts[k] > 0) tl.push('+' + Math.round(ts[k] * 100) + '% ' + TRAIT_STATS[k]);
  const traitLine = (tl.length ? 'Tộc/hệ: ' + tl.join(' · ') : '') +
    (u && u.fx && u.fx.list.length ? (tl.length ? '\n' : '') + 'Trạng thái: ' + u.fx.describe().map(e => `${e.name}${e.type === 'shield' ? ' ' + Math.round(e.power) : ''} ${e.left.toFixed(1)}s`).join(' · ') : '');
  if (typeof ArtifactUI !== 'undefined') ArtifactUI.renderUnitSlots(u, enemy, onBench); else $('ui-items').textContent = '';
  $('ui-bars').innerHTML = `<div class="ui-bar hp"><i style="width:${(hp / maxHp * 100).toFixed(1)}%"></i><span>Máu ${Math.round(hp)}/${maxHp}${shield > 0 ? ' · khiên ' + Math.round(shield) : ''}</span></div>` +
    `<div class="ui-bar mana"><i style="width:${(mana / maxMana * 100).toFixed(1)}%"></i><span>Linh lực ${Math.round(mana)}/${maxMana}</span></div>`;
  const range = d.range > 3 ? 'Xa ' + Math.round(d.range / BOARD.tile) + ' ô' : 'Cận';
  $('ui-stats').innerHTML = `<dt>Công</dt><dd>${Math.round(atk)}</dd><dt>Giáp</dt><dd>${Math.round(def)}</dd>` +
    `<dt>Phép thuật</dt><dd>${Math.round(ap)}</dd><dt>Kháng phép</dt><dd>${Math.round(mr)}</dd>` + (ls > 0 ? `<dt>Hút máu</dt><dd>${Math.round(ls * 100)}%</dd><dt></dt><dd></dd>` : '') +
    `<dt>Tốc đánh</dt><dd>${aspd.toFixed(2)}/s</dd><dt>Tầm</dt><dd>${range}</dd>` +
    `<dt>Chí mạng</dt><dd>${Math.round(d.crit * 100)}% ×${d.critDmg}</dd><dt>Linh lực</dt><dd>${d.mana0}/${d.mana}</dd>` +
    `<dt>Né</dt><dd>${Math.round((d.dodge || 0) * 100)}%</dd><dt>Kháng choáng</dt><dd>${Math.round((1 - (ROLES[d.role] ? ROLES[d.role].tenacity : 1)) * 100)}%</dd>`;
  const sk = SKILLS[d.skill];
  $('ui-skill-name').textContent = (!enemy && sk.allyName) || sk.name;
  const stype = d.skillType || (ROLE_STATS[d.role] || {}).skillType || 'physical';
  $('ui-skill-mana').textContent = 'Cần ' + d.mana + ' linh lực · sát thương ' + DAMAGE.types[stype].toLowerCase() + (sk.meta ? ' · ' + sk.meta.type + ' · ' + sk.meta.target : '');
  $('ui-skill-desc').textContent = sk.desc || '';
  let foot = '';
  const poolTxt = d.cost ? ` · bể chung còn ${poolLeft(info.key)}/${POOL_SIZE[d.cost]}` + (game.rivals[info.key] ? ` (đối thủ giữ ${game.rivals[info.key]})` : '') : '';
  if (!u && d.cost) foot = `Giá ${d.cost} linh thạch · đang có ${countCopies(info.key, 1)}/3 bản ★1` + poolTxt;
  else if (onBench) foot = `Đang ở hàng chờ – tộc/hệ chưa tính. Kéo lên ô xanh để ra trận · bán +${sellPrice(u.key, u.star)}`;
  else if (u && !enemy) foot = battle.phase === 'prep' ? `Bán +${sellPrice(u.key, u.star)} linh thạch · kéo để đổi vị trí` : '';
  else if (enemy) foot = `Chỉ số đã nhân theo vòng ${battle.round}`;
  if (u && !enemy && poolTxt) foot += poolTxt;
  $('ui-foot').textContent = traitLine ? traitLine + (foot ? '\n' + foot : '') : foot;
}
$('btn-info-close').addEventListener('click', () => { closeUnitInfo(); if (game.sel) select(null); });
const TIER_LABEL = ['', 'Phàm', 'Linh', 'Tiên'];
function renderShop() {
  const el = $('shop'); el.textContent = '';
  game.shop.forEach((key, i) => {
    const b = document.createElement('button');
    if (!key) { b.className = 'card sold'; b.disabled = true; b.setAttribute('aria-label', 'Đã mua'); el.appendChild(b); return; }
    const d = UNIT_DEFS[key], owned = countCopies(key, 1), left = poolLeft(key);
    b.className = 'card t' + d.cost + (game.gold < d.cost ? ' poor' : '') + (owned >= 2 ? ' ready' : '') + (left <= 2 ? ' empty-pool' : '');
    b.innerHTML = `<span class="nm">${d.short || d.name}</span><span class="tr">${d.traits.map(t => TRAITS[t].name).join(' · ')}</span>` +
      `<span class="ft"><span class="cost">${d.cost}</span><span class="pool" title="Số bản còn trong bể chung">còn ${left}</span>${owned ? `<span class="own">${owned}/3</span>` : ''}</span>`;
    b.setAttribute('aria-label', `Mua ${d.name}, giá ${d.cost} linh thạch${owned ? ', đang có ' + owned : ''}`);
    // Nhấn giữ (hoặc chuột phải) để xem thông tin trước khi mua; nhả sau khi giữ thì không mua.
    let lpTimer = 0, longPressed = false;
    const cancelLp = () => { clearTimeout(lpTimer); lpTimer = 0; };
    b.addEventListener('pointerdown', () => { longPressed = false; cancelLp(); lpTimer = setTimeout(() => { longPressed = true; showDefInfo(key); haptic(8); }, 500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, cancelLp));
    b.addEventListener('contextmenu', e => { e.preventDefault(); longPressed = true; showDefInfo(key); });
    b.addEventListener('click', () => { if (longPressed) { longPressed = false; return; } buyShop(i); });
    el.appendChild(b);
  });
  $('btn-reroll').disabled = game.gold < REROLL_COST;
  $('btn-xp').disabled = game.gold < XP_COST || game.level >= MAX_LEVEL;
}
function renderOdds() {
  const o = SHOP_ODDS[game.level];
  $('odds').innerHTML = `<span>Cấp ${game.level}:</span>` + o.map((p, i) => `<span class="o${i + 1}${p ? '' : ' z'}">◆${i + 1} <b>${p}%</b></span>`).join('');
}
function renderSelActions() {
  const sel = game.sel, sell = $('btn-sell'), back = $('btn-tobench');
  let key = null, star = 1;
  if (sel && sel.type === 'bench' && game.bench[sel.i]) { key = game.bench[sel.i].key; star = game.bench[sel.i].star; }
  if (sel && sel.type === 'board') { key = sel.unit.key; star = sel.unit.star; }
  sell.hidden = !key; back.hidden = !(sel && sel.type === 'board');
  // Đang chọn tướng: nút Bán / Về hàng chờ thay chỗ Làm mới / Mua kinh nghiệm → cửa hàng giữ nguyên chiều cao, camera không nhảy.
  $('btn-reroll').hidden = $('btn-xp').hidden = !!key;
  if (key) sell.textContent = 'Bán ' + (UNIT_DEFS[key].short || UNIT_DEFS[key].name) + ' +' + sellPrice(key, star);
}
/* ---------- TraitUI: bảng tộc/hệ bên trái kiểu TFT + tooltip (chỉ vẽ lại khi số liệu đổi) ---------- */
const traitUI = { sig: '', tip: null };
function renderTraits() {
  const counts = traitCounts(), el = $('traits');
  const ids = Object.keys(TRAITS).filter(t => counts[t])
    .sort((a, b) => traitLevel(b, counts[b]) - traitLevel(a, counts[a]) || counts[b] - counts[a] || TRAITS[a].kind.localeCompare(TRAITS[b].kind));
  const sig = ids.map(t => t + counts[t]).join(',');
  if (sig === traitUI.sig) return;   // không đổi → không đụng DOM
  traitUI.sig = sig; el.textContent = '';
  if (!ids.length) { el.innerHTML = '<div class="trait-empty">Đặt tướng lên bàn để kích hoạt tộc/hệ</div>'; return; }
  for (const t of ids) {
    const T = TRAITS[t], n = counts[t], lv = traitLevel(t, n), next = TraitRegistry.next(t, n), b = document.createElement('button');
    const lo = lv ? T.tiers[lv - 1] : 0, hi = next || T.tiers[T.tiers.length - 1];
    const prog = next ? (n - lo) / (hi - lo) : 1;
    b.className = 'trait' + (lv ? ' on lv' + lv : '') + (next ? '' : ' max'); b.dataset.id = t; b.style.setProperty('--c', T.color);
    b.setAttribute('aria-label', `${T.name}: ${n} tướng, ${lv ? 'đang kích hoạt mốc ' + T.tiers[lv - 1] : 'chưa kích hoạt'}${next ? ', mốc kế ' + next : ''}`);
    b.innerHTML = `<span class="ic">${T.han}</span><span class="tx"><span class="nm">${T.name}</span>` +
      `<span class="tiers">${T.tiers.map((m, i) => `<i class="${i < lv ? 'hit' : ''}">${m}</i>`).join('<em>›</em>')}</span>` +
      `<span class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, prog)) * 100)}%"></i></span></span>` +
      `<span class="cnt">${n}${next ? `<small>/${next}</small>` : ''}</span>` +
      (lv ? `<span class="fx">${TraitRegistry.describe(t, lv)}</span>` : '');
    el.appendChild(b);
  }
  if (traitUI.tip) showTraitTip(traitUI.tip);
  fitTraitsPanel();
}
/** Giới hạn chiều cao bảng tộc/hệ để không chui xuống dưới cửa hàng / nút đáy (cuộn được nếu dài). */
function fitTraitsPanel() {
  const el = $('traits'); if (!el.childElementCount) return;
  el.style.maxHeight = '';
  const r = el.getBoundingClientRect(); let lim = window.innerHeight - 8;
  for (const o of [$('prep-panel'), $('next-dock')]) {
    if (!o || o.hidden || o.offsetParent === null) continue;
    const b = o.getBoundingClientRect(); if (b.left < r.right && b.right > r.left) lim = Math.min(lim, b.top - 6);
  }
  el.style.maxHeight = Math.max(64, lim - r.top) + 'px';
}
window.addEventListener('resize', () => requestAnimationFrame(fitTraitsPanel));
/** Tooltip tộc/hệ: mọi mốc (mốc đang đạt nổi bật), tướng thuộc tộc/hệ (tướng đang có trên bàn nổi bật). */
function showTraitTip(id) {
  const T = TRAITS[id], row = document.querySelector(`#traits .trait[data-id="${id}"]`), tip = $('trait-tip');
  if (!T || !row) { hideTraitTip(); return; }
  const counts = traitCounts(), n = counts[id] || 0, lv = traitLevel(id, n), onBoard = new Set(boardAllies().map(u => u.key));
  const who = CHAMPIONS.filter(c => TraitRegistry.of(c).includes(id)).sort((a, b) => a.cost - b.cost);
  tip.style.setProperty('--c', T.color);
  tip.innerHTML = `<div class="tt-head"><span class="ic">${T.han}</span><b>${T.name}</b><span class="kind">${T.kind === 'origin' ? 'Tộc' : 'Hệ'} · ${n} tướng</span></div>` +
    `<p class="tt-blurb">${T.blurb}</p><ol class="tt-tiers">${T.tiers.map((m, i) => `<li class="${i === lv - 1 ? 'cur' : i < lv ? 'hit' : ''}"><b>(${m})</b> ${TraitRegistry.describe(id, i + 1)}</li>`).join('')}</ol>` +
    `<div class="tt-who">${who.map(c => `<span class="${onBoard.has(c.id) ? 'own' : ''}" style="--r:${RARITY_COLOR[c.cost]}">${c.short || c.name}</span>`).join('')}</div>` +
    (battle.phase === 'fight' ? '<p class="tt-note">Mốc được chốt lúc vào trận – tướng ngã không làm tụt mốc.</p>' : '');
  tip.hidden = false; traitUI.tip = id;
  // Đặt cạnh bảng tộc/hệ (phải nếu đủ chỗ, không thì dưới hàng được chạm), không tràn màn hình
  const r = row.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.right + 8, y = r.top;
  if (x + tw > W - 8) { x = Math.max(8, Math.min(r.left, W - tw - 8)); y = r.bottom + 6; }
  y = Math.max(8, Math.min(y, H - th - 8));
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  document.querySelectorAll('#traits .trait.sel').forEach(e => e.classList.remove('sel')); row.classList.add('sel');
}
function hideTraitTip() { $('trait-tip').hidden = true; traitUI.tip = null; document.querySelectorAll('#traits .trait.sel').forEach(e => e.classList.remove('sel')); }
$('traits').addEventListener('click', e => { const b = e.target.closest('.trait'); if (!b) return; e.stopPropagation(); if (traitUI.tip === b.dataset.id) hideTraitTip(); else showTraitTip(b.dataset.id); });
$('traits').addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest('.trait'); if (b) showTraitTip(b.dataset.id); });
$('traits').addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTraitTip(); });
document.addEventListener('pointerdown', e => { if (traitUI.tip && !e.target.closest('#traits, #trait-tip')) hideTraitTip(); }, true);
function showBanner(name, team) { const b = $('skill-banner'); b.textContent = name; b.classList.toggle('enemy', team !== 'ally'); b.classList.add('show'); ui.bannerTimer = 1.6; }
function nextRound() {
  if (game.over) { newGame(); return; }
  battle.round++; rollShop(); setupRound();
}
function forceUltimate() {
  if (battle.phase !== 'fight') { ui.toast('Bắt đầu giao chiến trước, rồi thi triển'); return; }
  const k = units.find(u => u.key === 'kiemtien' && u.team === 'ally' && u.alive);
  if (!k) { ui.toast('Chưa có Vạn Kiếm Tiên Đế trên bàn – tướng bậc 5 (5 linh thạch), mở khóa từ cấp 7'); return; }
  if (k.fsm.name === 'cast') { ui.toast('Kiếm Đế đang thi triển'); return; }
  k.mana = k.maxMana; if (k.fsm.name !== 'dead' && k.fsm.name !== 'stun') k.fsm.set('move');
}
function togglePause() {
  battle.paused = !battle.paused; timelines.forEach(t => (battle.paused ? t.pause() : t.resume()));
  const b = $('btn-pause'); b.setAttribute('aria-pressed', battle.paused); b.querySelector('i').textContent = battle.paused ? '▶' : '⏸'; b.querySelector('span').textContent = battle.paused ? 'Tiếp tục' : 'Tạm dừng';
  $('btn-menu').textContent = battle.paused ? '⏸ Đang dừng' : '☰ Menu';   // nhìn là biết game đang dừng dù menu đã đóng
}
/* ---------- Menu ☰: tạm dừng, tốc độ, Vạn Kiếm, góc nhìn, cài đặt ---------- */
function setMenu(open) { $('game-menu').hidden = !open; $('btn-menu').setAttribute('aria-expanded', String(open)); document.querySelector('.hud-top').classList.toggle('menu-open', open); }
$('btn-menu').addEventListener('click', e => { e.stopPropagation(); closeSettings(); setMenu($('game-menu').hidden); });
// Chọn một mục thì đóng menu (trừ Tốc độ – bấm nhiều lần để đổi); chạm ra ngoài cũng đóng.
$('game-menu').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.id !== 'btn-speed') setMenu(false); });
document.addEventListener('pointerdown', e => { if (!$('game-menu').hidden && !e.target.closest('#game-menu, #btn-menu')) setMenu(false); }, true);
$('btn-start').addEventListener('click', () => { Sfx.init(); if (game.over) newGame(); else if (battle.phase === 'prep') startBattle(); else if (battle.phase === 'end') nextRound(); });
$('btn-reroll').addEventListener('click', reroll);
$('btn-xp').addEventListener('click', buyXP);
$('btn-sell').addEventListener('click', sellSelected);
$('btn-tobench').addEventListener('click', () => { const s = game.sel; if (s && s.type === 'board' && moveToBench(s.unit)) { select(null); afterRosterChange(); } });
$('btn-ult').addEventListener('click', forceUltimate);
$('btn-cam').addEventListener('click', () => combatCam.reset());
$('btn-pause').addEventListener('click', togglePause);
$('btn-speed').addEventListener('click', () => { battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 0.5 : 1; $('btn-speed').querySelector('span').textContent = 'Tốc độ ×' + (battle.speed === 0.5 ? '½' : battle.speed); $('btn-speed').setAttribute('aria-pressed', battle.speed !== 1); });
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
window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSettings(); setMenu(false); } });
$('opt-preptimer').checked = options.prepTimer; $('opt-preptimer').addEventListener('change', e => { options.prepTimer = e.target.checked; store.set('prepTimer', e.target.checked); ui.timer(); });
$('opt-haptics').checked = options.haptics; $('opt-haptics').addEventListener('change', e => { options.haptics = e.target.checked; store.set('haptics', e.target.checked); if (e.target.checked) haptic(15); });
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
/** Ô vuông nhỏ màu theo trang bị, dưới thanh máu. */
function drawItemDots(items, x, y, s) {
  const w = 7 * s, gap = 2 * s, x0 = x - (items.length * (w + gap) - gap) / 2;
  items.forEach((k, i) => { g2.fillStyle = 'rgba(0,0,0,0.7)'; g2.fillRect(x0 + i * (w + gap) - 1, y - 1, w + 2, w + 2); g2.fillStyle = ITEM_DB[k] ? ITEM_DB[k].color : '#fff'; g2.fillRect(x0 + i * (w + gap), y, w, w); });
}
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
    if (u.items && u.items.length) drawItemDots(u.items, x, y + h * 1.7 + 6 * s, s);
  }
  g2.font = `700 ${12 * s}px system-ui, sans-serif`;
  for (const u of benchUnits) {
    if (!u) continue;
    _v1.set(u.pos.x, 2.1 * STAR_SCALE[u.star] + u.pos.y, u.pos.z).project(camera); if (_v1.z > 1) continue;
    const x = (_v1.x * 0.5 + 0.5) * W, y = (-_v1.y * 0.5 + 0.5) * H;
    g2.lineWidth = 3 * s; g2.strokeStyle = 'rgba(0,0,0,0.75)'; const txt = '★'.repeat(u.star);
    g2.strokeText(txt, x, y); g2.fillStyle = u.star === 3 ? '#ffd166' : u.star === 2 ? '#d8e2ea' : '#c79a6a'; g2.fillText(txt, x, y);
    if (u.items && u.items.length) drawItemDots(u.items, x, y + 10 * s, s);
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
