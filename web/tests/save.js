// Kiểm thử hệ thống lưu (mục IX): chuyển phiên bản v1 → v3, bản lưu hỏng / thiếu trường / của bản mới hơn, giữ tùy chọn đồ hoạ,
// lưu / tải đầy đủ (vòng, máu, vàng, cấp, kinh nghiệm, tướng, sao, vị trí, hàng chờ, cửa hàng), bảng Debug không ghi bản lưu chính.
// Chạy: cd web && npm run test:save
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
  /** Đặt localStorage rồi tải lại trang (boot đọc bản lưu). */
  const boot = async (entries, clear = true) => {
    await page.evaluate(([e, c]) => { if (c) localStorage.clear(); localStorage.setItem('vkkt_prepTimer', 'false'); for (const k in e) localStorage.setItem(k, e[k]); }, [entries, clear]);
    await page.reload(); await page.waitForFunction(() => window.__vkkt && window.__vkkt.units);
  };
  const state = () => page.evaluate(() => { const K = window.__vkkt, g = K.game;
    return { round: K.battle.round, hp: g.hp, gold: g.gold, level: g.level, xp: g.xp, streak: g.streak, shop: g.shop.slice(), bench: g.bench.map(e => e && e.key + '*' + e.star),
      board: K.boardAllies().map(u => u.key + '*' + u.star + '@' + u.homeTile.c + ',' + u.homeTile.r).sort(), save: localStorage.getItem('vkkt_save'), backup: localStorage.getItem('vkkt_save_backup'), enter: document.getElementById('btn-enter').textContent }; });

  // 1. bản lưu v1 hợp lệ (định dạng V1.5 tuần 3) → chuyển sang v2, giữ đủ dữ liệu
  const v1 = { v: 1, hp: 63, gold: 27, level: 6, xp: 5, streak: -2, round: 9, over: false, shop: ['kiemdong', null, 'ngukiem', 'linhy', 'mabinh'], rivals: { kiemdong: 3 }, items: [],
    bench: [{ key: 'thanhphong', star: 2, items: [] }, null, { key: 'hoa', star: 1, items: [] }, null, null, null, null, null, null],
    board: [{ key: 'kimcuong', star: 2, c: 3, r: 3 }, { key: 'cuuviem', star: 1, c: 5, r: 1 }, { key: 'linhcung', star: 3, c: 2, r: 0 }] };
  await boot({ vkkt_save: JSON.stringify(v1) });
  let s = await state();
  check('v1 → v3: vòng / máu / vàng / cấp / kinh nghiệm / chuỗi', s.round === 9 && s.hp === 63 && s.gold === 27 && s.level === 6 && s.xp === 5 && s.streak === -2, JSON.stringify([s.round, s.hp, s.gold, s.level, s.xp, s.streak]));
  check('v1 → v3: tướng, sao, vị trí trên bàn', s.board.join(' ') === ['cuuviem*1@5,1', 'kimcuong*2@3,3', 'linhcung*3@2,0'].join(' '), s.board.join(' '));
  check('v1 → v3: hàng chờ và cửa hàng', s.bench[0] === 'thanhphong*2' && s.bench[2] === 'hoa*1' && s.shop.join() === v1.shop.join(), s.bench.join() + ' | ' + s.shop.join());
  check('v1 → v3: nút "Tiếp tục – Vòng 9"', /Vòng 9/.test(s.enter), s.enter);
  // ghi lại sau một thao tác (mua XP) → bản lưu v2
  await page.click('#btn-enter');
  await page.evaluate(() => window.__vkkt.buyXP());
  s = await state(); const sv = JSON.parse(s.save);
  check('ghi lại thành v3 (có savedAt, kho pháp bảo, không chứa đối tượng Three.js)', sv.v === 3 && sv.inv && Array.isArray(sv.inv.items) && sv.savedAt > 0 && !/"isObject3D"|"uuid"/.test(s.save) && s.save.length < 4000, 'v' + sv.v + ', ' + s.save.length + ' byte');
  { const bk = await page.evaluate(() => localStorage.getItem('vkkt_save_backup_v1'));
    check('nâng phiên bản: bản gốc v1 được sao lưu ở vkkt_save_backup_v1 trước khi ghi v3', bk && JSON.parse(bk).v === 1 && JSON.parse(bk).round === 9, bk ? 'v' + JSON.parse(bk).v : 'không có'); }
  // 2. tải lại → giống hệt
  const before = s;
  await boot({}, false); s = await state();
  check('lưu → tải lại: trạng thái giống hệt', JSON.stringify([s.round, s.hp, s.gold, s.level, s.xp, s.board, s.bench, s.shop]) === JSON.stringify([before.round, before.hp, before.gold, before.level, before.xp, before.board, before.bench, before.shop]));
  // 3. JSON hỏng → sao lưu nguyên văn, ván mới, không mất dữ liệu
  await boot({ vkkt_save: '{"v":2,"hp":50,"gold":' });
  s = await state();
  check('JSON hỏng: giữ bản sao ở vkkt_save_backup', s.backup === '{"v":2,"hp":50,"gold":', s.backup);
  check('JSON hỏng: vào ván mới an toàn', s.round === 1 && s.hp === 100 && s.board.length === 2);
  // 4. bản lưu của phiên bản mới hơn → không đọc, không xoá (sao lưu)
  const v99 = JSON.stringify(Object.assign({}, v1, { v: 99 }));
  await boot({ vkkt_save: v99 });
  s = await state();
  check('bản lưu v99: không tải, giữ nguyên ở vkkt_save_backup', s.backup === v99 && s.round === 1);
  // 5. trường hỏng / thiếu → làm sạch
  await boot({ vkkt_save: JSON.stringify({ v: 1, hp: 'abc', gold: -50, level: 42, xp: null, round: 4.7, streak: 'x', shop: [1, 2], bench: 'nope',
    board: [{ key: 'khongco', star: 1, c: 1, r: 1 }, { key: 'kiemdong', star: 9, c: 2, r: 2 }, { key: 'thietve', star: 1, c: 3, r: 3 }, { key: 'mabinh', star: 1, c: 3, r: 3 }, { key: 'hoa', star: 1, c: 40, r: -3 }] }) });
  s = await state();
  check('trường hỏng: số hợp lệ (máu 100, vàng ≥ 0, cấp ≤ 9, vòng nguyên)', s.hp === 100 && s.gold >= 0 && s.level === 9 && s.round === 4 && s.xp === 0 && s.streak === 0, JSON.stringify([s.hp, s.gold, s.level, s.round, s.xp, s.streak]));
  check('trường hỏng: bỏ tướng không tồn tại / sao sai, ô trùng hoặc ngoài bàn → hàng chờ', s.board.join() === 'thietve*1@3,3' && s.bench.filter(Boolean).sort().join() === 'hoa*1,mabinh*1', s.board.join() + ' | ' + s.bench.filter(Boolean).join());
  check('trường hỏng: cửa hàng sai độ dài → làm mới đủ 5 ô', s.shop.length === 5 && s.shop.every(k => k === null || typeof k === 'string'));
  // 6. ván đã kết thúc → ván mới (không sao lưu vì không phải lỗi)
  await boot({ vkkt_save: JSON.stringify(Object.assign({}, v1, { hp: 0, over: true })) });
  s = await state();
  check('ván đã kết thúc → ván mới, không tạo bản sao lỗi', s.round === 1 && s.backup === null);
  // 7. tùy chọn đồ hoạ lưu riêng, còn sau khi bản lưu hỏng
  await boot({ vkkt_save: 'rác', vkkt_quality: '"LOW"', vkkt_autoQuality: 'false' });
  const q = await page.evaluate(() => ({ level: window.__vkkt.QualityManager.level, auto: window.__vkkt.QualityManager.auto }));
  check('tùy chọn đồ hoạ giữ nguyên (LOW, tắt tự giảm) dù bản lưu hỏng', q.level === 'LOW' && q.auto === false, JSON.stringify(q));
  // 8. bảng Debug: trận thử + mô phỏng không đụng bản lưu chính
  await boot({ vkkt_save: JSON.stringify(v1) });
  await page.click('#btn-enter');
  const save0 = await page.evaluate(() => localStorage.getItem('vkkt_save'));
  const dbg = await page.evaluate(async save0 => {
    const K = window.__vkkt, D = K.DebugPanel; D.toggle(true);
    D.act('lineup'); const midSandbox = K.battle.sandbox; D.act('end');
    D.act('fight'); K.simulate(70); D.act('end');
    D.act('lineup'); K.BalanceSimulator.run({ n: 3, seed: 5, keepFights: false }); const stillSandbox = K.battle.sandbox; D.act('end');
    D.toggle(false);
    const strip = t => { const o = JSON.parse(t); delete o.savedAt; return JSON.stringify(o); };   // ghi lại cùng trạng thái chỉ đổi dấu thời gian
    return { midSandbox, stillSandbox, same: strip(localStorage.getItem('vkkt_save')) === strip(save0), round: K.battle.round, board: K.boardAllies().length };
  }, save0);
  check('Debug: trận thử / đội hình thử / mô phỏng không ghi bản lưu chính', dbg.midSandbox && dbg.stillSandbox && dbg.same && dbg.round === 9 && dbg.board === 3, JSON.stringify({ mid: dbg.midSandbox, still: dbg.stillSandbox, same: dbg.same, round: dbg.round, board: dbg.board }));
  // 9. không ghi mỗi khung hình
  const writes = await page.evaluate(async () => {
    let n = 0; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'vkkt_save') n++; return orig.call(this, k, v); };
    await new Promise(r => setTimeout(r, 2000)); Storage.prototype.setItem = orig; return n;
  });
  check('không ghi bản lưu mỗi khung hình (2 s đứng yên: 0 lần ghi)', writes === 0, writes + ' lần');
  check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | '));
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} PASS`);
  fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'docs/reports/save-test.json'), JSON.stringify({ date: new Date().toISOString(), results }, null, 1));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
