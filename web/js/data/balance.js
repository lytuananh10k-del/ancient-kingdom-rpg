// Vạn Kiếm Kỳ Trận – Cấu hình cân bằng & công thức sát thương (V1.5 tuần 3). Nạp trước js/data/champions.js.
// Mọi hằng số của DamageCalculator nằm ở đây – chỉnh ở đây, không sửa trong mã chiến đấu.
'use strict';

/** Công thức:
 *   Vật lý:  Damage = Raw × K / (K + Giáp)        Phép:  Damage = Raw × K / (K + Kháng phép)        Chuẩn: bỏ qua giáp & kháng phép
 *   Phòng thủ âm (bị giảm giáp / kháng phép quá 0): hệ số = 2 − K / (K − giá trị) → tăng dần, tối đa ×maxAmp, không bao giờ chia cho 0.
 *   Raw = (công × hệ số) × dao động ±variance × chí mạng; kỹ năng × sức mạnh phép thuật / 100 (AP – gồm sao, tộc/hệ, trang bị).
 *   Thứ tự: chỉ số gốc → sao → tộc/hệ → buff tạm thời → sát thương thô → phòng thủ → giảm sát thương nhận → lá chắn → máu. */
const DAMAGE = {
  K: 100, maxAmp: 2, variance: 0.05,
  types: { physical: 'Vật lý', magic: 'Phép', true: 'Chuẩn' },
  basicType: 'physical', dotType: 'magic',
  // năng lượng khi bị đánh: min(onHitMax, sát thương × onHitPct + onHitBase) (tuần 3: 12 / 4% → 8 / 3% – đỡ đòn bị vây tung chiêu quá dày)
  mana: { onAttack: 10, onDodge: 10, onHitBase: 2, onHitPct: 0.03, onHitMax: 8 },
  heavyMult: 1.6, heavyRangedMult: 1.5,
  heavyKnock: 2   // đòn nặng (1/4 đòn thường) của tướng đỡ đòn hất lùi; tướng khác không (tuần 3: hất lùi liên tục làm đấu sĩ mất 10–15% thời gian)
};
/** Hệ số sát thương nhận theo giá trị phòng thủ (giáp hoặc kháng phép, có thể âm). */
function defenseFactor(v) {
  const K = DAMAGE.K;
  if (!Number.isFinite(v)) return 1;
  return v >= 0 ? K / (K + v) : Math.min(DAMAGE.maxAmp, 2 - K / (K - v));
}
/** Mặc định theo vai trò (dùng khi dữ liệu tướng không ghi riêng). skillType: loại sát thương kỹ năng mặc định. */
const ROLE_STATS = {
  tank: { skillType: 'physical' }, fighter: { skillType: 'physical' }, assassin: { skillType: 'physical' },
  mage: { skillType: 'magic' }, marksman: { skillType: 'physical' }, support: { skillType: 'magic' }
};
/** Trận đấu: giới hạn thời gian & xử lý hoà. Hết giờ mà hai bên còn người → HOÀ, người chơi bị tính như thua (giống TFT). */
//  Từ giây overtimeAt: "linh khí hỗn loạn" – sát thương +overtimePerSec mỗi giây, mọi lượng hồi máu −overtimeHealCut (chống bế tắc khi hai bên đều có
//  đỡ đòn hồi máu ★3). Tuần 3 tăng từ +6%/s (thử nghiệm: 20% trận ngẫu nhiên hoà vì đỡ đòn ★3 hồi máu nhanh hơn sát thương nhận).
const BATTLE_RULES = { limit: 60, overtimeAt: 40, overtimePerSec: 0.12, overtimeHealCut: 0.5, drawCountsAsLoss: true };
const overtimeHealMul = () => (battle.phase === 'fight' && battle.time > BATTLE_RULES.overtimeAt ? 1 - BATTLE_RULES.overtimeHealCut : 1);
