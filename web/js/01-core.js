// Vạn Kiếm Kỳ Trận – Tiện ích chung, lưu trữ, QualityManager (mục 0–1)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';
if (!window.THREE) { document.getElementById('boot-error').hidden = false; throw new Error('Không tải được Three.js'); }

/* =====================================================================
 *  0. TIỆN ÍCH
 * ===================================================================*/
const V3 = THREE.Vector3, TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeIn = t => t * t * t;
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const isMobile = isTouch && Math.min(screen.width, screen.height) < 900;
const store = {
  get(k, d) { try { const v = localStorage.getItem('vkkt_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('vkkt_' + k, JSON.stringify(v)); } catch (e) { /* bộ nhớ bị chặn */ } }
};
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _q1 = new THREE.Quaternion(), _m1 = new THREE.Matrix4(), _c1 = new THREE.Color();
const UP = new V3(0, 1, 0);

/* =====================================================================
 *  1. QualityManager – 4 mức + tự giảm khi FPS thấp kéo dài
 * ===================================================================*/
const QualityManager = {
  order: ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'],
  presets: {
    LOW:    { label: 'Thấp',     pr: 0.75, bloom: 0, shadows: false, shadowSize: 512,  outline: false, particles: 700,  swords: 14, env: 0, trail: 8 },
    MEDIUM: { label: 'Vừa',      pr: 1.0,  bloom: 1, shadows: false, shadowSize: 1024, outline: true,  particles: 1600, swords: 24, env: 1, trail: 10 },
    HIGH:   { label: 'Cao',      pr: 1.5,  bloom: 2, shadows: true,  shadowSize: 1024, outline: true,  particles: 3000, swords: 36, env: 2, trail: 12 },
    ULTRA:  { label: 'Tối đa',   pr: 2.0,  bloom: 2, shadows: true,  shadowSize: 2048, outline: true,  particles: 5000, swords: 56, env: 3, trail: 14 }
  },
  level: 'MEDIUM', cur: null, auto: true, listeners: [],
  lowTime: 0, cooldown: 0, ema: 60,
  init() {
    const saved = store.get('quality', null);
    this.level = this.presets[saved] ? saved : (isMobile ? 'MEDIUM' : 'HIGH');
    this.auto = store.get('autoQuality', true);
    this.cur = this.presets[this.level];
  },
  set(level, reason) {
    if (!this.presets[level]) return;
    this.level = level; this.cur = this.presets[level];
    store.set('quality', level);
    this.listeners.forEach(fn => fn(this.cur, reason));
  },
  onChange(fn) { this.listeners.push(fn); },
  sample(dt) {
    if (dt <= 0) return;
    this.ema = lerp(this.ema, 1 / dt, 0.05);
    this.cooldown -= dt;
    if (!this.auto || this.cooldown > 0) { this.lowTime = 0; return; }
    if (this.ema < 38) this.lowTime += dt; else this.lowTime = Math.max(0, this.lowTime - dt * 2);
    if (this.lowTime > 4) {
      const i = this.order.indexOf(this.level);
      this.lowTime = 0; this.cooldown = 10;
      if (i > 0) this.set(this.order[i - 1], 'auto');
    }
  }
};
QualityManager.init();
const Q = () => QualityManager.cur;
