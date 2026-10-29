// Vạn Kiếm Kỳ Trận – Phiêu Lưu: bảng Debug cho nhà phát triển – FPS / thời gian cập nhật / render / draw call, số thực thể,
// công cụ thử nhanh (tu vi, linh thạch, nguyên liệu, Long Châu, gọi boss, dịch chuyển, bất tử). Mở: ?debug=1, Ctrl+Shift+D, chạm 5 lần ô FPS.
// Mọi thao tác thử đều ghi G.debugUsed = true (hiện trong bản lưu) để không lẫn với tiến trình chơi thật.
'use strict';

const DebugPanel = {
  el: null, t: 0, taps: [],
  toggle() {
    if (this.el) { this.el.remove(); this.el = null; return; }
    const d = document.createElement('div'); this.el = d;
    d.style.cssText = 'position:fixed;z-index:50;left:50%;top:60px;transform:translateX(-50%);width:min(560px,94vw);max-height:70vh;overflow:auto;background:rgba(5,8,10,0.94);border:1px solid #3a4a4a;border-radius:10px;padding:8px 10px;font:12px system-ui;color:#cfe;touch-action:pan-y';
    const b = (k, l) => `<button data-dbg="${k}" style="margin:2px;padding:5px 8px;border-radius:6px;background:#1c2a2a;border:1px solid #3a5a5a;color:#dff">${l}</button>`;
    d.innerHTML = `<b>Debug</b> <span style="color:#8aa">(thao tác thử đánh dấu bản lưu debugUsed)</span><pre id="dbg-stats" style="margin:6px 0;white-space:pre-wrap"></pre>
      ${b('tv', '+tu vi tới cảnh giới kế')}${b('gold', '+100k linh thạch')}${b('gem', '+50 tiên ngọc')}${b('comps', '+2 mỗi nguyên liệu')}${b('balls', '7 Long Châu')}${b('boss', 'Gọi boss ở đây')}${b('god', 'Bất tử bật/tắt')}${b('heal', 'Hồi đầy')}${b('kill', 'Hạ hết quái')}${b('quest', 'Xong nhiệm vụ hiện tại')}${b('close', 'Đóng')}
      <div style="margin-top:4px">${MAP_KEYS.map(k => b('tp:' + k, MAPS[k].name)).join('')}</div>`;
    d.addEventListener('click', e => { const k = e.target.dataset && e.target.dataset.dbg; if (k) this.act(k); });
    document.body.appendChild(d);
  },
  act(k) {
    if (k === 'close') return this.toggle();
    if (!Game.playing) return;
    const P = Ents.player; G.debugUsed = true;
    if (k === 'tv') P.gainTv(Math.max(100, P.realm.next - G.tv + 1));
    if (k === 'gold') G.gold += 100000;
    if (k === 'gem') G.gem += 50;
    if (k === 'comps') for (const c of COMPONENT_KEYS) Bag.add({ kind: 'comp', id: c, n: 2 }, true);
    if (k === 'balls') for (let s = 1; s <= LONG_CHAU_COUNT; s++) addBall(s);
    if (k === 'boss') { if (World.def.boss) BossClock.spawn(World.id); else ui.toast('Bản đồ này không có boss'); }
    if (k === 'god') { P.god = !P.god; P.invuln = P.god; ui.toast('Bất tử: ' + (P.god ? 'bật' : 'tắt')); }
    if (k === 'heal') { P.hp = P.maxHp; P.mp = P.maxMp; }
    if (k === 'kill') for (const m of Ents.monsters) if (!m.dead) hurt(P, m, m.hp * 10 + 1e6, { kind: 'proc', crit: false });
    if (k === 'quest') Quests.complete();
    if (k.startsWith('tp:')) Game.travel(k.slice(3), null, 10);
  },
  tick(dt) {
    if (!this.el || (this.t -= dt) > 0) return; this.t = 0.5;
    const ps = PerfStats, mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : '–';
    document.getElementById('dbg-stats').textContent =
      `FPS ${ps.fps.toFixed(1)} · cập nhật ${ps.update.toFixed(2)} ms · render ${ps.render.toFixed(2)} ms · draw call ${ps.calls} · tam giác ${ps.tris}\n` +
      `Đồ hoạ ${QualityManager.level} · hạt ${vfx.particles.live}/${vfx.particles.budget} · geometry ${renderer.info.memory.geometries} · texture ${renderer.info.memory.textures} · heap ${mem}\n` +
      `Bản đồ ${World.id} · quái ${Ents.monsters.length} · người chơi ảo ${Ents.bots.length} · NPC ${Ents.npcs.length} · đạn ${Ents.projectiles.length} · rơi ${Ents.drops.length} · hiệu ứng ${GameFx.list.length} · hẹn giờ ${Tasks.list.length}` +
      (G ? `\nTu vi ${fmtFull(G.tv)} · linh căn ${fmtFull(G.lc)} · x ${Ents.player ? Ents.player.pos.x.toFixed(1) : '-'} · thời gian chơi ${fmtTime(G.playT)}` : '');
  }
};
window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); DebugPanel.toggle(); } });
$('fps').addEventListener('pointerdown', () => { const t = performance.now(); DebugPanel.taps = DebugPanel.taps.filter(x => t - x < 2000); DebugPanel.taps.push(t); if (DebugPanel.taps.length >= 5) { DebugPanel.taps = []; DebugPanel.toggle(); } });
if (/[?&]debug=1/.test(location.search)) DebugPanel.toggle();
window.__vkkt.DebugPanel = DebugPanel;
