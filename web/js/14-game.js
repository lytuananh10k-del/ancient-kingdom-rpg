// Vạn Kiếm Kỳ Trận – Kinh tế, cửa hàng, nâng sao, tộc/hệ, vòng đấu, lưu ván (mục 20)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 20. Trận đấu: vòng, đội hình, thắng / thua
 * ===================================================================*/
/* ---------- Tộc / hệ ---------- */
/* TRAITS: xem js/data/traits.js */
/** Hệ số cộng thêm của 1 tướng (đều trung tính). Lớp tộc/hệ: atk, hp, defMul, aspd, skill, omni, manaGain, heal (TraitEngine.computeBonus);
 *  trang bị nhân / cộng tiếp lên trên (atk, def phẳng, hpAdd phẳng, aspd, skill, mana0, ls). */
const defaultBonus = () => ({ atk: 1, hp: 1, hpAdd: 0, skill: 1, mana0: 0, ls: 0, aspd: 1, def: 0, defMul: 1, omni: 0, manaGain: 1, heal: 1, traitStats: null });

/* ---------- Trang bị (rơi ở vòng yêu thú; tối đa 3 món mỗi tướng, gắn rồi không tháo – bán tướng thì trả về túi) ---------- */
const ITEMS = {
  kiem: { name: 'Thanh Phong Kiếm', short: 'Kiếm', color: '#ff9a6a', desc: '+18% công', apply: b => { b.atk *= 1.18; } },
  giap: { name: 'Huyền Thiết Giáp', short: 'Giáp', color: '#b8c4cc', desc: '+25 giáp', apply: b => { b.def += 25; } },
  chau: { name: 'Tụ Linh Châu', short: 'Châu', color: '#9fc7ff', desc: '+20 linh lực đầu trận, tuyệt kỹ +10%', apply: b => { b.mana0 += 20; b.skill *= 1.1; } },
  phu: { name: 'Hộ Mệnh Phù', short: 'Phù', color: '#9ff0d0', desc: '+250 máu', apply: b => { b.hpAdd += 250; } },
  ngoa: { name: 'Phong Hành Ngoa', short: 'Ngoa', color: '#e9e3a0', desc: '+18% tốc đánh', apply: b => { b.aspd *= 1.18; } },
  ngoc: { name: 'Huyết Ngọc', short: 'Ngọc', color: '#ff7a8a', desc: '+15% hút máu', apply: b => { b.ls += 0.15; } }
};
const ITEM_KEYS = Object.keys(ITEMS), MAX_ITEMS_PER_UNIT = 3, MAX_INVENTORY = 10;
const entryOf = u => ({ key: u.key, star: u.star, items: (u.items || []).slice() });

/* ---------- Kinh tế & cửa hàng ---------- */
/** Tướng bán ở cửa hàng theo bậc – lấy thẳng từ danh sách 24 tướng (js/data/champions.js). */
const SHOP_POOL = { 1: championsByCost(1), 2: championsByCost(2), 3: championsByCost(3), 4: championsByCost(4), 5: championsByCost(5) };
/** % xuất hiện bậc 1–5 theo cấp người chơi (hàng = cấp). */
const SHOP_ODDS = [null,
  [100, 0, 0, 0, 0], [100, 0, 0, 0, 0], [75, 25, 0, 0, 0], [55, 30, 15, 0, 0], [45, 33, 20, 2, 0],
  [30, 40, 25, 5, 0], [19, 30, 35, 15, 1], [17, 24, 32, 24, 3], [15, 18, 25, 30, 12]];
/** Bể tướng dùng chung: số bản của MỖI tướng theo bậc. Người chơi giữ, đang bày ở cửa hàng, và đối thủ ảo giữ đều trừ vào bể. */
const POOL_SIZE = [0, 22, 18, 14, 10, 8];
const XP_NEED = [0, 2, 2, 6, 10, 20, 36, 48, 72, Infinity]; // kinh nghiệm để lên cấp kế tiếp
const MAX_LEVEL = 9, BENCH_SIZE = BENCH.slots, SHOP_SIZE = 5, REROLL_COST = 2, XP_COST = 4, XP_BUY = 4, START_HP = 100;
const sellPrice = (key, star) => UNIT_DEFS[key].cost * Math.pow(3, star - 1) - (star > 1 ? 1 : 0);
const game = { hp: START_HP, gold: 6, level: 3, xp: 0, streak: 0, bench: new Array(BENCH_SIZE).fill(null), shop: [], over: false, sel: null, lastSummary: '',
  rivals: {}, items: [], selItem: -1, lastRewards: null, prepT: 0 };

