// Vạn Kiếm Kỳ Trận – Hệ thống Pháp bảo V1.6 (Equipment & Artifact System V2.0):
//   ArtifactInventory (sổ vật phẩm DUY NHẤT: mỗi vật phẩm một instanceId, một vị trí), giao dịch nguyên tử,
//   ArtifactCraftingSystem (ghép 2 nguyên liệu), ArtifactEquipment (3 ô / tướng, chuyển, tháo, bán, nâng sao), ArtifactRewards (PvE),
//   ArtifactStats (lớp chỉ số trang bị). Dữ liệu ở js/data/artifacts.js. Nạp sau js/combat/traits-engine.js, trước js/14-game.js.
//
// Mô hình dữ liệu: bản ghi { instanceId, itemId, loc: 'inv' | 'unit', ownerId, slot }
//   itemId     – loại vật phẩm (nguyên liệu / pháp bảo) · instanceId – vật phẩm cụ thể (không bao giờ dùng lại số)
//   ownerId    – mã bản sao tướng (cid) khi loc = 'unit' · slot – ô trong kho (0–9 thường, 10+ ô tạm giữ) hoặc ô trang bị (0–2)
// Tướng KHÔNG giữ bản sao danh sách đồ: Unit.items đọc thẳng từ sổ theo cid → một vật phẩm không thể ở hai nơi.
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục.
'use strict';

const INV_CAP = 10;          // ô kho thường
const OVERFLOW_CAP = 30;     // ô tạm giữ (đồ trả về khi kho đầy – bán tướng, nâng sao, phần thưởng): không mất đồ, xử lý sau
const MAX_EQUIP = 3;         // ô pháp bảo mỗi tướng

/* ---------- Mã bản sao tướng (cid): đi theo tướng khi chuyển hàng chờ ↔ bàn, giữ qua lưu / tải ---------- */
let cidSeq = 0;
const newCid = () => 'c' + (++cidSeq);
/** Gán cid cho mục hàng chờ / dữ liệu tướng chưa có (bản lưu cũ, bài kiểm thử ghi thẳng game.bench). */
function ensureCid(e) { if (e && !e.cid) e.cid = newCid(); return e ? e.cid : null; }
/** Tập cid đang có trong đội (bàn + hàng chờ). */
function rosterCids() {
  const s = new Set();
  for (const u of units) if (u.team === 'ally' && u.cid) s.add(u.cid);
  for (const e of game.bench) if (e) s.add(ensureCid(e));
  return s;
}
/** Tìm nơi đang giữ bản sao tướng cid: { type: 'board', unit } | { type: 'bench', i, entry } | null. */
function findOwner(cid) {
  const u = units.find(x => x.team === 'ally' && x.cid === cid); if (u) return { type: 'board', unit: u };
  const i = game.bench.findIndex(e => e && e.cid === cid); return i >= 0 ? { type: 'bench', i, entry: game.bench[i] } : null;
}
const ownerName = cid => { const o = findOwner(cid); const key = o ? (o.type === 'board' ? o.unit.key : o.entry.key) : null; return key ? (UNIT_DEFS[key].short || UNIT_DEFS[key].name) : '?'; };

/* =====================================================================
 *  ArtifactInventory – sổ vật phẩm + giao dịch nguyên tử
 * ===================================================================*/
