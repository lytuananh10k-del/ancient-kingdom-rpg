// Vạn Kiếm Kỳ Trận – Dữ liệu tướng (V1.5): 24 tướng 5 bậc, phe địch, cấu hình nâng sao, vai trò, mô hình & animation.
// Script thường (không phải module): nạp trước js/11-units.js. Thêm tướng mới: thêm 1 mục vào CHAMPIONS (+ LOOKS nếu cần ngoại hình riêng)
// và 1 kỹ năng (js/data/skills.js hoặc js/13-skills.js) – validateChampions() báo thiếu trường khi khởi động.
'use strict';

/* ---------- Ngoại hình nhân vật thủ tục (CharacterRig) ---------- */
const LOOKS = {
  kiemtien: { robe: 0xeef2f6, trim: 0x3d7fc4, inner: 0x2b4d78, hair: 0x15181f, skin: 0xf2d3bd, accent: 0xe2c06a, weapon: 'sword', hairLen: 8, trailColor: new THREE.Color(0x9fd8ff), crown: true },
  loi: { robe: 0x2c3a6b, trim: 0x9fc7ff, inner: 0x1d2647, hair: 0xd8dde8, skin: 0xf0d0b8, accent: 0x9fc7ff, weapon: 'staff', orb: 0x9fd0ff, hairLen: 7, trailColor: new THREE.Color(0x9fd0ff) },
  hoa: { robe: 0x8e2b24, trim: 0xffb347, inner: 0x4a1612, hair: 0x2a0f0b, skin: 0xf3d2bc, accent: 0xffb347, weapon: 'staff', orb: 0xff9a4a, hairLen: 8, trailColor: new THREE.Color(0xffa055) },
  hophap: { robe: 0x5b6b4a, trim: 0xd9b45a, inner: 0x343d2a, hair: 0x1a1612, skin: 0xe6c3a5, accent: 0xd9b45a, weapon: 'spear', bulk: 1.12, hairLen: 5, trailColor: new THREE.Color(0xe9d58a) },
  huyetkiem: { robe: 0x2a1216, trim: 0xc2302a, inner: 0x1a0a0c, hair: 0x0a0a0c, skin: 0xd8b8a8, accent: 0xc2302a, weapon: 'blade', hairLen: 8, trailColor: new THREE.Color(0xff4a3a), mask: 0x1a1a1a },
  uminh: { robe: 0x3a2350, trim: 0xb07cff, inner: 0x22143a, hair: 0x6a4a8a, skin: 0xcfc0d8, accent: 0xb07cff, weapon: 'staff', orb: 0xb07cff, hairLen: 7, trailColor: new THREE.Color(0xc08cff) },
  mathu: { robe: 0x4a3a2c, trim: 0xa83a2a, inner: 0x2a1f18, hair: 0x2a1a10, skin: 0xb88a70, accent: 0xa83a2a, weapon: 'claws', bulk: 1.3, hairLen: 5, trailColor: new THREE.Color(0xff5a3a) },
  kiemdong: { robe: 0xd6e4f0, trim: 0x5b9bd5, inner: 0x3b5f86, hair: 0x2a1d14, skin: 0xf2d6c2, accent: 0xc0c8d0, weapon: 'sword', hairLen: 6, trailColor: new THREE.Color(0x9fd8ff) },
  thietve: { robe: 0x4f5560, trim: 0xb0b8c0, inner: 0x2c3038, hair: 0x141414, skin: 0xe2c0a2, accent: 0xb0b8c0, weapon: 'spear', bulk: 1.15, hairLen: 4, crown: true, trailColor: new THREE.Color(0xd8e0e8) },
  anhkiem: { robe: 0x1d2433, trim: 0x6fb7ff, inner: 0x101522, hair: 0x0c0c10, skin: 0xe8cdb8, accent: 0x6fb7ff, weapon: 'blade', hairLen: 8, mask: 0x2a3550, trailColor: new THREE.Color(0x8fc8ff) },
  uhon: { robe: 0x2c2448, trim: 0x9fa8ff, inner: 0x1a1630, hair: 0xe8e8f0, skin: 0xe6d6e6, accent: 0x9fa8ff, weapon: 'staff', orb: 0x9fa8ff, hairLen: 8, trailColor: new THREE.Color(0xa8b0ff) },
  loiton: { robe: 0x1b2350, trim: 0xffe08a, inner: 0x101633, hair: 0xf0f0f8, skin: 0xf0d6c4, accent: 0xffe08a, weapon: 'staff', orb: 0xfff2a8, hairLen: 9, crown: true, trailColor: new THREE.Color(0xfff0a0) },
  kimcuong: { robe: 0x8a6a2a, trim: 0xfff0c0, inner: 0x4a3818, hair: 0x101010, skin: 0xd8b090, accent: 0xffe08a, weapon: 'spear', bulk: 1.25, hairLen: 3, crown: true, trailColor: new THREE.Color(0xffe8a0) },
  hoaton: { robe: 0xb8321e, trim: 0xffd27a, inner: 0x5a120c, hair: 0xf8f0e8, skin: 0xf3d2bc, accent: 0xffd27a, weapon: 'staff', orb: 0xffc04a, hairLen: 9, crown: true, trailColor: new THREE.Color(0xffc060) },
  // Yêu thú (chỉ xuất hiện ở vòng yêu thú)
  yeulang: { robe: 0x3c4048, trim: 0x8fb8d8, inner: 0x24272e, hair: 0x9aa4b0, skin: 0x8a8f98, accent: 0x8fb8d8, weapon: 'claws', bulk: 1.05, hairLen: 3, mask: 0x1c1f26, trailColor: new THREE.Color(0xa8c8e8) },
  yeuvuong: { robe: 0x24382a, trim: 0x7fe08a, inner: 0x16241a, hair: 0x3a5a3a, skin: 0x7a8a6a, accent: 0x7fe08a, weapon: 'claws', bulk: 1.45, hairLen: 4, crown: true, mask: 0x101810, trailColor: new THREE.Color(0x9fffa0) },
  // ---- V1.5: tướng mới (mô hình thủ tục dùng chung, phân biệt bằng trang phục / vũ khí / màu / kích thước)
  thanhmoc: { robe: 0x4f7a3a, trim: 0xc8e6a0, inner: 0x2e4a24, hair: 0x2a2016, skin: 0xf0d6c0, accent: 0xa8e07a, weapon: 'staff', orb: 0x9fe08a, hairLen: 7, trailColor: new THREE.Color(0xb0f0a0) },
  mabinh: { robe: 0x3a2024, trim: 0x9a3a30, inner: 0x241215, hair: 0x101010, skin: 0xd8b8a0, accent: 0xc04a3a, weapon: 'blade', hairLen: 4, mask: 0x2a1214, trailColor: new THREE.Color(0xff6a4a) },
  linhcung: { robe: 0x6a5a3a, trim: 0xe0c890, inner: 0x3e3420, hair: 0x3a2414, skin: 0xf2d6c2, accent: 0xf0d890, weapon: 'bow', hairLen: 7, trailColor: new THREE.Color(0xffe8a8) },
  thanhphong: { robe: 0xdfeee8, trim: 0x5fc8a0, inner: 0x2f6a58, hair: 0x18120e, skin: 0xf2d6c2, accent: 0x7fe0c0, weapon: 'sword', hairLen: 8, trailColor: new THREE.Color(0xa0ffe0) },
  huyengiap: { robe: 0x3a4a5a, trim: 0x9fb8d0, inner: 0x22303c, hair: 0x141414, skin: 0xe2c0a2, accent: 0xb8d0e8, weapon: 'spear', bulk: 1.18, hairLen: 4, crown: true, trailColor: new THREE.Color(0xc8dcf0) },
  bangling: { robe: 0xcfe6f6, trim: 0x7fc8ff, inner: 0x3a6a8e, hair: 0xe8f4ff, skin: 0xf4e0d4, accent: 0xa8dcff, weapon: 'staff', orb: 0xbfe8ff, hairLen: 9, trailColor: new THREE.Color(0xc8ecff) },
  huyetma: { robe: 0x4a1418, trim: 0xff4a4a, inner: 0x2a0a0c, hair: 0x2a0808, skin: 0xc8a090, accent: 0xff4a4a, weapon: 'claws', bulk: 1.12, hairLen: 6, mask: 0x200808, trailColor: new THREE.Color(0xff3030) },
  loithuong: { robe: 0x2a3450, trim: 0x9fd0ff, inner: 0x1a2034, hair: 0x101418, skin: 0xf0d0b8, accent: 0xbfe0ff, weapon: 'spear', bulk: 1.05, hairLen: 5, crown: true, trailColor: new THREE.Color(0xb0d8ff) },
  linhy: { robe: 0xf2ece0, trim: 0xe08aa0, inner: 0x8a5060, hair: 0x3a2018, skin: 0xf6dccc, accent: 0xffb0c8, weapon: 'staff', orb: 0xffc0d8, hairLen: 9, trailColor: new THREE.Color(0xffd0e0) },
  ngukiem: { robe: 0xe8eef8, trim: 0x6a8ad8, inner: 0x2e3e6a, hair: 0xd8dce8, skin: 0xf0d6c4, accent: 0xa8c0ff, weapon: 'sword', hairLen: 9, crown: true, trailColor: new THREE.Color(0xb8d0ff) },
  cuuviem: { robe: 0x6a1a10, trim: 0xff8a3a, inner: 0x3a0e08, hair: 0x1a0a08, skin: 0xf0c8b0, accent: 0xffb04a, weapon: 'staff', orb: 0xff6a2a, hairLen: 8, crown: true, trailColor: new THREE.Color(0xff8a40) },
  anhsat: { robe: 0x14161e, trim: 0x8a6aff, inner: 0x0c0d12, hair: 0x08080c, skin: 0xdcc4b4, accent: 0x9a7aff, weapon: 'blade', hairLen: 7, mask: 0x1a1a2a, trailColor: new THREE.Color(0xa890ff) },
  huyenbang: { robe: 0xf4f8ff, trim: 0x9fd8ff, inner: 0x6a9ec8, hair: 0xf8fbff, skin: 0xf6e6e0, accent: 0xcfeeff, weapon: 'staff', orb: 0xdff4ff, hairLen: 10, crown: true, trailColor: new THREE.Color(0xe0f6ff) },
  vocuc: { robe: 0x1c1c2a, trim: 0xd8d8ff, inner: 0x30305a, hair: 0xe0e0f0, skin: 0xf0d6c4, accent: 0xffffff, weapon: 'sword', hairLen: 9, crown: true, trailColor: new THREE.Color(0xe8e8ff) },
  batdiet: { robe: 0x7a3a1a, trim: 0xffc070, inner: 0x4a2410, hair: 0x140c08, skin: 0xc89070, accent: 0xffd080, weapon: 'spear', bulk: 1.4, hairLen: 3, crown: true, trailColor: new THREE.Color(0xffc070) },
  umaquan: { robe: 0x1e1430, trim: 0xb07cff, inner: 0x120a20, hair: 0x8a6aaa, skin: 0xcfc0d8, accent: 0xd0a0ff, weapon: 'staff', orb: 0xc080ff, hairLen: 9, crown: true, mask: 0x2a1a3a, trailColor: new THREE.Color(0xc08cff) },
  thannu: { robe: 0xfff4e0, trim: 0xffd27a, inner: 0xd8a85a, hair: 0xfff0d8, skin: 0xf6e2d6, accent: 0xffe8a0, weapon: 'staff', orb: 0xfff0b0, hairLen: 11, crown: true, trailColor: new THREE.Color(0xfff0c0) },
  hondon: { robe: 0x140a16, trim: 0xff3a6a, inner: 0x0a050c, hair: 0x2a0a20, skin: 0xa89098, accent: 0xff4a8a, weapon: 'claws', bulk: 1.35, hairLen: 8, crown: true, mask: 0x200a18, trailColor: new THREE.Color(0xff3a7a) }
};

