// Vạn Kiếm Kỳ Trận – Phiêu Lưu: giao diện – HUD (sinh lực / linh lực / tu vi / ví), chỉ đường nhiệm vụ, bản đồ nhỏ, khung mục tiêu, thanh boss,
// chat, nút chiêu (hồi chiêu), bảng Túi đồ / Nhân vật / Kỹ năng / Nhiệm vụ / Bản đồ / Menu, hội thoại NPC (cửa hàng, luyện khí, truyền tống,
// Linh Đan Thụ, Tế Đàn), tử trận, điều ước; lớp 2D vẽ tên, thanh máu, số sát thương, mũi tên chỉ đường.
// Script thường (không phải module): nạp sau js/rpg/input.js.
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SKILL_GLYPH = { kiem_basic: '劍', kiem_khi: '斬', kiem_lien: '連', kiem_ngu: '御', kiem_van: '萬', phap_basic: '掌', phap_bang: '冰', phap_hoa: '炎', phap_moc: '木', phap_loi: '雷',
  vo_basic: '拳', vo_thuong: '槍', vo_phadia: '破', vo_kimcang: '剛', vo_kimthan: '金' };
const SLOT_ORDER = [...EQUIP_SLOT_KEYS, 'art0', 'art1'];

const ui = {
  cur: null, toastT: 0, bannerT: 0, hudT: 0, chatBig: false,
  toast(msg, sec = 2.4) { const t = $('toast'); t.textContent = msg; t.hidden = false; this.toastT = sec; },
  banner(title, sub = '') { $('banner-t').textContent = title; $('banner-s').textContent = sub; $('banner').classList.add('show'); this.bannerT = 3; },
  modalOpen() { return !$('panel').hidden; },
  closeAll() { if (this.cur && this.cur.locked) return; $('panel').hidden = true; this.cur = null; },
  /** Mở bảng: name = bag | char | skills | quest | map | menu | shop | smith | npc | death | wish. */
  open(name, extra = {}) {
    if (!Game.playing) return;
    if (this.cur && this.cur.locked && !extra.force) return;
    this.cur = Object.assign({ name, tab: extra.tab || null, sel: null }, extra);
    $('panel').hidden = false; this.render();
  },
  render() {
    const c = this.cur; if (!c) return;
    const R = PANELS[c.name]; const out = R(c);
    $('p-title').innerHTML = out.title; $('p-body').innerHTML = out.body;
    $('p-tabs').innerHTML = (out.tabs || []).map(([k, l]) => `<button class="tab${c.tab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('');
    $('p-tabs').hidden = !out.tabs; $('p-close').hidden = !!c.locked;
  },
  /* ---------- HUD ---------- */
  initHud() {
    const S = SECTS[G.sect];
    $('me-ava').textContent = S.glyph; $('me').style.setProperty('--sc', S.color); $('me-name').textContent = G.name;
    ['hud', 'hud-r', 'chat', 'actions'].forEach(id => ($(id).hidden = false));
    $('pad').hidden = false;
    this.hotbar(); this.quest(); this.renderChat();
  },
  hotbar() {
    for (let i = 0; i < 4; i++) { const b = document.querySelector('.a-s' + i), id = G.hotbar[i]; b.querySelector('.gl').textContent = id ? SKILL_GLYPH[id] : '+'; b.title = id ? RPG_SKILLS[id].name : 'Trống'; }
    $('actions').querySelector('.a-attack .gl').textContent = SKILL_GLYPH[SECTS[G.sect].skills[0]];
  },
  quest() {
    const q = Quests.cur(), g = Quests.guide();
    let h = q ? `<b>${esc(q.name)}</b> · ${esc(Quests.text(q))}` : `<b>Chính tuyến hoàn tất</b> · ${esc(Quests.text(null))}`;
    if (G.bounty) h += `<span class="hint">Trừ yêu: ${MAPS[G.bounty.map].name} ${G.bounty.n}/${G.bounty.count}</span>`;
    if (g && g.hint) h += `<span class="hint">➜ ${esc(g.hint)}</span>`;
    $('tracker').innerHTML = h;
  },
  bossBar(b) { this.boss = b; $('bossbar').hidden = !b; if (b) $('boss-name').textContent = b.name + ' · cấp ' + b.level; },
  update(dt) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').hidden = true;
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('show');
    const P = Ents.player; if (!P || !Game.playing) return;
    this.hudT -= dt;
    // nút chiêu: hồi chiêu mỗi khung (rẻ: chỉ đổi biến CSS)
    for (let i = 0; i < 4; i++) {
      const id = G.hotbar[i], b = document.querySelector('.a-s' + i); if (!id) continue;
      const left = P.cdLeft(id), sk = RPG_SKILLS[id], learned = P.learned(id);
      b.querySelector('.cd').style.setProperty('--p', learned && left > 0 ? Math.round(left / sk.cd * 100) + '%' : '0%');
      b.querySelector('.cdt').textContent = learned && left > 0.05 ? (left < 10 ? left.toFixed(1) : Math.ceil(left)) : '';
      b.classList.toggle('lock', !learned); b.classList.toggle('nomp', learned && P.mp < sk.cost * (1 + P.realm.r * 0.6));
    }
    if (this.hudT > 0) return; this.hudT = 0.1;
    const rl = P.realm;
    $('me-realm').textContent = rl.name + ' tầng ' + rl.layer; $('me').style.setProperty('--rc', rl.color);
    $('me-hp').style.width = (P.hp / P.maxHp * 100) + '%'; $('me-hpt').textContent = fmtFull(P.hp) + ' / ' + fmtFull(P.maxHp) + (P.shield > 0 ? ' (+' + fmtNum(P.shield) + ')' : '');
    $('me-mp').style.width = (P.mp / Math.max(1, P.maxMp) * 100) + '%'; $('me-mpt').textContent = fmtFull(P.mp) + ' / ' + fmtFull(P.maxMp);
    $('me-tv').style.width = (rl.frac * 100) + '%'; $('me').title = 'Tu vi ' + fmtFull(G.tv) + ' / ' + fmtFull(rl.next);
    $('me-gold').textContent = fmtNum(G.gold); $('me-gem').textContent = fmtNum(G.gem); $('me-lc').textContent = fmtNum(G.lc);
    $('dot-lc').hidden = G.lc < pointCost('hp', G.points.hp);
    $('dot-sk').hidden = !SECTS[G.sect].skills.some(id => !P.learned(id) && P.unlocked(id));
    $('heal-n').textContent = G.bag.filter(b => b.kind === 'dan' || (b.kind === 'cons' && CONSUMABLES[b.id].heal)).reduce((s, b) => s + b.n, 0);
    const t = P.target && !P.target.dead ? P.target : null;
    $('target').hidden = !t || (this.boss && t === this.boss);
    if (t) { $('tg-name').textContent = t.name; $('tg-lv').textContent = 'Cấp ' + t.level; $('tg-hp').style.width = (t.hp / t.maxHp * 100) + '%'; $('tg-hpt').textContent = fmtFull(t.hp) + ' / ' + fmtFull(t.maxHp); }
    if (this.boss) { if (this.boss.dead) this.bossBar(null); else { $('boss-hp').style.width = (this.boss.hp / this.boss.maxHp * 100) + '%'; $('boss-hpt').textContent = fmtFull(this.boss.hp) + ' / ' + fmtFull(this.boss.maxHp); } }
    const near = Game.nearNpc(); const tb = document.querySelector('.a-talk'); tb.hidden = !near; if (near) $('talk-l').textContent = near.role === 'tree' ? 'Thu hoạch' : near.role === 'altar' ? 'Tế Đàn' : 'Nói chuyện';
    const d = World.def, bl = d.boss ? BossClock.left(World.id) : null;
    $('map-name').textContent = d.name;
    $('map-lv').textContent = (d.home ? SECTS[d.home].name : 'Cấp quái ' + d.level[0] + '–' + d.level[1]) + (d.boss ? ' · Boss: ' + (bl === 0 ? 'đang xuất hiện' : bl == null ? '?' : fmtTime(bl)) : '');
    this.minimap();
    if (this.cur && this.cur.name === 'npc' && this.cur.npc.role === 'tree' && $('tree-next')) $('tree-next').textContent = fmtTime(Tree.nextIn());
  },
  minimap() {
    const cv = $('minimap'), g = cv.getContext('2d'), W = cv.width, H = cv.height, sx = W / World.width;
    g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, H / 2 - 2, W, 4);
    for (const gt of World.gates) { g.fillStyle = '#58d2b2'; g.fillRect(gt.x * sx - 3, 4, 6, H - 8); }
    for (const n of Ents.npcs) { g.fillStyle = '#e9c46a'; g.fillRect(n.pos.x * sx - 2, H / 2 - 6, 4, 12); }
    for (const m of Ents.monsters) if (!m.dead) { g.fillStyle = m.spec.boss ? '#ff3a3a' : '#e2553f'; const r = m.spec.boss ? 7 : 3; g.beginPath(); g.arc(m.pos.x * sx, H / 2, r, 0, TAU); g.fill(); }
    for (const b of Ents.bots) { g.fillStyle = '#8fd3ff'; g.fillRect(b.pos.x * sx - 2, H / 2 - 3, 4, 6); }
    const P = Ents.player; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(P.pos.x * sx, H / 2, 6, 0, TAU); g.fill();
  },
  /* ---------- Chat ---------- */
  renderChat() {
    const n = this.chatBig ? 40 : 4, lines = Chat.lines.slice(-n);
    $('chat').innerHTML = lines.map(l => `<p class="${l.kind}">${l.kind === 'sys' ? '✦ ' + esc(l.text) : '<b>' + esc(l.who) + ':</b> ' + esc(l.text)}</p>`).join('');
    if (this.chatBig) $('chat').scrollTop = 1e6;
  },
  /* ---------- Hội thoại đặc biệt ---------- */
  dialog(npc) { Game.walkTo = null; const r = Quests.onTalk(npc); this.open('npc', { npc, justDone: r }); },
  showDeath() { this.open('death', { locked: true, force: true }); },
  wishDialog() { this.open('wish', { locked: true, force: true }); },
  fade(text, mid) { const f = $('fade'); $('fade-t').textContent = text || ''; f.classList.add('on'); setTimeout(() => { try { mid(); } finally { setTimeout(() => f.classList.remove('on'), 120); } }, 300); }
};
const fmtTime = s => { s = Math.ceil(s); const m = Math.floor(s / 60); return m ? m + ':' + String(s % 60).padStart(2, '0') : s + ' giây'; };
const cellHtml = (it, attrs, sel) => { if (!it) return `<button class="cell empty" ${attrs}>·</button>`; const I = itemInfo(it);
  return `<button class="cell${sel ? ' sel' : ''}" style="--c:${I.color}" ${attrs} title="${esc(I.name)}">${I.glyph}${it.plus ? `<span class="p">+${it.plus}</span>` : ''}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}</button>`; };
const priceHtml = (g, m) => (g ? '💠 ' + fmtFull(g) : '') + (g && m ? ' · ' : '') + (m ? '◆ ' + m : '') || 'Miễn phí';

/* ---------- Nội dung từng bảng (trả về {title, tabs, body}) ---------- */
const PANELS = {
  bag(c) {
    const sel = c.sel, P = Ents.player;
    const eq = SLOT_ORDER.map(s => { const it = s.startsWith('art') ? G.arts[+s[3]] : G.equip[s], lbl = s.startsWith('art') ? 'Pháp bảo' : EQUIP_SLOTS[s].name;
      return it ? cellHtml(it, `data-eq="${s}"`, sel === s) : `<button class="cell empty" data-eq="${s}">${lbl}</button>`; }).join('');
    const cells = []; for (let i = 0; i < RPG_BAL.bagSize; i++) { const it = G.bag[i]; cells.push(cellHtml(it, it ? `data-uid="${it.uid}"` : '', it && sel === it.uid)); }
    let det = '<span class="muted">Chạm một ô để xem chi tiết. Trang bị: chạm món trong túi → Trang bị.</span>';
    const it = typeof sel === 'number' ? Bag.get(sel) : sel ? (sel.startsWith('art') ? G.arts[+sel[3]] : G.equip[sel]) : null;
    if (it) { const I = itemInfo(it), req = I.req != null && I.req > 0 ? `<div class="${P.realm.r >= I.req ? 'muted' : 'red'}">Yêu cầu: ${REALMS[I.req].name}</div>` : '';
      const acts = typeof sel === 'number'
        ? (it.kind === 'equip' || it.kind === 'art' ? `<button class="btn pri" data-do="equip">Trang bị</button>` : it.kind === 'cons' || it.kind === 'dan' ? `<button class="btn pri" data-do="use">Dùng</button>` : '') + (sellPrice(it) ? `<button class="btn" data-do="sell">Bán (${fmtFull(sellPrice(it) * (it.n || 1))})</button>` : '')
        : `<button class="btn" data-do="unequip">Tháo</button>`;
      det = `<b class="t" style="color:${I.color}">${esc(I.name)}</b>${it.n > 1 ? ' ×' + it.n : ''}<div>${esc(I.desc).replace(/\n/g, '<br>')}</div>${req}<div class="acts">${acts}</div>`; }
    return { title: `Túi đồ <small>${G.bag.length}/${RPG_BAL.bagSize} · 💠 ${fmtFull(G.gold)} · ◆ ${G.gem}</small>`,
      body: `<h3>Đang mang</h3><div class="eqgrid">${eq}</div><h3>Túi</h3><div class="grid">${cells.join('')}</div><div class="detail">${det}</div><p class="muted">Bán đồ: chọn món → Bán (giá thấp hơn mua). Long Châu: ${G.balls.length}/${LONG_CHAU_COUNT} (${G.balls.map(s => s + '★').join(' ') || 'chưa có'})</p>` };
  },
  char(c) {
    const P = Ents.player, s = P.stats, rl = P.realm, S = SECTS[G.sect];
    const row = (k) => { const ps = POINT_STATS[k], n = G.points[k], c1 = pointCost(k, n), max = ps.max != null && n >= ps.max;
      let c10 = 0; for (let i = 0; i < 10; i++) c10 += pointCost(k, n + i);
      const val = k === 'crit' ? Math.round(s.crit * 1000) / 10 + '%' : fmtFull(k === 'hp' ? s.hp : k === 'mp' ? s.mp : k === 'atk' ? s.atk : s.def);
      return `<div class="row"><div class="f"><b>${ps.name}</b> <span class="gold">${val}</span><div class="muted">+${k === 'crit' ? '1%' : ps.step} mỗi lần · đã nâng ${n}${ps.max ? '/' + ps.max : ''}</div></div>
        <button class="btn" data-pt="${k}" data-n="1" ${max || G.lc < c1 ? 'disabled' : ''}>+1 · ${fmtNum(c1)}</button>${k !== 'crit' ? `<button class="btn" data-pt="${k}" data-n="10" ${G.lc < c10 ? 'disabled' : ''}>+10 · ${fmtNum(c10)}</button>` : ''}</div>`; };
    return { title: `${esc(G.name)} <small>${S.name}</small>`,
      body: `<div class="two"><div><h3>Cảnh giới</h3><p><b style="color:${rl.color}">${rl.name} tầng ${rl.layer}</b> · tu vi ${fmtFull(G.tv)} / ${fmtFull(rl.next)}</p>
        <div class="bar tv" style="height:8px"><i style="width:${rl.frac * 100}%"></i></div>
        <div class="stats"><div><span>Sinh lực</span>${fmtFull(s.hp)}</div><div><span>Linh lực</span>${fmtFull(s.mp)}</div><div><span>Sức đánh</span>${fmtFull(s.atk)}</div><div><span>Giáp</span>${fmtFull(s.def)}</div>
        <div><span>Chí mạng</span>${Math.round(s.crit * 1000) / 10}%</div><div><span>ST chí mạng</span>${Math.round(s.critDmg * 100)}%</div><div><span>Tốc đánh</span>${Math.round(s.aspd * 100)}%</div><div><span>ST kỹ năng</span>+${Math.round(s.skillDmg * 100)}%</div>
        <div><span>Hút máu</span>${Math.round(s.ls * 1000) / 10}%</div><div><span>Giảm ST nhận</span>${Math.round(s.dr * 1000) / 10}%</div></div>
        <p class="muted">Hạ quái: ${fmtFull(G.kills)} · Boss: ${G.bossKills} · Điều ước: ${G.wishes} · Thời gian chơi: ${fmtTime(G.playT)}</p></div>
        <div><h3>Linh căn <span class="gold">${fmtFull(G.lc)}</span></h3><p class="muted">Nhận linh căn cùng lúc với tu vi khi đánh quái. Dùng để nâng chỉ số gốc (được nhân thêm thưởng cảnh giới).</p>${['hp', 'mp', 'atk', 'def', 'crit'].map(row).join('')}</div></div>` };
  },
  skills(c) {
    const P = Ents.player, S = SECTS[G.sect], master = c.atMaster;
    const rows = S.skills.map((id, i) => {
      const sk = RPG_SKILLS[id], lv = P.learned(id), un = P.unlocked(id), cost = lv ? skillBookCost(sk, lv + 1) : { gold: i === 0 ? 0 : Math.round(200 * Math.pow(4, i - 1)), tv: 0 };
      const req = sk.unlockQuest ? 'Hoàn thành nhiệm vụ "' + QUESTS.find(q => q.id === sk.unlockQuest).name + '"' : 'Cảnh giới ' + REALMS[sk.unlock || 0].name;
      let act = '';
      if (!un) act = `<span class="muted">${req}</span>`;
      else if (lv >= SKILL_MAX_LV) act = '<span class="jade">Tối đa</span>';
      else if (master) act = `<button class="btn pri" data-learn="${id}" ${G.gold < cost.gold || G.tv < cost.tv ? 'disabled' : ''}>${lv ? 'Nâng cấp ' + (lv + 1) : 'Học'} · 💠 ${fmtFull(cost.gold)}${cost.tv ? ' · tu vi ≥ ' + fmtNum(cost.tv) : ''}</button>`;
      else act = `<span class="muted">${lv ? '' : 'Học tại Sư Phụ'}</span>`;
      const slot = i ? `<div class="acts" style="margin-top:4px">${[0, 1, 2, 3].map(k => `<button class="btn" data-hot="${id}" data-k="${k}" style="min-height:28px;padding:3px 8px${G.hotbar[k] === id ? ';border-color:var(--gold);color:var(--gold)' : ''}">Ô ${['K', 'L', 'U', 'I'][k]}</button>`).join('')}</div>` : '';
      return `<div class="row"><div class="ic" style="--c:#${sk.color.toString(16).padStart(6, '0')}">${SKILL_GLYPH[id]}</div><div class="f"><b>${sk.name}</b> ${lv ? '<span class="gold">cấp ' + lv + '</span>' : '<span class="muted">chưa học</span>'}${sk.ult ? ' <span class="red">Tuyệt kỹ</span>' : ''}
        <div class="muted">${sk.desc} ${i ? '· ' + Math.round(sk.cost * (1 + P.realm.r * 0.6)) + ' linh lực · hồi ' + sk.cd + ' giây' : ''} · ${Math.round(skillMult(sk, Math.max(1, lv)) * 100)}% công${sk.hits ? ' × ' + sk.hits : ''}</div>${lv ? slot : ''}</div>${act}</div>`;
    }).join('');
    return { title: `Kỹ năng <small>${S.name}${master ? ' · Sư Phụ truyền thụ' : ''}</small>`, body: rows + '<p class="muted">Đánh thường: J / nút ⚔ (giữ để đánh liên tục). Kỹ năng gán vào 4 ô K, L, U, I (phím 1–4).</p>' };
  },
  quest() {
    const q = Quests.cur(), b = G.bounty;
    const RW = { gold: v => '💠 ' + fmtFull(v), gem: v => '◆ ' + v, tv: v => fmtNum(v) + ' tu vi', item: v => v[1] + ' ' + CONSUMABLES[v[0]].name, equip: v => TIERS[v[1]].name + ' ' + EQUIP_SLOTS[v[0]].name, unlock: () => 'mở kỹ năng', ball: () => 'Long Châu', art: v => 'pháp bảo +' + v };
    const rw = r => r ? Object.entries(r).map(([k, v]) => RW[k](v)).join(' · ') : '';
    return { title: 'Nhiệm vụ', body: (q ? `<h3>Chính tuyến ${G.quest.i + 1}/${QUESTS.length}: ${q.name}</h3><p>${esc(Quests.text(q))}</p><p class="muted">Thưởng: ${rw(q.reward)}</p>` : '<h3>Chính tuyến hoàn tất</h3>') +
      (b ? `<h3>Trừ yêu</h3><p>Hạ ${b.count} quái ở ${MAPS[b.map].name}: ${b.n}/${b.count}</p><p class="muted">Thưởng: ${fmtNum(b.tv)} tu vi · 💠 ${fmtFull(b.gold)} · ◆ ${b.gem}</p>` : '<p class="muted">Nhiệm vụ trừ yêu (lặp lại): nhận ở Sư Phụ.</p>') +
      `<h3>Đã xong</h3><p class="muted">${G.quest.done.map(id => QUESTS.find(x => x.id === id).name).join(' · ') || 'Chưa có'}</p>` };
  },
  map() {
    const P = Ents.player, regions = { kiem: 'Thanh Vân Kiếm Tông', phap: 'Đan Hà Pháp Tông', vo: 'Bất Diệt Võ Tông', ma: 'Ma Vực' };
    const body = Object.keys(regions).map(r => `<h3>${regions[r]}</h3>` + MAP_KEYS.filter(k => MAPS[k].region === r).map(k => {
      const d = MAPS[k], bl = d.boss ? BossClock.left(k) : null, lock = d.minRealm && P.realm.r < d.minRealm;
      return `<div class="row"><div class="f"><b${k === World.id ? ' class="gold"' : ''}>${k === World.id ? '◉ ' : ''}${d.name}</b> <span class="muted">${d.home ? 'Sơn môn – an toàn' : 'Quái cấp ' + d.level[0] + '–' + d.level[1]}${d.boss ? ' · Boss ' + MONSTERS[d.boss].name + ': ' + (bl === 0 ? '<span class="red">đang xuất hiện</span>' : bl == null ? '?' : 'sau ' + fmtTime(bl)) : ''}${lock ? ' · <span class="red">cần ' + REALMS[d.minRealm].name + '</span>' : ''}</span></div></div>`;
    }).join('')).join('');
    return { title: 'Bản đồ thế giới', body: body + '<p class="muted">Đi qua cổng sáng ở hai mép bản đồ để sang bản đồ kế bên; tới tông môn khác / Ma Vực nhờ Truyền Tống Sứ ở sơn môn.</p>' };
  },
  menu(c) {
    const q = QualityManager;
    const tog = (k, l, v) => `<label class="row" style="cursor:pointer"><span class="f">${l}</span><input type="checkbox" data-opt="${k}" ${v ? 'checked' : ''}></label>`;
    return { title: 'Menu', body: `<div class="two"><div><h3>Đồ hoạ</h3><div class="acts" style="display:flex;gap:5px;flex-wrap:wrap">${q.order.map(l => `<button class="btn${q.level === l ? ' ok' : ''}" data-q="${l}">${q.presets[l].label}</button>`).join('')}</div>
      ${tog('autoQ', 'Tự giảm đồ hoạ khi FPS thấp', q.auto)}${tog('mute', 'Tắt âm thanh', Sfx.muted)}${tog('shake', 'Rung camera', SideCam.enableShake)}${tog('hitstop', 'Khựng khung khi chí mạng', options.hitstop)}${tog('footIK', 'IK chân (bám địa hình)', options.footIK)}</div>
      <div><h3>Điều khiển</h3>${tog('autoTarget', 'Giữ nút đánh: tự tiến tới mục tiêu', options.autoTarget)}${tog('haptics', 'Rung khi chạm nút (Android)', options.haptics)}${tog('showNames', 'Hiện tên nhân vật', options.showNames)}
      <label class="row"><span class="f">Cỡ nút ảo</span><input type="range" min="0.8" max="1.3" step="0.05" value="${options.padSize}" data-pad="1"></label>
      <p class="muted">Windows: A/D hoặc ←/→ chạy · Space/W nhảy, nhấn lần 2 trên không để <b>bay</b> (giữ ↑/↓ lên xuống) · S xuống bục / đáp · J đánh (giữ) · K L U I (1–4) kỹ năng · Tab đổi mục tiêu · E nói chuyện · H dùng đan · B túi · N nhân vật · O kỹ năng · T nhiệm vụ · M bản đồ · P tạm dừng.<br>Android: cần ảo trái (đẩy lên = nhảy / bay), nút phải: ⚔ đánh, 4 chiêu, ⇑ nhảy/bay, ⇓ hạ, 丹 đan, ◎ mục tiêu; chạm quái để chọn.</p></div></div>
      <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn ok" data-do="save">Lưu ngay</button><button class="btn" data-do="pause">${Game.paused ? 'Tiếp tục' : 'Tạm dừng'}</button><button class="btn" data-do="title">Về màn hình chính</button><button class="btn" data-do="wipe" style="color:#ff9a8a">Xoá nhân vật…</button></div>
      ${c.confirmWipe ? '<p class="red">Xoá nhân vật hiện tại và tạo mới? (bản cũ được giữ ở vkkt_rpg_save_prev) <button class="btn" data-do="wipe2" style="color:#ff9a8a">Xoá</button></p>' : ''}` };
  },
  npc(c) {
    const n = c.npc, P = Ents.player, own = n.sect === G.sect, q = Quests.cur();
    let text = '', opts = [];
    switch (n.role) {
      case 'master':
        text = c.justDone ? 'Tốt lắm. Đường tu tiên dài đằng đẵng – cứ vững bước mà đi.' : own ? 'Tu luyện cần chuyên cần. Hạ yêu thú để tăng tu vi, dùng linh căn nâng căn cơ, tới đây học công pháp mới.' : 'Đạo hữu từ phương xa tới, hoan nghênh. Công pháp bổn tông không truyền ra ngoài.';
        if (own) { opts.push(['skills', 'Học / nâng cấp kỹ năng']); opts.push(G.bounty ? ['bountyX', 'Huỷ nhiệm vụ trừ yêu'] : ['bounty', 'Nhận nhiệm vụ trừ yêu (lặp lại)']); }
        if (q) opts.push(['hint', 'Chỉ điểm nhiệm vụ: ' + q.name]);
        break;
      case 'shop': text = 'Đan dược, trang bị – cần gì cứ chọn. Đồ không dùng tới cũng bán lại cho ta được.'; opts.push(['shop', 'Mua đồ'], ['sellTab', 'Bán đồ']); break;
      case 'smith': text = 'Hai nguyên liệu hợp thành một pháp bảo – 36 công thức, phí luyện 500 linh thạch. Ta cũng cường hoá trang bị và pháp bảo tới +' + UPGRADE_MAX + '.'; opts.push(['craft', 'Luyện pháp bảo'], ['upgrade', 'Cường hoá']); break;
      case 'tele': text = 'Ta có thể đưa đạo hữu tới các tông môn khác hoặc Ma Vực.';
        for (const t of TELEPORTS) if (t.map !== World.id) { const lock = t.minRealm && P.realm.r < t.minRealm; opts.push(['tp:' + t.map, t.label + (t.cost ? ' · 💠 ' + fmtFull(t.cost) : ''), lock]); }
        break;
      case 'tree': { Tree.sync(); const T = G.tree, cap = LINHDAN.cap(T.lv), ni = Tree.nextIn();
        text = `Linh Đan Thụ cấp ${T.lv}: đang có <b class="gold">${T.stock}/${cap}</b> linh đan (mỗi viên hồi ${Math.round(LINHDAN.pct(T.lv) * 100)}% sinh lực + linh lực). ${T.stock < cap ? 'Viên kế tiếp sau <span id="tree-next">' + fmtTime(ni) + '</span>.' : 'Đã đầy.'} Cây vẫn kết trái khi tắt game.`;
        opts.push(['harvest', 'Thu hoạch', !T.stock]); if (T.lv < LINHDAN.maxLv) opts.push(['treeUp', 'Nâng cấp lên cấp ' + (T.lv + 1) + ' · 💠 ' + fmtFull(LINHDAN.upCost(T.lv)), G.gold < LINHDAN.upCost(T.lv)]);
        break; }
      case 'altar': text = `Tế Đàn Long Châu. Đủ 7 viên sẽ triệu hồi được Thần Long và ước một điều.<div class="balls">${[1, 2, 3, 4, 5, 6, 7].map(s => `<i class="${G.balls.includes(s) ? 'on' : ''}">${s}★</i>`).join('')}</div>Long Châu rơi ngẫu nhiên từ yêu thú (rất hiếm) và boss (thường xuyên), luôn là viên còn thiếu.`;
        opts.push(['summon', 'Triệu hồi Thần Long', G.balls.length < LONG_CHAU_COUNT]); break;
    }
    if (c.msg) text = c.msg + '<br><br>' + text;
    return { title: `${esc(n.name)} <small>${n.title}${n.sect && n.sect !== G.sect ? ' · ' + SECTS[n.sect].short : ''}</small>`,
      body: (c.justDone ? '<p class="jade">✓ Hoàn thành nhiệm vụ</p>' : '') + `<div class="npc-text">${text}</div><div class="opts">${opts.map(([k, l, dis]) => `<button class="btn" data-npc="${k}" ${dis ? 'disabled' : ''}>${l}</button>`).join('')}</div>` };
  },
  shop(c) {
    const tab = c.tab || 'buy';
    let body = '';
    if (tab === 'buy') body = shopStock().map((e, i) => { const I = itemInfo(e.it), lock = e.it.kind === 'equip' && Ents.player.realm.r < TIERS[e.it.tier].realm;
      return `<div class="row"><div class="ic" style="--c:${I.color}">${I.glyph}</div><div class="f"><b>${esc(I.name)}</b><div class="muted">${esc(I.desc)}${lock ? ' · <span class="red">cần ' + REALMS[TIERS[e.it.tier].realm].name + '</span>' : ''}</div></div>
        <button class="btn pri" data-buy="${i}" data-n="1">${priceHtml(e.gold, e.gem)}</button>${e.it.kind === 'cons' ? `<button class="btn" data-buy="${i}" data-n="10">×10</button>` : ''}</div>`; }).join('');
    else body = G.bag.filter(it => sellPrice(it)).map(it => { const I = itemInfo(it); return `<div class="row"><div class="ic" style="--c:${I.color}">${I.glyph}</div><div class="f"><b>${esc(I.name)}</b>${it.n > 1 ? ' ×' + it.n : ''}</div><button class="btn" data-sell="${it.uid}">Bán · 💠 ${fmtFull(sellPrice(it) * (it.n || 1))}</button></div>`; }).join('') || '<p class="muted">Không có gì để bán.</p>';
    return { title: `Linh Thương <small>💠 ${fmtFull(G.gold)} · ◆ ${G.gem}</small>`, tabs: [['buy', 'Mua'], ['sell', 'Bán']], body };
  },
  smith(c) {
    const tab = c.tab || 'craft';
    let body = '';
    if (tab === 'craft') {
      const comps = COMPONENT_KEYS.map(k => ({ k, n: Bag.count('comp', k) }));
      const a = c.a || null, b = c.b || null, rid = a && b ? recipeOf(a, b) : null;
      body = `<p class="muted">Chọn 2 nguyên liệu (có thể trùng loại nếu có ≥ 2). Phí luyện 💠 500.</p><div class="grid">${comps.map(({ k, n }) => { const C = COMPONENTS[k];
        return `<button class="cell${a === k || b === k ? ' sel' : ''}" style="--c:${C.color}" data-comp="${k}" ${n ? '' : 'disabled'}>${C.glyph}<span class="p">×${n}</span><span class="lbl">${C.name}</span></button>`; }).join('')}</div>
        <div class="detail">${a ? COMPONENTS[a].name : '—'} + ${b ? COMPONENTS[b].name : '—'}${rid ? ` = <b style="color:${ARTIFACTS[rid].color}">${ARTIFACTS[rid].name}</b><div>${esc(statLine(artifactStats(ARTIFACTS[rid])))}</div><div class="muted">Nội tại: ${esc(artPassiveText(ARTIFACTS[rid]))}</div>
        <div class="acts"><button class="btn pri" data-do="craft" ${G.gold < 500 ? 'disabled' : ''}>Luyện</button></div>` : ''}${c.msg ? `<p class="jade">${c.msg}</p>` : ''}</div>`;
    } else if (tab === 'upgrade') {
      const list = [...EQUIP_SLOT_KEYS.filter(s => G.equip[s]).map(s => ({ where: { slot: s }, it: G.equip[s], on: true })), ...[0, 1].filter(i => G.arts[i]).map(i => ({ where: { slot: 'art' + i }, it: G.arts[i], on: true })),
        ...G.bag.filter(it => it.kind === 'equip' || it.kind === 'art').map(it => ({ where: { uid: it.uid }, it }))];
      body = (c.msg ? `<p class="${c.ok ? 'jade' : 'red'}">${c.msg}</p>` : '') + (list.map((e, i) => { const I = itemInfo(e.it), plus = e.it.plus || 0;
        const cost = e.it.kind === 'equip' ? upgradeCost(e.it.tier, plus) : { gold: Math.round(1500 * Math.pow(1.8, plus)), rate: Math.max(0.3, 1 - plus * 0.1) };
        return `<div class="row"><div class="ic" style="--c:${I.color}">${I.glyph}</div><div class="f"><b>${esc(I.name)}</b>${e.on ? ' <span class="jade">đang mang</span>' : ''}<div class="muted">${esc(I.desc.split('\n')[0])}</div></div>${plus >= UPGRADE_MAX ? '<span class="jade">+' + UPGRADE_MAX + '</span>' :
          `<button class="btn pri" data-up="${i}" ${G.gold < cost.gold ? 'disabled' : ''}>+${plus + 1} · 💠 ${fmtFull(cost.gold)} · ${Math.round(cost.rate * 100)}%</button>`}</div>`; }).join('') || '<p class="muted">Chưa có trang bị / pháp bảo.</p>') + '<p class="muted">Thất bại chỉ mất linh thạch, không mất cấp hay vật phẩm. Mỗi cấp +12% chỉ số trang bị, +20% chỉ số pháp bảo.</p>';
      c.list = list;
    } else body = ARTIFACT_LIST.map(([id]) => { const A = ARTIFACTS[id]; return `<div class="row"><div class="ic" style="--c:${A.color}">${A.glyph}</div><div class="f"><b>${A.name}</b> <span class="muted">${COMPONENTS[A.parts[0]].name} + ${COMPONENTS[A.parts[1]].name}</span><div class="muted">${esc(statLine(artifactStats(A)))} · ${esc(artPassiveText(A))}</div></div></div>`; }).join('');
    return { title: `Luyện Khí <small>💠 ${fmtFull(G.gold)}</small>`, tabs: [['craft', 'Luyện pháp bảo'], ['upgrade', 'Cường hoá'], ['book', '36 công thức']], body };
  },
  death() {
    const rv = Bag.count('cons', 'revive');
    return { title: 'Trọng thương', body: `<p class="npc-text">Ngươi đã gục ngã. Tu vi không mất – chọn cách quay lại:</p><div class="opts">
      <button class="btn pri" data-do="home">Về sơn môn (miễn phí, hồi đầy)</button><button class="btn" data-do="rvItem" ${rv ? '' : 'disabled'}>Dùng Hoàn Hồn Phù tại chỗ (có ${rv})</button>
      <button class="btn" data-do="rvGem" ${G.gem >= 1 ? '' : 'disabled'}>Hồi sinh tại chỗ · ◆ 1 tiên ngọc</button></div>` };
  },
  wish() {
    return { title: 'Thần Long hiện thế', body: `<p class="npc-text">"Kẻ tập hợp đủ bảy viên Long Châu – hãy nói ra điều ước của ngươi. Ta chỉ ban một điều."</p><div class="opts">${WISHES.map(w => `<button class="btn" data-wish="${w.id}"><b>${w.name}</b>&nbsp;– ${w.desc}</button>`).join('')}</div>` };
  }
};

/* ---------- Sự kiện bảng (uỷ quyền trên #panel) ---------- */
$('p-close').addEventListener('click', () => ui.closeAll());
$('panel').addEventListener('pointerdown', e => { if (e.target === $('panel')) ui.closeAll(); });
$('p-tabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t) return; ui.cur.tab = t.dataset.tab; ui.cur.msg = null; ui.render(); });
$('p-body').addEventListener('change', e => {
  const o = e.target.dataset.opt; if (o) { const v = e.target.checked;
    if (o === 'autoQ') { QualityManager.auto = v; store.set('autoQuality', v); }
    else if (o === 'mute') { Sfx.muted = v; store.set('mute', v); }
    else if (o === 'shake') { SideCam.enableShake = v; store.set('shake', v); }
    else { options[o] = v; store.set(o, v); }
  }
  if (e.target.dataset.pad) { options.padSize = +e.target.value; store.set('padSize', options.padSize); resize(); }
});
$('p-body').addEventListener('click', e => {
  const c = ui.cur; if (!c) return; const P = Ents.player, d = e.target.closest('button'); if (!d || d.disabled) return;
  const ds = d.dataset;
  if (ds.uid) { c.sel = +ds.uid; return ui.render(); }
  if (ds.eq) { c.sel = ds.eq; return ui.render(); }
  if (ds.pt) { buyPoints(ds.pt, +ds.n); return ui.render(); }
  if (ds.learn) { learnSkill(ds.learn); return ui.render(); }
  if (ds.hot) { const k = +ds.k, i = G.hotbar.indexOf(ds.hot); if (i >= 0) G.hotbar[i] = G.hotbar[k]; G.hotbar[k] = ds.hot; ui.hotbar(); Save.soon(); return ui.render(); }
  if (ds.q) { QualityManager.set(ds.q); return ui.render(); }
  if (ds.buy != null) { const st = shopStock()[+ds.buy]; if (st) buy(st, +ds.n); return ui.render(); }
  if (ds.sell) { sell(+ds.sell); return ui.render(); }
  if (ds.comp) { const k = ds.comp; if (!c.a || (c.a && c.b)) { c.a = k; c.b = null; } else { if (k === c.a && Bag.count('comp', k) < 2) return; c.b = k; } c.msg = null; return ui.render(); }
  if (ds.up != null) { const en = c.list[+ds.up]; const r = upgradeItem(en.where); if (r) { c.ok = r.ok; c.msg = r.ok ? 'Cường hoá thành công: +' + r.plus : 'Cường hoá thất bại (tỉ lệ ' + Math.round(r.rate * 100) + '%) – chỉ mất linh thạch'; } return ui.render(); }
  if (ds.wish) { const id = ds.wish; ui.cur.locked = false; ui.closeAll(); Dragon.grant(id); return; }
  if (ds.npc) return npcAction(c, ds.npc);
  switch (ds.do) {
    case 'equip': equipItem(c.sel); c.sel = null; return ui.render();
    case 'use': useItem(c.sel); if (!Bag.get(c.sel)) c.sel = null; return ui.render();
    case 'sell': sell(c.sel); c.sel = null; return ui.render();
    case 'unequip': unequip(c.sel); c.sel = null; return ui.render();
    case 'craft': { const id = craftArtifact(c.a, c.b); if (id) { c.msg = 'Luyện thành ' + ARTIFACTS[id].name + '! Đã cho vào túi – mở Túi đồ để trang bị.'; c.a = c.b = null; } return ui.render(); }
    case 'save': Save.now(); ui.toast('Đã lưu'); return;
    case 'pause': Game.togglePause(); return ui.render();
    case 'title': Save.now(); location.reload(); return;
    case 'wipe': c.confirmWipe = true; return ui.render();
    case 'wipe2': Save.wipe(); Save.blocked = true; location.reload(); return;
    case 'home': c.locked = false; ui.closeAll(); P.revive(true); return;
    case 'rvItem': if (Bag.takeKind('cons', 'revive', 1)) { c.locked = false; ui.closeAll(); P.revive(false); } return;
    case 'rvGem': if (G.gem >= 1) { G.gem--; c.locked = false; ui.closeAll(); P.revive(false); } return;
  }
});
function npcAction(c, k) {
  const P = Ents.player;
  if (k === 'skills') return ui.open('skills', { atMaster: true });
  if (k === 'shop') return ui.open('shop', { tab: 'buy' });
  if (k === 'sellTab') return ui.open('shop', { tab: 'sell' });
  if (k === 'craft') return ui.open('smith', { tab: 'craft' });
  if (k === 'upgrade') return ui.open('smith', { tab: 'upgrade' });
  if (k === 'hint') { const g = Quests.guide(); c.msg = '<span class="jade">' + esc(Quests.text()) + (g && g.hint ? ' – ' + esc(g.hint) : '') + '</span>'; return ui.render(); }
  if (k === 'bounty') { G.bounty = Quests.bountyOffer(); c.msg = '<span class="jade">Trừ yêu: hạ ' + G.bounty.count + ' quái ở ' + MAPS[G.bounty.map].name + '.</span>'; ui.quest(); Save.soon(); return ui.render(); }
  if (k === 'bountyX') { G.bounty = null; ui.quest(); return ui.render(); }
  if (k === 'harvest') { const n = Tree.harvest(); if (n) c.msg = '<span class="jade">Thu được ' + n + ' linh đan cấp ' + G.tree.lv + '.</span>'; return ui.render(); }
  if (k === 'treeUp') { if (Tree.upgrade()) c.msg = '<span class="jade">Linh Đan Thụ lên cấp ' + G.tree.lv + '!</span>'; return ui.render(); }
  if (k === 'summon') { ui.closeAll(); Dragon.summon(); return; }
  if (k.startsWith('tp:')) {
    const t = TELEPORTS.find(x => x.map === k.slice(3));
    if (t.minRealm && P.realm.r < t.minRealm) return;
    if (t.cost && G.gold < t.cost) { ui.toast('Cần ' + fmtFull(t.cost) + ' linh thạch'); return; }
    if (t.cost) G.gold -= t.cost;
    ui.closeAll(); Game.travel(t.map, null, MAPS[t.map].home ? 12 : 4);
  }
}
function buyPoints(k, n) {
  const ps = POINT_STATS[k]; let done = 0;
  for (let i = 0; i < n; i++) { if (ps.max != null && G.points[k] >= ps.max) break; const c = pointCost(k, G.points[k]); if (G.lc < c) break; G.lc -= c; G.points[k]++; done++; }
  if (done) { Ents.player.recompute(); Quests.on('points'); Sfx.chime(); Save.soon(); }
}
function learnSkill(id) {
  const P = Ents.player, sk = RPG_SKILLS[id], lv = P.learned(id), i = SECTS[G.sect].skills.indexOf(id);
  if (!P.unlocked(id) || lv >= SKILL_MAX_LV) return;
  const cost = lv ? skillBookCost(sk, lv + 1) : { gold: i === 0 ? 0 : Math.round(200 * Math.pow(4, i - 1)), tv: 0 };
  if (G.gold < cost.gold || G.tv < cost.tv) return;
  G.gold -= cost.gold; G.skills[id] = lv + 1;
  if (!lv && !G.hotbar.includes(id)) { const e = G.hotbar.findIndex(h => !h || !P.learned(h)); if (e >= 0) G.hotbar[e] = id; ui.hotbar(); }
  ui.toast((lv ? 'Nâng cấp ' : 'Đã học ') + sk.name + ' – cấp ' + (lv + 1)); Sfx.chime(); Save.soon();
}
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => ui.open(b.dataset.open)));
$('me').addEventListener('click', () => ui.open('char'));
$('tracker').addEventListener('click', () => ui.open('quest'));
$('mapcard').addEventListener('click', () => ui.open('map'));
$('chat').addEventListener('click', () => { ui.chatBig = !ui.chatBig; $('chat').classList.toggle('big', ui.chatBig); ui.renderChat(); });
Chat.listeners.push(() => ui.renderChat());

/* ---------- Chất lượng đồ hoạ ---------- */
function applyQuality(cur, reason) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cur.pr));
  if (renderer.shadowMap.enabled !== cur.shadows) {
    renderer.shadowMap.enabled = cur.shadows; sun.castShadow = cur.shadows;
    scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  }
  if (cur.shadows && sun.shadow.mapSize.x !== cur.shadowSize) { sun.shadow.mapSize.set(cur.shadowSize, cur.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  for (const a of [Ents.player, ...Ents.monsters, ...Ents.npcs, ...Ents.bots]) if (a && a.model) a.model.setOutline(cur.outline);
  vfx.particles.setBudget(cur.particles);
  resize(); bloom.setLevel(cur.bloom, window.innerWidth, window.innerHeight);
  if (reason === 'auto') ui.toast('FPS thấp kéo dài – đã giảm đồ hoạ xuống ' + cur.label);
}
QualityManager.onChange(applyQuality);

/* ---------- Lớp 2D: tên, thanh máu, dấu nhiệm vụ, bong bóng chat, số sát thương, chỉ đường ---------- */
const fx2d = $('fx2d'), g2 = fx2d.getContext('2d');
let fxScale = 1;
function proj(x, y, z, out) { _v1.set(x, y, z).project(camera); out.x = (_v1.x * 0.5 + 0.5) * fx2d.width; out.y = (-_v1.y * 0.5 + 0.5) * fx2d.height; out.ok = _v1.z < 1; return out; }
const _sp = { x: 0, y: 0, ok: true };
function label(text, x, y, color, size = 11, weight = 600) {
  g2.font = `${weight} ${Math.round(size * fxScale)}px "Be Vietnam Pro", system-ui, sans-serif`;
  g2.lineWidth = 3 * fxScale; g2.strokeStyle = 'rgba(0,0,0,0.8)'; g2.strokeText(text, x, y); g2.fillStyle = color; g2.fillText(text, x, y);
}
function hpBar(x, y, w, k, color) { const h = 5 * fxScale; g2.fillStyle = 'rgba(0,0,0,0.7)'; g2.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2); g2.fillStyle = color; g2.fillRect(x - w / 2, y, w * clamp(k, 0, 1), h); }
function draw2D(dt) {
  const W = fx2d.width, H = fx2d.height, s = fxScale; g2.clearRect(0, 0, W, H);
  if (!Game.playing && !Game.preview) return;
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  const P = Ents.player, lv = G ? effLevel(G.tv) : 1;
  if (Game.playing) {
    for (const m of Ents.monsters) {
      if (m.dead) continue; proj(m.pos.x, m.pos.y + m.h + 0.35, 0, _sp); if (!_sp.ok || _sp.x < -50 || _sp.x > W + 50) continue;
      const tgt = P.target === m, show = tgt || m.hp < m.maxHp || m.spec.boss;
      const d = m.level - lv, col = d >= 5 ? '#ff6a5a' : d >= 2 ? '#ffb070' : d <= -6 ? '#8a9a96' : '#ece4d0';
      if (show) hpBar(_sp.x, _sp.y, (m.spec.boss ? 90 : 48) * s, m.hp / m.maxHp, '#e2553f');
      if (show || options.showNames) label((m.spec.boss ? '☠ ' : '') + m.name + ' · ' + m.level, _sp.x, _sp.y - 8 * s, col, m.spec.boss ? 12 : 10);
      if (tgt) { const y = _sp.y - 20 * s - Math.abs(Math.sin(clock.t * 4)) * 4 * s; g2.fillStyle = '#e9c46a'; g2.beginPath(); g2.moveTo(_sp.x - 6 * s, y - 6 * s); g2.lineTo(_sp.x + 6 * s, y - 6 * s); g2.lineTo(_sp.x, y + 2 * s); g2.fill(); }
      if (m.casting && m.casting.t < 0.5) label('!', _sp.x + 30 * s, _sp.y, '#ff4a3a', 16, 700);
    }
    for (const n of Ents.npcs) {
      proj(n.pos.x, n.pos.y + n.h + 0.35, 0, _sp); if (!_sp.ok) continue;
      label(n.title, _sp.x, _sp.y, '#e9c46a', 10); if (n.model) label(n.name, _sp.x, _sp.y - 13 * s, '#ece4d0', 11);
      const mk = n.mark(); if (mk) label(mk, _sp.x, _sp.y - 30 * s - Math.abs(Math.sin(clock.t * 3)) * 5 * s, '#ffd166', 22, 700);
      if (n.role === 'tree') { Tree.sync(); label('Linh đan ' + G.tree.stock + '/' + LINHDAN.cap(G.tree.lv), _sp.x, _sp.y + 14 * s, '#7fe0a0', 10); }
    }
    for (const b of Ents.bots) {
      if (b.dead && b.deadT > 1.5) continue; proj(b.pos.x, b.pos.y + b.h + 0.3, 0, _sp); if (!_sp.ok) continue;
      if (options.showNames) { label(b.name, _sp.x, _sp.y, '#8fd3ff', 10); label(b.realmName, _sp.x, _sp.y + 11 * s, 'rgba(236,228,208,0.6)', 8); }
      if (b.bubble) { g2.font = `500 ${Math.round(10 * s)}px "Be Vietnam Pro", system-ui, sans-serif`; const tw = g2.measureText(b.bubble.text).width + 12 * s, y = _sp.y - 22 * s;
        g2.fillStyle = 'rgba(255,255,255,0.92)'; g2.fillRect(_sp.x - tw / 2, y - 9 * s, tw, 18 * s); g2.fillStyle = '#1a2024'; g2.fillText(b.bubble.text, _sp.x, y); }
    }
    if (P && !P.dead) { proj(P.pos.x, P.pos.y + P.h + 0.35, 0, _sp); if (options.showNames) { label(G.name, _sp.x, _sp.y, '#ffffff', 11, 700); label(P.realm.name, _sp.x, _sp.y + 12 * s, P.realm.color, 9); } }
    for (const gt of World.gates) { proj(gt.x, gt.y + 3.6, -0.4, _sp); if (!_sp.ok) continue; const d = MAPS[gt.to], lock = d.minRealm && P.realm.r < d.minRealm;
      label((gt.dir < 0 ? '◀ ' : '') + d.name + (gt.dir > 0 ? ' ▶' : ''), _sp.x, _sp.y, lock ? '#ff8a7a' : '#9fe8ff', 11, 700); if (d.level) label('cấp ' + d.level[0] + '–' + d.level[1], _sp.x, _sp.y + 13 * s, 'rgba(236,228,208,0.7)', 9); }
    // chỉ đường nhiệm vụ: điểm đích ngoài màn → mũi tên ở mép
    const gd = Game.guideCache;
    if (gd && gd.x != null) { proj(gd.x, World.groundAt(gd.x) + 1.5, 0, _sp);
      const off = _sp.x < 30 * s || _sp.x > W - 30 * s;
      if (off) { const x = _sp.x < W / 2 ? 34 * s : W - 34 * s, y = H * 0.48, dir = _sp.x < W / 2 ? -1 : 1;
        g2.fillStyle = 'rgba(233,196,106,0.9)'; g2.beginPath(); g2.moveTo(x + dir * 14 * s, y); g2.lineTo(x - dir * 6 * s, y - 11 * s); g2.lineTo(x - dir * 6 * s, y + 11 * s); g2.fill();
        g2.textAlign = dir < 0 ? 'left' : 'right'; label(gd.hint || '', x + (dir < 0 ? -10 : 10) * s, y + 20 * s, '#e9c46a', 9); g2.textAlign = 'center'; } }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt;
    if (f.t > 1) { floaters.splice(i, 1); continue; }
    proj(f.x, f.y + f.t * 1.3, 0.5, _sp); if (!_sp.ok) continue;
    const pop = f.t < 0.08 ? lerp(1.6, 1, f.t / 0.08) : 1;
    g2.globalAlpha = f.t > 0.65 ? 1 - (f.t - 0.65) / 0.35 : 1;
    label(f.text, _sp.x, _sp.y, f.color, 17 * f.size * pop, 700);
    g2.globalAlpha = 1;
  }
}