const ArtifactInventory = {
  recs: new Map(), nextId: 1, ver: 0, locks: new Set(), busy: false, _own: null, _ownVer: -1, stats: { tx: 0, ok: 0, fail: 0 },
  reset() { this.recs.clear(); this.nextId = 1; this.locks.clear(); this.busy = false; this.ver++; },
  get(iid) { return this.recs.get(iid) || null; },
  all() { return [...this.recs.values()]; },
  /** Vật phẩm trong kho (cả ô tạm giữ), theo thứ tự ô. */
  invList() { return this.all().filter(r => r.loc === 'inv').sort((a, b) => a.slot - b.slot); },
  invCount(regularOnly) { let n = 0; for (const r of this.recs.values()) if (r.loc === 'inv' && (!regularOnly || r.slot < INV_CAP)) n++; return n; },
  overflowCount() { let n = 0; for (const r of this.recs.values()) if (r.loc === 'inv' && r.slot >= INV_CAP) n++; return n; },
  /** Vật phẩm của một tướng, theo ô 0–2 (mảng dùng chung – KHÔNG sửa). */
  ofOwner(cid) { this._index(); return this._own.get(cid) || EMPTY_ITEMS; },
  /** itemId của một tướng theo ô (Unit.items) – lưu đệm theo phiên bản sổ, không cấp phát mỗi khung. */
  itemIdsOf(cid) { this._index(); return this._ownIds.get(cid) || EMPTY_ITEMS; },
  _index() {
    if (this._ownVer === this.ver && this._own) return;
    const own = new Map(), ids = new Map();
    for (const r of this.recs.values()) if (r.loc === 'unit') { if (!own.has(r.ownerId)) own.set(r.ownerId, []); own.get(r.ownerId).push(r); }
    for (const [k, l] of own) { l.sort((a, b) => a.slot - b.slot); ids.set(k, l.map(r => r.itemId)); }
    this._own = own; this._ownIds = ids; this._ownVer = this.ver;
  },
  count(itemId) { let n = 0; for (const r of this.recs.values()) if (r.itemId === itemId) n++; return n; },
  findInInv(itemId) { return this.invList().filter(r => r.itemId === itemId); },
  /** Ô kho trống nhỏ nhất (thường trước; allowOverflow → cả ô tạm giữ). -1 nếu hết. */
  freeInvSlot(allowOverflow) {
    const used = new Set(); for (const r of this.recs.values()) if (r.loc === 'inv') used.add(r.slot);
    const lim = INV_CAP + (allowOverflow ? OVERFLOW_CAP : 0);
    for (let s = 0; s < lim; s++) if (!used.has(s)) return s;
    return -1;
  },
  freeOwnerSlot(cid) { const used = new Set(this.ofOwner(cid).map(r => r.slot)); for (let s = 0; s < MAX_EQUIP; s++) if (!used.has(s)) return s; return -1; },
  isLocked(iid) { return this.locks.has(iid); },
  /** Giữ chỗ (đang chờ người chơi xác nhận ghép) – mọi giao dịch khác trên các vật phẩm này bị từ chối. */
  lock(ids) { ids.forEach(i => this.locks.add(i)); this.ver++; },
  unlock(ids) { ids.forEach(i => this.locks.delete(i)); this.ver++; },

  /* ----- thao tác nội bộ: CHỈ gọi bên trong tx() ----- */
  _create(itemId, loc, ownerId, slot) {
    if (!this.busy) throw new Error('tạo vật phẩm ngoài giao dịch');
    if (!ITEM_DB[itemId]) throw new Error('vật phẩm lạ ' + itemId);
    const r = { instanceId: 'it' + (this.nextId++), itemId, loc, ownerId: loc === 'unit' ? ownerId : null, slot };
    this.recs.set(r.instanceId, r); this._ownVer = -1; return r;
  },
  _delete(iid) { if (!this.busy) throw new Error('xoá vật phẩm ngoài giao dịch'); if (!this.recs.delete(iid)) throw new Error('không có ' + iid); this._ownVer = -1; },
  _place(r, loc, ownerId, slot) { if (!this.busy) throw new Error('chuyển vật phẩm ngoài giao dịch'); r.loc = loc; r.ownerId = loc === 'unit' ? ownerId : null; r.slot = slot; this._ownVer = -1; },
  /** Đưa về kho: ô thường trống trước, hết thì ô tạm giữ. Ném lỗi nếu hết cả hai. */
  _toInv(r, allowOverflow = true) { const s = this.freeInvSlot(allowOverflow); if (s < 0) throw new UserError('Kho và ô tạm giữ đã đầy'); this._place(r, 'inv', null, s); },

  /** Giao dịch nguyên tử: fn chạy trên sổ; ném lỗi / trả false → khôi phục NGUYÊN TRẠNG. ids: vật phẩm tham gia (bị từ chối nếu đang giữ chỗ;
   *  own = các vật phẩm do chính giao dịch này giữ chỗ). Không cho lồng giao dịch (thao tác dồn dập / sự kiện chồng nhau). Trả về { ok, reason, value }. */
  tx(label, ids, fn, own) {
    this.stats.tx++;
    if (this.busy) { this.stats.fail++; return { ok: false, reason: 'Đang xử lý thao tác khác – thử lại' }; }
    for (const i of ids || []) if (this.locks.has(i) && !(own && own.includes(i))) { this.stats.fail++; return { ok: false, reason: 'Vật phẩm đang chờ xác nhận ghép' }; }
    const backup = new Map([...this.recs].map(([k, r]) => [k, Object.assign({}, r)])), nextId = this.nextId;
    this.busy = true;
    try {
      const value = fn();
      if (value === false) throw new UserError('Thao tác không hợp lệ');
      const bad = this.check();
      if (bad.length) throw new Error('vi phạm toàn vẹn: ' + bad[0]);
      this.ver++; this.stats.ok++;
      return { ok: true, value };
    } catch (e) {
      this.recs = backup; this.nextId = nextId; this.ver++; this.stats.fail++;
      if (!(e instanceof UserError)) console.error('[Pháp bảo] ' + label + ' – hoàn tác', e);
      return { ok: false, reason: e.message };
    } finally { this.busy = false; }
  },
  /** Bất biến của sổ (không cần đội hình): id duy nhất, loại hợp lệ, mỗi ô kho / ô trang bị một vật phẩm, tối đa 3 món, chỉ pháp bảo mới được trang bị. */
  check() {
    const bad = [], inv = new Set(), own = new Map();
    for (const [k, r] of this.recs) {
      if (k !== r.instanceId) bad.push('khoá lệch ' + k);
      if (!ITEM_DB[r.itemId]) bad.push('loại lạ ' + r.itemId);
      if (r.loc === 'inv') { if (!(r.slot >= 0 && r.slot < INV_CAP + OVERFLOW_CAP) || inv.has(r.slot)) bad.push('ô kho trùng / sai ' + r.slot); inv.add(r.slot); }
      else if (r.loc === 'unit') {
        if (!r.ownerId) bad.push('trang bị không có chủ ' + k);
        if (!isArtifact(r.itemId)) bad.push('nguyên liệu không được trang bị ' + r.itemId);
        const o = own.get(r.ownerId) || new Set(); if (!(r.slot >= 0 && r.slot < MAX_EQUIP) || o.has(r.slot)) bad.push('ô trang bị trùng / sai ' + r.ownerId + ':' + r.slot); o.add(r.slot); own.set(r.ownerId, o);
      } else bad.push('vị trí lạ ' + r.loc);
    }
    return bad;
  },
  /** Kiểm tra với đội hình thật: mọi chủ sở hữu đang tồn tại (dùng cho kiểm thử / sau khi tải). */
  audit(roster = rosterCids()) {
    const bad = this.check();
    for (const r of this.recs.values()) if (r.loc === 'unit' && !roster.has(r.ownerId)) bad.push('chủ không tồn tại ' + r.ownerId + ' (' + r.instanceId + ')');
    return bad;
  },
  /** Thêm vật phẩm mới vào kho (phần thưởng / thử nghiệm). allowOverflow: được vào ô tạm giữ khi kho đầy. */
  add(itemId, allowOverflow = true) { return this.tx('add', [], () => { const s = this.freeInvSlot(allowOverflow); if (s < 0) throw new UserError('Kho đầy'); return this._create(itemId, 'inv', null, s); }); },
  remove(iid) { return this.tx('remove', [iid], () => { this._delete(iid); return true; }); },
  /** Đổi chỗ / chuyển trong kho (kéo thả sắp xếp). */
  moveSlot(iid, slot) {
    return this.tx('moveSlot', [iid], () => {
      const r = this.get(iid); if (!r || r.loc !== 'inv') throw new UserError('Vật phẩm không ở trong kho');
      if (!(slot >= 0 && slot < INV_CAP)) throw new UserError('Ô không hợp lệ');
      const other = this.invList().find(x => x.slot === slot && x !== r);
      const from = r.slot; this._place(r, 'inv', null, slot); if (other) this._place(other, 'inv', null, from);
      return true;
    });
  },
  serialize() { return { v: 1, nextId: this.nextId, items: this.invList().concat(this.all().filter(r => r.loc === 'unit')).map(r => [r.instanceId, r.itemId, r.loc === 'inv' ? 'i' : 'u', r.ownerId, r.slot]) }; },
  /** Nạp từ bản lưu, LÀM SẠCH: bỏ loại lạ / id trùng; chủ không còn, ô trùng, quá 3 món, nguyên liệu đang "trang bị" → về kho (tạm giữ nếu cần).
   *  Không bao giờ bỏ một vật phẩm hợp lệ. Trả về báo cáo { loaded, dropped, moved }. */
  load(data, roster) {
    this.reset();
    const rep = { loaded: 0, dropped: 0, moved: 0 };
    if (!data || !Array.isArray(data.items)) return rep;
    const seen = new Set(), later = [];
    let maxNum = 0;
    this.busy = true;
    try {
      for (const row of data.items) {
        if (!Array.isArray(row)) { rep.dropped++; continue; }
        const [iid, itemId, l, owner, slot] = row;
        if (typeof iid !== 'string' || seen.has(iid) || !ITEM_DB[itemId]) { rep.dropped++; continue; }
        seen.add(iid); const num = +String(iid).replace(/\D/g, ''); if (num > maxNum) maxNum = num;
        const r = { instanceId: iid, itemId, loc: 'inv', ownerId: null, slot: -1 };
        this.recs.set(iid, r);
        const okUnit = l === 'u' && typeof owner === 'string' && roster.has(owner) && isArtifact(itemId) && slot >= 0 && slot < MAX_EQUIP &&
          !this.ofOwner(owner).some(x => x.slot === slot) && this.ofOwner(owner).length < MAX_EQUIP;
        if (okUnit) { this._place(r, 'unit', owner, slot); rep.loaded++; continue; }
        if (l === 'i' && slot >= 0 && slot < INV_CAP + OVERFLOW_CAP && !this.invList().some(x => x.slot === slot && x !== r)) { this._place(r, 'inv', null, slot); rep.loaded++; continue; }
        later.push(r); if (l === 'u') rep.moved++;
      }
      for (const r of later) { const s = this.freeInvSlot(true); if (s < 0) { this.recs.delete(r.instanceId); rep.dropped++; continue; } this._place(r, 'inv', null, s); rep.loaded++; }
      this.nextId = Math.max(+data.nextId || 1, maxNum + 1);
    } finally { this.busy = false; this.ver++; }
    return rep;
  }
};
const EMPTY_ITEMS = Object.freeze([]);
/** Lỗi do thao tác người chơi (hiện thông báo, không ghi console.error). */
class UserError extends Error {}

