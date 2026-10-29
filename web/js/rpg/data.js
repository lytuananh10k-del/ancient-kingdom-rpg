// Vạn Kiếm Kỳ Trận – Phiêu Lưu (V2.0): DỮ LIỆU thế giới – tông môn, cảnh giới, kỹ năng, quái, bản đồ, NPC, vật phẩm, nhiệm vụ.
// Chỉ là dữ liệu + hàm tra cứu thuần. Dùng lại: LOOKS / CHAMPIONS (js/data/champions.js) cho ngoại hình nhân vật, NPC, người chơi ảo,
// boss; COMPONENTS / ARTIFACTS / RECIPES (js/data/artifacts.js) cho nguyên liệu và pháp bảo. Script thường (không phải module).
'use strict';

/* ---------- Cân bằng chung (chỉnh ở đây) ---------- */
const RPG_BAL = {
  tvPerDmg: 0.12,         // tu vi nhận theo sát thương gây ra (nhân hệ số chênh cấp) – chỉnh theo tests/rpg-balance.js
  tvKill: 1.2,            // tu vi thưởng khi hạ quái: tvKill × cấp quái
  lcRatio: 1,             // linh căn (điểm tiềm năng) nhận = tu vi nhận × lcRatio
  gravity: 26, jumpV: 10.5, runSpeed: 6.2, flySpeed: 8.5, flyCost: 1.2,   // linh lực / giây khi bay
  maxAlt: 15,             // độ cao bay tối đa so với mặt đất
  combatWindow: 6,        // giây kể từ lần đánh / bị đánh cuối → còn "đang giao chiến"
  respawnMonster: [8, 12], bagSize: 40, linhdanCd: 8
};

/* ---------- Cảnh giới tu luyện (thay "sức mạnh"): ngưỡng tu vi, thưởng chỉ số cơ bản ---------- */
const REALMS = [
  { name: 'Luyện Khí',  tv: 0,          bonus: 0,    color: '#a8c0bb' },
  { name: 'Trúc Cơ',    tv: 3000,       bonus: 0.15, color: '#7fe0a0' },
  { name: 'Kim Đan',    tv: 30000,      bonus: 0.35, color: '#ffd166' },
  { name: 'Nguyên Anh', tv: 200000,     bonus: 0.6,  color: '#7cc4ff' },
  { name: 'Hóa Thần',   tv: 1000000,    bonus: 0.9,  color: '#c9a0ff' },
  { name: 'Luyện Hư',   tv: 5000000,    bonus: 1.3,  color: '#ff9a6a' },
  { name: 'Hợp Thể',    tv: 20000000,   bonus: 1.8,  color: '#ff7a5a' },
  { name: 'Đại Thừa',   tv: 80000000,   bonus: 2.5,  color: '#fff0b0' }
];
/** Cảnh giới + tầng (1–9) theo tu vi. */
function realmOf(tv) {
  let r = 0; while (r + 1 < REALMS.length && tv >= REALMS[r + 1].tv) r++;
  const a = REALMS[r].tv, b = r + 1 < REALMS.length ? REALMS[r + 1].tv : a * 4;
  const frac = clamp((tv - a) / (b - a), 0, 0.9999);
  return { r, layer: Math.min(9, 1 + Math.floor(frac * 9)), frac, next: b, name: REALMS[r].name, color: REALMS[r].color };
}
/** "Cấp hiệu dụng" của người chơi để so với cấp quái (giảm tu vi khi đánh quái quá yếu). */
const effLevel = tv => { const k = realmOf(tv); return [2, 8, 14, 22, 30, 38, 46, 54][k.r] + (k.layer - 1) * 0.8; };

/* ---------- 3 tông môn ---------- */
const SECTS = {
  kiem: { id: 'kiem', name: 'Thanh Vân Kiếm Tông', short: 'Kiếm Tông', home: 'A0', color: '#7cc4ff', glyph: '剑',
    desc: 'Kiếm tu cận chiến – đòn nhanh, kiếm khí xa, ngự kiếm quanh thân. Dễ chơi, sát thương ổn định.',
    base: { hp: 220, mp: 120, atk: 18, def: 2, crit: 0.06 }, looks: ['kiemdong', 'thanhphong', 'ngukiem', 'vocuc', 'anhsat', 'mabinh'],
    master: 'kiemtien', skills: ['kiem_basic', 'kiem_khi', 'kiem_lien', 'kiem_ngu', 'kiem_van'] },
  phap: { id: 'phap', name: 'Đan Hà Pháp Tông', short: 'Pháp Tông', home: 'B0', color: '#ff9a6a', glyph: '法',
    desc: 'Pháp tu đánh xa – hỏa, băng, lôi; có kỹ năng hồi phục. Máu mỏng, linh lực dồi dào, sát thương kỹ năng lớn.',
    base: { hp: 185, mp: 220, atk: 18, def: 1, crit: 0.05 }, looks: ['hoa', 'thanhmoc', 'bangling', 'linhy', 'cuuviem', 'huyenbang'],
    master: 'loiton', skills: ['phap_basic', 'phap_bang', 'phap_hoa', 'phap_moc', 'phap_loi'] },
  vo: { id: 'vo', name: 'Bất Diệt Võ Tông', short: 'Võ Tông', home: 'C0', color: '#ffd166', glyph: '武',
    desc: 'Thể tu – thương / trảo, máu và giáp dày, có khiên và biến thân Kim Thân. Chậm hơn nhưng khó gục.',
    base: { hp: 280, mp: 110, atk: 16, def: 4, crit: 0.05 }, looks: ['thietve', 'huyetma', 'loithuong', 'kimcuong', 'huyengiap', 'mathu'],
    master: 'batdiet', skills: ['vo_basic', 'vo_thuong', 'vo_phadia', 'vo_kimcang', 'vo_kimthan'] }
};
const SECT_KEYS = Object.keys(SECTS);