/** Vai trò: cách chọn mục tiêu, giữ vị trí và kháng khống chế (tenacity nhân thời gian bị choáng / đóng băng). */
const ROLES = {
  tank: { name: 'Đỡ đòn', tenacity: 0.6 },
  fighter: { name: 'Đấu sĩ', tenacity: 0.85 },
  assassin: { name: 'Sát thủ', tenacity: 1 },
  mage: { name: 'Pháp sư', tenacity: 1 },
  marksman: { name: 'Xạ thủ', tenacity: 1 },
  support: { name: 'Hỗ trợ', tenacity: 0.9 }
};
/** Hệ số nâng sao (chỉnh ở đây để cân bằng). skill nhân sức mạnh kỹ năng (sát thương kỹ năng, hồi máu, lá chắn); scale = kích thước mô hình. */
const STAR = { hp: [0, 1, 1.8, 3.2], atk: [0, 1, 1.5, 2.5], skill: [0, 1, 1.15, 1.4], scale: [0, 1, 1.12, 1.24] };
const STAR_SCALE = STAR.scale;
const RARITY = ['', 'Phàm phẩm', 'Linh phẩm', 'Huyền phẩm', 'Địa phẩm', 'Thiên phẩm'];
const RARITY_COLOR = ['', '#a8c0bb', '#7cc4ff', '#c9a0ff', '#f0b44a', '#ff7a5a'];
/** Tộc (nguồn gốc). V1.5 tuần 2: 4 tộc có cộng hưởng (js/data/traits.js). Tộc "Linh" của tuần 1 được gộp: Hỏa Linh, Băng Linh,
 *  Cửu Viêm → Yêu Tộc; Thanh Mộc → Tiên Tộc (giữ dấu vết ở phân loại phụ sub: ['linh']). */