/* =====================================================================
 *  ArtifactCraftingSystem – ghép 2 nguyên liệu thành 1 pháp bảo
 * ===================================================================*/
const ArtifactCraftingSystem = {
  /** Kiểm tra mà KHÔNG đổi gì: { ok, reason, result (itemId), a, b }. */
  preview(iidA, iidB) {
    const inv = ArtifactInventory, a = inv.get(iidA), b = inv.get(iidB);
    if (!a || !b) return { ok: false, reason: 'Nguyên liệu không còn tồn tại' };
    if (iidA === iidB) return { ok: false, reason: 'Cần hai nguyên liệu khác nhau (cùng loại thì phải là 2 vật phẩm riêng)' };
    if (a.loc !== 'inv' || b.loc !== 'inv') return { ok: false, reason: 'Chỉ ghép được nguyên liệu đang ở trong kho' };
    if (!isComponent(a.itemId) || !isComponent(b.itemId)) return { ok: false, reason: 'Chỉ ghép được 2 nguyên liệu (pháp bảo hoàn chỉnh không ghép tiếp)' };
    const result = recipeOf(a.itemId, b.itemId);
    if (!result) return { ok: false, reason: 'Không có công thức' };
    return { ok: true, result, a, b };
  },
  /** Ghép (nguyên tử): tiêu thụ đúng 2 nguyên liệu, tạo đúng 1 pháp bảo ở ô của nguyên liệu thứ nhất. Thất bại → không đổi gì. */
  craft(iidA, iidB, own) {
    if (battle.phase === 'fight') return { ok: false, reason: 'Không ghép trong lúc giao chiến' };
    const res = ArtifactInventory.tx('craft', [iidA, iidB], () => {
      const p = this.preview(iidA, iidB); if (!p.ok) throw new UserError(p.reason);
      const slot = Math.min(p.a.slot, p.b.slot), keepSlot = slot < INV_CAP ? slot : Math.max(p.a.slot, p.b.slot);
      ArtifactInventory._delete(iidA); ArtifactInventory._delete(iidB);
      return ArtifactInventory._create(p.result, 'inv', null, keepSlot);   // 2 → 1: sức chứa luôn đủ (ô cũ được giải phóng trước)
    }, own);
    if (res.ok) { combatLog.crafts = (combatLog.crafts || 0) + 1; ArtifactEvents.emit('craft', res.value); }
    return res;
  },
  /** Các pháp bảo ghép được từ nguyên liệu `comp` với từng loại trong kho (để xem trước). */
  optionsFor(comp) { return COMPONENT_KEYS.map(k => ({ with: k, result: recipeOf(comp, k), have: ArtifactInventory.findInInv(k).length })); }
};