/* ---------- Kỹ năng người chơi (tên lấy lại từ kỹ năng tướng của bản cờ) ----------
 * kind: melee (combo cận chiến) | bolt (đạn bắn thẳng) | wave (kiếm khí xuyên) | dash (lướt chém) | orbit (phi kiếm quanh thân)
 *       | rain (mưa kiếm vùng) | zone (pháp trận gây sát thương theo thời gian) | heal | strike (sét giáng nhiều mục tiêu)
 *       | slam (dậm đất diện rộng) | shield (khiên + giảm sát thương) | transform (biến thân)
 * mult: hệ số công ở cấp 1, +perLv mỗi cấp. unlock: cảnh giới tối thiểu (hoặc nhiệm vụ). cost: linh lực. cd: hồi chiêu (giây). */
const RPG_SKILLS = {
  kiem_basic: { name: 'Kiếm Chiêu', kind: 'melee', mult: 1, perLv: 0, cd: 0.42, cost: 0, range: 2.4, color: 0x9fd8ff, desc: 'Chém liên hoàn 3 nhát, nhát thứ 3 mạnh hơn.' },
  kiem_khi: { name: 'Nhất Kiếm Đoạn Thủy', kind: 'wave', mult: 2.2, perLv: 0.25, cd: 3, cost: 14, range: 14, color: 0x9fd8ff, unlock: 0, desc: 'Phóng một đạo kiếm khí bay thẳng, xuyên qua mọi kẻ địch trên đường.' },
  kiem_lien: { name: 'Thanh Phong Liên Trảm', kind: 'dash', mult: 1.3, hits: 4, perLv: 0.15, cd: 6, cost: 24, range: 8, color: 0x7fe0c0, unlockQuest: 'q5', desc: 'Lướt tới trước, chém 4 nhát vào mọi kẻ địch lướt qua.' },
  kiem_ngu: { name: 'Ngự Kiếm Thuật', kind: 'orbit', mult: 0.7, perLv: 0.1, cd: 16, cost: 40, dur: 8, count: 3, range: 3.2, color: 0xa8c0ff, unlock: 1, desc: '3 phi kiếm xoay quanh thân trong 8 giây, tự chém kẻ địch lại gần.' },
  kiem_van: { name: 'Vạn Kiếm Quy Tông', kind: 'rain', mult: 0.55, hits: 14, perLv: 0.08, cd: 40, cost: 90, range: 9, color: 0xe8f4ff, unlock: 2, ult: true, desc: 'Tuyệt kỹ: triệu vạn phi kiếm trút xuống vùng phía trước, 14 đợt sát thương, đợt cuối choáng.' },
  phap_basic: { name: 'Linh Chưởng', kind: 'bolt', mult: 1, perLv: 0, cd: 0.55, cost: 0, range: 11, speed: 22, color: 0xffb070, desc: 'Phóng chưởng lực linh khí vào mục tiêu.' },
  phap_bang: { name: 'Hàn Băng Tiễn', kind: 'bolt', mult: 2.4, perLv: 0.3, cd: 3, cost: 16, range: 15, speed: 28, slow: 0.4, color: 0xbfe8ff, unlock: 0, big: true, desc: 'Băng tiễn xuyên giáp, làm chậm 40% trong 2,5 giây.' },
  phap_hoa: { name: 'Cửu Viêm Hỏa Trận', kind: 'zone', mult: 0.6, perLv: 0.08, cd: 9, cost: 34, dur: 4, radius: 3.4, range: 12, color: 0xff8a3a, unlockQuest: 'q5', desc: 'Dựng hỏa trận tại mục tiêu: thiêu đốt kẻ địch bên trong mỗi 0,5 giây trong 4 giây.' },
  phap_moc: { name: 'Mộc Linh Hồi Xuân', kind: 'heal', mult: 0.22, perLv: 0.03, cd: 18, cost: 45, dur: 5, color: 0x9fe08a, unlock: 1, desc: 'Hồi ngay 22% sinh lực, rồi hồi thêm trong 5 giây.' },
  phap_loi: { name: 'Cửu Thiên Lôi Kiếp', kind: 'strike', mult: 2.6, perLv: 0.3, hits: 9, cd: 40, cost: 100, range: 14, color: 0xfff2a8, unlock: 2, ult: true, desc: 'Tuyệt kỹ: 9 đạo thiên lôi giáng xuống kẻ địch xung quanh, mỗi đạo choáng 0,6 giây.' },
  vo_basic: { name: 'Quyền Kích', kind: 'melee', mult: 1.05, perLv: 0, cd: 0.5, cost: 0, range: 2.7, color: 0xffd27a, desc: 'Đòn thương / trảo nặng, nhát thứ 3 hất lùi.' },
  vo_thuong: { name: 'Lôi Thương Xuyên Vân', kind: 'dash', mult: 2.2, hits: 1, perLv: 0.25, cd: 5, cost: 18, range: 7, stun: 0.8, color: 0xbfe0ff, unlock: 0, desc: 'Xung phong đâm thương, choáng 0,8 giây kẻ bị trúng.' },
  vo_phadia: { name: 'Phá Địa Trảm', kind: 'slam', mult: 2.4, perLv: 0.28, cd: 8, cost: 30, radius: 4.2, color: 0xe9d58a, unlockQuest: 'q5', desc: 'Dậm đất tạo sóng chấn diện rộng, hất tung kẻ địch xung quanh.' },
  vo_kimcang: { name: 'Kim Cang Bất Hoại', kind: 'shield', mult: 0.3, perLv: 0.04, cd: 20, cost: 40, dur: 6, color: 0xffe08a, unlock: 1, desc: 'Khiên kim cang hấp thụ 30% sinh lực tối đa, giảm 30% sát thương nhận trong 6 giây.' },
  vo_kimthan: { name: 'Bất Diệt Kim Thân', kind: 'transform', mult: 0.5, perLv: 0.06, cd: 60, cost: 80, dur: 15, color: 0xffd27a, unlock: 2, ult: true, desc: 'Tuyệt kỹ biến thân: thân hình hóa vàng to lớn, +50% công, +50% giáp, hồi 2% sinh lực / giây trong 15 giây.' }
};
const SKILL_MAX_LV = 7;
/** Giá bí kíp nâng cấp kỹ năng lên cấp lv (linh thạch) và tu vi tối thiểu. */
const skillBookCost = (sk, lv) => ({ gold: Math.round((sk.ult ? 3000 : 600) * Math.pow(2.6, lv - 2)), tv: [0, 0, 1500, 8000, 40000, 160000, 600000, 2000000][lv] || 0 });

