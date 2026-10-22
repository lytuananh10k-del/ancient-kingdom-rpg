// Vạn Kiếm Kỳ Trận – Tộc / hệ (traits). Nạp trước js/14-game.js.
// active: true = có hiệu ứng cộng hưởng (tính trong applyTraits); false = mới có dữ liệu, cộng hưởng làm ở tuần 2 (V1.5 tuần 1 chưa mở rộng).
'use strict';
const TRAITS = {
  kiemtu: { name: 'Kiếm Tu', tiers: [2, 4], color: '#7cc4ff', active: true, desc: ['+20% công', '+50% công, +20% tốc đánh'] },
  phaptu: { name: 'Pháp Tu', tiers: [2, 4], color: '#c9a0ff', active: true, desc: ['Tuyệt kỹ +25%, linh lực đầu +20', 'Tuyệt kỹ +60%, linh lực đầu +40'] },
  hophap: { name: 'Hộ Pháp', tiers: [2, 3], color: '#e9c46a', active: true, desc: ['+30% máu, +20 giáp', '+60% máu, +45 giáp'] },
  matu: { name: 'Ma Tu', tiers: [2, 4], color: '#ff8a7a', active: true, desc: ['Hút máu 20% sát thương gây ra', 'Hút máu 40%, +15% công'] },
  // ---- Hệ mới: chỉ dữ liệu (tuần 2 mới có hiệu ứng)
  dantu: { name: 'Đan Tu', tiers: [2, 3], color: '#a8e07a', active: false, desc: ['(tuần 2) Hồi máu +', '(tuần 2) Hồi máu ++'] },
  xatu: { name: 'Xạ Tu', tiers: [2], color: '#f0d890', active: false, desc: ['(tuần 2) Tầm đánh +'] },
  thuongtu: { name: 'Thương Tu', tiers: [2], color: '#bfe0ff', active: false, desc: ['(tuần 2) Xuyên giáp +'] },
  sattu: { name: 'Sát Tu', tiers: [2], color: '#9a7aff', active: false, desc: ['(tuần 2) Chí mạng +'] },
  thetu: { name: 'Thể Tu', tiers: [2], color: '#ffc070', active: false, desc: ['(tuần 2) Máu & hồi phục +'] }
};