/* =====================================================================
 *  ArtifactEquipment – trang bị cho tướng (3 ô), chuyển, tháo, bán, nâng sao
 * ===================================================================*/
const ArtifactEquipment = {
  /** Chỉ được đổi đồ ở giai đoạn chuẩn bị (không trong giao tranh tiêu chuẩn). */
  canEdit() { return battle.phase === 'prep' && !game.over; },
  /** Trang bị (hoặc chuyển từ tướng khác) vật phẩm iid cho tướng cid. */
  equip(iid, cid) {
    if (!this.canEdit()) return { ok: false, reason: 'Chỉ trang bị được ở giai đoạn chuẩn bị' };
    const res = ArtifactInventory.tx('equip', [iid], () => {
      const r = ArtifactInventory.get(iid);
      if (!r) throw new UserError('Vật phẩm không tồn tại');
      if (!isArtifact(r.itemId)) throw new UserError('Chỉ trang bị được pháp bảo hoàn chỉnh – ghép 2 nguyên liệu trước');
      if (!cid || !findOwner(cid)) throw new UserError('Chỉ trang bị cho tướng phe ta');
      if (r.loc === 'unit' && r.ownerId === cid) throw new UserError('Tướng này đang mang vật phẩm đó');
      const s = ArtifactInventory.freeOwnerSlot(cid); if (s < 0) throw new UserError('Mỗi tướng mang tối đa ' + MAX_EQUIP + ' pháp bảo');
      const from = r.loc === 'unit' ? r.ownerId : null;
      ArtifactInventory._place(r, 'unit', cid, s);
      return { rec: r, from };
    });
    if (res.ok) ArtifactEvents.emit('equip', res.value.rec, cid, res.value.from);
    return res;
  },
  /** Tháo về kho (ô thường – kho đầy thì từ chối). */
  unequip(iid) {
    if (!this.canEdit()) return { ok: false, reason: 'Chỉ tháo được ở giai đoạn chuẩn bị' };
    return ArtifactInventory.tx('unequip', [iid], () => {
      const r = ArtifactInventory.get(iid); if (!r || r.loc !== 'unit') throw new UserError('Vật phẩm không đang được trang bị');
      const s = ArtifactInventory.freeInvSlot(false); if (s < 0) throw new UserError('Kho đầy – ghép bớt nguyên liệu trước');
      ArtifactInventory._place(r, 'inv', null, s); return r;
    });
  },
  /** Bán tướng: mọi trang bị về kho (thường trước, tạm giữ sau). Hết chỗ → thất bại (huỷ bán). */
  returnAll(cid) {
    return ArtifactInventory.tx('sell', ArtifactInventory.ofOwner(cid).map(r => r.instanceId), () => {
      const list = ArtifactInventory.ofOwner(cid).slice();
      for (const r of list) ArtifactInventory._toInv(r, true);
      return list.length;
    });
  },
  /** Nâng sao: bản chính (primary) GIỮ đồ đang mang; ô trống của nó nhận đồ từ các bản phụ (theo thứ tự), phần dư về kho / ô tạm giữ.
   *  Hết chỗ → thất bại → nơi gọi huỷ lần nâng sao (không mất, không nhân đôi). Trả về { kept, moved, toInv }. */
  merge(primary, others) {
    const ids = others.flatMap(c => ArtifactInventory.ofOwner(c).map(r => r.instanceId));
    return ArtifactInventory.tx('merge', ids, () => {
      let moved = 0, toInv = 0;
      for (const c of others) for (const r of ArtifactInventory.ofOwner(c).slice()) {
        const s = ArtifactInventory.freeOwnerSlot(primary);
        if (s >= 0) { ArtifactInventory._place(r, 'unit', primary, s); moved++; } else { ArtifactInventory._toInv(r, true); toInv++; }
      }
      return { kept: ArtifactInventory.ofOwner(primary).length - moved, moved, toInv };
    });
  }
};

