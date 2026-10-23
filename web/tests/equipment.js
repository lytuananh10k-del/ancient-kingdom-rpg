// Kiểm thử hệ thống Pháp bảo V1.6 (mục XIII): EquipmentTestRunner trong trang (dữ liệu, ghép, trang bị, nâng sao, lưu, nội tại, LOW/ULTRA, 24 tướng, kinh tế)
// + giao diện thật: Windows (chuột – kéo thả, rê xem chỉ số) và Android (cảm ứng – chạm 2 nguyên liệu, chạm pháp bảo rồi chạm tướng) ở màn ngang / dọc,
// bố cục không che nút giao chiến, lưu / tải lại trang. Chạy: cd web && npm run test:equipment → docs/reports/equipment.json
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const ORIGIN = 'http://vkkt.test';
const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok: !!ok, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (detail !== undefined ? ' – ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')); };

async function open(browser, opt) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 844, height: 390 } }, opt));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); localStorage.setItem('vkkt_quality', '"LOW"'); localStorage.setItem('vkkt_autoQuality', 'false'); });
  await page.reload(); await page.click('#btn-enter'); await page.waitForTimeout(500);
  return { page, ctx, errors };
}
/** Toạ độ màn hình của tướng phe ta thứ i (ngực). */
const unitXY = (page, i = 0) => page.evaluate(i => { const K = window.__vkkt, u = K.boardAllies()[i], v = u.pos.clone(); v.y = 1; v.project(K.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, cid: u.cid }; }, i);
const enemyXY = page => page.evaluate(() => { const K = window.__vkkt, u = K.units.find(x => x.team === 'enemy'), v = u.pos.clone(); v.y = 1; v.project(K.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; });
const center = async (page, sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const give = (page, list) => page.evaluate(l => { const K = window.__vkkt; l.forEach(k => K.ArtifactInventory.add(k)); K.ui.update(); }, list);
const slotOf = (page, itemId, n = 0) => page.evaluate(([id, n]) => window.__vkkt.ArtifactInventory.invList().filter(r => r.itemId === id)[n].slot, [itemId, n]);

async function main() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  // ---------- A. EquipmentTestRunner (logic) ----------
  {
    const { page, ctx, errors } = await open(browser);
    const r = await page.evaluate(() => window.__vkkt.EquipmentTestRunner.run());
    console.log(`EquipmentTestRunner: ${r.pass}/${r.total} trong ${r.ms} ms`);
    r.results.forEach(x => check(String(x.id), x.name, x.ok, x.detail));
    check('A-err', 'EquipmentTestRunner không gây lỗi console', !errors.length, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- B. Windows: chuột, kéo thả, rê chuột ----------
  {
    const { page, ctx, errors } = await open(browser, { viewport: { width: 1280, height: 720 } });
    await give(page, ['sword', 'staff', 'armor', 'armor', 'jade']);
    // kéo Linh Kiếm thả lên Pháp Trượng → bảng công thức → Ghép
    const a = await center(page, `.aslot[data-slot="${await slotOf(page, 'sword')}"]`), b = await center(page, `.aslot[data-slot="${await slotOf(page, 'staff')}"]`);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x - 20, a.y + 10, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(150);
    const popup = await page.isVisible('#art-craft'), text = popup ? await page.textContent('#art-craft') : '';
    if (popup) await page.click('#ac-ok');
    await page.waitForTimeout(150);
    const inv1 = await page.evaluate(() => window.__vkkt.ArtifactInventory.invList().map(r => r.itemId));
    check('B1', 'Windows: kéo nguyên liệu thả lên nguyên liệu → xem công thức (Pháp Kiếm Lôi Đình) → Ghép', popup && /Pháp Kiếm Lôi Đình/.test(text) && inv1.includes('phap_kiem_loi_dinh') && !inv1.includes('sword') && !inv1.includes('staff'), inv1);
    // rê chuột: nhấn chọn pháp bảo (sau khi ghép không tự chọn), rê lên tướng → tooltip chỉ số thay đổi
    await page.click(`.aslot[data-slot="${await slotOf(page, 'phap_kiem_loi_dinh')}"]`);
    const u = await unitXY(page, 0);
    await page.mouse.move(u.x - 30, u.y); await page.mouse.move(u.x, u.y, { steps: 3 }); await page.waitForTimeout(120);
    const tip = (await page.isVisible('#art-tip')) ? await page.textContent('#art-tip') : '';
    check('B2', 'Windows: rê chuột lên tướng khi đang cầm pháp bảo → xem chỉ số thay đổi trước khi trang bị', /Công \d+→\d+/.test(tip) && /Phép \d+→\d+/.test(tip), tip.slice(-80));
    // kéo pháp bảo từ kho thả lên tướng → trang bị
    const art = await center(page, `.aslot[data-slot="${await slotOf(page, 'phap_kiem_loi_dinh')}"]`);
    await page.mouse.move(art.x, art.y); await page.mouse.down(); await page.mouse.move(art.x - 30, art.y, { steps: 4 }); await page.mouse.move(u.x, u.y, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(200);
    const eq = await page.evaluate(cid => ({ items: window.__vkkt.ArtifactInventory.itemIdsOf(cid).slice(), audit: window.__vkkt.ArtifactInventory.audit() }), u.cid);
    check('B3', 'Windows: kéo pháp bảo từ kho thả lên tướng → trang bị', eq.items.includes('phap_kiem_loi_dinh') && !eq.audit.length, eq);
    // chạm nguyên liệu kéo lên tướng → báo lỗi rõ ràng, không đổi gì
    const jade = await center(page, `.aslot[data-slot="${await slotOf(page, 'jade')}"]`);
    await page.mouse.move(jade.x, jade.y); await page.mouse.down(); await page.mouse.move(jade.x - 30, jade.y, { steps: 4 }); await page.mouse.move(u.x, u.y, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(150);
    const toast = await page.textContent('#toast'), still = await page.evaluate(cid => window.__vkkt.ArtifactInventory.itemIdsOf(cid).length, u.cid);
    check('B4', 'Windows: thả nguyên liệu lên tướng → thông báo "chỉ trang bị được pháp bảo hoàn chỉnh", không đổi gì', /pháp bảo hoàn chỉnh/.test(toast) && still === 1, toast);
    // bảng công thức + thu gọn
    await page.click('#ad-book'); await page.waitForTimeout(100);
    const cells = await page.locator('#book-table button[data-art]').count();
    await page.click('#book-table button[data-art="bat_diet_than_giap"]');
    const det = await page.textContent('#book-detail'); await page.click('#btn-book-close');
    check('B5', 'Bảng công thức: 8×8 ô (36 pháp bảo, A+B = B+A), nhấn để xem chỉ số + nội tại', cells === 64 && /Bất Diệt Thần Giáp/.test(det) && /giữ lại 1 máu/.test(det), { cells });
    await page.click('#ad-toggle'); const col = await page.evaluate(() => ({ c: document.getElementById('art-dock').classList.contains('collapsed'), grid: getComputedStyle(document.getElementById('ad-grid')).display }));
    await page.click('#ad-toggle');
    check('B6', 'Kho thu gọn được (nhớ lựa chọn)', col.c && col.grid === 'none', col);
    // không che nút giao chiến / cửa hàng; không bắt sự kiện kéo tướng
    const lay = await page.evaluate(() => { const r = e => document.getElementById(e).getBoundingClientRect(), d = r('art-dock'), o = ['prep-panel', 'btn-start'].map(r); return o.map(q => !(q.right <= d.left || q.left >= d.right || q.bottom <= d.top || q.top >= d.bottom)); });
    check('B7', 'Kho không che cửa hàng / nút Giao chiến (1280×720)', lay.every(x => !x), lay);
    // 3 ô trang bị trên bảng thông tin + tháo về kho
    await page.mouse.click(u.x, u.y); await page.waitForTimeout(250);
    const slots = await page.locator('#ui-items .eqs').count();
    await page.click('#ui-items .eqs.full .un'); await page.waitForTimeout(150);
    const back = await page.evaluate(cid => ({ own: window.__vkkt.ArtifactInventory.itemIdsOf(cid).length, inv: window.__vkkt.ArtifactInventory.invList().map(r => r.itemId) }), u.cid);
    check('B8', 'Chạm tướng → bảng thông tin có 3 ô pháp bảo; nút ↩ tháo về kho', slots === 3 && back.own === 0 && back.inv.includes('phap_kiem_loi_dinh'), { slots, back });
    // giao tranh: kho ẩn, không đổi đồ được
    await page.evaluate(() => window.__vkkt.startBattle()); await page.waitForTimeout(100);
    const hidden = await page.evaluate(() => document.getElementById('art-dock').hidden);
    await page.evaluate(() => { const K = window.__vkkt; K.simulate(70); });
    check('B9', 'Giao tranh: kho pháp bảo ẩn (không đổi đồ trong trận tiêu chuẩn)', hidden, { hidden });
    check('B-err', 'Windows: không lỗi console', !errors.length, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- C. Android: cảm ứng, màn ngang 844×390 và dọc 400×820 ----------
  for (const [w, h, tag] of [[844, 390, 'ngang'], [400, 820, 'dọc']]) {
    const { page, ctx, errors } = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await give(page, ['bow', 'bow', 'glove']);
    await page.tap(`.aslot[data-slot="${await slotOf(page, 'bow', 0)}"]`); await page.waitForTimeout(80);
    const hint = await page.textContent('#ad-hint');
    await page.tap(`.aslot[data-slot="${await slotOf(page, 'bow', 1)}"]`); await page.waitForTimeout(120);
    const popup = await page.isVisible('#art-craft');
    // trong lúc chờ xác nhận: 2 nguyên liệu bị giữ chỗ
    const locked = await page.evaluate(() => window.__vkkt.ArtifactInventory.invList().filter(r => window.__vkkt.ArtifactInventory.isLocked(r.instanceId)).length);
    if (popup) await page.tap('#ac-ok'); await page.waitForTimeout(150);
    const inv = await page.evaluate(() => window.__vkkt.ArtifactInventory.invList().map(r => r.itemId));
    check(`C1-${tag}`, `Android (${tag} ${w}×${h}): chạm nguyên liệu 1 → gợi ý công thức → chạm nguyên liệu 2 → xác nhận → Phong Lôi Thần Cung`, /Chọn nguyên liệu thứ 2/.test(hint) && popup && locked === 2 && inv.includes('phong_loi_than_cung') && inv.length === 2, { hint: hint.slice(0, 60), popup, locked, inv });
    // chạm pháp bảo rồi chạm tướng địch → từ chối; chạm tướng ta → trang bị
    await page.tap(`.aslot[data-slot="${await slotOf(page, 'phong_loi_than_cung')}"]`); await page.waitForTimeout(80);
    const e = await enemyXY(page); await page.touchscreen.tap(e.x, e.y); await page.waitForTimeout(120);
    const toast = await page.textContent('#toast');
    const u = await unitXY(page, 0); await page.touchscreen.tap(u.x, u.y); await page.waitForTimeout(200);
    const own = await page.evaluate(cid => window.__vkkt.ArtifactInventory.itemIdsOf(cid).slice(), u.cid);
    check(`C2-${tag}`, `Android (${tag}): chạm pháp bảo → chạm tướng địch bị từ chối → chạm tướng ta để trang bị`, /đối thủ/.test(toast) && own.includes('phong_loi_than_cung'), { toast, own });
    // nhấn giữ ô kho → tooltip
    const g = await center(page, `.aslot[data-slot="${await slotOf(page, 'glove')}"]`);
    await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: x, clientY: y })); }, g);
    await page.waitForTimeout(550); const tipOn = await page.isVisible('#art-tip'), tipText = tipOn ? await page.textContent('#art-tip') : '';
    await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: x, clientY: y })); }, g);
    check(`C3-${tag}`, `Android (${tag}): nhấn giữ ô kho → tooltip nguyên liệu`, tipOn && /Thiên Cơ Thủ/.test(tipText), tipText.slice(0, 60));
    const lay = await page.evaluate(() => { const r = e => document.getElementById(e).getBoundingClientRect(), d = r('art-dock'), o = ['prep-panel', 'btn-start', 'btn-menu'].map(r); return { overlap: o.map(q => !(q.right <= d.left || q.left >= d.right || q.bottom <= d.top || q.top >= d.bottom)), slot: document.querySelector('.aslot').getBoundingClientRect().width }; });
    check(`C4-${tag}`, `Android (${tag}): kho không che cửa hàng / nút Giao chiến / Menu, ô ≥ 44 px`, lay.overlap.every(x => !x) && lay.slot >= 44, lay);
    // lưu / tải lại trang: đồ còn nguyên
    const before = await page.evaluate(() => JSON.stringify(window.__vkkt.ArtifactInventory.serialize()));
    await page.reload(); await page.click('#btn-enter'); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ s: JSON.stringify(window.__vkkt.ArtifactInventory.serialize()), audit: window.__vkkt.ArtifactInventory.audit(), own: window.__vkkt.boardAllies().map(u => u.items.join('+')).join(',') }));
    check(`C5-${tag}`, `Android (${tag}): tải lại trang → kho và pháp bảo trên tướng giống hệt, sổ toàn vẹn`, before === after.s && !after.audit.length && /phong_loi_than_cung/.test(after.own), after.own);
    check(`C-err-${tag}`, `Android (${tag}): không lỗi console`, !errors.length, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} PASS`);
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/reports/equipment.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Chromium headless + SwiftShader; Android = giả lập cảm ứng (hasTouch, isMobile)', results }, null, 1));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
