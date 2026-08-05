// GARGANTUA — 史瓦西黑洞零测地线光线追踪背景
// 从 GARGANTUA 独立项目移植：真实测地线积分、Novikov-Thorne 吸积盘、
// 相对论多普勒/引力红移、光子环、程序化银河星场 + Bloom/ACES 后期管线。
// 定位：博客全屏背景画布（#star-canvas），自动电影运镜，无交互。

// WebGL 检测：不支持则降级到 Canvas 星空背景
(function checkWebGL() {
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');
    return; // OK, continue loading
  } catch (e) {
    var loader = document.getElementById('bh-loader');
    if (loader) loader.remove();
    var s = document.createElement('script');
    s.src = '/js/stars.js';
    document.head.appendChild(s);
    // 终止模块执行：后续 import 不会触发
    throw null;
  }
})();

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const CONFIG = {
  steps: 300,        // 测地线积分步数（背景场景取性能/画质平衡值）
  maxDpr: 1.5,       // 像素比上限
  fov: 44,           // 镜头视场角
  fovTablet: 52,     // 平板视场角
  fovMobile: 64,     // 移动端视场角（窄屏确保黑洞完整可见）
  diskInner: 2.75,   // 吸积盘内缘 (RS)
  diskOuter: 40,     // 吸积盘外缘 (RS)
  dopplerMax: 1.85,  // 多普勒增亮上限
  opacityNear: 0.90, // 吸积盘不透明度·内区
  opacityFar: 0.80,  // 吸积盘不透明度·外区
  diskBright: 1,
  starBright: 1,
  skyFloor: 0.04,    // 天空底光
  rotSpeed: 1,       // 吸积盘转速
  cineSeg: 11,       // 电影路径每段时长（秒）
  bloom: { strength: 0.55, radius: 0.35, threshold: 0.55 },
  vignette: 1,
  grain: 0.045,
  ca: 0.0028,        // 色差
  // 移动端自适应
  stepsMobile: 140,  // 移动端步数（≤768px）
  stepsTablet: 210,  // 平板步数（≤1024px）
  dprMobile: 1.0,    // 移动端像素比上限
};

const DEG = Math.PI / 180;

/* =================================================== adaptive quality */
function adaptiveSteps() {
  const w = window.innerWidth;
  if (w <= 768) return CONFIG.stepsMobile;
  if (w <= 1024) return CONFIG.stepsTablet;
  return CONFIG.steps;
}

function adaptiveDpr() {
  const w = window.innerWidth;
  return Math.min(window.devicePixelRatio || 1, w <= 768 ? CONFIG.dprMobile : CONFIG.maxDpr);
}

function adaptiveFov() {
  const w = window.innerWidth;
  if (w <= 768) return CONFIG.fovMobile;
  if (w <= 1024) return CONFIG.fovTablet;
  return CONFIG.fov;
}