const ORIGINS = { nhan: 'Nhân Tộc', tien: 'Tiên Tộc', ma: 'Ma Tộc', yeu: 'Yêu Tộc' };
/** Cấu hình animation (tên clip logic – rig thủ tục có tư thế cùng tên; GLB nhận clip theo tên này). */
const ANIM = {
  melee: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack01', 'Attack02', 'Attack03', 'HeavyAttack'], cast: 'Attack03', hit: 'Hit', death: 'Death', victory: 'Victory' },
  heavy: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack01', 'HeavyAttack', 'Attack02', 'HeavyAttack'], cast: 'HeavyAttack', hit: 'Hit', death: 'Death', victory: 'Victory' },
  caster: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack01', 'Attack02', 'Attack03', 'HeavyAttack'], cast: 'SkillCast', hit: 'Hit', death: 'Death', victory: 'Victory' },
  archer: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack01', 'Attack02', 'Attack01', 'HeavyAttack'], cast: 'SkillCast', hit: 'Hit', death: 'Death', victory: 'Victory' },
  ultimate: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack01', 'Attack02', 'Attack03', 'HeavyAttack'], cast: 'UltimateCast', hit: 'Hit', death: 'Death', victory: 'Victory' }
};

/* ---------- 24 tướng ----------
 * id, name, cost (1–5), origin (tộc), traits (hệ, ≥ 1), sub (phân loại phụ – chỉ hiển thị), role, hp / atk / def (giáp) / ap (sức mạnh phép thuật, 100 = ×1) / mr (kháng phép), chỉ số gốc ★1, mana0/mana (năng lượng đầu / tối đa), crit / critDmg,
 * dodge (né đòn thường), skill (id trong SKILLS), ranged (kiểu đạn đánh thường; không có = cận chiến), dash (lướt khi xa),
 * poise (≥ 85 không bị hất lùi), passive (nội tại), color (màu đại diện), model (ngoại hình + chỗ gắn GLB riêng), anim (preset). */
