// Vạn Kiếm Kỳ Trận – Renderer, scene, ánh sáng, bloom (mục 3)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  3. Renderer, scene, ánh sáng, bloom
 * ===================================================================*/
const canvas = document.getElementById('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('boot-error').hidden = false;
  document.querySelector('#boot-error h2').textContent = 'Thiết bị không hỗ trợ WebGL';
  throw e;   // dừng nạp (các file sau sẽ báo lỗi tham chiếu nhưng màn báo lỗi đã hiện)
}
renderer.setClearColor(0x0b1216, 1);
renderer.info.autoReset = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb8b6b0, 45, 140);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xd8e6ff, 0x5a4a3a, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 0.95);
sun.position.set(-14, 26, -10);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 70; sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);
// Hai đèn điểm cố định (không thêm/bớt để tránh biên dịch lại shader) – dùng cho chớp sáng va chạm.
const flashLights = [new THREE.PointLight(0x9fd0ff, 0, 14, 2), new THREE.PointLight(0xffd27a, 0, 14, 2)];
flashLights.forEach(l => scene.add(l));
let flashIndex = 0;
function flashLight(pos, color, intensity, decay = 6) {
  const l = flashLights[flashIndex++ % flashLights.length];
  l.position.copy(pos); l.color.set(color); l.intensity = intensity; l.userData.decay = decay;
}

/** Bloom tự viết (bright pass → blur tách trục → cộng), có giới hạn để không làm trắng xoá bàn cờ. */
class Bloom {
  constructor(r) {
    this.r = r; this.level = 0; this.intensity = 0.5; this.threshold = 0.86;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene = new THREE.Scene(); this.quadScene.add(this.quad);
    const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
    this.bright = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uThreshold: { value: this.threshold } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uThreshold; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.3, l), 1.0); }` });
    this.blur = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227;
          s += texture2D(tDiffuse, vUv + uDir * 1.385).rgb * 0.316; s += texture2D(tDiffuse, vUv - uDir * 1.385).rgb * 0.316;
          s += texture2D(tDiffuse, vUv + uDir * 3.231).rgb * 0.07; s += texture2D(tDiffuse, vUv - uDir * 3.231).rgb * 0.07;
          gl_FragColor = vec4(s, 1.0); }` });
    this.comp = new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, tBloom: { value: null }, uIntensity: { value: this.intensity } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D tScene, tBloom; uniform float uIntensity; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uIntensity;
          c = c / (1.0 + max(c - 1.0, 0.0) * 0.6);
          float vig = smoothstep(1.25, 0.35, length(vUv - 0.5) * 1.6); gl_FragColor = vec4(c * mix(0.82, 1.0, vig), 1.0); }` });
    this.rtScene = null; this.rtA = null; this.rtB = null;
  }
  setLevel(level, w, h) { this.level = level; this.resize(w, h); }
  resize(w, h) {
    [this.rtScene, this.rtA, this.rtB].forEach(rt => rt && rt.dispose());
    this.rtScene = this.rtA = this.rtB = null;
    if (!this.level) return;
    const pr = this.r.getPixelRatio(), W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    const ms = this.r.capabilities.isWebGL2 && this.level >= 2 && THREE.WebGLMultisampleRenderTarget;
    this.rtScene = ms ? new THREE.WebGLMultisampleRenderTarget(W, H, opts) : new THREE.WebGLRenderTarget(W, H, opts);
    if (ms) this.rtScene.samples = 4;
    const div = this.level >= 2 ? 2 : 4;
    this.rtA = new THREE.WebGLRenderTarget(Math.max(2, W / div | 0), Math.max(2, H / div | 0), opts);
    this.rtB = this.rtA.clone();
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.quadScene, this.cam); }
  render(sc, cam) {
    if (!this.level || !this.rtScene) { this.r.setRenderTarget(null); this.r.render(sc, cam); return; }
    this.r.setRenderTarget(this.rtScene); this.r.render(sc, cam);
    this.bright.uniforms.tDiffuse.value = this.rtScene.texture; this.pass(this.bright, this.rtA);
    const iw = 1 / this.rtA.width, ih = 1 / this.rtA.height;
    for (let i = 0; i < 2; i++) {
      this.blur.uniforms.tDiffuse.value = this.rtA.texture; this.blur.uniforms.uDir.value.set(iw * (1 + i), 0); this.pass(this.blur, this.rtB);
      this.blur.uniforms.tDiffuse.value = this.rtB.texture; this.blur.uniforms.uDir.value.set(0, ih * (1 + i)); this.pass(this.blur, this.rtA);
    }
    this.comp.uniforms.tScene.value = this.rtScene.texture; this.comp.uniforms.tBloom.value = this.rtA.texture;
    this.comp.uniforms.uIntensity.value = this.intensity; this.pass(this.comp, null);
  }
}
const bloom = new Bloom(renderer);