/* ---------- Điểm linh căn (tiềm năng) – nâng chỉ số gốc ---------- */
const POINT_STATS = {
  hp: { name: 'Sinh lực', step: 20, cost: 40, grow: 0.06 },
  mp: { name: 'Linh lực', step: 20, cost: 40, grow: 0.06 },
  atk: { name: 'Sức đánh', step: 1, cost: 60, grow: 0.05 },
  def: { name: 'Giáp', step: 1, cost: 160, grow: 0.08 },
  crit: { name: 'Chí mạng', step: 0.01, cost: 4000, grow: 1, max: 20 }
};
/** Giá linh căn cho lần nâng thứ n+1 (n = số lần đã nâng). */
const pointCost = (k, n) => Math.round(POINT_STATS[k].cost * (1 + n * POINT_STATS[k].grow));

/* ---------- Quái vật: mô hình thủ tục (js/rpg/actors.js) hoặc người (look) ----------
 * ai: passive (chỉ đánh khi bị đánh) | aggro (chủ động) ; fly: bay ; ranged: bắn đạn ; hpK/atkK: hệ số so với chuẩn cấp. */
const MONSTERS = {
  linhtho: { name: 'Linh Thỏ', model: 'rabbit', c1: 0xf4f0ea, c2: 0xff9ab0, ai: 'passive', hpK: 0.8, atkK: 0.7, scale: 0.8 },
  trucyeu: { name: 'Trúc Yêu', model: 'tree', c1: 0x5f8a3a, c2: 0x7fc45a, ai: 'aggro', hpK: 1.2, atkK: 1, scale: 0.8 },
  phongdieu: { name: 'Phong Điểu', model: 'bird', c1: 0x9fd8ff, c2: 0xe8f4ff, ai: 'aggro', fly: true, hpK: 0.8, atkK: 1, scale: 1 },
  thachlinh: { name: 'Thạch Linh', model: 'golem', c1: 0x5f676e, c2: 0x7fe6ff, ai: 'aggro', hpK: 1.5, atkK: 1.1, scale: 1 },
  kiemhon: { name: 'Kiếm Hồn', model: 'human', look: 'anhkiem', ai: 'aggro', hpK: 1, atkK: 1.15, scale: 1, ghost: true },
  haclang: { name: 'Hắc Lang', model: 'wolf', c1: 0x2c3038, c2: 0x8fb8d8, ai: 'aggro', hpK: 1, atkK: 1.2, scale: 1.1 },
  holinh: { name: 'Hồ Linh', model: 'wolf', c1: 0xe8813a, c2: 0xfff0d8, ai: 'passive', hpK: 0.8, atkK: 0.7, scale: 0.8 },
  hoatinh: { name: 'Hỏa Linh Tinh', model: 'slime', c1: 0xff7a3a, c2: 0xffd27a, ai: 'aggro', hpK: 1, atkK: 1, scale: 0.9, ranged: 'fire' },
  hoanha: { name: 'Hỏa Nha', model: 'bird', c1: 0xc2302a, c2: 0xffb347, ai: 'aggro', fly: true, hpK: 0.8, atkK: 1.05, scale: 1 },
  viemthach: { name: 'Viêm Thạch Quái', model: 'golem', c1: 0x4a2a22, c2: 0xff7a3a, ai: 'aggro', hpK: 1.5, atkK: 1.15, scale: 1.05 },
  loixa: { name: 'Lôi Xà', model: 'serpent', c1: 0x2c3a6b, c2: 0x9fd0ff, ai: 'aggro', hpK: 1.1, atkK: 1.1, scale: 1 },
  uminhtu: { name: 'U Minh Ma Tu', model: 'human', look: 'uminh', ai: 'aggro', hpK: 0.9, atkK: 1.2, scale: 1, ranged: 'nether' },
  datru: { name: 'Dã Trư', model: 'boar', c1: 0x6a4a34, c2: 0xe8dcc8, ai: 'passive', hpK: 0.9, atkK: 0.75, scale: 0.85 },
  thanhtinh: { name: 'Thanh Linh Tinh', model: 'slime', c1: 0x5fd08a, c2: 0xd8ffe0, ai: 'aggro', hpK: 1.1, atkK: 1, scale: 0.9 },
  thuyeu: { name: 'Thụ Yêu', model: 'tree', c1: 0x4a3a24, c2: 0x6fae4a, ai: 'aggro', hpK: 1.4, atkK: 1, scale: 1.05 },
  yeulang: { name: 'Yêu Lang', model: 'wolf', c1: 0x5a6068, c2: 0xd8e2ea, ai: 'aggro', hpK: 1, atkK: 1.15, scale: 1 },
  mathu: { name: 'Ma Thú Hống', model: 'human', look: 'mathu', ai: 'aggro', hpK: 1.4, atkK: 1.1, scale: 1.05 },
  giaptru: { name: 'Thạch Giáp Trư', model: 'boar', c1: 0x5a5f66, c2: 0xb0b8c0, ai: 'aggro', hpK: 1.6, atkK: 1.1, scale: 1.15 },
  huyetanh: { name: 'Huyết Ảnh Kiếm Khách', model: 'human', look: 'huyetkiem', ai: 'aggro', hpK: 1, atkK: 1.2, scale: 1 },
  manha: { name: 'Ma Nha', model: 'bird', c1: 0x1a1420, c2: 0xb07cff, ai: 'aggro', fly: true, hpK: 0.9, atkK: 1.15, scale: 1.15 },
  mabinh: { name: 'Ma Binh', model: 'human', look: 'mabinh', ai: 'aggro', hpK: 1.3, atkK: 1.15, scale: 1.05 },
  hondonthach: { name: 'Hỗn Độn Thạch Ma', model: 'golem', c1: 0x1c1428, c2: 0xff3a6a, ai: 'aggro', hpK: 1.6, atkK: 1.2, scale: 1.2 },
  hukhonggiao: { name: 'Hư Không Giao', model: 'serpent', c1: 0x140a16, c2: 0xd0a0ff, ai: 'aggro', fly: true, hpK: 1.2, atkK: 1.25, scale: 1.2 },
  // Boss (đánh dấu boss: true) – xuất hiện theo giờ ở bản đồ cuối mỗi vùng
  b_huyetkiem: { name: 'Huyết Kiếm Ma Tôn', model: 'human', look: 'huyetkiem', boss: true, ai: 'aggro', hpK: 22, atkK: 1.6, scale: 1.8, respawn: 150 },
  b_loigiao: { name: 'Lôi Giao Vương', model: 'serpent', c1: 0x1b2350, c2: 0xfff2a8, boss: true, ai: 'aggro', fly: true, hpK: 22, atkK: 1.6, scale: 2.2, respawn: 150, ranged: 'thunder' },
  b_thuvuong: { name: 'Yêu Thú Vương', model: 'human', look: 'yeuvuong', boss: true, ai: 'aggro', hpK: 24, atkK: 1.6, scale: 1.9, respawn: 150 },
  b_umaquan: { name: 'U Minh Ma Quân', model: 'human', look: 'umaquan', boss: true, ai: 'aggro', hpK: 26, atkK: 1.7, scale: 1.9, respawn: 200, ranged: 'nether' },
  b_hondon: { name: 'Hỗn Độn Ma Đế', model: 'human', look: 'hondon', boss: true, world: true, ai: 'aggro', hpK: 40, atkK: 1.8, scale: 2.3, respawn: 300 }
};
/** Chỉ số chuẩn theo cấp quái L. */
const monsterStats = (L, m) => ({
  hp: Math.round((40 * Math.pow(L, 1.5) + 40) * m.hpK),
  atk: Math.round((7 + 3.8 * Math.pow(L, 1.25)) * m.atkK),
  def: Math.round(L * 0.8 * (m.boss ? 1.5 : 1)),
  gold: Math.round(2 + L * 2.2)
});

