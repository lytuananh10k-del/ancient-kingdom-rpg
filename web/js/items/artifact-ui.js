// Vạn Kiếm Kỳ Trận – Giao diện Kho pháp bảo kiểu TFT (V1.6): dock thu gọn được bên phải, ghép đồ, trang bị, tooltip, bảng 36 công thức.
//   Android: chạm nguyên liệu 1 → chạm nguyên liệu 2 → xem công thức → Ghép; chạm pháp bảo → chạm tướng để trang bị; chạm tướng xem 3 ô.
//   Windows: kéo thả (kho → tướng, nguyên liệu → nguyên liệu, ô → ô), rê chuột xem tooltip + chỉ số thay đổi trước khi trang bị.
// Mọi thay đổi dữ liệu đi qua ArtifactCraftingSystem / ArtifactEquipment (giao dịch nguyên tử) – giao diện chỉ hiển thị.
// Nạp sau js/16-ui.js. Script thường (không phải module).
'use strict';

const ArtifactUI = {
  sel: [],            // instanceId đang chọn (1 pháp bảo / tối đa 1 nguyên liệu chờ ghép)
  pending: null,      // { a, b } đang chờ xác nhận ghép (2 vật phẩm bị giữ chỗ)
  collapsed: false, drag: null, tipFor: null, lpTimer: 0,
  init() {
    this.collapsed = store.get('artDockCollapsed', false);
    $('ad-toggle').addEventListener('click', () => { this.collapsed = !this.collapsed; store.set('artDockCollapsed', this.collapsed); this.render(); if (info.unit) placeUnitInfo(info.unit); });
    $('ad-book').addEventListener('click', () => this.openBook());
    $('btn-book-close').addEventListener('click', () => { $('art-book').hidden = true; });
    $('art-dock').addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('resize', () => this.layout());
    // rê chuột trên bàn khi đang cầm pháp bảo: xem chỉ số thay đổi của tướng dưới con trỏ
    canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons && this.selId() && !this.drag) this.hoverPreview(e.clientX, e.clientY); });
    canvas.addEventListener('pointerleave', () => { if (!this.drag) this.hideTip(); });
    ArtifactEvents.on(ev => { if (ev === 'craft' || ev === 'equip') this.render(); });
  },
  selId() { return this.sel[0] || null; },
  clearSel() { if (this.pending) this.cancelCraft(); this.sel = []; this.hint(''); this.hideTip(); },
  /** Chỗ chừa bên phải cho bảng thông tin tướng (px tính từ mép phải). */
  rightInset() { const d = $('art-dock'); if (d.hidden) return 12; const r = d.getBoundingClientRect(); return Math.max(12, window.innerWidth - r.left + 8); },
  hint(t) { $('ad-hint').textContent = t || ''; },
  /* ---------- kho ---------- */
  render() {
    const dock = $('art-dock'), prep = battle.phase === 'prep' && !game.over;
    dock.hidden = !$('intro').hidden || !!battle.bench || battle.phase === 'fight';
    if (dock.hidden) { this.hideTip(); return; }
    dock.classList.toggle('collapsed', this.collapsed);
    $('ad-toggle').setAttribute('aria-expanded', String(!this.collapsed));
    const inv = ArtifactInventory, n = inv.invCount(true), ov = inv.overflowCount();
    $('ad-count').textContent = n + '/' + INV_CAP + (ov ? ' +' + ov : '');
    $('ad-toggle').title = 'Kho pháp bảo: ' + n + '/' + INV_CAP + ' ô' + (ov ? ', ' + ov + ' ở ô tạm giữ' : '') + ' – chạm để ' + (this.collapsed ? 'mở' : 'thu gọn');
    // bỏ chọn vật phẩm không còn (đã ghép / bán / tải lại)
    this.sel = this.sel.filter(id => inv.get(id));
    if (this.collapsed) { this.layout(); return; }
    const grid = $('ad-grid'); grid.textContent = '';
    const bySlot = new Map(inv.invList().map(r => [r.slot, r])), last = Math.max(INV_CAP - 1, ...[...bySlot.keys()]);
    for (let s = 0; s <= last; s++) {
      const r = bySlot.get(s); if (!r && s >= INV_CAP) continue;
      const b = document.createElement('button');
      b.className = 'aslot' + (r ? ' full ' + (isComponent(r.itemId) ? 'comp' : 'art') : '') + (s >= INV_CAP ? ' over' : '') + (r && this.sel.includes(r.instanceId) ? ' sel' : '') + (r && inv.isLocked(r.instanceId) ? ' lock' : '');
      b.dataset.slot = s;
      if (r) {
        const it = ITEM_DB[r.itemId]; b.dataset.iid = r.instanceId;
        b.style.setProperty('--c', it.color); if (it.color2) b.style.setProperty('--c2', it.color2);
        b.innerHTML = `<span class="g">${it.glyph}</span><span class="n">${it.name}</span>`;
        b.setAttribute('aria-label', it.name + (isComponent(r.itemId) ? ' (nguyên liệu)' : ' (pháp bảo)') + (s >= INV_CAP ? ' – ô tạm giữ' : ''));
      } else b.setAttribute('aria-label', 'Ô trống');
      b.addEventListener('pointerdown', e => this.slotDown(e, b));
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && r && !this.drag) this.showTip(r.itemId, b.getBoundingClientRect(), null); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !this.drag) this.hideTip(); });
      b.addEventListener('contextmenu', e => e.preventDefault());
      grid.appendChild(b);
    }
    if (!prep) this.hint('Chỉ ghép / trang bị ở giai đoạn chuẩn bị');
    else if (!this.sel.length && !this.pending) this.hint(ov ? '⚠ Kho đầy – ' + ov + ' món ở ô tạm giữ, hãy ghép / trang bị' : n ? '' : 'Thắng vòng yêu thú (3, 7, 11…) để nhận nguyên liệu');
    this.layout();
  },
  /** Không đè lên cửa hàng / nút đáy: giới hạn chiều cao theo mép trên của bảng chuẩn bị khi hai bên chồng ngang. */
  layout() {
    const dock = $('art-dock'); if (dock.hidden) return;
    const r = dock.getBoundingClientRect(), H = window.innerHeight;
    let floor = H - 8;
    for (const el of [$('prep-panel'), $('next-dock')]) { if (!el || el.hidden) continue; const q = el.getBoundingClientRect(); if (q.width && q.right > r.left && q.left < r.right) floor = Math.min(floor, q.top - 8); }
    dock.style.maxHeight = Math.max(80, floor - r.top) + 'px';
    $('ad-grid').style.maxHeight = Math.max(44, floor - r.top - 40 - ($('ad-hint').offsetHeight || 0)) + 'px';
  },
  /* ---------- chạm / kéo một ô kho ---------- */
  slotDown(e, btn) {
    e.preventDefault(); e.stopPropagation();
    const iid = btn.dataset.iid || null, slot = +btn.dataset.slot;
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    const d = this.drag = { iid, slot, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, touch: e.pointerType !== 'mouse', long: false, btn };
    clearTimeout(this.lpTimer);
    if (iid && d.touch) this.lpTimer = setTimeout(() => { if (this.drag === d && !d.moved) { d.long = true; this.showTip(ArtifactInventory.get(iid).itemId, btn.getBoundingClientRect(), null); haptic(8); } }, 450);
    const move = ev => {
      if (ev.pointerId !== d.id) return;
      if (!d.moved && iid && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 10) {
        d.moved = true; clearTimeout(this.lpTimer); this.hideTip();
        d.ghost = btn.cloneNode(true); d.ghost.classList.add('art-ghost', 'sel'); document.body.appendChild(d.ghost); haptic(8);
      }
      if (!d.moved) return;
      d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = ev.clientY + 'px';
      this.dragOver(ev.clientX, ev.clientY);
    };
    const up = ev => {
      if (ev.pointerId !== d.id) return;
      btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerup', up); btn.removeEventListener('pointercancel', up);
      clearTimeout(this.lpTimer); this.drag = null; if (d.ghost) d.ghost.remove();
      document.querySelectorAll('.aslot.drop').forEach(x => x.classList.remove('drop'));
      if (ev.type === 'pointercancel') { this.hideTip(); return; }
      lastPointerTouch = d.touch;
      if (!d.moved) { if (d.long) { setTimeout(() => this.hideTip(), 1800); return; } this.tap(iid, slot); return; }
      this.hideTip();
      this.drop(iid, ev.clientX, ev.clientY);
    };
    btn.addEventListener('pointermove', move); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
  },
  /** Chạm ô kho. */
  tap(iid, slot) {
    if (this.pending) this.cancelCraft();
    if (!iid) { if (this.selId() && ArtifactInventory.get(this.selId()) && ArtifactInventory.get(this.selId()).loc === 'inv') this.moveToSlot(this.selId(), slot); else this.clearSel(); this.render(); return; }
    const inv = ArtifactInventory, r = inv.get(iid); if (!r) return;
    if (inv.isLocked(iid)) { ui.toast('Vật phẩm đang chờ xác nhận ghép'); return; }
    const cur = this.selId() && inv.get(this.selId());
    if (cur && cur.instanceId === iid) { this.clearSel(); this.render(); return; }
    if (isComponent(r.itemId) && cur && cur.loc === 'inv' && isComponent(cur.itemId)) { this.openCraft(cur.instanceId, iid); return; }
    this.sel = [iid];
    if (isComponent(r.itemId)) {
      const opts = ArtifactCraftingSystem.optionsFor(r.itemId).filter(o => o.have - (o.with === r.itemId ? 1 : 0) > 0);
      this.hint('Chọn nguyên liệu thứ 2 để ghép' + (opts.length ? ': ' + opts.map(o => ARTIFACTS[o.result].name).join(', ') : ' (chưa có nguyên liệu ghép được)'));
      this.showTip(r.itemId, this.slotRect(iid), null, true);
    } else { this.hint('Chạm (hoặc kéo lên) tướng phe ta để trang bị ' + ITEM_DB[r.itemId].name); this.showTip(r.itemId, this.slotRect(iid), null); }
    this.render();
    if (info.unit) renderUnitInfo();
  },
  slotRect(iid) { const b = document.querySelector(`.aslot[data-iid="${iid}"]`); return b ? b.getBoundingClientRect() : $('art-dock').getBoundingClientRect(); },
  moveToSlot(iid, slot) { const r = ArtifactInventory.moveSlot(iid, slot); if (!r.ok) ui.toast(r.reason); else { this.clearSel(); saveGame(); } },
  /** Kéo qua: ô kho (đích ghép / đổi chỗ) hoặc tướng trên bàn / hàng chờ (xem trước chỉ số). */
  dragOver(x, y) {
    document.querySelectorAll('.aslot.drop').forEach(b => b.classList.remove('drop'));
    const el = document.elementFromPoint(x, y), slot = el && el.closest && el.closest('.aslot');
    if (slot) { slot.classList.add('drop'); this.hideTip(); return; }
    this.hoverPreview(x, y, this.drag.iid);
  },
  drop(iid, x, y) {
    const el = document.elementFromPoint(x, y), slot = el && el.closest && el.closest('.aslot');
    const r = ArtifactInventory.get(iid); if (!r) return;
    if (slot) {
      const other = slot.dataset.iid;
      if (other && other !== iid && isComponent(r.itemId) && isComponent(ArtifactInventory.get(other).itemId)) { this.openCraft(iid, other); return; }
      if (!other || other !== iid) { if (!other || ArtifactInventory.get(other).loc === 'inv') this.moveToSlot(iid, +slot.dataset.slot); }
      this.render(); return;
    }
    if (el === canvas) {
      const pk = screenPick(x, y, true);
      if (pk) { this.sel = [iid]; this.applyToPick(pk); return; }
    }
    ui.toast(isArtifact(r.itemId) ? 'Thả pháp bảo lên một tướng phe ta để trang bị' : 'Thả nguyên liệu lên nguyên liệu khác để ghép');
  },
  /** Chạm / thả lên tướng khi đang cầm vật phẩm. */
  applyToPick(pk) {
    const iid = this.selId(), r = iid && ArtifactInventory.get(iid);
    if (!r) { this.clearSel(); return; }
    if (pk.type === 'enemy') { ui.toast('Không thể trang bị cho tướng đối thủ'); return; }
    if (!isArtifact(r.itemId)) { ui.toast('Chỉ trang bị được pháp bảo hoàn chỉnh – ghép 2 nguyên liệu trước'); return; }
    const res = equipArtifact(iid, pk.type === 'board' ? { type: 'board', unit: pk.unit } : { type: 'bench', i: pk.i });
    if (res.ok) { this.clearSel(); this.render(); const u = pk.unit; if (u) showUnitInfo(u); }
  },
  /* ---------- ghép ---------- */
  openCraft(a, b) {
    const p = ArtifactCraftingSystem.preview(a, b);
    if (!p.ok) { ui.toast(p.reason); return; }
    if (battle.phase !== 'prep') { ui.toast('Chỉ ghép ở giai đoạn chuẩn bị'); return; }
    if (ArtifactInventory.isLocked(a) || ArtifactInventory.isLocked(b)) { ui.toast('Vật phẩm đang chờ xác nhận ghép'); return; }
    ArtifactInventory.lock([a, b]); this.pending = { a, b }; this.sel = [a, b]; this.hideTip();
    const A = ARTIFACTS[p.result], box = $('art-craft');
    box.innerHTML = `<h4 style="color:${A.color}">${A.name}</h4><div class="eq">${COMPONENTS[p.a.itemId].name} + ${COMPONENTS[p.b.itemId].name} → 1 pháp bảo (tiêu hao 2 nguyên liệu)</div>` +
      `<div class="ps">${statText(A.stats)}</div><div class="ps">Nội tại: ${A.passiveText}</div><div class="eq">Kích hoạt: ${A.trigger} · Giới hạn: ${A.limit}</div>` +
      `<div class="row"><button class="no" id="ac-no">Huỷ</button><button class="ok" id="ac-ok">Ghép</button></div>`;
    box.hidden = false;
    const dr = $('art-dock').getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    box.style.left = Math.max(8, Math.min(W - box.offsetWidth - 8, dr.left - box.offsetWidth - 8)) + 'px';
    box.style.top = Math.max(8, Math.min(H - box.offsetHeight - 8, dr.top)) + 'px';
    $('ac-ok').addEventListener('click', () => this.confirmCraft(), { once: true });
    $('ac-no').addEventListener('click', () => { this.cancelCraft(); this.render(); }, { once: true });
    this.hint('Xác nhận ghép ' + A.name);
    this.render();
  },
  confirmCraft() {
    const p = this.pending; if (!p) return;
    const res = ArtifactCraftingSystem.craft(p.a, p.b, [p.a, p.b]);   // giao dịch được dùng 2 vật phẩm chính nó giữ chỗ
    ArtifactInventory.unlock([p.a, p.b]); this.pending = null; $('art-craft').hidden = true;
    if (!res.ok) { ui.toast('Không ghép được: ' + res.reason); this.sel = []; this.render(); return; }
    const A = ITEM_DB[res.value.itemId];
    ui.toast('Ghép thành công: ' + A.name); Sfx.chime();
    this.sel = [res.value.instanceId]; this.hint('Chạm (hoặc kéo lên) tướng phe ta để trang bị ' + A.name);
    saveGame(); this.render();
    const b = document.querySelector(`.aslot[data-iid="${res.value.instanceId}"]`);
    if (b && b.animate) b.animate([{ transform: 'scale(1.35)', filter: 'brightness(2)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 380, easing: 'ease-out' });
  },
  cancelCraft() { const p = this.pending; if (!p) return; ArtifactInventory.unlock([p.a, p.b]); this.pending = null; $('art-craft').hidden = true; this.sel = []; this.hint(''); },
  /* ---------- tooltip & xem trước chỉ số ---------- */
  showTip(itemId, rect, extra, recipes) {
    const it = ITEM_DB[itemId]; if (!it || this.pending) return;
    const tip = $('art-tip'); tip.style.setProperty('--c', it.color);
    let html = `<b>${it.name}</b>` + (isComponent(itemId) ? ' · nguyên liệu' : ' · pháp bảo') + '\n' + itemTooltip(itemId).split('\n').slice(1).join('\n');
    if (recipes) html += '\nGhép với: ' + ArtifactCraftingSystem.optionsFor(itemId).map(o => `${COMPONENTS[o.with].glyph}→${ARTIFACTS[o.result].name}${o.have - (o.with === itemId ? 1 : 0) > 0 ? ' ✓' : ''}`).join(' · ');
    if (extra) html += '\n' + extra;
    tip.innerHTML = html; tip.hidden = false;
    const W = window.innerWidth, H = window.innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = rect.left - tw - 8; if (x < 8) x = Math.min(W - tw - 8, rect.right + 8);
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, Math.min(H - th - 8, rect.top)) + 'px';
  },
  hideTip() { $('art-tip').hidden = true; },
  /** Tướng dưới (x, y) + vật phẩm iid → tooltip chỉ số trước / sau khi trang bị. */
  hoverPreview(x, y, iid = this.selId()) {
    const r = iid && ArtifactInventory.get(iid); if (!r) return this.hideTip();
    const pk = screenPick(x, y, true);
    if (!pk) return this.hideTip();
    const rect = { left: x + 14, right: x + 14, top: y - 10 };
    if (pk.type === 'enemy') return this.showTip(r.itemId, rect, '<span class="x">Không trang bị cho tướng đối thủ</span>');
    if (!isArtifact(r.itemId)) return this.showTip(r.itemId, rect, '<span class="x">Nguyên liệu – ghép thành pháp bảo trước</span>');
    this.showTip(r.itemId, rect, this.deltaText(pk, r));
  },
  /** Chỉ số thay đổi nếu trang bị r cho tướng pk (tính bằng đúng công thức trận, không đổi gì). */
  deltaText(pk, r) {
    const cid = pk.type === 'board' ? pk.unit.cid : ensureCid(game.bench[pk.i]), u = pk.unit;
    if (!cid || !u) return '';
    const have = ArtifactInventory.itemIdsOf(cid);
    if (r.loc === 'unit' && r.ownerId === cid) return 'Tướng này đang mang';
    if (have.length >= MAX_EQUIP) return '<span class="x">' + ownerName(cid) + ' đã đủ ' + MAX_EQUIP + ' pháp bảo</span>';
    const d = this.preview(u, pk.type === 'bench', have, have.concat([r.itemId]));
    return `<span class="d">${ownerName(cid)}: ${d || 'không đổi chỉ số (nội tại trong trận)'}</span>`;
  },
  preview(u, onBench, before, after) {
    const active = onBench ? {} : TraitEngine.active;
    const calc = ids => { const p = Object.create(u); Object.defineProperty(p, 'items', { value: ids }); return Unit.computeStats(u.def, u.star, TraitEngine.computeBonus(p, active)); };
    const a = calc(before), b = calc(after), out = [];
    const F = [['maxHp', 'Máu', v => Math.round(v)], ['atk', 'Công', v => Math.round(v)], ['ap', 'Phép', v => Math.round(v)], ['def', 'Giáp', v => Math.round(v)], ['mr', 'Kháng phép', v => Math.round(v)],
      ['aspd', 'Tốc đánh', v => v.toFixed(2)], ['crit', 'Chí mạng', v => Math.round(v * 100) + '%'], ['critDmg', 'ST chí mạng', v => '×' + v.toFixed(2)], ['mana0', 'Năng lượng đầu', v => Math.round(v)]];
    for (const [k, n, f] of F) if (Math.abs(a[k] - b[k]) > 1e-6) out.push(`${n} ${f(a[k])}→${f(b[k])}`);
    const bs = TraitEngine.computeBonus(Object.defineProperty(Object.create(u), 'items', { value: after }), active), b0 = TraitEngine.computeBonus(Object.defineProperty(Object.create(u), 'items', { value: before }), active);
    if (bs.ls - b0.ls > 1e-6) out.push('Hút máu +' + Math.round((bs.ls - b0.ls) * 100) + '%');
    if (bs.omni - b0.omni > 1e-6) out.push('Hút máu toàn phần +' + Math.round((bs.omni - b0.omni) * 100) + '%');
    if (bs.skillDmg - b0.skillDmg > 1e-6) out.push('ST kỹ năng +' + Math.round((bs.skillDmg - b0.skillDmg) * 100) + '%');
    return out.join(' · ');
  },
  /* ---------- 3 ô pháp bảo trong bảng thông tin tướng ---------- */
  renderUnitSlots(u, enemy, onBench) {
    const box = $('ui-items');
    if (!u) { box.textContent = ''; this._slotSig = ''; return; }
    const recs = u.cid ? ArtifactInventory.ofOwner(u.cid) : (u.items || []).map((id, i) => ({ itemId: id, slot: i, instanceId: null }));
    const bySlot = new Map(recs.map(r => [r.slot, r])), canEdit = !enemy && battle.phase === 'prep' && !game.over;
    // bảng thông tin tự làm mới định kỳ: chỉ dựng lại khi nội dung đổi (không làm mất cú chạm đang dở)
    const sig = [u.id, canEdit, this.sel.join(), ArtifactInventory.ver, JSON.stringify(u.artStats || null)].join('|');
    if (sig === this._slotSig && box.childElementCount) return;
    this._slotSig = sig; box.textContent = '';
    for (let s = 0; s < MAX_EQUIP; s++) {
      const r = bySlot.get(s), b = document.createElement('button');
      b.className = 'eqs' + (r ? ' full' : '') + (r && r.instanceId && this.sel.includes(r.instanceId) ? ' sel' : '');
      if (r) {
        const it = ITEM_DB[r.itemId], st = u.artStats && u.artStats[recs.indexOf(r)];
        b.style.setProperty('--c', it.color);
        b.innerHTML = `${it.name}` + (st && (st.procs || st.dmg || st.heal || st.shield || st.mana) ? `<small>${[st.procs ? st.procs + ' lần' : '', st.dmg ? 'ST ' + Math.round(st.dmg) : '', st.heal ? 'hồi ' + Math.round(st.heal) : '', st.shield ? 'khiên ' + Math.round(st.shield) : '', st.mana ? '+' + Math.round(st.mana) + ' NL' : ''].filter(Boolean).join(' · ')}</small>` : `<small>${it.trigger}</small>`) +
          (canEdit && r.instanceId ? `<span class="un" role="button" aria-label="Tháo ${it.name} về kho" title="Tháo về kho">↩</span>` : '');
        b.title = itemTooltip(r.itemId);
        b.setAttribute('aria-label', it.name + ' – ' + it.passiveText);
        b.addEventListener('click', ev => {
          if (!canEdit || !r.instanceId) { this.showTip(r.itemId, b.getBoundingClientRect(), null); setTimeout(() => this.hideTip(), 2200); return; }
          if (ev.target.classList.contains('un')) { unequipArtifact(r.instanceId); this.clearSel(); renderUnitInfo(); this.render(); return; }
          if (this.sel.includes(r.instanceId)) this.clearSel(); else { this.sel = [r.instanceId]; this.hint('Chạm tướng khác để chuyển ' + it.name + ' (hoặc ↩ để tháo về kho)'); }
          renderUnitInfo(); this.render();
        });
      } else {
        b.innerHTML = enemy ? '—' : 'Ô trống<small>' + (canEdit ? 'chạm pháp bảo rồi chạm tướng' : '') + '</small>';
        b.disabled = enemy;
        if (canEdit && this.selId()) b.addEventListener('click', () => this.applyToPick(onBench ? { type: 'bench', i: benchUnits.indexOf(u), unit: u } : { type: 'board', unit: u }));
      }
      box.appendChild(b);
    }
    // xem trước khi đang cầm pháp bảo
    const cur = this.selId() && ArtifactInventory.get(this.selId());
    if (canEdit && cur && isArtifact(cur.itemId) && !(cur.loc === 'unit' && cur.ownerId === u.cid)) {
      const pk = onBench ? { type: 'bench', i: benchUnits.indexOf(u), unit: u } : { type: 'board', unit: u };
      const p = document.createElement('div'); p.className = 'ui-art-preview'; p.innerHTML = 'Nếu trang bị ' + ITEM_DB[cur.itemId].name + ': ' + this.deltaText(pk, cur).replace(/<[^>]+>/g, '');
      box.appendChild(p);
    }
  },
  /* ---------- bảng 36 công thức ---------- */
  openBook() {
    const t = $('book-table'), K = COMPONENT_KEYS;
    let h = '<table><tr><th></th>' + K.map(k => `<th style="color:${COMPONENTS[k].color}" title="${COMPONENTS[k].name}">${COMPONENTS[k].glyph}</th>`).join('') + '</tr>';
    for (let i = 0; i < 8; i++) {
      h += `<tr><th style="color:${COMPONENTS[K[i]].color}" title="${COMPONENTS[K[i]].name}">${COMPONENTS[K[i]].glyph}</th>`;
      for (let j = 0; j < 8; j++) { const id = recipeOf(K[i], K[j]), A = ARTIFACTS[id]; h += `<td class="${i === j ? 'diag' : ''}"><button data-art="${id}" style="--c:${A.color}">${A.name}</button></td>`; }
      h += '</tr>';
    }
    t.innerHTML = h + '</table>';
    t.querySelectorAll('button[data-art]').forEach(b => b.addEventListener('click', () => { const A = ARTIFACTS[b.dataset.art]; $('book-detail').textContent = `#${A.no} ` + itemTooltip(A.id) + '\nNối tiếp sự kiện: ' + A.chain; }));
    $('book-detail').textContent = 'Hàng = nguyên liệu thứ nhất, cột = nguyên liệu thứ hai (A + B = B + A). ' + Object.values(COMPONENTS).map(c => `${c.glyph} ${c.name}: ${statText(c.stats)}`).join(' · ');
    $('art-book').hidden = false;
  }
};
ArtifactUI.init();
