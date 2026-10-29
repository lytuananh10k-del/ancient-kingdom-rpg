// Kiểm thử lối chơi Phiêu Lưu (V2.0) – chạy trong Chromium thật (WebGL SwiftShader), thao tác qua bàn phím thật / nhấp chuột thật
// vào giao diện, và qua đường điều khiển thật của nhân vật (inp → Player.control) khi cần tua nhanh bằng simulate().
// Phủ: tạo nhân vật, chạy / nhảy / bay / bục nổi, NPC (Sư Phụ, Linh Thương, Luyện Khí Sư, Truyền Tống Sứ, Linh Đan Thụ, Tế Đàn),
// 15 kỹ năng (3 tông môn), quái + rơi đồ + nhặt, tu vi / linh căn / đột phá, nhiệm vụ chính tuyến, trang bị / pháp bảo / cường hoá,
// boss theo giờ, Long Châu + Thần Long, tử trận / hồi sinh, cổng bản đồ + khoá cảnh giới, lưu / tải lại / bản lưu hỏng, lỗi console.
// Chạy: cd web && npm run test:rpg        (SECT=phap / vo để tạo nhân vật tông môn khác; VIEW=WxH)
'use strict';
const { openGame, createCharacter, check, results } = require('./harness');
const fs = require('fs');
const path = require('path');