const CHAMPIONS = [
  // ---- Bậc 1 – Phàm phẩm
  { id: 'kiemdong', name: 'Kiếm Đồng', cost: 1, origin: 'nhan', traits: ['kiemtu'], role: 'fighter', hp: 600, atk: 52, def: 20, ap: 100, mr: 20, aspd: 0.95, range: 2.2, speed: 4.4, mana0: 20, mana: 60, crit: 0.1, critDmg: 1.5, dodge: 0.08, skill: 'nhatKiem', poise: 40, color: '#9fd8ff', model: { look: 'kiemdong', scale: 0.95 }, anim: 'melee' },
  { id: 'thietve', name: 'Thiết Vệ', cost: 1, origin: 'nhan', traits: ['hophap'], role: 'tank', hp: 920, atk: 40, def: 40, ap: 100, mr: 30, aspd: 0.8, range: 2.6, speed: 3.8, mana0: 30, mana: 80, crit: 0.05, critDmg: 1.5, dodge: 0, skill: 'thietBich', poise: 80, color: '#b0b8c0', model: { look: 'thietve', scale: 1 }, anim: 'heavy' },
  { id: 'hoa', name: 'Hỏa Linh', cost: 1, origin: 'yeu', traits: ['phaptu', 'dantu'], sub: ['linh'], role: 'mage', hp: 560, atk: 46, def: 14, ap: 100, mr: 20, aspd: 0.75, range: 7.5, speed: 3.6, mana0: 30, mana: 70, crit: 0.08, critDmg: 1.5, dodge: 0.03, skill: 'hoaCau', ranged: 'fire', poise: 30, color: '#ffb347', model: { look: 'hoa', scale: 0.95 }, anim: 'caster' },
  { id: 'thanhmoc', name: 'Thanh Mộc', cost: 1, origin: 'tien', traits: ['dantu'], sub: ['linh'], role: 'support', hp: 560, atk: 32, def: 18, ap: 100, mr: 25, aspd: 0.75, range: 6.5, speed: 3.6, mana0: 20, mana: 70, crit: 0.05, critDmg: 1.5, dodge: 0.03, skill: 'mocLinh', ranged: 'wood', poise: 30, color: '#a8e07a', model: { look: 'thanhmoc', scale: 0.95 }, anim: 'caster' },
  { id: 'mabinh', name: 'Ma Binh', cost: 1, origin: 'ma', traits: ['kiemtu'], role: 'fighter', hp: 640, atk: 50, def: 18, ap: 100, mr: 20, aspd: 1.0, range: 2.2, speed: 4.4, mana0: 10, mana: 60, crit: 0.12, critDmg: 1.5, dodge: 0.05, skill: 'huyetChien', poise: 40, passive: { lowHpAtk: 0.6 }, color: '#c04a3a', model: { look: 'mabinh', scale: 0.98 }, anim: 'melee' },
  { id: 'linhcung', name: 'Linh Cung', cost: 1, origin: 'yeu', traits: ['phaptu'], sub: ['xatu'], role: 'marksman', hp: 520, atk: 52, def: 14, ap: 100, mr: 15, aspd: 0.88, range: 9, speed: 3.8, mana0: 0, mana: 70, crit: 0.15, critDmg: 1.6, dodge: 0.05, skill: 'lienChau', ranged: 'arrow', poise: 30, color: '#f0d890', model: { look: 'linhcung', scale: 0.95 }, anim: 'archer' },
  // ---- Bậc 2 – Linh phẩm
  { id: 'thanhphong', name: 'Thanh Phong Kiếm Khách', short: 'Thanh Phong', cost: 2, origin: 'nhan', traits: ['kiemtu'], role: 'fighter', hp: 700, atk: 60, def: 22, ap: 100, mr: 22, aspd: 1.05, range: 2.2, speed: 4.6, mana0: 20, mana: 70, crit: 0.15, critDmg: 1.6, dodge: 0.1, skill: 'lienTram', poise: 45, color: '#7fe0c0', model: { look: 'thanhphong', scale: 1 }, anim: 'melee' },
  { id: 'huyengiap', name: 'Huyền Giáp Vệ', short: 'Huyền Giáp', cost: 2, origin: 'yeu', traits: ['hophap'], role: 'tank', hp: 1050, atk: 42, def: 45, ap: 100, mr: 35, aspd: 0.8, range: 2.6, speed: 3.8, mana0: 40, mana: 100, crit: 0.05, critDmg: 1.5, dodge: 0, skill: 'hoThe', poise: 85, color: '#b8d0e8', model: { look: 'huyengiap', scale: 1.02 }, anim: 'heavy' },
  { id: 'bangling', name: 'Băng Linh Sư', short: 'Băng Linh', cost: 2, origin: 'yeu', traits: ['phaptu'], sub: ['linh'], role: 'mage', hp: 640, atk: 48, def: 15, ap: 100, mr: 22, aspd: 0.8, range: 7.5, speed: 3.6, mana0: 30, mana: 70, crit: 0.08, critDmg: 1.5, dodge: 0.03, skill: 'hanBang', ranged: 'ice', poise: 30, color: '#a8dcff', model: { look: 'bangling', scale: 1 }, anim: 'caster' },
  { id: 'huyetma', name: 'Huyết Ma', cost: 2, origin: 'ma', traits: ['hophap'], role: 'fighter', hp: 800, atk: 52, def: 22, ap: 100, mr: 25, aspd: 0.9, range: 2.2, speed: 4.2, mana0: 20, mana: 70, crit: 0.1, critDmg: 1.5, dodge: 0.05, skill: 'huyetPhe', poise: 50, color: '#ff4a4a', model: { look: 'huyetma', scale: 1.02 }, anim: 'melee' },
  { id: 'loithuong', name: 'Lôi Thương', cost: 2, origin: 'nhan', traits: ['hophap'], sub: ['thuongtu'], role: 'fighter', hp: 780, atk: 58, def: 32, ap: 100, mr: 25, aspd: 0.85, range: 2.8, speed: 4.2, mana0: 20, mana: 70, crit: 0.1, critDmg: 1.5, dodge: 0.05, skill: 'loiThuong', poise: 55, color: '#bfe0ff', model: { look: 'loithuong', scale: 1 }, anim: 'heavy' },
  { id: 'linhy', name: 'Linh Y', cost: 2, origin: 'tien', traits: ['dantu'], role: 'support', hp: 660, atk: 36, def: 18, ap: 100, mr: 28, aspd: 0.75, range: 6.5, speed: 3.6, mana0: 30, mana: 80, crit: 0.05, critDmg: 1.5, dodge: 0.03, skill: 'dieuThu', ranged: 'light', poise: 30, color: '#ffb0c8', model: { look: 'linhy', scale: 0.97 }, anim: 'caster' },
  // ---- Bậc 3 – Huyền phẩm
  { id: 'ngukiem', name: 'Ngự Kiếm Chân Nhân', short: 'Ngự Kiếm', cost: 3, origin: 'tien', traits: ['kiemtu'], role: 'mage', hp: 760, atk: 58, def: 22, ap: 100, mr: 25, aspd: 0.85, range: 5.5, speed: 3.8, mana0: 30, mana: 80, crit: 0.12, critDmg: 1.6, dodge: 0.05, skill: 'nguKiem', ranged: 'sword', poise: 40, color: '#a8c0ff', model: { look: 'ngukiem', scale: 1.02 }, anim: 'caster' },
  { id: 'cuuviem', name: 'Cửu Viêm Pháp Sư', short: 'Cửu Viêm', cost: 3, origin: 'yeu', traits: ['phaptu'], sub: ['linh'], role: 'mage', hp: 740, atk: 60, def: 18, ap: 100, mr: 22, aspd: 0.8, range: 7.5, speed: 3.6, mana0: 30, mana: 80, crit: 0.1, critDmg: 1.5, dodge: 0.03, skill: 'cuuViem', ranged: 'fire', poise: 35, color: '#ff8a3a', model: { look: 'cuuviem', scale: 1.02 }, anim: 'caster' },
  { id: 'kimcuong', name: 'Kim Cang Hộ Pháp', short: 'Kim Cang', cost: 3, origin: 'nhan', traits: ['hophap'], role: 'tank', hp: 1300, atk: 50, def: 50, ap: 100, mr: 40, aspd: 0.8, range: 2.6, speed: 3.8, mana0: 40, mana: 90, crit: 0.05, critDmg: 1.5, dodge: 0, skill: 'kimCang', poise: 95, color: '#ffe08a', model: { look: 'kimcuong', scale: 1.04 }, anim: 'heavy' },
  { id: 'anhsat', name: 'Ảnh Sát', cost: 3, origin: 'ma', traits: ['kiemtu'], sub: ['sattu'], role: 'assassin', hp: 680, atk: 64, def: 20, ap: 100, mr: 20, aspd: 1.1, range: 2.2, speed: 5.0, mana0: 10, mana: 70, crit: 0.25, critDmg: 1.7, dodge: 0.2, skill: 'anhTap', dash: true, poise: 40, color: '#9a7aff', model: { look: 'anhsat', scale: 1 }, anim: 'melee' },
  { id: 'huyenbang', name: 'Huyền Băng Tiên Tử', short: 'Huyền Băng', cost: 3, origin: 'tien', traits: ['phaptu'], role: 'mage', hp: 740, atk: 56, def: 18, ap: 100, mr: 28, aspd: 0.8, range: 7.5, speed: 3.6, mana0: 40, mana: 90, crit: 0.08, critDmg: 1.5, dodge: 0.03, skill: 'huyenBang', ranged: 'ice', poise: 35, color: '#cfeeff', model: { look: 'huyenbang', scale: 1.02 }, anim: 'caster' },
  // ---- Bậc 4 – Địa phẩm
  { id: 'vocuc', name: 'Vô Cực Kiếm Tôn', short: 'Vô Cực', cost: 4, origin: 'ma', traits: ['kiemtu'], role: 'fighter', hp: 1000, atk: 68, def: 30, ap: 100, mr: 30, aspd: 1.0, range: 2.4, speed: 4.6, mana0: 30, mana: 80, crit: 0.2, critDmg: 1.7, dodge: 0.1, skill: 'voCucKiem', dash: true, poise: 55, color: '#e8e8ff', model: { look: 'vocuc', scale: 1.06 }, anim: 'melee' },
  { id: 'loiton', name: 'Thiên Lôi Đạo Nhân', short: 'Thiên Lôi', cost: 4, origin: 'nhan', traits: ['phaptu'], role: 'mage', hp: 880, atk: 66, def: 22, ap: 100, mr: 30, aspd: 0.8, range: 8, speed: 3.6, mana0: 40, mana: 90, crit: 0.1, critDmg: 1.5, dodge: 0.03, skill: 'cuuThienLoi', ranged: 'thunder', poise: 40, color: '#ffe08a', model: { look: 'loiton', scale: 1.06 }, anim: 'caster' },
  { id: 'batdiet', name: 'Bất Diệt Chiến Thần', short: 'Bất Diệt', cost: 4, origin: 'yeu', traits: ['hophap', 'dantu'], sub: ['thetu'], role: 'tank', hp: 1400, atk: 62, def: 45, ap: 100, mr: 40, aspd: 0.85, range: 2.4, speed: 4.0, mana0: 40, mana: 100, crit: 0.08, critDmg: 1.5, dodge: 0, skill: 'batDiet', poise: 95, passive: { regen: 0.004 }, color: '#ffc070', model: { look: 'batdiet', scale: 1.08 }, anim: 'heavy' },
  { id: 'umaquan', name: 'U Minh Ma Quân', short: 'U Minh Quân', cost: 4, origin: 'ma', traits: ['phaptu'], role: 'mage', hp: 860, atk: 64, def: 24, ap: 100, mr: 30, aspd: 0.8, range: 7, speed: 3.6, mana0: 30, mana: 90, crit: 0.1, critDmg: 1.5, dodge: 0.03, skill: 'uMinhPhe', ranged: 'nether', poise: 45, color: '#c080ff', model: { look: 'umaquan', scale: 1.06 }, anim: 'caster' },
  // ---- Bậc 5 – Thiên phẩm (huyền thoại)
  { id: 'kiemtien', name: 'Vạn Kiếm Tiên Đế', short: 'Kiếm Đế', cost: 5, origin: 'tien', traits: ['kiemtu'], role: 'fighter', hp: 1000, atk: 76, def: 28, ap: 100, mr: 30, aspd: 1.0, range: 2.2, speed: 4.6, mana0: 45, mana: 100, crit: 0.15, critDmg: 1.7, dodge: 0.1, skill: 'vanKiem', dash: true, poise: 50, color: '#9fd8ff', model: { look: 'kiemtien', scale: 1.1 }, anim: 'ultimate' },
  { id: 'thannu', name: 'Cửu Thiên Thần Nữ', short: 'Thần Nữ', cost: 5, origin: 'tien', traits: ['phaptu', 'dantu'], role: 'support', hp: 1050, atk: 70, def: 26, ap: 100, mr: 35, aspd: 0.8, range: 7.5, speed: 3.6, mana0: 40, mana: 100, crit: 0.1, critDmg: 1.5, dodge: 0.03, skill: 'cuuThien', ranged: 'light', poise: 50, color: '#fff0b0', model: { look: 'thannu', scale: 1.1 }, anim: 'ultimate' },
  { id: 'hondon', name: 'Hỗn Độn Ma Đế', short: 'Ma Đế', cost: 5, origin: 'ma', traits: ['hophap'], role: 'fighter', hp: 1250, atk: 76, def: 34, ap: 100, mr: 30, aspd: 0.9, range: 2.6, speed: 4.4, mana0: 30, mana: 100, crit: 0.15, critDmg: 1.7, dodge: 0.05, skill: 'honDon', dash: true, poise: 90, color: '#ff4a8a', model: { look: 'hondon', scale: 1.12 }, anim: 'ultimate' }
];

