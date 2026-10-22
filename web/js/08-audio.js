// Vạn Kiếm Kỳ Trận – Âm thanh tổng hợp WebAudio (mục 11)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 11. Âm thanh tổng hợp (WebAudio) – chỉ bật sau khi người chơi chạm
 * ===================================================================*/
const Sfx = {
  ctx: null, master: null, noise: null, last: {}, muted: store.get('mute', false),
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    } catch (e) { this.ctx = null; }
  },
  ok(key, gap = 0.03) { if (!this.ctx || this.muted) return false; const t = this.ctx.currentTime; if (this.last[key] && t - this.last[key] < gap) return false; this.last[key] = t; return true; },
  env(node, t, a, d, peak) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  noiseHit(freq, q, dur, peak, type = 'bandpass') {
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.005, dur, peak); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    return f;
  },
  tone(freq, dur, peak, type = 'sine', slide = 0) {
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    this.env(g, t, 0.005, dur, peak); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  whoosh() { if (!this.ok('whoosh', 0.05)) return; const f = this.noiseHit(1200, 0.8, 0.18, 0.18); f.frequency.exponentialRampToValueAtTime(3400, this.ctx.currentTime + 0.15); },
  hit(heavy) { if (!this.ok('hit', 0.04)) return; this.tone(heavy ? 90 : 140, heavy ? 0.25 : 0.12, heavy ? 0.5 : 0.3, 'sine', 0.5); this.noiseHit(heavy ? 900 : 2200, 1, 0.08, 0.25); },
  chime() { if (!this.ok('chime', 0.08)) return; [880, 1320, 1760].forEach((f, i) => this.tone(f, 1.2 - i * 0.2, 0.08, 'sine')); },
  thunder() { if (!this.ok('thunder', 0.1)) return; this.noiseHit(300, 0.4, 0.9, 0.6, 'lowpass'); this.noiseHit(3000, 1, 0.12, 0.3); },
  boom() { if (!this.ok('boom', 0.1)) return; this.tone(60, 0.8, 0.7, 'sine', 0.4); this.noiseHit(500, 0.5, 0.6, 0.5, 'lowpass'); },
  fire() { if (!this.ok('fire', 0.1)) return; this.noiseHit(700, 0.6, 0.5, 0.3, 'lowpass'); },
  shield() { if (!this.ok('shield', 0.1)) return; this.tone(520, 0.6, 0.1, 'triangle', 1.5); }
};
