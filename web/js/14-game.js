// Vạn Kiếm Kỳ Trận – Kinh tế, cửa hàng, nâng sao, tộc/hệ, vòng đấu, lưu ván (mục 20)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 20. Trận đấu: vòng, đội hình, thắng / thua
 * ===================================================================*/
/* ---------- Tộc / hệ ---------- */
const TRAITS = {
  kiemtu: { name: 'Kiếm Tu', tiers: [2, 3], color: '#7cc4ff', desc: ['+20% công', '+45% công, +15% tốc đánh'] },
  phaptu: { name: 'Pháp Tu', tiers: [2, 3], color: '#c9a0ff', desc: ['Tuyệt kỹ +25%, linh lực đầu +20', 'Tuyệt kỹ +60%, linh lực đầu +40'] },
  hophap: { name: 'Hộ Pháp', tiers: [2], color: '#e9c46a', desc: ['+30% máu, +20 phòng thủ'] },
  matu: { name: 'Ma Tu', tiers: [2], color: '#ff8a7a', desc: ['Hút máu 25% sát thương gây ra'] }
};
const defaultBonus = () => ({ atk: 1, hp: 1, skill: 1, mana0: 0, ls: 0, aspd: 1, def: 0 });
const STAR_MUL = [0, 1, 1.8, 3.24], STAR_SCALE = [0, 1, 1.12, 1.24];

/* ---------- Kinh tế & cửa hàng ---------- */
const SHOP_POOL = { 1: ['kiemdong', 'hophap', 'thietve'], 2: ['loi', 'hoa', 'anhkiem'], 3: ['kiemtien', 'uhon'] };
const SHOP_ODDS = [null, [100, 0, 0], [100, 0, 0], [75, 25, 0], [55, 35, 10], [40, 40, 20], [30, 40, 30], [25, 40, 35], [20, 40, 40]]; // % bậc 1/2/3 theo cấp
const XP_NEED = [0, 2, 2, 6, 10, 20, 32, 48, Infinity]; // kinh nghiệm để lên cấp kế tiếp
const MAX_LEVEL = 8, BENCH_SIZE = BENCH.slots, SHOP_SIZE = 5, REROLL_COST = 2, XP_COST = 4, XP_BUY = 4, START_HP = 100;
const sellPrice = (key, star) => UNIT_DEFS[key].cost * Math.pow(3, star - 1) - (star > 1 ? 1 : 0);
const game = { hp: START_HP, gold: 6, level: 3, xp: 0, streak: 0, bench: new Array(BENCH_SIZE).fill(null), shop: [], over: false, sel: null, lastSummary: '' };
let customRigFactory = null;