/* ---------- Sự kiện giao diện / VFX của hệ thống pháp bảo (không phải sự kiện chiến đấu) ---------- */
const ArtifactEvents = { h: [], on(fn) { this.h.push(fn); }, emit(ev, a, b, c) { for (const f of this.h) { try { f(ev, a, b, c); } catch (e) { console.error('[Pháp bảo]', e); } } } };

/* =====================================================================
 *  ArtifactStats – lớp "trang bị" trong quy trình chỉ số:
 *  Gốc → × sao → × (1 + Σ% tộc/hệ) → + trang bị (cộng thẳng / % cộng dồn) → hiệu ứng tạm thời (StatusEffectManager) → chỉ số cuối.
 *  Hàm thuần: dựng lại từ danh sách itemId mỗi lần → không bao giờ cộng dồn khi vẽ giao diện / qua các vòng.
 * ===================================================================*/
const ArtifactStats = {
  sum(itemIds) {
    const s = {};
    for (const id of itemIds || []) { const it = ITEM_DB[id]; if (!it || !it.stats) continue; for (const k in it.stats) s[k] = (s[k] || 0) + it.stats[k]; }
    return s;
  },
  apply(b, itemIds) {
    const s = this.sum(itemIds);
    b.atkAdd += s.atk || 0; b.apAdd += s.ap || 0; b.aspd += s.aspd || 0; b.def += s.def || 0; b.mr += s.mr || 0;
    b.mana0 += s.mana || 0; b.hpAdd += s.hp || 0; b.crit += s.crit || 0; b.critDmg += s.critDmg || 0;
    b.ls += s.ls || 0; b.omni += s.omni || 0; b.skillDmg += s.skillDmg || 0;
    b.equip = s;
    return b;
  }
};

