// Vạn Kiếm Kỳ Trận – Dữ liệu kỹ năng (V1.5). Mỗi mục chạy bằng SkillExecutor (js/combat/skill-executor.js).
// type: strike | multi | projectile | volley | line | area | zone | dash | summon | chain | rift | support
// damage.type: physical | magic | true (mặc định theo vai trò: pháp sư / hỗ trợ → phép, còn lại → vật lý – ROLE_STATS)
// target: nearest | densest | weakest | line | backline | self; ready (tuỳ chọn): allyHurt | enemyNear | hurtOrNear
// effects (lên địch trúng): damage{mult, pen, knock, lifesteal} · dot{mult, dur, tick} · slow{amount, dur} · stun{dur} · freeze{dur} · debuff{stat, mul|add, dur}
// ally (lên đồng minh / bản thân): heal{pct, atk, targets, count} · hot{pct, dur} · shield{pct, dur} · buff{stat, mul|add, dur} · selfDamage{pct}
//   targets: self | lowest | near | all. mult = hệ số công; pct = tỉ lệ máu tối đa của người thi triển. Sức mạnh kỹ năng nhân STAR.skill theo sao.
// Script thường (không phải module): nạp sau js/combat/skill-executor.js.
'use strict';

const SKILL_SPECS = {
  // ---- Bậc 1
  nhatKiem: { name: 'Nhất Kiếm Đoạn Thủy', type: 'strike', target: 'nearest', color: 'sword', anim: 'Attack03', timing: { windup: 0.25, impact: 0.32, end: 0.7 },
    effects: [{ kind: 'damage', mult: 2.6, pen: 0.3 }],
    desc: 'Chém một nhát dứt khoát vào mục tiêu: 260% công, bỏ qua 30% giáp.' },
  thietBich: { name: 'Thiết Bích', type: 'area', center: 'self', radius: 3.0, target: 'nearest', ready: 'enemyNear', color: 'earth', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.4, end: 0.8 },
    effects: [{ kind: 'damage', mult: 0.8 }],
    ally: [{ kind: 'buff', stat: 'def', add: 35, dur: 5, label: '+35 giáp' }, { kind: 'buff', stat: 'dmgTaken', mul: 0.85, dur: 5, label: '−15% sát thương nhận' }, { kind: 'glow', dur: 5 }],
    desc: 'Dựng thiết bích: lớp giáp phát sáng, +35 giáp và giảm 15% sát thương nhận vào trong 5 giây, chấn 80% công (vật lý) lên địch trong 3 m.' },
  mocLinh: { name: 'Mộc Linh Hồi Xuân', type: 'support', target: 'self', ready: 'allyHurt', color: 'wood', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    ally: [{ kind: 'heal', pct: 0.2, atk: 1.0, targets: 'lowest', count: 1 }, { kind: 'hot', pct: 0.1, dur: 3, targets: 'lowest', count: 1 }],
    desc: 'Lá xanh hồi xuân: hồi cho đồng minh yếu nhất 20% máu tối đa của Thanh Mộc + 100% công, rồi hồi thêm 10% trong 3 giây.' },
  huyetChien: { name: 'Huyết Chiến', type: 'support', target: 'self', color: 'blood', anim: 'HeavyAttack', timing: { windup: 0.2, impact: 0.3, end: 0.6 },
    ally: [{ kind: 'selfDamage', pct: 0.12 }, { kind: 'buff', stat: 'atk', mul: 1.4, dur: 5, label: '+40% công' }, { kind: 'buff', stat: 'aspd', mul: 1.3, dur: 5, label: '+30% tốc đánh' }, { kind: 'buff', stat: 'ls', add: 0.2, dur: 5, label: '+20% hút máu' }],
    desc: 'Đốt 12% máu hiện tại để nhận +40% công, +30% tốc đánh, +20% hút máu trong 5 giây. Nội tại: máu càng thấp công càng cao (tới +60%).' },
  lienChau: { name: 'Liên Châu Tiễn', type: 'projectile', count: 3, gap: 0.14, speed: 28, size: 0.32, target: 'nearest', color: 'arrow', timing: { windup: 0.25, impact: 0.35, end: 0.8 },
    effects: [{ kind: 'damage', mult: 1.1, pen: 0.25 }],
    desc: 'Bắn liền 3 mũi tên vào mục tiêu, mỗi mũi 110% công và bỏ qua 25% giáp.' },
  // ---- Bậc 2
  lienTram: { name: 'Thanh Phong Liên Trảm', type: 'multi', hits: 4, gap: 0.14, lastMult: 1.6, target: 'nearest', color: 'wood', anim: 'Attack02', timing: { windup: 0.2, impact: 0.28, end: 0.95 },
    effects: [{ kind: 'damage', mult: 0.7, pen: 0.2 }],
    desc: 'Chém liên hoàn 4 nhát vào mục tiêu (đổi sang kẻ gần nhất nếu mục tiêu ngã): 3 nhát 70% công, nhát cuối tăng cường 112% công; bỏ qua 20% giáp.' },
  hanBang: { name: 'Hàn Băng Tiễn', type: 'projectile', count: 1, radius: 2.2, speed: 16, size: 0.6, target: 'densest', color: 'ice', timing: { windup: 0.35, impact: 0.45, end: 0.9 },
    effects: [{ kind: 'damage', mult: 2.1 }, { kind: 'slow', amount: 0.4, dur: 3 }],
    desc: 'Phóng băng tiễn vào vùng địch đông nhất: 210% công (phép) trong bán kính 2,2 m, làm chậm 40% trong 3 giây.' },
  huyetPhe: { name: 'Huyết Phệ', type: 'strike', target: 'nearest', color: 'blood', anim: 'Attack03', timing: { windup: 0.25, impact: 0.35, end: 0.75 },
    effects: [{ kind: 'damage', mult: 2.2, lifesteal: 0.7 }],
    desc: 'Huyết ảnh cắn xé mục tiêu: 220% công (vật lý), hồi máu bằng 70% sát thương THỰC gây ra (sau giáp, lá chắn).' },
  loiThuong: { name: 'Lôi Thương Xuyên Vân', type: 'line', length: 9, width: 1.3, speed: 22, target: 'line', color: 'thunder', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.38, end: 0.85 },
    effects: [{ kind: 'damage', mult: 1.8, pen: 0.2 }, { kind: 'stun', dur: 0.5 }],
    desc: 'Đâm lôi thương xuyên hàng địch dài 9 m: 180% công, bỏ qua 20% giáp, choáng 0,5 giây.' },
  dieuThu: { name: 'Diệu Thủ Hồi Xuân', type: 'support', target: 'self', ready: 'allyNeed', color: 'light', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    ally: [{ kind: 'cleanse', n: 1, targets: 'needy', count: 2 }, { kind: 'heal', pct: 0.15, atk: 0.8, targets: 'lowest', count: 2 }, { kind: 'buff', stat: 'dmgTaken', mul: 0.85, dur: 3, targets: 'lowest', count: 2, label: '−15% sát thương nhận' }],
    desc: 'Linh đan diệu thủ: gỡ 1 hiệu ứng bất lợi thanh tẩy được (choáng, đóng băng, chậm, thiêu, giảm giáp…) cho 2 đồng minh cần nhất, hồi cho 2 đồng minh yếu nhất 15% máu tối đa của Linh Y + 80% công và giảm 15% sát thương họ nhận trong 3 giây.' },
  // ---- Bậc 3
  nguKiem: { name: 'Ngự Kiếm Thuật', type: 'summon', count: 5, dur: 6, interval: 0.6, speed: 18, target: 'nearest', color: 'sword', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    effects: [{ kind: 'damage', mult: 0.45 }],
    desc: 'Triệu hồi 5 phi kiếm (+1 mỗi sao) bay quanh mình trong 6 giây; cứ 0,6 giây một thanh truy đuổi mục tiêu, va chạm gây 45% công (phép) rồi bay về; mục tiêu ngã thì kiếm đổi sang kẻ gần nhất.' },
  cuuViem: { name: 'Cửu Viêm Hỏa Trận', type: 'zone', radius: 3, dur: 4, tick: 0.5, target: 'densest', color: 'fire', timing: { windup: 0.35, impact: 0.5, end: 0.95 },
    effects: [{ kind: 'damage', mult: 0.36 }],
    desc: 'Lập hỏa trận 3 m tại vùng địch đông nhất trong 4 giây: cứ 0,5 giây gây 36% công (phép) lên mọi kẻ địch đứng trong (tối đa 288%); vẫn cháy nếu người thi triển ngã.' },
  kimCang: { name: 'Kim Cang Bất Hoại', type: 'support', target: 'self', ready: 'enemyNear', readyRange: 4, color: 'earth', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.4, end: 0.8 },
    ally: [{ kind: 'buff', stat: 'dmgTaken', mul: 0.65, dur: 4, targets: 'near', radius: 3.5, label: '−35% sát thương nhận' }, { kind: 'shield', pct: 0.12, dur: 4 }],
    desc: 'Bản thân và đồng minh trong 3,5 m giảm 35% sát thương nhận vào trong 4 giây; bản thân nhận lá chắn 12% máu tối đa.' },
  anhTap: { name: 'Ảnh Tập', type: 'dash', target: 'backline', color: 'shadow', anim: 'Attack03', timing: { windup: 0.15, impact: 0.32, end: 0.7 },
    effects: [{ kind: 'damage', mult: 2.6, pen: 0.4 }],
    desc: 'Ẩn vào bóng tối, xuất hiện sau lưng kẻ địch ở tuyến sau: 260% công, bỏ qua 40% giáp.' },
  huyenBang: { name: 'Huyền Băng Phong Ấn', type: 'area', radius: 2.8, target: 'densest', color: 'ice', timing: { windup: 0.4, impact: 0.55, end: 1.0 },
    effects: [{ kind: 'damage', mult: 1.8 }, { kind: 'freeze', dur: 1.6 }],
    desc: 'Đóng băng vùng địch đông nhất bán kính 2,8 m: 180% công (phép) và đóng băng 1,6 giây (đỡ đòn kháng 40%).' },
  // ---- Bậc 4
  batDiet: { name: 'Bất Diệt Kim Thân', type: 'area', center: 'self', radius: 3.2, target: 'nearest', ready: 'hurtOrNear', color: 'earth', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.42, end: 0.85 },
    effects: [{ kind: 'damage', mult: 1.2, knock: 2 }],
    ally: [{ kind: 'heal', pct: 0.1 }, { kind: 'hot', pct: 0.12, dur: 3 }, { kind: 'buff', stat: 'dmgTaken', mul: 0.7, dur: 4, label: '−30% sát thương nhận' }],
    desc: 'Chấn 120% công và hất lùi địch trong 3,2 m; hồi ngay 10% máu tối đa, thêm 12% trong 3 giây và giảm 30% sát thương nhận trong 4 giây. Nội tại: hồi 0,6% máu mỗi giây.' },
  uMinhPhe: { name: 'U Minh Phệ Hồn', type: 'volley', count: 4, gap: 0.1, speed: 12, size: 0.55, target: 'weakest', color: 'nether', timing: { windup: 0.35, impact: 0.5, end: 1.0 },
    effects: [{ kind: 'damage', mult: 1.4, lifesteal: 0.35 }],
    desc: 'Phóng 4 u hồn hút sinh lực vào các kẻ địch yếu nhất: mỗi hồn 140% công (phép), hồi cho bản thân 35% sát thương thực gây ra.' },
  // ---- Bậc 5
  cuuThien: { name: 'Cửu Thiên Thánh Trận', type: 'area', radius: 4, target: 'densest', color: 'light', circle: 2.4, timing: { windup: 0.5, impact: 0.8, end: 1.4 },
    effects: [{ kind: 'damage', mult: 2.2 }, { kind: 'slow', amount: 0.3, dur: 3 }],
    ally: [{ kind: 'heal', pct: 0.1, targets: 'all' }, { kind: 'buff', stat: 'atk', mul: 1.2, dur: 4, targets: 'all', label: '+20% công' }],
    desc: 'Giáng thánh trận bán kính 4 m vào vùng địch đông nhất: 220% công (phép), làm chậm 30% trong 3 giây; mọi đồng minh hồi 10% máu tối đa của Thần Nữ và +20% công trong 4 giây.' },
  honDon: { name: 'Hỗn Độn Diệt Thế', type: 'rift', radius: 4, telegraph: 0.8, pulses: 3, pulseGap: 0.4, target: 'densest', color: 'chaos', circle: 2.6, anim: 'UltimateCast', timing: { windup: 0.4, impact: 0.85, end: 2.0 },
    effects: [{ kind: 'damage', mult: 1.05, pen: 0.3, lifesteal: 0.2, heavy: true }, { kind: 'debuff', stat: 'def', mul: 0.6, dur: 4, label: '−40% giáp' }, { kind: 'debuff', stat: 'mr', mul: 0.6, dur: 4, label: '−40% kháng phép' }, { kind: 'stun', dur: 0.8, first: true }],
    desc: 'Báo trước vùng hỗn độn bán kính 4 m tại vùng địch đông nhất (0,8 giây để chạy ra), rồi lao vào tâm nổ 3 đợt: mỗi đợt 105% công (vật lý, bỏ qua 30% giáp), giảm 40% giáp và kháng phép trong 4 giây; đợt đầu choáng 0,8 giây; hồi 20% sát thương gây ra.' },
  // ---- Thiên Lôi Đạo Nhân (bậc 4): đổi từ 6 tia sét rơi ngẫu nhiên sang sét liên hoàn (tuần 3)
  cuuThienLoi: { name: 'Cửu Thiên Lôi Kiếp', type: 'chain', jumps: 6, jumpRange: 5.5, gap: 0.12, falloff: 0.9, radius: 2.6, target: 'densest', color: 'thunder', timing: { windup: 0.35, impact: 0.55, end: 1.0 },
    effects: [{ kind: 'damage', mult: 2.4 }, { kind: 'stun', dur: 0.6 }],
    desc: 'Giáng sét vào vùng địch đông nhất rồi nhảy liên hoàn tới tối đa 6 kẻ địch khác (mỗi kẻ trúng 1 lần, tầm nhảy 5,5 m): 240% công (phép), giảm 10% mỗi lần nhảy, choáng 0,6 giây.' }
};
for (const id in SKILL_SPECS) SKILLS[id] = makeDataSkill(id, SKILL_SPECS[id]);