/* ---------- Biome: màu địa hình, cây cối, sương, hạt môi trường ---------- */
const BIOMES = {
  thanhvan: { top: 0x6fae6a, soil: 0x5a4a3a, deep: 0x2e2620, far: 0x6a7f9a, mid: 0x4a6a5a, fog: 0xb8c8d4, sky: [0x1a2e4a, 0x6f90b0, 0xdde4e8], props: ['pine', 'rock'], motes: 0xffffff, density: 0.5 },
  truclam: { top: 0x7fbf5a, soil: 0x5f4a32, deep: 0x30261a, far: 0x5f7a6a, mid: 0x3f6a3a, fog: 0xc8dcc0, sky: [0x203a30, 0x7fa890, 0xe8f0d8], props: ['bamboo', 'bamboo', 'rock'], motes: 0xc8ffb0, density: 1.4 },
  vanhai: { top: 0xb8c8c8, soil: 0x6a7278, deep: 0x3a4048, far: 0x8aa0b8, mid: 0x6a7a8a, fog: 0xe0e8f0, sky: [0x2a4a70, 0x90b0d0, 0xf4f4f0], props: ['rock', 'pine'], motes: 0xffffff, density: 0.4, sea: true },
  kiemmo: { top: 0x5a5f5a, soil: 0x3a3634, deep: 0x1c1a1a, far: 0x3a4250, mid: 0x2a3038, fog: 0x6a7080, sky: [0x0e1420, 0x3a4660, 0x8a8a90], props: ['sword', 'deadtree', 'rock'], motes: 0x9fd8ff, density: 0.9 },
  danha: { top: 0xc87a4a, soil: 0x7a4a30, deep: 0x3a2018, far: 0x9a6a5a, mid: 0x7a4a3a, fog: 0xf0c8a0, sky: [0x3a2030, 0xd08a6a, 0xffe0b0], props: ['maple', 'rock'], motes: 0xffc080, density: 0.6 },
  phonglam: { top: 0xd88a3a, soil: 0x6a3a22, deep: 0x30180e, far: 0xa06a4a, mid: 0x8a3a22, fog: 0xf0d0a8, sky: [0x402030, 0xd89060, 0xffe8c0], props: ['maple', 'maple', 'rock'], motes: 0xff9a4a, density: 1.3 },
  hoadiem: { top: 0x5a3028, soil: 0x3a1a14, deep: 0x1a0a08, far: 0x6a2a20, mid: 0x4a1a14, fog: 0x8a4a3a, sky: [0x200a0a, 0x8a3020, 0xff9a5a], props: ['crystal_fire', 'rock', 'deadtree'], motes: 0xffa040, density: 0.8, lava: true },
  loitrach: { top: 0x3a5a4a, soil: 0x2a3a30, deep: 0x141c18, far: 0x3a4a6a, mid: 0x2a3a4a, fog: 0x5a6a80, sky: [0x0a1020, 0x3a4a70, 0x8a9ab0], props: ['deadtree', 'reed', 'rock'], motes: 0xbfe0ff, density: 1, swamp: true },
  vanthu: { top: 0x8a9a4a, soil: 0x5a4a2a, deep: 0x2a2214, far: 0x7a8a5a, mid: 0x5a6a3a, fog: 0xd8d8b0, sky: [0x2a3020, 0x9aa070, 0xf0ecd0], props: ['pine', 'rock', 'grass'], motes: 0xffffd0, density: 0.6 },
  manghoang: { top: 0xa8a058, soil: 0x6a5a34, deep: 0x302818, far: 0x8a8a6a, mid: 0x6a6a42, fog: 0xe8e0b8, sky: [0x30302a, 0xb0a878, 0xf8f0d0], props: ['grass', 'grass', 'rock', 'deadtree'], motes: 0xfff0b0, density: 0.9 },
  cothu: { top: 0x4a7a3a, soil: 0x3a2e1e, deep: 0x1a140e, far: 0x3a5a3a, mid: 0x2a4a2a, fog: 0x7a9a7a, sky: [0x0e1a10, 0x3a5a3a, 0x9ab08a], props: ['bigtree', 'bigtree', 'grass'], motes: 0xc8ff80, density: 1.2 },
  thuvuong: { top: 0x5a4a3a, soil: 0x3a2e24, deep: 0x1a1410, far: 0x4a3a30, mid: 0x3a2e24, fog: 0x4a3e34, sky: [0x100c08, 0x3a2e24, 0x6a5a48], props: ['rock', 'crystal', 'rock'], motes: 0xffd27a, density: 1, cave: true },
  mauyen: { top: 0x3a1a24, soil: 0x24101a, deep: 0x10060a, far: 0x3a1430, mid: 0x2a0e20, fog: 0x3a1a30, sky: [0x08040a, 0x2a0e24, 0x6a2040], props: ['deadtree', 'crystal_dark', 'sword'], motes: 0xff4a6a, density: 1 },
  hondon: { top: 0x2a2440, soil: 0x16122a, deep: 0x080612, far: 0x2a1a4a, mid: 0x1a1030, fog: 0x2a2048, sky: [0x040210, 0x1a1040, 0x5a3a8a], props: ['crystal_dark', 'rock', 'crystal_dark'], motes: 0xd0a0ff, density: 0.8, sea: true }
};

