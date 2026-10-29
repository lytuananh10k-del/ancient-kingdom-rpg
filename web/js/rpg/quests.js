// Vạn Kiếm Kỳ Trận – Phiêu Lưu: nhiệm vụ chính tuyến (15 bước), nhiệm vụ trừ yêu lặp lại, chỉ đường và gợi ý hướng dẫn lần đầu.
// Script thường (không phải module): nạp sau js/rpg/items.js.
'use strict';

const regionMap = (sect, idx) => ({ kiem: 'A', phap: 'B', vo: 'C' }[sect]) + idx;
const Quests = {
  cur() { return G && G.quest.i < QUESTS.length ? QUESTS[G.quest.i] : null; },
  /** Văn bản nhiệm vụ hiện tại (có tên bản đồ cụ thể theo tông môn) + tiến độ. */
  text(q = this.cur()) {
    if (!q) return 'Đã hoàn thành chính tuyến – nhận nhiệm vụ trừ yêu ở Sư Phụ.';
    const n = G.quest.n;
    switch (q.type) {
      case 'kill': return `Hạ ${q.count} yêu thú ở ${MAPS[regionMap(G.sect, q.idx)].name} hoặc bản đồ cùng cấp (${n}/${q.count})`;
      case 'drop': return `Thu thập ${q.count} ${QUEST_ITEMS[q.item].name} từ yêu thú ở ${MAPS[regionMap(G.sect, q.idx)].name} hoặc bản đồ cùng cấp (${Bag.count('quest', q.item)}/${q.count})`;
      case 'killmap': return `${q.text} (${n}/${q.count})`;
      case 'boss': return `Hạ boss ${MONSTERS[MAPS[regionMap(G.sect, 3)].boss].name} ở ${MAPS[regionMap(G.sect, 3)].name} (hoặc boss vùng khác)`;
      case 'longchau': return `${q.text} (${G.balls.length}/${LONG_CHAU_COUNT})`;
      case 'realm': return `${q.text} (hiện tại: ${Ents.player.realm.name} tầng ${Ents.player.realm.layer})`;
    }
    return q.text;
  },
  /** Bản đồ cần tới cho nhiệm vụ hiện tại (để chỉ đường). */
  targetMap(q = this.cur()) {
    if (!q) return G.sect && SECTS[G.sect].home;
    switch (q.type) {
      case 'talk': return q.sect === 'other' ? (World.def.home && World.def.home !== G.sect ? World.id : null) : SECTS[G.sect].home;
      case 'kill': case 'drop': return regionMap(G.sect, q.idx);
      case 'boss': return regionMap(G.sect, 3);
      case 'killmap': case 'bossmap': return q.map;
      case 'harvest': case 'craft': return SECTS[G.sect].home;
      case 'longchau': return G.balls.length >= LONG_CHAU_COUNT ? SECTS[G.sect].home : null;
      case 'realm': { const r = Ents.player.realm.r; return r < 1 ? regionMap(G.sect, 1) : r < 2 ? regionMap(G.sect, 2) : r < 3 ? regionMap(G.sect, 3) : 'D1'; }
    }
    return null;
  },
  /** Chỉ đường: { dir: −1 / +1 / 0, x (điểm đích trong bản đồ này), hint }. */
  guide() {
    const q = this.cur(), tm = this.targetMap(q); if (!tm) return q && q.type === 'talk' && q.sect === 'other' ? { dir: 0, hint: 'Về sơn môn, nhờ Truyền Tống Sứ đưa tới tông môn khác' } : null;
    if (tm === World.id) {
      const role = q && (q.type === 'talk' ? q.role : q.type === 'harvest' ? 'tree' : q.type === 'craft' ? 'smith' : q.type === 'longchau' ? 'altar' : null);
      const npc = role && Ents.npcs.find(n => n.role === role);
      return npc ? { x: npc.pos.x, dir: Math.sign(npc.pos.x - Ents.player.pos.x), hint: npc.title } : null;
    }
    const a = MAPS[World.id], b = MAPS[tm];
    if (a.region === b.region) { const d = +tm[1] - +World.id[1]; return { dir: Math.sign(d), x: d > 0 ? World.width : 0, hint: 'Tới ' + b.name }; }
    if (World.def.home) { const t = Ents.npcs.find(n => n.role === 'tele'); return { x: t.pos.x, dir: Math.sign(t.pos.x - Ents.player.pos.x), hint: 'Truyền Tống Sứ → ' + b.name }; }
    return { dir: -1, x: 0, hint: 'Về sơn môn (đi sang trái), nhờ Truyền Tống Sứ' };
  },
  on(ev, data) {
    const q = this.cur(); if (!q) { if (ev === 'kill' && G.bounty) this.bountyKill(data); return; }
    let prog = false;
    switch (q.type) {
      case 'kill': if (ev === 'kill' && mapIdx(World.id) === q.idx && !World.def.home && World.def.region !== 'ma') { G.quest.n++; prog = true; } break;
      case 'killmap': if (ev === 'kill' && World.id === q.map) { G.quest.n++; prog = true; } break;
      case 'drop': if (ev === 'item') prog = true; break;
      case 'harvest': if (ev === 'harvest') return this.complete(); break;
      case 'points': if (ev === 'points') return this.complete(); break;
      case 'craft': if (ev === 'craft') return this.complete(); break;
      case 'realm': if (ev === 'realm' || ev === 'check') if (Ents.player.realm.r >= q.realm) return this.complete(); break;
      case 'boss': if (ev === 'boss' && mapIdx(data) === 3) return this.complete(); break;
      case 'bossmap': if (ev === 'boss' && data === q.map) return this.complete(); break;
      case 'longchau': if (ev === 'wish') return this.complete(); break;
    }
    if (G.bounty && ev === 'kill') this.bountyKill(data);
    if (prog) {
      if ((q.type === 'kill' || q.type === 'killmap') && G.quest.n >= q.count) return this.complete();
      if (q.type === 'drop' && Bag.count('quest', q.item) >= q.count) { Bag.takeKind('quest', q.item, q.count); return this.complete(); }
      ui.quest();
    }
  },
  /** Nói chuyện với NPC: trả về true nếu hoàn thành nhiệm vụ "talk". */
  onTalk(npc) {
    const q = this.cur(); if (!q || q.type !== 'talk' || npc.role !== q.role) return false;
    if (q.sect === 'other' ? npc.sect === G.sect : npc.sect !== G.sect) return false;
    this.complete(); return true;
  },
  npcMark(npc) {
    const q = this.cur(); if (!q) return npc.role === 'master' && !G.bounty ? '!' : '';
    if (q.type === 'talk' && npc.role === q.role && (q.sect === 'other' ? npc.sect !== G.sect : npc.sect === G.sect)) return '!';
    if ((q.type === 'harvest' && npc.role === 'tree') || (q.type === 'craft' && npc.role === 'smith') || (q.type === 'longchau' && npc.role === 'altar' && G.balls.length >= LONG_CHAU_COUNT)) return '!';
    return '';
  },
  complete() {
    const q = this.cur(); if (!q) return;
    G.quest.done.push(q.id); G.quest.i++; G.quest.n = 0;
    const r = q.reward, got = this.give(r);
    ui.banner('Hoàn thành: ' + q.name, got.join(' · '));
    Chat.sys('Hoàn thành nhiệm vụ "' + q.name + '"'); Sfx.chime();
    if (r.unlock) Tasks.after(2.5, () => ui.toast('Mở khoá kỹ năng mới – tới Sư Phụ để học'));
    const nq = this.cur(); if (nq) Tasks.after(2.8, () => { ui.toast('Nhiệm vụ mới: ' + nq.name); this.on('check'); });
    ui.quest(); Save.now();
  },
  give(r) {
    const P = Ents.player, got = [];
    if (r.gold) { G.gold += r.gold; got.push('+' + fmtFull(r.gold) + ' linh thạch'); }
    if (r.gem) { G.gem += r.gem; got.push('+' + r.gem + ' tiên ngọc'); }
    if (r.tv) { P.gainTv(r.tv, true); got.push('+' + fmtNum(r.tv) + ' tu vi'); }
    if (r.item) { Bag.add({ kind: 'cons', id: r.item[0], n: r.item[1] }, true); got.push(r.item[1] + ' ' + CONSUMABLES[r.item[0]].name); }
    if (r.equip) { const it = { kind: 'equip', slot: r.equip[0], tier: r.equip[1], plus: 0 }; if (Bag.add(it, true)) got.push(itemInfo(it).name); }
    if (r.art) { const it = { kind: 'art', id: ARTIFACT_LIST[(Math.random() * ARTIFACT_LIST.length) | 0][0], plus: r.art }; Bag.add(it, true); got.push(itemInfo(it).name); }
    if (r.ball) { const s = [1, 2, 3, 4, 5, 6, 7].find(k => !G.balls.includes(k)); if (s) { addBall(s); got.push('Long Châu ' + s + ' sao'); } }
    return got;
  },
  /* ---------- Trừ yêu (lặp lại, nhận ở Sư Phụ sau chính tuyến hoặc từ bước 4) ---------- */
  bountyOffer() {
    const lv = effLevel(G.tv), maps = MAP_KEYS.filter(k => MAPS[k].level && (!MAPS[k].minRealm || Ents.player.realm.r >= MAPS[k].minRealm));
    const m = maps.reduce((b, k) => (Math.abs((MAPS[k].level[0] + MAPS[k].level[1]) / 2 - lv) < Math.abs((MAPS[b].level[0] + MAPS[b].level[1]) / 2 - lv) ? k : b), maps[0]);
    const L = (MAPS[m].level[0] + MAPS[m].level[1]) / 2, n = 15;
    return { map: m, count: n, n: 0, tv: Math.round(RPG_BAL.tvKill * L * n * 3 + 40 * Math.pow(L, 1.5) * n * RPG_BAL.tvPerDmg * 0.3), gold: Math.round((2 + L * 2.2) * n * 2), gem: 2 };
  },
  bountyKill(m) { const b = G.bounty; if (!b || World.id !== b.map) return; b.n++; if (b.n >= b.count) { const got = this.give({ tv: b.tv, gold: b.gold, gem: b.gem }); G.bounty = null; ui.banner('Hoàn thành trừ yêu', got.join(' · ')); Sfx.chime(); Save.now(); } ui.quest(); },
  /** Gợi ý lần đầu (mỗi gợi ý chỉ hiện 1 lần, lưu trong G.tut). */
  tut(key) { if (!G || G.tut[key]) return; G.tut[key] = 1; const T = { fly: 'Đang bay: giữ ↑ / ↓ để lên xuống, bay tốn linh lực. Nhấn ↓ khi chạm đất để đáp.' }; if (T[key]) ui.toast(T[key], 5); }
};