const boardAllies = () => units.filter(u => u.team === 'ally');
const boardCap = () => game.level;
/* ---------- Bể tướng dùng chung ---------- */
/** Số bản người chơi đang giữ (★2 = 3 bản, ★3 = 9 bản), cả hàng chờ lẫn bàn cờ. */
function poolOwned(key) {
  let n = 0;
  for (const e of game.bench) if (e && e.key === key) n += Math.pow(3, e.star - 1);
  for (const u of boardAllies()) if (u.key === key) n += Math.pow(3, u.star - 1);
  return n;
}
/** Số bản còn trong bể (chưa ai giữ, không đang bày ở cửa hàng). */
function poolLeft(key) {
  const d = UNIT_DEFS[key]; if (!d.cost) return 0;
  return POOL_SIZE[d.cost] - poolOwned(key) - game.shop.filter(k => k === key).length - (game.rivals[key] || 0);
}
/** Rút 1 tướng bậc `tier` theo trọng số = số bản còn lại; bậc cạn thì lùi xuống bậc thấp hơn (rồi lên cao hơn). */
function drawFromPool(tier) {
  const order = [tier]; for (let t = tier - 1; t >= 1; t--) order.push(t); for (let t = tier + 1; t <= 5; t++) order.push(t);
  for (const t of order) {
    const keys = SHOP_POOL[t], w = keys.map(k => Math.max(0, poolLeft(k))), tot = w.reduce((a, b) => a + b, 0);
    if (tot <= 0) continue;
    let r = Math.random() * tot;
    for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r < 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  return null;
}
function rollTier(level) {
  const odds = SHOP_ODDS[level]; let r = Math.random() * 100;
  for (let t = 0; t < 5; t++) { r -= odds[t]; if (r < 0) return t + 1; }
  return 1;
}
function rollShop() {
  game.shop = [];   // tướng chưa mua trả về bể trước khi rút mới
  for (let i = 0; i < SHOP_SIZE; i++) game.shop.push(drawFromPool(rollTier(game.level)));
}
/** Đối thủ ảo (7 người chơi khác dùng chung bể): mỗi vòng trả lại khoảng 30% số đang giữ rồi lấy thêm theo vòng;
 *  1/4 số lần lấy nhắm vào tướng người chơi đang gom – nên gom một tướng lâu thì càng khó lên ★3. */
function rivalsDraft(round) {
  for (const k in game.rivals) { let back = 0; for (let i = 0; i < game.rivals[k]; i++) if (Math.random() < 0.3) back++; game.rivals[k] -= back; if (!game.rivals[k]) delete game.rivals[k]; }
  const lv = clamp(3 + Math.floor(round / 3), 3, 9), n = Math.min(18, 4 + round);
  const mine = Object.keys(UNIT_DEFS).filter(k => UNIT_DEFS[k].cost && poolOwned(k) > 0);
  for (let i = 0; i < n; i++) {
    let key = Math.random() < 0.25 && mine.length ? mine[Math.floor(Math.random() * mine.length)] : drawFromPool(rollTier(lv));
    if (!key || poolLeft(key) <= 0) continue;
    game.rivals[key] = (game.rivals[key] || 0) + 1;
  }
}
function countCopies(key, star) {
  return game.bench.filter(e => e && e.key === key && e.star === star).length + boardAllies().filter(u => u.key === key && u.star === star).length;
}
function placeUnit(key, star, c, r, items = []) {
  const u = new Unit(key, 'ally', c, r, star); units.push(u); u.items = items.slice(); TraitCounter.invalidate();
  u.rig.setOutline && u.rig.setOutline(Q().outline);
  return u;
}
/** Đồng bộ quân 3D trên hàng chờ với dữ liệu game.bench (giữ lại object cũ khi chỉ đổi chỗ). */
const benchUnits = new Array(BENCH_SIZE).fill(null);
function syncBench() {
  const pool = benchUnits.filter(Boolean); benchUnits.fill(null);
  for (let i = 0; i < BENCH_SIZE; i++) {
    const e = game.bench[i]; if (!e) continue;
    let k = pool.findIndex(u => u.key === e.key && u.star === e.star && u.benchSlot === i);
    if (k < 0) k = pool.findIndex(u => u.key === e.key && u.star === e.star);
    let u;
    if (k >= 0) u = pool.splice(k, 1)[0];
    else { u = new Unit(e.key, 'ally', 0, 0, e.star); u.rig.setOutline && u.rig.setOutline(Q().outline); }
    u.benchSlot = i; benchUnits[i] = u; u.items = (e.items || []).slice();
    if (!u.dragging) benchSlotPos(i, u.pos);
  }
  pool.forEach(u => u.dispose());
}
function removeUnit(u) { const i = units.indexOf(u); if (i >= 0) units.splice(i, 1); if (u.team === 'ally') TraitCounter.invalidate(); if (battle.selected === u) battle.selected = null; u.dispose(); }
function tileOccupant(c, r) { return boardAllies().find(u => u.homeTile.c === c && u.homeTile.r === r) || null; }
function freeAllyTile() { for (let r = 3; r >= 0; r--) for (const c of [3, 4, 2, 5, 1, 6, 0, 7]) if (!tileOccupant(c, r)) return { c, r }; return null; }

/** Gộp 3 bản cùng tướng cùng sao → lên sao. Ưu tiên giữ vị trí của bản đang đứng trên bàn. */
function mergeAll() {
  let merged = true;
  while (merged) {
    merged = false;
    const groups = {};
    game.bench.forEach((e, i) => { if (e && e.star < 3) (groups[e.key + '|' + e.star] = groups[e.key + '|' + e.star] || { key: e.key, star: e.star, bench: [], board: [] }).bench.push(i); });
    boardAllies().forEach(u => { if (u.star < 3) (groups[u.key + '|' + u.star] = groups[u.key + '|' + u.star] || { key: u.key, star: u.star, bench: [], board: [] }).board.push(u); });
    for (const g of Object.values(groups)) {
      if (g.bench.length + g.board.length < 3) continue;
      const keepBoard = g.board[0] || null;
      let need = 3;
      const take = [];
      if (keepBoard) { take.push({ board: keepBoard }); need--; }
      for (const u of g.board.slice(keepBoard ? 1 : 0)) { if (need <= 0) break; take.push({ board: u }); need--; }
      let keepBench = -1;
      for (const i of g.bench) { if (need <= 0) break; if (!keepBoard && keepBench < 0) keepBench = i; take.push({ bench: i }); need--; }
      const newStar = g.star + 1;
      let spot;
      const items = [];   // gộp trang bị của các bản; dư quá 3 món thì về túi
      take.forEach(t => {
        if (t.board) { items.push(...(t.board.items || [])); if (t.board === keepBoard) spot = { ...t.board.homeTile }; removeUnit(t.board); }
        else { items.push(...(game.bench[t.bench].items || [])); game.bench[t.bench] = null; }
      });
      const keep = items.slice(0, MAX_ITEMS_PER_UNIT); items.slice(MAX_ITEMS_PER_UNIT).forEach(addItem);
      if (keepBoard) {
        const u = placeUnit(g.key, newStar, spot.c, spot.r, keep);
        vfx.particles.burst(u.chest(new V3()), COLORS.allyB, 40, 6, 0.8, 0.35, { up: 3, drag: 2 });
        vfx.magicCircle(u.pos, 1.4, COLORS.allyB, COLORS.allyA, { reveal: 0.3, life: 0.8, spin: 3 });
        floatText(u.chest(new V3()), '★'.repeat(newStar), '#ffd166', 1.5, true);
      } else {
        game.bench[keepBench] = { key: g.key, star: newStar, items: keep };
        const p = benchSlotPos(keepBench, new V3()); p.y = 1;
        vfx.particles.burst(p, COLORS.allyB, 36, 5, 0.8, 0.3, { up: 3, drag: 2 });
        floatText(p, '★'.repeat(newStar), '#ffd166', 1.4, true);
      }
      Sfx.chime();
      ui.toast(UNIT_DEFS[g.key].name + ' lên ' + newStar + ' sao!');
      merged = true;
      break;
    }
  }
  // Dồn phần tràn (khi mua lúc hàng chờ đầy nhưng gộp được) vào chỗ trống.
  while (game.bench.length > BENCH_SIZE) {
    const extra = game.bench.pop(); if (!extra) continue;
    const i = game.bench.indexOf(null); if (i >= 0) game.bench[i] = extra;
  }
}
function buyShop(i) {
  const key = game.shop[i]; if (!key || battle.phase !== 'prep') return;
  const cost = UNIT_DEFS[key].cost;
  if (game.gold < cost) { ui.toast('Không đủ linh thạch'); return; }
  const slot = game.bench.indexOf(null);
  if (slot < 0 && countCopies(key, 1) < 2) { ui.toast('Hàng chờ đã đầy – bán bớt hoặc kéo lên bàn'); return; }
  game.gold -= cost; game.shop[i] = null;
  if (slot >= 0) game.bench[slot] = { key, star: 1, items: [] }; else game.bench.push({ key, star: 1, items: [] });
  Sfx.chime(); mergeAll(); afterRosterChange();
}
function reroll() {
  if (battle.phase !== 'prep') return;
  if (game.gold < REROLL_COST) { ui.toast('Cần ' + REROLL_COST + ' linh thạch để làm mới'); return; }
  game.gold -= REROLL_COST; rollShop(); afterRosterChange();
}
function gainXP(n) {
  if (game.level >= MAX_LEVEL) return;
  game.xp += n;
  while (game.level < MAX_LEVEL && game.xp >= XP_NEED[game.level]) {
    game.xp -= XP_NEED[game.level]; game.level++;
    ui.toast('Lên cấp ' + game.level + ' – đặt được tối đa ' + game.level + ' tu sĩ');
  }
  if (game.level >= MAX_LEVEL) game.xp = 0;
}
function buyXP() {
  if (battle.phase !== 'prep') return;
  if (game.level >= MAX_LEVEL) { ui.toast('Đã đạt cấp tối đa'); return; }
  if (game.gold < XP_COST) { ui.toast('Cần ' + XP_COST + ' linh thạch'); return; }
  game.gold -= XP_COST; gainXP(XP_BUY); afterRosterChange();
}
function sellSelected() { if (game.sel) sellSrc(game.sel); }
function sellSrc(sel) {
  if (!sel || battle.phase !== 'prep') return;
  let key, star, items;
  if (sel.type === 'bench') { const e = game.bench[sel.i]; if (!e) return; key = e.key; star = e.star; items = e.items || []; game.bench[sel.i] = null; }
  else { key = sel.unit.key; star = sel.unit.star; items = sel.unit.items || []; removeUnit(sel.unit); }
  const price = sellPrice(key, star); game.gold += price;
  items.forEach(addItem);   // trang bị trả về túi
  ui.toast('Đã bán ' + UNIT_DEFS[key].name + ' +' + price + ' linh thạch' + (items.length ? ' · ' + items.length + ' trang bị về túi' : ''));
  select(null); afterRosterChange();
}
function moveToBench(unit, slot) {
  if (slot === undefined) slot = game.bench.indexOf(null);
  if (slot < 0) { ui.toast('Hàng chờ đã đầy'); return false; }
  game.bench[slot] = entryOf(unit); removeUnit(unit);
  return true;
}
/** Đặt quân từ hàng chờ lên ô (c, r); nếu ô có người thì đổi chỗ với hàng chờ. */
function benchToBoard(i, c, r) {
  const e = game.bench[i]; if (!e) return false;
  const occ = tileOccupant(c, r);
  if (!occ && boardAllies().length >= boardCap()) { ui.toast('Cấp ' + game.level + ' chỉ đặt được ' + boardCap() + ' tu sĩ – mua kinh nghiệm để lên cấp'); return false; }
  game.bench[i] = occ ? entryOf(occ) : null;
  if (occ) removeUnit(occ);
  const u = placeUnit(e.key, e.star, c, r, e.items || []);
  vfx.particles.burst(_v1.set(u.pos.x, 0.3, u.pos.z), COLORS.allyA, 16, 3, 0.4, 0.25, { up: 2 });
  return true;
}
function select(sel) {
  game.sel = sel; battle.selected = sel && sel.type === 'board' ? sel.unit : null;
  if (sel) showHighlight(sel.type === 'board' ? { type: 'tile', c: sel.unit.homeTile.c, r: sel.unit.homeTile.r } : { type: 'bench', i: sel.i }, true);
  else world.highlight.visible = false;
  ui.update();   // trước khi đặt bảng thông tin: cửa hàng có thể cao thêm (nút Bán / Về hàng chờ)
  if (sel) showUnitInfo(sel.type === 'board' ? sel.unit : benchUnits[sel.i]); else closeUnitInfo();
}
function showHighlight(t, ok) {
  const hl = world.highlight;
  if (!t || t.type === 'sell') { hl.visible = false; return; }
  if (t.type === 'tile') { tileCenter(t.c, t.r, hl.position); hl.scale.setScalar(1); } else { benchSlotPos(t.i, hl.position); hl.scale.set(0.72, 1, 0.68); }
  hl.position.y = 0.08; hl.material.color.set(ok ? 0xe9c46a : 0xe2553f); hl.visible = true;
}
function afterRosterChange() { applyTraits(true); boardAllies().forEach(u => u.reset(1)); saveGame(); ui.update(); }

/* ---------- Túi trang bị ---------- */
function addItem(key) { if (game.items.length < MAX_INVENTORY) game.items.push(key); else { game.gold += 2; ui.toast('Túi đầy – ' + ITEMS[key].name + ' đổi thành 2 linh thạch'); } }
/** Gắn trang bị trong túi (vị trí idx) cho tướng trên bàn ({type:'board', unit}) hoặc hàng chờ ({type:'bench', i}). */
function equipItem(idx, target) {
  const key = game.items[idx]; if (!key || !target) return false;
  const holder = target.type === 'board' ? target.unit : game.bench[target.i];
  if (!holder) return false;
  holder.items = holder.items || [];
  if (holder.items.length >= MAX_ITEMS_PER_UNIT) { ui.toast('Mỗi tướng mang tối đa ' + MAX_ITEMS_PER_UNIT + ' trang bị'); return false; }
  holder.items.push(key); game.items.splice(idx, 1); game.selItem = -1;
  const name = UNIT_DEFS[holder.key].short || UNIT_DEFS[holder.key].name;
  const u = target.type === 'board' ? target.unit : benchUnits[target.i];
  if (u) { u.items = holder.items.slice(); vfx.particles.burst(u.chest(new V3()), COLORS.allyB, 24, 4, 0.6, 0.3, { up: 2, drag: 2 }); floatText(u.chest(new V3()), '+' + ITEMS[key].short, ITEMS[key].color, 1); }
  ui.toast('Gắn ' + ITEMS[key].name + ' cho ' + name);
  Sfx.chime(); afterRosterChange();
  return true;
}

/* ---------- Tộc / hệ: xem js/data/traits.js (dữ liệu) và js/combat/traits-engine.js (TraitCounter, TraitEngine) ---------- */
/** Số tướng khác nhau trên bàn theo tộc/hệ (bản sao – sửa không ảnh hưởng bộ đếm). */
function traitCounts() { return Object.assign({}, TraitCounter.counts()); }
const traitLevel = (t, n) => TraitRegistry.level(t, n);
/** Áp lớp tộc/hệ + trang bị cho mọi tướng (tính lại từ đầu, không cộng dồn). announce = hiệu ứng khi vừa đạt mốc mới. */
function applyTraits(announce) { return TraitEngine.apply(announce); }

/* ---------- Đội hình địch theo vòng ---------- */
/** Vòng yêu thú: 3, 7, 11, 15… – đánh yêu thú để nhận trang bị và linh thạch; thua chỉ mất nửa máu, không tính chuỗi. */
const isMonsterRound = round => round >= 3 && (round - 3) % 4 === 0;
function monsterLineup(round) {
  const k = (round - 3) / 4, star = k >= 3 ? 2 : 1;
  const out = [['yeulang', 2, 5, star], ['yeulang', 5, 5, star], ['yeulang', 3, 6, star]];
  if (k >= 1) out.push(['yeuvuong', 4, 6, k >= 2 ? 2 : 1]);
  if (k >= 2) out.push(['yeulang', 1, 6, star], ['yeulang', 6, 6, star]);
  if (k >= 4) out.push(['yeuvuong', 3, 7, 2]);
  return out;
}
/** Số quân địch bám theo cấp người chơi dự kiến (2 ở vòng 1, cứ 2 vòng thêm 1); có sao muộn dần. */
function enemyLineup(round) {
  if (isMonsterRound(round)) return monsterLineup(round);
  const n = Math.min(8, 2 + Math.floor((round - 1) / 2));
  const spots = [[3, 4], [4, 4], [2, 5], [5, 5], [3, 6], [4, 6], [1, 5], [6, 5]];
  const out = [];
  for (let i = 0; i < n; i++) {
    const key = i === 0 ? 'mathu' : i === 1 ? 'huyetkiem' : ['uminh', 'huyetkiem', 'mathu'][(i + round) % 3];
    const star = (round >= 11 && i < 3) || (round >= 8 && i < 2) || (round >= 5 && i === 0) ? 2 : 1;
    out.push([key, spots[i][0], spots[i][1], round >= 15 && i === 0 ? 3 : star]);
  }
  return out;
}

/* ---------- Lưu / tải ván ---------- */
function snapshotGame(roundOverride) {
  return { v: 1, hp: game.hp, gold: game.gold, level: game.level, xp: game.xp, streak: game.streak, round: roundOverride || battle.round,
    bench: game.bench.slice(0, BENCH_SIZE).map(e => (e ? { key: e.key, star: e.star, items: (e.items || []).slice() } : null)), shop: game.shop.slice(), over: game.over,
    rivals: Object.assign({}, game.rivals), items: game.items.slice(),
    board: boardAllies().map(u => ({ key: u.key, star: u.star, c: u.homeTile.c, r: u.homeTile.r, items: (u.items || []).slice() })) };
}
function saveGame(roundOverride) { if (!battle.bench) store.set('save', snapshotGame(roundOverride)); }
const newGameState = () => ({ v: 1, hp: START_HP, gold: 6, level: 3, xp: 0, streak: 0, round: 1, bench: new Array(BENCH_SIZE).fill(null), shop: null, over: false,
  rivals: {}, items: [], board: [{ key: 'kiemdong', star: 1, c: 4, r: 3 }, { key: 'thietve', star: 1, c: 3, r: 3 }] });
function restoreGame(st) {
  for (const u of boardAllies()) removeUnit(u);
  if (drag.src) cancelDrag();
  Object.assign(game, { hp: st.hp, gold: st.gold, level: Math.min(MAX_LEVEL, st.level), xp: st.xp, streak: st.streak, over: !!st.over, sel: null, lastSummary: '', selItem: -1, lastRewards: null });
  const okItems = a => (Array.isArray(a) ? a.filter(k => ITEMS[k]).slice(0, MAX_ITEMS_PER_UNIT) : []);
  game.items = Array.isArray(st.items) ? st.items.filter(k => ITEMS[k]).slice(0, MAX_INVENTORY) : [];
  // Bản lưu cũ (trước V1.5): id tướng đã đổi / gỡ được chuyển sang tướng mới cùng bậc (migrateChampionKey), giữ sao & trang bị.
  game.rivals = {}; for (const k in st.rivals || {}) { const m = migrateChampionKey(k); if (m && st.rivals[k] > 0) game.rivals[m] = (game.rivals[m] || 0) + (st.rivals[k] | 0); }
  game.bench = (st.bench || []).slice(0, BENCH_SIZE).map(e => { const m = e && migrateChampionKey(e.key); return m && e.star >= 1 && e.star <= 3 ? { key: m, star: e.star, items: okItems(e.items) } : null; });
  while (game.bench.length < BENCH_SIZE) game.bench.push(null);
  // Bản lưu hỏng / cũ: bỏ ô trùng hoặc ngoài nửa bàn phe ta, quân vượt giới hạn cấp → về hàng chờ (đầy thì hoàn linh thạch).
  const used = new Set();
  (st.board || []).forEach(b => {
    b = Object.assign({}, b, { key: migrateChampionKey(b.key) });
    if (!b.key || !(b.star >= 1 && b.star <= 3)) return;
    const k = b.c + ',' + b.r, okTile = b.c >= 0 && b.c < 8 && b.r >= 0 && b.r < 4 && !used.has(k);
    if (okTile && boardAllies().length < game.level) { used.add(k); placeUnit(b.key, b.star, b.c, b.r, okItems(b.items)); return; }
    const slot = game.bench.indexOf(null);
    if (slot >= 0) game.bench[slot] = { key: b.key, star: b.star, items: okItems(b.items) }; else { game.gold += sellPrice(b.key, b.star); okItems(b.items).forEach(addItem); }
  });
  battle.round = st.round || 1;
  for (const k in game.rivals) { const over = -poolLeft(k); if (over > 0) game.rivals[k] = Math.max(0, game.rivals[k] - over); }
  if (st.shop && st.shop.length === SHOP_SIZE) game.shop = st.shop.map(k => (k ? migrateChampionKey(k) : null)); else rollShop();
  mergeAll();   // bản lưu cũ: nhiều id cũ có thể gộp về cùng một tướng mới → đủ 3 bản thì lên sao luôn
  setupRound();
}
function newGame() { restoreGame(newGameState()); ui.toast('Ván mới – mua tu sĩ rồi kéo từ hàng chờ lên ô xanh'); }

/* ---------- Vòng đấu ---------- */
function setupRound() {
  TraitEngine.battleEnd();
  timelines.forEach(t => t.cancel()); timelines.length = 0;
  Projectiles.clear(); SimTasks.clear(); DangerZones.clear(); vfx.clear(); floaters.length = 0;
  for (let i = units.length - 1; i >= 0; i--) if (units[i].team === 'enemy') { units[i].dispose(); units.splice(i, 1); }
  const scale = 0.85 * Math.pow(1.07, battle.round - 1);   // máu và công cùng nhân → sức mạnh ≈ scale²
  enemyLineup(battle.round).forEach(([k, c, r, star]) => units.push(new Unit(k, 'enemy', c, r, star)));
  units.forEach(u => u.rig.setOutline && u.rig.setOutline(Q().outline));
  applyTraits();
  units.forEach(u => u.reset(u.team === 'enemy' ? scale : 1));
  battle.phase = 'prep'; battle.time = 0; battle.result = null; battle.selected = null; game.sel = null;
  game.prepT = battle.round === 1 ? FIRST_PREP_TIME : PREP_TIME;
  world.highlight.visible = false;
  ui.update(); ui.result(null); combatCam.cine = null;
  applyPrepCamera();
  if (isMonsterRound(battle.round) && !battle.bench) ui.toast('Vòng yêu thú – hạ yêu thú để nhận trang bị và linh thạch');
  saveGame();
}
/** Đếm ngược chuẩn bị (thời gian thực, không theo tốc độ trận); hết giờ thì tự vào trận. Dừng khi tạm dừng / còn ở màn mở đầu. */
function tickPrepTimer(dt) {
  if (!options.prepTimer || battle.phase !== 'prep' || game.over || battle.bench || battle.paused || !$('intro').hidden) return;
  game.prepT -= dt;
  if (game.prepT <= 0) { game.prepT = 0; ui.toast('Hết giờ chuẩn bị'); startBattle(); }
}
/** Giống TFT: vào trận mà bàn còn chỗ theo cấp thì tự đưa tướng mạnh nhất từ hàng chờ lên ô trống. */
function autoFillBoard() {
  const placed = [];
  while (boardAllies().length < boardCap()) {
    let best = -1;
    game.bench.forEach((e, i) => { if (e && (best < 0 || e.star * 10 + UNIT_DEFS[e.key].cost > game.bench[best].star * 10 + UNIT_DEFS[game.bench[best].key].cost)) best = i; });
    const tile = freeAllyTile(); if (best < 0 || !tile) break;
    placed.push(UNIT_DEFS[game.bench[best].key].short || UNIT_DEFS[game.bench[best].key].name);
    benchToBoard(best, tile.c, tile.r);
  }
  if (placed.length) { ui.toast('Tự đưa lên bàn: ' + placed.join(', ')); afterRosterChange(); }
  return placed.length;
}
function startBattle() {
  if (battle.phase !== 'prep' || game.over) return;
  if (drag.src) cancelDrag();
  if (!battle.bench) autoFillBoard();
  if (!boardAllies().length) ui.toast('Không có tu sĩ trên bàn – vòng này sẽ thua');
  applyTraits(); boardAllies().forEach(u => u.reset(1));
  // RNG có seed cho logic trận (tái hiện được): battle.seedOverride (kiểm thử) hoặc seed ngẫu nhiên, lưu ở battle.seed.
  battle.seed = CombatRNG.seed(battle.seedOverride != null ? battle.seedOverride : (Math.random() * 4294967296) >>> 0);
  battle.step = 0; CombatAudit.reset();
  for (const u of units) u.atkCd = crand() * 0.4;   // lệch nhịp đánh đầu trận (sau khi đặt seed → giống nhau giữa các lần chạy cùng seed)
  battle.phase = 'fight';
  TraitEngine.battleStart(); battle.time = 0; battle.loot = { gold: 0, items: [] }; battle.otShown = false; select(null); ui.update();
  combatCam.tDist = combatCam.defaults.dist;
}
function onUnitDeath(u) {
  TraitEvents.emit('onUnitDeath', u);
  vfx.particles.burst(u.chest(new V3()), u.team === 'ally' ? COLORS.allyA : COLORS.enemyA, 24, 5, 0.8, 0.3, { up: 1, drag: 2 });
  // Yêu thú rơi đồ: Yêu Thú Vương chắc chắn 1 trang bị + 3 linh thạch; Yêu Lang 40% trang bị, còn lại 1 linh thạch.
  if (u.def.monster && battle.loot && !battle.bench) {
    const c = u.chest(new V3());
    let dropped = false;
    if (u.key === 'yeuvuong' || Math.random() < 0.4) { const it = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)]; battle.loot.items.push(it); dropped = true; floatText(c, '+' + ITEMS[it].name, ITEMS[it].color, 1.1, true); vfx.particles.burst(c, COLORS.allyB, 40, 5, 0.8, 0.4, { up: 4, drag: 2 }); }
    const g = u.key === 'yeuvuong' ? 3 : dropped ? 0 : 1;
    if (g) { battle.loot.gold += g; floatText(_v1.set(c.x, c.y + 0.6, c.z), '+' + g + ' linh thạch', '#e9c46a', 0.9); }
  }
  ui.update();
}
/** Thu nhập & mất máu sau mỗi vòng. */
/** Lãi: 1 linh thạch cho mỗi 10 đang giữ, tối đa 5. */
const interestOf = gold => Math.min(5, Math.floor(gold / 10));
const streakBonusOf = streak => { const s = Math.abs(streak); return s >= 5 ? 3 : s >= 4 ? 2 : s >= 2 ? 1 : 0; };
/** Thu nhập, mất máu, phần thưởng yêu thú sau mỗi vòng. Vòng yêu thú không tính chuỗi thắng/thua, thua chỉ mất nửa máu. */
function settleRound(win) {
  const monster = isMonsterRound(battle.round), interest = interestOf(game.gold);
  if (!monster) game.streak = win ? Math.max(1, game.streak + 1) : Math.min(-1, game.streak - 1);
  const streakBonus = monster ? 0 : streakBonusOf(game.streak);
  const loot = monster ? (battle.loot || { gold: 0, items: [] }) : null;
  if (loot && win && !loot.items.length) loot.items.push(ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)]);   // thắng vòng yêu thú: ít nhất 1 trang bị
  const income = 5 + interest + streakBonus + (win && !monster ? 1 : 0) + (loot ? loot.gold : 0);
  let dmg = 0;
  if (!win) {
    dmg = 2 + Math.floor(battle.round / 2) + units.filter(u => u.team === 'enemy' && u.alive).reduce((a, u) => a + u.star, 0);
    if (monster) dmg = Math.ceil(dmg / 2);
    game.hp = Math.max(0, game.hp - dmg);
  }
  game.gold += income; gainXP(2);
  if (loot) loot.items.forEach(addItem);
  game.lastRewards = loot;
  game.lastSummary = `+${income} linh thạch (cơ bản 5 · lãi ${interest}` + (monster ? ` · yêu thú rơi ${loot.gold})` + (loot.items.length ? ` · nhận ${loot.items.length} trang bị` : '') : ` · chuỗi ${streakBonus}${win ? ' · thắng 1' : ''})`) + (dmg ? ` · mất ${dmg} máu` : '');
  if (game.hp <= 0) game.over = true;
  rivalsDraft(battle.round);
  saveGame(battle.round + 1);
}
function checkBattleEnd() {
  if (battle.phase !== 'fight' || battle.bench) return;
  const allies = units.some(u => u.team === 'ally' && u.alive), enemies = units.some(u => u.team === 'enemy' && u.alive);
  if (allies && enemies && battle.time > OVERTIME_AT && !battle.otShown) { battle.otShown = true; combatLog.overtime = (combatLog.overtime || 0) + 1; showBanner('Linh khí hỗn loạn', 'enemy'); ui.toast('Trận kéo dài – sát thương tăng dần, hồi máu giảm một nửa'); }
  if (allies && enemies && battle.time < FIGHT_LIMIT) return;
  // Hết giờ mà hai bên còn người, hoặc hai bên ngã cùng một bước → HOÀ; người chơi bị tính như thua (BATTLE_RULES.drawCountsAsLoss).
  const win = allies && !enemies, draw = !win && (allies === enemies);
  battle.phase = 'end'; battle.result = win ? 'win' : draw ? 'draw' : 'lose';
  Projectiles.clear(); SimTasks.clear(); DangerZones.clear();   // không còn đạn / vùng / phi kiếm của trận này
  if (draw) combatLog.draws = (combatLog.draws || 0) + 1;
  TraitEngine.battleEnd();
  units.forEach(u => { if (u.alive && ((u.team === 'ally') === win)) u.fsm.set('victory'); else if (u.alive) u.fsm.set('idle'); });
  settleRound(win);
  if (game.over) { ui.result('Đạo tâm tan vỡ'); ui.toast('Hết máu – trụ được ' + battle.round + ' vòng'); }
  else { ui.result(win ? 'Đại thắng' : draw ? 'Hoà – hết giờ' : 'Bại trận'); ui.toast(game.lastSummary); }
  ui.update();
}