/* ---------- Bản đồ ----------
 * width: bề ngang (m); left / right: bản đồ kế bên (đi ra mép); level: [min,max] cấp quái; spawns: [loại, số lượng];
 * rough: độ gồ ghề địa hình; plat: số bục nổi; boss: loại boss xuất hiện theo giờ; home: sơn môn (an toàn, có NPC). */
const MAPS = {
  A0: { name: 'Thanh Vân Sơn Môn', region: 'kiem', biome: 'thanhvan', width: 80, home: 'kiem', right: 'A1', rough: 0, plat: 0, seed: 11 },
  A1: { name: 'Trúc Lâm', region: 'kiem', biome: 'truclam', width: 110, left: 'A0', right: 'A2', level: [1, 4], spawns: [['linhtho', 6], ['trucyeu', 4]], rough: 1.2, plat: 3, seed: 12 },
  A2: { name: 'Vân Hải Nhai', region: 'kiem', biome: 'vanhai', width: 120, left: 'A1', right: 'A3', level: [6, 10], spawns: [['phongdieu', 4], ['thachlinh', 5]], rough: 2.2, plat: 5, seed: 13 },
  A3: { name: 'Kiếm Mộ', region: 'kiem', biome: 'kiemmo', width: 130, left: 'A2', level: [12, 16], spawns: [['kiemhon', 5], ['haclang', 4]], rough: 1.6, plat: 4, seed: 14, boss: 'b_huyetkiem', bossLv: 20 },
  B0: { name: 'Đan Hà Cốc', region: 'phap', biome: 'danha', width: 80, home: 'phap', right: 'B1', rough: 0, plat: 0, seed: 21 },
  B1: { name: 'Phong Lâm', region: 'phap', biome: 'phonglam', width: 110, left: 'B0', right: 'B2', level: [1, 4], spawns: [['holinh', 6], ['hoatinh', 4]], rough: 1.2, plat: 3, seed: 22 },
  B2: { name: 'Hỏa Diệm Sơn', region: 'phap', biome: 'hoadiem', width: 120, left: 'B1', right: 'B3', level: [6, 10], spawns: [['hoanha', 4], ['viemthach', 5]], rough: 2.4, plat: 5, seed: 23 },
  B3: { name: 'Lôi Trạch', region: 'phap', biome: 'loitrach', width: 130, left: 'B2', level: [12, 16], spawns: [['loixa', 5], ['uminhtu', 4]], rough: 1, plat: 4, seed: 24, boss: 'b_loigiao', bossLv: 20 },
  C0: { name: 'Vạn Thú Lĩnh', region: 'vo', biome: 'vanthu', width: 80, home: 'vo', right: 'C1', rough: 0, plat: 0, seed: 31 },
  C1: { name: 'Mãng Hoang Nguyên', region: 'vo', biome: 'manghoang', width: 110, left: 'C0', right: 'C2', level: [1, 4], spawns: [['datru', 6], ['thanhtinh', 4]], rough: 1, plat: 3, seed: 32 },
  C2: { name: 'Cổ Thụ Lâm', region: 'vo', biome: 'cothu', width: 120, left: 'C1', right: 'C3', level: [6, 10], spawns: [['thuyeu', 5], ['yeulang', 4]], rough: 1.8, plat: 5, seed: 33 },
  C3: { name: 'Thú Vương Động', region: 'vo', biome: 'thuvuong', width: 130, left: 'C2', level: [12, 16], spawns: [['mathu', 5], ['giaptru', 4]], rough: 1.6, plat: 4, seed: 34, boss: 'b_thuvuong', bossLv: 20 },
  D1: { name: 'Ma Uyên', region: 'ma', biome: 'mauyen', width: 140, right: 'D2', level: [22, 28], spawns: [['huyetanh', 4], ['manha', 3], ['mabinh', 4]], rough: 2, plat: 5, seed: 41, boss: 'b_umaquan', bossLv: 32, minRealm: 3 },
  D2: { name: 'Hỗn Độn Hư Không', region: 'ma', biome: 'hondon', width: 140, left: 'D1', level: [30, 36], spawns: [['hondonthach', 5], ['hukhonggiao', 4]], rough: 2.6, plat: 6, seed: 42, boss: 'b_hondon', bossLv: 42, minRealm: 3 }
};
const MAP_KEYS = Object.keys(MAPS);
/** Điểm dịch chuyển của Truyền Tống Sứ. */
const TELEPORTS = [
  { map: 'A0', label: 'Thanh Vân Sơn Môn (Kiếm Tông)' }, { map: 'B0', label: 'Đan Hà Cốc (Pháp Tông)' }, { map: 'C0', label: 'Vạn Thú Lĩnh (Võ Tông)' },
  { map: 'D1', label: 'Ma Uyên (cần Nguyên Anh)', minRealm: 3, cost: 2000 }
];