/* ---------- Phe địch (không bán ở cửa hàng): ma đạo và yêu thú ---------- */
const ENEMY_DEFS = [
  { id: 'mathu', name: 'Ma Thú Hống', short: 'Ma Thú', origin: 'yeu', traits: ['hophap'], role: 'tank', hp: 1250, atk: 46, def: 38, ap: 100, mr: 35, aspd: 0.75, range: 2.4, speed: 3.6, mana0: 25, mana: 90, crit: 0.05, critDmg: 1.5, dodge: 0, skill: 'phaDia', poise: 90, color: '#a83a2a', model: { look: 'mathu', scale: 1 }, anim: 'heavy' },
  { id: 'huyetkiem', name: 'Huyết Ảnh Kiếm Khách', short: 'Huyết Ảnh', origin: 'ma', traits: ['kiemtu'], role: 'assassin', hp: 700, atk: 58, def: 22, ap: 100, mr: 20, aspd: 1.05, range: 2.2, speed: 4.8, mana0: 20, mana: 80, crit: 0.15, critDmg: 1.6, dodge: 0.15, skill: 'huyetAnh', dash: true, poise: 45, color: '#c2302a', model: { look: 'huyetkiem', scale: 1 }, anim: 'melee' },
  { id: 'uminh', name: 'U Minh Ma Tu', short: 'U Minh', origin: 'ma', traits: ['phaptu'], role: 'mage', hp: 520, atk: 48, def: 14, ap: 100, mr: 25, aspd: 0.8, range: 7.5, speed: 3.5, mana0: 20, mana: 80, crit: 0.08, critDmg: 1.5, dodge: 0.03, skill: 'uMinh', ranged: 'nether', poise: 30, color: '#b07cff', model: { look: 'uminh', scale: 1 }, anim: 'caster' },
  { id: 'yeulang', name: 'Yêu Lang', origin: 'yeu', traits: [], role: 'assassin', hp: 520, atk: 40, def: 12, ap: 100, mr: 15, aspd: 1.0, range: 2.2, speed: 4.8, mana0: 0, mana: 60, crit: 0.1, critDmg: 1.5, dodge: 0.1, skill: 'huyetAnh', dash: true, poise: 30, monster: true, color: '#8fb8d8', model: { look: 'yeulang', scale: 1 }, anim: 'melee' },
  { id: 'yeuvuong', name: 'Yêu Thú Vương', origin: 'yeu', traits: [], role: 'tank', hp: 1400, atk: 55, def: 30, ap: 100, mr: 30, aspd: 0.8, range: 2.4, speed: 3.8, mana0: 20, mana: 90, crit: 0.08, critDmg: 1.5, dodge: 0, skill: 'phaDia', poise: 90, monster: true, color: '#7fe08a', model: { look: 'yeuvuong', scale: 1 }, anim: 'heavy' }
];

