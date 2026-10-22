// Kiểm tra V1.5 – 24 tướng của Vạn Kiếm Kỳ Trận (12 hạng mục bắt buộc):
//   1. Đủ 24 tướng xuất hiện ở cửa hàng đúng bậc (6/6/5/4/3), không bày tướng phe địch.
//   2. Mua / bán từng tướng: linh thạch trừ / cộng chính xác.
//   3. Dữ liệu tướng không lỗi (validateChampions + không NaN, mỗi tướng có kỹ năng, mô tả, preset animation).
//   4. Nâng sao cho cả 24 tướng: 3×★1 → ★2, 3×★2 → ★3, không có ★4; máu ×1,8 / ×3,2, công ×1,5 / ×2,5 theo STAR.
//   5. Mỗi tướng tung đúng kỹ năng của mình và kỹ năng có cơ chế thật (sát thương / choáng / đóng băng / làm chậm / hồi máu / lá chắn / buff …).
//   6. Mục tiêu chết giữa lúc thi triển: không lỗi, kỹ năng kết thúc an toàn.
//   7. Không tướng nào kẹt ở trạng thái thi triển (> 6 s).
//   8. Máu / năng lượng luôn trong [0, tối đa] và không NaN.
//   9. Sau trận không rò rỉ VFX / timeline / object trong scene / geometry.
//  10. Bản lưu cũ (id tướng trước V1.5) tải được: đổi sang tướng mới, giữ sao & trang bị, tự gộp sao.
//  11. (Giai đoạn 1–4: chạy riêng tests/playtest.js, tests/combat.js, tests/economy.js)
//  12. Không có lỗi console nghiêm trọng.
// Chạy:  cd web && npm run test:champions
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const failures = [];
const check = (cond, msg, extra) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); } else console.log('  ✓ ' + msg); return cond; };

/** Chạy trong trang: một trận thử kỹ năng cho tướng `key` (★2). Địch thụ động (không đánh) để mọi sát thương đo được là của tướng thử.
 *  killTarget = giết hết địch gần ngay khi vừa vào thi triển (chỉ còn 1 kẻ ở góc xa) để thử "mục tiêu chết giữa chiêu". */
