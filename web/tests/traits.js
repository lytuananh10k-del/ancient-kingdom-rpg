// Kiểm tra V1.5 tuần 2 – hệ thống 8 tộc/hệ (Synergy Engine) của Vạn Kiếm Kỳ Trận.
//   0. TraitRegistry: cấu hình hợp lệ, 4 tộc + 4 hệ, mỗi tướng 1 tộc + ≥ 1 hệ, mọi mốc đạt được.
//   1–5. TraitCounter: trùng tên / ★2 ★3 chỉ tính 1, hàng chờ không tính, bán / lên bàn / về hàng chờ cập nhật số lượng và giao diện.
//   6. Mốc kích hoạt đúng cho từng tộc/hệ (m−1 chưa bật, m bật). Chỉ số cuối = công thức tính độc lập trong bài kiểm thử (50 đội hình ngẫu nhiên).
//   7. Buff không cộng dồn qua nhiều vòng / nhiều lần vẽ lại giao diện.
//   8. Hồi máu (Đan Tu), lá chắn (Tiên Tộc, Hộ Pháp – chỉ đồng minh đứng cạnh), hút máu toàn phần (Ma Tộc), năng lượng (Tiên Tộc) hoạt động thật.
//   9. Phi kiếm phụ Kiếm Tu trúng đúng 1 lần mỗi kiếm; Pháp Tu (6) nổ đúng 1 lần / mục tiêu / lần thi triển.
//  10. VFX, sự kiện, phi kiếm, hào quang được dọn sau trận.
//  11–12. (24 tướng mua / bán / nâng sao & bản lưu cũ: tests/champions.js) + bản lưu cũ tính tộc/hệ đúng.
//  13. Không lỗi console.  14. Mục tiêu chết giữa chiêu khi mọi hiệu ứng tộc/hệ đang bật.  15. Kết quả như nhau ở tốc độ ×1 và ×2.
// Chạy:  cd web && npm run test:traits
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const failures = [];
const check = (cond, msg, extra) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } else console.log('  ✓ ' + msg); return cond; };

