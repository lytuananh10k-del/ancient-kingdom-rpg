// Vạn Kiếm Kỳ Trận – Dữ liệu kỹ năng (V1.5). Mỗi mục chạy bằng SkillExecutor (js/combat/skill-executor.js).
// type: strike | multi | projectile | volley | line | area | zone | dash | summon | support
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
    ally: [{ kind: 'buff', stat: 'def', add: 35, dur: 5, label: '+35 giáp' }, { kind: 'buff', stat: 'dmgTaken', mul: 0.85, dur: 5, label: '−15% sát thương nhận' }],
    desc: 'Dựng thiết bích: +35 giáp và giảm 15% sát thương nhận vào trong 5 giây, chấn 80% công lên địch trong 3 m.' },
  mocLinh: { name: 'Mộc Linh Hồi Xuân', type: 'support', target: 'self', ready: 'allyHurt', color: 'wood', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    ally: [{ kind: 'heal', pct: 0.25, atk: 1.2, targets: 'lowest', count: 1 }, { kind: 'hot', pct: 0.15, dur: 3, targets: 'lowest', count: 1 }],
    desc: 'Hồi cho đồng minh yếu nhất 25% máu tối đa của Thanh Mộc + 120% công, rồi hồi thêm 15% trong 3 giây.' },
  huyetChien: { name: 'Huyết Chiến', type: 'support', target: 'self', color: 'blood', anim: 'HeavyAttack', timing: { windup: 0.2, impact: 0.3, end: 0.6 },
    ally: [{ kind: 'selfDamage', pct: 0.12 }, { kind: 'buff', stat: 'atk', mul: 1.4, dur: 5, label: '+40% công' }, { kind: 'buff', stat: 'aspd', mul: 1.3, dur: 5, label: '+30% tốc đánh' }, { kind: 'buff', stat: 'ls', add: 0.2, dur: 5, label: '+20% hút máu' }],
    desc: 'Đốt 12% máu hiện tại để nhận +40% công, +30% tốc đánh, +20% hút máu trong 5 giây. Nội tại: máu càng thấp công càng cao (tới +60%).' },
  lienChau: { name: 'Liên Châu Tiễn', type: 'projectile', count: 3, gap: 0.14, speed: 28, size: 0.32, target: 'nearest', color: 'arrow', timing: { windup: 0.25, impact: 0.35, end: 0.8 },
    effects: [{ kind: 'damage', mult: 1.1, pen: 0.25 }],
    desc: 'Bắn liền 3 mũi tên vào mục tiêu, mỗi mũi 110% công và bỏ qua 25% giáp.' },
  // ---- Bậc 2
  lienTram: { name: 'Thanh Phong Liên Trảm', type: 'multi', hits: 4, gap: 0.14, target: 'nearest', color: 'wood', anim: 'Attack02', timing: { windup: 0.2, impact: 0.28, end: 0.95 },
    effects: [{ kind: 'damage', mult: 0.75, pen: 0.2 }],
    desc: 'Chém liên hoàn 4 nhát vào mục tiêu (đổi sang kẻ gần nhất nếu mục tiêu ngã), mỗi nhát 75% công, bỏ qua 20% giáp.' },
  hanBang: { name: 'Hàn Băng Tiễn', type: 'projectile', count: 1, radius: 2.2, speed: 16, size: 0.6, target: 'densest', color: 'ice', timing: { windup: 0.35, impact: 0.45, end: 0.9 },
    effects: [{ kind: 'damage', mult: 1.8 }, { kind: 'slow', amount: 0.4, dur: 3 }],
    desc: 'Phóng băng tiễn vào vùng địch đông nhất: 180% công trong bán kính 2,2 m, làm chậm 40% trong 3 giây.' },
  huyetPhe: { name: 'Huyết Phệ', type: 'strike', target: 'nearest', color: 'blood', anim: 'Attack03', timing: { windup: 0.25, impact: 0.35, end: 0.75 },
    effects: [{ kind: 'damage', mult: 2.2, lifesteal: 1.0 }],
    desc: 'Cắn xé mục tiêu: 220% công, hồi máu bằng 100% sát thương gây ra.' },
  loiThuong: { name: 'Lôi Thương Xuyên Vân', type: 'line', length: 9, width: 1.3, speed: 22, target: 'line', color: 'thunder', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.38, end: 0.85 },
    effects: [{ kind: 'damage', mult: 1.8, pen: 0.2 }, { kind: 'stun', dur: 0.5 }],
    desc: 'Đâm lôi thương xuyên hàng địch dài 9 m: 180% công, bỏ qua 20% giáp, choáng 0,5 giây.' },
  dieuThu: { name: 'Diệu Thủ Hồi Xuân', type: 'support', target: 'self', ready: 'allyHurt', color: 'light', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    ally: [{ kind: 'heal', pct: 0.2, atk: 1.0, targets: 'lowest', count: 2 }, { kind: 'buff', stat: 'dmgTaken', mul: 0.8, dur: 3, targets: 'lowest', count: 2, label: '−20% sát thương nhận' }],
    desc: 'Hồi cho 2 đồng minh yếu nhất 20% máu tối đa của Linh Y + 100% công, và giảm 20% sát thương họ nhận trong 3 giây.' },
  // ---- Bậc 3
  nguKiem: { name: 'Ngự Kiếm Thuật', type: 'summon', count: 5, dur: 6, interval: 0.6, target: 'nearest', color: 'sword', timing: { windup: 0.3, impact: 0.45, end: 0.9 },
    effects: [{ kind: 'damage', mult: 0.45 }],
    desc: 'Triệu hồi 5 phi kiếm (+1 mỗi sao) bay quanh mình trong 6 giây; cứ 0,6 giây một thanh lao vào kẻ địch gần nhất gây 45% công.' },
  cuuViem: { name: 'Cửu Viêm Hỏa Trận', type: 'zone', radius: 3, dur: 4, tick: 0.5, target: 'densest', color: 'fire', timing: { windup: 0.35, impact: 0.5, end: 0.95 },
    effects: [{ kind: 'damage', mult: 0.3 }],
    desc: 'Lập hỏa trận 3 m tại vùng địch đông nhất trong 4 giây: cứ 0,5 giây gây 30% công lên mọi kẻ địch đứng trong (tối đa 240%).' },
  kimCang: { name: 'Kim Cang Bất Hoại', type: 'support', target: 'self', ready: 'enemyNear', readyRange: 4, color: 'earth', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.4, end: 0.8 },
    ally: [{ kind: 'buff', stat: 'dmgTaken', mul: 0.65, dur: 4, targets: 'near', radius: 3.5, label: '−35% sát thương nhận' }, { kind: 'shield', pct: 0.12, dur: 4 }],
    desc: 'Bản thân và đồng minh trong 3,5 m giảm 35% sát thương nhận vào trong 4 giây; bản thân nhận lá chắn 12% máu tối đa.' },
  anhTap: { name: 'Ảnh Tập', type: 'dash', target: 'backline', color: 'shadow', anim: 'Attack03', timing: { windup: 0.15, impact: 0.32, end: 0.7 },
    effects: [{ kind: 'damage', mult: 2.6, pen: 0.4 }],
    desc: 'Ẩn vào bóng tối, xuất hiện sau lưng kẻ địch ở tuyến sau: 260% công, bỏ qua 40% giáp.' },
  huyenBang: { name: 'Huyền Băng Phong Ấn', type: 'area', radius: 2.8, target: 'densest', color: 'ice', timing: { windup: 0.4, impact: 0.55, end: 1.0 },
    effects: [{ kind: 'damage', mult: 1.5 }, { kind: 'freeze', dur: 1.6 }],
    desc: 'Đóng băng vùng địch đông nhất bán kính 2,8 m: 150% công và đóng băng 1,6 giây (đỡ đòn kháng 40%).' },
  // ---- Bậc 4
  batDiet: { name: 'Bất Diệt Kim Thân', type: 'area', center: 'self', radius: 3.2, target: 'nearest', ready: 'hurtOrNear', color: 'earth', anim: 'HeavyAttack', timing: { windup: 0.3, impact: 0.42, end: 0.85 },
    effects: [{ kind: 'damage', mult: 1.2, knock: 2 }],
    ally: [{ kind: 'heal', pct: 0.15 }, { kind: 'hot', pct: 0.2, dur: 3 }, { kind: 'buff', stat: 'dmgTaken', mul: 0.7, dur: 4, label: '−30% sát thương nhận' }],
    desc: 'Chấn 120% công và hất lùi địch trong 3,2 m; hồi ngay 15% máu tối đa, thêm 20% trong 3 giây và giảm 30% sát thương nhận trong 4 giây. Nội tại: hồi 1% máu mỗi giây.' },
  uMinhPhe: { name: 'U Minh Phệ Hồn', type: 'volley', count: 4, gap: 0.1, speed: 12, size: 0.55, target: 'weakest', color: 'nether', timing: { windup: 0.35, impact: 0.5, end: 1.0 },
    effects: [{ kind: 'damage', mult: 1.4, lifesteal: 0.5 }],
    desc: 'Phóng 4 u hồn hút sinh lực vào các kẻ địch yếu nhất: mỗi hồn 140% công, hồi cho bản thân 50% sát thương gây ra.' },
  // ---- Bậc 5
  cuuThien: { name: 'Cửu Thiên Thánh Trận', type: 'area', radius: 4, target: 'densest', color: 'light', circle: 2.4, timing: { windup: 0.5, impact: 0.8, end: 1.4 },
    effects: [{ kind: 'damage', mult: 2.2 }, { kind: 'slow', amount: 0.3, dur: 3 }],
    ally: [{ kind: 'heal', pct: 0.2, targets: 'all' }, { kind: 'buff', stat: 'atk', mul: 1.2, dur: 4, targets: 'all', label: '+20% công' }],
    desc: 'Giáng thánh trận bán kính 4 m vào vùng địch đông nhất: 220% công, làm chậm 30% trong 3 giây; mọi đồng minh hồi 20% máu tối đa của Thần Nữ và +20% công trong 4 giây.' },
  honDon: { name: 'Hỗn Độn Diệt Thế', type: 'dash', radius: 4.5, target: 'densest', color: 'chaos', circle: 2.6, timing: { windup: 0.4, impact: 0.75, end: 1.3 },
    effects: [{ kind: 'damage', mult: 3.4, pen: 0.5, lifesteal: 0.25, heavy: true }, { kind: 'debuff', stat: 'def', mul: 0.6, dur: 4, label: '−40% giáp' }, { kind: 'stun', dur: 1 }],
    desc: 'Lao vào giữa vùng địch đông nhất rồi nổ hỗn độn bán kính 4,5 m: 340% công, bỏ qua 50% giáp, giảm 40% giáp trong 4 giây, choáng 1 giây; hồi 25% sát thương gây ra.' }
};
for (const id in SKILL_SPECS) SKILLS[id] = makeDataSkill(id, SKILL_SPECS[id]);

