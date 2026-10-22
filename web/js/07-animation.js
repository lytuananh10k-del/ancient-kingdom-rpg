// Vạn Kiếm Kỳ Trận – AnimationStateMachine, SkillTimeline (mục 9–10)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  9. AnimationStateMachine – trạng thái logic có chặn kẹt (watchdog)
 * ===================================================================*/
class AnimationStateMachine {
  constructor(owner) { this.owner = owner; this.states = new Map(); this.current = null; this.time = 0; }
  add(name, def) { def.name = name; this.states.set(name, def); return this; }
  get name() { return this.current ? this.current.name : ''; }
  can(name) {
    const s = this.states.get(name), c = this.current;
    if (!s) return false;
    if (!c) return true;
    return !c.locked || c.locked.call(this.owner, name, this.time) === false;
  }
  set(name, ...args) {
    const s = this.states.get(name); if (!s) throw new Error('Không có trạng thái ' + name);
    const prev = this.current;
    if (prev && prev.exit) prev.exit.call(this.owner, name);
    this.current = s; this.time = 0;
    if (s.enter) s.enter.call(this.owner, prev ? prev.name : '', ...args);
  }
  update(dt) {
    if (!this.current) return;
    this.time += dt;
    if (this.current.maxTime && this.time > this.current.maxTime) { this.set(this.current.fallback || 'idle'); return; } // chống kẹt
    if (this.current.update) this.current.update.call(this.owner, dt, this.time);
  }
}

/* =====================================================================
 * 10. SkillTimeline – sự kiện theo thời gian mô phỏng (không dùng setTimeout)
 * ===================================================================*/
class SkillTimeline {
  constructor(name, owner) { this.name = name; this.owner = owner; this.events = []; this.tracks = []; this.cleanups = []; this.t = 0; this.speed = 1; this.paused = false; this.done = false; this.cancelled = false; this.cursor = 0; this.sorted = false; this.duration = 0; }
  /** type: AnimationEvent | SpawnVFX | PlaySound | LaunchProjectile | ApplyDamage | ApplyStatusEffect | CameraImpulse | Cleanup */
  at(t, type, fn) { this.events.push({ t, type, fn }); this.duration = Math.max(this.duration, t); this.sorted = false; return this; }
  track(start, end, type, fn) { this.tracks.push({ start, end, type, fn, ended: false }); this.duration = Math.max(this.duration, end); return this; }
  onCleanup(fn) { this.cleanups.push(fn); return this; }
  pause() { this.paused = true; } resume() { this.paused = false; }
  setSpeed(s) { this.speed = s; }
  /** Tua nhanh: chạy tiếp tới thời điểm t (mọi sự kiện logic vẫn được kích hoạt theo đúng thứ tự). */
  seek(t) { while (!this.done && this.t < t) this.update(Math.min(1 / 60, t - this.t)); }
  cancel() { if (this.done) return; this.cancelled = true; this.finish(); }
  finish() { if (this.done) return; this.done = true; this.cleanups.forEach(fn => { try { fn(this.cancelled); } catch (e) { console.error('[Timeline cleanup]', e); } }); }
  update(dt) {
    if (this.done || this.paused) return;
    if (!this.sorted) { this.events.sort((a, b) => a.t - b.t); this.sorted = true; }
    const prev = this.t; this.t += dt * this.speed;
    while (this.cursor < this.events.length && this.events[this.cursor].t <= this.t) {
      const e = this.events[this.cursor++];
      try { e.fn(this); } catch (err) { console.error('[Timeline ' + this.name + ' – ' + e.type + ']', err); }
      if (this.done) return;
    }
    for (const tr of this.tracks) {
      if (tr.ended || this.t < tr.start) continue;
      const k = clamp((this.t - tr.start) / Math.max(1e-4, tr.end - tr.start), 0, 1);
      try { tr.fn(k, this.t - tr.start, dt * this.speed, this); } catch (err) { console.error('[Timeline track ' + tr.type + ']', err); tr.ended = true; }
      if (this.t >= tr.end) tr.ended = true;
    }
    if (this.cursor >= this.events.length && this.tracks.every(t => t.ended) && this.t >= this.duration) this.finish();
    return prev;
  }
}
const timelines = [];
function runTimeline(tl) { timelines.push(tl); return tl; }