/* ================================================================ shaders */
const RAY_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// 零测地线光线步进：几何单位制 c = G = 1，RS = 1.0（史瓦西半径）
const RAY_FRAG = /* glsl */`
precision highp float;

varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform float uFov;
uniform float uSteps;
uniform float uRotSign;
uniform float uDin;
uniform float uDout;
uniform float uDopMax;
uniform float uOpNear;
uniform float uOpFar;
uniform float uDiskBright;
uniform float uStarBright;
uniform float uSkyFloor;
uniform float uRotSpeed;

#define RS 1.0

// ---------------------------------------------------------------- hashes
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// ------------------------------------------------------- value noise / fbm
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

// 5 层 FBM：频率 x2.03、偏移 11.3、振幅逐层减半
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int k = 0; k < 5; k++) {
    s += a * vnoise(p);
    p = p * 2.03 + 11.3;
    a *= 0.5;
  }
  return s;
}

// ----------------------------------------------------------- color helpers
vec3 blackbody(float t) {
  vec3 c = mix(vec3(0.55, 0.06, 0.01), vec3(1.0, 0.42, 0.10), smoothstep(0.0, 0.55, t));
  c = mix(c, vec3(1.0, 0.86, 0.55), smoothstep(0.50, 1.05, t));
  c = mix(c, vec3(0.85, 0.92, 1.25), smoothstep(1.05, 1.90, t));
  return c;
}

mat3 rotAxis(vec3 a, float t) {
  a = normalize(a);
  float c = cos(t), s = sin(t), ic = 1.0 - c;
  return mat3(
    ic*a.x*a.x + c,     ic*a.x*a.y + s*a.z, ic*a.x*a.z - s*a.y,
    ic*a.x*a.y - s*a.z, ic*a.y*a.y + c,     ic*a.y*a.z + s*a.x,
    ic*a.x*a.z + s*a.y, ic*a.y*a.z - s*a.x, ic*a.z*a.z + c);
}

// ----------------------------------------------------------- galaxy & stars
vec3 galaxy(vec3 dir) {
  vec3 n  = normalize(vec3(0.25, 1.0, 0.15));
  vec3 t1 = normalize(cross(n, vec3(0.0, 0.0, 1.0)));
  vec3 t2 = cross(n, t1);
  float w = dot(dir, n);
  float band = exp(-w * w * 7.0);
  vec2 uv = vec2(dot(dir, t1), dot(dir, t2));
  float cloud  = fbm(vec3(uv * 2.6, 7.0));
  float cloud2 = fbm(vec3(uv * 5.4 + cloud * 1.8, 13.0));
  float dust   = fbm(vec3(uv * 4.2 + 4.7, 21.0));
  float dustMask = smoothstep(0.42, 0.78, dust);
  vec3 col = mix(vec3(0.04, 0.07, 0.20), vec3(0.42, 0.24, 0.52),
                 smoothstep(0.30, 0.92, cloud2));
  float inten = band * (0.30 + 0.90 * cloud) * (1.0 - 0.62 * dustMask) * 1.15;
  return col * inten;
}

vec3 starLayer(vec3 dir, mat3 rot, float scale, float thresh, float soft) {
  vec3 p = rot * dir * scale;
  vec3 id = floor(p);
  vec3 f = fract(p);
  float h = hash13(id + 17.17);
  if (h < thresh) return vec3(0.0);
  vec3 sp = vec3(0.5) + 0.62 * (hash33(id + 3.71) - 0.5);
  float d2 = dot(f - sp, f - sp);
  float core = exp(-d2 * soft);
  float halo = exp(-d2 * soft * 0.10) * 0.22;
  float bright = 0.30 + 1.6 * pow(hash13(id + 9.3), 6.0);
  vec3 tint = mix(vec3(0.72, 0.84, 1.25), vec3(1.20, 0.95, 0.72), hash13(id + 5.5));
  return tint * (core + halo) * bright * smoothstep(thresh, thresh + 0.015, h);
}

vec3 starField(vec3 dir) {
  vec3 s = vec3(0.0);
  s += starLayer(dir, rotAxis(vec3(0.2, 1.0, 0.1), 0.0),  9.0, 0.952, 230.0);
  s += starLayer(dir, rotAxis(vec3(0.5, 0.8, 0.3), 1.9),  13.0, 0.952, 270.0);
  s += starLayer(dir, rotAxis(vec3(0.9, 0.3, 0.6), 3.7),  17.0, 0.953, 310.0);
  s += starLayer(dir, rotAxis(vec3(0.1, 0.6, 0.9), 5.1),  23.0, 0.968, 350.0) * 0.8;
  // 稀有英雄星：更大更柔和的暖/蓝白光晕
  vec3 p = rotAxis(vec3(0.4, 1.0, 0.2), 0.7) * dir * 4.0;
  vec3 id = floor(p);
  vec3 f = fract(p);
  float h = hash13(id + 41.3);
  if (h > 0.9975) {
    vec3 sp = vec3(0.5) + 0.5 * (hash33(id + 11.1) - 0.5);
    float d2 = dot(f - sp, f - sp);
    vec3 tint = mix(vec3(0.80, 0.90, 1.30), vec3(1.25, 1.00, 0.80), hash13(id + 2.2));
    s += tint * (exp(-d2 * 150.0) * 3.2 + exp(-d2 * 20.0) * 0.85);
  }
  return s;
}

vec3 background(vec3 dir) {
  vec3 col = uSkyFloor * vec3(0.10, 0.13, 0.28);
  col += galaxy(dir);
  col += starField(dir);
  return col * uStarBright;
}

// -------------------------------------------------------------- accretion
// Novikov-Thorne 型流量（ISCO = 3 RS）
float ntFlux(float r) {
  float x = max(r, 3.001);
  return pow(x / 3.0, -3.0) * (1.0 - sqrt(3.0 / x));
}

// 湍流纹理：扭曲 FBM 云层、切向条纹、暗尘带。
// 使用归一化旋转坐标（不走 atan）=> 无分支切割接缝。
float diskPattern(vec3 q, float qr) {
  vec2 n2 = q.xz / qr;
  float omega = uRotSign * 1.1 * uRotSpeed * pow(3.0 / qr, 1.5);
  float ph = omega * uTime;
  float cs = cos(ph), sn = sin(ph);
  vec2 rn = vec2(n2.x * cs - n2.y * sn, n2.x * sn + n2.y * cs);
  float det = 1.0 - smoothstep(4.0, 18.0, qr);
  float warp = fbm(vec3(rn * 1.5, 3.0));
  float rad = qr * 0.55;
  float turb = fbm(vec3(rn * 2.3 + (warp - 0.5) * 1.4 * det, rad * 0.4));
  turb = 0.55 + 0.45 * smoothstep(0.22, 0.88, turb);
  float arcA = fbm(vec3(rn * 3.1 + (warp - 0.5) * 2.2 * det, rad * 3.4 + 5.0));
  float arcB = fbm(vec3(rn * 22.0 + (warp - 0.5) * 3.0 * det, rad * 6.0 + 9.0));
  float streak = mix(arcA, arcA * 0.55 + arcB * 0.80, det);
  streak = 0.42 + 0.58 * smoothstep(0.20, 0.86, streak);
  float lane = fbm(vec3(rn * 5.2 + 7.3, rad * 1.15 + 2.0));
  float laneMask = 0.58 + 0.42 * smoothstep(0.30, 0.82, lane);
  return turb * streak * laneMask;
}

vec3 diskEmission(vec3 q, float qr, vec3 rayDir) {
  float flux = ntFlux(qr);
  float temp = pow(flux * 10.0, 0.25);
  float pat = diskPattern(q, qr);
  float fade = 1.0 - smoothstep(uDout - 14.0, uDout, qr);
  float I = flux * 11.0 * pat;
  I += exp(-pow((qr - 3.1) * 3.0, 2.0)) * 2.8;
  I *= fade;
  // 相对论效应：多普勒增亮 + 引力红移
  float ang = atan(q.z, q.x);
  vec3 tdir = normalize(vec3(-sin(ang), 0.0, cos(ang))) * uRotSign;
  float beta = sqrt(0.5 / qr);
  float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 1e-4));
  float D = 1.0 / (gamma * (1.0 - dot(tdir * beta, rayDir)));
  D = clamp(D, 0.50, uDopMax);
  float g = sqrt(max(1.0 - RS / qr, 0.0));
  return blackbody(temp * D * g) * I * (D * D * D * g);
}

// 廉价热雾，无湍流
vec3 diskGlow(float r) {
  float flux = ntFlux(r);
  float temp = pow(flux * 10.0, 0.25);
  float g = sqrt(max(1.0 - RS / r, 0.0));
  float fade = 1.0 - smoothstep(uDout - 14.0, uDout, r);
  float I = flux * 7.0 + exp(-pow((r - 3.1) * 3.0, 2.0)) * 1.4;
  return blackbody(temp * g) * I * g * fade;
}

// ------------------------------------------------------------------- main
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = uCamPos;
  vec3 ww = normalize(uCamTarget - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(p.x * uu + p.y * vv + uFov * ww);

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float minR = 1e5;
  float lastR = length(ro);

  for (int i = 0; i < 600; i++) {
    if (float(i) >= uSteps) break;
    float r = length(pos);
    if (r < 1.03 * RS) { trans = 0.0; lastR = r; break; }
    if (r > 45.0 && dot(pos, vel) > 0.0) { lastR = r; break; }
    minR = min(minR, r);

    vec3 h = cross(pos, vel);
    float h2 = dot(h, h);
    float r2 = r * r;
    vec3 acc = -1.5 * RS * h2 / (r2 * r2 * r) * pos;
    float dt = max(0.012, r * mix(0.02, 0.06, smoothstep(6.0, 20.0, r)));

    // 薄体积盘热雾
    float absY = abs(pos.y);
    if (absY < 0.45 && r > uDin && r < uDout) {
      float density = exp(-absY * 30.0) * 0.03 *
                      (1.0 - smoothstep(10.0, max(uDout - 1.0, 11.0), r));
      col += trans * diskGlow(r) * density * dt * uDiskBright;
    }

    vel = normalize(vel + acc * dt);
    vec3 npos = pos + vel * dt;

    // 吸积盘平面穿越（y = 0）
    if (pos.y * npos.y <= 0.0) {
      float t = abs(pos.y) / (abs(pos.y) + abs(npos.y) + 1e-5);
      vec3 q = mix(pos, npos, t);
      float qr = length(q.xz);
      if (qr > uDin && qr < uDout) {
        vec3 em = diskEmission(q, qr, vel);
        float op = mix(uOpFar, uOpNear, 1.0 - smoothstep(4.0, 13.0, qr));
        op *= 1.0 - smoothstep(uDout - 14.0, uDout, qr);
        col += trans * op * em * uDiskBright;
        trans *= 1.0 - op;
      }
    }

    pos = npos;
    lastR = r;
    if (trans < 0.02) break;
  }

  // 1.55 RS 附近的光子环（临界曲线）
  float ring = exp(-pow((minR - 1.55) * 4.0, 2.0));
  col += trans * ring * vec3(1.0, 0.92, 0.80) * 0.05;

  // 沿最终逃逸方向采样透镜化背景
  if (trans > 0.0) {
    float dim = clamp((lastR - 1.03) * 0.45, 0.45, 1.0);
    col += trans * background(normalize(vel)) * dim;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// 最终合成：色差、手动 ACES、暗角、胶片颗粒
const COMPOSITE_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */`
precision highp float;

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2  uRes;
uniform float uTime;
uniform float uVignette;
uniform float uGrain;
uniform float uCA;

