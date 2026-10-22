// Vạn Kiếm Kỳ Trận – Thế giới: Vân Đài, bàn cờ, hàng chờ 3D (mục 13)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 * 13. Thế giới: Vân Đài lơ lửng trên biển mây, bàn cờ 8×8
 * ===================================================================*/
const BOARD = { cols: 8, rows: 8, tile: 2.3 };
/** Độ cao mặt đất tại (x, z) – bàn cờ phẳng; thay hàm này khi có địa hình gồ ghề, IK chân tự thích nghi. */
const groundHeight = (x, z) => 0;
const tileCenter = (c, r, out = new V3()) => out.set((c - 3.5) * BOARD.tile, 0, (r - 3.5) * BOARD.tile);
const worldToTile = (x, z) => ({ c: Math.floor(x / BOARD.tile + 4), r: Math.floor(z / BOARD.tile + 4) });
/** Hàng chờ kiểu TFT: một dãy ô ngay sau hàng cuối của phe ta, tướng đứng trên ô. */
const BENCH = { slots: 9, gap: 1.85, z: -10.9 };
// Camera nhìn về +z nên trục x trên màn hình bị lật: ô 0 nằm bên trái màn hình khi x dương.
const benchSlotPos = (i, out = new V3()) => out.set(((BENCH.slots - 1) / 2 - i) * BENCH.gap, 0, BENCH.z);

const vfx = new VFXManager();
const world = { tiles: [], tileMat: null, highlight: null, env: [] };
(function buildWorld() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), ShaderLibrary.sky()); sky.renderOrder = -1; scene.add(sky); world.sky = sky;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1).rotateX(-Math.PI / 2), ShaderLibrary.cloudSea()); sea.position.y = -14; scene.add(sea); world.sea = sea;
  // Đài đá
  const U = ShaderLibrary.makeUnitUniforms(0x000000); U.uRimStrength.value = 0;
  const stone = ShaderLibrary.toon(0x6f7b7a, U), stoneDark = ShaderLibrary.toon(0x48514f, U), jade = ShaderLibrary.toon(0x3f9f86, U), lacquer = ShaderLibrary.toon(0x8c2a22, U), gold = ShaderLibrary.toon(0xd8b25a, U);
  const half = BOARD.tile * 4;
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(half * 1.55, half * 1.1, 3, 8), stoneDark); plat.position.y = -1.6; plat.rotation.y = Math.PI / 8; plat.receiveShadow = true; scene.add(plat);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(half * 1.56, half * 1.56, 0.25, 8, 1, true), jade); rim.position.y = -0.2; rim.rotation.y = Math.PI / 8; scene.add(rim);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(half * 1.55, half * 1.55, 0.2, 8), stone); top.position.y = -0.12; top.rotation.y = Math.PI / 8; top.receiveShadow = true; scene.add(top);
  // Ô cờ: một InstancedMesh, màu xen kẽ ngọc / đá
  const tg = new THREE.BoxGeometry(BOARD.tile * 0.96, 0.12, BOARD.tile * 0.96);
  const tm = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const tiles = new THREE.InstancedMesh(tg, tm, 64); tiles.receiveShadow = true;
  let i = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    tileCenter(c, r, _v1); _m1.makeTranslation(_v1.x, 0, _v1.z); tiles.setMatrixAt(i, _m1);
    const ally = r < 4, odd = (r + c) % 2;
    tiles.setColorAt(i, _c1.set(ally ? (odd ? 0x5e8f86 : 0x4f7c74) : (odd ? 0x86605a : 0x74524d)));
    i++;
  }
  tiles.instanceColor.needsUpdate = true; scene.add(tiles); world.tilesMesh = tiles;
  // Đường giữa sông Hán
  const mid = new THREE.Mesh(new THREE.BoxGeometry(BOARD.tile * 8, 0.13, 0.12), gold); mid.position.y = 0.01; scene.add(mid);
  // Ô hàng chờ
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.62, 0.1, 1.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), BENCH.slots); bm.receiveShadow = true;
  for (let k = 0; k < BENCH.slots; k++) { benchSlotPos(k, _v1); _m1.makeTranslation(_v1.x, 0, _v1.z); bm.setMatrixAt(k, _m1); bm.setColorAt(k, _c1.set(k % 2 ? 0x3c5f58 : 0x355550)); }
  bm.instanceColor.needsUpdate = true; scene.add(bm);
  const benchRail = new THREE.Mesh(new THREE.BoxGeometry(BENCH.slots * BENCH.gap + 0.3, 0.13, 0.1), gold); benchRail.position.set(0, 0.01, BENCH.z + 0.95); scene.add(benchRail);
  // Ô đánh dấu khi chọn
  const hl = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.tile * 0.92, BOARD.tile * 0.92).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe9c46a, transparent: true, opacity: 0.35, depthWrite: false }));
  hl.position.y = 0.08; hl.visible = false; scene.add(hl); world.highlight = hl;
  // Cột đèn lồng 4 góc + cờ
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, R = half * 1.3;
    const g = new THREE.Group(); g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); scene.add(g);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 6, 8), lacquer); pillar.position.y = 3; pillar.castShadow = true; g.add(pillar);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 4), stoneDark); cap.position.y = 6.3; cap.rotation.y = Math.PI / 4; g.add(cap);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb35c })); lantern.position.y = 5.2; lantern.scale.y = 1.25; g.add(lantern);
    const glowM = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), ShaderLibrary.glow(0xff9a4a, 0.25)); glowM.position.y = 5.2; g.add(glowM);
    world.env.push({ lantern: glowM, g });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), gold); base.position.y = 0.25; g.add(base);
  }
  // Núi xa (bóng mờ trong sương)
  const mtnMat = new THREE.MeshLambertMaterial({ color: 0x55657a });
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * TAU + rand(-0.1, 0.1), R = rand(110, 170), h = rand(30, 70);
    const m = new THREE.Mesh(new THREE.ConeGeometry(rand(14, 26), h, 6), mtnMat); m.position.set(Math.sin(a) * R, -14 + h / 2 - 6, Math.cos(a) * R); m.rotation.y = rand(0, 3); scene.add(m);
  }
})();
