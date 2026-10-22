// Vạn Kiếm Kỳ Trận – Nhập GLB (mục 26)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 26. Nhập GLB
 * ===================================================================*/
let currentGltf = null;
function disposeGltf(gltf) {
  if (!gltf) return;
  gltf.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
}
/** Nạp GLB/GLTF từ ArrayBuffer và thay Kiếm Tiên. Trả về Promise với danh sách clip / xương nhận được. */
function loadGlbBuffer(buffer, name) {
  return new Promise((resolve, reject) => {
    if (!THREE.GLTFLoader) { reject(new Error('Không tải được GLTFLoader – kiểm tra mạng rồi tải lại trang.')); return; }
    new THREE.GLTFLoader().parse(buffer, '', gltf => {
      try {
        const prev = currentGltf;
        currentGltf = gltf;
        customRigFactory = () => new GLTFRig(gltf, LOOKS.kiemtien);
        const rig = replaceKiemTienRig();
        disposeGltf(prev);
        resolve({ name, found: rig ? rig.found : [] });
      } catch (err) { reject(err); }
    }, err => reject(err instanceof Error ? err : new Error(String(err))));
  });
}
$('glb-file').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const out = $('glb-out');
  out.textContent = 'Đang đọc ' + file.name + '…';
  const reader = new FileReader();
  reader.onerror = () => { out.textContent = 'Không đọc được file.'; };
  reader.onload = () => {
    loadGlbBuffer(reader.result, file.name)
      .then(r => { out.textContent = 'Đã dùng mô hình ' + r.name + '.\n' + (r.found.length ? r.found.join('\n') : '(không nhận ra clip nào – nhân vật sẽ đứng yên)'); })
      .catch(err => { console.error(err); out.textContent = 'Không dùng được file: ' + (err && err.message ? err.message : err); });
  };
  reader.readAsArrayBuffer(file);
});
$('btn-glb-reset').addEventListener('click', () => { customRigFactory = null; replaceKiemTienRig(); disposeGltf(currentGltf); currentGltf = null; $('glb-out').textContent = 'Đã trở về mô hình thủ tục.'; });
/** Thay rig cho mọi Kiếm Tiên phe ta đang trên bàn; trả về rig đầu tiên (để kiểm tra). */
function replaceKiemTienRig() {
  benchUnits.forEach((u, i) => { if (u && u.key === 'kiemtien') { u.dispose(); benchUnits[i] = null; } });
  syncBench();
  let first = null;
  for (const u of units) {
    if (u.key !== 'kiemtien' || u.team !== 'ally') continue;
    u.rig.dispose();
    u.rig = customRigFactory ? customRigFactory() : new CharacterRig(LOOKS.kiemtien, u.U);
    u.rig.root.scale.setScalar(STAR_SCALE[u.star]);
    scene.add(u.rig.root); u.rig.setOutline && u.rig.setOutline(Q().outline);
    first = first || u.rig;
  }
  return first;
}
