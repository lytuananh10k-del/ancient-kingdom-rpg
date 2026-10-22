// Vạn Kiếm Kỳ Trận – Nhập GLB (mục 26)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 26. Nhập GLB
 * ===================================================================*/
/** Mô hình GLB đã nhập theo tướng: GLB_LOADED[id] = gltf. Mỗi tướng một file riêng; RIG_FACTORIES[id] tạo rig từ file đó. */
const GLB_LOADED = {};
let currentGltf = null;   // GLB của tướng đang chọn trong Cài đặt (giữ tên cũ cho bài kiểm thử)
const glbTarget = () => ($('glb-target') && $('glb-target').value) || 'kiemtien';
function disposeGltf(gltf) {
  if (!gltf) return;
  gltf.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
}
/** Nạp GLB/GLTF từ ArrayBuffer và gắn cho tướng `key` (mặc định: tướng đang chọn). Trả về Promise với danh sách clip / xương nhận được. */
function loadGlbBuffer(buffer, name, key = glbTarget()) {
  return new Promise((resolve, reject) => {
    if (!THREE.GLTFLoader) { reject(new Error('Không tải được GLTFLoader – kiểm tra mạng rồi tải lại trang.')); return; }
    if (!UNIT_DEFS[key]) { reject(new Error('Tướng không tồn tại: ' + key)); return; }
    new THREE.GLTFLoader().parse(buffer, '', gltf => {
      try {
        const prev = GLB_LOADED[key];
        GLB_LOADED[key] = gltf; currentGltf = gltf;
        RIG_FACTORIES[key] = () => new GLTFRig(gltf, LOOKS[UNIT_DEFS[key].look]);
        const rig = replaceChampionRig(key);
        disposeGltf(prev);
        resolve({ name, key, found: rig ? rig.found : [] });
      } catch (err) { reject(err); }
    }, err => reject(err instanceof Error ? err : new Error(String(err))));
  });
}
// Danh sách tướng để chọn tướng nhận mô hình
(function fillGlbTargets() {
  const sel = $('glb-target'); if (!sel) return;
  CHAMPIONS.slice().sort((a, b) => b.cost - a.cost).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.name} (◆${c.cost})`; sel.appendChild(o); });
  sel.value = 'kiemtien';
})();
$('glb-file').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const out = $('glb-out'), key = glbTarget();
  out.textContent = 'Đang đọc ' + file.name + '…';
  const reader = new FileReader();
  reader.onerror = () => { out.textContent = 'Không đọc được file.'; };
  reader.onload = () => {
    loadGlbBuffer(reader.result, file.name, key)
      .then(r => { out.textContent = 'Đã dùng mô hình ' + r.name + ' cho ' + UNIT_DEFS[key].name + '.\n' + (r.found.length ? r.found.join('\n') : '(không nhận ra clip nào – nhân vật sẽ đứng yên)'); })
      .catch(err => { console.error(err); out.textContent = 'Không dùng được file: ' + (err && err.message ? err.message : err); });
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
});
$('btn-glb-reset').addEventListener('click', () => {
  const key = glbTarget();
  delete RIG_FACTORIES[key]; replaceChampionRig(key); disposeGltf(GLB_LOADED[key]); delete GLB_LOADED[key]; currentGltf = null;
  $('glb-out').textContent = UNIT_DEFS[key].name + ': đã trở về mô hình thủ tục.';
});
/** Dựng lại rig cho mọi bản của tướng `key` phe ta (trên bàn và hàng chờ); trả về rig đầu tiên (để kiểm tra). */
function replaceChampionRig(key) {
  benchUnits.forEach((u, i) => { if (u && u.key === key) { u.dispose(); benchUnits[i] = null; } });
  syncBench();
  let first = null;
  for (const u of units) {
    if (u.key !== key || u.team !== 'ally') continue;
    u.rig.dispose();
    u.rig = RIG_FACTORIES[key] ? RIG_FACTORIES[key]() : new CharacterRig(LOOKS[u.def.look], u.U);
    u.rig.root.scale.setScalar(u.modelScale());
    scene.add(u.rig.root); u.rig.setOutline && u.rig.setOutline(Q().outline);
    first = first || u.rig;
  }
  for (const u of benchUnits) if (u && u.key === key) first = first || u.rig;
  return first;
}
const replaceKiemTienRig = () => replaceChampionRig('kiemtien');
