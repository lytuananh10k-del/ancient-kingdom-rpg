// Vạn Kiếm Kỳ Trận – Bảng Debug cho nhà phát triển (V1.5 FINAL). ẨN MẶC ĐỊNH.
// Mở: thêm ?debug=1 vào địa chỉ · Ctrl+Shift+D (Windows) · chạm nhanh 5 lần vào ô FPS (Android).
// Mọi công cụ thử (trận thử, đội hình thử, mô phỏng) chạy trong battle.sandbox trên bản chụp ván → KHÔNG ghi đè bản lưu chính;
// "Kết thúc thử" khôi phục đúng ván trước đó. Nạp sau js/combat/balance-sim.js. Script thường (không phải module).
'use strict';
const DebugPanel = {
  on: false, el: null, snap: null, t: 0, lastSim: null, testSeed: 1,
  init() {
    const css = document.createElement('style');
    css.textContent = `#dbg{position:fixed;left:8px;top:52px;z-index:60;width:min(330px,calc(100vw - 16px));max-height:calc(100vh - 64px);overflow:auto;background:rgba(10,12,18,.92);color:#e8e2d0;
      font:12px/1.35 ui-monospace,Consolas,monospace;border:1px solid rgba(233,196,106,.4);border-radius:8px;padding:8px;font-variant-numeric:tabular-nums}
      #dbg h4{margin:6px 0 4px;font-size:12px;color:#e9c46a}#dbg pre{margin:0;white-space:pre-wrap}#dbg .b{display:flex;flex-wrap:wrap;gap:4px}
      #dbg button{font:inherit;padding:6px 8px;min-height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#222836;color:inherit;cursor:pointer}
      #dbg button:active{background:#3a4258}#dbg .x{float:right}`;
    document.head.appendChild(css);
    const el = this.el = document.createElement('div'); el.id = 'dbg'; el.hidden = true; el.setAttribute('aria-label', 'Bảng Debug');
    el.innerHTML = `<button class="x" data-a="close" aria-label="Đóng bảng Debug">✕</button><h4>Debug</h4><pre id="dbg-stats"></pre>
      <h4>Công cụ (không ghi bản lưu chính)</h4><div class="b">
      <button data-a="fight">Trận thử</button><button data-a="lineup">Đội hình thử</button><button data-a="end">Kết thúc thử</button>
      <button data-a="reset">Đặt lại vòng</button><button data-a="sim">Mô phỏng 100 trận</button><button data-a="log">Nhật ký kỹ năng</button><button data-a="export">Xuất báo cáo</button></div>
      <h4 id="dbg-outh" hidden>Kết quả</h4><pre id="dbg-out"></pre>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.act(b.dataset.a); });
    el.addEventListener('pointerdown', e => e.stopPropagation());   // không lọt xuống bàn cờ (kéo thả tướng)
    window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); this.toggle(); } });
    let taps = [];
    $('fps').addEventListener('click', () => { const n = performance.now(); taps = taps.filter(t => n - t < 2000); taps.push(n); if (taps.length >= 5) { taps = []; this.toggle(); } });
    if (/[?&]debug=1/.test(location.search)) this.toggle(true);
  },
  toggle(v) { this.on = v !== undefined ? v : !this.on; this.el.hidden = !this.on; if (this.on) this.render(); },
  /** Gọi mỗi khung từ frame() – chỉ làm việc khi bảng đang mở, cập nhật chữ 2 lần / giây. */
  tick(dt) { if (!this.on) return; this.t += dt; if (this.t < 0.5) return; this.t = 0; this.render(); },
  stats() {
    const s = PerfStats.summary() || {}, mem = renderer.info.memory, m = performance.memory;
    return { fps: s.fps, low1: s.low1, frameMs: s.frameMs, updateMs: s.updateMs, renderMs: s.renderMs, calls: PerfStats.calls, tris: PerfStats.tris,
      units: units.filter(u => u.alive).length, projectiles: Projectiles.list.length, particles: vfx.particles.live, statuses: units.reduce((a, u) => a + (u.alive ? u.fx.list.length : 0), 0),
      tasks: SimTasks.list.length, geometries: mem.geometries, textures: mem.textures, programs: (renderer.info.programs || []).length, heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null,
      phase: battle.phase, round: battle.round, step: battle.step, time: +battle.time.toFixed(2), seed: battle.seed, quality: QualityManager.level, pixelRatio: renderer.getPixelRatio(), sandbox: !!battle.sandbox };
  },
  render() {
    const s = this.stats();
    $('dbg-stats').textContent = `FPS ${s.fps ?? '–'} · TB 1% thấp ${s.low1 ?? '–'} · khung ${s.frameMs ?? '–'} ms
cập nhật ${s.updateMs ?? '–'} ms · render ${s.renderMs ?? '–'} ms
draw call ${s.calls} · tam giác ${s.tris.toLocaleString('vi-VN')}
tướng sống ${s.units} · đạn ${s.projectiles} · hạt ${s.particles} · trạng thái ${s.statuses} · tác vụ ${s.tasks}
geo ${s.geometries} · texture ${s.textures} · shader ${s.programs} · heap ${s.heapMB ?? '–'} MB
${s.phase} · vòng ${s.round} · bước ${s.step} (${s.time} s) · seed ${s.seed ?? '–'}
đồ hoạ ${s.quality} ×${s.pixelRatio}${s.sandbox ? ' · ĐANG THỬ (không lưu)' : ''}`;
  },
  out(text) { $('dbg-outh').hidden = false; $('dbg-out').textContent = text; },
  /** Vào chế độ thử: chụp ván thật một lần, bật sandbox (saveGame bỏ qua). */
  enterSandbox() { if (battle.phase === 'fight') return false; if (!this.snap) this.snap = snapshotGame(); battle.sandbox = true; return true; },
  testTeams() {
    let s = (this.testSeed++ * 2654435761) >>> 0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    return { A: BalanceSimulator.makeTeam(rnd, 6, 14, false).units, B: BalanceSimulator.makeTeam(rnd, 6, 14, true).units, seed: s };
  },
  setupTest(t) {
    game.level = 9; game.over = false;
    for (const u of boardAllies()) removeUnit(u);
    t.A.forEach(([k, st, c, r]) => placeUnit(k, st, c, r));
    const orig = window.enemyLineup; window.enemyLineup = () => t.B.map(([k, st, c, r]) => [k, c, r, st]);
    battle.enemyTraits = true;
    try { setupRound(); } finally { window.enemyLineup = orig; }
    units.forEach(u => { if (u.team === 'enemy') u.reset(1); });
  },
  act(a) {
    if (a === 'close') return this.toggle(false);
    if (a === 'fight' || a === 'lineup') {
      if (!this.enterSandbox()) return ui.toast('Đang giao chiến – chờ hết trận');
      const t = this.testTeams(); this.setupTest(t);
      if (a === 'fight') { battle.seedOverride = t.seed; startBattle(); battle.seedOverride = null; battle.enemyTraits = false; }
      this.out((a === 'fight' ? 'Trận thử' : 'Đội hình thử') + ' · seed ' + t.seed + '\nTa: ' + t.A.map(u => u[0] + '★' + u[1]).join(' ') + '\nĐịch: ' + t.B.map(u => u[0] + '★' + u[1]).join(' '));
      return;
    }
    if (a === 'end') {
      if (!this.snap) return ui.toast('Không có trận / đội hình thử');
      timelines.forEach(t => t.cancel()); battle.phase = 'prep'; battle.paused = false;
      restoreGame(this.snap); this.snap = null; this.out('Đã khôi phục ván trước khi thử (bản lưu chính không đổi).'); return;
    }
    if (a === 'reset') {
      timelines.forEach(t => t.cancel()); if (battle.phase !== 'prep') battle.phase = 'prep'; battle.paused = false;
      if (this.snap) { restoreGame(this.snap); this.snap = null; } else setupRound();
      this.out('Đã đặt lại vòng ' + battle.round + ' về giai đoạn chuẩn bị.'); return;
    }
    if (a === 'sim') {
      if (battle.phase === 'fight') return ui.toast('Đang giao chiến – chờ hết trận');
      this.out('Đang mô phỏng 100 trận…');
      setTimeout(() => {
        const r = this.lastSim = BalanceSimulator.run({ n: 100, seed: (Date.now() % 100000) + 1, keepFights: false });
        const top = Object.entries(r.champions).sort((x, y) => y[1].winRate - x[1].winRate);
        const f = ([k, c]) => `${UNIT_DEFS[k].short || k} ${(c.winRate * 100).toFixed(0)}% (${c.n})`;
        this.out(`100 trận · seed ${r.meta.seed} · ${(r.meta.ms / 1000).toFixed(1)} s · hoà ${r.meta.draws} · TB ${r.meta.avgTime} s\nMạnh nhất: ${top.slice(0, 4).map(f).join(', ')}\nYếu nhất: ${top.slice(-4).map(f).join(', ')}\nCờ: ${r.flags.filter(x => x.kind !== 'ít dữ liệu').map(x => (x.key ? UNIT_DEFS[x.key].short + ' ' : '') + x.kind).join(', ') || 'không'}\n(100 trận là mẫu nhỏ – dùng npm run simulate cho kết luận)`);
      }, 30);
      return;
    }
    if (a === 'log') {
      const L = combatLog.recent || [];
      this.out(L.length ? L.slice(-25).map(e => `${e.t.toFixed(2)}s ${e.team === 'ally' ? 'ta' : 'địch'} ${e.key} → ${e.skill}${e.target ? ' @' + e.target : ''}`).join('\n') : 'Chưa có kỹ năng nào trong trận này.');
      return;
    }
    if (a === 'export') {
      const rep = { build: 'V1.5', date: new Date().toISOString(), ua: navigator.userAgent, screen: innerWidth + '×' + innerHeight + ' @' + devicePixelRatio, stats: this.stats(), perf: PerfStats.summary(),
        combatLog: Object.assign({}, combatLog, { recent: (combatLog.recent || []).slice(-60) }), audit: Object.assign({}, CombatAudit), sim: this.lastSim && { meta: this.lastSim.meta, champions: this.lastSim.champions, flags: this.lastSim.flags } };
      const blob = new Blob([JSON.stringify(rep, null, 1)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'vkkt-debug-' + Date.now() + '.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.out('Đã xuất báo cáo JSON.');
    }
  }
};
DebugPanel.init();
if (window.__vkkt) window.__vkkt.DebugPanel = DebugPanel;
