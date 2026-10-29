// Vạn Kiếm Kỳ Trận – Phiêu Lưu: bản lưu localStorage (khoá riêng vkkt_rpg_save – KHÔNG ghi đè bản lưu cờ cũ vkkt_save).
// Có phiên bản, kiểm tra kiểu / làm sạch từng trường, bản hỏng hoặc của phiên bản mới hơn được sao lưu nguyên văn trước khi chơi mới.
// Script thường (không phải module): nạp sau js/rpg/quests.js.
'use strict';

const RPG_SAVE_KEY = 'vkkt_rpg_save', RPG_SAVE_VERSION = 1;
const Save = {
  timer: 0, blocked: false,
  /** Chụp trạng thái để lưu (vị trí, tỉ lệ máu hiện tại). */
  snapshot() {
    const P = Ents.player;
    if (P) { G.x = Math.round(P.pos.x * 10) / 10; G.map = World.def.home || !World.def.minRealm || P.realm.r >= World.def.minRealm ? World.id : SECTS[G.sect].home; G.hp = P.dead ? 1 : P.hp / P.maxHp; G.mp = P.mp / Math.max(1, P.maxMp); }
    return JSON.stringify(Object.assign({}, G, { v: RPG_SAVE_VERSION, saved: Date.now() }));
  },
  now() { if (!G || this.blocked) return false; this.timer = 0; try { localStorage.setItem(RPG_SAVE_KEY, this.snapshot()); return true; } catch (e) { return false; } },
  soon() { this.timer = this.timer || 2; },
  tick(dt) { if (this.timer > 0 && (this.timer -= dt) <= 0) this.now(); },
  /** Đọc + làm sạch bản lưu. { status: 'none' | 'ok' | 'bad' | 'newer', state, reason } */
  parse(raw) {
    if (raw == null) return { status: 'none' };
    let s; try { s = JSON.parse(raw); } catch (e) { return { status: 'bad', reason: 'JSON hỏng' }; }
    if (!s || typeof s !== 'object') return { status: 'bad', reason: 'không phải đối tượng' };
    if ((s.v | 0) > RPG_SAVE_VERSION) return { status: 'newer', reason: 'phiên bản ' + s.v + ' mới hơn' };
    if (!SECTS[s.sect]) return { status: 'bad', reason: 'tông môn lạ' };
    const d = newGameState(String(s.name || 'Đạo hữu').slice(0, 16), s.sect, LOOKS[s.look] ? s.look : SECTS[s.sect].looks[0]);
    const num = (v, def, lo = 0, hi = 1e15) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : def);
    d.created = num(s.created, Date.now()); d.tv = num(s.tv, 0); d.lc = num(s.lc, 0); d.gold = num(s.gold, 0); d.gem = num(s.gem, 0);
    d.map = MAPS[s.map] ? s.map : d.map; d.x = num(s.x, 30, 1, 200); d.hp = num(s.hp, 1, 0.05, 1); d.mp = num(s.mp, 1, 0, 1);
    for (const k in d.points) d.points[k] = Math.floor(num(s.points && s.points[k], 0, 0, k === 'crit' ? POINT_STATS.crit.max : 1e7));
    if (s.skills && typeof s.skills === 'object') { d.skills = {}; for (const k in s.skills) if (RPG_SKILLS[k] && SECTS[s.sect].skills.includes(k) && s.skills[k] >= 1) d.skills[k] = Math.floor(num(s.skills[k], 1, 1, SKILL_MAX_LV)); }
    if (!d.skills[SECTS[s.sect].skills[0]]) d.skills[SECTS[s.sect].skills[0]] = 1;
    if (Array.isArray(s.hotbar)) d.hotbar = [0, 1, 2, 3].map(i => (SECTS[s.sect].skills.includes(s.hotbar[i]) ? s.hotbar[i] : d.hotbar[i]));
    const okItem = it => it && typeof it === 'object' && (
      (it.kind === 'equip' && EQUIP_SLOTS[it.slot] && TIERS[it.tier]) || (it.kind === 'art' && ARTIFACTS[it.id]) || (it.kind === 'comp' && COMPONENTS[it.id]) ||
      (it.kind === 'cons' && CONSUMABLES[it.id]) || (it.kind === 'dan' && it.lv >= 1 && it.lv <= LINHDAN.maxLv) || (it.kind === 'quest' && QUEST_ITEMS[it.id]));
    const clean = it => Object.assign({}, it, { plus: Math.floor(num(it.plus, 0, 0, UPGRADE_MAX)), n: Math.floor(num(it.n, 1, 1, 9999)), uid: Math.floor(num(it.uid, 0, 0)) });
    d.bag = Array.isArray(s.bag) ? s.bag.filter(okItem).map(clean).slice(0, RPG_BAL.bagSize) : [];
    if (s.equip && typeof s.equip === 'object') for (const k of EQUIP_SLOT_KEYS) if (okItem(s.equip[k]) && s.equip[k].kind === 'equip' && s.equip[k].slot === k) d.equip[k] = clean(s.equip[k]);
    if (Array.isArray(s.arts)) d.arts = [0, 1].map(i => (okItem(s.arts[i]) && s.arts[i].kind === 'art' ? clean(s.arts[i]) : null));
    // uid duy nhất: đánh lại số cho mọi vật phẩm (bản lưu sửa tay / trùng uid không làm hỏng túi)
    let uid = 1; for (const it of d.bag) it.uid = uid++; for (const k in d.equip) d.equip[k].uid = uid++; d.arts.forEach(a => a && (a.uid = uid++)); d.uid = uid;
    if (s.quest && typeof s.quest === 'object') { d.quest.i = Math.floor(num(s.quest.i, 0, 0, QUESTS.length)); d.quest.n = Math.floor(num(s.quest.n, 0, 0, 1e6)); d.quest.done = Array.isArray(s.quest.done) ? s.quest.done.filter(id => QUESTS.some(q => q.id === id)) : []; }
    if (s.tree && typeof s.tree === 'object') d.tree = { lv: Math.floor(num(s.tree.lv, 1, 1, LINHDAN.maxLv)), t: num(s.tree.t, Date.now()), stock: Math.floor(num(s.tree.stock, 0, 0, 99)) };
    d.balls = Array.isArray(s.balls) ? [...new Set(s.balls.filter(b => Number.isInteger(b) && b >= 1 && b <= LONG_CHAU_COUNT))].sort() : [];
    d.wishes = Math.floor(num(s.wishes, 0)); d.kills = Math.floor(num(s.kills, 0)); d.bossKills = Math.floor(num(s.bossKills, 0)); d.deaths = Math.floor(num(s.deaths, 0)); d.playT = num(s.playT, 0);
    d.buffs = s.buffs && typeof s.buffs === 'object' ? { tv: num(s.buffs.tv, 0) } : {};
    d.bossT = {}; if (s.bossT && typeof s.bossT === 'object') for (const k in s.bossT) if (MAPS[k] && MAPS[k].boss) d.bossT[k] = Math.max(d.playT + 20, num(s.bossT[k], d.playT + 60, -1));
    d.bounty = s.bounty && MAPS[s.bounty.map] ? { map: s.bounty.map, count: num(s.bounty.count, 15, 1, 99), n: num(s.bounty.n, 0, 0, 99), tv: num(s.bounty.tv, 0), gold: num(s.bounty.gold, 0), gem: num(s.bounty.gem, 0, 0, 99) } : null;
    d.tut = s.tut && typeof s.tut === 'object' ? Object.assign({}, s.tut) : {};
    d.quick = 'hp_s';
    return { status: 'ok', state: d, from: s.v | 0 };
  },
  load() {
    let raw = null; try { raw = localStorage.getItem(RPG_SAVE_KEY); } catch (e) { /* bị chặn */ }
    const r = this.parse(raw);
    if (r.status === 'bad' || r.status === 'newer') { try { localStorage.setItem(RPG_SAVE_KEY + '_backup', raw); } catch (e) { /* đầy */ } console.warn('[Lưu] Bản lưu không đọc được (' + r.reason + ') – đã sao lưu sang ' + RPG_SAVE_KEY + '_backup'); }
    return r;
  },
  wipe() { try { const raw = localStorage.getItem(RPG_SAVE_KEY); if (raw) localStorage.setItem(RPG_SAVE_KEY + '_prev', raw); localStorage.removeItem(RPG_SAVE_KEY); } catch (e) { /* bỏ qua */ } }
};