vec3 aces(vec3 x) {
  x *= 0.95;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 dir = uv - 0.5;
  float ca = uCA * dot(dir, dir);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + dir * ca).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - dir * ca).b;

  col = aces(col);

  float aspect = uRes.x / uRes.y;
  float vig = 1.0 - smoothstep(0.30, 1.30, length(dir * vec2(aspect, 1.0)) * 1.15);
  col *= mix(1.0, vig, uVignette);

  float gr = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0,
                           vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += gr * uGrain * (1.0 - 0.5 * col);

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ========================================================== renderer setup */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // ACES 在合成 pass 手动完成
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(adaptiveDpr());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = 'star-canvas';
renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// HDR 半浮点缓冲（不支持时自动回退 LDR）
const gl = renderer.getContext();
const halfOK = renderer.capabilities.isWebGL2 &&
  !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

// 全屏光追场景：单个 2x2 四边形 + 正交相机
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsScene = new THREE.Scene();
const rayUni = {
  uRes:        { value: new THREE.Vector2(1, 1) },
  uTime:       { value: 0 },
  uCamPos:     { value: new THREE.Vector3(4.49, 2.72, 25.46) },
  uCamTarget:  { value: new THREE.Vector3(0, 0, 0) },
  uFov:        { value: 1 / Math.tan(adaptiveFov() * DEG / 2) },
  uSteps:      { value: adaptiveSteps() },
  uRotSign:    { value: 1 },
  uDin:        { value: CONFIG.diskInner },
  uDout:       { value: CONFIG.diskOuter },
  uDopMax:     { value: CONFIG.dopplerMax },
  uOpNear:     { value: CONFIG.opacityNear },
  uOpFar:      { value: CONFIG.opacityFar },
  uDiskBright: { value: CONFIG.diskBright },
  uStarBright: { value: CONFIG.starBright },
  uSkyFloor:   { value: CONFIG.skyFloor },
  uRotSpeed:   { value: CONFIG.rotSpeed },
};
fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  vertexShader: RAY_VERT,
  fragmentShader: RAY_FRAG,
  uniforms: rayUni,
  depthTest: false,
  depthWrite: false,
})));

