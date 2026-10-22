// Báo cáo cân bằng sơ bộ (V1.5 tuần 3) bằng CombatTestRunner – mô phỏng không render, seed cố định (tái hiện được).
//   A. Chỉ số từng tướng ★1/★2/★3: DPS mô phỏng 20 s lên bia đỡ, máu hiệu dụng (vật lý / phép), khống chế, hồi / lá chắn mỗi lần thi triển.
//   B. Đấu tay đôi trong cùng bậc (★2, đổi bên, 3 seed) → tướng lệch cân bằng (> 75% hoặc < 25%).
//   C. Đường cong giá: bậc c ★1 đấu bậc c−1 ★1; giá trị ★3 của tướng rẻ: ★3 bậc 1–2 đấu ★1 bậc 4–5.
//   D. 8 đội hình tộc/hệ (8 tướng ★2) đấu vòng tròn → không đội nào thắng tất cả, có khắc chế.
//   E. 60 trận ngẫu nhiên: tỉ lệ thắng hai bên, thời lượng, sát thương trung bình, bất thường.
// Ghi docs/BALANCE.md.  Chạy:  cd web && npm run balance
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const SEEDS = (process.env.SEEDS || '1,2,3').split(',').map(Number);

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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); localStorage.setItem('vkkt_quality', '"LOW"'); });
  await page.reload();
  await page.click('#btn-enter');
  const V = (fn, arg) => page.evaluate(fn, arg);
  const t0 = Date.now();
  const md = [];
  const pct = x => Math.round(x * 100) + '%';

  // ---------- A. Chỉ số từng tướng
  console.log('A. chỉ số từng tướng…');
  const A = await V(() => {
    const K = window.__vkkt, R = K.CombatTestRunner, rows = [];
    const ccOf = sp => { if (!sp) return 0; return (sp.effects || []).reduce((a, e) => a + (e.kind === 'stun' || e.kind === 'freeze' ? e.dur : e.kind === 'slow' ? e.dur * e.amount : 0), 0); };
    for (const c of K.CHAMPIONS) {
      const row = { id: c.id, name: c.short || c.name, cost: c.cost, role: K.ROLES[c.role].name, dps: [], ehpP: [], ehpM: [], heal: [], casts: [] };
      for (const star of [1, 2, 3]) {
        // DPS: 20 s đánh bia đỡ (Ma Thú Hống ★3, máu rất lớn, không đánh trả) – gồm cả kỹ năng (năng lượng từ đòn đánh)
        const bk = c.id === 'linhy' ? 'thanhmoc' : 'linhy';   // đồng minh phụ (bị thương sẵn để kỹ năng hỗ trợ có người nhận) – khác tướng đang đo
        R.run({ allies: [[c.id, star, 3, 3], [bk, 1, 0, 0]], enemies: [['mathu', 3, 3, 4]], seed: 1, maxTime: 0.02, keepState: true, enemyTraits: false });
        const me = K.units.find(u => u.key === c.id), tank = K.units.find(u => u.team === 'enemy'), buddy = K.units.find(u => u.key === bk);
        tank.maxHp = tank.hp = 1e7; tank.atkCd = 1e9; tank.maxMana = 1e9; buddy.hp = Math.round(buddy.maxHp * 0.5); buddy.atkCd = 1e9; buddy.maxMana = 1e9;
        for (let i = 0; i < 20 * 60 && K.battle.phase === 'fight'; i++) { K.simStep(K.STEP); tank.atkCd = 1e9; }
        row.dps.push(Math.round(me.cs.dealt / 20)); row.heal.push(Math.round(me.cs.healed + me.cs.shielded)); row.casts.push(me.cs.casts);
        row.ehpP.push(Math.round(me.maxHp / K.defenseFactor(me.defNow()))); row.ehpM.push(Math.round(me.maxHp / K.defenseFactor(me.mrNow())));
        K.battle.phase = 'end'; K.TraitEngine.battleEnd(); K.nextRound();
      }
      row.cc = +ccOf(K.SKILL_SPECS[c.skill]).toFixed(2) || ({ cuuThienLoi: 0.6, vanKiem: 1.2 }[c.skill] || 0);
      row.mana = c.mana - c.mana0; row.range = c.range;
      rows.push(row);
    }
    return rows;
  });
  md.push('# Báo cáo cân bằng sơ bộ – V1.5 tuần 3', '', `> Sinh tự động bởi \`npm run balance\` (tests/balance.js) bằng CombatTestRunner: mô phỏng không render, bước 60 Hz, seed ${SEEDS.join(', ')}. Không phải số liệu người chơi thật.`, '',
    '## A. Chỉ số từng tướng (★1 / ★2 / ★3)', '',
    'DPS = sát thương trung bình mỗi giây trong 20 s đánh bia đỡ (gồm kỹ năng, năng lượng chỉ từ đòn đánh – thấp hơn trận thật vì không bị đánh). Máu hiệu dụng = máu / hệ số giáp (vật lý) hoặc kháng phép (phép). Hồi + khiên = tổng trong 20 s (có 1 đồng minh 50% máu). Khống chế = giây choáng / đóng băng (làm chậm tính theo %) mỗi lần thi triển.', '',
    '| Tướng | Bậc | Vai trò | DPS ★1/★2/★3 | Máu hiệu dụng vật lý ★1/★2/★3 | Máu hiệu dụng phép ★1/★2/★3 | Hồi + khiên ★1/★2/★3 | Số lần tung (20 s) | Khống chế / lần | Năng lượng cần | Tầm |',
    '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of A) md.push(`| ${r.name} | ${r.cost} | ${r.role} | ${r.dps.join(' / ')} | ${r.ehpP.join(' / ')} | ${r.ehpM.join(' / ')} | ${r.heal.join(' / ')} | ${r.casts.join(' / ')} | ${r.cc} | ${r.mana} | ${r.range} |`);
  // trung bình theo bậc
  md.push('', '**Trung bình theo bậc (★1)** – tiềm năng tăng theo giá:', '', '| Bậc | DPS | Máu hiệu dụng vật lý | Máu hiệu dụng phép | DPS × máu hiệu dụng (so với bậc 1) |', '|---|---|---|---|---|');
  let base = 0;
  for (let c = 1; c <= 5; c++) {
    const L = A.filter(r => r.cost === c), avg = f => L.reduce((a, r) => a + f(r), 0) / L.length;
    const d = avg(r => r.dps[0]), e = avg(r => (r.ehpP[0] + r.ehpM[0]) / 2); if (c === 1) base = d * e;
    md.push(`| ${c} | ${Math.round(d)} | ${Math.round(avg(r => r.ehpP[0]))} | ${Math.round(avg(r => r.ehpM[0]))} | ×${(d * e / base).toFixed(2)} |`);
  }

  // ---------- B. Đấu tay đôi trong cùng bậc
  console.log('B. đấu tay đôi trong cùng bậc…');
  const B = await V(seeds => {
    const K = window.__vkkt, R = K.CombatTestRunner, res = {};
    for (let c = 1; c <= 5; c++) {
      const ids = K.championsByCost(c);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (const s of seeds) for (const swap of [0, 1]) {
        const a = swap ? ids[j] : ids[i], b = swap ? ids[i] : ids[j];
        const r = R.run({ allies: [[a, 2, 3, 3]], enemies: [[b, 2, 4, 4]], seed: s * 100 + swap, keepState: true });
        const w = r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0;
        (res[a] = res[a] || { w: 0, n: 0, time: 0 }); (res[b] = res[b] || { w: 0, n: 0, time: 0 });
        res[a].w += w; res[a].n++; res[b].w += 1 - w; res[b].n++; res[a].time += r.time; res[b].time += r.time;
        K.nextRound();
      }
    }
    return res;
  }, SEEDS);
  md.push('', '## B. Đấu tay đôi trong cùng bậc (★2 vs ★2, đổi bên, ' + SEEDS.length + ' seed)', '', 'Đấu 1 chọi 1 thiên về đấu sĩ / sát thủ (đỡ đòn và hỗ trợ được thiết kế để mạnh trong đội hình) – dùng để phát hiện tướng lệch hẳn, không phải mục tiêu 50%.', '', '| Bậc | Tướng (tỉ lệ thắng, thời lượng TB) |', '|---|---|');
  const champs = await V(() => window.__vkkt.CHAMPIONS.map(c => ({ id: c.id, name: c.short || c.name, cost: c.cost, role: c.role })));
  const outliers = [];
  for (let c = 1; c <= 5; c++) {
    const L = champs.filter(x => x.cost === c).map(x => ({ ...x, wr: B[x.id].w / B[x.id].n, t: B[x.id].time / B[x.id].n })).sort((a, b) => b.wr - a.wr);
    md.push(`| ${c} | ${L.map(x => `${x.name} ${pct(x.wr)} (${x.t.toFixed(0)} s)`).join(' · ')} |`);
    L.forEach(x => { if (x.wr > 0.75 || x.wr < 0.25) outliers.push(`${x.name} (bậc ${c}, ${x.role}) ${pct(x.wr)}`); });
  }
  md.push('', '**Lệch khỏi 25–75% trong đấu tay đôi**: ' + (outliers.join(' · ') || 'không có'));

  // ---------- C. Đường cong giá & giá trị ★3 tướng rẻ
  console.log('C. đường cong giá…');
  const C = await V(seeds => {
    const K = window.__vkkt, R = K.CombatTestRunner, out = { tier: [], cheap3: [] };
    for (let c = 2; c <= 5; c++) {
      let w = 0, n = 0;
      for (const hi of K.championsByCost(c)) for (const lo of K.championsByCost(c - 1)) for (const s of seeds.slice(0, 2)) {
        const r = R.run({ allies: [[hi, 1, 3, 3]], enemies: [[lo, 1, 4, 4]], seed: s, keepState: true }); w += r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0; n++; K.nextRound();
      }
      out.tier.push({ c, wr: w / n, n });
    }
    // ★3 bậc 1–2 vs ★1 bậc 4–5 và ★2 bậc 4–5
    for (const [loC, hiC, hiStar] of [[1, 4, 1], [1, 5, 1], [2, 4, 1], [2, 5, 1], [1, 4, 2], [2, 4, 2]]) {
      let w = 0, n = 0;
      for (const lo of K.championsByCost(loC)) for (const hi of K.championsByCost(hiC)) {
        const r = R.run({ allies: [[lo, 3, 3, 3]], enemies: [[hi, hiStar, 4, 4]], seed: 7, keepState: true }); w += r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0; n++; K.nextRound();
      }
      out.cheap3.push({ loC, hiC, hiStar, wr: w / n, n });
    }
    return out;
  }, SEEDS);
  md.push('', '## C. Đường cong giá', '', '| Trận | Tỉ lệ thắng của bên đầu | Số trận |', '|---|---|---|');
  C.tier.forEach(x => md.push(`| Bậc ${x.c} ★1 vs bậc ${x.c - 1} ★1 | ${pct(x.wr)} | ${x.n} |`));
  C.cheap3.forEach(x => md.push(`| Bậc ${x.loC} ★3 vs bậc ${x.hiC} ★${x.hiStar} | ${pct(x.wr)} | ${x.n} |`));

  // ---------- D. Đội hình tộc/hệ đấu vòng tròn
  console.log('D. đội hình tộc/hệ…');
  // Đội hình cân giá (tổng giá ★1 ≈ 21–23) để so tộc/hệ chứ không so số tiền bỏ ra
  const COMPS = {
    'Kiếm Tu 6': ['kiemdong', 'mabinh', 'thanhphong', 'ngukiem', 'anhsat', 'vocuc', 'kimcuong', 'batdiet'],
    'Pháp Tu 6': ['hoa', 'linhcung', 'bangling', 'cuuviem', 'huyenbang', 'loiton', 'kimcuong', 'batdiet'],
    'Hộ Pháp 6': ['thietve', 'huyengiap', 'huyetma', 'loithuong', 'kimcuong', 'batdiet', 'umaquan', 'cuuviem'],
    'Nhân Tộc 6': ['kiemdong', 'thietve', 'thanhphong', 'loithuong', 'kimcuong', 'loiton', 'kiemtien', 'vocuc'],
    'Ma Tộc 6': ['mabinh', 'huyetma', 'anhsat', 'vocuc', 'umaquan', 'hondon', 'thietve', 'huyengiap'],
    'Tiên Tộc 6': ['thanhmoc', 'linhy', 'ngukiem', 'huyenbang', 'kiemtien', 'thannu', 'thietve', 'huyengiap'],
    'Yêu Tộc 6': ['hoa', 'linhcung', 'huyengiap', 'bangling', 'cuuviem', 'batdiet', 'kiemtien', 'anhsat'],
    'Đan Tu 4 + Hộ Pháp 4': ['thanhmoc', 'linhy', 'batdiet', 'thannu', 'huyengiap', 'huyetma', 'loithuong', 'kimcuong']
  };

  const D = await V(([COMPS, seeds]) => {
    const K = window.__vkkt, R = K.CombatTestRunner, names = Object.keys(COMPS), M = {}, cost = {}, time = {};
    const place = (list, enemy) => {
      const front = [], back = [];
      list.forEach(k => (['mage', 'marksman', 'support'].includes(K.UNIT_DEFS[k].role) ? back : front).push(k));
      const out = []; const cols = [3, 4, 2, 5, 1, 6, 0, 7];
      front.forEach((k, i) => out.push([k, 2, cols[i % 8], enemy ? 4 : 3]));
      back.forEach((k, i) => out.push([k, 2, cols[i % 8], enemy ? 6 : 1]));
      return out;
    };
    names.forEach(n => { M[n] = {}; cost[n] = COMPS[n].reduce((a, k) => a + K.UNIT_DEFS[k].cost, 0); time[n] = 0; });
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      let w = 0, n = 0, t = 0;
      for (const s of seeds) for (const swap of [0, 1]) {
        const a = swap ? names[j] : names[i], b = swap ? names[i] : names[j];
        const r = R.run({ allies: place(COMPS[a], false), enemies: place(COMPS[b], true), seed: s * 10 + swap, keepState: true });
        const win = r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0;
        w += swap ? 1 - win : win; n++; t += r.time; K.nextRound();
      }
      M[names[i]][names[j]] = w / n; M[names[j]][names[i]] = 1 - w / n; time[names[i]] += t / n; time[names[j]] += t / n;
    }
    return { M, names, cost, time };
  }, [COMPS, SEEDS]);
  md.push('', '## D. 8 đội hình tộc/hệ cân giá (8 tướng ★2, tổng giá 21–23) đấu vòng tròn', '', 'Ô = tỉ lệ thắng của đội ở hàng khi gặp đội ở cột (' + SEEDS.length + ' seed × đổi bên). "Tổng giá" = tổng giá tướng ★1 trong đội.', '',
    '| Đội \\ gặp | ' + D.names.map((n, i) => String.fromCharCode(65 + i)).join(' | ') + ' | Trung bình | Tổng giá |', '|---|' + D.names.map(() => '---').join('|') + '|---|---|');
  const avgWR = {};
  D.names.forEach((a, i) => {
    const vals = D.names.filter(b => b !== a).map(b => D.M[a][b]); avgWR[a] = vals.reduce((x, y) => x + y, 0) / vals.length;
    md.push(`| ${String.fromCharCode(65 + i)}. ${a} | ` + D.names.map(b => (b === a ? '—' : pct(D.M[a][b]))).join(' | ') + ` | **${pct(avgWR[a])}** | ${D.cost[a]} |`);
  });
  const unbeaten = D.names.filter(a => D.names.every(b => b === a || D.M[a][b] >= 0.5));
  const counters = [];
  D.names.forEach(a => D.names.forEach(b => D.names.forEach(c => { if (a < b && D.M[a][b] > 0.5 && D.M[b][c] > 0.5 && D.M[c][a] > 0.5) counters.push(`${a} > ${b} > ${c} > ${a}`); })));
  md.push('', `**Đội không thua ai**: ${unbeaten.join(', ') || 'không có'} · **Vòng khắc chế (A > B > C > A)**: ${counters.length} vòng${counters.length ? ', ví dụ ' + counters.slice(0, 3).join('; ') : ''}`);

  // ---------- E. Trận ngẫu nhiên
  console.log('E. trận ngẫu nhiên…');
  const E = await V(() => {
    const K = window.__vkkt, keys = K.CHAMPION_KEYS, R = K.CombatTestRunner, out = { a: 0, e: 0, d: 0, time: 0, dealt: 0, anomalies: [], n: 60 };
    let s = 777; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
    const side = rows => { const used = new Set(), list = [], size = 4 + Math.floor(rnd() * 5); while (list.length < size) { const c = Math.floor(rnd() * 8), r = rows[Math.floor(rnd() * rows.length)], k = c + ',' + r; if (used.has(k)) continue; used.add(k); list.push([keys[Math.floor(rnd() * keys.length)], 1 + Math.floor(rnd() * 2), c, r]); } return list; };
    for (let i = 0; i < out.n; i++) {
      const r = R.run({ allies: side([0, 1, 2, 3]), enemies: side([4, 5, 6, 7]), seed: 5000 + i, keepState: true });
      out[r.result === 'win' ? 'a' : r.result === 'draw' ? 'd' : 'e']++; out.time += r.time; out.dealt += r.allies.concat(r.enemies).reduce((x, u) => x + u.dealt, 0) / Math.max(1, r.allies.length + r.enemies.length);
      out.anomalies.push(...r.anomalies.map(a => `#${i}: ${a}`)); K.nextRound();
    }
    out.time /= out.n; out.dealt /= out.n;
    return out;
  });
  md.push('', '## E. 60 trận ngẫu nhiên (4–8 tướng ★1–★2 mỗi bên, vị trí ngẫu nhiên)', '',
    `Phe dưới thắng ${E.a} · phe trên thắng ${E.e} · hoà ${E.d} · thời lượng TB ${E.time.toFixed(1)} s · sát thương TB mỗi tướng ${Math.round(E.dealt)} · bất thường: ${E.anomalies.length ? E.anomalies.slice(0, 8).join('; ') : 'không có'}`);
  md.push('', `_Thời gian chạy: ${((Date.now() - t0) / 1000).toFixed(0)} s. Lỗi console: ${errors.length}._`, '');
  fs.mkdirSync(path.join(WEB, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/BALANCE.md'), md.join('\n'));
  console.log(md.join('\n'));
  await browser.close();
  if (errors.length) { console.log(errors.slice(0, 5)); process.exit(1); }
}
main().catch(e => { console.error(e); process.exit(1); });