/** Bảng tra theo id – mọi hệ thống khác dùng UNIT_DEFS[id]. look / anim được trải phẳng để code cũ vẫn chạy. */
const UNIT_DEFS = {};
for (const c of CHAMPIONS.concat(ENEMY_DEFS)) {
  UNIT_DEFS[c.id] = Object.assign({}, c, { look: c.model.look, rarity: c.cost ? RARITY[c.cost] : '', animSet: ANIM[c.anim] || ANIM.melee });
}
const CHAMPION_KEYS = CHAMPIONS.map(c => c.id);
const championsByCost = cost => CHAMPIONS.filter(c => c.cost === cost).map(c => c.id);

/** Bản lưu cũ (trước V1.5): tướng đã gỡ khỏi cửa hàng → tướng mới cùng bậc giá & vai trò gần nhất (giữ sao, trang bị). */
const LEGACY_MAP = { loi: 'bangling', hophap: 'thietve', anhkiem: 'huyetma', uhon: 'huyenbang', hoaton: 'thannu', uminh: 'huyetma', huyetkiem: 'anhsat', mathu: 'kimcuong' };
/** Đổi id cũ sang id hiện hành cho tướng của người chơi (null nếu không dùng được). */
function migrateChampionKey(k) {
  if (UNIT_DEFS[k] && UNIT_DEFS[k].cost) return k;
  const m = LEGACY_MAP[k];
  return m && UNIT_DEFS[m] && UNIT_DEFS[m].cost ? m : null;
}