/** Mô tả loại / mục tiêu / hệ số cho các kỹ năng viết tay (js/13-skills.js) – dùng cho bảng thông tin & bảng cân bằng. */
const SKILL_META = {
  vanKiem: { type: 'Triệu hồi phi kiếm + diện rộng', target: 'Vùng địch đông nhất', mult: 10 * 0.32 + 3.0, duration: 5.1, effects: ['damage', 'knock', 'stun'] },
  cuuThienLoi: { type: 'Diện rộng (6 tia sét)', target: 'Vùng địch đông nhất', mult: 6 * 1.8, duration: 1.0, effects: ['damage', 'stun'] },
  thienLoi: { type: 'Diện rộng (3 tia sét)', target: 'Vùng địch đông nhất', mult: 3 * 1.6, duration: 0.8, effects: ['damage', 'stun'] },
  hoaCau: { type: 'Phóng đạn diện rộng', target: 'Vùng địch đông nhất', mult: 1.5, duration: 3, effects: ['damage', 'dot'] },
  hoaPhuong: { type: 'Phóng đạn diện rộng', target: 'Vùng địch đông nhất', mult: 2.0, duration: 3, effects: ['damage', 'dot'] },
  songPhuong: { type: 'Phóng 2 đạn diện rộng', target: 'Hai cụm địch', mult: 5.2, duration: 3, effects: ['damage', 'dot'] },
  hoThe: { type: 'Hỗ trợ – lá chắn', target: '3 đồng minh yếu nhất', mult: 0, duration: 6, effects: ['shield'] },
  kimCuong: { type: 'Hỗ trợ – lá chắn', target: '5 đồng minh yếu nhất', mult: 0, duration: 6, effects: ['shield'] },
  voCucKiem: { type: 'Xuyên tuyến (2 đạo)', target: 'Hướng trúng nhiều nhất', mult: 2 * 2.4, duration: 0, effects: ['damage', 'pen'] },
  kiemKhi: { type: 'Xuyên tuyến', target: 'Hướng trúng nhiều nhất', mult: 1.9, duration: 0, effects: ['damage'] },
  huyetAnh: { type: 'Đột kích', target: 'Kẻ yếu / tuyến sau', mult: 2.1, duration: 0, effects: ['damage'] },
  uMinh: { type: 'Phóng 3 đạn truy đuổi', target: '3 kẻ yếu nhất', mult: 3 * 1.2, duration: 0, effects: ['damage'] },
  phaDia: { type: 'Diện rộng quanh mình', target: 'Bản thân', mult: 1.6, duration: 0, effects: ['damage', 'knock'] }
};
for (const id in SKILL_META) if (SKILLS[id]) SKILLS[id].meta = SKILL_META[id];