/* ---------- NPC ở sơn môn: vai trò + ngoại hình (look lấy từ 24 tướng) ---------- */
const NPC_ROLES = {
  master: { title: 'Sư Phụ', mark: '師' }, shop: { title: 'Linh Thương', mark: '商' }, smith: { title: 'Luyện Khí Sư', mark: '鍛' },
  tele: { title: 'Truyền Tống Sứ', mark: '傳' }, tree: { title: 'Linh Đan Thụ', mark: '丹' }, altar: { title: 'Tế Đàn Long Châu', mark: '龍' }
};
const HOME_NPCS = {
  kiem: [{ role: 'tele', look: 'thannu', name: 'Vân Tiên Tử', x: 10 }, { role: 'shop', look: 'linhy', name: 'Lâm Linh Nhi', x: 22 }, { role: 'tree', x: 32 },
         { role: 'master', look: 'kiemtien', name: 'Vạn Kiếm Tiên Đế', x: 42 }, { role: 'smith', look: 'kimcuong', name: 'Kim Cang Lão Sư', x: 54 }, { role: 'altar', x: 66 }],
  phap: [{ role: 'tele', look: 'thannu', name: 'Hà Tiên Tử', x: 10 }, { role: 'shop', look: 'thanhmoc', name: 'Mộc Thanh', x: 22 }, { role: 'tree', x: 32 },
         { role: 'master', look: 'loiton', name: 'Thiên Lôi Đạo Nhân', x: 42 }, { role: 'smith', look: 'hoa', name: 'Hỏa Luyện Đồng Tử', x: 54 }, { role: 'altar', x: 66 }],
  vo: [{ role: 'tele', look: 'thannu', name: 'Thú Tiên Cơ', x: 10 }, { role: 'shop', look: 'linhcung', name: 'Cung Thương Nhân', x: 22 }, { role: 'tree', x: 32 },
       { role: 'master', look: 'batdiet', name: 'Bất Diệt Chiến Thần', x: 42 }, { role: 'smith', look: 'thietve', name: 'Thiết Vệ Thợ Rèn', x: 54 }, { role: 'altar', x: 66 }]
};

/* ---------- Vật phẩm ---------- */
const EQUIP_SLOTS = {
  ao: { name: 'Hộ Giáp', main: { def: 3, hp: 30 } }, quan: { name: 'Chiến Khố', main: { hp: 60 } }, gang: { name: 'Hộ Thủ', main: { atk: 4 } },
  giay: { name: 'Vân Hài', main: { mp: 40 } }, ngoc: { name: 'Ngọc Bội', main: { crit: 0.01, hp: 20 } }
};
const EQUIP_SLOT_KEYS = Object.keys(EQUIP_SLOTS);
const TIERS = [null,
  { name: 'Thanh Đồng', k: 1, realm: 0, price: 150 }, { name: 'Bạch Ngân', k: 2.6, realm: 0, price: 900 }, { name: 'Hoàng Kim', k: 5.5, realm: 1, price: 4500 },
  { name: 'Huyền Thiết', k: 10, realm: 2, price: 22000 }, { name: 'Tử Kim', k: 17, realm: 3, price: 0 }, { name: 'Thiên Tinh', k: 28, realm: 4, price: 0 }];