const boardAllies = () => units.filter(u => u.team === 'ally');
const boardCap = () => game.level;
function rollShop() {
  const odds = SHOP_ODDS[game.level];
  game.shop = [];
  for (let i = 0; i < SHOP_SIZE; i++) {
    const r = Math.random() * 100, tier = r < odds[0] ? 1 : r < odds[0] + odds[1] ? 2 : 3;
    const pool = SHOP_POOL[tier]; game.shop.push(pool[Math.floor(Math.random() * pool.length)]);
  }
}
function countCopies(key, star) {
  return game.bench.filter(e => e && e.key === key && e.star === star).length + boardAllies().filter(u => u.key === key && u.star === star).length;
}
function placeUnit(key, star, c, r) {
  const u = new Unit(key, 'ally', c, r, star); units.push(u);
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
    u.benchSlot = i; benchUnits[i] = u;
    if (!u.dragging) benchSlotPos(i, u.pos);
  }
  pool.forEach(u => u.dispose());
}
function removeUnit(u) { const i = units.indexOf(u); if (i >= 0) units.splice(i, 1); if (battle.selected === u) battle.selected = null; u.dispose(); }
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
      take.forEach(t => { if (t.board) { if (t.board === keepBoard) spot = { ...t.board.homeTile }; removeUnit(t.board); } else game.bench[t.bench] = null; });
      if (keepBoard) {
        const u = placeUnit(g.key, newStar, spot.c, spot.r);
        vfx.particles.burst(u.chest(new V3()), COLORS.allyB, 40, 6, 0.8, 0.35, { up: 3, drag: 2 });
        vfx.magicCircle(u.pos, 1.4, COLORS.allyB, COLORS.allyA, { reveal: 0.3, life: 0.8, spin: 3 });
        floatText(u.chest(new V3()), '★'.repeat(newStar), '#ffd166', 1.5, true);
      } else {
        game.bench[keepBench] = { key: g.key, star: newStar };
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
  if (slot >= 0) game.bench[slot] = { key, star: 1 }; else game.bench.push({ key, star: 1 });
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
  let key, star;
  if (sel.type === 'bench') { const e = game.bench[sel.i]; if (!e) return; key = e.key; star = e.star; game.bench[sel.i] = null; }
  else { key = sel.unit.key; star = sel.unit.star; removeUnit(sel.unit); }
  const price = sellPrice(key, star); game.gold += price;
  ui.toast('Đã bán ' + UNIT_DEFS[key].name + ' +' + price + ' linh thạch');
  select(null); afterRosterChange();
}
function moveToBench(unit, slot) {
  if (slot === undefined) slot = game.bench.indexOf(null);
  if (slot < 0) { ui.toast('Hàng chờ đã đầy'); return false; }
  game.bench[slot] = { key: unit.key, star: unit.star }; removeUnit(unit);
  return true;
}
/** Đặt quân từ hàng chờ lên ô (c, r); nếu ô có người thì đổi chỗ với hàng chờ. */
function benchToBoard(i, c, r) {
  const e = game.bench[i]; if (!e) return false;
  const occ = tileOccupant(c, r);
  if (!occ && boardAllies().length >= boardCap()) { ui.toast('Cấp ' + game.level + ' chỉ đặt được ' + boardCap() + ' tu sĩ – mua kinh nghiệm để lên cấp'); return false; }
  game.bench[i] = occ ? { key: occ.key, star: occ.star } : null;
  if (occ) removeUnit(occ);
  const u = placeUnit(e.key, e.star, c, r);
  vfx.particles.burst(_v1.set(u.pos.x, 0.3, u.pos.z), COLORS.allyA, 16, 3, 0.4, 0.25, { up: 2 });
  return true;
}
function select(sel) {
  game.sel = sel; battle.selected = sel && sel.type === 'board' ? sel.unit : null;
  if (sel) showHighlight(sel.type === 'board' ? { type: 'tile', c: sel.unit.homeTile.c, r: sel.unit.homeTile.r } : { type: 'bench', i: sel.i }, true);
  else world.highlight.visible = false;
  ui.update();
}
function showHighlight(t, ok) {
  const hl = world.highlight;
  if (!t || t.type === 'sell') { hl.visible = false; return; }
  if (t.type === 'tile') { tileCenter(t.c, t.r, hl.position); hl.scale.setScalar(1); } else { benchSlotPos(t.i, hl.position); hl.scale.set(0.72, 1, 0.68); }
  hl.position.y = 0.08; hl.material.color.set(ok ? 0xe9c46a : 0xe2553f); hl.visible = true;
}
function afterRosterChange() { applyTraits(); boardAllies().forEach(u => u.reset(1)); saveGame(); ui.update(); }

/* ---------- Tộc / hệ: đếm tướng khác nhau trên bàn ---------- */
function traitCounts() {
  const keys = new Set(boardAllies().map(u => u.key)), counts = {};
  for (const k of keys) for (const t of UNIT_DEFS[k].traits || []) counts[t] = (counts[t] || 0) + 1;
  return counts;
}
function traitLevel(t, n) { let lv = 0; TRAITS[t].tiers.forEach((m, i) => { if (n >= m) lv = i + 1; }); return lv; }
function applyTraits() {
  const counts = traitCounts();
  for (const u of units) {
    const b = defaultBonus();
    if (u.team === 'ally') for (const t of u.def.traits || []) {
      const lv = traitLevel(t, counts[t] || 0); if (!lv) continue;
      if (t === 'kiemtu') { b.atk *= lv === 1 ? 1.2 : 1.45; if (lv >= 2) b.aspd *= 1.15; }
      if (t === 'phaptu') { b.skill *= lv === 1 ? 1.25 : 1.6; b.mana0 += lv === 1 ? 20 : 40; }
      if (t === 'hophap') { b.hp *= 1.3; b.def += 20; }
      if (t === 'matu') b.ls = 0.25;
    }
    u.bonus = b;
  }
  return counts;
}

/* ---------- Đội hình địch theo vòng ---------- */
/** Số quân địch bám theo cấp người chơi dự kiến (2 ở vòng 1, cứ 2 vòng thêm 1); có sao muộn dần. */
function enemyLineup(round) {
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
    bench: game.bench.slice(0, BENCH_SIZE), shop: game.shop.slice(), over: game.over,
    board: boardAllies().map(u => ({ key: u.key, star: u.star, c: u.homeTile.c, r: u.homeTile.r })) };
}
function saveGame(roundOverride) { if (!battle.bench) store.set('save', snapshotGame(roundOverride)); }
const newGameState = () => ({ v: 1, hp: START_HP, gold: 6, level: 3, xp: 0, streak: 0, round: 1, bench: new Array(BENCH_SIZE).fill(null), shop: null, over: false,
  board: [{ key: 'kiemtien', star: 1, c: 4, r: 3 }, { key: 'hophap', star: 1, c: 3, r: 3 }] });