/* =====================================================================
 *  ArtifactRewards – nguyên liệu từ vòng PvE (vòng yêu thú 3, 7, 11…). Cấu hình ở đây; thưởng ghi vào sổ ĐÚNG 1 lần mỗi vòng
 *  (game.rewardLog lưu cùng bản lưu → tải lại không nhận lặp). Không đổi phần thưởng linh thạch của kinh tế chính.
 * ===================================================================*/
const ARTIFACT_REWARDS = {
  killChance: { yeulang: 0.4, yeuvuong: 1 },   // xác suất rơi 1 nguyên liệu khi hạ (như trang bị cũ – giữ nguyên linh thạch rơi khi không ra đồ)
  winMin: 1,                                   // thắng vòng yêu thú: ít nhất 1 nguyên liệu
  maxPerRound: 3,                              // tối đa mỗi vòng
  weights: { sword: 1, staff: 1, bow: 1, armor: 1, cloak: 1, crystal: 1, jade: 1, glove: 1 }
};
const ArtifactRewards = {
  roll(rnd = Math.random) {
    const W = ARTIFACT_REWARDS.weights, tot = COMPONENT_KEYS.reduce((a, k) => a + (W[k] || 0), 0); let r = rnd() * tot;
    for (const k of COMPONENT_KEYS) { r -= W[k] || 0; if (r < 0) return k; }
    return COMPONENT_KEYS[COMPONENT_KEYS.length - 1];
  },
  /** Có rơi nguyên liệu khi hạ yêu thú này không (tôn trọng giới hạn mỗi vòng). */
  dropOnKill(monsterKey, loot, rnd = Math.random) {
    if (!loot || loot.items.length >= ARTIFACT_REWARDS.maxPerRound) return null;
    return rnd() < (ARTIFACT_REWARDS.killChance[monsterKey] || 0) ? this.roll(rnd) : null;
  },
  /** Cấp phần thưởng của vòng `round` vào kho – bỏ qua nếu vòng này đã nhận (tải lại / gọi lặp). Trả về danh sách itemId đã nhận. */
  grant(round, itemIds) {
    game.rewardLog = game.rewardLog || [];
    if (game.rewardLog.includes(round)) { combatLog.rewardDupBlocked = (combatLog.rewardDupBlocked || 0) + 1; return []; }
    const got = [];
    for (const id of itemIds.slice(0, ARTIFACT_REWARDS.maxPerRound)) {
      const r = ArtifactInventory.add(id, true);
      if (r.ok) got.push(id); else { game.gold += 2; ui.toast('Kho và ô tạm giữ đầy – ' + ITEM_DB[id].name + ' đổi thành 2 linh thạch'); }
    }
    game.rewardLog.push(round); if (game.rewardLog.length > 60) game.rewardLog.splice(0, game.rewardLog.length - 60);
    if (ArtifactInventory.overflowCount()) ui.toast('Kho đầy – ' + ArtifactInventory.overflowCount() + ' vật phẩm ở ô tạm giữ, hãy ghép hoặc trang bị');
    return got;
  }
};

/* ---------- Chuyển bản lưu cũ: trang bị V1.0–V1.5 (6 món, tên chuỗi) → nguyên liệu trong kho ---------- */
function legacyItemsToInventory(lists) {
  let n = 0;
  ArtifactInventory.busy = true;
  try {
    for (const l of lists) for (const k of l || []) {
      const id = LEGACY_ITEM_MAP[k] || (ITEM_DB[k] ? k : null); if (!id) continue;
      const s = ArtifactInventory.freeInvSlot(true); if (s < 0) break;
      ArtifactInventory._create(id, 'inv', null, s); n++;
    }
  } finally { ArtifactInventory.busy = false; ArtifactInventory.ver++; }
  return n;
}