/** Cài hàm trợ giúp vào trang (window.TT). */
function installHelpers() {
  const K = window.__vkkt, g = K.game;
  window.TT = {
    /** Đội hình mới: list = [[key, star, c, r]], bench = [[key, star]]. */
    board(list, bench = []) {
      K.newGame(); g.level = 9; g.gold = 100; g.rivals = {};
      for (const u of K.boardAllies()) K.removeUnit(u);
      g.bench.fill(null); bench.forEach(([k, s], i) => { g.bench[i] = { key: k, star: s || 1, items: [] }; });
      list.forEach(([k, s, c, r]) => K.placeUnit(k, s || 1, c, r));
      K.afterRosterChange();
    },
    /** Vào trận với địch thụ động (không đánh, không tung chiêu) để đo chính xác. */
    fight(enemies) {
      const orig = window.enemyLineup;
      window.enemyLineup = () => (enemies || [['mathu', 3, 5, 1], ['uminh', 4, 6, 1], ['mathu', 5, 5, 1]]);
      K.battle.round = 2; K.setupRound(); window.enemyLineup = orig;
      K.startBattle();
      K.units.filter(u => u.team === 'enemy').forEach(e => { e.atkCd = 1e9; e.maxMana = 1e9; e.mana = 0; });
    },
    passiveAllies() { K.boardAllies().forEach(u => { u.atkCd = 1e9; u.maxMana = 1e9; u.mana = 0; }); },
    unit: key => K.boardAllies().find(u => u.key === key),
    end() { if (K.battle.phase === 'fight') { K.battle.phase = 'end'; K.TraitEngine.battleEnd(); } K.nextRound(); },
    /** Đếm lần gọi dealDamage theo điều kiện (bọc tạm thời). */
    spy(pred) {
      const orig = window.dealDamage, rec = { n: 0, dmg: 0, per: new Map() };
      window.dealDamage = function (src, dst, mult, opts) { const d = orig.apply(this, arguments); if (pred(src, dst, mult, opts || {})) { rec.n++; rec.dmg += d; rec.per.set(dst, (rec.per.get(dst) || 0) + 1); } return d; };
      rec.stop = () => { window.dealDamage = orig; };
      return rec;
    }
  };
}

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>' + fs.readFileSync(path.join(WEB, 'index.html'), 'utf8') + '</body></html>' });
    const f = path.join(WEB, decodeURIComponent(u.pathname));
    return f.startsWith(WEB) && fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' });
  });
  if (THREE_DIR) {
    await page.route(/three\.min\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'build/three.min.js') }));
    await page.route(/GLTFLoader\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/loaders/GLTFLoader.js') }));
    await page.route(/SkeletonUtils\.js/, r => r.fulfill({ path: path.join(THREE_DIR, 'examples/js/utils/SkeletonUtils.js') }));
  }
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(ORIGIN + '/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); });
  await page.reload();
  if (!(await page.evaluate(() => !!window.__vkkt))) throw new Error('Game không khởi động:\n' + errors.join('\n'));
  await page.click('#btn-enter');
  await page.evaluate(installHelpers);
  const V = (fn, arg) => page.evaluate(fn, arg);

  // ---------- 0. Registry
  console.log('\n0. TraitRegistry');
  const reg = await V(() => {
    const K = window.__vkkt, T = K.TRAITS, ids = Object.keys(T);
    const per = {}; ids.forEach(id => { per[id] = K.CHAMPIONS.filter(c => K.TraitRegistry.of(c).includes(id)).map(c => c.cost); });
    return { errs: K.TraitRegistry.validate(K.CHAMPIONS), origins: ids.filter(i => T[i].kind === 'origin'), classes: ids.filter(i => T[i].kind === 'class'), per,
      bad: K.CHAMPIONS.filter(c => !T[c.origin] || T[c.origin].kind !== 'origin' || !c.traits.length || c.traits.some(t => T[t].kind !== 'class')).map(c => c.id),
      multi: K.CHAMPIONS.filter(c => c.traits.length > 1).map(c => c.id), validate: K.validateChampions() };
  });
  Object.entries(reg.per).forEach(([id, costs]) => console.log(`   ${id.padEnd(7)} ${costs.length} tướng – bậc ${costs.sort().join(',')}`));
  check(reg.errs.length === 0 && reg.validate.length === 0, 'cấu hình tộc/hệ hợp lệ (mốc tăng dần, mốc cao nhất đạt được, có tướng bậc 1–2 mở mốc đầu)', reg.errs.concat(reg.validate));
  check(reg.origins.length === 4 && reg.classes.length === 4, '4 tộc + 4 hệ', { origins: reg.origins, classes: reg.classes });
  check(reg.bad.length === 0, 'mỗi tướng có đúng 1 tộc và ≥ 1 hệ', reg.bad);
  check(reg.multi.length >= 2, 'có tướng đặc biệt mang nhiều hệ', reg.multi);

  // ---------- 1–5. TraitCounter
  console.log('\n1–5. Bộ đếm');
  const cnt = await V(() => {
    const K = window.__vkkt, TT = window.TT, out = {};
    TT.board([['kiemdong', 1, 0, 3], ['kiemdong', 1, 1, 3]]); out.dup = K.traitCounts();
    TT.board([['kiemdong', 2, 0, 3], ['kiemdong', 3, 1, 3], ['mabinh', 1, 2, 3]]); out.stars = K.traitCounts();
    TT.board([['kiemdong', 1, 0, 3]], [['mabinh', 1]]); out.bench = K.traitCounts();
    const row = () => { const r = document.querySelector('#traits .trait[data-id="kiemtu"]'); return r ? r.querySelector('.cnt').textContent : null; };
    out.rowBench = row();
    K.moveTo({ type: 'bench', i: 0 }, { type: 'tile', c: 3, r: 3 }); out.toBoard = K.traitCounts(); out.rowBoard = row();
    out.onBoardLv = document.querySelector('#traits .trait[data-id="kiemtu"]').classList.contains('on');
    K.sellSrc({ type: 'board', unit: TT.unit('mabinh') }); out.sold = K.traitCounts(); out.rowSold = row();
    K.moveToBench(TT.unit('kiemdong')); K.afterRosterChange(); out.back = K.traitCounts(); out.rowBack = row();
    return out;
  });
  check(cnt.dup.kiemtu === 1 && cnt.dup.nhan === 1, '1. hai Kiếm Đồng cùng tên chỉ tính 1', cnt.dup);
  check(cnt.stars.kiemtu === 2 && cnt.stars.nhan === 1 && cnt.stars.ma === 1, '2. ★2 + ★3 cùng tướng vẫn tính 1 (Kiếm Tu = 2 với Ma Binh)', cnt.stars);
  check(cnt.bench.kiemtu === 1 && !cnt.bench.ma && cnt.rowBench && cnt.rowBench.startsWith('1'), '3. tướng ở hàng chờ không kích hoạt tộc/hệ', { counts: cnt.bench, ui: cnt.rowBench });
  check(cnt.toBoard.kiemtu === 2 && cnt.rowBoard.startsWith('2') && cnt.onBoardLv, '5. kéo từ hàng chờ lên bàn: số lượng + giao diện cập nhật, Kiếm Tu (2) sáng', { counts: cnt.toBoard, ui: cnt.rowBoard });
  check(cnt.sold.kiemtu === 1 && !cnt.sold.ma && cnt.rowSold.startsWith('1'), '4. bán tướng: số lượng giảm ngay', { counts: cnt.sold, ui: cnt.rowSold });
  check(!cnt.back.kiemtu && cnt.rowBack === null, '5. đưa tướng về hàng chờ: tộc/hệ biến mất khỏi bảng', { counts: cnt.back, ui: cnt.rowBack });

  // ---------- 6. Mốc kích hoạt + công thức chỉ số
  console.log('\n6. Mốc kích hoạt & công thức chỉ số');
  const tiers = await V(() => {
    const K = window.__vkkt, TT = window.TT, bad = [], spots = []; for (let r = 3; r >= 0; r--) for (let c = 0; c < 8; c++) spots.push([c, r]);
    for (const id in K.TRAITS) {
      const T = K.TRAITS[id], mem = K.CHAMPIONS.filter(c => K.TraitRegistry.of(c).includes(id)).map(c => c.id);
      T.tiers.forEach((m, i) => {
        for (const n of [m - 1, m]) {
          TT.board(mem.slice(0, n).map((k, j) => [k, 1, spots[j][0], spots[j][1]]));
          const lv = K.TraitEngine.active[id] || 0, want = n === m ? i + 1 : i;
          if (lv !== want || K.traitCounts()[id] !== n) bad.push(`${id} ${n} tướng → mốc ${lv}, cần ${want}`);
        }
      });
    }
    return bad;
  });
  check(tiers.length === 0, 'mọi tộc/hệ: đủ m tướng thì bật mốc m, thiếu 1 thì chưa bật', tiers);
  const formula = await V(() => {
    const K = window.__vkkt, TT = window.TT, bad = [], keys = K.CHAMPION_KEYS, S = K.STAR;
    for (let n = 0; n < 50; n++) {
      const size = 2 + Math.floor(Math.random() * 8), pick = [], spots = [];
      for (let r = 3; r >= 0; r--) for (let c = 0; c < 8; c++) spots.push([c, r]);
      while (pick.length < size) { const k = keys[Math.floor(Math.random() * keys.length)]; pick.push([k, 1 + Math.floor(Math.random() * 3)]); }
      TT.board(pick.map(([k, s], j) => [k, s, spots[j][0], spots[j][1]]));
      // Tính độc lập: đếm tướng khác nhau → mốc → cộng % theo phạm vi
      const uniq = [...new Set(pick.map(p => p[0]))], cnt = {};
      uniq.forEach(k => K.TraitRegistry.of(K.UNIT_DEFS[k]).forEach(t => { cnt[t] = (cnt[t] || 0) + 1; }));
      for (const u of K.boardAllies()) {
        const d = K.UNIT_DEFS[u.key], mine = K.TraitRegistry.of(d), s = { atk: 0, hp: 0, def: 0, aspd: 0, skill: 0, omni: 0, mana: 0, heal: 0 };
        for (const id in cnt) { let lv = 0; K.TRAITS[id].tiers.forEach((m, i) => { if (cnt[id] >= m) lv = i + 1; }); if (!lv) continue; const L = K.TRAITS[id].levels[lv - 1]; if (L.scope === 'team' || mine.includes(id)) for (const k in L.stats) s[k] += L.stats[k]; }
        const exp = { hp: Math.round(d.hp * S.hp[u.star] * (1 + s.hp)), atk: Math.round(d.atk * S.atk[u.star] * (1 + s.atk) * 10) / 10, def: Math.round(d.def * (1 + s.def)), aspd: d.aspd * (1 + s.aspd), skill: 1 + s.skill, omni: s.omni, mana: 1 + s.mana, heal: 1 + s.heal };
        const got = { hp: u.maxHp, atk: u.atk, def: u.def_, aspd: u.aspdNow(), skill: u.bonus.skill, omni: u.bonus.omni, mana: u.bonus.manaGain, heal: u.bonus.heal };
        for (const k in exp) if (Math.abs(exp[k] - got[k]) > 1e-6) { bad.push(`${u.key}★${u.star} ${k}: ${got[k]} ≠ ${exp[k]}`); break; }
      }
    }
    return bad;
  });
  check(formula.length === 0, '50 đội hình ngẫu nhiên: máu / công / giáp / tốc đánh / kỹ năng / hút máu / năng lượng / hồi máu khớp công thức tính độc lập', formula.slice(0, 5));

  // ---------- 7. Không cộng dồn
  console.log('\n7. Không cộng dồn');
  const stack = await V(() => {
    const K = window.__vkkt, TT = window.TT, snap = () => K.boardAllies().map(u => [u.key, u.maxHp, u.atk, u.def_, +u.aspdNow().toFixed(6), u.bonus.skill].join('|')).sort().join(';');
    TT.board([['kiemdong', 1, 0, 3], ['mabinh', 1, 1, 3], ['thanhphong', 1, 2, 3], ['ngukiem', 1, 3, 3], ['thietve', 1, 4, 3], ['huyengiap', 1, 5, 3], ['thanhmoc', 1, 1, 1], ['linhy', 1, 2, 1], ['huyenbang', 1, 3, 1]]);
    const a = snap(), rec0 = K.TraitCounter.recounts;
    for (let i = 0; i < 60; i++) K.ui.update();
    const b = snap(), recUi = K.TraitCounter.recounts - rec0;
    const shields = [];
    for (let r = 0; r < 3; r++) { TT.fight(); shields.push(K.boardAllies().map(u => Math.round(u.shield)).join(',')); K.simulate(3); TT.end(); }
    const c = snap();
    const rec1 = K.TraitCounter.recounts; TT.fight(); K.simulate(8); const recFight = K.TraitCounter.recounts - rec1; TT.end();
    return { same: a === b && b === c, a, c, recUi, recFight, shields };
  });
  check(stack.same, 'chỉ số giống hệt sau 60 lần vẽ lại giao diện và 3 vòng đấu', stack.same ? undefined : { a: stack.a, c: stack.c });
  check(new Set(stack.shields).size === 1, 'lá chắn đầu trận giống nhau mỗi vòng (không cộng dồn)', stack.shields);
  check(stack.recUi === 0 && stack.recFight === 0, 'không đếm lại tộc/hệ khi vẽ giao diện hay trong trận (chỉ khi đội hình đổi)', { ui: stack.recUi, fight: stack.recFight });

  // ---------- 8. Hiệu ứng thật
  console.log('\n8. Hồi máu / lá chắn / hút máu / năng lượng / tốc đánh');
  const fx = await V(() => {
    const K = window.__vkkt, TT = window.TT, out = {};
    // Tiên Tộc 4 → lá chắn 10%; 6 → 20%
    TT.board([['thanhmoc', 1, 0, 3], ['linhy', 1, 1, 3], ['ngukiem', 1, 2, 3], ['huyenbang', 1, 3, 3]]); TT.fight();
    out.tien4 = K.boardAllies().map(u => +(u.shield / u.maxHp).toFixed(4)); TT.end();
    TT.board([['thanhmoc', 1, 0, 3], ['linhy', 1, 1, 3], ['ngukiem', 1, 2, 3], ['huyenbang', 1, 3, 3], ['kiemtien', 1, 4, 3], ['thannu', 1, 5, 3]]); TT.fight();
    out.tien6 = K.boardAllies().map(u => +(u.shield / u.maxHp).toFixed(4)); TT.end();
    // Hộ Pháp 4: đồng minh đứng cạnh (kể cả chéo) nhận 8%, đứng xa không nhận
    TT.board([['thietve', 1, 0, 3], ['huyengiap', 1, 1, 3], ['huyetma', 1, 2, 3], ['loithuong', 1, 3, 3], ['kiemdong', 1, 4, 2], ['linhcung', 1, 7, 0]]); TT.fight();
    out.guardNear = +(TT.unit('kiemdong').shield / TT.unit('kiemdong').maxHp).toFixed(4); out.guardFar = TT.unit('linhcung').shield;
    out.guardSelf = ['thietve', 'huyengiap', 'huyetma', 'loithuong'].map(k => +(TT.unit(k).shield / TT.unit(k).maxHp).toFixed(4)); TT.end();
    // Ma Tộc 2: hút máu toàn phần 8% (cả kỹ năng), tướng không thuộc Ma Tộc không hút
    TT.board([['mabinh', 1, 0, 3], ['huyetma', 1, 1, 3], ['kiemdong', 1, 2, 3]]); TT.fight(); TT.passiveAllies();
    const mb = TT.unit('mabinh'), kd = TT.unit('kiemdong'), foe = K.units.find(u => u.team === 'enemy');
    mb.hp = Math.round(mb.maxHp * 0.5); kd.hp = Math.round(kd.maxHp * 0.5);
    let h0 = mb.hp, d = K.dealDamage(mb, foe, 1, { skill: true }); out.maSkill = { heal: +(mb.hp - h0).toFixed(3), want: +(d * 0.08).toFixed(3) };
    h0 = mb.hp; d = K.dealDamage(mb, foe, 0.3, { dot: true }); out.maDot = { heal: +(mb.hp - h0).toFixed(3), want: +(d * 0.08).toFixed(3) };
    h0 = kd.hp; K.dealDamage(kd, foe, 1, { skill: true }); out.nonMa = kd.hp - h0;
    TT.end();
    // Tiên Tộc 2: năng lượng nhận được +10% (đòn thường gây sát thương: 10 → 11)
    TT.board([['thanhmoc', 1, 0, 3], ['linhy', 1, 1, 3], ['kiemdong', 1, 2, 3]]); TT.fight(); TT.passiveAllies();
    const tm = TT.unit('thanhmoc'), k2 = TT.unit('kiemdong'); tm.maxMana = k2.maxMana = 200; tm.mana = k2.mana = 0;
    K.dealDamage(tm, foe && K.units.find(u => u.team === 'enemy'), 1, {}); K.dealDamage(k2, K.units.find(u => u.team === 'enemy'), 1, {});
    out.mana = { tien: +tm.mana.toFixed(3), other: +k2.mana.toFixed(3) }; TT.end();
    // Đan Tu 2 / 4: hiệu quả hồi máu +15% / +50%
    TT.board([['thanhmoc', 1, 0, 3], ['hoa', 1, 1, 3], ['kiemdong', 1, 2, 3]]); TT.fight(); TT.passiveAllies();
    let t = TT.unit('kiemdong'); t.hp = 10; out.dan2 = K.healUnit(TT.unit('thanhmoc'), t, 100); t.hp = 10; out.dan2other = K.healUnit(t, t, 100); TT.end();
    TT.board([['thanhmoc', 1, 0, 3], ['hoa', 1, 1, 3], ['linhy', 1, 2, 3], ['batdiet', 1, 3, 3], ['kiemdong', 1, 4, 3]]); TT.fight(); TT.passiveAllies();
    t = TT.unit('kiemdong'); t.hp = 10; out.dan4 = K.healUnit(TT.unit('linhy'), t, 100);
    // Đan Tu 4: lần đầu xuống dưới 30% → hồi 12% máu tối đa trong 3 giây, chỉ 1 lần mỗi trận
    t.hp = t.maxHp; t.shield = 0; const foe2 = K.units.find(u => u.team === 'enemy');
    const before = K.combatLog.traitLowHeals || 0;
    K.dealDamage(foe2, t, 0, { flat: t.maxHp * 0.75, pen: 1, crit: false, proc: true });
    const hpAfterHit = t.hp; K.simulate(3.6); out.lowHeal = { gained: +((t.hp - hpAfterHit) / t.maxHp).toFixed(4), triggers: (K.combatLog.traitLowHeals || 0) - before };
    t.hp = t.maxHp * 0.5; K.dealDamage(foe2, t, 0, { flat: t.maxHp * 0.3, pen: 1, crit: false, proc: true }); K.simulate(0.2);
    out.lowHealAgain = (K.combatLog.traitLowHeals || 0) - before; TT.end();
    // Nhân Tộc 2: toàn đội +5% tốc đánh (cả tướng không phải Nhân Tộc); Yêu Tộc 2: +8% máu
    TT.board([['kiemdong', 1, 0, 3], ['thietve', 1, 1, 3], ['mabinh', 1, 2, 3], ['hoa', 1, 3, 3], ['linhcung', 1, 4, 3]]);
    const mbu = TT.unit('mabinh'), ho = TT.unit('hoa');
    out.nhan = +(mbu.aspdNow() / K.UNIT_DEFS.mabinh.aspd).toFixed(4); out.yeu = +(ho.maxHp / K.UNIT_DEFS.hoa.hp).toFixed(4);
    return out;
  });
  console.log('   ' + JSON.stringify(fx));
  check(fx.tien4.every(x => Math.abs(x - 0.10) < 0.002) && fx.tien6.every(x => Math.abs(x - 0.20) < 0.002), 'Tiên Tộc (4) lá chắn 10%, (6) lá chắn 20% máu tối đa khi vào trận', { t4: fx.tien4, t6: fx.tien6 });
  check(Math.abs(fx.guardNear - 0.08) < 0.002 && fx.guardFar === 0, 'Hộ Pháp (4): đồng minh đứng cạnh nhận lá chắn 8%, đứng xa không nhận', { near: fx.guardNear, far: fx.guardFar });
  check(fx.guardSelf.every(x => Math.abs(x - 0.08) < 0.002), 'Hộ Pháp đứng cạnh nhau cũng che cho nhau (đồng minh cạnh mỗi Hộ Pháp)', fx.guardSelf);
  check(Math.abs(fx.maSkill.heal - fx.maSkill.want) < 0.01 && fx.maSkill.heal > 0 && Math.abs(fx.maDot.heal - fx.maDot.want) < 0.01 && fx.nonMa === 0, 'Ma Tộc (2): hút máu toàn phần 8% cả kỹ năng và sát thương theo thời gian; tướng khác không hút', { skill: fx.maSkill, dot: fx.maDot, other: fx.nonMa });
  check(Math.abs(fx.mana.tien - 11) < 0.01 && Math.abs(fx.mana.other - 10) < 0.01, 'Tiên Tộc (2): năng lượng nhận được +10% (10 → 11)', fx.mana);
  check(Math.round(fx.dan2) === 115 && Math.round(fx.dan2other) === 100 && Math.round(fx.dan4) === 150, 'Đan Tu (2) hồi máu ×1,15, (4) ×1,5; người không thuộc Đan Tu hồi bình thường', { dan2: fx.dan2, other: fx.dan2other, dan4: fx.dan4 });
  check(Math.abs(fx.lowHeal.gained - 0.12) < 0.002 && fx.lowHeal.triggers === 1 && fx.lowHealAgain === 1, 'Đan Tu (4): xuống dưới 30% máu → hồi đúng 12% trong 3 giây, chỉ 1 lần mỗi trận', { first: fx.lowHeal, total: fx.lowHealAgain });
  check(Math.abs(fx.nhan - 1.05) < 1e-4 && Math.abs(fx.yeu - 1.08) < 0.003, 'Nhân Tộc (2) toàn đội +5% tốc đánh (cả tướng Ma Tộc); Yêu Tộc (2) +8% máu', { nhan: fx.nhan, yeu: fx.yeu });

  // ---------- 9. Phi kiếm & Pháp Tu nổ
  console.log('\n9. Phi kiếm phụ Kiếm Tu & Pháp Tu (6)');
  const procs = await V(() => {
    const K = window.__vkkt, TT = window.TT, out = {};
    const castOnce = (key, extra = 4) => {
      const u = TT.unit(key); u.atkCd = 1e9; u.maxMana = 100; u.mana = 100;
      let t = 0; while (t < 6 && !(u.casting)) { K.simulate(0.05); t += 0.05; }
      let rest = 0; while (rest < extra) { K.simulate(0.05); rest += 0.05; }
      return u;
    };
    for (const [lv, list] of [[4, ['kiemdong', 'mabinh', 'thanhphong', 'ngukiem']], [6, ['kiemdong', 'mabinh', 'thanhphong', 'ngukiem', 'anhsat', 'vocuc']]]) {
      TT.board(list.map((k, i) => [k, 1, i, 3])); TT.fight(); TT.passiveAllies();
      const sp = TT.spy((src, dst, m, o) => src.key === 'kiemdong' && o.proc && o.flat === undefined);
      const l0 = K.combatLog.traitSwords || 0, h0 = K.combatLog.traitSwordHits || 0;
      castOnce('kiemdong');
      sp.stop();
      out['kiem' + lv] = { launched: (K.combatLog.traitSwords || 0) - l0, hits: (K.combatLog.traitSwordHits || 0) - h0, dmgCalls: sp.n, maxPerTarget: Math.max(0, ...sp.per.values()), left: K.TraitSwords.list.length };
      TT.end();
    }
    // Kiếm 4 nhưng mục tiêu chết khi kiếm đang bay → đổi mục tiêu, không lỗi
    TT.board([['kiemdong', 1, 0, 3], ['mabinh', 1, 1, 3], ['thanhphong', 1, 2, 3], ['ngukiem', 1, 3, 3]]); TT.fight(); TT.passiveAllies();
    { const u = TT.unit('kiemdong'); u.mana = u.maxMana = 100; let t = 0; while (t < 6 && !K.TraitSwords.list.length) { K.simulate(0.02); t += 0.02; }
      const s = K.TraitSwords.list[0]; if (s && s.target) { s.target.hp = 0; s.target.fsm.set('dead'); onUnitDeath(s.target); } else if (s) { const e = K.units.find(x => x.team === 'enemy' && x.alive); e.hp = 0; e.fsm.set('dead'); onUnitDeath(e); }
      K.simulate(2); out.retarget = { left: K.TraitSwords.list.length }; }
    TT.end();
    // Pháp Tu 6 + Cửu Viêm Hỏa Trận (8 nhịp) → mỗi mục tiêu chỉ nổ 1 lần / lần thi triển
    TT.board([['hoa', 1, 0, 3], ['linhcung', 1, 1, 3], ['bangling', 1, 2, 3], ['cuuviem', 1, 3, 2], ['huyenbang', 1, 4, 3], ['loiton', 1, 5, 3]]);
    TT.fight([['mathu', 3, 4, 1], ['mathu', 4, 4, 1], ['uminh', 3, 5, 1]]); TT.passiveAllies();
    const sp = TT.spy((src, dst, m, o) => src.key === 'cuuviem' && o.flat !== undefined);
    const ticks0 = K.combatLog.zoneTicks || 0;
    castOnce('cuuviem', 4.5);
    out.mage1 = { bursts: sp.n, perTarget: [...sp.per.values()], zoneTicks: (K.combatLog.zoneTicks || 0) - ticks0, flatOk: true };
    const cv = TT.unit('cuuviem'); cv.mana = cv.maxMana; castOnce('cuuviem', 4.5);
    out.mage2 = { bursts: sp.n, perTarget: [...sp.per.values()] };
    sp.stop();
    // Độ lớn: 5% máu tối đa (bỏ qua giáp)
    const foe = K.units.find(u => u.team === 'enemy' && u.alive);
    if (foe) { foe.shield = 0; const h0 = foe.hp; const sp2 = TT.spy((s, d, m, o) => o.flat !== undefined); cv.tstate.castSeq++; K.dealDamage(cv, foe, 0.01, { skill: true, crit: false }); sp2.stop(); out.burstSize = +(sp2.dmg / foe.maxHp).toFixed(4); out.burstWant = +(0.05 * K.defenseFactor(foe.mrNow()) * foe.fx.mul('dmgTaken')).toFixed(4); }
    TT.end();
    return out;
  });
  console.log('   ' + JSON.stringify(procs));
  check(procs.kiem4.launched === 1 && procs.kiem4.hits === 1 && procs.kiem4.dmgCalls === 1, 'Kiếm Tu (4): mỗi lần tung kỹ năng 1 phi kiếm phụ, trúng đúng 1 lần', procs.kiem4);
  check(procs.kiem6.launched === 3 && procs.kiem6.hits === 3 && procs.kiem6.dmgCalls === 3 && procs.kiem6.maxPerTarget <= 1 + 2, 'Kiếm Tu (6): 3 phi kiếm phụ, mỗi kiếm trúng đúng 1 lần', procs.kiem6);
  check(procs.kiem4.left === 0 && procs.kiem6.left === 0 && procs.retarget.left === 0, 'phi kiếm không còn sót lại; mục tiêu chết giữa đường thì kiếm đổi mục tiêu / tự huỷ', procs.retarget);
  check(procs.mage1.zoneTicks >= 4 && procs.mage1.perTarget.every(n => n === 1) && procs.mage1.bursts >= 1, 'Pháp Tu (6): hỏa trận nhiều nhịp nhưng mỗi mục tiêu chỉ nổ 1 lần / lần thi triển', procs.mage1);
  check(procs.mage2.perTarget.every(n => n <= 2) && procs.mage2.bursts > procs.mage1.bursts, 'lần thi triển thứ 2 được nổ lại (mỗi mục tiêu tối đa 1 lần / lần)', procs.mage2);
  check(Math.abs(procs.burstSize - procs.burstWant) < 0.003, 'sát thương nổ = 5% máu tối đa mục tiêu, sát thương phép (trừ theo kháng phép)', { got: procs.burstSize, want: procs.burstWant });

  // ---------- 10. Dọn dẹp
  console.log('\n10. Dọn VFX / sự kiện sau trận');
  const clean = await V(() => {
    const K = window.__vkkt, TT = window.TT;
    TT.board([['kiemdong', 1, 0, 3], ['mabinh', 1, 1, 3], ['thanhphong', 1, 2, 3], ['ngukiem', 1, 3, 3], ['thietve', 1, 4, 3], ['huyengiap', 1, 5, 3], ['huyetma', 1, 6, 3], ['loithuong', 1, 7, 3], ['hoa', 1, 3, 1]]);
    K.QualityManager.level = 'ULTRA';
    const c0 = K.scene.children.length;
    TT.fight(); K.boardAllies().forEach(u => { u.mana = u.maxMana; });
    const during = { events: K.TraitEvents.size(), auras: K.TraitVFX.auras.length, effects: K.vfx.effects.length };
    K.simulate(1.2);
    const mid = { swords: K.TraitSwords.list.length };
    // kết thúc trận thật (giết hết địch) để đi đúng đường checkBattleEnd
    K.units.filter(u => u.team === 'enemy').forEach(e => { e.hp = 0; e.fsm.set('dead'); onUnitDeath(e); });
    K.simulate(0.1);
    const atEnd = { phase: K.battle.phase, events: K.TraitEvents.size(), swords: K.TraitSwords.list.length, swarm: K.TraitSwords.swarm.solid.count, auras: K.TraitVFX.auras.length, inBattle: K.TraitEngine.inBattle,
      traitFx: K.units.reduce((a, u) => a + u.fx.list.filter(e => e.tag && e.tag.startsWith('trait:')).length, 0) };
    K.nextRound(); K.battle.round = 1; K.setupRound();   // cùng vòng 1 như lúc đo c0 → cùng số quân địch
    const after = { effects: K.vfx.effects.length, active: K.vfx.active.size, children: K.scene.children.length, c0 };
    K.QualityManager.level = 'MEDIUM';
    return { during, mid, atEnd, after };
  });
  console.log('   ' + JSON.stringify(clean));
  check(clean.during.events > 0 && clean.during.auras > 0, 'trong trận: hiệu ứng tộc/hệ đã đăng ký sự kiện + hào quang (ULTRA)', clean.during);
  check(clean.atEnd.phase === 'end' && clean.atEnd.events === 0 && clean.atEnd.swords === 0 && clean.atEnd.swarm === 0 && clean.atEnd.auras === 0 && !clean.atEnd.inBattle && clean.atEnd.traitFx === 0, 'hết trận: gỡ sạch sự kiện, phi kiếm, hào quang, hiệu ứng tạm thời của tộc/hệ', clean.atEnd);
  check(clean.after.effects === 0 && clean.after.active === 0 && clean.after.children === clean.after.c0, 'vòng mới: không còn VFX, số object trong scene như cũ', clean.after);

  // ---------- 14. Mục tiêu chết giữa chiêu khi mọi hiệu ứng tộc/hệ bật
  console.log('\n14. Đội hình kích hoạt nhiều tộc/hệ – giết mục tiêu giữa chiêu');
  const comps = {
    'Kiếm Tu 6 + Ma Tộc 4': ['kiemdong', 'mabinh', 'thanhphong', 'ngukiem', 'anhsat', 'vocuc', 'huyetma', 'kiemtien', 'thietve'],
    'Pháp Tu 6 + Yêu Tộc 6': ['hoa', 'linhcung', 'bangling', 'cuuviem', 'huyenbang', 'loiton', 'umaquan', 'huyengiap', 'batdiet'],
    'Hộ Pháp 6 + Nhân Tộc 6': ['thietve', 'huyengiap', 'huyetma', 'loithuong', 'kimcuong', 'batdiet', 'kiemdong', 'thanhphong', 'loiton'],
    'Đan Tu 4 + Tiên Tộc 6': ['thanhmoc', 'hoa', 'linhy', 'thannu', 'batdiet', 'ngukiem', 'huyenbang', 'kiemtien', 'kimcuong']
  };
  for (const [name, list] of Object.entries(comps)) {
    const r = await V(([list]) => {
      const K = window.__vkkt, TT = window.TT, errs = [];
      TT.board(list.map((k, i) => [k, 2, i % 8, 3 - Math.floor(i / 8) * 2]));
      const active = Object.assign({}, K.TraitEngine.active);
      K.battle.round = 9; K.setupRound(); K.startBattle();
      K.boardAllies().forEach(u => { u.mana = u.maxMana; });
      let t = 0, killed = 0;
      while (K.battle.phase === 'fight' && t < 60) {
        K.simulate(0.1); t += 0.1;
        // giết mục tiêu của mọi tướng đang thi triển (tối đa 4 lần)
        if (killed < 4) for (const u of K.boardAllies()) if (u.fsm.name === 'cast' && u.target && u.target.alive && u.target.team === 'enemy') { const tg = u.target; tg.hp = 0; tg.fsm.set('dead'); onUnitDeath(tg); killed++; break; }   // giữ tham chiếu: chết thì mọi tướng bỏ mục tiêu này (u.target = null)
        for (const u of K.units) if (Number.isNaN(u.hp) || u.hp > u.maxHp + 1e-6 || u.mana > u.maxMana + 1e-6) errs.push(u.key + ' chỉ số lỗi');
        if (errs.length) break;
      }
      const res = { active, phase: K.battle.phase, result: K.battle.result, t: +t.toFixed(1), killed, errs, log: { swords: K.combatLog.traitSwordHits || 0, bursts: K.combatLog.traitBursts || 0, shields: K.combatLog.traitShields || 0, lowHeals: K.combatLog.traitLowHeals || 0, omni: Math.round(K.combatLog.omniHealed || 0) } };
      if (K.battle.phase === 'fight') { K.battle.phase = 'end'; K.TraitEngine.battleEnd(); }
      K.nextRound();
      return res;
    }, [list]);
    console.log(`   ${name}: mốc ${JSON.stringify(r.active)} → ${r.result || r.phase} sau ${r.t} s, giết giữa chiêu ${r.killed} lần · log ${JSON.stringify(r.log)}`);
    check(r.errs.length === 0 && r.phase === 'end', `[${name}] trận kết thúc bình thường, không lỗi chỉ số`, r.errs.slice(0, 3));
  }

  // ---------- 15. Tốc độ ×1 và ×2 (vòng lặp thời gian thực, không tua nhanh)
  console.log('\n15. Tốc độ ×1 / ×2');
  const speedRun = speed => V(async speed => {
    const K = window.__vkkt, TT = window.TT;
    TT.board([['thanhmoc', 1, 0, 3], ['hoa', 1, 1, 3], ['linhy', 1, 2, 3], ['batdiet', 1, 3, 3], ['kiemdong', 1, 4, 3], ['mabinh', 1, 5, 3], ['thanhphong', 1, 6, 3], ['ngukiem', 1, 7, 3]]);
    TT.fight(); TT.passiveAllies(); K.battle.speed = speed;
    const t = TT.unit('kiemdong'), foe = K.units.find(u => u.team === 'enemy');
    t.shield = 0; K.dealDamage(foe, t, 0, { flat: t.maxHp * 0.75, pen: 1, crit: false, proc: true });
    const hp0 = t.hp, sim0 = K.battle.time;
    const kd = t; kd.atkCd = 1e9; kd.maxMana = 100; kd.mana = 100;   // tung chiêu → phi kiếm Kiếm Tu (4)
    const h0 = K.combatLog.traitSwordHits || 0;
    await new Promise(res => { const wait = () => (K.battle.time - sim0 >= 4 ? res() : requestAnimationFrame(wait)); wait(); });
    const out = { healed: +((t.hp - hp0) / t.maxHp).toFixed(4), swordHits: (K.combatLog.traitSwordHits || 0) - h0, sim: +(K.battle.time - sim0).toFixed(2) };
    K.battle.speed = 1; TT.end();
    return out;
  }, speed);
  const s1 = await speedRun(1), s2 = await speedRun(2);
  console.log('   ×1:', JSON.stringify(s1), ' ×2:', JSON.stringify(s2));
  check(s1.healed === s2.healed && Math.abs(s1.healed - 0.12) < 0.002, 'Đan Tu hồi 12% như nhau ở ×1 và ×2', { x1: s1.healed, x2: s2.healed });
  check(s1.swordHits === s2.swordHits && s1.swordHits === 1, 'phi kiếm Kiếm Tu trúng như nhau ở ×1 và ×2', { x1: s1.swordHits, x2: s2.swordHits });

  // ---------- 12. Bản lưu cũ
  console.log('\n12. Bản lưu cũ');
  await V(() => {
    localStorage.setItem('vkkt_save', JSON.stringify({ v: 1, hp: 80, gold: 12, level: 6, xp: 0, streak: 0, round: 5, over: false, items: [], rivals: {}, shop: null,
      bench: [{ key: 'uhon', star: 1, items: [] }, null, null, null, null, null, null, null, null],
      board: [{ key: 'loi', star: 1, c: 2, r: 3, items: [] }, { key: 'hophap', star: 2, c: 3, r: 3, items: [] }, { key: 'anhkiem', star: 1, c: 4, r: 3, items: [] }, { key: 'kiemtien', star: 1, c: 5, r: 3, items: [] }] }));
  });
  await page.reload(); await page.waitForFunction(() => !!window.__vkkt);
  const old = await V(() => { const K = window.__vkkt; return { counts: K.traitCounts(), keys: K.boardAllies().map(u => u.key).sort(), rows: [...document.querySelectorAll('#traits .trait')].map(e => e.dataset.id + ':' + e.querySelector('.cnt').textContent) }; });
  console.log('   ' + JSON.stringify(old));
  check(old.counts.phaptu === 1 && old.counts.hophap === 2 && old.counts.kiemtu === 1 && old.counts.yeu === 1 && old.counts.ma === 1 && old.counts.tien === 1 && old.counts.nhan === 1 && old.rows.length === 7,
    'bản lưu tuần 1 tải được, tộc/hệ tính theo dữ liệu mới và hiện đủ trên bảng', old);

  // ---------- 13. Console
  console.log('\n13. Lỗi console');
  check(errors.length === 0, 'không có lỗi console / pageerror', errors.slice(0, 5));
  await browser.close();
  if (failures.length) { console.log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  console.log('\n✓ Hệ thống 8 tộc/hệ: đếm, mốc, công thức chỉ số, hiệu ứng thật, phi kiếm, Pháp Tu nổ, dọn dẹp, tốc độ ×1/×2, bản lưu cũ – đều đạt.');
}
main().catch(e => { console.error(e); process.exit(1); });