// 观察相机：只提供位置/朝向，不渲染任何几何体
const camera = new THREE.PerspectiveCamera(adaptiveFov(), window.innerWidth / window.innerHeight, 0.01, 200);
camera.position.set(4.49, 2.72, 25.46);

// 后期管线：光追 → UnrealBloom → 合成（色差/ACES/暗角/颗粒）
const bufSize = new THREE.Vector2();
renderer.getDrawingBufferSize(bufSize);
const rt = new THREE.WebGLRenderTarget(bufSize.x || 2, bufSize.y || 2, {
  type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
});
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(fsScene, fsCam));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(bufSize.x || 2, bufSize.y || 2),
  CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold);
composer.addPass(bloomPass);
const compUni = {
  tDiffuse:  { value: null },
  uRes:      { value: new THREE.Vector2(1, 1) },
  uTime:     { value: 0 },
  uVignette: { value: CONFIG.vignette },
  uGrain:    { value: CONFIG.grain },
  uCA:       { value: CONFIG.ca },
};
composer.addPass(new ShaderPass({
  uniforms: compUni,
  vertexShader: COMPOSITE_VERT,
  fragmentShader: COMPOSITE_FRAG,
}));

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = adaptiveDpr();
  const fov = adaptiveFov();
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  renderer.getDrawingBufferSize(bufSize);
  rayUni.uRes.value.copy(bufSize);
  rayUni.uSteps.value = adaptiveSteps();
  rayUni.uFov.value = 1 / Math.tan(fov * DEG / 2);
  compUni.uRes.value.copy(bufSize);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