function skillTrial([key, killTarget]) {
  const K = window.__vkkt, g = K.game, D = K.UNIT_DEFS[key];
  g.level = 9; g.over = false; K.battle.phase = 'prep';
  for (const u of K.boardAllies()) K.removeUnit(u);
  const caster = K.placeUnit(key, 2, 3, 2);
  const buddy = K.placeUnit('thietve', 1, 4, 3);   // đồng minh để kỹ năng hồi máu / lá chắn / buff có người nhận
  const orig = window.enemyLineup;
  window.enemyLineup = () => (killTarget ? [['mathu', 3, 4, 1], ['uminh', 4, 5, 1], ['uminh', 0, 7, 1]] : [['mathu', 3, 4, 1], ['uminh', 2, 5, 1], ['uminh', 5, 5, 1]]);
  K.battle.round = 3; K.setupRound(); window.enemyLineup = orig;
  K.startBattle();
  const enemies = K.units.filter(u => u.team === 'enemy');
  enemies.forEach(e => { e.atkCd = 1e9; e.maxMana = 1e9; e.mana = 0; });
  buddy.hp = Math.round(buddy.maxHp * 0.4); buddy.atkCd = 1e9; buddy.maxMana = 1e9; buddy.mana = 0;
  caster.mana = caster.maxMana; caster.hp = Math.round(caster.maxHp * 0.7);   // hơi mất máu để kỹ năng tự hồi / hút máu đo được
  const L = K.combatLog, before = JSON.parse(JSON.stringify(L)), casts0 = L.casts[D.skill] || 0;
  // Đo sát thương kỹ năng của riêng tướng thử
  const origDeal = window.dealDamage; let skillDmg = 0, skillHits = 0;
  window.dealDamage = function (src, dst, mult, opts) { const d = origDeal.apply(this, arguments); if (src === caster && opts && opts.skill) { skillDmg += d; skillHits++; } return d; };
  const out = { key, skill: D.skill, errors: [], castSeen: false, castMax: 0, shieldSeen: false, dotSeen: false, buffSeen: false, knockSeen: false, killed: false };
  let t = 0, castT = 0, castStarted = -1;
  try {
    while (K.battle.phase === 'fight' && t < 12) {
      K.simulate(0.05); t += 0.05;
      if (caster.fsm.name === 'cast') { castT += 0.05; out.castSeen = true; if (castStarted < 0) castStarted = t; } else castT = 0;
      out.castMax = Math.max(out.castMax, castT);
      if (killTarget && castStarted >= 0 && !out.killed && t >= castStarted + 0.1) {
        out.killed = true;
        // giết mọi kẻ địch trừ kẻ xa nhất – mục tiêu đã chọn chắc chắn chết
        const far = enemies.filter(e => e.alive).sort((a, b) => Math.hypot(b.pos.x - caster.pos.x, b.pos.z - caster.pos.z) - Math.hypot(a.pos.x - caster.pos.x, a.pos.z - caster.pos.z))[0];
        for (const e of enemies) if (e.alive && e !== far) { e.hp = 0; e.fsm.set('dead'); onUnitDeath(e); }
      }
      for (const u of K.units) {
        if (!(u.hp >= 0 && u.hp <= u.maxHp + 1e-6) || Number.isNaN(u.hp)) out.errors.push(`${u.key} máu ngoài khoảng ${u.hp}/${u.maxHp}`);
        if (u.maxMana < 1e8 && (!(u.mana >= 0 && u.mana <= u.maxMana + 1e-6) || Number.isNaN(u.mana))) out.errors.push(`${u.key} năng lượng ngoài khoảng ${u.mana}/${u.maxMana}`);
        if (u.shield > 0) out.shieldSeen = out.shieldSeen || u.team === 'ally';
        if (u.team === 'enemy' && ((u.fx && u.fx.list.some(e => e.dot)) || u.status.burn > 0)) out.dotSeen = true;
        if (u.team === 'enemy' && u.fsm.name === 'knockback') out.knockSeen = true;
        if (u.team === 'ally' && u.fx && u.fx.list.some(e => !e.dot && !e.hot && e.tag !== 'slow')) out.buffSeen = true;
      }
      if (out.castSeen && castT === 0 && t > castStarted + (killTarget ? 3 : 7)) break;   // đã xong chiêu (+ hiệu ứng kéo dài)
      if (out.errors.length > 5) break;
    }
  } catch (e) { out.errors.push('exception: ' + (e && e.stack || e)); }
  window.dealDamage = origDeal;
  const d = k => (L[k] || 0) - (before[k] || 0);
  Object.assign(out, { casts: (L.casts[D.skill] || 0) - casts0, skillDmg, skillHits, stuns: d('stuns') + d('resisted'), freezes: d('freezes'), slows: d('slows'), healed: d('healed'),
    buffs: d('buffs'), debuffs: d('debuffs'), summons: d('summons'), dashes: d('dashes'), zoneTicks: d('zoneTicks'), finalState: caster.fsm.name, time: +t.toFixed(2) });
  // Về pha chuẩn bị
  K.battle.phase = 'end'; K.nextRound();
  return out;
}

/** Hiệu ứng kỳ vọng của mỗi kỹ năng (từ dữ liệu SKILL_SPECS hoặc SKILL_META). */
function expectedOf(page, skill) {
  return page.evaluate(id => {
    const K = window.__vkkt, s = K.SKILL_SPECS[id];
    if (s) return { data: true, type: s.type, effects: (s.effects || []).map(e => e.kind), ally: (s.ally || []).map(e => e.kind) };
    const m = K.SKILL_META[id]; return { data: false, type: m && m.type, effects: m ? m.effects : [], ally: [] };
  }, skill);
}