function restoreGame(st) {
  for (const u of boardAllies()) removeUnit(u);
  if (drag.src) cancelDrag();
  Object.assign(game, { hp: st.hp, gold: st.gold, level: st.level, xp: st.xp, streak: st.streak, over: !!st.over, sel: null, lastSummary: '' });
  game.bench = (st.bench || []).slice(0, BENCH_SIZE).map(e => (e && UNIT_DEFS[e.key] ? { key: e.key, star: e.star } : null));
  while (game.bench.length < BENCH_SIZE) game.bench.push(null);
  (st.board || []).forEach(b => { if (UNIT_DEFS[b.key]) placeUnit(b.key, b.star, b.c, b.r); });
  battle.round = st.round || 1;
  if (st.shop && st.shop.length === SHOP_SIZE) game.shop = st.shop.map(k => (k && UNIT_DEFS[k] ? k : null)); else rollShop();
  setupRound();
}
function newGame() { restoreGame(newGameState()); ui.toast('Ván mới – mua tu sĩ rồi kéo từ hàng chờ lên ô xanh'); }

/* ---------- Vòng đấu ---------- */
function setupRound() {
  timelines.forEach(t => t.cancel()); timelines.length = 0;
  Projectiles.clear(); vfx.clear(); floaters.length = 0;
  for (let i = units.length - 1; i >= 0; i--) if (units[i].team === 'enemy') { units[i].dispose(); units.splice(i, 1); }
  const scale = 0.85 * Math.pow(1.07, battle.round - 1);   // máu và công cùng nhân → sức mạnh ≈ scale²
  enemyLineup(battle.round).forEach(([k, c, r, star]) => units.push(new Unit(k, 'enemy', c, r, star)));
  units.forEach(u => u.rig.setOutline && u.rig.setOutline(Q().outline));
  applyTraits();
  units.forEach(u => u.reset(u.team === 'enemy' ? scale : 1));
  battle.phase = 'prep'; battle.time = 0; battle.result = null; battle.selected = null; game.sel = null;
  world.highlight.visible = false;
  ui.update(); ui.result(null); combatCam.cine = null;
  applyPrepCamera();
  saveGame();
}
function startBattle() {
  if (battle.phase !== 'prep' || game.over) return;
  if (drag.src) cancelDrag();
  if (!boardAllies().length) ui.toast('Không có tu sĩ trên bàn – vòng này sẽ thua');
  applyTraits(); boardAllies().forEach(u => u.reset(1));
  battle.phase = 'fight'; battle.time = 0; select(null); ui.update();
  combatCam.tDist = combatCam.defaults.dist;
}
function onUnitDeath(u) {
  vfx.particles.burst(u.chest(new V3()), u.team === 'ally' ? COLORS.allyA : COLORS.enemyA, 24, 5, 0.8, 0.3, { up: 1, drag: 2 });
  ui.update();
}
/** Thu nhập & mất máu sau mỗi vòng. */
function settleRound(win) {
  const interest = Math.min(5, Math.floor(game.gold / 10));
  game.streak = win ? Math.max(1, game.streak + 1) : Math.min(-1, game.streak - 1);
  const s = Math.abs(game.streak), streakBonus = s >= 5 ? 3 : s >= 4 ? 2 : s >= 2 ? 1 : 0;
  const income = 5 + interest + streakBonus + (win ? 1 : 0);
  let dmg = 0;
  if (!win) {
    dmg = 2 + Math.floor(battle.round / 2) + units.filter(u => u.team === 'enemy' && u.alive).reduce((a, u) => a + u.star, 0);
    game.hp = Math.max(0, game.hp - dmg);
  }
  game.gold += income; gainXP(2);
  game.lastSummary = `+${income} linh thạch (cơ bản 5 · lãi ${interest} · chuỗi ${streakBonus}${win ? ' · thắng 1' : ''})` + (dmg ? ` · mất ${dmg} máu` : '');
  if (game.hp <= 0) game.over = true;
  saveGame(battle.round + 1);
}
function checkBattleEnd() {
  if (battle.phase !== 'fight' || battle.bench) return;
  const allies = units.some(u => u.team === 'ally' && u.alive), enemies = units.some(u => u.team === 'enemy' && u.alive);
  if (allies && enemies && battle.time < 90) return;
  const win = allies && !enemies;
  battle.phase = 'end'; battle.result = win ? 'win' : 'lose';
  units.forEach(u => { if (u.alive && ((u.team === 'ally') === win)) u.fsm.set('victory'); else if (u.alive) u.fsm.set('idle'); });
  settleRound(win);
  if (game.over) { ui.result('Đạo tâm tan vỡ'); ui.toast('Hết máu – trụ được ' + battle.round + ' vòng'); }
  else { ui.result(win ? 'Đại thắng' : 'Bại trận'); ui.toast(game.lastSummary); }
  ui.update();
}