const UPGRADE_MAX = 7;
/** Chỉ số trang bị: chỉ số chính × hệ số bậc × (1 + 12% / cấp cường hoá). */
function equipStats(slot, tier, plus = 0) {
  const s = {}, m = EQUIP_SLOTS[slot].main, k = TIERS[tier].k * (1 + 0.12 * plus);
  for (const key in m) s[key] = key === 'crit' ? Math.round(m[key] * Math.min(6, 1 + tier * 0.6) * (1 + 0.12 * plus) * 1000) / 1000 : Math.round(m[key] * k);
  return s;
}
const upgradeCost = (tier, plus) => ({ gold: Math.round((TIERS[tier].price || 30000 * tier) * 0.35 * Math.pow(1.7, plus)), rate: Math.max(0.3, 1 - plus * 0.1) });
/** Pháp bảo (36 món, js/data/artifacts.js) trong phiêu lưu: đổi chỉ số bản cờ sang chỉ số nhân vật. */
function artifactStats(art, plus = 0) {
  const st = art.stats, k = 1 + 0.2 * plus, o = {};
  const add = (key, v) => { if (v) o[key] = Math.round(((o[key] || 0) + v) * 1000) / 1000; };
  add('atk', (st.atk || 0) * 1.5 * k); add('skillDmg', ((st.ap || 0) / 100 + (st.skillDmg || 0)) * k); add('aspd', (st.aspd || 0) * k);
  add('def', (st.def || 0) * 0.25 * k); add('mp', (st.mana || 0) * 4 * k); add('hp', (st.hp || 0) * 1.5 * k);
  add('crit', (st.crit || 0) * 0.6 * k); add('critDmg', (st.critDmg || 0) * k); add('ls', ((st.ls || 0) + (st.omni || 0)) * k); add('dr', (st.mr || 0) / 400 * k);
  for (const key of ['atk', 'def', 'mp', 'hp']) if (o[key]) o[key] = Math.round(o[key]);
  return o;
}
const CONSUMABLES = {
  hp_s: { name: 'Hồi Huyết Đan', glyph: '血', color: '#ff7a7a', price: 30, heal: { hp: 250 }, desc: 'Hồi 250 sinh lực.' },
  mp_s: { name: 'Hồi Linh Đan', glyph: '靈', color: '#7cc4ff', price: 30, heal: { mp: 200 }, desc: 'Hồi 200 linh lực.' },
  hp_m: { name: 'Đại Hồi Huyết Đan', glyph: '血', color: '#ff4a4a', price: 220, heal: { hp: 1800 }, realm: 1, desc: 'Hồi 1.800 sinh lực.' },
  mp_m: { name: 'Đại Hồi Linh Đan', glyph: '靈', color: '#4aa0ff', price: 220, heal: { mp: 1200 }, realm: 1, desc: 'Hồi 1.200 linh lực.' },
  tv_x2: { name: 'Ngộ Đạo Đan', glyph: '悟', color: '#ffd166', gem: 5, buff: { tv: 2, dur: 600 }, desc: 'Nhân đôi tu vi và linh căn nhận được trong 10 phút.' },
  revive: { name: 'Hoàn Hồn Phù', glyph: '符', color: '#e8f4ff', gem: 2, desc: 'Khi tử trận: hồi sinh ngay tại chỗ với đầy sinh lực.' }
};
/** Linh đan của Linh Đan Thụ (hồi % sinh lực và linh lực theo cấp cây). */
const LINHDAN = { pct: lv => 0.3 + lv * 0.1, interval: 75, cap: lv => 3 + lv * 2, upCost: lv => Math.round(400 * Math.pow(3, lv - 1)), maxLv: 7 };
const LONG_CHAU_COUNT = 7;
/** Điều ước Thần Long (triệu hồi tại Tế Đàn khi đủ 7 viên). */
const WISHES = [
  { id: 'tv', name: 'Tu vi đại tiến', desc: 'Nhận tu vi bằng 35% khoảng cách tới cảnh giới kế tiếp (tối thiểu 3.000).' },
  { id: 'gold', name: 'Phú khả địch quốc', desc: 'Nhận linh thạch: 20.000 × (cảnh giới + 1).' },
  { id: 'art', name: 'Thần binh xuất thế', desc: 'Nhận 1 pháp bảo ngẫu nhiên +3 và 1 trang bị bậc cao.' },
  { id: 'skill', name: 'Ngộ đạo', desc: 'Mọi kỹ năng đã học +1 cấp (tối đa ' + SKILL_MAX_LV + ').' },
  { id: 'gem', name: 'Tiên duyên', desc: 'Nhận 60 tiên ngọc và 3 Ngộ Đạo Đan.' }
];

/* ---------- Nhiệm vụ chính tuyến ----------
 * type: talk (nói với NPC vai trò role, ở sơn môn mình hoặc sect: 'other') | kill (giết count quái ở bản đồ thứ tự idx của vùng) | harvest | points
 * | drop (thu thập vật phẩm nhiệm vụ rơi từ quái) | realm | craft | boss | longchau | killmap (giết ở bản đồ cụ thể) */