/** Chỉ số rò rỉ: phải trở về như cũ sau khi dọn trận. */
const leakStats = page => page.evaluate(() => {
  const K = window.__vkkt; K.newGame();   // cùng một trạng thái (ván mới, vòng 1) để so sánh
  return { effects: K.vfx.effects.length, active: K.vfx.active.size, timelines: K.timelines.length, children: K.scene.children.length,
    geometries: K.renderer.info.memory.geometries, textures: K.renderer.info.memory.textures, units: K.units.length };
});

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
  const KEYS = await page.evaluate(() => window.__vkkt.CHAMPION_KEYS.slice());

  // ---------- 3. Dữ liệu
  console.log('\n3. Dữ liệu tướng');
  const data = await page.evaluate(() => {
    const K = window.__vkkt, bad = K.validateChampions().slice();
    for (const c of K.CHAMPIONS) {
      const d = K.UNIT_DEFS[c.id], sk = K.SKILLS[c.skill];
      for (const f of ['hp', 'atk', 'def', 'aspd', 'range', 'speed', 'mana0', 'mana', 'crit', 'critDmg', 'dodge', 'poise', 'cost']) if (typeof d[f] !== 'number' || !Number.isFinite(d[f])) bad.push(c.id + ': ' + f + ' không phải số');
      if (!sk || !sk.name || !(sk.desc || sk.data)) bad.push(c.id + ': kỹ năng thiếu tên / mô tả');
      if (!sk.meta && !K.SKILL_SPECS[c.skill]) bad.push(c.id + ': kỹ năng thiếu meta (loại / mục tiêu)');
      if (!d.animSet || !d.animSet.attack || !d.animSet.cast) bad.push(c.id + ': thiếu cấu hình animation');
    }
    const skills = K.CHAMPIONS.map(c => c.skill);
    return { bad, n: K.CHAMPIONS.length, uniqueSkills: new Set(skills).size, per: [1, 2, 3, 4, 5].map(t => K.championsByCost(t).length), ids: new Set(K.CHAMPION_KEYS).size };
  });
  check(data.bad.length === 0, 'validateChampions + kiểm tra kiểu: không lỗi dữ liệu', data.bad);
  check(data.n === 24 && data.ids === 24, '24 tướng, id không trùng', data);
  check(data.per.join() === '6,6,5,4,3', 'số tướng theo bậc 6/6/5/4/3', data.per);
  check(data.uniqueSkills === 24, 'mỗi tướng một kỹ năng riêng (24 kỹ năng khác nhau)', data.uniqueSkills);

  // ---------- 1. Cửa hàng
  console.log('\n1. Cửa hàng đúng bậc');
  const shop = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game; K.newGame(); g.rivals = {}; g.level = 9;
    const seen = {}, wrong = [];
    for (let n = 0; n < 3000; n++) { K.rollShop(); for (const k of g.shop) if (k) { seen[k] = (seen[k] || 0) + 1; if (!K.UNIT_DEFS[k].cost) wrong.push(k); } }
    const tierOk = [1, 2, 3, 4, 5].every(t => K.SHOP_POOL[t].every(k => K.UNIT_DEFS[k].cost === t));
    K.newGame();
    return { seen, wrong: [...new Set(wrong)], tierOk, pool: [1, 2, 3, 4, 5].map(t => K.SHOP_POOL[t].length) };
  });
  const missing = KEYS.filter(k => !shop.seen[k]);
  check(missing.length === 0, 'cả 24 tướng đều xuất hiện ở cửa hàng (cấp 9, 3.000 lần làm mới)', missing);
  check(shop.wrong.length === 0, 'cửa hàng không bày tướng phe địch', shop.wrong);
  check(shop.tierOk && shop.pool.join() === '6,6,5,4,3', 'SHOP_POOL: mỗi tướng nằm đúng bậc giá', shop.pool);
  const lowShop = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game; g.rivals = {}; g.level = 3; let hi = 0;
    for (let n = 0; n < 2000; n++) { K.rollShop(); for (const k of g.shop) if (k && K.UNIT_DEFS[k].cost >= 4) hi++; }
    K.newGame(); return hi;
  });
  check(lowShop === 0, 'cấp 3 không gặp tướng bậc 4–5 (đúng bảng tỉ lệ)', lowShop);

  // ---------- 2. Mua / bán
  console.log('\n2. Mua / bán chính xác');
  const trade = await page.evaluate(keys => {
    const K = window.__vkkt, g = K.game, bad = [];
    for (const k of keys) {
      K.newGame(); g.gold = 50; g.bench.fill(null); K.syncBench && K.syncBench();
      g.shop[0] = k; const cost = K.UNIT_DEFS[k].cost, g0 = g.gold;
      K.buyShop(0);
      const i = g.bench.findIndex(e => e && e.key === k);
      if (i < 0 || g.gold !== g0 - cost) { bad.push(`${k}: mua sai (vàng ${g0}→${g.gold}, giá ${cost})`); continue; }
      const g1 = g.gold; K.sellSrc({ type: 'bench', i });
      if (g.gold !== g1 + cost || g.bench[i]) bad.push(`${k}: bán sai (vàng ${g1}→${g.gold})`);
      if (K.sellPrice(k, 2) !== cost * 3 - 1 || K.sellPrice(k, 3) !== cost * 9 - 1) bad.push(`${k}: giá bán ★2/★3 sai`);
    }
    K.newGame(); return bad;
  }, KEYS);
  check(trade.length === 0, 'mua trừ đúng giá, bán ★1 hoàn đúng giá cho cả 24 tướng (★2 = 3×giá−1, ★3 = 9×giá−1)', trade);

  // ---------- 4. Nâng sao
  console.log('\n4. Nâng sao');
  const stars = await page.evaluate(keys => {
    const K = window.__vkkt, g = K.game, bad = [];
    for (const k of keys) {
      K.newGame(); for (const u of K.boardAllies()) K.removeUnit(u);
      g.bench.fill(null); for (let i = 0; i < 3; i++) g.bench[i] = { key: k, star: 1, items: [] };
      K.mergeAll();
      const s2 = g.bench.filter(e => e && e.key === k);
      if (s2.length !== 1 || s2[0].star !== 2) { bad.push(`${k}: 3×★1 không thành 1×★2 (${JSON.stringify(s2)})`); continue; }
      g.bench.fill(null); for (let i = 0; i < 3; i++) g.bench[i] = { key: k, star: 2, items: [] };
      K.mergeAll();
      const s3 = g.bench.filter(e => e && e.key === k);
      if (s3.length !== 1 || s3[0].star !== 3) { bad.push(`${k}: 3×★2 không thành 1×★3`); continue; }
      g.bench.fill(null); for (let i = 0; i < 3; i++) g.bench[i] = { key: k, star: 3, items: [] };
      K.mergeAll();
      if (g.bench.filter(e => e && e.key === k && e.star === 3).length !== 3) bad.push(`${k}: ★3 vẫn gộp tiếp (vượt giới hạn)`);
      // Chỉ số theo sao (không hệ / không trang bị)
      const st = [1, 2, 3].map(s => { const u = K.placeUnit(k, s, s, 0); u.bonus = defaultBonus(); u.reset(1); const r = { hp: u.maxHp, atk: u.atk, scale: u.rig.root.scale.x }; K.removeUnit(u); return r; });
      const near = (a, b) => Math.abs(a - b) <= 0.02 * b + 1;
      if (!near(st[1].hp, st[0].hp * K.STAR.hp[2]) || !near(st[2].hp, st[0].hp * K.STAR.hp[3])) bad.push(`${k}: máu theo sao sai ${st.map(x => x.hp)}`);
      if (!near(st[1].atk, st[0].atk * K.STAR.atk[2]) || !near(st[2].atk, st[0].atk * K.STAR.atk[3])) bad.push(`${k}: công theo sao sai ${st.map(x => x.atk)}`);
      if (!(st[2].scale > st[1].scale && st[1].scale > st[0].scale)) bad.push(`${k}: mô hình không to dần theo sao`);
    }
    K.newGame(); return bad;
  }, KEYS);
  check(stars.length === 0, 'cả 24 tướng: 3×★1→★2, 3×★2→★3, ★3 không gộp tiếp; máu ×1,8/×3,2, công ×1,5/×2,5, mô hình to dần', stars);

  // ---------- 5–9. Kỹ năng
  console.log('\n5–8. Kỹ năng từng tướng (★2, địch thụ động)');
  const leak0 = await leakStats(page);
  const results = [];
  for (const k of KEYS) {
    const r = await page.evaluate(skillTrial, [k, false]);
    const ex = await expectedOf(page, r.skill);
    const all = ex.effects.concat(ex.ally);
    const need = [];
    if (all.includes('damage')) need.push(['sát thương kỹ năng', r.skillDmg > 0]);
    if (all.includes('stun')) need.push(['choáng', r.stuns > 0]);
    if (all.includes('freeze')) need.push(['đóng băng', r.freezes > 0]);
    if (all.includes('slow')) need.push(['làm chậm', r.slows > 0]);
    if (all.includes('dot')) need.push(['sát thương theo thời gian', r.dotSeen]);
    if (all.includes('debuff')) need.push(['giảm chỉ số địch', r.debuffs > 0]);
    if (all.includes('heal') || all.includes('hot')) need.push(['hồi máu', r.healed > 0]);
    if (all.includes('shield')) need.push(['lá chắn', r.shieldSeen]);
    if (all.includes('buff')) need.push(['tăng chỉ số', r.buffs > 0 && r.buffSeen]);
    if (ex.type === 'summon') need.push(['triệu hồi phi kiếm', r.summons > 0]);
    if (ex.type === 'dash') need.push(['lướt tới', r.dashes > 0]);
    if (ex.type === 'zone') need.push(['trận pháp gây sát thương theo nhịp', r.zoneTicks > 0]);
    const miss = need.filter(n => !n[1]).map(n => n[0]);
    results.push(r);
    console.log(`   ${k.padEnd(11)} ${r.skill.padEnd(12)} tung ${r.casts} lần · ${r.skillHits} đòn, ${r.skillDmg} sát thương · thi triển dài nhất ${r.castMax.toFixed(2)} s` +
      (r.stuns ? ` · choáng ${r.stuns}` : '') + (r.freezes ? ` · băng ${r.freezes}` : '') + (r.slows ? ` · chậm ${r.slows}` : '') + (r.healed ? ` · hồi ${Math.round(r.healed)}` : '') +
      (r.summons ? ` · phi kiếm ${r.summons}` : '') + (r.dashes ? ` · lướt ${r.dashes}` : '') + (r.zoneTicks ? ` · nhịp trận ${r.zoneTicks}` : '') + (r.shieldSeen ? ' · khiên' : '') + (r.dotSeen ? ' · thiêu' : ''));
    check(r.casts >= 1 && r.castSeen, `[${k}] tung đúng kỹ năng ${r.skill}`, { casts: r.casts });
    check(miss.length === 0, `[${k}] kỹ năng có đủ cơ chế: ${need.map(n => n[0]).join(', ') || '—'}`, miss);
    check(r.castMax <= 6, `[${k}] không kẹt trong trạng thái thi triển`, r.castMax);
    check(r.errors.length === 0, `[${k}] máu / năng lượng hợp lệ, không ngoại lệ`, r.errors.slice(0, 3));
  }

  console.log('\n6. Mục tiêu chết giữa lúc thi triển');
  const deadBad = [];
  for (const k of KEYS) {
    const r = await page.evaluate(skillTrial, [k, true]);
    if (!r.killed) deadBad.push(k + ': chưa vào thi triển');
    else if (r.errors.length || r.castMax > 6 || r.finalState === 'cast') deadBad.push(`${k}: ${r.errors[0] || 'kẹt thi triển ' + r.castMax + ' s (' + r.finalState + ')'}`);
  }
  check(deadBad.length === 0, 'cả 24 kỹ năng: mục tiêu chết giữa chiêu → không lỗi, chiêu kết thúc, không kẹt', deadBad);

  // ---------- 9. Rò rỉ
  console.log('\n9. Rò rỉ sau trận');
  // chạy lại 1 lượt cho cache vật liệu / shader ổn định rồi so sánh
  for (const k of KEYS) await page.evaluate(skillTrial, [k, false]);
  const leak1 = await leakStats(page);
  for (const k of KEYS) await page.evaluate(skillTrial, [k, false]);
  const leak2 = await leakStats(page);
  console.log('   trước:', JSON.stringify(leak0), '\n   lượt 2:', JSON.stringify(leak1), '\n   lượt 3:', JSON.stringify(leak2));
  check(leak2.effects === 0 && leak2.active === 0 && leak2.timelines === 0, 'không còn hiệu ứng / mesh pool / timeline nào sau khi dọn trận', leak2);
  check(leak2.children === leak0.children && leak2.units === leak0.units, 'số object trong scene và số quân trở về như cũ', { before: leak0.children, after: leak2.children });
  check(leak2.geometries <= leak1.geometries + 2 && leak2.textures <= leak1.textures + 1, 'geometry / texture không tăng giữa các lượt (không tạo lại tài nguyên)', { l1: leak1, l2: leak2 });

  // ---------- 10. Bản lưu cũ
  console.log('\n10. Tương thích bản lưu cũ');
  await page.evaluate(() => {
    const old = { v: 1, hp: 74, gold: 23, level: 6, xp: 3, streak: 2, round: 8, over: false, items: ['kiem'],
      rivals: { loi: 3, hoaton: 1, kiemdong: 2 },
      shop: ['loi', 'hoa', 'anhkiem', null, 'uhon'],
      bench: [{ key: 'anhkiem', star: 1, items: [] }, { key: 'uminh', star: 1, items: [] }, { key: 'hoaton', star: 2, items: ['giap'] }, { key: 'khongton', star: 1, items: [] }, null, null, null, null, null],
      board: [{ key: 'loi', star: 2, c: 2, r: 1, items: ['kiem', 'ngoc'] }, { key: 'hophap', star: 1, c: 3, r: 3, items: [] }, { key: 'anhkiem', star: 1, c: 5, r: 3, items: [] }, { key: 'kiemtien', star: 1, c: 4, r: 3, items: [] }] };
    localStorage.setItem('vkkt_save', JSON.stringify(old));
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__vkkt);
  const mig = await page.evaluate(() => {
    const K = window.__vkkt, g = K.game;
    return { gold: g.gold, hp: g.hp, round: K.battle.round, level: g.level, items: g.items.slice(),
      bench: g.bench.filter(Boolean).map(e => e.key + '★' + e.star + (e.items.length ? '[' + e.items.join(',') + ']' : '')),
      board: K.boardAllies().map(u => u.key + '★' + u.star + (u.items.length ? '[' + u.items.join(',') + ']' : '')).sort(),
      shop: g.shop.slice(), rivals: Object.assign({}, g.rivals), allValid: K.boardAllies().every(u => K.UNIT_DEFS[u.key].cost) && g.bench.every(e => !e || K.UNIT_DEFS[e.key].cost) && g.shop.every(k => !k || K.UNIT_DEFS[k].cost) };
  });
  console.log('   ' + JSON.stringify(mig));
  check(mig.allValid, 'mọi tướng sau khi tải bản lưu cũ đều là tướng hiện hành', mig);
  check(mig.gold === 23 && mig.hp === 74 && mig.round === 8 && mig.level === 6, 'giữ nguyên linh thạch / máu / vòng / cấp', mig);
  check(mig.board.includes('bangling★2[kiem,ngoc]') && mig.board.includes('thietve★1') && mig.board.includes('kiemtien★1'), 'tướng cũ trên bàn đổi sang tướng mới, giữ sao & trang bị (Lôi → Băng Linh, Hộ Pháp → Thiết Vệ)', mig.board);
  const hm = mig.board.concat(mig.bench).filter(s => s.startsWith('huyetma'));
  check(hm.length === 1 && hm[0].startsWith('huyetma★2'), '3 bản cũ cùng đổi về Huyết Ma (Ảnh Kiếm ×2 + U Minh) tự gộp thành ★2', hm);
  check(mig.bench.some(s => s.startsWith('thannu★2[giap]')) && !mig.bench.some(s => s.includes('khongton')), 'Hỏa Tôn ★2 → Cửu Thiên Thần Nữ ★2 giữ trang bị; id không tồn tại bị bỏ', mig.bench);
  check(mig.shop.join() === 'bangling,hoa,huyetma,,huyenbang' && mig.rivals.bangling === 3 && mig.rivals.thannu === 1, 'cửa hàng và đối thủ ảo cũng được chuyển id', { shop: mig.shop, rivals: mig.rivals });
  await page.click('#btn-enter');
  const after = await page.evaluate(() => { const K = window.__vkkt; K.startBattle(); K.simulate(20); return { phase: K.battle.phase }; });
  check(['fight', 'end'].includes(after.phase), 'đánh được trận với đội hình từ bản lưu cũ', after);

  // ---------- 12. Console
  console.log('\n12. Lỗi console');
  check(errors.length === 0, 'không có lỗi console / pageerror', errors.slice(0, 5));

  await browser.close();
  if (failures.length) { console.log(`\n✗ ${failures.length} lỗi`); process.exit(1); }
  console.log('\n✓ 24 tướng: dữ liệu, cửa hàng, mua bán, nâng sao, kỹ năng, an toàn khi mục tiêu chết, không rò rỉ, bản lưu cũ – đều đạt.');
}
main().catch(e => { console.error(e); process.exit(1); });