/** Kiểm tra dữ liệu tướng: trả về danh sách lỗi (rỗng = hợp lệ). Gọi lúc khởi động và trong bài kiểm thử. */
function validateChampions() {
  const errs = [], need = ['id', 'name', 'origin', 'traits', 'role', 'hp', 'atk', 'def', 'ap', 'mr', 'aspd', 'range', 'speed', 'mana0', 'mana', 'crit', 'critDmg', 'dodge', 'skill', 'poise', 'color', 'model', 'anim'];
  const ids = new Set();
  for (const c of CHAMPIONS.concat(ENEMY_DEFS)) {
    for (const k of need) if (c[k] === undefined || c[k] === null) errs.push(c.id + ': thiếu ' + k);
    if (ids.has(c.id)) errs.push('trùng id ' + c.id); ids.add(c.id);
    if (!ROLES[c.role]) errs.push(c.id + ': vai trò lạ ' + c.role);
    if (!LOOKS[c.model.look]) errs.push(c.id + ': không có ngoại hình ' + c.model.look);
    if (!ANIM[c.anim]) errs.push(c.id + ': không có preset animation ' + c.anim);
    if (!(c.hp > 0 && c.atk > 0 && c.def >= 0 && c.ap > 0 && c.mr >= 0 && c.aspd > 0 && c.range > 0 && c.speed > 0)) errs.push(c.id + ': chỉ số không hợp lệ');
    if (!(c.mana > 0 && c.mana0 >= 0 && c.mana0 < c.mana)) errs.push(c.id + ': năng lượng không hợp lệ');
    if (!(c.crit >= 0 && c.crit < 1 && c.critDmg >= 1 && c.dodge >= 0 && c.dodge < 0.5)) errs.push(c.id + ': chí mạng / né không hợp lệ');
    if (typeof SKILLS !== 'undefined' && !SKILLS[c.skill]) errs.push(c.id + ': không có kỹ năng ' + c.skill);
    if (typeof TRAITS !== 'undefined') for (const t of c.traits) if (!TRAITS[t]) errs.push(c.id + ': hệ lạ ' + t);
    if (!ORIGINS[c.origin]) errs.push(c.id + ': tộc lạ ' + c.origin);
  }
  if (typeof TraitRegistry !== 'undefined') errs.push(...TraitRegistry.validate(CHAMPIONS));
  const perCost = [0, 6, 6, 5, 4, 3];
  for (let t = 1; t <= 5; t++) if (championsByCost(t).length !== perCost[t]) errs.push(`bậc ${t}: có ${championsByCost(t).length} tướng, cần ${perCost[t]}`);
  if (CHAMPIONS.length !== 24) errs.push('cần 24 tướng, đang có ' + CHAMPIONS.length);
  return errs;
}