const QUESTS = [
  { id: 'q1', name: 'Bái kiến sư phụ', type: 'talk', role: 'master', text: 'Tới gặp Sư Phụ ở giữa sơn môn.', reward: { gold: 200, equip: ['ao', 1] } },
  { id: 'q2', name: 'Thử tay', type: 'kill', idx: 1, count: 5, text: 'Ra khỏi sơn môn (đi sang phải), hạ 5 yêu thú.', reward: { tv: 300, item: ['hp_s', 5] } },
  { id: 'q3', name: 'Linh Đan Thụ', type: 'harvest', text: 'Về sơn môn, thu hoạch linh đan ở Linh Đan Thụ.', reward: { gold: 300 } },
  { id: 'q4', name: 'Khai mở linh căn', type: 'points', text: 'Mở bảng Nhân vật (phím N) và dùng linh căn nâng một chỉ số.', reward: { tv: 400, equip: ['gang', 1] } },
  { id: 'q5', name: 'Yêu đan', type: 'drop', idx: 1, item: 'yeudan', count: 6, text: 'Thu thập 6 Yêu Đan từ yêu thú ở bản đồ đầu tiên.', reward: { gold: 800, unlock: true, equip: ['quan', 1] } },
  { id: 'q6', name: 'Đột phá Trúc Cơ', type: 'realm', realm: 1, text: 'Tu luyện tới cảnh giới Trúc Cơ.', reward: { gem: 10, equip: ['giay', 2] } },
  { id: 'q7', name: 'Vượt núi', type: 'kill', idx: 2, count: 20, text: 'Tới bản đồ thứ hai của tông môn, hạ 20 yêu thú.', reward: { tv: 3000, item: ['hp_m', 5] } },
  { id: 'q8', name: 'Luyện khí', type: 'craft', text: 'Đưa 2 nguyên liệu cho Luyện Khí Sư để luyện 1 pháp bảo.', reward: { gold: 2000, item: ['mp_m', 5] } },
  { id: 'q9', name: 'Bái phỏng đồng đạo', type: 'talk', role: 'master', sect: 'other', text: 'Nhờ Truyền Tống Sứ tới tông môn khác và bái phỏng Sư Phụ ở đó.', reward: { ball: 1, gem: 10 } },
  { id: 'q10', name: 'Đột phá Kim Đan', type: 'realm', realm: 2, text: 'Tu luyện tới cảnh giới Kim Đan.', reward: { gold: 8000, equip: ['ngoc', 3] } },
  { id: 'q11', name: 'Trừ ma', type: 'boss', idx: 3, text: 'Hạ boss ở bản đồ cuối vùng tông môn (boss xuất hiện theo giờ).', reward: { tv: 30000, gem: 20 } },
  { id: 'q12', name: 'Thất Tinh Long Châu', type: 'longchau', text: 'Thu thập đủ 7 viên Long Châu và triệu hồi Thần Long ở Tế Đàn.', reward: { gem: 30 } },
  { id: 'q13', name: 'Đột phá Nguyên Anh', type: 'realm', realm: 3, text: 'Tu luyện tới Nguyên Anh để mở đường tới Ma Uyên.', reward: { gold: 30000 } },
  { id: 'q14', name: 'Ma Uyên', type: 'killmap', map: 'D1', count: 30, text: 'Tới Ma Uyên (Truyền Tống Sứ), hạ 30 ma vật.', reward: { tv: 200000, equip: ['ao', 5] } },
  { id: 'q15', name: 'Diệt Ma Đế', type: 'bossmap', map: 'D2', text: 'Cùng đồng đạo hạ Hỗn Độn Ma Đế ở Hỗn Độn Hư Không.', reward: { gem: 100, art: 5 } }
];
/** Vật phẩm nhiệm vụ. */
const QUEST_ITEMS = { yeudan: { name: 'Yêu Đan', glyph: '丹', color: '#c9a0ff', desc: 'Nội đan của yêu thú – vật phẩm nhiệm vụ.', rate: 0.45 } };

/* ---------- Người chơi ảo (mô phỏng, không có mạng) ---------- */
const BOT_NAMES = ['TieuDaoTu', 'BachYKiemKhach', 'LamPhong_99', 'VoDanhDaoNhan', 'HoaLinhNhi', 'ThanhVanTu', 'HanBangTienTu', 'LoiVanChan', 'MocTieuThanh',
  'PhongKhinhVu', 'KimCuongBa', 'ThietQuyen', 'TuyetNguyet', 'DaoTam_88', 'LangKhach', 'NguyetHa', 'TinhVan', 'BangTam', 'HuyenPhong', 'ThuongKhung', 'HacLong_Ca', 'KiemSi_TanThu'];
const BOT_CHAT = [
  'Ai đi đánh boss không, cho tổ đội với', 'Mới lên Trúc Cơ, vui quá', 'Linh Đan Thụ cấp mấy rồi mọi người?', 'Rớt được Yêu Đan rồi!', 'Bản đồ này quái đông ghê',
  'Ma Uyên khó quá, chưa dám đi', 'Có ai thừa nguyên liệu Linh Kiếm không?', 'Vừa luyện ra Tru Tiên Kiếm, đỉnh!', 'Còn thiếu 2 viên Long Châu nữa thôi', 'Boss sắp ra kìa',
  'Kiếm Tông chém nhanh thật', 'Pháp Tông máu giấy quá', 'Võ Tông lì đòn ghê', 'Chúc mọi người tu luyện thuận lợi', 'Có ai biết đường lên Kiếm Mộ không?', 'Bay lên cao né quái cho nhanh nè'
];
