// Vạn Kiếm Kỳ Trận – Dữ liệu trang bị V1.6: 8 nguyên liệu, 36 pháp bảo (ghép 2 nguyên liệu, không phân biệt thứ tự), loại nội tại.
// Chỉ là DỮ LIỆU + mô tả sinh từ tham số (tooltip luôn khớp logic). Logic: js/items/artifact-system.js (kho, ghép, trang bị),
// js/items/artifact-passives.js (nội tại trong trận). Nạp sau js/data/traits.js. Script thường (không phải module).
'use strict';

/** Nhóm chỉ số trang bị (lớp "trang bị" của quy trình chỉ số). Cộng thẳng: atk, ap, def, mr, hp, mana; phần trăm cộng dồn: aspd, crit, critDmg, ls, omni, skillDmg. */
const ITEM_STATS = {
  atk: { name: 'Công', fmt: v => '+' + v },
  ap: { name: 'Phép thuật', fmt: v => '+' + v },
  aspd: { name: 'Tốc đánh', fmt: v => '+' + Math.round(v * 100) + '%' },
  def: { name: 'Giáp', fmt: v => '+' + v },
  mr: { name: 'Kháng phép', fmt: v => '+' + v },
  mana: { name: 'Năng lượng khởi đầu', fmt: v => '+' + v },
  hp: { name: 'Máu', fmt: v => '+' + v },
  crit: { name: 'Chí mạng', fmt: v => '+' + Math.round(v * 100) + '%' },
  critDmg: { name: 'Sát thương chí mạng', fmt: v => '+' + Math.round(v * 100) + '%' },
  ls: { name: 'Hút máu (đòn đánh)', fmt: v => '+' + Math.round(v * 100) + '%' },
  omni: { name: 'Hút máu toàn phần', fmt: v => '+' + Math.round(v * 100) + '%' },
  skillDmg: { name: 'Sát thương kỹ năng', fmt: v => '+' + Math.round(v * 100) + '%' }
};
const statText = s => Object.keys(ITEM_STATS).filter(k => s[k]).map(k => ITEM_STATS[k].fmt(s[k]) + ' ' + ITEM_STATS[k].name).join(' · ');

/** 8 nguyên liệu. group = nhóm VFX của pháp bảo có nguyên liệu này đứng đầu công thức. */
const COMPONENTS = {
  sword:   { id: 'sword',   name: 'Linh Kiếm',      glyph: '剑', color: '#ff9a6a', stats: { atk: 10 },    desc: 'Kiếm luyện từ linh thiết – tăng công.' },
  staff:   { id: 'staff',   name: 'Pháp Trượng',    glyph: '杖', color: '#c39bff', stats: { ap: 10 },     desc: 'Trượng dẫn linh lực – tăng phép thuật.' },
  bow:     { id: 'bow',     name: 'Thần Cung',      glyph: '弓', color: '#e9e3a0', stats: { aspd: 0.10 }, desc: 'Cung nhẹ như gió – tăng tốc đánh.' },
  armor:   { id: 'armor',   name: 'Huyền Giáp',     glyph: '甲', color: '#b8c4cc', stats: { def: 20 },    desc: 'Giáp huyền thiết – tăng giáp.' },
  cloak:   { id: 'cloak',   name: 'Linh Bào',       glyph: '袍', color: '#8fd3ff', stats: { mr: 20 },     desc: 'Áo bào dệt linh tơ – tăng kháng phép.' },
  crystal: { id: 'crystal', name: 'Linh Tinh',      glyph: '晶', color: '#7fe6ff', stats: { mana: 15 },   desc: 'Tinh thể tụ linh khí – thêm năng lượng khởi đầu.' },
  jade:    { id: 'jade',    name: 'Sinh Mệnh Ngọc', glyph: '玉', color: '#7fe0a0', stats: { hp: 150 },    desc: 'Ngọc chứa sinh khí – tăng máu.' },
  glove:   { id: 'glove',   name: 'Thiên Cơ Thủ',   glyph: '手', color: '#ffd166', stats: { crit: 0.10 }, desc: 'Găng tay thiên cơ – tăng chí mạng.' }
};
const COMPONENT_KEYS = Object.keys(COMPONENTS);

