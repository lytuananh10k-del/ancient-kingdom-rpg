// Kiểm tra rò rỉ bộ nhớ / tài nguyên GPU (mục VIII). Đếm geometry / texture / shader (renderer.info), heap JS (sau gc), số đối tượng cảnh,
// số listener đăng ký, đạn / tác vụ / vùng nguy hiểm / timeline / trạng thái còn sót – qua: nhiều trận liên tiếp, ván mới, đổi mức đồ hoạ,
// thay GLB nhiều lần cho cùng một tướng, đổi rig về thủ tục. Chạy: cd web && npm run test:memory → docs/reports/memory.json
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' – ' + detail : '')); };

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  // đếm addEventListener / removeEventListener theo (loại đích, sự kiện) – phát hiện listener nhân đôi
  await ctx.addInitScript(() => {
    const L = window.__listeners = new Map(), add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
    const key = (t, ev) => (t === window ? 'window' : t === document ? 'document' : t && t.id ? '#' + t.id : t && t.constructor ? t.constructor.name : '?') + ':' + ev;
    EventTarget.prototype.addEventListener = function (ev, fn, o) { const k = key(this, ev); L.set(k, (L.get(k) || 0) + 1); return add.call(this, ev, fn, o); };
    EventTarget.prototype.removeEventListener = function (ev, fn, o) { const k = key(this, ev); L.set(k, (L.get(k) || 0) - 1); return rem.call(this, ev, fn, o); };
  });
  const page = await ctx.newPage();
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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); localStorage.setItem('vkkt_quality', '"MEDIUM"'); localStorage.setItem('vkkt_autoQuality', 'false'); });
  await page.reload();
  await page.click('#btn-enter');
  await page.waitForTimeout(800);
  /** Ảnh chụp tài nguyên sau khi vẽ vài khung (để renderer tải / giải phóng) và gc. */
  const snap = async label => {
    await page.waitForTimeout(400);
    return page.evaluate(label => {
      if (window.gc) window.gc();
      const K = window.__vkkt, mem = K.renderer.info.memory, m = performance.memory; let objs = 0; K.scene.traverse(() => objs++);
      // listener trên đích cố định (window / document / phần tử có id); nút tạo lại mỗi lượt (thẻ cửa hàng…) đếm riêng bằng số nút còn trong DOM
      const lis = {}; for (const [k, v] of window.__listeners) if (v && !/^HTML/.test(k)) lis[k] = v;
      const skel = K.units.concat(K.benchUnits.filter(Boolean)).filter(u => u.rig && u.rig.skeleton).length;
      return { label, geometries: mem.geometries, textures: mem.textures, programs: (K.renderer.info.programs || []).length, heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(2) : null,
        sceneObjects: objs, skeletons: skel, baseTextures: mem.textures - skel, domButtons: document.querySelectorAll('button').length, domNodes: document.getElementsByTagName('*').length, units: K.units.length, bench: K.benchUnits.filter(Boolean).length, listeners: Object.values(lis).reduce((a, b) => a + b, 0), lis,
        projectiles: K.Projectiles.list.length, tasks: K.SimTasks.list.length, zones: K.DangerZones.list.length, timelines: K.timelines.length, effects: K.vfx.effects.length,
        deadStatuses: K.units.filter(u => !u.alive).reduce((a, u) => a + u.fx.list.length, 0) };
    }, label);
  };
  const log = [];
  const s0 = await snap('khởi động'); log.push(s0);
  // ---- A. 12 trận liên tiếp có render (mỗi trận đánh tới khi xong, rồi sang vòng) ----
  const fight = () => page.evaluate(() => {
    const K = window.__vkkt; K.game.gold = 50; K.game.hp = 100; K.game.over = false;
    if (K.boardAllies().length < 4) [['kimcuong', 1, 3, 3], ['linhcung', 1, 2, 1], ['cuuviem', 1, 5, 1], ['thanhphong', 1, 4, 3]].forEach(a => { if (!K.boardAllies().some(u => u.homeTile.c === a[2] && u.homeTile.r === a[3])) K.placeUnit(...a); });
    K.startBattle(); K.simulate(62);
    const left = { projectiles: K.Projectiles.list.length, tasks: K.SimTasks.list.length, zones: K.DangerZones.list.length, deadStatuses: K.units.filter(u => !u.alive).reduce((a, u) => a + u.fx.list.length, 0) };
    return { phase: K.battle.phase, result: K.battle.result, time: +K.battle.time.toFixed(1), left };
  });
  const after = [];
  // cùng một vòng (5 – đội địch cố định) lặp lại → cảnh giống hệt nhau mỗi lần: mọi bộ đếm phải bằng nhau nếu không rò rỉ
  for (let i = 0; i < 12; i++) {
    const r = await fight(); after.push(r);
    await page.waitForTimeout(150);
    await page.evaluate(() => { const K = window.__vkkt; if (K.battle.phase !== 'prep') K.nextRound(); K.battle.round = 5; K.setupRound(); });
    log.push(await snap('sau trận ' + (i + 1)));
  }
  const sA = log[log.length - 1], sA3 = log[3];
  check('12 trận: mọi trận kết thúc', after.every(r => r.phase !== 'fight'), after.map(r => r.result + '@' + r.time).join(' '));
  check('12 trận: hết trận không sót đạn / tác vụ / vùng / trạng thái trên tướng chết', after.every(r => !r.left.projectiles && !r.left.tasks && !r.left.zones && !r.left.deadStatuses), JSON.stringify(after.map(r => r.left).filter(l => l.projectiles || l.tasks || l.zones || l.deadStatuses)));
  check('12 trận: geometry / texture / shader / đối tượng cảnh không tăng (so với sau trận 3)', sA.geometries <= sA3.geometries && sA.textures <= sA3.textures && sA.programs <= sA3.programs && sA.sceneObjects === sA3.sceneObjects, `geo ${sA3.geometries}→${sA.geometries} · tex ${sA3.textures}→${sA.textures} (bone texture ${sA.skeletons}) · shader ${sA3.programs}→${sA.programs} · cảnh ${sA3.sceneObjects}→${sA.sceneObjects}`);
  check('12 trận: heap JS ổn định (tăng < 3 MB từ trận 3 → 12)', sA.heapMB - sA3.heapMB < 3, `${sA3.heapMB} → ${sA.heapMB} MB`);
  check('12 trận: listener không nhân đôi (đích cố định), nút / phần tử DOM không tích tụ (± 8 phần tử tạm: thông báo, chữ bay)', sA.listeners === sA3.listeners && sA.domButtons === sA3.domButtons && Math.abs(sA.domNodes - sA3.domNodes) <= 8, `listener ${sA3.listeners} → ${sA.listeners} · nút ${sA3.domButtons} → ${sA.domButtons} · phần tử ${sA3.domNodes} → ${sA.domNodes}`);
  check('12 trận: sau dọn vòng không còn timeline / hiệu ứng', sA.timelines === 0 && sA.effects === 0 && sA.projectiles === 0, JSON.stringify({ tl: sA.timelines, fx: sA.effects, pj: sA.projectiles }));
  // ---- B. ván mới × 5 ----
  const sB0 = await snap('trước ván mới');
  for (let i = 0; i < 5; i++) { await page.evaluate(() => window.__vkkt.newGame()); await page.waitForTimeout(120); }
  const sB = await snap('sau 5 ván mới'); log.push(sB0, sB);
  const sB1 = await (async () => { await page.evaluate(() => window.__vkkt.newGame()); return snap('ván mới thứ 6'); })(); log.push(sB1);
  check('ván mới × 6: tài nguyên không tăng giữa lần 5 và 6', sB1.geometries <= sB.geometries && sB1.textures <= sB.textures && sB1.sceneObjects === sB.sceneObjects && sB1.listeners === sB.listeners && Math.abs(sB1.domNodes - sB.domNodes) <= 8, `geo ${sB.geometries}→${sB1.geometries} · cảnh ${sB.sceneObjects}→${sB1.sceneObjects} · listener ${sB.listeners}→${sB1.listeners} · phần tử DOM ${sB.domNodes}→${sB1.domNodes}`);
  // ---- C. đổi mức đồ hoạ LOW → ULTRA × 3 ----
  for (let k = 0; k < 3; k++) for (const q of ['LOW', 'MEDIUM', 'HIGH', 'ULTRA']) { await page.evaluate(q => window.__vkkt.QualityManager.set(q), q); await page.waitForTimeout(150); }
  const sC1 = await snap('sau 3 vòng đổi đồ hoạ');
  for (const q of ['LOW', 'MEDIUM', 'HIGH', 'ULTRA']) { await page.evaluate(q => window.__vkkt.QualityManager.set(q), q); await page.waitForTimeout(150); }
  const sC2 = await snap('sau 4 vòng đổi đồ hoạ'); log.push(sC1, sC2);
  check('đổi đồ hoạ: texture (render target bloom / bóng) không tăng thêm sau mỗi vòng', sC2.textures <= sC1.textures && sC2.geometries <= sC1.geometries && sC2.listeners === sC1.listeners, `tex ${sC1.textures}→${sC2.textures} · geo ${sC1.geometries}→${sC2.geometries}`);
  await page.evaluate(() => window.__vkkt.QualityManager.set('MEDIUM'));
  // ---- D. thay GLB × 4 cho cùng một tướng (glTF tối thiểu tạo tại chỗ), rồi trở lại rig thủ tục ----
  const glb = await page.evaluate(async () => {
    const K = window.__vkkt;
    for (const u of K.boardAllies()) K.removeUnit(u); K.placeUnit('kiemdong', 1, 3, 3); K.placeUnit('kiemdong', 1, 4, 3);
    // glTF 2.0 nhỏ nhất: 1 tam giác + 1 nút + 1 clip "Idle" (xoay nút) – đủ để GLTFLoader / GLTFRig chạy
    const f32 = new Float32Array([0, 0, 0, 0.5, 0, 0, 0, 1, 0, /* thời điểm */ 0, 1, /* quaternion */ 0, 0, 0, 1, 0, 0.383, 0, 0.924]);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(f32.buffer)));
    const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Hips', mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      buffers: [{ byteLength: f32.byteLength, uri: 'data:application/octet-stream;base64,' + b64 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 8 }, { buffer: 0, byteOffset: 44, byteLength: 32 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [0.5, 1, 0] }, { bufferView: 1, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] }, { bufferView: 2, componentType: 5126, count: 2, type: 'VEC4' }],
      animations: [{ name: 'Idle', channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }], samplers: [{ input: 1, output: 2 }] }] };
    const buf = new TextEncoder().encode(JSON.stringify(gltf)).buffer;
    const mem = () => ({ geo: K.renderer.info.memory.geometries, tex: K.renderer.info.memory.textures });
    const wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await wait(); const m0 = mem(); const counts = [];
    for (let i = 0; i < 4; i++) { const r = await K.loadGlbBuffer(buf.slice(0), 'thu.gltf', 'kiemdong'); await wait(); counts.push(Object.assign(mem(), { found: r.found.length })); }
    delete K.RIG_FACTORIES.kiemdong; K.replaceChampionRig('kiemdong'); await wait();
    return { m0, counts, back: mem(), rigs: K.boardAllies().map(u => u.rig.constructor.name) };
  }).catch(e => ({ error: e.message }));
  if (glb.error) check('thay GLB × 4', false, glb.error);
  else {
    check('thay GLB × 4: geometry không tăng dần (GLB cũ được giải phóng)', glb.counts[3].geo <= glb.counts[1].geo && glb.counts[3].tex <= glb.counts[1].tex, JSON.stringify(glb.counts));
    check('trở lại rig thủ tục: geometry về mức trước khi nạp GLB', glb.back.geo <= glb.m0.geo + 1 && glb.rigs.every(n => n === 'CharacterRig'), `trước ${glb.m0.geo} → sau ${glb.back.geo} · ${glb.rigs.join(',')}`);
  }
  // ---- E. rig gộp (SkinnedMesh) không tạo thêm geometry khi có thêm bản sao cùng tướng ----
  const inst = await page.evaluate(async () => {
    const K = window.__vkkt, wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const u of K.boardAllies()) K.removeUnit(u); K.placeUnit('kimcuong', 1, 3, 3); await wait(); const a = K.renderer.info.memory.geometries;
    for (let c = 0; c < 6; c++) K.placeUnit('kimcuong', 1, c, 2); await wait(); const b = K.renderer.info.memory.geometries;
    for (const u of K.boardAllies()) K.removeUnit(u); await wait();
    return { one: a, seven: b, batched: !!(K.units.find(u => u.team === 'enemy') || {}).rig };
  });
  check('7 bản cùng tướng dùng chung geometry gộp (không thêm geometry)', inst.seven === inst.one, `1 bản: ${inst.one} · 7 bản: ${inst.seven}`);
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} PASS`);
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/reports/memory.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Chromium headless + SwiftShader', results, snapshots: log.map(s => Object.assign({}, s, { lis: undefined })), listenersAtEnd: log[log.length - 1].lis, glb, inst }, null, 1));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
