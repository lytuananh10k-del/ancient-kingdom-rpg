// Mô phỏng cân bằng tiến trình: một "người chơi tự động" chơi từ đầu cho mỗi tông môn qua đường điều khiển thật
// (inp → Player.control → kỹ năng / va chạm / sát thương / rơi đồ / nhặt đồ), không vẽ hình (chỉ Game.simStep) để chạy nhanh.
// Chiến thuật cố định, đơn giản: đánh quái gần nhất, dùng kỹ năng khi hết hồi chiêu, dùng đan khi máu < 35%, chia linh căn công / máu / giáp,
// học kỹ năng khi mở khoá, mua trang bị Linh Thương khi đủ tiền, đổi bản đồ theo cảnh giới (bản đồ 1 → Trúc Cơ, 2 → Kim Đan, 3 → Nguyên Anh, Ma Uyên → Hóa Thần, rồi Hỗn Độn Hư Không).
// Kết quả là số đo thật của lần chạy (có ngẫu nhiên: rơi đồ, chí mạng, AI) – ghi docs/reports/rpg-balance.json + docs/RPG-BALANCE.md.
// Chạy: cd web && npm run rpg-balance      (MIN=phút game mỗi tông môn, mặc định 75)
'use strict';
const { openGame } = require('./harness');
const fs = require('fs');
const path = require('path');

