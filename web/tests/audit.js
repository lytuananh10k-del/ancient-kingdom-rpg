// Kiểm tra toàn diện từng tướng (V1.5 FINAL – tuần 4): 15 hạng mục × 24 tướng, độc lập và trong đội hình.
//  1 cửa hàng đúng bậc · 2 giá mua / bán · 3 chỉ số hợp lệ · 4 nâng sao · 5 tầm đánh · 6 mục tiêu hợp lệ · 7 kỹ năng khi đủ năng lượng
//  8 kỹ năng có hiệu quả · 9 animation khớp sát thương · 10 chết khi máu 0 · 11 không tướng vô hình sau trận · 12 không đứng yên vĩnh viễn
//  13 hết khống chế đúng lúc · 14 đổi mục tiêu khi mục tiêu chết · 15 nhiều kỹ năng cùng lúc
// Xuất docs/QA-CHAMPIONS.md + docs/reports/qa-champions.json.  Chạy: cd web && npm run test:audit
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';

/** Chạy trong trang: 15 hạng mục cho một tướng. Trả về { checks: {1..15: {ok, note}} }. */
function auditChampion(key) {
  const K = window.__vkkt, R = K.CombatTestRunner, g = K.game, D = K.UNIT_DEFS[key], S = K.STAR, out = {};
  const put = (n, ok, note) => { out[n] = { ok: !!ok, note: note || '' }; };
  const endFight = () => { if (K.battle.phase === 'fight') { K.battle.phase = 'end'; K.TraitEngine.battleEnd(); } K.nextRound(); };
  // 1. cửa hàng
  K.newGame(); g.rivals = {}; g.level = 9; let seen = 0;
  for (let i = 0; i < 1500 && !seen; i++) { K.rollShop(); if (g.shop.includes(key)) seen = 1; }
  put(1, seen && K.SHOP_POOL[D.cost].includes(key), `bậc ${D.cost}`);
  // 2. giá
  K.newGame(); g.gold = 50; g.bench.fill(null); g.shop[0] = key; K.buyShop(0);
  const bi = g.bench.findIndex(e => e && e.key === key), afterBuy = g.gold; K.sellSrc({ type: 'bench', i: bi });
  put(2, afterBuy === 50 - D.cost && g.gold === 50 && K.sellPrice(key, 2) === D.cost * 3 - 1 && K.sellPrice(key, 3) === D.cost * 9 - 1, `mua ${D.cost}, bán ★1/★2/★3 ${D.cost}/${K.sellPrice(key, 2)}/${K.sellPrice(key, 3)}`);
  // 3. chỉ số
  const nums = ['hp', 'atk', 'def', 'ap', 'mr', 'aspd', 'range', 'speed', 'mana0', 'mana', 'crit', 'critDmg', 'dodge'];
  const badN = nums.filter(f => typeof D[f] !== 'number' || !Number.isFinite(D[f]) || D[f] < 0);
  put(3, !badN.length && D.mana0 < D.mana && D.hp > 0 && D.atk > 0, badN.join(',') || `máu ${D.hp} công ${D.atk} giáp ${D.def} kháng ${D.mr}`);
  // 4. nâng sao (chỉ số theo STAR, không tộc/hệ)
  K.newGame(); for (const u of K.boardAllies()) K.removeUnit(u);
  const st = [1, 2, 3].map(s => { const u = K.placeUnit(key, s, s, 0); u.bonus = K.defaultBonus(); u.reset(1); const r = { hp: u.maxHp, atk: u.atk, ap: u.ap_ }; K.removeUnit(u); return r; });
  const near = (a, b) => Math.abs(a - b) <= b * 0.01 + 1;
  put(4, near(st[1].hp, st[0].hp * S.hp[2]) && near(st[2].hp, st[0].hp * S.hp[3]) && near(st[1].atk, st[0].atk * S.atk[2]) && near(st[2].atk, st[0].atk * S.atk[3]) && near(st[2].ap, 100 * S.skill[3]),
    `máu ${st.map(x => x.hp).join('/')} · công ${st.map(x => x.atk).join('/')} · AP ${st.map(x => x.ap).join('/')}`);
  // 5–9, 12: trận độc lập (tướng ★2 + đồng minh phụ vs 3 địch), đo tầm đánh, mục tiêu, năng lượng, đồng bộ animation
  const atk = []; let badTarget = 0;
  const L = K.TraitEvents;
  const sp0 = K.combatLog.syncMaxErr; K.combatLog.syncMaxErr = 0; K.combatLog.syncChecks = 0;
  const casts0 = K.combatLog.casts[D.skill] || 0;
  const r = R.run({ allies: [[key, 2, 3, 2], ['thietve', 1, 4, 3]], enemies: [['mathu', 1, 3, 5], ['uminh', 1, 5, 6], ['huyetkiem', 1, 2, 6]], seed: 17, keepState: true, maxTime: 0.02 });
  L.on('onAttack', (u, t) => { if (u.key !== key) return; atk.push(+Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z).toFixed(2)); if (!t.alive || t.team === u.team) badTarget++; });
  const me = K.units.find(u => u.key === key && u.team === 'ally');
  let zeroHpAlive = 0, stuck = 0, still = 0, lx = me.pos.x, lz = me.pos.z, retarget = null;
  let worstSync = null, lastErr = K.combatLog.syncMaxErr;
  for (let i = 0; i < 40 * 60 && K.battle.phase === 'fight'; i++) {
    K.simulate(K.STEP);
    if (K.combatLog.syncMaxErr > lastErr) { lastErr = K.combatLog.syncMaxErr; worstSync = K.units.filter(u => u.rig.action).map(u => u.team[0] + ':' + u.key + ':' + u.rig.action.name + ':' + u.fsm.name).join(' '); }   // bước logic + cập nhật animation / VFX như vòng lặp thật (để đo đồng bộ tư thế – sát thương)
    for (const u of K.units) if (u.hp <= 0 && u.fsm.name !== 'dead') zeroHpAlive++;
    if (me.alive) {
      const far = me.target && me.target.alive && Math.hypot(me.target.pos.x - me.pos.x, me.target.pos.z - me.pos.z) > me.def.range + 0.45;
      const moved = Math.hypot(me.pos.x - lx, me.pos.z - lz); lx = me.pos.x; lz = me.pos.z;
      if (me.fsm.name === 'move' && far && moved < 0.0005) still += K.STEP; else still = 0;
      stuck = Math.max(stuck, still);
      // 14. ở giây 4: giết mục tiêu hiện tại → phải chọn mục tiêu còn sống khác trong 0,7 s
      if (retarget === null && K.battle.time > 4 && me.fsm.name !== 'cast' && me.target && me.target.alive && K.units.filter(u => u.team === 'enemy' && u.alive).length > 1) {
        const old = me.target; old.hp = 0; old.fsm.set('dead'); onUnitDeath(old); retarget = { at: K.battle.time, old, ok: null };
      }
      if (retarget && retarget.ok === null && me.target && me.target !== retarget.old && me.target.alive) retarget.ok = +(K.battle.time - retarget.at).toFixed(2);
    }
  }
  L.h.onAttack.length = 0;   // gỡ hook kiểm thử
  const tol = me.def.ranged ? me.def.range + 0.4 : me.def.range + 0.4;
  const casts = (K.combatLog.casts[D.skill] || 0) - casts0;
  put(5, atk.length > 0 && atk.every(d => d <= tol), `${atk.length} đòn, xa nhất ${atk.length ? Math.max(...atk) : '-'} m / tầm ${D.range}`);
  put(6, badTarget === 0, badTarget ? badTarget + ' đòn vào mục tiêu không hợp lệ' : 'mọi đòn vào địch còn sống');
  put(7, casts >= 1 && K.CombatAudit.badCasts === 0, `${casts} lần ${D.skill}, thiếu năng lượng: ${K.CombatAudit.badCasts}`);
  put(8, me.cs.dealt + me.cs.healed + me.cs.shielded > 0, `gây ${Math.round(me.cs.dealt)} · hồi ${Math.round(me.cs.healed)} · khiên ${Math.round(me.cs.shielded)}`);
  put(9, K.CombatAudit.doubleHits === 0 && K.combatLog.syncMaxErr <= 1 / 60 + 1e-6, `lệch tư thế–sát thương ${(K.combatLog.syncMaxErr * 1000).toFixed(1)} ms / ${K.combatLog.syncChecks} lần đo, đánh 2 lần: ${K.CombatAudit.doubleHits}` + (window.__auditDebug ? ' @ ' + worstSync : ''));
  put(12, stuck < 2.5, `đứng yên khi chưa tới tầm lâu nhất ${stuck.toFixed(2)} s`);
  put(14, retarget && retarget.ok !== null && retarget.ok <= 0.25, retarget ? `đổi mục tiêu sau ${retarget.ok} s` : 'không thử được');
  K.combatLog.syncMaxErr = Math.max(sp0, K.combatLog.syncMaxErr);
  endFight();
  // 10. chết khi máu 0 · 13. hết khống chế đúng lúc
  R.run({ allies: [[key, 1, 3, 3]], enemies: [['mathu', 1, 3, 5]], seed: 3, keepState: true, maxTime: 0.02 });
  const u2 = K.units.find(u => u.key === key), foe = K.units.find(u => u.team === 'enemy');
  K.units.forEach(u => { u.atkCd = 1e9; u.maxMana = 1e9; });
  u2.ccImmune = 0; K.applyStun(u2, 1.0, 'stun', foe); const want = 1.0 * (1 - u2.tenacity()); let freedAt = null; const t0 = K.battle.time;
  for (let i = 0; i < 120; i++) { K.simStep(K.STEP); if (freedAt === null && u2.fsm.name !== 'stun') freedAt = K.battle.time - t0; }
  put(13, freedAt !== null && Math.abs(freedAt - want) <= 2 / 60 + 1e-6, `choáng ${want.toFixed(2)} s → thoát sau ${freedAt === null ? '—' : freedAt.toFixed(3)} s`);
  u2.shield = 0; K.dealDamage(foe, u2, 0, { flat: u2.hp + 50, type: 'true', crit: false, proc: true });
  put(10, !u2.alive && u2.fsm.name === 'dead' && u2.hp === 0 && u2.fx.list.length === 0, `máu ${u2.hp}, trạng thái ${u2.fsm.name}, hiệu ứng còn ${u2.fx.list.length}, 0 người ${zeroHpAlive} mẫu máu 0 chưa chết`);
  if (zeroHpAlive) out[10].ok = false;
  endFight();
  // 11. không tướng vô hình sau trận (sau khi chết rồi sang vòng mới)
  const vis = K.units.filter(u => !u.rig.root.visible || u.U.uDissolve.value > 0 || !u.alive).map(u => u.key);
  put(11, vis.length === 0, vis.length ? 'vô hình / chưa hồi: ' + vis.join(',') : 'mọi tướng hiện đủ, máu đầy');
  // 15. nhiều kỹ năng cùng lúc: đội 8 có tướng này, mọi tướng đầy năng lượng ngay đầu trận
  const team = [key, 'thietve', 'huyengiap', 'kiemtien', 'loiton', 'cuuviem', 'thannu', 'hondon'].filter((k, i, a) => a.indexOf(k) === i).slice(0, 8);
  const r3 = R.run({ allies: team.map((k, i) => [k, 2, i, i % 2 ? 2 : 3]), enemies: [['mathu', 2, 2, 4], ['mathu', 2, 5, 4], ['uminh', 2, 3, 6], ['huyetkiem', 2, 4, 5], ['uminh', 2, 6, 6]], seed: 23, keepState: true, maxTime: 0.02 });
  K.units.forEach(u => { u.mana = u.maxMana; });
  let errs = 0; const orig = console.error; console.error = (...a) => { errs++; orig.apply(console, a); };
  try { for (let i = 0; i < 25 * 60 && K.battle.phase === 'fight'; i++) K.simStep(K.STEP); } finally { console.error = orig; }
  const meCasts = K.units.find(u => u.key === key && u.team === 'ally').cs.casts;
  put(15, errs === 0 && meCasts >= 1 && K.CombatAudit.nonFinite === 0, `${meCasts} lần tung khi 8 tướng cùng đầy năng lượng, lỗi ${errs}`);
  endFight();
  return { key, name: D.name, cost: D.cost, role: K.ROLES[D.role].name, skill: K.SKILLS[D.skill].name, checks: out };
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
  await page.click('#btn-enter');
  let keys = await page.evaluate(() => window.__vkkt.CHAMPION_KEYS.slice());
  if (process.env.ONLY) { keys = process.env.ONLY.split(','); await page.evaluate(() => { window.__auditDebug = 1; }); }
  const rows = [];
  for (const k of keys) {
    const r = await page.evaluate(auditChampion, k);
    const fails = Object.entries(r.checks).filter(([, c]) => !c.ok);
    rows.push(r);
    console.log(`${(fails.length ? '✗' : '✓')} ${r.name.padEnd(22)} ${Object.keys(r.checks).sort((a, b) => a - b).map(n => (r.checks[n].ok ? '·' : n)).join('')}` + (fails.length ? '  ' + fails.map(([n, c]) => `#${n}: ${c.note}`).join(' | ') : ''));
  }
  const total = rows.reduce((a, r) => a + Object.values(r.checks).filter(c => c.ok).length, 0), all = rows.length * 15;
  const md = ['# Kiểm tra 24 tướng – V1.5 FINAL', '', `> Sinh tự động bởi \`npm run test:audit\` (tests/audit.js). ${total}/${all} hạng mục đạt. Lỗi console: ${errors.length}.`, '',
    'Hạng mục: 1 cửa hàng · 2 giá mua/bán · 3 chỉ số · 4 nâng sao · 5 tầm đánh · 6 mục tiêu hợp lệ · 7 kỹ năng khi đủ năng lượng · 8 kỹ năng có hiệu quả · 9 animation khớp sát thương · 10 chết khi máu 0 · 11 không vô hình sau trận · 12 không đứng yên vĩnh viễn · 13 hết khống chế đúng lúc · 14 đổi mục tiêu · 15 nhiều kỹ năng cùng lúc', '',
    '| Tướng | Giá | Vai trò | Kỹ năng | Kết quả | Ghi chú đo được | Lỗi / xử lý |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) {
    const fails = Object.entries(r.checks).filter(([, c]) => !c.ok);
    md.push(`| ${r.name} | ${r.cost} | ${r.role} | ${r.skill} | ${fails.length ? '**' + (15 - fails.length) + '/15**' : '15/15 PASS'} | ${['5', '7', '8', '9', '13', '14'].map(n => `#${n} ${r.checks[n].note}`).join('; ')} | ${fails.length ? fails.map(([n, c]) => `#${n}: ${c.note}`).join('; ') : '—'} |`);
  }
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/QA-CHAMPIONS.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(WEB, 'docs/reports/qa-champions.json'), JSON.stringify(rows, null, 1));
  console.log(`\n${total}/${all} hạng mục đạt · lỗi console ${errors.length}`); errors.slice(0, 5).forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(total === all && !errors.length ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