/** Mô tả loại / mục tiêu / hệ số cho các kỹ năng viết tay (js/13-skills.js) – dùng cho bảng thông tin & bảng cân bằng. */
const SKILL_META = {
  vanKiem: { type: 'Triệu hồi phi kiếm + diện rộng', target: 'Vùng địch đông nhất', mult: 10 * 0.32 + 3.0, duration: 5.1, effects: ['damage', 'knock', 'stun'] },
  thienLoi: { type: 'Diện rộng (3 tia sét)', target: 'Vùng địch đông nhất', mult: 3 * 1.6, duration: 0.8, effects: ['damage', 'stun'] },
  hoaCau: { type: 'Phóng đạn diện rộng', target: 'Vùng địch đông nhất', mult: 1.8, duration: 3, effects: ['damage', 'dot'] },
  hoaPhuong: { type: 'Phóng đạn diện rộng', target: 'Vùng địch đông nhất', mult: 2.0, duration: 3, effects: ['damage', 'dot'] },
  songPhuong: { type: 'Phóng 2 đạn diện rộng', target: 'Hai cụm địch', mult: 5.2, duration: 3, effects: ['damage', 'dot'] },
  hoThe: { type: 'Hỗ trợ – lá chắn', target: '3 đồng minh yếu nhất', mult: 0, duration: 6, effects: ['shield'] },
  kimCuong: { type: 'Hỗ trợ – lá chắn', target: '5 đồng minh yếu nhất', mult: 0, duration: 6, effects: ['shield'] },
  voCucKiem: { type: 'Xuyên tuyến (2 đạo, giảm 15% mỗi mục tiêu xuyên qua, tối thiểu 55%)', target: 'Hướng trúng nhiều nhất', mult: 2 * 2.4, duration: 0, effects: ['damage', 'pen'] },
  kiemKhi: { type: 'Xuyên tuyến', target: 'Hướng trúng nhiều nhất', mult: 1.9, duration: 0, effects: ['damage'] },
  huyetAnh: { type: 'Đột kích', target: 'Kẻ yếu / tuyến sau', mult: 2.1, duration: 0, effects: ['damage'] },
  uMinh: { type: 'Phóng 3 đạn truy đuổi', target: '3 kẻ yếu nhất', mult: 3 * 1.2, duration: 0, effects: ['damage'] },
  phaDia: { type: 'Diện rộng quanh mình', target: 'Bản thân', mult: 1.6, duration: 0, effects: ['damage', 'knock'] }
};
for (const id in SKILL_META) if (SKILLS[id]) SKILLS[id].meta = SKILL_META[id];