onResize();

/* ======================================================== cinematic path */
// 闭环电影路径：8 个球坐标关键帧（r, 倾角°, 方位角°），Catmull-Rom 插值
const CINE_R   = [58, 36, 26, 14, 20, 34, 46, 36];
const CINE_INC = [12, 6, 24, 14, 52, 80, 35, 8];
const CINE_AZ  = [-30, 10, 55, 100, 150, 200, 270, 330]; // 已展开，避免跳变

function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function arrAt(arr, j) { const n = arr.length; return arr[((j % n) + n) % n]; }
function unwrapNear(a, ref) {
  while (a - ref > 180) a -= 360;
  while (a - ref < -180) a += 360;
  return a;
}
function sphToVec(r, inc, az, out) {
  const i = inc * DEG, a = az * DEG;
  out.set(r * Math.cos(i) * Math.sin(a), r * Math.sin(i), r * Math.cos(i) * Math.cos(a));
  return out;
}

const tmpVec = new THREE.Vector3();
function cinePosAt(time, out) {
  const seg = Math.max(1, CONFIG.cineSeg);
  const s = ((time / seg) % 8 + 8) % 8;
  const i = Math.floor(s), t = s - i;
  const r = cr(arrAt(CINE_R, i - 1), arrAt(CINE_R, i), arrAt(CINE_R, i + 1), arrAt(CINE_R, i + 2), t);
  const inc = cr(arrAt(CINE_INC, i - 1), arrAt(CINE_INC, i), arrAt(CINE_INC, i + 1), arrAt(CINE_INC, i + 2), t);
  const a1 = arrAt(CINE_AZ, i);
  const a0 = unwrapNear(arrAt(CINE_AZ, i - 1), a1);
  const a2 = unwrapNear(arrAt(CINE_AZ, i + 1), a1);
  const a3 = unwrapNear(arrAt(CINE_AZ, i + 2), a2);
  const az = cr(a0, a1, a2, a3, t);
  return sphToVec(r, inc, az, out);
}

/* ============================================================= main loop */
const clock = new THREE.Clock();
let cineTime = 0;
let tShader = 0;

// 尊重系统"减少动态效果"偏好：定格在海报机位，仅保留吸积盘缓慢流动
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) {
  sphToVec(24, 38, 30, camera.position);
  camera.lookAt(0, 0, 0);
  rayUni.uRotSpeed.value = 0.3;
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  tShader += dt;

  if (!reducedMotion) {
    cineTime += dt;
    camera.position.copy(cinePosAt(cineTime, tmpVec));
    camera.lookAt(0, 0, 0);
  }

  rayUni.uTime.value = tShader;
  rayUni.uCamPos.value.copy(camera.position);
  rayUni.uCamTarget.value.set(0, 0, 0);
  compUni.uTime.value = tShader;
  composer.render();
});

window.__threeReady = true;
window.__scene = fsScene;
window.__camera = camera;
window.__renderer = renderer;

// 首帧渲染后隐藏加载界面
let firstFrame = true;
const origRender = composer.render.bind(composer);
composer.render = function () {
  origRender();
  if (firstFrame) {
    firstFrame = false;
    const loader = document.getElementById('bh-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 600);
    }
  }
};