const MIN = +(process.env.MIN || 75);
(async () => {
  const { browser, page, errors } = await openGame();
  const runs = [];
  for (const sect of ['kiem', 'phap', 'vo']) {
    const t0 = Date.now();
    const r = await page.evaluate(([sect, MIN]) => {
      const K = window.__vkkt;
      K.G = K.newGameState('Auto_' + sect, sect, K.SECTS[sect].looks[0]);
      K.Game.playing = false; if (K.Ents.player) K.Ents.player.dispose();
      if (K.ui.cur) K.ui.cur.locked = false; K.ui.closeAll(); K.Tasks.clear(); K.GameFx.clear();
      K.Ents.player = new K.Player(); K.Game.playing = true; K.Game.enter(K.SECTS[sect].home);
      const P = K.Ents.player, G = K.G, S = K.SECTS[sect], step = K.STEP;
      const reg = { kiem: 'A', phap: 'B', vo: 'C' }[sect];
      const mapFor = () => P.realm.r < 1 ? reg + '1' : P.realm.r < 2 ? reg + '2' : P.realm.r < 3 ? reg + '3' : P.realm.r < 4 ? 'D1' : 'D2';
      const log = [], realmAt = {}, perMap = {}; let deaths = 0, t = 0, lastMap = null, mapT0 = 0, tv0 = 0, k0 = 0;
      const goto = id => { K.Game.enter(id); P.pos.set(6, K.World.groundAt(6), 0); P.vel.set(0, 0, 0); P.flying = false; P.target = null; lastMap = id; mapT0 = t; tv0 = G.tv; k0 = G.kills; };
      const closeMap = () => { if (!lastMap) return; const m = perMap[lastMap] || (perMap[lastMap] = { min: 0, tv: 0, kills: 0 }); m.min += (t - mapT0) / 60; m.tv += G.tv - tv0; m.kills += G.kills - k0; };
      const spend = () => {   // linh căn: 50% công, 30% máu, 20% giáp; học / nâng kỹ năng; mua trang bị tốt nhất đủ tiền
        for (let g = 0; g < 200; g++) { const k = ['atk', 'atk', 'hp', 'atk', 'hp', 'def', 'atk', 'hp', 'atk', 'def'][g % 10]; const c = K.pointCost(k, G.points[k]); if (G.lc < c) break; G.lc -= c; G.points[k]++; }
        for (const id of S.skills) { const sk = K.RPG_SKILLS[id], lv = G.skills[id] || 0; if (lv >= 4 || !P.unlocked(id)) continue; const i = S.skills.indexOf(id), c = lv ? K.skillBookCost(sk, lv + 1) : { gold: i === 0 ? 0 : Math.round(200 * Math.pow(4, i - 1)), tv: 0 };
          if (G.gold >= c.gold && G.tv >= c.tv) { G.gold -= c.gold; G.skills[id] = lv + 1; if (!G.hotbar.includes(id)) G.hotbar[G.hotbar.findIndex(h => !G.skills[h]) >= 0 ? G.hotbar.findIndex(h => !G.skills[h]) : 3] = id; } }
        for (const e of K.shopStock()) { const it = e.it; if (it.kind !== 'equip' || e.gold > G.gold * 0.6) continue; const cur = G.equip[it.slot]; if (cur && cur.tier >= it.tier) continue;
          if (P.realm.r < [0, 0, 0, 1, 2][it.tier]) continue; G.gold -= e.gold; G.equip[it.slot] = Object.assign({ uid: G.uid++ }, it); }
        if (G.bag.length > 30) G.bag = G.bag.filter(b => b.kind !== 'equip');   // bán / bỏ trang bị rơi thừa
        P.recompute();
      };
      const doQuests = () => {   // thao tác ở sơn môn mà người chơi thật sẽ làm (nói chuyện, thu hoạch, luyện pháp bảo) – gọi đúng hàm game
        const q = K.Quests.cur(); if (!q) return;
        if (q.type === 'talk') K.Quests.complete();
        if (q.type === 'harvest') { G.tree.stock = Math.max(1, G.tree.stock); K.Tree.harvest(); }
        if (q.type === 'points') K.Quests.on('points');
        if (q.type === 'craft' || (!G.arts[0] && K.Bag.count('comp') >= 2)) { const c = G.bag.filter(b => b.kind === 'comp'); const a = c[0], b = c[1] || (a && a.n >= 2 ? a : null);
          if (a && b && G.gold >= 500) { K.craftArtifact(a.id, b.id); const art = G.bag.find(x => x.kind === 'art'); if (art && !G.arts[0]) K.equipItem(art.uid); } }
      };
      goto(mapFor()); spend();
      const limit = MIN * 60;
      while (t < limit) {
        // điều khiển: chọn quái gần nhất, giữ nút đánh (tự tiến tới), dùng 4 kỹ năng khi có thể, dùng đan khi máu thấp
        if (P.dead && P.deadT > 1.5) { deaths++; closeMap(); if (K.ui.cur) K.ui.cur.locked = false; K.ui.closeAll(); P.revive(false); P.hp = P.maxHp; goto(mapFor()); }   // như bấm "Hồi sinh" trên bảng tử trận
        if (!P.target || P.target.dead) P.target = K.Ents.monsters.filter(m => !m.dead).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x))[0] || null;
        K.keys.add('attack'); K.syncInput();
        if (P.target && Math.abs(P.target.pos.x - P.pos.x) < 9) for (let i = 0; i < 4; i++) if (G.hotbar[i] && G.skills[G.hotbar[i]] && P.cdLeft(G.hotbar[i]) === 0) K.inp.skill[i] = true;
        if (P.hp < P.maxHp * 0.35) K.quickHeal();
        for (let i = 0; i < 30; i++) { K.Game.simStep(step); t += step; }
        if (((t / 30) | 0) !== (((t - 0.5) / 30) | 0)) {   // mỗi 30 giây: chi tiêu, đổi bản đồ nếu đủ cảnh giới, ghi log
          doQuests(); spend(); Object.keys(K.REALMS).forEach(r => { if (P.realm.r >= r && realmAt[r] == null) realmAt[r] = +(t / 60).toFixed(1); });
          if (mapFor() !== lastMap) { closeMap(); goto(mapFor()); }
          if (G.bag.filter(b => b.kind === 'dan' || b.kind === 'cons').length === 0) K.Bag.add({ kind: 'cons', id: P.realm.r >= 1 ? 'hp_m' : 'hp_s', n: 5 }, true), G.gold -= P.realm.r >= 1 ? 1100 : 150;   // mua đan khi hết
          if (((t / 300) | 0) !== (((t - 0.5) / 300) | 0)) log.push({ min: +(t / 60).toFixed(0), realm: P.realm.name + ' ' + P.realm.layer, tv: Math.round(G.tv), kills: G.kills, gold: G.gold, atk: P.stats.atk, hp: P.stats.hp, map: lastMap, deaths });
        }
      }
      closeMap(); K.keys.delete('attack'); K.syncInput();
      for (const r in K.REALMS) if (P.realm.r >= r && realmAt[r] == null) realmAt[r] = +(t / 60).toFixed(1);
      const out = { sect, minutes: MIN, realm: P.realm.name + ' tầng ' + P.realm.layer, tv: Math.round(G.tv), kills: G.kills, deaths, bossKills: G.bossKills, gold: G.gold, balls: G.balls.length, comps: K.Bag.count('comp'),
        realmAt: Object.fromEntries(Object.entries(realmAt).map(([r, m]) => [K.REALMS[r].name, m])), perMap: Object.fromEntries(Object.entries(perMap).map(([k, v]) => [k, { min: +v.min.toFixed(1), tvPerMin: Math.round(v.tv / Math.max(0.1, v.min)), killsPerMin: +(v.kills / Math.max(0.1, v.min)).toFixed(1) }])),
        stats: { atk: P.stats.atk, hp: P.stats.hp, def: P.stats.def, crit: P.stats.crit }, skills: Object.assign({}, G.skills), log };
      K.Game.playing = false; return out;
    }, [sect, MIN]);
    r.wallSec = +((Date.now() - t0) / 1000).toFixed(1);
    runs.push(r);
    console.log(JSON.stringify({ sect: r.sect, realm: r.realm, kills: r.kills, deaths: r.deaths, realmAt: r.realmAt, perMap: r.perMap, wallSec: r.wallSec }));
  }
  await browser.close();
  const rep = path.join(__dirname, '..', 'docs', 'reports'); fs.mkdirSync(rep, { recursive: true });
  fs.writeFileSync(path.join(rep, 'rpg-balance.json'), JSON.stringify({ when: new Date().toISOString(), minutesPerSect: MIN, runs, errors }, null, 1));
  const name = { kiem: 'Kiếm Tông', phap: 'Pháp Tông', vo: 'Võ Tông' };
  let md = `# Cân bằng tiến trình – mô phỏng tự chơi (số đo thật)\n\nSinh bởi \`tests/rpg-balance.js\` lúc ${new Date().toISOString()} · mỗi tông môn ${MIN} phút thời gian game, 1 lần chạy (có ngẫu nhiên → số liệu dao động giữa các lần chạy).\n` +
    `Người chơi tự động dùng chiến thuật cố định (đánh quái gần nhất, kỹ năng khi hết hồi chiêu, chia linh căn công/máu/giáp, mua trang bị Linh Thương) – người chơi thật có thể nhanh / chậm hơn. Không tính thời gian đi bộ giữa bản đồ, nói chuyện NPC, nhiệm vụ.\n\n` +
    `| Tông môn | Cảnh giới sau ${MIN} phút | Trúc Cơ (phút) | Kim Đan (phút) | Nguyên Anh (phút) | Hóa Thần (phút) | Quái hạ | Tử trận | Boss |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of runs) md += `| ${name[r.sect]} | ${r.realm} | ${r.realmAt['Trúc Cơ'] ?? '–'} | ${r.realmAt['Kim Đan'] ?? '–'} | ${r.realmAt['Nguyên Anh'] ?? '–'} | ${r.realmAt['Hóa Thần'] ?? '–'} | ${r.kills} | ${r.deaths} | ${r.bossKills} |\n`;
  md += `\n## Theo bản đồ\n\n| Tông môn | Bản đồ | Phút ở bản đồ | Tu vi / phút | Quái / phút |\n|---|---|---|---|---|\n`;
  for (const r of runs) for (const [k, v] of Object.entries(r.perMap)) md += `| ${name[r.sect]} | ${k} | ${v.min} | ${v.tvPerMin} | ${v.killsPerMin} |\n`;
  md += `\n## Chỉ số cuối\n\n| Tông môn | Công | Sinh lực | Giáp | Chí mạng | Kỹ năng |\n|---|---|---|---|---|---|\n`;
  for (const r of runs) md += `| ${name[r.sect]} | ${r.stats.atk} | ${r.stats.hp} | ${r.stats.def} | ${Math.round(r.stats.crit * 100)}% | ${Object.entries(r.skills).map(([k, v]) => k + ' ' + v).join(', ')} |\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'RPG-BALANCE.md'), md);
  console.log('Đã ghi docs/RPG-BALANCE.md' + (errors.length ? ' · LỖI: ' + errors.slice(0, 3).join(' | ') : ''));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