const SECT = process.env.SECT || 'kiem';
(async () => {
  const t0 = Date.now();
  const { browser, page, errors } = await openGame();
  const ev = (fn, arg) => page.evaluate(fn, arg);
  /** Giữ phím logic (left/right/up/down/attack) trong `sec` giây mô phỏng – đi qua Player.control như phím thật. */
  const hold = (k, sec, extra) => ev(([k, sec, extra]) => { const K = window.__vkkt; k.forEach(x => K.keys.add(x)); K.syncInput(); if (extra) Object.assign(K.inp, extra); K.simulate(sec); k.forEach(x => K.keys.delete(x)); K.syncInput(); }, [k, sec, extra || null]);

  console.log('A. Màn mở đầu + tạo nhân vật');
  check(await page.isVisible('#intro') && !(await page.isVisible('#btn-continue')), 'chưa có bản lưu: chỉ có nút Tạo nhân vật');
  await createCharacter(page, SECT, 'Thử<Nghiệm>');
  let s = await ev(() => { const K = window.__vkkt; return { sect: K.G.sect, name: K.G.name, map: K.World.id, hud: !document.getElementById('hud').hidden, npcs: K.Ents.npcs.length, playing: K.Game.playing, nameHtml: document.getElementById('me-name').innerHTML }; });
  check(s.sect === SECT && s.map === { kiem: 'A0', phap: 'B0', vo: 'C0' }[SECT], 'nhân vật đúng tông môn, xuất hiện ở sơn môn', s);
  check(s.hud && s.npcs === 6 && s.playing, 'HUD hiện, sơn môn có 6 NPC / vật tương tác');
  check(s.nameHtml === 'Thử&lt;Nghiệm&gt;', 'tên người chơi được thoát ký tự HTML (không chèn mã)', s.nameHtml);

  console.log('B. Di chuyển bằng bàn phím thật');
  // máy kiểm thử vẽ bằng CPU (vài khung / giây) → giữ phím cho tới khi nhân vật đi đủ xa (tối đa 8 giây), không dựa vào thời gian cố định
  const holdUntil = async (key, cond, ms = 8000) => { await page.keyboard.down(key); await page.waitForFunction(cond, null, { timeout: ms, polling: 50 }).catch(() => {}); await page.keyboard.up(key); };
  const x0 = await ev(() => window.__vkkt.Ents.player.pos.x);
  await holdUntil('KeyD', `window.__vkkt.Ents.player.pos.x > ${x0 + 2}`);
  const x1 = await ev(() => window.__vkkt.Ents.player.pos.x);
  check(x1 > x0 + 2, 'giữ D: chạy sang phải', { x0, x1 });
  await holdUntil('ArrowLeft', `window.__vkkt.Ents.player.pos.x < ${x1 - 2}`);
  s = await ev(() => ({ x: window.__vkkt.Ents.player.pos.x, f: window.__vkkt.Ents.player.facing }));
  check(s.x < x1 - 2 && s.f === -1, 'giữ ←: chạy sang trái, quay mặt trái', s);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => { const P = window.__vkkt.Ents.player; return P.pos.y - window.__vkkt.World.groundAt(P.pos.x) > 0.2; }, null, { timeout: 5000, polling: 20 }).catch(() => {});
  s = await ev(() => { const P = window.__vkkt.Ents.player; return { y: P.pos.y - window.__vkkt.World.groundAt(P.pos.x), g: P.onGround }; });
  await page.keyboard.up('Space');
  check(s.y > 0.2 && !s.g, 'Space: nhảy lên khỏi mặt đất', s);
  await ev(() => window.__vkkt.simulate(1.5));
  s = await ev(() => { const P = window.__vkkt.Ents.player; return { y: P.pos.y - window.__vkkt.World.groundAt(P.pos.x), g: P.onGround }; });
  check(Math.abs(s.y) < 0.05 && s.g, 'rơi xuống đáp lại mặt đất', s);
  // bay: nhảy rồi nhấn nhảy lần 2 trên không, giữ W lên cao, linh lực giảm, S đáp
  await ev(() => { const K = window.__vkkt; K.inp.jumpPressed = true; K.simulate(0.15); K.inp.jumpPressed = true; K.simulate(0.05); });
  const mpA = await ev(() => window.__vkkt.Ents.player.mp);
  await hold(['up'], 1.2);
  s = await ev(() => { const P = window.__vkkt.Ents.player; return { fly: P.flying, alt: P.pos.y - window.__vkkt.World.groundAt(P.pos.x), mp: P.mp }; });
  check(s.fly && s.alt > 4, 'nhấn nhảy lần 2: bay; giữ ↑ lên cao', s);
  check(s.mp < mpA, 'bay tốn linh lực', { mpA, mp: s.mp });
  await hold(['down'], 3);
  s = await ev(() => { const P = window.__vkkt.Ents.player; return { fly: P.flying, g: P.onGround }; });
  check(!s.fly && s.g, 'giữ ↓: hạ xuống, chạm đất thì thôi bay', s);

  console.log('C. Sư Phụ + nhiệm vụ 1 + trang bị qua giao diện');
  await ev(() => { const K = window.__vkkt, m = K.Ents.npcs.find(n => n.role === 'master'); K.Ents.player.pos.x = m.pos.x - 6; K.Ents.player.facing = 1; });
  // đi bộ tới Sư Phụ bằng phím thật cho tới khi nút Nói chuyện hiện
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__vkkt.Game.nearNpc() && window.__vkkt.Game.nearNpc().role === 'master', null, { timeout: 15000 }).catch(() => {});
  await page.keyboard.up('KeyD');
  const gold0 = await ev(() => window.__vkkt.G.gold);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
  s = await ev(() => ({ q: window.__vkkt.G.quest.i, panel: !document.getElementById('panel').hidden, title: document.getElementById('p-title').textContent, gold: window.__vkkt.G.gold, bag: window.__vkkt.G.bag.length }));
  check(s.panel && /Sư Phụ/.test(s.title), 'phím E cạnh Sư Phụ: mở hội thoại', s);
  check(s.q === 1 && s.gold === gold0 + 200 && s.bag >= 1, 'hoàn thành "Bái kiến sư phụ": +200 linh thạch, nhận Hộ Giáp', s);
  await page.keyboard.press('Escape');
  await page.click('[data-open="bag"]');
  const def0 = await ev(() => window.__vkkt.Ents.player.def);
  await page.click('#p-body .cell[data-uid]'); await page.click('#p-body [data-do="equip"]');
  s = await ev(() => ({ ao: !!window.__vkkt.G.equip.ao, def: window.__vkkt.Ents.player.def }));
  check(s.ao && s.def > def0, 'Túi đồ: chọn Hộ Giáp → Trang bị → giáp tăng', { def0, ...s });
  await page.click('#p-body [data-eq="ao"]'); await page.click('#p-body [data-do="unequip"]');
  check(await ev(() => !window.__vkkt.G.equip.ao && window.__vkkt.G.bag.some(b => b.kind === 'equip')), 'Tháo trang bị: về túi');
  await page.click('#p-body .cell[data-uid]'); await page.click('#p-body [data-do="equip"]');
  await page.click('#p-close');

  console.log('D. Qua cổng sang bản đồ quái, đánh quái bằng phím thật');
  await ev(() => { const K = window.__vkkt, P = K.Ents.player; P.pos.x = K.World.width - 3; });
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__vkkt.World.id.endsWith('1'), null, { timeout: 15000 }).catch(() => {});
  await page.keyboard.up('KeyD'); await page.waitForTimeout(600);
  s = await ev(() => ({ map: window.__vkkt.World.id, mons: window.__vkkt.Ents.monsters.length, x: window.__vkkt.Ents.player.pos.x }));
  check(/^[ABC]1$/.test(s.map) && s.mons >= 8, 'đi ra mép phải: sang bản đồ 1, có quái', s);
  // đứng cạnh một con quái, giữ J (đánh thường) bằng phím thật
  const tv0 = await ev(() => window.__vkkt.G.tv);
  await ev(() => { const K = window.__vkkt, P = K.Ents.player, m = K.Ents.monsters[0]; P.pos.x = m.pos.x - 1.6; P.facing = 1; m.home = m.pos.x; P.target = m; window._m = m; window._hp0 = m.hp; });
  await page.keyboard.down('KeyJ'); await page.waitForFunction(() => window._m.hp < window._hp0, null, { timeout: 10000, polling: 50 }).catch(() => {}); await page.keyboard.up('KeyJ');
  s = await ev(() => ({ hp: window._m.hp, hp0: window._hp0, tv: window.__vkkt.G.tv, lc: window.__vkkt.G.lc }));
  check(s.hp < s.hp0 || window._m && s.hp === 0, 'giữ J: đánh trúng quái (sinh lực quái giảm)', s);
  check(s.tv > tv0 && s.lc > 0, 'gây sát thương: nhận tu vi + linh căn', { tv0, tv: s.tv, lc: s.lc });
  // kỹ năng 1 bằng phím K: tốn linh lực, vào hồi chiêu, nhấn lại trong hồi chiêu không dùng được
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player, id = K.G.hotbar[0]; P.busy = 0; const mp0 = P.mp; K.inp.skill[0] = true; K.simulate(1 / 60); const mp1 = P.mp, cd = P.cdLeft(id); P.busy = 0; K.inp.skill[0] = true; K.simulate(1 / 60); return { id, mp0, mp1, mp2: P.mp, cd }; });
  check(s.mp1 < s.mp0 - 5 && s.cd > 0 && s.mp2 < s.mp1 + 0.5, 'kỹ năng ô K: tốn linh lực, có hồi chiêu, không dùng lại khi đang hồi', s);
  // hạ quái (tua nhanh qua đường điều khiển thật: tự tiến tới mục tiêu khi giữ nút đánh)
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; const k0 = K.G.kills, g0 = K.G.gold;
    for (let i = 0; i < 90 && K.G.kills < k0 + 5; i++) { const m = K.Ents.monsters.filter(m => !m.dead).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x))[0]; P.target = m; K.keys.add('attack'); K.syncInput(); K.simulate(1); if (P.hp < P.maxHp * 0.4) P.hp = P.maxHp; }
    K.keys.delete('attack'); K.syncInput(); K.simulate(2);
    return { kills: K.G.kills - k0, gold: K.G.gold - g0, q: K.G.quest.i, drops: K.Ents.drops.length }; });
  check(s.kills >= 5, 'giữ nút đánh có mục tiêu: tự tiến tới và hạ ≥ 5 quái', s);
  check(s.q >= 2, 'nhiệm vụ "Thử tay" (5 quái) tự hoàn thành', s);
  check(s.gold > 0, 'quái rơi linh thạch, tự hút về khi lại gần', s);

  console.log('E. 15 kỹ năng của 3 tông môn (thi triển thật, không lỗi)');
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player, out = {}, sect0 = P.sect, mp = P.maxMp;
    for (const a of [...K.Ents.monsters, ...K.Ents.bots]) a.dispose(); K.Ents.monsters.length = 0; K.Ents.bots.length = 0; K.World.token++;   // không để quái / người chơi ảo khác (kể cả quái hẹn giờ hồi sinh từ mục D) chắn đạn
    for (const sk of Object.keys(K.SECTS)) for (const id of K.SECTS[sk].skills) {
      P.pos.set(30, K.World.groundAt(30), 0); P.vel.set(0, 0, 0); P.flying = false;   // lướt / dậm đất làm người chơi dời chỗ – đặt lại trước mỗi chiêu
      const m = K.spawnMonster('trucyeu', 3, P.pos.x + 2.5, { noRespawn: true }); m.speed = 0; m.aggroR = 0; const h0 = m.hp;
      P.sect = K.SECTS[sk]; K.G.skills[id] = 1; P.cd = {}; P.busy = 0; P.mp = P.maxMp = 99999; P.facing = 1; P.target = m;
      const ok = P.useSkill(id), tr = [];
      for (let i = 0; i < (/moc|kimcang|kimthan/.test(id) ? 12 : 48); i++) { K.simulate(0.05); const pr = K.Ents.projectiles.find(q => q.owner === P); if (pr && tr.length < 6) tr.push(pr.x.toFixed(1) + ',' + pr.y.toFixed(1)); }
      out[id] = { ok, hit: id === 'phap_moc' || id === 'vo_kimcang' || id === 'vo_kimthan' ? null : m.hp < h0 || m.dead };
      if (out[id].hit === false) Object.assign(out[id], { tr, p: [P.pos.x.toFixed(1), P.pos.y.toFixed(2)], m: [m.pos.x.toFixed(1), m.pos.y.toFixed(2), m.dead, m.hp, h0], map: K.World.id, busy: P.busy, stun: P.stun, tgt: P.target === m, n: K.Ents.monsters.length });
      if (!m.dead) { m.hp = 0; m.dead = true; }
      K.GameFx.clear(P);
    }
    P.sect = sect0; P.maxMp = mp; P.recompute(); for (const id in K.G.skills) if (!K.SECTS[K.G.sect].skills.includes(id)) delete K.G.skills[id]; return out; });
  const sk = Object.entries(s);
  check(sk.length === 15 && sk.every(([, v]) => v.ok), '15/15 kỹ năng thi triển được', s);
  check(sk.every(([, v]) => v.hit !== false), 'mọi kỹ năng gây sát thương đều trúng quái đứng trước mặt', sk.filter(([, v]) => v.hit === false));
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; P.sect = K.SECTS.vo; K.G.skills.vo_kimthan = 1; P.cd = {}; P.busy = 0; P.mp = P.maxMp = 9999; const a0 = P.atkNow(), s0 = P.model.scale; P.useSkill('vo_kimthan'); K.simulate(1);
    const r = { a0, a1: P.atkNow(), s0, s1: P.model.scale }; K.GameFx.clear(P); P.sect = K.SECTS[K.G.sect]; delete K.G.skills.vo_kimthan; P.recompute(); return r; });
  check(s.a1 > s.a0 * 1.4 && s.s1 > s.s0 * 1.2, 'Bất Diệt Kim Thân: biến thân to hơn, công +50%', s);
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; P.cd = {}; P.busy = 0; K.G.skills.vo_kimcang = 1; P.sect = K.SECTS.vo; P.mp = 9999; P.useSkill('vo_kimcang'); const sh = P.shield, dr = P.drK; K.GameFx.clear(P); P.shield = 0; P.drK = 0; P.sect = K.SECTS[K.G.sect]; if (K.G.sect !== 'vo') delete K.G.skills.vo_kimcang; return { sh, dr }; });
  check(s.sh > 0 && s.dr >= 0.3, 'Kim Cang Bất Hoại: khiên + giảm 30% sát thương', s);

  console.log('F. Linh Đan Thụ, linh căn, Linh Thương, Luyện Khí Sư, Truyền Tống Sứ');
  await ev(() => { const K = window.__vkkt; K.Game.travel(K.SECTS[K.G.sect].home, null, 30); });
  await page.waitForFunction(() => !window.__vkkt.Game.traveling && window.__vkkt.World.def.home, null, { timeout: 8000 }).catch(() => {});
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player, t = K.Ents.npcs.find(n => n.role === 'tree'); K.G.tree.stock = 3; P.pos.x = t.pos.x; K.simulate(0.1); return { near: K.Game.nearNpc() && K.Game.nearNpc().role }; });
  check(s.near === 'tree', 'đứng cạnh Linh Đan Thụ: có thể tương tác', s);
  await page.keyboard.press('KeyE'); await page.click('#p-body [data-npc="harvest"]');
  s = await ev(() => { const K = window.__vkkt; return { dan: K.Bag.count('dan'), stock: K.G.tree.stock, q: K.G.quest.i, msg: document.getElementById('p-body').textContent.includes('Thu được') }; });
  check(s.dan === 3 && s.stock === 0 && s.msg, 'Thu hoạch: 3 linh đan vào túi, cây còn 0', s);
  check(s.q >= 3, 'nhiệm vụ "Linh Đan Thụ" hoàn thành', s);
  await page.click('#p-close');
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; P.hp = 10; P.mp = 0; K.quickHeal(); return { hp: P.hp, mp: P.mp, max: P.maxHp, dan: K.Bag.count('dan') }; });
  check(s.hp > 10 && s.mp > 0 && s.dan === 2, 'phím H / nút 丹: dùng linh đan hồi sinh lực + linh lực', s);
  await ev(() => { window.__vkkt.G.lc += 5000; });
  await page.click('[data-open="char"]');
  const hp0 = await ev(() => window.__vkkt.Ents.player.maxHp);
  await page.click('#p-body [data-pt="hp"][data-n="1"]');
  s = await ev(() => ({ pts: window.__vkkt.G.points.hp, hp: window.__vkkt.Ents.player.maxHp, q: window.__vkkt.G.quest.i }));
  check(s.pts === 1 && s.hp > hp0, 'Nhân vật: dùng linh căn +1 Sinh lực → sinh lực tối đa tăng', { hp0, ...s });
  check(s.q >= 4, 'nhiệm vụ "Khai mở linh căn" hoàn thành', s);
  await page.click('#p-close');
  // Linh Thương: mua 1 Hồi Huyết Đan, bán lại
  await ev(() => { const K = window.__vkkt, n = K.Ents.npcs.find(n => n.role === 'shop'); K.Ents.player.pos.x = n.pos.x; K.simulate(0.05); });
  await page.keyboard.press('KeyE'); await page.click('#p-body [data-npc="shop"]');
  const g1 = await ev(() => window.__vkkt.G.gold), c1 = await ev(() => window.__vkkt.Bag.count('cons', 'hp_s'));
  await page.click('#p-body [data-buy="0"][data-n="1"]');
  s = await ev(() => ({ g: window.__vkkt.G.gold, c: window.__vkkt.Bag.count('cons', 'hp_s') }));
  check(s.g === g1 - 30 && s.c === c1 + 1, 'Linh Thương: mua Hồi Huyết Đan −30 linh thạch, +1 trong túi', { g1, c1, ...s });
  await page.click('#p-tabs [data-tab="sell"]');
  const sellBtns = await page.$$('#p-body [data-sell]');
  check(sellBtns.length > 0, 'Linh Thương / Bán: liệt kê đồ bán được');
  await page.click('#p-close');
  // Luyện Khí Sư: ghép 2 nguyên liệu (nguyên liệu thử) → pháp bảo, trang bị, cường hoá
  const cmp0 = await ev(() => { const K = window.__vkkt; K.Bag.add({ kind: 'comp', id: 'sword', n: 1 }, true); K.Bag.add({ kind: 'comp', id: 'jade', n: 1 }, true); K.G.gold += 20000; const n = K.Ents.npcs.find(n => n.role === 'smith'); K.Ents.player.pos.x = n.pos.x; K.simulate(0.05); return K.Bag.count('comp'); });
  await page.keyboard.press('KeyE'); await page.click('#p-body [data-npc="craft"]');
  await page.click('#p-body [data-comp="sword"]'); await page.click('#p-body [data-comp="jade"]');
  const preview = await page.textContent('#p-body .detail');
  await page.click('#p-body [data-do="craft"]');
  s = await ev(() => { const K = window.__vkkt; return { art: K.G.bag.filter(b => b.kind === 'art').map(b => b.id), comps: K.Bag.count('comp'), q: K.G.quest.done.includes('q8') }; });
  check(/Kiếm Hồn Ngọc/.test(preview) && s.art.includes('kiem_hon_ngoc'), 'Luyện Khí: Linh Kiếm + Sinh Mệnh Ngọc = Kiếm Hồn Ngọc (công thức bản cờ)', { preview: preview.slice(0, 80), ...s });
  check(s.comps === cmp0 - 2, 'nguyên liệu bị trừ đúng 2 món', { cmp0, comps: s.comps });
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player, a0 = P.stats.atk, it = K.G.bag.find(b => b.kind === 'art'); K.equipItem(it.uid); return { a0, a1: P.stats.atk, ls: P.stats.ls, on: !!K.G.arts[0] }; });
  check(s.on && s.a1 > s.a0 && s.ls > 0, 'trang bị pháp bảo: cộng công + hút máu toàn phần (đổi từ chỉ số bản cờ)', s);
  await page.click('#p-tabs [data-tab="upgrade"]');
  const g2 = await ev(() => window.__vkkt.G.gold);
  await page.click('#p-body [data-up="0"]');
  s = await ev(() => ({ g: window.__vkkt.G.gold, msg: document.querySelector('#p-body p').textContent }));
  check(s.g < g2 && /Cường hoá (thành công|thất bại)/.test(s.msg), 'Cường hoá: trừ linh thạch, báo thành công / thất bại', { g2, ...s });
  await page.click('#p-close');
  // Truyền Tống Sứ: Ma Uyên bị khoá khi chưa Nguyên Anh, tới tông môn khác được
  await ev(() => { const K = window.__vkkt, n = K.Ents.npcs.find(n => n.role === 'tele'); K.Ents.player.pos.x = n.pos.x; K.simulate(0.05); });
  await page.keyboard.press('KeyE');
  check(await page.isDisabled('#p-body [data-npc="tp:D1"]'), 'Truyền Tống Sứ: Ma Uyên khoá khi chưa đủ cảnh giới');
  const other = await ev(() => ['A0', 'B0', 'C0'].find(m => m !== window.__vkkt.World.id));
  await page.click(`#p-body [data-npc="tp:${other}"]`);
  await page.waitForFunction(o => window.__vkkt.World.id === o && !window.__vkkt.Game.traveling, other, { timeout: 8000 }).catch(() => {});
  s = await ev(() => ({ map: window.__vkkt.World.id, master: window.__vkkt.Ents.npcs.find(n => n.role === 'master').sect }));
  check(s.map === other && s.master !== SECT, 'Truyền tống tới sơn môn tông môn khác', s);

  console.log('G. Đột phá cảnh giới, khoá bản đồ theo cảnh giới');
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player, h0 = P.maxHp; K.G.tv = 2990; P.recompute(); const r0 = P.realm.r; P.gainTv(20); return { r0, r1: P.realm.r, h0, h1: P.maxHp, full: P.hp === P.maxHp, banner: document.getElementById('banner-t').textContent }; });
  check(s.r0 === 0 && s.r1 === 1 && s.h1 > s.h0 && s.full && /Trúc Cơ/.test(s.banner), 'đủ 3.000 tu vi: đột phá Trúc Cơ, chỉ số tăng, hồi đầy, có thông báo', s);
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; K.Game.enter('D1'); K.World.def; P.pos.set(K.World.width - 0.3, K.World.groundAt(K.World.width - 0.3), 0); P.vel.x = 1; K.simulate(0.1); const r = { id: K.World.id, trav: K.Game.traveling, x: P.pos.x, w: K.World.width }; K.Game.enter('C1'); P.pos.set(30, K.World.groundAt(30), 0); P.vel.set(0, 0, 0); return r; });
  check(s.id === 'D1' && !s.trav && s.x < s.w - 1, 'cổng tới Hỗn Độn Hư Không chặn khi chưa Nguyên Anh (đẩy lùi, không chuyển bản đồ)', s);

  console.log('H. Boss theo giờ + thanh boss + phần thưởng');
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; const map = { kiem: 'A3', phap: 'B3', vo: 'C3' }[K.G.sect]; K.G.bossT[map] = K.G.playT - 1; K.Game.enter(map);
    const b = K.Ents.monsters.find(m => m.spec.boss); P.pos.set(b.pos.x - 4, K.World.groundAt(b.pos.x - 4), 0); P.invuln = false; P.heavy = true;   // không bị hất văng ra cổng trong lúc đo
    const hp0 = P.hp; P.hp = P.maxHp = 1e7; K.simulate(8); const casts = b.moveI || 0, took = P.maxHp - P.hp;
    const k0 = K.G.bossKills, g0 = K.G.gold; K.hurt(P, b, b.hp * 3 + 1e6, { kind: 'skill', crit: false }); K.simulate(2.5);
    const r = { map, boss: b.name, casts, took, killed: b.dead, bk: K.G.bossKills - k0, drops: K.Ents.drops.length + (K.G.gold - g0 > 0 ? 1 : 0), next: K.BossClock.left(map), chat: K.Chat.lines.slice(-6).map(l => l.text).join(' | ') };
    P.heavy = false; P.recompute(); P.hp = P.maxHp; return r; });
  check(s.casts >= 2 && s.took > 0, 'boss xuất hiện khi tới giờ, dùng chiêu và gây sát thương', s);
  check(s.killed && s.bk === 1 && s.next > 60, 'hạ boss: đếm boss, hẹn giờ xuất hiện lại', s);
  check(/tiêu diệt/.test(s.chat), 'kênh chat thông báo boss bị tiêu diệt', s.chat);

  console.log('I. Long Châu → Thần Long → điều ước (qua giao diện)');
  await ev(() => { const K = window.__vkkt; K.Game.travel(K.SECTS[K.G.sect].home, null, 60); });
  await page.waitForFunction(() => !window.__vkkt.Game.traveling && window.__vkkt.World.def.home, null, { timeout: 8000 }).catch(() => {});
  s = await ev(() => ({ map: window.__vkkt.World.id, trav: window.__vkkt.Game.traveling, npcs: window.__vkkt.Ents.npcs.length, err: null }));
  check(s.npcs === 6, 'về sơn môn để tới Tế Đàn', s);
  await ev(() => { const K = window.__vkkt; for (let i = 1; i <= 7; i++) K.addBall(i); const a = K.Ents.npcs.find(n => n.role === 'altar'); K.Ents.player.pos.x = a.pos.x; K.simulate(0.05); });
  await page.keyboard.press('KeyE');
  const gold3 = await ev(() => window.__vkkt.G.gold);
  await page.click('#p-body [data-npc="summon"]');
  await page.waitForFunction(() => !document.getElementById('panel').hidden && document.getElementById('p-title').textContent.includes('Thần Long'), null, { timeout: 8000 }).catch(() => {});
  check(await page.isHidden('#p-close'), 'bảng điều ước không đóng được (phải chọn 1 điều)');
  await page.click('#p-body [data-wish="gold"]');
  s = await ev(() => ({ gold: window.__vkkt.G.gold, balls: window.__vkkt.G.balls.length, w: window.__vkkt.G.wishes, dragon: !!window.__vkkt.Dragon.model }));
  check(s.gold > gold3 && s.balls === 0 && s.w === 1 && !s.dragon, 'ước "Phú khả địch quốc": nhận linh thạch, 7 viên biến mất, rồng rời đi', { gold3, ...s });

  console.log('J. Tử trận + hồi sinh');
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; K.Game.enter(K.SECTS[K.G.sect].home.replace('0', '1')); P.pos.x = 30; P.invuln = false; P.hp = 1; const m = K.spawnMonster('trucyeu', 4, 31.5, { noRespawn: true }); m.target = P; K.hurt(m, P, 999, { kind: 'basic' }); K.simulate(2); return { dead: P.dead, panel: document.getElementById('p-title').textContent }; });
  check(s.dead && /Trọng thương/.test(s.panel), 'hết sinh lực: tử trận, hiện bảng hồi sinh', s);
  await page.click('#p-body [data-do="home"]');
  await page.waitForFunction(() => window.__vkkt.World.def.home && !window.__vkkt.Game.traveling, null, { timeout: 8000 }).catch(() => {});
  s = await ev(() => { const K = window.__vkkt, P = K.Ents.player; return { dead: P.dead, hp: P.hp === P.maxHp, map: K.World.id, home: K.World.def.home }; });
  check(!s.dead && s.hp && !!s.home, 'Về sơn môn: sống lại đầy sinh lực ở sơn môn', s);

  console.log('J2. Mở mọi bảng / tab / hội thoại NPC (không lỗi, có nội dung)');
  s = await ev(() => { const K = window.__vkkt, bad = [];
    const tryOpen = (name, extra) => { try { K.ui.open(name, Object.assign({ force: true }, extra)); const t = document.getElementById('p-title').textContent, b = document.getElementById('p-body').textContent; if (!t || b.length < 10) bad.push(name + ':rỗng'); } catch (e) { bad.push(name + ':' + e.message); } };
    for (const p of ['bag', 'char', 'skills', 'quest', 'map', 'menu']) tryOpen(p);
    tryOpen('skills', { atMaster: true }); for (const t of ['buy', 'sell']) tryOpen('shop', { tab: t }); for (const t of ['craft', 'upgrade', 'book']) tryOpen('smith', { tab: t });
    for (const n of K.Ents.npcs) tryOpen('npc', { npc: n });
    K.G.bounty = K.Quests.bountyOffer(); tryOpen('quest'); K.G.bounty = null;
    const qi = K.G.quest.i; for (let i = 0; i <= K.QUESTS.length; i++) { K.G.quest.i = i; tryOpen('quest'); K.ui.quest(); } K.G.quest.i = qi; K.ui.quest();
    if (K.ui.cur) K.ui.cur.locked = false; K.ui.closeAll(); return { bad }; });
  check(s.bad.length === 0, 'mọi bảng / tab / NPC / 16 trạng thái nhiệm vụ mở được, có nội dung', s.bad);

  console.log('K. Lưu → tải lại trang → Tiếp tục');
  const before = await ev(() => { const K = window.__vkkt; K.Save.now(); const G = K.G; return { tv: G.tv, gold: G.gold, bag: G.bag.length, q: G.quest.i, eq: Object.keys(G.equip).length, art: G.arts.filter(Boolean).length, map: G.map, pts: G.points.hp, skills: JSON.stringify(G.skills), dan: K.Bag.count('dan') }; });
  await page.reload(); await page.waitForFunction(() => window.__vkkt && window.__vkkt.Game);
  const btn = await page.textContent('#btn-continue');
  check(await page.isVisible('#btn-continue') && /^Tiếp tục – Thử<Nghiệm> · (Trúc Cơ|Kim Đan|Nguyên Anh) tầng [1-9]$/.test(btn), 'tải lại: nút Tiếp tục ghi tên + cảnh giới', btn);
  await page.click('#btn-continue'); await page.waitForTimeout(500);
  const after = await ev(() => { const K = window.__vkkt, G = K.G; return { tv: G.tv, gold: G.gold, bag: G.bag.length, q: G.quest.i, eq: Object.keys(G.equip).length, art: G.arts.filter(Boolean).length, map: G.map, pts: G.points.hp, skills: JSON.stringify(G.skills), dan: K.Bag.count('dan') }; });
  check(JSON.stringify(before) === JSON.stringify(after), 'mọi trường lưu khôi phục đúng (tu vi, linh thạch, túi, nhiệm vụ, trang bị, pháp bảo, bản đồ, linh căn, kỹ năng)', { before, after });

  console.log('L. Bản lưu hỏng / sửa tay');
  s = await ev(() => { const K = window.__vkkt, S = K.Save;
    const bad = S.parse('{hỏng'), newer = S.parse(JSON.stringify({ v: 99, sect: 'kiem' })), odd = S.parse(JSON.stringify({ v: 1, sect: 'phap', name: 'X', gold: -50, tv: 'nhiều', bag: [{ kind: 'equip', slot: 'ao', tier: 99 }, { kind: 'cons', id: 'hp_s', n: 3, uid: 7 }, { kind: 'cons', id: 'hp_s', n: 2, uid: 7 }, null], skills: { kiem_van: 7, phap_loi: 99 }, points: { hp: -3 }, balls: [1, 1, 9, 3] }));
    return { bad: bad.status, newer: newer.status, ok: odd.status, gold: odd.state.gold, tv: odd.state.tv, bag: odd.state.bag.length, uids: new Set(odd.state.bag.map(b => b.uid)).size, skills: odd.state.skills, hp: odd.state.points.hp, balls: odd.state.balls }; });
  check(s.bad === 'bad' && s.newer === 'newer', 'JSON hỏng / phiên bản mới hơn: nhận diện, không đọc bừa', s);
  check(s.ok === 'ok' && s.gold === 0 && s.tv === 0 && s.bag === 2 && s.uids === 2 && s.hp === 0, 'trường sai kiểu / âm / vật phẩm lạ bị làm sạch, uid trùng được đánh lại', s);
  check(!s.skills.kiem_van && s.skills.phap_loi === 7 && JSON.stringify(s.balls) === '[1,3]', 'kỹ năng tông môn khác bị bỏ, cấp kỹ năng bị chặn trần, Long Châu lọc trùng / sai', s);
  await page.evaluate(() => { window.__vkkt.Save.blocked = true; localStorage.setItem('vkkt_rpg_save', '{hỏng'); });   // chặn lưu-khi-rời-trang ghi đè bản hỏng
  await page.reload(); await page.waitForFunction(() => window.__vkkt && window.__vkkt.Game);
  s = await ev(() => ({ backup: localStorage.getItem('vkkt_rpg_save_backup'), cont: !document.getElementById('btn-continue').hidden }));
  check(s.backup === '{hỏng' && !s.cont, 'mở game với bản lưu hỏng: sao lưu nguyên văn sang vkkt_rpg_save_backup, không có nút Tiếp tục', s);

  check(errors.length === 0, 'không có lỗi console / pageerror', errors.slice(0, 5));
  const pass = results.filter(r => r.ok).length;
  console.log(`\n${pass}/${results.length} kiểm tra đạt · ${((Date.now() - t0) / 1000).toFixed(0)} giây · tông môn ${SECT}`);
  const out = path.join(__dirname, '..', 'docs', 'reports'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'rpg-test-' + SECT + '.json'), JSON.stringify({ when: new Date().toISOString(), sect: SECT, pass, total: results.length, results, errors }, null, 1));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); console.log('Kiểm tra đã chạy: ' + results.filter(r => r.ok).length + '/' + results.length); process.exit(1); });
