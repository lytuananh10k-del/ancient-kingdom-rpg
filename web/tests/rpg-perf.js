// Đo hiệu năng Phiêu Lưu bằng khung hình thật (requestAnimationFrame) trong Chromium headless + SwiftShader (WebGL chạy bằng CPU,
// KHÔNG có GPU) – số FPS ở đây thấp hơn nhiều so với máy thật; dùng để so sánh tương đối giữa kịch bản / mức đồ hoạ và theo dõi draw call.
// 4 kịch bản × 3 mức đồ hoạ: sơn môn, đánh quái bản đồ 1, boss + tuyệt kỹ liên tục, Hỗn Độn Hư Không (bản đồ nặng nhất).
// Ghi docs/reports/rpg-perf.json + docs/RPG-PERF.md. Chạy: cd web && npm run perf      (SEC=giây đo mỗi ô, mặc định 5)
'use strict';
const { openGame, createCharacter } = require('./harness');
const fs = require('fs');
const path = require('path');

const SEC = +(process.env.SEC || 5), VIEW = process.env.VIEW || '1280x720';
const SCEN = {
  home: 'Sơn môn (6 NPC, người chơi ảo)',
  fight: 'Bản đồ 1: tự đánh quái + kỹ năng',
  boss: 'Boss + Vạn Kiếm Quy Tông liên tục',
  void: 'Hỗn Độn Hư Không (pha lê, quái bay)'
};
(async () => {
  const { browser, page, errors } = await openGame({ view: VIEW });
  await createCharacter(page, 'kiem', 'Perf');
  const gpu = await page.evaluate(() => { const gl = window.__vkkt.renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  const rows = [];
  for (const q of ['LOW', 'MEDIUM', 'HIGH']) for (const sc of Object.keys(SCEN)) {
    await page.evaluate(([q, sc]) => {
      const K = window.__vkkt, P = K.Ents.player; K.QualityManager.auto = false; K.QualityManager.set(q);
      const map = { home: 'A0', fight: 'A1', boss: 'A3', void: 'D2' }[sc];
      K.Game.enter(map); P.pos.set(30, K.World.groundAt(30), 0); P.invuln = true; P.god = true; K.SideCam.snap(P);
      if (sc === 'boss') { K.BossClock.spawn('A3'); const b = K.Ents.monsters.find(m => m.spec.boss); P.pos.x = b.pos.x - 5; b.maxHp = b.hp = 1e9; K.G.skills.kiem_van = 3; K.G.skills.kiem_ngu = 3; }
      window.__perfScen = sc; window.__perfTick = setInterval(() => {   // giữ hoạt động trong lúc đo: đánh quái gần nhất + kỹ năng / tuyệt kỹ khi hết hồi chiêu
        if (sc === 'home') return; const P = K.Ents.player; P.mp = P.maxMp; P.hp = P.maxHp;
        if (!P.target || P.target.dead) P.target = K.Ents.monsters.filter(m => !m.dead).sort((a, b) => Math.abs(a.pos.x - P.pos.x) - Math.abs(b.pos.x - P.pos.x))[0];
        K.keys.add('attack'); K.syncInput(); for (let i = 0; i < 4; i++) K.inp.skill[i] = true;
        if (sc === 'boss') { P.cd.kiem_van = 0; P.busy = 0; P.useSkill('kiem_van', true); }
      }, 250);
    }, [q, sc]);
    await page.waitForTimeout(1500);   // khởi động: biên dịch shader, ổn định
    const m = await page.evaluate(sec => new Promise(res => {
      const K = window.__vkkt, ft = []; let last = performance.now(), calls = 0, tris = 0, n = 0, upd = 0, ren = 0;
      const end = last + sec * 1000;
      const f = now => { ft.push(now - last); last = now; calls += K.PerfStats.calls; tris += K.PerfStats.tris; upd += K.PerfStats.update; ren += K.PerfStats.render; n++;
        if (now < end) requestAnimationFrame(f); else { ft.shift(); ft.sort((a, b) => a - b); const avg = ft.reduce((s, v) => s + v, 0) / ft.length, p99 = ft[Math.floor(ft.length * 0.99)] || avg;
          res({ frames: ft.length, fps: +(1000 / avg).toFixed(1), low1: +(1000 / p99).toFixed(1), frameMs: +avg.toFixed(1), updateMs: +(upd / n).toFixed(2), renderMs: +(ren / n).toFixed(2), calls: Math.round(calls / n), tris: Math.round(tris / n),
            ents: K.Ents.monsters.length + K.Ents.bots.length + K.Ents.npcs.length + 1, particles: K.vfx.particles.live, geos: K.renderer.info.memory.geometries, tex: K.renderer.info.memory.textures }); } };
      requestAnimationFrame(f);
    }), SEC);
    await page.evaluate(() => { clearInterval(window.__perfTick); window.__vkkt.keys.clear(); window.__vkkt.syncInput(); });
    rows.push(Object.assign({ quality: q, scenario: sc }, m));
    console.log(q.padEnd(6), sc.padEnd(6), JSON.stringify(m));
  }
  // rò rỉ: đi qua 14 bản đồ 2 vòng, so geometry / texture trước và sau
  const leak = await page.evaluate(() => { const K = window.__vkkt, keys = Object.keys(K.MAPS), r = K.renderer.info.memory;
    K.Game.enter('A1'); K.simulate(0.2); const g0 = r.geometries, t0 = r.textures;
    for (let k = 0; k < 2; k++) for (const id of keys) { K.Game.enter(id); K.simulate(0.3); }
    K.Game.enter('A1'); K.simulate(0.2);
    return { geo0: g0, geo1: r.geometries, tex0: t0, tex1: r.textures, sceneChildren: K.scene.children.length }; });
  console.log('rò rỉ', JSON.stringify(leak));
  await browser.close();
  const rep = path.join(__dirname, '..', 'docs', 'reports'); fs.mkdirSync(rep, { recursive: true });
  fs.writeFileSync(path.join(rep, 'rpg-perf.json'), JSON.stringify({ when: new Date().toISOString(), view: VIEW, gpu, secPerCell: SEC, rows, leak, errors }, null, 1));
  let md = `# Hiệu năng Phiêu Lưu – số đo thật trên máy kiểm thử\n\nSinh bởi \`tests/rpg-perf.js\` lúc ${new Date().toISOString()} · màn ${VIEW} · renderer: \`${gpu}\`.\n\n` +
    `**Quan trọng:** máy kiểm thử là Chromium headless với **SwiftShader – WebGL chạy hoàn toàn bằng CPU, không có GPU**. FPS dưới đây vì thế thấp hơn rất nhiều so với điện thoại / máy tính thật có GPU và **không** dùng để kết luận game đạt 30 / 60 FPS trên thiết bị thật. ` +
    `Dùng để so sánh tương đối (kịch bản nặng / nhẹ, mức đồ hoạ) và theo dõi draw call / tam giác (không phụ thuộc GPU). Chưa đo trên Android / Windows thật.\n\n` +
    `| Mức | Kịch bản | FPS TB | 1% thấp | Cập nhật (ms) | Render (ms) | Draw call | Tam giác | Thực thể | Hạt |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) md += `| ${r.quality} | ${SCEN[r.scenario]} | ${r.fps} | ${r.low1} | ${r.updateMs} | ${r.renderMs} | ${r.calls} | ${r.tris.toLocaleString('vi-VN')} | ${r.ents} | ${r.particles} |\n`;
  md += `\n**Rò rỉ bộ nhớ GPU** (đi qua ${14 * 2} lần đổi bản đồ): geometry ${leak.geo0} → ${leak.geo1}, texture ${leak.tex0} → ${leak.tex1}, số đối tượng gốc trong scene: ${leak.sceneChildren}.\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'RPG-PERF.md'), md);
  console.log('Đã ghi docs/RPG-PERF.md' + (errors.length ? ' · LỖI: ' + errors.slice(0, 3).join(' | ') : ''));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
