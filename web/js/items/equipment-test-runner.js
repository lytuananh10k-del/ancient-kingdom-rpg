// Vạn Kiếm Kỳ Trận – EquipmentTestRunner (V1.6): kiểm thử tự động hệ thống pháp bảo NGAY TRONG GAME (console: EquipmentTestRunner.run()).
// Chạy trên bản chụp ván (sandbox) rồi khôi phục → không ghi bản lưu thật. Phần giao diện (chuột / cảm ứng) và hồi quy toàn game: tests/equipment.js.
// Nạp sau js/combat/test-runner.js. Script thường (không phải module).
'use strict';
const EquipmentTestRunner = {
  run(opts = {}) {
    const snap = snapshotGame(), sb0 = !!battle.sandbox, out = [], t0 = performance.now();
    const ok = (id, name, pass, detail) => out.push({ id, name, ok: !!pass, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
    const I = ArtifactInventory, C = ArtifactCraftingSystem, E = ArtifactEquipment;
    battle.sandbox = true;
    const fresh = (board = [['kiemdong', 1, 3, 3], ['thietve', 1, 4, 3]]) => {   // ván thử sạch: kho rỗng, đội cho trước
      restoreGame(Object.assign(newGameState(), { gold: 200, level: 9, board: board.map(([key, star, c, r]) => ({ key, star, c, r })) }), true);
    };
    const total = () => I.recs.size;
    const sig = () => I.all().map(r => [r.instanceId, r.itemId, r.loc, r.ownerId, r.slot].join(':')).sort().join('|');
    const addN = list => list.map(k => I.add(k).value.instanceId);
    try {
      // ---------- dữ liệu ----------
      ok(1, 'Có đủ 8 nguyên liệu (ID, tên, mô tả, icon, màu, chỉ số)', COMPONENT_KEYS.length === 8 && COMPONENT_KEYS.every(k => { const c = COMPONENTS[k]; return c.id === k && c.name && c.desc && c.glyph && /^#/.test(c.color) && Object.keys(c.stats).length; }), COMPONENT_KEYS.join(','));
      ok(2, 'Có đúng 36 công thức, mỗi pháp bảo đủ dữ liệu (ID, tên, 2 nguyên liệu, chỉ số, nội tại có logic, kích hoạt, giới hạn, tooltip, icon, nhóm VFX)',
        ARTIFACT_LIST.length === 36 && Object.keys(RECIPES).length === 36 && Object.values(ARTIFACTS).every(a => a.id && a.name && a.parts.length === 2 && Object.keys(a.stats).length && PASSIVE_KINDS[a.passive.kind] && a.trigger && a.limit && a.passiveText && a.glyph && COMPONENTS[a.group]),
        ARTIFACT_LIST.length + ' pháp bảo / ' + Object.keys(RECIPES).length + ' công thức');
      const dupId = ARTIFACT_LIST.length - new Set(ARTIFACT_LIST.map(r => r[0])).size, dupName = ARTIFACT_LIST.length - new Set(ARTIFACT_LIST.map(r => r[1])).size;
      const dupRecipe = ARTIFACT_LIST.length - new Set(ARTIFACT_LIST.map(r => recipeKey(r[2], r[3]))).size;
      ok(3, 'Không trùng công thức / ID / tên; validateArtifacts không lỗi', !dupId && !dupName && !dupRecipe && !validateArtifacts().length, { dupId, dupName, dupRecipe, errors: validateArtifacts() });
      let sym = 0, pairs = 0; for (const a of COMPONENT_KEYS) for (const b of COMPONENT_KEYS) { pairs++; if (recipeOf(a, b) && recipeOf(a, b) === recipeOf(b, a)) sym++; }
      ok(4, 'A+B và B+A cho cùng pháp bảo (64 cặp có thứ tự)', sym === 64, sym + '/' + pairs);
      // ---------- ghép ----------
      fresh();
      const [s1, s2] = addN(['sword', 'sword']);
      const same = C.craft(s1, s1);
      const aa = C.craft(s1, s2);
      ok(5, 'Ghép A+A dùng 2 instance khác nhau; cùng 1 instance bị từ chối', !same.ok && aa.ok && aa.value.itemId === 'tru_tien_kiem' && !I.get(s1) && !I.get(s2) && total() === 1, { same: same.reason, result: aa.ok && aa.value.itemId });
      fresh();
      const [m1] = addN(['staff']); const ghost = 'it999999';
      const before6 = sig(), miss = C.craft(m1, ghost);
      ok(6, 'Không ghép khi thiếu nguyên liệu (instance không tồn tại)', !miss.ok && sig() === before6, miss.reason);
      // ghép thất bại giữa chừng (sự cố sau khi đã xoá nguyên liệu) → hoàn tác toàn bộ
      fresh();
      const [f1, f2] = addN(['bow', 'armor']); const before7 = sig();
      const crash = I.tx('crash-test', [f1, f2], () => { I._delete(f1); I._delete(f2); throw Object.assign(new Error('sự cố giả lập giữa giao dịch'), { simulated: true }); });
      const bad1 = C.craft(f1, 'khong-co'), bad2 = C.craft(f1, f1);
      ok(7, 'Ghép thất bại không mất đồ (sự cố giữa giao dịch → hoàn tác; thiếu / trùng nguyên liệu → không đổi)', !crash.ok && !bad1.ok && !bad2.ok && sig() === before7 && I.get(f1) && I.get(f2), { crash: crash.reason });
      // ghép thành công: −2 nguyên liệu, +1 pháp bảo; bấm liên tục 6 lần chỉ ra 1
      fresh();
      const [g1, g2, g3] = addN(['glove', 'jade', 'sword']); const n0 = total();
      const spam = [1, 2, 3, 4, 5, 6].map(() => C.craft(g1, g2).ok);
      const arts = I.all().filter(r => isArtifact(r.itemId));
      ok(8, 'Ghép thành công không nhân đôi: đúng −2 nguyên liệu +1 pháp bảo, bấm dồn 6 lần chỉ ghép 1', spam.filter(Boolean).length === 1 && total() === n0 - 1 && arts.length === 1 && arts[0].itemId === 'ho_tam_bao_ngoc' && I.get(g3), { spam, total: total() });
      // giữ chỗ khi đang chờ xác nhận: thao tác khác trên 2 vật phẩm bị từ chối
      fresh();
      const [h1, h2] = addN(['cloak', 'cloak']); I.lock([h1, h2]);
      const locked = C.craft(h1, h2), lockedMove = I.moveSlot(h1, 7), own = C.craft(h1, h2, [h1, h2]); I.unlock([h1, h2]);
      ok('8b', 'Đang chờ xác nhận ghép: vật phẩm bị giữ chỗ, chỉ giao dịch xác nhận được dùng', !locked.ok && !lockedMove.ok && own.ok, { locked: locked.reason });
      // ---------- trang bị ----------
      fresh();
      const u = boardAllies()[0], v = boardAllies()[1];
      const ids = [];
      for (const [a, b] of [['sword', 'bow'], ['armor', 'jade'], ['staff', 'crystal'], ['cloak', 'glove']]) { const [x, y] = addN([a, b]); ids.push(C.craft(x, y).value.instanceId); }
      const eq = ids.map(id => E.equip(id, u.cid));
      ok(9, 'Trang bị tối đa 3 món (món thứ 4 bị từ chối, vẫn ở kho)', eq.slice(0, 3).every(r => r.ok) && !eq[3].ok && u.items.length === 3 && I.get(ids[3]).loc === 'inv', eq[3].reason);
      const mv = E.equip(ids[0], v.cid);
      const owners = I.all().filter(r => r.instanceId === ids[0]).map(r => r.ownerId);
      ok(10, 'Một vật phẩm không thuộc hai tướng: trang bị cho tướng khác = CHUYỂN (tướng cũ mất món đó)', mv.ok && owners.length === 1 && owners[0] === v.cid && !u.items.includes(I.get(ids[0]).itemId) && v.items.length === 1 && !I.audit().length, I.audit());
      const enemy = units.find(x => x.team === 'enemy');
      const toEnemy = equipArtifact(ids[3], { type: 'board', unit: enemy }), toEnemy2 = E.equip(ids[3], enemy && enemy.cid);
      ok(11, 'Không trang bị cho tướng địch', !toEnemy.ok && !toEnemy2.ok && I.get(ids[3]).loc === 'inv', toEnemy.reason);
      battle.phase = 'fight'; const inFight = E.equip(ids[3], v.cid), unFight = E.unequip(ids[1]); battle.phase = 'prep';
      ok('11b', 'Không đổi đồ trong giao tranh tiêu chuẩn (trang bị / tháo bị từ chối)', !inFight.ok && !unFight.ok, inFight.reason);
      const inv12 = I.invCount(), n12 = total(), uItems = u.items.length;
      sellSrc({ type: 'board', unit: u });
      ok(12, 'Bán tướng hoàn trả vật phẩm về kho (tổng số vật phẩm không đổi)', I.invCount() === inv12 + uItems && total() === n12 && !I.audit().length, { returned: uItems });
      // ---------- nâng sao ----------
      fresh([['kiemdong', 1, 3, 3]]);
      const p0 = boardAllies()[0];
      const mk = (a, b) => { const [x, y] = addN([a, b]); return C.craft(x, y).value.instanceId; };
      const pa = [mk('sword', 'sword'), mk('bow', 'bow')]; pa.forEach(id => E.equip(id, p0.cid));
      game.bench[0] = { key: 'kiemdong', star: 1, cid: newCid() }; game.bench[1] = { key: 'kiemdong', star: 1, cid: newCid() };
      const b1 = mk('armor', 'armor'), b2 = mk('jade', 'jade'), b3 = mk('glove', 'glove');
      E.equip(b1, game.bench[0].cid); E.equip(b2, game.bench[1].cid); E.equip(b3, game.bench[1].cid);
      const n13 = total(), all13 = new Set(I.all().map(r => r.instanceId));
      mergeAll();
      const star2 = boardAllies().find(x => x.key === 'kiemdong');
      const keptPrimary = pa.every(id => I.get(id) && I.get(id).ownerId === star2.cid);
      ok(13, 'Nâng sao bảo toàn vật phẩm: bản chính giữ đồ, ô trống nhận đồ bản phụ, phần dư về kho, không mất / nhân đôi',
        star2 && star2.star === 2 && star2.cid === p0.cid && keptPrimary && star2.items.length === 3 && total() === n13 && [...all13].every(id => I.get(id)) && I.invList().length === 2 && !I.audit().length,
        { star: star2 && star2.star, items: star2 && star2.items, inv: I.invList().map(r => r.itemId) });
      // nâng sao khi kho + ô tạm giữ đầy → huỷ nâng sao, không mất đồ
      fresh([['thietve', 1, 3, 3]]);
      const q0 = boardAllies()[0]; [mk('sword', 'staff'), mk('bow', 'armor')].forEach(id => E.equip(id, q0.cid));
      game.bench[0] = { key: 'thietve', star: 1, cid: newCid() }; game.bench[1] = { key: 'thietve', star: 1, cid: newCid() };
      [mk('cloak', 'jade'), mk('glove', 'crystal')].forEach(id => E.equip(id, game.bench[0].cid)); [mk('sword', 'jade')].forEach(id => E.equip(id, game.bench[1].cid));
      while (I.freeInvSlot(true) >= 0) I.add('jade');
      const n13b = total(); mergeAll();
      const still = boardAllies().find(x => x.key === 'thietve');
      ok('13b', 'Nâng sao khi kho + ô tạm giữ đầy: huỷ nâng sao, không mất đồ', still.star === 1 && game.bench.filter(e => e && e.key === 'thietve').length === 2 && total() === n13b && !I.audit().length, { star: still.star, total: total() });
      // ---------- lưu / tải ----------
      fresh();
      const w = boardAllies()[0]; const z = mk('sword', 'glove'); E.equip(z, w.cid); addN(['staff', 'bow']);
      game.bench[2] = { key: 'hoa', star: 1, cid: newCid() }; E.equip(mk('jade', 'cloak'), game.bench[2].cid);
      const s14 = JSON.parse(JSON.stringify(snapshotGame())), sigA = sig();
      restoreGame(JSON.parse(JSON.stringify(s14)), true); restoreGame(JSON.parse(JSON.stringify(snapshotGame())), true);
      const sigB = sig();
      // bản lưu bị sửa: cùng instance 2 lần, một món trên 2 chủ, chủ không tồn tại, nguyên liệu "được trang bị" → làm sạch, không nhân đôi
      const forged = JSON.parse(JSON.stringify(s14)); const row = forged.inv.items.find(r => r[2] === 'u');
      forged.inv.items.push(row.slice(), [row[0], row[1], 'u', 'c99999', 1], ['it777', 'sword', 'u', forged.board[0].cid, 2], ['it778', 'khong_co', 'i', null, 3]);
      const pf = parseSave(JSON.stringify(forged)); restoreGame(pf.state, true);
      const cnt = id => I.all().filter(r => r.instanceId === id).length;
      ok(14, 'Lưu và tải không nhân đôi (2 lần lưu/tải giống hệt; bản lưu bị sửa trùng instance / 2 chủ / chủ lạ → mỗi instance 1 nơi)', sigA === sigB && cnt(row[0]) === 1 && I.get('it777') && I.get('it777').loc === 'inv' && !I.get('it778') && !I.audit().length,
        { same: sigA === sigB, dupLeft: cnt(row[0]), forgedComp: I.get('it777') && I.get('it777').loc });
      // chuyển bản lưu v2 (trang bị cũ) → nguyên liệu
      const v2 = { v: 2, hp: 70, gold: 9, level: 5, xp: 0, streak: 0, round: 6, over: false, items: ['kiem', 'ngoa'], rivals: {}, shop: null,
        bench: [{ key: 'hoa', star: 1, items: ['giap'] }, null, null, null, null, null, null, null, null], board: [{ key: 'kiemdong', star: 2, c: 3, r: 3, items: ['chau', 'phu', 'ngoc'] }] };
      const p2 = parseSave(JSON.stringify(v2)); restoreGame(p2.state, true);
      const comps = I.invList().map(r => r.itemId).sort().join(',');
      ok('14b', 'Bản lưu V1.5 (v2): 6 trang bị cũ → 6 nguyên liệu trong kho, tướng giữ nguyên', p2.status === 'ok' && p2.from === 2 && comps === ['sword', 'bow', 'armor', 'crystal', 'cloak', 'jade'].sort().join(',') && boardAllies().some(x => x.key === 'kiemdong' && x.star === 2), comps);
      // phần thưởng PvE: đúng 1 lần mỗi vòng
      fresh(); game.rewardLog = [];
      const r1 = ArtifactRewards.grant(7, ['sword', 'bow']), r2 = ArtifactRewards.grant(7, ['sword', 'bow']);
      const s15 = snapshotGame(); restoreGame(JSON.parse(JSON.stringify(s15)), true); const r3 = ArtifactRewards.grant(7, ['jade']);
      ok('14c', 'Phần thưởng PvE: nhận đúng 1 lần mỗi vòng (gọi lặp / sau khi tải lại không nhận thêm), tối đa ' + ARTIFACT_REWARDS.maxPerRound + ' / vòng',
        r1.length === 2 && !r2.length && !r3.length && I.invCount() === 2 && ArtifactRewards.grant(11, ['a', 'b', 'c', 'd', 'e'].map(() => 'jade')).length === ARTIFACT_REWARDS.maxPerRound, { r1, r2, r3 });
      // ---------- nội tại ----------
      const P = this.passives(); out.push(...P);
      // ---------- chỉ số không cộng dồn khi vẽ giao diện ----------
      fresh();
      const y = boardAllies()[0]; E.equip(mk('sword', 'sword'), y.cid); E.equip(mk('jade', 'jade'), y.cid); afterRosterChange();
      const st0 = JSON.stringify([y.atk, y.maxHp, y.ap_, y.def_, y.mr_, y.crit_]);
      for (let i = 0; i < 60; i++) { ui.update(); showUnitInfo(y); renderUnitInfo(); applyTraits(); y.reset(1); }
      closeUnitInfo();
      ok(17, 'Không cộng lại chỉ số khi vẽ giao diện (60 lần vẽ + áp tộc/hệ + reset: chỉ số giống hệt; +20 công +300 máu đúng)', JSON.stringify([y.atk, y.maxHp, y.ap_, y.def_, y.mr_, y.crit_]) === st0 && y.atk === 72 && y.maxHp === 600 + 300, st0);
      // ---------- LOW / ULTRA ----------
      const fight = q => { QualityManager.set(q, 'test'); return CombatTestRunner.run({ allies: [['kiemdong', 2, 3, 3, ['phap_kiem_loi_dinh', 'tru_tien_kiem']], ['hoa', 2, 3, 1, ['hoa_linh_ho_giap']], ['thietve', 2, 4, 3, ['phan_kich_chi_giap', 'bat_diet_than_giap']]],
        enemies: [['mabinh', 2, 3, 4, ['phan_kich_chi_giap']], ['linhcung', 2, 4, 6, ['thien_menh_thu_sao', 'lien_kich_thu_sao']], ['thanhmoc', 2, 2, 6, ['thanh_moc_phap_chau']]], seed: 4242, keepState: true }); };
      const q0l = QualityManager.level, lo = fight('LOW'), procsLo = combatLog.artProcs; nextRound(); const hi = fight('ULTRA'); QualityManager.set(q0l, 'test');
      ok(18, 'VFX LOW / ULTRA không ảnh hưởng sát thương (cùng seed, có pháp bảo: kết quả giống hệt từng điểm máu)', lo.fingerprint === hi.fingerprint && lo.result === hi.result, { lo: lo.result + '@' + lo.time, hi: hi.result + '@' + hi.time });
      // ---------- 24 tướng & kinh tế vẫn đúng ----------
      fresh([]);
      let bad19 = [];
      for (const k of CHAMPION_KEYS) {
        game.bench.fill(null); game.gold = 999; const g0 = game.gold, c = UNIT_DEFS[k].cost;
        for (let i = 0; i < 3; i++) { game.shop[0] = k; buyShop(0); }
        const e = game.bench.find(x => x && x.key === k);
        if (!e || e.star !== 2 || game.gold !== g0 - 3 * c) { bad19.push(k + ':mua/nâng'); continue; }
        const it = mk('sword', 'armor'); E.equip(it, e.cid);
        sellSrc({ type: 'bench', i: game.bench.indexOf(e) });
        if (game.gold !== g0 - 3 * c + sellPrice(k, 2) || !I.get(it) || I.get(it).loc !== 'inv') bad19.push(k + ':bán');
        I.remove(it);
      }
      ok(19, '24 tướng vẫn mua, nâng sao, bán đúng giá; đồ trên tướng được trả về khi bán', !bad19.length, bad19.join(' '));
      fresh(); const inc = (() => { game.gold = 25; battle.round = 4; game.streak = 0; const g = game.gold; settleRound(true); return game.gold - g; })();
      ok(21, 'Kinh tế không đổi ở vòng thường: thu nhập = 5 + lãi 2 + thắng 1 (chuỗi 1 → +0)', inc === 8 && !game.rewardLog.includes(4), inc);
      ok('21b', 'Sổ vật phẩm toàn vẹn sau toàn bộ bài kiểm thử', !I.audit().length, I.audit());
    } catch (e) {
      ok('x', 'Không lỗi khi chạy EquipmentTestRunner', false, e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | '));
    } finally {
      restoreGame(snap, sb0);
    }
    return { ms: Math.round(performance.now() - t0), pass: out.filter(r => r.ok).length, total: out.length, results: out };
  },
  /** Nội tại: điều kiện kích hoạt, giới hạn, không vòng lặp vô hạn (mục 15–16). Mỗi kịch bản dựng trận thử riêng. */
  passives() {
    const out = [], ok = (id, name, pass, detail) => out.push({ id, name, ok: !!pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    const setup = (aItems, eItems, a = 'thietve', e = 'thietve') => {   // đối thủ không né (kết quả xác định)
      CombatTestRunner.run({ allies: [[a, 1, 3, 3, aItems]], enemies: [[e, 1, 3, 4, eItems || []]], seed: 77, keepState: true, maxTime: 0 });
      const A = units.find(u => u.team === 'ally'), B = units.find(u => u.team === 'enemy');
      return { A, B };
    };
    const procs = (u, i = 0) => (u.artStats && u.artStats[i] ? u.artStats[i].procs : 0);
    // khiên khi máu thấp: trên ngưỡng không kích hoạt, dưới ngưỡng đúng 1 lần
    let { A, B } = setup(['ho_tam_bao_ngoc']);
    dealDamage(B, A, 0, { flat: A.maxHp * 0.3, type: 'true', attack: 1, crit: false }); const above = procs(A);
    dealDamage(B, A, 0, { flat: A.maxHp * 0.35, type: 'true', attack: 2, crit: false }); const below = procs(A), sh = A.shield;
    dealDamage(B, A, 0, { flat: 50, type: 'true', attack: 3, crit: false }); const again = procs(A);
    ok(15, 'Nội tại không kích hoạt khi chưa đủ điều kiện: khiên máu thấp (trên 40% → 0, dưới 40% → 1 lần, không lặp)', above === 0 && below === 1 && sh > 0 && again === 1, { above, below, again, shield: Math.round(sh) });
    nextRound();
    // kết liễu: mục tiêu trên 30% máu → không; dưới → có; sét mỗi đòn thứ 3
    ({ A, B } = setup(['u_minh_thu_sao', 'phap_kiem_loi_dinh'], [], 'kiemdong'));
    B.hp = B.maxHp = 99999; B.hp = 99999;
    for (let i = 1; i <= 7; i++) dealDamage(A, B, 1, { attack: 100 + i, crit: false });
    const exeHigh = procs(A, 0), bolts = procs(A, 1);
    B.hp = B.maxHp * 0.2; dealDamage(A, B, 1, { attack: 200, crit: false }); const exeLow = procs(A, 0);
    dealDamage(A, B, 2, { skill: true }); const boltSkill = procs(A, 1);
    ok('15b', 'Kết liễu chỉ khi mục tiêu dưới 30% máu; sét chỉ ở đòn đánh thứ 3, 6… (kỹ năng / sát thương phụ không đếm)', exeHigh === 0 && exeLow === 1 && bolts === 2 && boltSkill === 2, { exeHigh, exeLow, bolts, boltSkill });
    nextRound();
    // giải khống chế 1 lần, Bất Diệt 1 lần
    ({ A, B } = setup(['huyen_linh_phap_bao', 'bat_diet_than_giap']));
    const st1 = applyStun(A, 1.5, 'stun', B); A.ccImmune = 0; const st2 = applyStun(A, 1.5, 'stun', B);
    dealDamage(B, A, 0, { flat: A.maxHp * 5, type: 'true', attack: 1, crit: false }); const alive1 = A.alive && A.hp >= 1;
    A.fx.setShield(0); dealDamage(B, A, 0, { flat: A.maxHp * 5, type: 'true', attack: 2, crit: false }); const alive2 = A.alive;
    ok('15c', 'Giải khống chế chỉ lần đầu; Bất Diệt Thần Giáp giữ 1 máu đúng 1 lần mỗi trận', st1 === false && st2 === true && alive1 && !alive2, { st1, st2, alive1, alive2 });
    nextRound();
    // vòng lặp: 2 bên đều phản đòn → mỗi đòn thật chỉ phản 1 lần, không phản lại phản đòn
    ({ A, B } = setup(['phan_kich_chi_giap'], ['phan_kich_chi_giap']));
    A.hp = A.maxHp = B.hp = B.maxHp = 99999;
    const d0 = CombatAudit.artDepthBlocked || 0;
    for (let i = 1; i <= 10; i++) dealDamage(B, A, 1, { attack: 300 + i, crit: false });
    const reflA = procs(A), reflB = procs(B);
    ok(16, 'Không có vòng lặp hiệu ứng vô hạn: 2 bên cùng phản đòn – 10 đòn thật → A phản 10 lần, B không phản lại phản đòn, độ sâu ≤ ' + ArtifactPassives.MAX_DEPTH,
      reflA === 10 && reflB === 0 && ArtifactPassives.depth === 0 && ArtifactPassives.maxDepthSeen <= ArtifactPassives.MAX_DEPTH && (CombatAudit.artDepthBlocked || 0) === d0, { reflA, reflB, maxDepth: ArtifactPassives.maxDepthSeen });
    nextRound();
    // trận đầy đủ: nhiều nội tại cùng lúc, phản đòn 2 phía, kết thúc bình thường
    const r = CombatTestRunner.run({ allies: [['thietve', 2, 3, 3, ['phan_kich_chi_giap', 'tu_linh_bao_giap', 'kim_cang_ho_giap']], ['hoa', 2, 3, 1, ['van_phap_linh_tinh', 'ngu_hanh_phap_an', 'hoa_linh_ho_giap']], ['linhy', 2, 4, 1, ['thanh_moc_phap_chau', 'sinh_menh_linh_chau']]],
      enemies: [['mabinh', 2, 3, 4, ['phan_kich_chi_giap', 'huyet_kiem']], ['kiemdong', 2, 4, 4, ['phong_anh_kiem', 'thien_sat_kiem', 'tru_tien_kiem']], ['linhcung', 2, 3, 6, ['phong_loi_than_cung', 'lien_kich_thu_sao', 'thien_menh_thu_sao']]], seed: 99, keepState: true });
    const kinds = Object.keys(combatLog.artByKind || {});
    ok('16b', 'Trận nhiều nội tại (phản đòn 2 phía, hồi, khiên, thiêu, cộng dồn tốc đánh / chí mạng): kết thúc bình thường, không NaN, cộng dồn không vượt giới hạn',
      r.result && r.result !== 'draw' && !r.anomalies.length && r.allies.concat(r.enemies).every(u => u.maxAtkMul <= 4.5) && ArtifactPassives.depth === 0, { result: r.result, time: r.time, kinds: kinds.length, anomalies: r.anomalies.slice(0, 3) });
    nextRound();
    return out;
  }
};
if (window.__vkkt) window.__vkkt.EquipmentTestRunner = EquipmentTestRunner;
