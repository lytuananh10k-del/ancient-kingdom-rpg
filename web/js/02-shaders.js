// Vạn Kiếm Kỳ Trận – ShaderLibrary – GLSL toon/rim/viền/dissolve/hạt/ribbon (mục 2)
// Script thường (không phải module): các file chia sẻ phạm vi toàn cục, nạp theo thứ tự số trong index.html.
'use strict';

/* =====================================================================
 *  2. ShaderLibrary – GLSL dùng chung
 * ===================================================================*/
const GLSL_NOISE = `
float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x), mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x), u.y); }
float hash13(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  float a=hash13(i), b=hash13(i+vec3(1,0,0)), c=hash13(i+vec3(0,1,0)), d=hash13(i+vec3(1,1,0));
  float e=hash13(i+vec3(0,0,1)), f2=hash13(i+vec3(1,0,1)), g=hash13(i+vec3(0,1,1)), h=hash13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y), mix(mix(e,f2,u.x),mix(g,h,u.x),u.y), u.z); }
float fbm2(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
`;

const ShaderLibrary = {
  gradientMap: (() => {
    const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })(),

  /** Uniform dùng chung cho mọi vật liệu của một nhân vật (chớp sáng, viền sáng, tan biến). */
  makeUnitUniforms(rimColor) {
    return {
      uFlash: { value: new THREE.Color(0, 0, 0) },
      uRimColor: { value: new THREE.Color(rimColor) },
      uRimStrength: { value: 0.55 },
      uDissolve: { value: 0 },
      uEdgeColor: { value: new THREE.Color(rimColor) }
    };
  },

  /** Toon + cel shading (gradient 3 bậc) + rim light + dissolve + flash. */
  toon(color, U, opts = {}) {
    const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: this.gradientMap }, opts));
    m.userData.u = U;
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, this.userData.u);
      sh.vertexShader = 'varying vec3 vDPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vDPos = position;');
      sh.fragmentShader = 'uniform vec3 uFlash; uniform vec3 uRimColor; uniform float uRimStrength; uniform float uDissolve; uniform vec3 uEdgeColor; varying vec3 vDPos;\n' + GLSL_NOISE +
        sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
          gl_FragColor.rgb += uRimColor * rim * uRimStrength + uFlash;
          float dn = vnoise3(vDPos * 9.0);
          if (dn < uDissolve) discard;
          gl_FragColor.rgb += uEdgeColor * smoothstep(uDissolve + 0.08, uDissolve, dn) * step(0.0001, uDissolve) * 3.0;`);
    };
    m.customProgramCacheKey = () => 'vkkt_toon';
    return m;
  },

  /** Viền đen kiểu anime (inverted hull) – hỗ trợ dissolve và sương mù. */
  outline(U, thickness = 0.018) {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uThick: { value: thickness }, uColor: { value: new THREE.Color(0x0b0d12) } }]),
      vertexShader: `uniform float uThick; varying vec3 vDPos;
        #include <fog_pars_vertex>
        void main(){ vDPos = position; vec3 p = position + normal * uThick;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uDissolve; varying vec3 vDPos;
        #include <fog_pars_fragment>
        ${GLSL_NOISE}
        void main(){ if (vnoise3(vDPos * 9.0) < uDissolve) discard; gl_FragColor = vec4(uColor, 1.0);
          #include <fog_fragment>
        }`,
      side: THREE.BackSide, fog: true
    });
  },
  linkOutline(mat, U) { mat.uniforms.uDissolve = U.uDissolve; return mat; },

  /** Hạt billboard GPU: kích thước theo khoảng cách, lõi trắng, cộng sáng. */
  particles() {
    return new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vColor;
        void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * uScale / max(0.1, -mv.z), 0.0, 220.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vColor;
        void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d); float core = smoothstep(0.22, 0.0, d);
          gl_FragColor = vec4(mix(vColor.rgb, vec3(1.0), core * 0.4), vColor.a * a * a * 0.9); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  },

  /** Dải ribbon (vệt kiếm khí, tia sét, đường bay). */
  ribbon(additive) {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `attribute vec4 aColor; varying vec4 vColor; varying vec2 vUv;
        void main(){ vColor = aColor; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: additive
        ? `varying vec4 vColor; varying vec2 vUv;
          void main(){ float edge = 1.0 - abs(vUv.y * 2.0 - 1.0); float core = smoothstep(0.55, 1.0, edge);
            gl_FragColor = vec4(mix(vColor.rgb, vec3(1.0), core * 0.45), vColor.a * edge * edge * 0.85); }`
        : `varying vec4 vColor; varying vec2 vUv;
          void main(){ float shade = 0.75 + 0.25 * (1.0 - abs(vUv.y * 2.0 - 1.0)); gl_FragColor = vec4(vColor.rgb * shade, 1.0); }`,
      transparent: additive, depthWrite: !additive, side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
  },

  /** Pháp trận: vòng tròn kép, phù văn xoay, lục mang tinh, hiện dần theo góc. */
  magicCircle(c1, c2) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uReveal: { value: 0 }, uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uSpin: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uAlpha, uReveal, uSpin; uniform vec3 uC1, uC2; varying vec2 vUv;
        const float PI = 3.14159265;
        float ring(float r, float w, float d){ return smoothstep(w, 0.0, abs(d - r)); }
        float polyEdge(float d, float a, float n, float R){ float k = d * cos(mod(a, 6.28318/n) - 3.14159/n); return smoothstep(0.012, 0.0, abs(k - R * cos(3.14159/n))) * step(d, R + 0.01); }
        ${GLSL_NOISE}
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float d = length(p); if (d > 1.0) discard;
          float a = atan(p.y, p.x); float a01 = (a + PI) / (2.0 * PI);
          float t = uTime * uSpin;
          float g = ring(0.96, 0.018, d) + ring(0.9, 0.01, d) * 0.9 + ring(0.66, 0.012, d) + ring(0.42, 0.01, d) * 0.8 + ring(0.18, 0.012, d);
          float seg = (a + t * 0.35) / (2.0 * PI) * 48.0;
          float rune = step(0.905, d) * step(d, 0.945) * step(0.35, fract(seg)) * step(hash12(vec2(floor(seg), 3.0)), 0.75);
          float seg2 = (a - t * 0.5) / (2.0 * PI) * 24.0;
          float rune2 = step(0.44, d) * step(d, 0.5) * step(0.25, fract(seg2)) * step(hash12(vec2(floor(seg2), 7.0)), 0.6) * 0.8;
          float tri = polyEdge(d, a + t * 0.25, 3.0, 0.66) + polyEdge(d, a + t * 0.25 + PI / 3.0, 3.0, 0.66);
          float spokes = step(0.18, d) * step(d, 0.42) * smoothstep(0.03, 0.0, abs(fract((a - t * 0.6) / (2.0 * PI) * 8.0) - 0.5) - 0.47);
          float glow = smoothstep(1.0, 0.0, d) * 0.12 + smoothstep(0.3, 0.0, d) * 0.15;
          float lines = g + rune * 0.9 + rune2 + tri * 0.9 + spokes * 0.6;
          float reveal = smoothstep(uReveal, uReveal - 0.04, a01) * step(0.001, uReveal) + step(1.0, uReveal);
          float flick = 0.85 + 0.15 * vnoise(vec2(a * 6.0, uTime * 4.0));
          vec3 col = mix(uC1, uC2, smoothstep(0.3, 0.95, d)) * flick;
          float alpha = clamp(lines * reveal * 0.85 + glow * 0.6, 0.0, 1.0) * uAlpha * 0.8;
          gl_FragColor = vec4(col, alpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
  },

  /** Vòng xung kích lan rộng. */
  shockwave(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uProg: { value: 0 }, uAlpha: { value: 1 }, uColor: { value: new THREE.Color(color) }, uWidth: { value: 0.08 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uProg, uAlpha, uWidth; uniform vec3 uColor; varying vec2 vUv;
        ${GLSL_NOISE}
        void main(){ vec2 p = vUv * 2.0 - 1.0; float d = length(p); if (d > 1.0) discard;
          float r = uProg; float band = smoothstep(uWidth, 0.0, abs(d - r)) ;
          float inner = smoothstep(r, 0.0, d) * 0.18 * (1.0 - uProg);
          float n = 0.7 + 0.3 * vnoise(vec2(atan(p.y, p.x) * 8.0, d * 6.0 - uProg * 5.0));
          float a = (band * n + inner) * uAlpha * (1.0 - uProg * 0.7);
          gl_FragColor = vec4(mix(uColor, vec3(1.0), band * 0.3), a * 0.8); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
  },

  /** Lưỡi kiếm khí hình cung: quét theo uProg, vệt nhiễu, mép sáng. */
  slash(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uProg: { value: 0 }, uFade: { value: 1 }, uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uProg, uFade, uTime; uniform vec3 uColor; varying vec2 vUv;
        ${GLSL_NOISE}
        void main(){ float head = uProg * 1.15;
          float vis = step(vUv.x, head);
          float tail = smoothstep(head - 0.75, head, vUv.x);
          float prof = pow(vUv.y, 2.2) * smoothstep(1.0, 0.82, vUv.y);
          float streak = 0.65 + 0.35 * vnoise(vec2(vUv.x * 3.0 - uTime * 6.0, vUv.y * 22.0));
          float a = vis * tail * prof * streak * uFade * 1.35;
          vec3 col = mix(uColor, vec3(1.0), smoothstep(0.82, 1.0, vUv.y) * 0.55);
          gl_FragColor = vec4(col, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
  },

  /** Khiên chân khí: Fresnel + vân năng lượng chảy + nhấp nháy khi trúng đòn. */
  fresnelShield(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uHit: { value: 0 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime, uAlpha, uHit; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        ${GLSL_NOISE}
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
          float hex = abs(sin(vP.y * 18.0 + uTime * 3.0)) * abs(sin(atan(vP.z, vP.x) * 9.0));
          float flow = vnoise3(vP * 3.0 + vec3(0.0, uTime * 1.2, 0.0));
          float a = (f * 0.9 + smoothstep(0.85, 1.0, hex) * 0.18 + flow * 0.08 + uHit * 0.6) * uAlpha;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), f * 0.4 + uHit * 0.5), a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
  },

  /** Năng lượng cộng sáng đơn giản (vỏ phát sáng của phi kiếm, cầu lửa). */
  glow(color, opacity = 0.5) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  },

  sky() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform float uTime; varying vec3 vDir;
        ${GLSL_NOISE}
        void main(){ float y = vDir.y;
          vec3 top = vec3(0.10, 0.17, 0.30), mid = vec3(0.46, 0.55, 0.66), low = vec3(0.86, 0.74, 0.60);
          vec3 col = mix(low, mid, smoothstep(-0.05, 0.25, y)); col = mix(col, top, smoothstep(0.25, 0.9, y));
          vec3 sunDir = normalize(vec3(-0.45, 0.28, 0.85)); float s = max(dot(vDir, sunDir), 0.0);
          col += vec3(1.0, 0.82, 0.55) * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.35);
          vec2 cp = vDir.xz / max(0.15, vDir.y + 0.2) * 1.6 + vec2(uTime * 0.01, 0.0);
          float c = smoothstep(0.52, 0.85, fbm2(cp)) * smoothstep(0.0, 0.35, y);
          col = mix(col, vec3(1.0, 0.95, 0.9), c * 0.55);
          gl_FragColor = vec4(col, 1.0); }`,
      side: THREE.BackSide, depthWrite: false
    });
  },

  cloudSea() {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: `varying vec2 vW; varying vec3 vPos;
        #include <fog_pars_vertex>
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; varying vec2 vW;
        #include <fog_pars_fragment>
        ${GLSL_NOISE}
        void main(){ vec2 p = vW * 0.035; float n = fbm2(p + vec2(uTime * 0.02, uTime * 0.01)); float n2 = fbm2(p * 2.3 - vec2(uTime * 0.03, 0.0));
          float c = smoothstep(0.35, 0.8, n * 0.7 + n2 * 0.45);
          vec3 col = mix(vec3(0.42, 0.5, 0.6), vec3(0.97, 0.93, 0.88), c);
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
      fog: true
    });
  }
};
