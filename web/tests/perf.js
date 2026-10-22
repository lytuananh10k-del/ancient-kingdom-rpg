// Đo hiệu năng 7 kịch bản (mục VI) trong Chromium headless – SwiftShader (WebGL dựng hình bằng CPU, KHÔNG phải GPU thật).
// Số liệu dùng để SO SÁNH TRƯỚC / SAU tối ưu trên cùng máy, không thay cho đo trên thiết bị thật.
// Chạy: cd web && npm run perf          (TAG=before|after – tên tệp kết quả; SECS=… thời gian đo mỗi kịch bản; DSF=… tỉ lệ điểm ảnh màn hình)
// Kết quả: docs/reports/perf-<TAG>.json
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const TAG = process.env.TAG || 'before', SECS = +(process.env.SECS || 8), DSF = +(process.env.DSF || 2);
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';

// Đội hình [key, sao, cột, hàng] – phe ta hàng 0–3, phe địch hàng 4–7
const A5 = [['kimcuong', 2, 3, 3], ['thanhphong', 2, 4, 3], ['linhcung', 2, 2, 1], ['cuuviem', 2, 5, 1], ['linhy', 2, 4, 0]];
const E5 = [['huyengiap', 2, 3, 4], ['loithuong', 2, 4, 4], ['hoa', 2, 2, 6], ['ngukiem', 2, 5, 6], ['thanhmoc', 2, 4, 7]];
const SCENARIOS = [
  { id: 'prep', name: '1. Chuẩn bị (5 tướng trên bàn, 4 hàng chờ)', quality: ['LOW', 'MEDIUM', 'ULTRA'], prep: true, allies: A5 },
  { id: '3v3', name: '2. Giao tranh 3v3', quality: ['MEDIUM'], allies: A5.slice(0, 3), enemies: E5.slice(0, 3) },
  { id: '5v5', name: '3. Giao tranh 5v5', quality: ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], allies: A5, enemies: E5 },
  { id: 'max', name: '4. Tối đa tướng (9v8)', quality: ['LOW', 'MEDIUM', 'ULTRA'], allies: A5.concat([['batdiet', 1, 1, 3], ['anhsat', 1, 6, 3], ['loiton', 1, 1, 0], ['thannu', 1, 6, 0]]),
    enemies: E5.concat([['mabinh', 1, 1, 4], ['kiemdong', 1, 6, 4], ['bangling', 1, 1, 7]]) },
  { id: 'aoe', name: '5. Nhiều kỹ năng diện rộng (5 pháp sư mỗi phe, ép đầy năng lượng mỗi 2 s)', quality: ['LOW', 'MEDIUM', 'ULTRA'], aoe: true,
    allies: [['cuuviem', 2, 2, 1], ['loiton', 2, 3, 1], ['huyenbang', 2, 4, 1], ['ngukiem', 2, 5, 1], ['umaquan', 2, 3, 3]],
    enemies: [['hoa', 2, 2, 6], ['bangling', 2, 3, 6], ['cuuviem', 2, 4, 6], ['loiton', 2, 5, 6], ['kimcuong', 2, 3, 4]] },
  { id: 'vankiem', name: '6. Vạn Kiếm Tiên Đế ở ULTRA (ép tuyệt kỹ mỗi 3 s)', quality: ['ULTRA'], ult: true,
    allies: [['kiemtien', 2, 4, 1], ['kimcuong', 2, 3, 3], ['thanhphong', 2, 4, 3], ['linhcung', 2, 2, 1], ['linhy', 2, 5, 0]], enemies: E5.concat([['mabinh', 2, 1, 4], ['kiemdong', 2, 6, 4]]) }
];

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: DSF, isMobile: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(path.join(WEB, 'index.html'), 'utf8') + '</body></html>' });
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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); localStorage.setItem('vkkt_autoQuality', 'false'); });
  await page.reload();
  await page.click('#btn-enter');
  await page.waitForTimeout(1500);
  const env = await page.evaluate(() => {
    const K = window.__vkkt, gl = K.renderer.getContext(); let gpu = '';
    try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); } catch (e) { /* không hỗ trợ */ }
    return { gpu, ua: navigator.userAgent, dpr: devicePixelRatio, viewport: innerWidth + '×' + innerHeight, cores: navigator.hardwareConcurrency };
  });
  console.log('Môi trường:', JSON.stringify(env));

  // ---- trong trang: dựng kịch bản, lấy mẫu ----
  const setup = sc => page.evaluate(sc => {
    const K = window.__vkkt;
    K.QualityManager.auto = false;
    if (!window.__perfSnap) window.__perfSnap = K.snapshotGame();
    K.battle.sandbox = true; K.battle.speed = 1; K.battle.paused = false;
    if (K.battle.phase === 'fight') { K.battle.phase = 'prep'; }
    K.game.level = 9; K.game.over = false;
    for (const u of K.boardAllies()) K.removeUnit(u);
    sc.allies.forEach(([k, s, c, r]) => K.placeUnit(k, s, c, r));
    const orig = window.enemyLineup;
    window.enemyLineup = () => (sc.enemies || []).map(([k, s, c, r]) => [k, c, r, s]);
    K.battle.round = 3;
    try { K.setupRound(); } finally { window.enemyLineup = orig; }
    K.units.forEach(u => { if (u.team === 'enemy') u.reset(1); });
    if (sc.prep) { [['kiemdong', 1, 0, 0], ['mabinh', 1, 1, 0], ['hoa', 1, 2, 0], ['thietve', 1, 3, 0]].forEach(([k, s, c, r]) => { if (K.game.bench.indexOf(null) >= 0) K.moveToBench(K.placeUnit(k, s, c, r)); }); }
    if (!sc.prep) { K.battle.seedOverride = 7; K.startBattle(); K.battle.seedOverride = null; }
    window.__perfSc = { aoe: !!sc.aoe, ult: !!sc.ult, t0: performance.now(), nextForce: 2000, peak: { particles: 0, projectiles: 0, calls: 0, tris: 0, meshes: 0, statuses: 0, units: 0 }, fightEnd: null };
    K.PerfStats.reset();
    return { units: K.units.length, phase: K.battle.phase };
  }, sc);
  const sample = () => page.evaluate(() => {
    const K = window.__vkkt, S = window.__perfSc, now = performance.now() - S.t0;
    if ((S.aoe || S.ult) && now > S.nextForce && K.battle.phase === 'fight') {
      S.nextForce += S.ult ? 3000 : 2000;
      for (const u of K.units) if (u.alive && u.fsm.name !== 'cast' && u.fsm.name !== 'dead' && (S.aoe ? ['mage'].includes(u.def.role) : u.key === 'kiemtien')) { u.mana = u.maxMana; if (u.fsm.name !== 'stun') u.fsm.set('move'); }
    }
    if (K.battle.phase !== 'fight' && S.fightEnd === null && K.battle.result) S.fightEnd = +(now / 1000).toFixed(1);
    let meshes = 0; K.scene.traverseVisible(o => { if (o.isMesh || o.isPoints || o.isLine) meshes++; });
    const statuses = K.units.reduce((a, u) => a + (u.alive ? u.fx.list.length : 0), 0);
    const p = S.peak; p.particles = Math.max(p.particles, K.vfx.particles.live); p.projectiles = Math.max(p.projectiles, K.Projectiles.list.length);
    p.calls = Math.max(p.calls, K.PerfStats.calls); p.tris = Math.max(p.tris, K.PerfStats.tris); p.meshes = Math.max(p.meshes, meshes); p.statuses = Math.max(p.statuses, statuses);
    p.units = Math.max(p.units, K.units.filter(u => u.alive).length);
    return now;
  });
  const finish = () => page.evaluate(() => {
    const K = window.__vkkt, S = window.__perfSc, m = performance.memory || {}, mem = K.renderer.info.memory;
    return Object.assign({}, K.PerfStats.summary(), { peak: S.peak, fightEnd: S.fightEnd, phase: K.battle.phase, result: K.battle.result || null,
      jsHeapMB: m.usedJSHeapSize ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null, geometries: mem.geometries, textures: mem.textures, programs: (K.renderer.info.programs || []).length,
      pixelRatio: K.renderer.getPixelRatio(), drawBuffer: K.renderer.domElement.width + '×' + K.renderer.domElement.height });
  });
  const results = [];
  for (const sc of SCENARIOS) for (const q of sc.quality) {
    await page.evaluate(q => window.__vkkt.QualityManager.set(q, 'perf'), q);
    await page.waitForTimeout(300);
    await setup(sc);
    await page.waitForTimeout(400); await page.evaluate(() => window.__vkkt.PerfStats.reset());   // bỏ khung khởi động (biên dịch shader)
    const tEnd = Date.now() + SECS * 1000;
    while (Date.now() < tEnd) { await page.waitForTimeout(250); await sample(); }
    const r = Object.assign({ id: sc.id, name: sc.name, quality: q }, await finish());
    results.push(r);
    console.log(`${sc.name} @${q}: ${r.fps} FPS (1% thấp ${r.low1}) · khung ${r.frameMs} ms (p99 ${r.p99Ms}) · cập nhật ${r.updateMs} ms · render ${r.renderMs} ms · draw ${r.peak.calls} · tam giác ${r.peak.tris} · hạt ${r.peak.particles} · đạn ${r.peak.projectiles} · mesh ${r.peak.meshes} · heap ${r.jsHeapMB} MB · geo ${r.geometries} tex ${r.textures}`);
  }
  // ---- 7. nhiều vòng liên tiếp: theo dõi tài nguyên GPU / heap sau mỗi vòng (phát hiện rò rỉ) ----
  await page.evaluate(() => window.__vkkt.QualityManager.set('MEDIUM', 'perf'));
  const rounds = [];
  for (let i = 0; i < 8; i++) {
    await setup(SCENARIOS[2]);
    await page.evaluate(() => { window.__vkkt.battle.speed = 2; });
    const tEnd = Date.now() + 30000;
    while (Date.now() < tEnd) { await page.waitForTimeout(250); await sample(); if (await page.evaluate(() => window.__vkkt.battle.phase !== 'fight')) break; }
    const fr = await finish(), gameT = await page.evaluate(() => +window.__vkkt.battle.time.toFixed(1));
    await page.evaluate(() => { const K = window.__vkkt; if (K.battle.phase === 'fight') K.battle.phase = 'prep'; K.setupRound(); if (window.gc) window.gc(); });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => { const K = window.__vkkt, m = performance.memory || {}, mem = K.renderer.info.memory; let objs = 0; K.scene.traverse(() => objs++);
      return { jsHeapMB: m.usedJSHeapSize ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null, geometries: mem.geometries, textures: mem.textures, programs: (K.renderer.info.programs || []).length, sceneObjects: objs,
        units: K.units.length, projectiles: K.Projectiles.list.length, tasks: K.SimTasks.list.length, timelines: K.timelines.length, effects: K.vfx.effects.length, particles: K.vfx.particles.live }; });
    rounds.push({ round: i + 1, fps: fr.fps, low1: fr.low1, gameTime: gameT, result: fr.result, after });
    console.log(`vòng ${i + 1}: ${fr.fps} FPS · ${gameT} s trận (${fr.result || 'chưa xong'}) · sau dọn: ${JSON.stringify(after)}`);
  }
  await page.evaluate(() => { restoreGame(window.__perfSnap); });
  const out = { tag: TAG, date: new Date().toISOString(), env, secsPerScenario: SECS, note: 'Chromium headless + SwiftShader (WebGL chạy trên CPU). Không phải số liệu thiết bị thật.', results, rounds, errors };
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, `docs/reports/perf-${TAG}.json`), JSON.stringify(out, null, 1));
  console.log('lỗi console:', errors.length, errors.slice(0, 5));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