/** Loại nội tại. text(p) sinh mô tả từ đúng tham số mà logic dùng; trigger / limit cho tooltip; chain = có thể kích hoạt sự kiện tiếp theo không.
 *  Quy tắc chung (artifact-passives.js): nội tại "theo đòn đánh" chỉ chạy với ĐÒN ĐÁNH THƯỜNG (không phải sát thương phụ / theo thời gian);
 *  mọi sát thương do nội tại gây ra đánh dấu proc → KHÔNG kích hoạt lại nội tại nào (chặn vòng lặp vô hạn). */
const PASSIVE_KINDS = {
  stat:          { trigger: 'Luôn có',                 limit: 'Chỉ số – cộng dồn khi mang nhiều bản', chain: 'Không', text: () => 'Hiệu ứng chỉ số đặc biệt (xem chỉ số).' },
  rampAtk:       { trigger: 'Mỗi {every} giây trong trận', limit: 'Tối đa {max} lần', chain: 'Không', text: p => `Mỗi ${p.every} giây trong trận: +${artPct(p.pct)} công (tối đa ${p.max} lần = +${artPct(p.pct * p.max)}).` },
  chainBolt:     { trigger: 'Mỗi đòn đánh thứ {nth}',   limit: '1 lần / {nth} đòn', chain: 'Không (sét là sát thương phụ)', text: p => `Mỗi đòn đánh thứ ${p.nth}: sét gây ${artPct(p.mult)} công sát thương phép lên mục tiêu và 1 kẻ địch gần nó (≤ ${p.radius} m).` },
  aspdStack:     { trigger: 'Đòn đánh trúng',           limit: 'Tối đa {max} lần cộng dồn / trận', chain: 'Không', text: p => `Mỗi đòn đánh trúng: +${artPct(p.pct)} tốc đánh, cộng dồn tối đa ${p.max} lần (+${artPct(p.pct * p.max)}) tới hết trận.` },
  shredOnHit:    { trigger: 'Đòn đánh trúng',           limit: 'Không cộng dồn (lấy hiệu ứng mạnh nhất)', chain: 'Không', text: p => `Đòn đánh giảm ${artPct(p.pct)} ${p.stat === 'def' ? 'giáp' : 'kháng phép'} của mục tiêu trong ${p.dur} giây.` },
  shredOnSkill:  { trigger: 'Kỹ năng trúng địch',       limit: 'Không cộng dồn (lấy hiệu ứng mạnh nhất)', chain: 'Không', text: p => `Kỹ năng giảm ${artPct(p.pct)} ${p.stat === 'mr' ? 'kháng phép' : 'giáp'} của mọi kẻ địch trúng chiêu trong ${p.dur} giây.` },
  lowHpShield:   { trigger: 'Máu xuống dưới {below%}',  limit: '1 lần / trận', chain: 'Không', text: p => `Lần đầu máu dưới ${artPct(p.below)}: nhận lá chắn ${artPct(p.pct)} máu tối đa trong ${p.dur} giây (1 lần mỗi trận).` },
  manaOnHit:     { trigger: 'Đòn đánh trúng',           limit: 'Không vượt năng lượng tối đa', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Mỗi đòn đánh trúng: hồi thêm ${p.amount} năng lượng.` },
  aspdOnCast:    { trigger: 'Sau khi thi triển',        limit: 'Làm mới thời gian, không cộng dồn', chain: 'Không', text: p => `Sau mỗi lần thi triển: +${artPct(p.pct)} tốc đánh trong ${p.dur} giây (làm mới, không cộng dồn).` },
  burnAura:      { trigger: 'Mỗi {every} giây trong trận', limit: 'Thiêu đốt làm mới, không cộng dồn', chain: 'Không', text: p => `Mỗi ${p.every} giây: thiêu đốt mọi kẻ địch trong ${p.radius} m (${artPct(p.power)} công mỗi 0,5 giây trong 3 giây, sát thương phép).` },
  manaAfterCast: { trigger: 'Sau khi thi triển',        limit: '1 lần / lần thi triển', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Sau mỗi lần thi triển: hồi ${p.amount} năng lượng.` },
  healOnCast:    { trigger: 'Khi thi triển',            limit: 'Hồi chiêu {cd} giây', chain: 'Không', text: p => `Khi thi triển: hồi ${artPct(p.pct)} máu tối đa cho ${p.who === 'weakest' ? 'đồng minh đang yếu nhất' : 'bản thân và đồng minh gần nhất'} (hồi chiêu ${p.cd} giây).` },
  multiShot:     { trigger: 'Mỗi đòn đánh thứ {nth}',   limit: '1 lần / {nth} đòn', chain: 'Không (tia phụ là sát thương phụ)', text: p => `Mỗi đòn đánh thứ ${p.nth}: bắn thêm 1 tia vào kẻ địch khác gần nhất, gây ${artPct(p.mult)} công.` },
  startShield:   { trigger: 'Đầu trận',                 limit: '1 lần / trận', chain: 'Không', text: p => `Đầu trận: lá chắn ${artPct(p.pct)} máu tối đa trong ${p.dur} giây.` },
  startDR:       { trigger: 'Đầu trận',                 limit: '1 lần / trận', chain: 'Không', text: p => `${p.dur} giây đầu trận: giảm ${artPct(p.pct)} sát thương nhận vào.` },
  healOnHit:     { trigger: 'Đòn đánh trúng',           limit: 'Không vượt máu tối đa', chain: 'Không', text: p => `Mỗi đòn đánh trúng: hồi ${artPct(p.pct)} máu tối đa.` },
  aspdOnCrit:    { trigger: 'Chí mạng (đòn đánh)',      limit: 'Tối đa {max} lần cộng dồn / trận', chain: 'Không', text: p => `Mỗi đòn đánh chí mạng: +${artPct(p.pct)} tốc đánh, cộng dồn tối đa ${p.max} lần.` },
  deathSave:     { trigger: 'Nhận đòn chí tử',          limit: '1 lần / trận', chain: 'Không', text: p => `Lần đầu nhận sát thương chí tử: giữ lại 1 máu và nhận lá chắn ${artPct(p.shield)} máu tối đa trong ${p.dur} giây (1 lần mỗi trận).` },
  allyAura:      { trigger: 'Đầu trận',                 limit: 'Không cộng dồn giữa nhiều người mang', chain: 'Không', text: p => `Đầu trận: bản thân và đồng minh đứng cạnh +${p.def} giáp, +${p.mr} kháng phép cả trận (nhiều người mang không cộng dồn).` },
  manaOnDamaged: { trigger: 'Nhận sát thương',          limit: 'Hồi chiêu {cd} giây', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Khi nhận sát thương: hồi thêm ${p.amount} năng lượng (tối đa 1 lần mỗi ${p.cd} giây).` },
  thorns:        { trigger: 'Nhận đòn đánh thường',     limit: 'Phản đòn không bị phản lại', chain: 'Không (chặn vòng lặp)', text: p => `Phản lại ${artPct(p.pct)} sát thương đòn đánh thường nhận vào dưới dạng sát thương phép (phản đòn không kích hoạt phản đòn khác).` },
  cleanseOnce:   { trigger: 'Bị khống chế',             limit: '1 lần / trận', chain: 'Không', text: p => `Lần đầu bị choáng / đóng băng: miễn hiệu ứng đó và miễn khống chế thêm ${p.immune} giây (1 lần mỗi trận).` },
  teamManaStart: { trigger: 'Đầu trận',                 limit: '1 lần / trận / người mang', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Đầu trận: bản thân và đồng minh đứng cạnh +${p.amount} năng lượng.` },
  regen:         { trigger: 'Mỗi giây',                 limit: 'Không vượt máu tối đa', chain: 'Không', text: p => `Mỗi giây hồi ${artPct(p.pct)} máu tối đa.` },
  execute:       { trigger: 'Đòn đánh lên mục tiêu yếu', limit: 'Mục tiêu dưới {below%} máu', chain: 'Không (sát thương phụ)', text: p => `Đòn đánh lên mục tiêu dưới ${artPct(p.below)} máu: gây thêm ${artPct(p.pct)} sát thương chuẩn.` },
  manaRegen:     { trigger: 'Mỗi giây',                 limit: 'Không vượt năng lượng tối đa', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Mỗi giây hồi ${p.amount} năng lượng.` },
  critMana:      { trigger: 'Chí mạng (đòn đánh)',      limit: 'Hồi chiêu {cd} giây', chain: 'Có thể giúp tung kỹ năng sớm', text: p => `Đòn đánh chí mạng: hồi ${p.amount} năng lượng (tối đa 1 lần mỗi ${p.cd} giây).` },
  critStack:     { trigger: 'Chí mạng (đòn đánh)',      limit: 'Tối đa {max} lần cộng dồn / trận', chain: 'Không', text: p => `Mỗi đòn đánh chí mạng: +${artPct(p.pct)} chí mạng, cộng dồn tối đa ${p.max} lần (+${artPct(p.pct * p.max)}).` },
  regenLow:      { trigger: 'Mỗi giây khi máu thấp',    limit: 'Chỉ khi dưới {below%} máu', chain: 'Không', text: p => `Khi máu dưới ${artPct(p.below)}: mỗi giây hồi ${artPct(p.pct)} máu tối đa.` }
};
function artPct(x) { return Math.round(x * 1000) / 10 + '%'; }

/** 36 pháp bảo. [id, tên, nguyên liệu A, nguyên liệu B, chỉ số thêm (ngoài tổng 2 nguyên liệu), nội tại { kind, ...tham số }].
 *  Chỉ số = A + B + phần thêm. Cộng dồn: chỉ số luôn cộng dồn; nội tại (trừ 'stat') chỉ áp 1 lần cho mỗi tướng dù mang 2 bản cùng loại. */
const ARTIFACT_LIST = [
  ['tru_tien_kiem',       'Tru Tiên Kiếm',          'sword', 'sword',     {},                          { kind: 'rampAtk', every: 2, pct: 0.04, max: 10 }],
  ['phap_kiem_loi_dinh',  'Pháp Kiếm Lôi Đình',     'sword', 'staff',     {},                          { kind: 'chainBolt', nth: 3, mult: 0.6, radius: 3 }],
  ['phong_anh_kiem',      'Phong Ảnh Kiếm',         'sword', 'bow',       {},                          { kind: 'aspdStack', pct: 0.04, max: 8 }],
  ['pha_giap_than_kiem',  'Phá Giáp Thần Kiếm',     'sword', 'armor',     {},                          { kind: 'shredOnHit', stat: 'def', pct: 0.3, dur: 4 }],
  ['huyet_kiem',          'Huyết Kiếm',             'sword', 'cloak',     { ls: 0.15 },                { kind: 'lowHpShield', below: 0.4, pct: 0.25, dur: 4 }],
  ['tu_linh_kiem',        'Tụ Linh Kiếm',           'sword', 'crystal',   {},                          { kind: 'manaOnHit', amount: 4 }],
  ['kiem_hon_ngoc',       'Kiếm Hồn Ngọc',          'sword', 'jade',      { omni: 0.12 },              { kind: 'stat' }],
  ['thien_sat_kiem',      'Thiên Sát Kiếm',         'sword', 'glove',     { critDmg: 0.35 },           { kind: 'stat' }],
  ['cuu_thien_phap_truong', 'Cửu Thiên Pháp Trượng', 'staff', 'staff',    { skillDmg: 0.15 },          { kind: 'stat' }],
  ['phong_loi_phap_chau', 'Phong Lôi Pháp Châu',    'staff', 'bow',       {},                          { kind: 'aspdOnCast', pct: 0.35, dur: 4 }],
  ['hoa_linh_ho_giap',    'Hỏa Linh Hộ Giáp',       'staff', 'armor',     {},                          { kind: 'burnAura', every: 2, radius: 2.5, power: 0.25 }],
  ['ngu_hanh_phap_an',    'Ngũ Hành Pháp Ấn',       'staff', 'cloak',     {},                          { kind: 'shredOnSkill', stat: 'mr', pct: 0.3, dur: 5 }],
  ['van_phap_linh_tinh',  'Vạn Pháp Linh Tinh',     'staff', 'crystal',   {},                          { kind: 'manaAfterCast', amount: 20 }],
  ['thanh_moc_phap_chau', 'Thanh Mộc Pháp Châu',    'staff', 'jade',      {},                          { kind: 'healOnCast', pct: 0.12, who: 'weakest', cd: 2 }],
  ['thien_menh_phap_an',  'Thiên Mệnh Pháp Ấn',     'staff', 'glove',     { skillDmg: 0.1, critDmg: 0.2 }, { kind: 'stat' }],
  ['phong_loi_than_cung', 'Phong Lôi Thần Cung',    'bow',   'bow',       {},                          { kind: 'multiShot', nth: 3, mult: 0.7 }],
  ['ho_than_than_cung',   'Hộ Thân Thần Cung',      'bow',   'armor',     {},                          { kind: 'startShield', pct: 0.15, dur: 8 }],
  ['anh_phong_linh_bao',  'Ảnh Phong Linh Bào',     'bow',   'cloak',     {},                          { kind: 'startDR', pct: 0.5, dur: 4 }],
  ['tu_linh_than_cung',   'Tụ Linh Thần Cung',      'bow',   'crystal',   {},                          { kind: 'manaOnHit', amount: 3 }],
  ['truong_sinh_than_cung', 'Trường Sinh Thần Cung', 'bow',  'jade',      {},                          { kind: 'healOnHit', pct: 0.02 }],
  ['lien_kich_thu_sao',   'Liên Kích Thủ Sáo',      'bow',   'glove',     {},                          { kind: 'aspdOnCrit', pct: 0.06, max: 5 }],
  ['bat_diet_than_giap',  'Bất Diệt Thần Giáp',     'armor', 'armor',     {},                          { kind: 'deathSave', shield: 0.3, dur: 3 }],
  ['huyen_thien_ho_phu',  'Huyền Thiên Hộ Phù',     'armor', 'cloak',     {},                          { kind: 'allyAura', def: 15, mr: 15 }],
  ['tu_linh_bao_giap',    'Tụ Linh Bảo Giáp',       'armor', 'crystal',   {},                          { kind: 'manaOnDamaged', amount: 3, cd: 0.5 }],
  ['kim_cang_ho_giap',    'Kim Cang Hộ Giáp',       'armor', 'jade',      {},                          { kind: 'startShield', pct: 0.25, dur: 6 }],
  ['phan_kich_chi_giap',  'Phản Kích Chi Giáp',     'armor', 'glove',     {},                          { kind: 'thorns', pct: 0.2 }],
  ['huyen_linh_phap_bao', 'Huyền Linh Pháp Bào',    'cloak', 'cloak',     {},                          { kind: 'cleanseOnce', immune: 1 }],
  ['linh_khi_phap_bao',   'Linh Khí Pháp Bào',      'cloak', 'crystal',   {},                          { kind: 'teamManaStart', amount: 15 }],
  ['bang_tam_ngoc',       'Băng Tâm Ngọc',          'cloak', 'jade',      {},                          { kind: 'regen', pct: 0.01 }],
  ['u_minh_thu_sao',      'U Minh Thủ Sáo',         'cloak', 'glove',     {},                          { kind: 'execute', below: 0.3, pct: 0.3 }],
  ['tu_linh_chau',        'Tụ Linh Châu',           'crystal', 'crystal', {},                          { kind: 'manaRegen', amount: 2 }],
  ['sinh_menh_linh_chau', 'Sinh Mệnh Linh Châu',    'crystal', 'jade',    {},                          { kind: 'healOnCast', pct: 0.1, who: 'selfNearest', cd: 2 }],
  ['thien_co_linh_tinh',  'Thiên Cơ Linh Tinh',     'crystal', 'glove',   {},                          { kind: 'critMana', amount: 5, cd: 0.5 }],
  ['truong_sinh_ngoc',    'Trường Sinh Ngọc',       'jade',  'jade',      {},                          { kind: 'regenLow', pct: 0.02, below: 0.5 }],
  ['ho_tam_bao_ngoc',     'Hộ Tâm Bảo Ngọc',        'jade',  'glove',     {},                          { kind: 'lowHpShield', below: 0.4, pct: 0.3, dur: 4 }],
  ['thien_menh_thu_sao',  'Thiên Mệnh Thủ Sáo',     'glove', 'glove',     {},                          { kind: 'critStack', pct: 0.02, max: 10 }]
];
/** Bảng tra: ARTIFACTS[id], RECIPES['a+b'] (khoá đã sắp xếp → A+B = B+A). */
const ARTIFACTS = {}, RECIPES = {};
const recipeKey = (a, b) => (COMPONENT_KEYS.indexOf(a) <= COMPONENT_KEYS.indexOf(b) ? a + '+' + b : b + '+' + a);
ARTIFACT_LIST.forEach(([id, name, a, b, extra, passive], i) => {
  const stats = {};
  for (const s of [COMPONENTS[a].stats, COMPONENTS[b].stats, extra]) for (const k in s) stats[k] = Math.round(((stats[k] || 0) + s[k]) * 1000) / 1000;
  const K = PASSIVE_KINDS[passive.kind], fill = str => str.replace(/\{(\w+)(%?)\}/g, (m, k, p) => (p ? artPct(passive[k]) : passive[k]));
  const art = { id, no: i + 1, name, parts: [a, b], group: a, stats, extra, passive, color: COMPONENTS[a].color, color2: COMPONENTS[b].color,
    glyph: COMPONENTS[a].glyph + COMPONENTS[b].glyph, unique: passive.kind !== 'stat',
    passiveText: passive.kind === 'stat' ? 'Chỉ số đặc biệt: ' + statText(extra) + '.' : K.text(passive),
    trigger: fill(K.trigger), limit: fill(K.limit), chain: K.chain };
  ARTIFACTS[id] = art; RECIPES[recipeKey(a, b)] = id;
});
/** Mọi loại vật phẩm (nguyên liệu + pháp bảo) theo itemId. */
const ITEM_DB = Object.assign({}, COMPONENTS, ARTIFACTS);
const isComponent = id => !!COMPONENTS[id], isArtifact = id => !!ARTIFACTS[id];
/** Pháp bảo nhận được khi ghép a + b (không phân biệt thứ tự), hoặc null. */
const recipeOf = (a, b) => (isComponent(a) && isComponent(b) ? RECIPES[recipeKey(a, b)] || null : null);
/** Mô tả đầy đủ cho tooltip. */
function itemTooltip(id) {
  const it = ITEM_DB[id]; if (!it) return '';
  if (isComponent(id)) return `${it.name} (nguyên liệu)\n${statText(it.stats)}\n${it.desc}\nGhép 2 nguyên liệu trong kho để tạo pháp bảo – chỉ pháp bảo mới trang bị được.`;
  return `${it.name}\n${COMPONENTS[it.parts[0]].name} + ${COMPONENTS[it.parts[1]].name}\n${statText(it.stats)}\nNội tại: ${it.passiveText}\nKích hoạt: ${it.trigger} · Giới hạn: ${it.limit}`;
}
/** Kiểm tra dữ liệu: 8 nguyên liệu, 36 công thức, không trùng, đủ mọi cặp, mọi loại nội tại có logic. Trả về danh sách lỗi. */
function validateArtifacts() {
  const bad = [];
  if (COMPONENT_KEYS.length !== 8) bad.push('cần 8 nguyên liệu, có ' + COMPONENT_KEYS.length);
  if (ARTIFACT_LIST.length !== 36) bad.push('cần 36 pháp bảo, có ' + ARTIFACT_LIST.length);
  const ids = new Set(), names = new Set();
  for (const [id, name, a, b, , p] of ARTIFACT_LIST) {
    if (ids.has(id)) bad.push('trùng id ' + id); ids.add(id);
    if (names.has(name)) bad.push('trùng tên ' + name); names.add(name);
    if (!COMPONENTS[a] || !COMPONENTS[b]) bad.push(id + ': nguyên liệu lạ');
    if (!PASSIVE_KINDS[p.kind]) bad.push(id + ': loại nội tại lạ ' + p.kind);
  }
  for (let i = 0; i < 8; i++) for (let j = i; j < 8; j++) if (!RECIPES[recipeKey(COMPONENT_KEYS[i], COMPONENT_KEYS[j])]) bad.push('thiếu công thức ' + COMPONENT_KEYS[i] + '+' + COMPONENT_KEYS[j]);
  if (Object.keys(RECIPES).length !== 36) bad.push('số công thức ' + Object.keys(RECIPES).length);
  return bad;
}
/** Trang bị cũ (V1.0–V1.5: 6 món hoàn chỉnh) → nguyên liệu tương ứng khi tải bản lưu cũ. */
const LEGACY_ITEM_MAP = { kiem: 'sword', giap: 'armor', chau: 'crystal', phu: 'cloak', ngoa: 'bow', ngoc: 'jade' };
