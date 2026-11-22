// Reinos 3D: each Claude Code session is a floating kingdom, read live from the Obsidian vault.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { construirGuardiao as esculpirGuardiao } from './guardioes.js';
import { construirCidade, assinaturaCidade, nCasas, nHabitantes } from './cidade.js';

// ---------- utilities ----------
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ruido = (x, y, z, s) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s) * 43758.5453;
  return v - Math.floor(v);
};
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ha = (iso) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!isFinite(s) || s < 45) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
};

const BIOMAS = {
  'cristal-lunar': {
    rocha: ['#6a5ea3', '#2a2250', '#120f26'],
    topo: '#3d6b72',
    borda: '#2a3f52',
    muro: '#efe6ff',
    teto: '#3c4fae',
    janela: '#ffd88a',
    agua: '#cfe6ff',
    acento: '#b9a3ff',
    arvore: '#2f5a55',
    flora: 'cristais',
    epiteto: 'das Torres de Cristal',
  },
  'cascatas-douradas': {
    rocha: ['#d6c2a5', '#8a7560', '#3d322b'],
    topo: '#7d9a4f',
    borda: '#5c6f3a',
    muro: '#fff3e2',
    teto: '#4b5f99',
    janela: '#ffcc66',
    agua: '#f4fbff',
    acento: '#ffd27a',
    arvore: '#56752f',
    flora: 'arvores',
    epiteto: 'das Cascatas Douradas',
  },
  'prado-celeste': {
    rocha: ['#c49a87', '#8a6253', '#4a3129'],
    topo: '#8fd16a',
    borda: '#5fa04a',
    muro: '#fffaf0',
    teto: '#d4767f',
    janela: '#ffe199',
    agua: '#e8f7ff',
    acento: '#ff8fb1',
    arvore: '#4f9b48',
    flora: 'flores',
    epiteto: 'do Prado Celeste',
  },
  'aurora-de-gelo': {
    rocha: ['#b9d0e3', '#5f7f9e', '#26394f'],
    topo: '#eef8ff',
    borda: '#b9d4ea',
    muro: '#f4fcff',
    teto: '#5fbcd8',
    janela: '#9ff7d8',
    agua: '#dffbff',
    acento: '#7cf5c8',
    arvore: '#d7ecf8',
    flora: 'cristais',
    epiteto: 'da Aurora de Gelo',
  },
  'floresta-de-lanternas': {
    rocha: ['#7a6855', '#43372d', '#1e1713'],
    topo: '#2f5a3a',
    borda: '#1f3d28',
    muro: '#ecdfc6',
    teto: '#7a3f2e',
    janela: '#ffb54d',
    agua: '#d6f0ff',
    acento: '#ffb54d',
    arvore: '#24472d',
    flora: 'lanternas',
    epiteto: 'das Mil Lanternas',
  },
  'abismo-luminoso': {
    rocha: ['#355a80', '#1a2c48', '#0b1322'],
    topo: '#1f6f74',
    borda: '#155055',
    muro: '#dcf7ff',
    teto: '#2b6fa8',
    janela: '#7ff0ff',
    agua: '#9ff2ff',
    acento: '#ff8fd8',
    arvore: '#ff7fc8',
    flora: 'corais',
    epiteto: 'do Abismo Luminoso',
  },
  'jardim-sakura': {
    rocha: ['#c4afb4', '#7d6670', '#3d3037'],
    topo: '#9fcf7a',
    borda: '#6f9e58',
    muro: '#fff7f8',
    teto: '#3f3a5c',
    janela: '#ffd6a0',
    agua: '#f0f8ff',
    acento: '#ffb7d0',
    arvore: '#ffb7d0',
    flora: 'sakura',
    epiteto: 'das Pétalas Eternas',
  },
};
const STATUS_TXT = {
  trabalhando: 'trabalhando',
  chamando: 'precisa de você',
  repousando: 'esperando um pedido',
  adormecido: 'adormecido',
};
const STATUS_COR = { trabalhando: '#a6f5cf', chamando: '#ffd98a', repousando: '#d8ccff', adormecido: '#c4bfd8' };
const ALVOS = {
  trabalhando: { luz: 1, fluxo: 1, farol: 0, sono: 0 },
  chamando: { luz: 0.85, fluxo: 0.55, farol: 1, sono: 0 },
  repousando: { luz: 0.4, fluxo: 0.3, farol: 0, sono: 0 },
  adormecido: { luz: 0.05, fluxo: 0, farol: 0, sono: 1 },
};
const CEUS = {
  noite: {
    topo: '#050522',
    meio: '#1d1756',
    base: '#5b3f8f',
    nuvem: '#c2b3f0',
    luz: '#9fb0ff',
    luzI: 0.9,
    amb: '#3b2d6e',
    estrelas: 1,
    bloom: 0.75,
  },
  aurora: {
    topo: '#2b2f7a',
    meio: '#c47bb0',
    base: '#ffc9a3',
    nuvem: '#ffd9e6',
    luz: '#ffc7a8',
    luzI: 1.2,
    amb: '#a87fb8',
    estrelas: 0.25,
    bloom: 0.7,
  },
  dia: {
    topo: '#4f86e6',
    meio: '#a99ae6',
    base: '#ffd6e4',
    nuvem: '#fff4fa',
    luz: '#fff1de',
    luzI: 1.3,
    amb: '#9a86c4',
    estrelas: 0,
    bloom: 0.35,
  },
  crepusculo: {
    topo: '#33306f',
    meio: '#e8798a',
    base: '#ffc070',
    nuvem: '#ffd7bc',
    luz: '#ffb47a',
    luzI: 1.3,
    amb: '#c27a8a',
    estrelas: 0.12,
    bloom: 0.75,
  },
};

// ---------- renderer, scene, camera ----------
const palco = document.getElementById('palco');
// No MSAA on the canvas: the scene is rendered through the EffectComposer, so it would only cost memory.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
const PR_MAX = Math.min(devicePixelRatio, 1.75);
const PR_MIN = Math.min(devicePixelRatio, 0.75);
let pixelRatio = PR_MAX;
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
palco.appendChild(renderer.domElement);

const cena = new THREE.Scene();
cena.fog = new THREE.Fog('#3b2d6e', 18, 95);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 3.6, 11);

const controles = new OrbitControls(camera, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.06;
controles.autoRotate = true;
controles.autoRotateSpeed = 0.35;
controles.minDistance = 3;
controles.maxDistance = 45;
controles.maxPolarAngle = Math.PI * 0.53;
controles.target.set(0, 0.4, 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(cena, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Adaptive resolution: when frames get slow, render fewer pixels (the costliest part is the bloom);
// raise it back after a few good seconds, but never above a level that was already too slow.
const desempenho = { soma: 0, n: 0, bons: 0, teto: Infinity };
function ajustarResolucao(dt) {
  desempenho.soma += dt;
  desempenho.n += 1;
  if (desempenho.soma < 1) return;
  const mediaMs = (desempenho.soma / desempenho.n) * 1000;
  desempenho.soma = desempenho.n = 0;
  let novo = pixelRatio;
  if (mediaMs > 25) {
    desempenho.teto = pixelRatio;
    desempenho.bons = 0;
    novo = Math.max(PR_MIN, pixelRatio - 0.25);
  } else if (mediaMs < 18 && ++desempenho.bons >= 5) {
    desempenho.bons = 0;
    if (pixelRatio + 0.25 < desempenho.teto) novo = Math.min(PR_MAX, pixelRatio + 0.25);
  }
  if (novo !== pixelRatio) {
    pixelRatio = novo;
    renderer.setPixelRatio(novo);
    composer.setPixelRatio(novo);
  }
}

const hemi = new THREE.HemisphereLight('#bfb0ff', '#3b2d6e', 0.9);
cena.add(hemi);
const sol = new THREE.DirectionalLight('#ffffff', 1.5);
sol.position.set(-8, 10, 6);
cena.add(sol);

// ---------- textures drawn in canvases ----------
function texturaCanvas(w, h, desenhar, cor = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const texBrilho = texturaCanvas(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});
const texNuvem = texturaCanvas(256, 256, (g, w) => {
  const R = rng(3);
  for (let i = 0; i < 14; i++) {
    const x = w * (0.25 + R() * 0.5),
      y = w * (0.35 + R() * 0.35),
      rr = w * (0.12 + R() * 0.16);
    const r = g.createRadialGradient(x, y, 0, x, y, rr);
    r.addColorStop(0, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.beginPath();
    g.arc(x, y, rr, 0, 7);
    g.fill();
  }
});
const texLua = texturaCanvas(256, 256, (g, w) => {
  const c = w / 2,
    r = w * 0.18;
  const halo = g.createRadialGradient(c, c, r * 0.6, c, c, c);
  halo.addColorStop(0, 'rgba(220,210,255,0.45)');
  halo.addColorStop(1, 'rgba(220,210,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, w, w);
  g.save();
  g.beginPath();
  g.arc(c, c, r, 0, 7);
  g.clip();
  g.fillStyle = '#f6f2ff';
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.arc(c - r * 0.45, c - r * 0.2, r * 0.92, 0, Math.PI * 2, true);
  g.fill('evenodd');
  g.restore();
});
function texJanelas(linhas) {
  return texturaCanvas(64, 32 * linhas, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    const R = rng(linhas * 31);
    for (let l = 0; l < linhas; l++)
      for (let c = 0; c < 4; c++) {
        if (R() < 0.3) continue;
        g.fillStyle = '#fff';
        g.fillRect(c * 16 + 6, l * 32 + 10, 4, 10);
      }
  });
}
const janelasCache = new Map();
const janelas = (n) => {
  if (!janelasCache.has(n)) janelasCache.set(n, texJanelas(n));
  return janelasCache.get(n);
};

// ---------- sky ----------
const ceuMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    topo: { value: new THREE.Color() },
    meio: { value: new THREE.Color() },
    base: { value: new THREE.Color() },
  },
  vertexShader:
    'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 topo; uniform vec3 meio; uniform vec3 base; varying vec3 vP;
    void main(){ float h = vP.y; vec3 c = mix(base, meio, smoothstep(-0.08, 0.22, h)); c = mix(c, topo, smoothstep(0.22, 0.75, h)); gl_FragColor = vec4(c, 1.0); }`,
});
const ceu = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), ceuMat);
cena.add(ceu);

const estrelasGeo = new THREE.BufferGeometry();
{
  const R = rng(11),
    n = 2200,
    p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = R() * Math.PI * 2,
      y = 0.05 + R() * 0.95,
      r = Math.sqrt(1 - y * y);
    p.set([Math.cos(th) * r * 420, y * 420, Math.sin(th) * r * 420], i * 3);
  }
  estrelasGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
}
const estrelasMat = new THREE.PointsMaterial({
  color: '#ffffff',
  size: 1.6,
  sizeAttenuation: false,
  transparent: true,
  fog: false,
  depthWrite: false,
});
cena.add(new THREE.Points(estrelasGeo, estrelasMat));

const lua = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: texLua, transparent: true, fog: false, depthWrite: false }),
);
lua.scale.set(90, 90, 1);
lua.position.set(-160, 150, -300);
cena.add(lua);
const solBrilho = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: texBrilho,
    color: '#ffe2b0',
    transparent: true,
    fog: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
solBrilho.scale.set(260, 260, 1);
cena.add(solBrilho);

const auroraMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  fog: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: { tempo: { value: 0 }, forca: { value: 0 } },
  vertexShader:
    'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float tempo; uniform float forca; varying vec2 vUv;
    void main(){ float onda = sin(vUv.x * 18.0 + tempo * 0.3) * 0.5 + sin(vUv.x * 41.0 - tempo * 0.2) * 0.25;
      float faixa = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.35 + onda * 0.15, 1.0, vUv.y));
      vec3 c = mix(vec3(0.35, 1.0, 0.75), vec3(0.65, 0.5, 1.0), vUv.y);
      gl_FragColor = vec4(c, faixa * forca * (0.5 + 0.5 * sin(vUv.x * 7.0 + tempo * 0.15))); }`,
});
const aurora = new THREE.Mesh(
  new THREE.CylinderGeometry(300, 300, 110, 80, 1, true, Math.PI * 0.9, Math.PI * 0.9),
  auroraMat,
);
aurora.position.y = 120;
cena.add(aurora);

// ---------- cloud sea ----------
const nuvens = new THREE.Group();
const nuvemMats = [0.95, 0.75, 0.55].map(
  (o) =>
    new THREE.SpriteMaterial({ map: texNuvem, transparent: true, opacity: o, depthWrite: false, color: '#ffffff' }),
);
{
  const R = rng(21);
  for (let i = 0; i < 340; i++) {
    const ang = R() * Math.PI * 2,
      rad = Math.sqrt(R()) * 70;
    const s = new THREE.Sprite(nuvemMats[i % 3]);
    const tam = 7 + R() * 12;
    s.scale.set(tam * 1.6, tam, 1);
    s.position.set(Math.cos(ang) * rad, -3.0 - R() * 2.6 + (i % 3) * 0.5, Math.sin(ang) * rad);
    nuvens.add(s);
  }
}
cena.add(nuvens);
const marMat = new THREE.MeshBasicMaterial({ color: '#8f7fd0', transparent: true, opacity: 0.9 });
const mar = new THREE.Mesh(new THREE.CircleGeometry(300, 48), marMat);
mar.rotation.x = -Math.PI / 2;
mar.position.y = -6.5;
cena.add(mar);

// fireflies / drifting motes
const vagaN = 380,
  vagaPos = new Float32Array(vagaN * 3),
  vagaVel = new Float32Array(vagaN);
{
  const R = rng(5);
  for (let i = 0; i < vagaN; i++) {
    vagaPos.set([(R() - 0.5) * 40, -4 + R() * 12, (R() - 0.5) * 40], i * 3);
    vagaVel[i] = 0.1 + R() * 0.3;
  }
}
const vagaGeo = new THREE.BufferGeometry();
vagaGeo.setAttribute('position', new THREE.BufferAttribute(vagaPos, 3));
const vagaMat = new THREE.PointsMaterial({
  map: texBrilho,
  color: '#ffe7a8',
  size: 0.14,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
cena.add(new THREE.Points(vagaGeo, vagaMat));

// ---------- island builder ----------
function material(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
}

function rochaGeo(semente, altura) {
  const g = new THREE.ConeGeometry(1, altura, 11, 7);
  g.rotateX(Math.PI);
  g.translate(0, -altura / 2, 0);
  const p = g.attributes.position,
    cores = new Float32Array(p.count * 3);
  const b = semente.bioma,
    c0 = new THREE.Color(b.rocha[0]),
    c1 = new THREE.Color(b.rocha[1]),
    c2 = new THREE.Color(b.rocha[2]);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const k = ruido(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100), semente.n);
    if (y < -0.02) {
      const f = 1 + (k - 0.5) * 0.5;
      x *= f;
      z *= f;
      y += (ruido(x, y, z, semente.n + 1) - 0.5) * 0.18;
    }
    p.setXYZ(i, x, y, z);
    const t = clamp(-y / altura, 0, 1);
    const c = t < 0.45 ? c0.clone().lerp(c1, t / 0.45) : c1.clone().lerp(c2, (t - 0.45) / 0.55);
    c.multiplyScalar(0.85 + k * 0.3);
    cores.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  g.computeVertexNormals();
  return g;
}

const cascataVS =
  'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const cascataFS = `uniform float tempo; uniform float fluxo; uniform vec3 cor; varying vec2 vUv;
  void main(){ float desce = fract(vUv.y * 5.0 + tempo * 1.4 + sin(vUv.x * 9.0) * 0.2);
    float faixas = 0.55 + 0.45 * sin(vUv.x * 30.0 + vUv.y * 3.0);
    float borda = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
    float a = fluxo * borda * smoothstep(0.0, 0.5, vUv.y) * (0.45 + 0.55 * faixas * smoothstep(0.2, 1.0, desce));
    gl_FragColor = vec4(cor * (0.8 + 0.25 * desce), a * 0.75); }`;

const farolVS =
  'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const farolFS = `uniform float tempo; uniform float forca; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float lado = pow(abs(dot(vN, vV)), 1.6); float sobe = pow(1.0 - vUv.y, 1.4);
    float pulso = 0.65 + 0.35 * sin(tempo * 3.0 - vUv.y * 12.0);
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.55) * 1.6, forca * lado * sobe * pulso * 0.75); }`;

function construirReino(r) {
  const b = BIOMAS[r.bioma] || BIOMAS['cascatas-douradas'];
  const seed = hash(r.sessao),
    R = rng(seed);
  const grupo = new THREE.Group();
  const corpo = new THREE.Group();
  grupo.add(corpo);
  const animados = { janelas: [], luzes: [], cascatas: [], cristais: [], flora: [] };

  const altura = 1.7 + R() * 0.6;
  corpo.add(
    new THREE.Mesh(
      rochaGeo({ bioma: b, n: seed % 1000 }, altura),
      material('#ffffff', { vertexColors: true, roughness: 0.95 }),
    ),
  );
  const topo = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.99, 0.14, 30), [
    material(b.borda),
    material(b.topo, { flatShading: false }),
    material(b.borda),
  ]);
  corpo.add(topo);

  // flora
  const pontoTopo = (min) => {
    for (let i = 0; i < 40; i++) {
      const a = R() * Math.PI * 2,
        d = Math.sqrt(R()) * 0.92;
      if (d > min) return [Math.cos(a) * d, Math.sin(a) * d];
    }
    return [0.8, 0];
  };
  if (b.flora === 'cristais') {
    const mat = material(b.acento, {
      emissive: b.acento,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    animados.cristais.push(mat);
    for (let i = 0; i < 10; i++) {
      const [x, z] = pontoTopo(0.55),
        h = 0.12 + R() * 0.22;
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), mat);
      m.scale.set(1, h / 0.1, 1);
      m.position.set(x, 0.07 + h / 2, z);
      m.rotation.set((R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4);
      corpo.add(m);
      animados.flora.push(m);
    }
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2,
        d = 0.25 + R() * 0.35,
        h = 0.25 + R() * 0.3;
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), mat);
      m.scale.set(1, h / 0.14, 1);
      m.position.set(Math.cos(a) * d, -altura * (0.25 + R() * 0.3), Math.sin(a) * d);
      corpo.add(m);
    }
  } else {
    const nArv = b.flora === 'flores' ? 5 : 9;
    const matArv = material(
      b.arvore,
      b.flora === 'corais'
        ? { emissive: b.arvore, emissiveIntensity: 0.5 }
        : b.flora === 'sakura'
          ? { emissive: b.arvore, emissiveIntensity: 0.12 }
          : {},
    );
    if (b.flora === 'corais') animados.cristais.push(matArv);
    for (let i = 0; i < nArv; i++) {
      const [x, z] = pontoTopo(0.55);
      if (b.flora === 'corais') {
        for (let k = 0; k < 3; k++) {
          const m = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2 + R() * 0.15, 5), matArv);
          m.position.set(x + (R() - 0.5) * 0.08, 0.15, z + (R() - 0.5) * 0.08);
          m.rotation.set((R() - 0.5) * 0.8, 0, (R() - 0.5) * 0.8);
          corpo.add(m);
          animados.flora.push(m);
        }
      } else {
        const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 5), material('#5a4636'));
        tronco.position.set(x, 0.12, z);
        corpo.add(tronco);
        animados.flora.push(tronco);
        const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + R() * 0.06, 0), matArv);
        copa.position.set(x, 0.22 + R() * 0.05, z);
        copa.rotation.set(R(), R(), R());
        corpo.add(copa);
        animados.flora.push(copa);
      }
    }
    if (b.flora === 'flores' || b.flora === 'sakura') {
      const n = 160,
        pos = new Float32Array(n * 3),
        cor = new Float32Array(n * 3);
      const paleta = (
        b.flora === 'sakura' ? ['#ffd1e0', '#ffffff', '#ffb7d0'] : ['#ff8fb1', '#ffe27a', '#ffffff', '#c9a8ff']
      ).map((c) => new THREE.Color(c));
      for (let i = 0; i < n; i++) {
        const [x, z] = pontoTopo(0.2);
        pos.set([x, 0.08, z], i * 3);
        const c = paleta[i % paleta.length];
        cor.set([c.r, c.g, c.b], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(cor, 3));
      const flores = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, vertexColors: true }));
      corpo.add(flores);
      animados.flora.push(flores);
    }
  }
  // lanterns around the rim (more in the lantern forest)
  const nLant = b.flora === 'lanternas' ? 16 : 7;
  const matLant = new THREE.MeshBasicMaterial({ color: new THREE.Color(b.janela).multiplyScalar(2.2) });
  animados.luzes.push(matLant);
  for (let i = 0; i < nLant; i++) {
    const a = R() * Math.PI * 2,
      d = b.flora === 'lanternas' ? 0.4 + R() * 0.55 : 0.93;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), matLant);
    m.position.set(Math.cos(a) * d, b.flora === 'lanternas' ? 0.25 + R() * 0.12 : 0.1, Math.sin(a) * d);
    corpo.add(m);
  }

  // castle: walls + up to 9 towers (shown as the session does more work)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.16, 14), material(b.muro));
  base.position.y = 0.15;
  corpo.add(base);
  const torres = [];
  for (let i = 0; i < 9; i++) {
    const principal = i === 0;
    const ang = ((i - 1) / 8) * Math.PI * 2 + R() * 0.4,
      dist = principal ? 0 : 0.3 + R() * 0.14;
    const raio = principal ? 0.14 : 0.07 + R() * 0.04;
    const h = principal ? 1.05 + R() * 0.3 : 0.45 + R() * 0.45;
    const linhas = Math.max(1, Math.round(h / 0.22));
    const tex = janelas(linhas).clone();
    tex.needsUpdate = true;
    const mat = material(b.muro, { emissive: b.janela, emissiveMap: tex, emissiveIntensity: 1, flatShading: false });
    const t = new THREE.Group();
    const corpoTorre = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio * 1.06, h, 10), mat);
    corpoTorre.position.y = h / 2;
    const alturaTeto = raio * (2.4 + R() * 1.2);
    const teto = new THREE.Mesh(
      new THREE.ConeGeometry(raio * 1.35, alturaTeto, 10),
      material(b.teto, { roughness: 0.5 }),
    );
    teto.position.y = h + alturaTeto / 2;
    t.add(corpoTorre, teto);
    t.position.set(Math.cos(ang) * dist, 0.07, Math.sin(ang) * dist);
    t.visible = i < 2;
    corpo.add(t);
    animados.janelas.push(mat);
    torres.push({ grupo: t, topo: new THREE.Vector3(t.position.x, 0.07 + h + alturaTeto, t.position.z) });
  }

  // waterfalls falling from the rim
  const nCasc = b.flora === 'arvores' ? 3 : 1 + Math.floor(R() * 2);
  for (let i = 0; i < nCasc; i++) {
    const a = R() * Math.PI * 2,
      L = 3.4 + R() * 1.2,
      largura = 0.12 + R() * 0.1;
    const geo = new THREE.PlaneGeometry(largura, L);
    geo.translate(0, -L / 2, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { tempo: { value: 0 }, fluxo: { value: 0 }, cor: { value: new THREE.Color(b.agua) } },
      vertexShader: cascataVS,
      fragmentShader: cascataFS,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.cos(a) * 1.01, 0.05, Math.sin(a) * 1.01);
    m.rotation.y = Math.PI / 2 - a;
    corpo.add(m);
    animados.cascatas.push(mat);
  }

  // beacon (calls for you)
  const topoPrincipal = torres[0].topo;
  const farolMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { tempo: { value: 0 }, forca: { value: 0 } },
    vertexShader: farolVS,
    fragmentShader: farolFS,
  });
  const farolGeo = new THREE.CylinderGeometry(0.55, 0.1, 30, 24, 1, true);
  farolGeo.translate(0, 15, 0);
  const farol = new THREE.Mesh(farolGeo, farolMat);
  farol.position.copy(topoPrincipal);
  corpo.add(farol);
  const aneis = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 48),
      new THREE.MeshBasicMaterial({
        color: '#ffd98a',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(topoPrincipal);
    corpo.add(m);
    return m;
  });
  const luzFarol = new THREE.PointLight('#ffd98a', 0, 6, 1.5);
  luzFarol.position.copy(topoPrincipal);
  corpo.add(luzFarol);
  const estrelaFarol = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texBrilho,
      color: '#ffe2a0',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  estrelaFarol.position.copy(topoPrincipal);
  estrelaFarol.scale.set(1.4, 1.4, 1);
  corpo.add(estrelaFarol);

  // warm glow over the castle
  const luzCastelo = new THREE.PointLight(b.janela, 0, 3.2, 1.6);
  luzCastelo.position.set(0, 0.7, 0);
  corpo.add(luzCastelo);

  // invisible target for the mouse
  const alvo = new THREE.Mesh(new THREE.SphereGeometry(1.25, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  alvo.position.y = -0.2;
  alvo.scale.y = 1.3;
  grupo.add(alvo);

  // emissary islets (subagents)
  const emissarios = [];
  for (let i = 0; i < 5; i++) {
    const e = new THREE.Group();
    const rocha = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), material(b.rocha[1]));
    rocha.rotation.x = Math.PI;
    rocha.position.y = -0.15;
    const chao = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 8), material(b.topo));
    const torre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.18, 6),
      material(b.muro, { emissive: b.janela, emissiveIntensity: 0.8 }),
    );
    torre.position.y = 0.1;
    const teto = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), material(b.teto));
    teto.position.y = 0.24;
    e.add(rocha, chao, torre, teto);
    e.visible = false;
    grupo.add(e);
    emissarios.push(e);
  }

  // small rocks drifting under the island
  const pedras = [];
  const matPedra = material(b.rocha[1]);
  for (let i = 0; i < 8; i++) {
    const a = R() * Math.PI * 2,
      d = 0.9 + R() * 0.7;
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04 + R() * 0.09, 0), matPedra);
    p.position.set(Math.cos(a) * d, -0.3 - R() * 1.3, Math.sin(a) * d);
    p.rotation.set(R() * 3, R() * 3, 0);
    if (R() > 0.5) {
      const musgo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.015, 7), material(b.topo));
      musgo.position.y = 0.05;
      p.add(musgo);
    }
    corpo.add(p);
    pedras.push({ p, y: p.position.y, f: R() * 6 });
  }

  return {
    grupo,
    corpo,
    animados,
    torres,
    farolMat,
    aneis,
    luzFarol,
    estrelaFarol,
    luzCastelo,
    alvo,
    emissarios,
    pedras,
    b,
  };
}

// ---------- guardians ----------
function construirGuardiao(nome) {
  const gu = esculpirGuardiao(nome, texBrilho);
  const N = 60,
    pos = new Float32Array(N * 3),
    cor = new Float32Array(N * 3);
  const c = new THREE.Color(gu.G.brilho);
  for (let i = 0; i < N; i++) {
    const k = (i / N) ** 1.6;
    cor.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  const trilha = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  trilha.frustumCulled = false;
  return Object.assign(gu, { trilha, iniciou: false, esmaecido: 1, acumulado: 0 });
}

// ---------- particles (embers, fairy dust, foxfire) ----------
const PN = 2400;
const pPos = new Float32Array(PN * 3),
  pCor = new Float32Array(PN * 3),
  pVel = new Float32Array(PN * 3),
  pBase = new Float32Array(PN * 3),
  pVida = new Float32Array(PN),
  pMax = new Float32Array(PN).fill(1);
pPos.fill(-999);
let pProx = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCor, 3));
const particulas = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    map: texBrilho,
    size: 0.09,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
particulas.frustumCulled = false;
cena.add(particulas);
const corCache = new Map();
function emitir(gu, origem, dt, escala) {
  const cfg = gu.particulas;
  if (!cfg) return;
  gu.acumulado += cfg.taxa * dt;
  if (!corCache.has(cfg.cor)) corCache.set(cfg.cor, new THREE.Color(cfg.cor));
  const c = corCache.get(cfg.cor);
  while (gu.acumulado >= 1) {
    gu.acumulado -= 1;
    const i = pProx;
    pProx = (pProx + 1) % PN;
    const e = cfg.espalhar * escala;
    pPos.set(
      [
        origem.x + (Math.random() - 0.5) * e * 2,
        origem.y + (Math.random() - 0.5) * e * 2,
        origem.z + (Math.random() - 0.5) * e * 2,
      ],
      i * 3,
    );
    pVel.set(
      [
        (Math.random() - 0.5) * 0.08 * escala,
        cfg.subir * escala * (0.6 + Math.random() * 0.6),
        (Math.random() - 0.5) * 0.08 * escala,
      ],
      i * 3,
    );
    pBase.set([c.r, c.g, c.b], i * 3);
    pVida[i] = pMax[i] = cfg.vida * (0.7 + Math.random() * 0.6);
  }
}
function animarParticulas(dt) {
  for (let i = 0; i < PN; i++) {
    if (pVida[i] <= 0) continue;
    pVida[i] -= dt;
    const k = Math.max(0, pVida[i] / pMax[i]),
      j = i * 3;
    pPos[j] += pVel[j] * dt;
    pPos[j + 1] += pVel[j + 1] * dt;
    pPos[j + 2] += pVel[j + 2] * dt;
    const brilho = k * k * (0.6 + 0.4 * Math.sin(i + pVida[i] * 12));
    pCor[j] = pBase[j] * brilho;
    pCor[j + 1] = pBase[j + 1] * brilho;
    pCor[j + 2] = pBase[j + 2] * brilho;
    if (pVida[i] <= 0) {
      pPos[j + 1] = -999;
      pCor[j] = pCor[j + 1] = pCor[j + 2] = 0;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

// ---------- bridges of light ----------
const ponteVS =
  'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ponteFS = `uniform float tempo; uniform float progresso; uniform float forca; uniform float tracejado; uniform vec3 cor; uniform float nucleo; varying vec2 vUv;
  void main(){ if (vUv.x > progresso) discard;
    float pulso = smoothstep(0.85, 1.0, fract(vUv.x * 4.0 - tempo * 0.35)) + smoothstep(0.9, 1.0, fract(vUv.x * 4.0 + tempo * 0.27)) * 0.7;
    float traco = mix(1.0, step(0.45, fract(vUv.x * 40.0 - tempo * 0.8)), tracejado);
    float cabeca = (1.0 - step(1.0, progresso)) * smoothstep(progresso - 0.05, progresso, vUv.x) * 2.5;
    float a = forca * ((nucleo > 0.5 ? (0.6 * traco + pulso) : (0.16 + pulso * 0.4)) + cabeca);
    gl_FragColor = vec4(cor * (nucleo > 0.5 ? 1.6 : 1.0), a); }`;
function construirPonte(tipo) {
  const cor = new THREE.Color(tipo === 'ponte' ? '#ffe6a8' : '#c9b6ff');
  const fazer = (nucleo) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tempo: { value: 0 },
        progresso: { value: 0 },
        forca: { value: 1 },
        tracejado: { value: tipo === 'ponte' ? 0 : 1 },
        cor: { value: cor },
        nucleo: { value: nucleo },
      },
      vertexShader: ponteVS,
      fragmentShader: ponteFS,
    });
  const nucleo = new THREE.Mesh(new THREE.BufferGeometry(), fazer(1));
  const aura = new THREE.Mesh(new THREE.BufferGeometry(), fazer(0));
  nucleo.frustumCulled = aura.frustumCulled = false;
  cena.add(nucleo, aura);
  return { nucleo, aura, a0: new THREE.Vector3(1e9, 0, 0), b0: new THREE.Vector3(), nasceu: performance.now() };
}

// ---------- decor: distant islands and a wandering sky whale ----------
{
  const R = rng(99);
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2,
      d = 26 + R() * 30,
      s = 0.8 + R() * 2.2;
    const g = new THREE.Group();
    const cor = ['#5d5291', '#8a7560', '#5f7f9e', '#7d6670'][i % 4];
    const rocha = new THREE.Mesh(
      rochaGeo({ bioma: { rocha: [cor, cor, '#1a1530'] }, n: i * 7 }, 1.8),
      material('#ffffff', { vertexColors: true }),
    );
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 16), material('#6f8f5a'));
    g.add(rocha, topo);
    if (R() > 0.45)
      for (let k = 0; k < 3; k++) {
        const h = 0.4 + R() * 0.9;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, h, 6), material('#e9e0f5'));
        t.position.set((k - 1) * 0.25, h / 2, (R() - 0.5) * 0.3);
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), material('#4b5f99'));
        c.position.set(t.position.x, h + 0.15, t.position.z);
        g.add(t, c);
      }
    g.position.set(Math.cos(a) * d, -1 + R() * 9, Math.sin(a) * d);
    g.scale.setScalar(s);
    g.userData.f = R() * 6;
    cena.add(g);
    (cena.userData.ilhotas ||= []).push(g);
  }
}
const baleiaFundo = construirGuardiao('baleia celeste');
baleiaFundo.raiz.scale.setScalar(6);
baleiaFundo.halo.material.opacity = 0.25;
cena.add(baleiaFundo.raiz);

// ---------- state ----------
const reinos = new Map();
const pontes = new Map();
let somLigado = false,
  audio = null,
  modoDemo = false,
  modoCeu = 'auto';
const rotulos = document.getElementById('rotulos');

function tocarSino() {
  if (!somLigado) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  const t0 = audio.currentTime;
  [659.25, 987.77, 1318.5].forEach((f, i) => {
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t0 + i * 0.12);
    g.gain.linearRampToValueAtTime(0.08, t0 + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.12 + 1.8);
    o.connect(g).connect(audio.destination);
    o.start(t0 + i * 0.12);
    o.stop(t0 + i * 0.12 + 2);
  });
}

function descartar(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose?.());
  });
  obj.parent?.remove(obj);
}

function aplicarDados(novo) {
  const vistos = new Set();
  for (const r of novo.reinos) {
    vistos.add(r.sessao);
    let v = reinos.get(r.sessao);
    if (!v) {
      const k = construirReino(r);
      const gu = construirGuardiao(r.guardiao);
      cena.add(k.grupo, gu.raiz, gu.trilha);
      const el = document.createElement('div');
      el.className = 'rotulo';
      rotulos.appendChild(el);
      v = {
        k,
        gu,
        el,
        pos: new THREE.Vector3(0, -6, 0),
        alvo: new THREE.Vector3(),
        s: 0.001,
        ts: 1,
        luz: 0,
        fluxo: 0,
        farol: 0,
        sono: 0,
        fase: (hash(r.sessao) % 1000) / 100,
        novo: true,
      };
      reinos.set(r.sessao, v);
    } else if (v.r && v.r.status !== 'chamando' && r.status === 'chamando') tocarSino();
    v.r = r;
    v.saindo = false;
  }
  for (const [id, v] of reinos) if (!vistos.has(id)) v.saindo = true;

  const chaves = new Set();
  for (const p of novo.pontes) {
    const k = p.a + '|' + p.b;
    chaves.add(k);
    if (!pontes.has(k)) pontes.set(k, { ...construirPonte(p.tipo), p });
    else pontes.get(k).p = p;
  }
  for (const [k, pt] of pontes)
    if (!chaves.has(k)) {
      descartar(pt.nucleo);
      descartar(pt.aura);
      pontes.delete(k);
    }

  const despertos = novo.reinos.filter((r) => r.status !== 'adormecido');
  const chamando = despertos.filter((r) => r.status === 'chamando').length;
  const trabalhando = despertos.filter((r) => r.status === 'trabalhando').length;
  const partes = [
    despertos.length
      ? `${despertos.length} ${despertos.length === 1 ? 'reino desperto' : 'reinos despertos'}`
      : 'Nenhum reino desperto',
  ];
  if (trabalhando) partes.push(`${trabalhando} trabalhando`);
  if (chamando) partes.push(`${chamando} ${chamando === 1 ? 'precisa' : 'precisam'} de você`);
  document.getElementById('resumo').textContent = partes.join(' · ') + (modoDemo ? ' · demonstração' : '');
  document.title = chamando ? `(${chamando}) Reinos` : 'Reinos';
  document.getElementById('vazio').hidden = novo.reinos.length > 0;
  posicionar();
  if (focado) {
    if (garantirCidade(focado)) {
      mostrarCidade(focado, true);
      if (!voo) criarLocais();
    }
    renderPainel();
  }
}

let raioMundo = 0;
function posicionar() {
  const lista = [...reinos.values()].filter((v) => !v.saindo);
  const despertos = lista
    .filter((v) => v.r.status !== 'adormecido')
    .sort(
      (a, b) =>
        (a.r.projeto || '').localeCompare(b.r.projeto || '') || (a.r.inicio || '').localeCompare(b.r.inicio || ''),
    );
  const adorm = lista.filter((v) => v.r.status === 'adormecido');
  const n = despertos.length;
  const R = n <= 1 ? 0 : Math.max(2.8, n * 0.95);
  despertos.forEach((v, i) => {
    const a = (i / Math.max(n, 1)) * Math.PI * 2 + 0.4;
    v.alvo.set(Math.cos(a) * R, (i % 2 ? 0.55 : -0.15) + ((hash(v.r.sessao) % 20) - 10) / 40, Math.sin(a) * R);
    v.ts = 1;
  });
  const R2 = R + 6;
  adorm.forEach((v, i) => {
    const a = (i / Math.max(adorm.length, 1)) * Math.PI * 2 + 1.1;
    v.alvo.set(Math.cos(a) * R2, -2.1 + (i % 2) * 0.5, Math.sin(a) * R2);
    v.ts = 0.55;
  });
  for (const v of lista)
    if (v.novo) {
      v.pos.set(v.alvo.x, v.alvo.y - 3.5, v.alvo.z);
      v.novo = false;
    }
  raioMundo = R;
}

// ---------- sky update ----------
function ceuAtual() {
  if (modoCeu !== 'auto') return { ...CEUS[modoCeu], nome: modoCeu };
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  const marcos = [
    [0, 'noite'],
    [4.5, 'noite'],
    [6.5, 'aurora'],
    [8, 'dia'],
    [16.5, 'dia'],
    [18, 'crepusculo'],
    [19.5, 'noite'],
    [24, 'noite'],
  ];
  for (let i = 0; i < marcos.length - 1; i++) {
    const [h0, a] = marcos[i],
      [h1, b] = marcos[i + 1];
    if (h >= h0 && h < h1) {
      const t = (h - h0) / (h1 - h0),
        A = CEUS[a],
        B = CEUS[b],
        c = {};
      for (const k of Object.keys(A))
        c[k] =
          typeof A[k] === 'number'
            ? lerp(A[k], B[k], t)
            : '#' + new THREE.Color(A[k]).lerp(new THREE.Color(B[k]), t).getHexString();
      c.nome = t < 0.5 ? a : b;
      return c;
    }
  }
  return { ...CEUS.noite, nome: 'noite' };
}
const cTmp = new THREE.Color();
function aplicarCeu(c, t) {
  ceuMat.uniforms.topo.value.set(c.topo);
  ceuMat.uniforms.meio.value.set(c.meio);
  ceuMat.uniforms.base.value.set(c.base);
  cena.fog.color.set(c.meio).lerp(cTmp.set(c.base), 0.3);
  for (const m of nuvemMats) m.color.set(c.nuvem);
  marMat.color.set(c.nuvem).lerp(cTmp.set(c.amb), 0.5);
  hemi.color.set(c.luz);
  hemi.groundColor.set(c.amb);
  hemi.intensity = 0.75 + (1 - c.estrelas) * 0.15;
  sol.color.set(c.luz);
  sol.intensity = c.luzI;
  estrelasMat.opacity = c.estrelas;
  lua.material.opacity = c.estrelas;
  const temSol =
    c.nome === 'dia' ? 0.5 : c.nome === 'aurora' || c.nome === 'crepusculo' ? clamp(1 - c.estrelas * 2.5, 0, 1) : 0;
  solBrilho.material.opacity = temSol;
  solBrilho.position.set(c.nome === 'aurora' ? 260 : -260, c.nome === 'dia' ? 220 : 25, -200);
  auroraMat.uniforms.forca.value = clamp((c.estrelas - 0.5) * 1.4, 0, 0.7);
  auroraMat.uniforms.tempo.value = t;
  vagaMat.opacity = 0.35 + c.estrelas * 0.65;
  bloom.strength = c.bloom * (focado ? 0.5 : 1);
  renderer.toneMappingExposure = 1.1 - (1 - c.estrelas) * 0.2;
}

// ---------- per-frame kingdom animation ----------
const vTmp = new THREE.Vector3(),
  vTmp2 = new THREE.Vector3();
function nTorres(r) {
  return clamp(2 + Math.floor(Math.log2(1 + (Number(r.acoes) || 0))), 2, 9);
}

function animarReino(v, t, dt) {
  const { k, gu } = v;
  const alvo = ALVOS[v.r.status] || ALVOS.repousando;
  const e = Math.min(1, dt * 1.5);
  for (const p of ['luz', 'fluxo', 'farol', 'sono']) v[p] = lerp(v[p], alvo[p], e);
  v.pos.lerp(v.alvo, Math.min(1, dt * 0.9));
  v.s = lerp(v.s, v.saindo ? 0 : v.ts, Math.min(1, dt * 1.4));

  const bob = Math.sin(t * 0.55 + v.fase) * 0.12 - v.sono * 0.4;
  k.grupo.position.set(v.pos.x, v.pos.y + bob, v.pos.z);
  k.grupo.scale.setScalar(Math.max(0.001, v.s));
  k.corpo.rotation.y = v.fase + t * 0.03;
  k.corpo.rotation.z = Math.sin(t * 0.4 + v.fase) * 0.02;

  const n = nTorres(v.r);
  k.torres.forEach((q, i) => {
    q.grupo.visible = i < n;
  });
  const tremeluz = 0.9 + 0.1 * Math.sin(t * 5 + v.fase);
  for (const m of k.animados.janelas) m.emissiveIntensity = 0.03 + v.luz * 1.25 * tremeluz;
  for (const m of k.animados.luzes) m.color.set(k.b.janela).multiplyScalar(0.3 + v.luz * 2.2);
  for (const m of k.animados.cristais) m.emissiveIntensity = 0.2 + v.luz * 0.9;
  for (const m of k.animados.cascatas) {
    m.uniforms.tempo.value = t;
    m.uniforms.fluxo.value = v.fluxo;
  }
  const perto = focado === v ? 0.3 : 1;
  k.luzCastelo.intensity = v.luz * 1.2 * perto;

  k.farolMat.uniforms.tempo.value = t;
  k.farolMat.uniforms.forca.value = v.farol * perto;
  k.luzFarol.intensity = v.farol * 6 * perto;
  k.estrelaFarol.material.opacity = v.farol * (0.7 + 0.3 * Math.sin(t * 4));
  k.aneis.forEach((m, i) => {
    const f = (t * 0.55 + i / 3) % 1;
    m.scale.setScalar(0.2 + f * 1.6);
    m.material.opacity = v.farol * (1 - f) * 0.9;
  });

  const nEm = Math.min(5, Number(v.r.emissarios) || 0);
  k.emissarios.forEach((em, i) => {
    em.visible = i < nEm;
    if (!em.visible) return;
    const a = t * 0.35 + (i / Math.max(nEm, 1)) * Math.PI * 2;
    em.position.set(Math.cos(a) * 1.75, 0.15 + Math.sin(t + i) * 0.1, Math.sin(a) * 1.75);
  });

  for (const pd of k.pedras) {
    pd.p.position.y = pd.y + Math.sin(t * 0.6 + pd.f) * 0.06;
    pd.p.rotation.y += dt * 0.15;
  }

  // guardian
  const G = gu.G,
    st = v.r.status,
    centro = k.grupo.position,
    s = Math.max(v.s, 0.001);
  const embaixo = G.forma === 'baleia' || G.forma === 'aguaviva';
  if (st === 'chamando') {
    k.corpo.localToWorld(vTmp.copy(k.torres[0].topo));
    vTmp.x += Math.cos(t * 1.4 + v.fase) * 0.6 * s;
    vTmp.z += Math.sin(t * 1.4 + v.fase) * 0.6 * s;
    vTmp.y += (embaixo ? 0.7 : 0.45) * s + Math.sin(t * 3) * 0.06;
  } else if (st === 'adormecido') {
    vTmp.set(centro.x + 0.75 * s, centro.y + (embaixo ? -0.6 : 0.3) * s, centro.z + 0.45 * s);
  } else {
    const vel = G.vel * (st === 'trabalhando' ? 1 : 0.4);
    const a = t * vel + v.fase;
    const rx = (embaixo ? 2.3 : 1.8) * s;
    vTmp.set(
      centro.x + Math.cos(a) * rx,
      centro.y + (embaixo ? -1.25 : 1.0) * s + Math.sin(a * 2) * 0.2 * s,
      centro.z + Math.sin(a) * rx,
    );
  }
  if (!gu.iniciou) {
    gu.raiz.position.copy(vTmp);
    gu.iniciou = true;
    const p = gu.trilha.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, vTmp.x, vTmp.y, vTmp.z);
  }
  vTmp2.copy(gu.raiz.position);
  gu.raiz.position.lerp(vTmp, Math.min(1, dt * 3));
  if (!gu.semGirar && gu.raiz.position.distanceToSquared(vTmp2) > 1e-7) {
    vTmp.copy(gu.raiz.position).add(gu.raiz.position).sub(vTmp2);
    const antes = gu.modelo.quaternion.clone();
    gu.modelo.lookAt(vTmp);
    gu.modelo.quaternion.copy(antes.slerp(gu.modelo.quaternion, Math.min(1, dt * 5)));
  }
  gu.raiz.scale.setScalar(s);
  const energia = { trabalhando: 1, chamando: 0.85, repousando: 0.4, adormecido: 0.06 }[st] ?? 0.4;
  gu.update(t + v.fase, energia, { caudas: nTorres(v.r) });
  const alvoEsm = st === 'adormecido' ? 0.4 : 1;
  if (gu.esmaecido !== alvoEsm) {
    gu.esmaecido = alvoEsm;
    gu.esmaecer(alvoEsm);
  }
  gu.halo.material.opacity = (st === 'adormecido' ? 0.12 : 0.4) * Math.min(1, s);
  const p = gu.trilha.geometry.attributes.position;
  for (let i = 0; i < p.count - 1; i++) p.setXYZ(i, p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1));
  p.setXYZ(p.count - 1, gu.raiz.position.x, gu.raiz.position.y, gu.raiz.position.z);
  p.needsUpdate = true;
  gu.trilha.visible = st !== 'adormecido';
  if (st !== 'adormecido' && s > 0.3) emitir(gu, gu.raiz.position, dt, s);

  // the city (only built and shown while visiting)
  if (v.cidade && v.cidade.grupo.visible) v.cidade.update(t, { luz: v.luz, status: st });
}

function animarPontes(t) {
  const agora = performance.now();
  for (const pt of pontes.values()) {
    const A = reinos.get(pt.p.a),
      B = reinos.get(pt.p.b);
    if (!A || !B) {
      pt.nucleo.visible = pt.aura.visible = false;
      continue;
    }
    const a = vTmp.copy(A.k.grupo.position);
    a.y += 0.25 * A.s;
    const b = vTmp2.copy(B.k.grupo.position);
    b.y += 0.25 * B.s;
    // Rebuilding the tubes is costly: only when an end moved noticeably (~3 cm in island units).
    if (a.distanceToSquared(pt.a0) > 1e-3 || b.distanceToSquared(pt.b0) > 1e-3) {
      pt.a0.copy(a);
      pt.b0.copy(b);
      const meio = a.clone().add(b).multiplyScalar(0.5);
      meio.y += Math.min(3, a.distanceTo(b) * 0.35);
      const curva = new THREE.QuadraticBezierCurve3(a.clone(), meio, b.clone());
      pt.nucleo.geometry.dispose();
      pt.aura.geometry.dispose();
      pt.nucleo.geometry = new THREE.TubeGeometry(curva, 80, 0.022, 6);
      pt.aura.geometry = new THREE.TubeGeometry(curva, 80, 0.09, 8);
    }
    const dormindo = A.r.status === 'adormecido' || B.r.status === 'adormecido';
    const forca = (dormindo ? 0.25 : 1) * Math.min(A.s / A.ts, B.s / B.ts, 1);
    const progresso = clamp((agora - pt.nasceu) / 2600, 0, 1.001);
    for (const m of [pt.nucleo.material, pt.aura.material]) {
      m.uniforms.tempo.value = t;
      m.uniforms.progresso.value = progresso;
      m.uniforms.forca.value = forca;
    }
    pt.nucleo.visible = pt.aura.visible = true;
  }
}

function atualizarRotulos() {
  const w = innerWidth,
    h = innerHeight;
  for (const v of reinos.values()) {
    vTmp.copy(v.k.grupo.position);
    vTmp.y -= 0.45 * v.s;
    vTmp.project(camera);
    const visivel = vTmp.z < 1 && v.s > 0.15 && v !== focado;
    v.el.style.display = visivel ? '' : 'none';
    if (!visivel) continue;
    const x = (vTmp.x * 0.5 + 0.5) * w,
      y = (-vTmp.y * 0.5 + 0.5) * h;
    const longe = v.r.status === 'adormecido';
    v.el.style.transform = `translate(-50%, 0) translate(${x}px, ${y}px) scale(${longe ? 0.8 : 1})`;
    v.el.style.opacity = String(clamp(v.s / v.ts, 0, 1) * (longe ? 0.7 : 1) * (focado ? 0.35 : 1));
    const conteudo = `<b>${esc(v.r.reino || v.r.nota)}</b><small style="color:${STATUS_COR[v.r.status] || '#fff'}">${esc(v.r.projeto)} · ${esc(STATUS_TXT[v.r.status] || v.r.status)} · ${esc(ha(v.r.desde))}</small>`;
    if (v.el._c !== conteudo) {
      v.el.innerHTML = conteudo;
      v.el._c = conteudo;
    }
  }
}

// ---------- hover card ----------
const cartao = document.getElementById('cartao');
const raio = new THREE.Raycaster(),
  ponteiro = new THREE.Vector2();
let foco = null,
  mouse = null;
function acharReino(x, y) {
  ponteiro.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  const alvos = [...reinos.values()].filter((v) => v.s > 0.2).map((v) => v.k.alvo);
  const hit = raio.intersectObjects(alvos, false)[0];
  return hit ? [...reinos.values()].find((v) => v.k.alvo === hit.object) : null;
}
function mostrarCartao(v, mx, my) {
  if (!v || v === focado) {
    cartao.classList.remove('visivel');
    renderer.domElement.style.cursor = '';
    return;
  }
  const r = v.r,
    b = BIOMAS[r.bioma];
  renderer.domElement.style.cursor = 'pointer';
  const html = `
    <div class="epiteto">O reino ${esc(b?.epiteto || '')}</div>
    <h2>${esc(r.reino)}</h2>
    <span class="pilula s-${esc(r.status)}">${esc(STATUS_TXT[r.status] || r.status)} · ${esc(ha(r.desde))}</span>
    ${r.chamado ? `<p class="chamado">${esc(r.chamado)}</p>` : ''}
    ${r.pedido ? `<p class="pedido">“${esc(r.pedido)}”</p>` : ''}
    <dl>
      <dt>Projeto</dt><dd>${esc(r.projeto)}</dd>
      <dt>Guardião</dt><dd>${esc(r.guardiao)}</dd>
      <dt>Feitos</dt><dd>${esc(r.acoes)} ações · ${nTorres(r)} torres</dd>
      ${r.ferramenta ? `<dt>Agora</dt><dd>${esc(r.ferramenta)}</dd>` : ''}
      ${Number(r.emissarios) ? `<dt>Emissários</dt><dd>${esc(r.emissarios)} em missão</dd>` : ''}
      ${(r.arquivosRecentes || []).length ? `<dt>Tocou</dt><dd>${esc(r.arquivosRecentes.join(', '))}</dd>` : ''}
    </dl>
    ${
      (r.cronica || []).length
        ? `<ul>${r.cronica
            .slice(-4)
            .map((l) => `<li>${esc(l.replace(/\[\[|\]\]/g, ''))}</li>`)
            .join('')}</ul>`
        : ''
    }
    <div class="dica">Clique para visitar a cidade deste reino</div>`;
  if (cartao._c !== html) {
    cartao.innerHTML = html;
    cartao._c = html;
  }
  const cw = cartao.offsetWidth,
    ch = cartao.offsetHeight;
  let x = mx + 18,
    y = my + 18;
  if (x + cw > innerWidth - 12) x = mx - cw - 18;
  if (y + ch > innerHeight - 12) y = innerHeight - ch - 12;
  cartao.style.left = Math.max(12, x) + 'px';
  cartao.style.top = Math.max(12, y) + 'px';
  cartao.classList.add('visivel');
}
let arrastou = false,
  inicioToque = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  mouse = [e.clientX, e.clientY];
  if (inicioToque && Math.hypot(e.clientX - inicioToque[0], e.clientY - inicioToque[1]) > 5) arrastou = true;
});
renderer.domElement.addEventListener('pointerleave', () => {
  mouse = null;
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  arrastou = false;
  inicioToque = [e.clientX, e.clientY];
});
renderer.domElement.addEventListener('pointerup', (e) => {
  inicioToque = null;
  if (arrastou) return;
  const v = acharReino(e.clientX, e.clientY);
  if (v && v !== focado) focar(v);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') sairDoFoco();
});

// ---------- visiting a kingdom: fly in and show the whole city ----------
let focado = null,
  voo = null,
  visaoGeral = null,
  seguindo = false;
const painel = document.getElementById('painel');
const locaisEl = [];
const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function garantirCidade(v) {
  const sig = assinaturaCidade(v.r);
  if (v.cidade && v.cidadeSig === sig) return false;
  const visivel = v.cidade?.grupo.visible ?? false;
  if (v.cidade) descartar(v.cidade.grupo);
  v.cidade = construirCidade(v.r, v.k.b, hash(v.r.sessao), { brilho: texBrilho });
  v.cidadeSig = sig;
  v.cidade.grupo.visible = visivel;
  v.k.corpo.add(v.cidade.grupo);
  return true;
}
function mostrarCidade(v, sim) {
  if (!v.cidade) return;
  v.cidade.grupo.visible = sim;
  for (const f of v.k.animados.flora) f.visible = !sim;
}
function criarLocais() {
  limparLocais();
  if (!focado?.cidade) return;
  for (const l of focado.cidade.locais) {
    if (l.resumo) continue;
    const el = document.createElement('div');
    el.className = 'local';
    el.innerHTML = `<b>${esc(l.nome)}</b><small>${esc(l.detalhe)}</small>`;
    rotulos.appendChild(el);
    locaisEl.push({ el, l });
  }
}
function limparLocais() {
  for (const x of locaisEl) x.el.remove();
  locaisEl.length = 0;
}
function iniciarVoo(pos, alvo, depois) {
  voo = {
    p0: camera.position.clone(),
    a0: controles.target.clone(),
    p1: pos.clone(),
    a1: alvo.clone(),
    off: pos.clone().sub(alvo),
    t0: performance.now(),
    dur: 1900,
    depois,
  };
  controles.enabled = false;
}
function alvoAtual() {
  return seguindo ? focado.gu.raiz.position.clone() : alvoDoReino(focado);
}
function seguirGuardiao(sim) {
  if (!focado) return;
  seguindo = sim;
  const alvo = alvoAtual();
  const dir = camera.position.clone().sub(controles.target);
  dir.y = 0;
  dir.normalize();
  const pos = sim
    ? alvo
        .clone()
        .add(dir.multiplyScalar(1.7 * focado.s))
        .add(new THREE.Vector3(0, 0.55 * focado.s, 0))
    : alvo
        .clone()
        .add(dir.multiplyScalar(1.9 * focado.s))
        .add(new THREE.Vector3(0, 3.5 * focado.s, 0));
  controles.minDistance = sim ? 0.3 : 0.9;
  if (sim) limparLocais();
  iniciarVoo(pos, alvo, sim ? null : criarLocais);
  renderPainel();
}
function alvoDoReino(v) {
  return v.k.grupo.position.clone().add(new THREE.Vector3(0, 0.15 * v.s, 0));
}
// While the side panel is open, shift the picture left so the kingdom sits in the free space.
function ajustarEnquadre() {
  const largo = innerWidth > 700 && focado;
  if (largo) camera.setViewOffset(innerWidth, innerHeight, 190, 0, innerWidth, innerHeight);
  else camera.clearViewOffset();
}
function focar(v) {
  seguindo = false;
  if (!focado) visaoGeral = { pos: camera.position.clone(), alvo: controles.target.clone() };
  else mostrarCidade(focado, false);
  focado = v;
  garantirCidade(v);
  mostrarCidade(v, true);
  const alvo = alvoDoReino(v);
  const dir = camera.position.clone().sub(alvo);
  dir.y = 0;
  if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
  dir.normalize();
  const pos = alvo
    .clone()
    .add(dir.multiplyScalar(1.9 * v.s))
    .add(new THREE.Vector3(0, 3.5 * v.s, 0));
  iniciarVoo(pos, alvo, criarLocais);
  controles.minDistance = 0.9;
  controles.autoRotateSpeed = 0.7;
  mostrarCartao(null);
  renderPainel();
  painel.hidden = false;
  document.body.classList.add('focado');
  ajustarEnquadre();
}
function sairDoFoco() {
  if (!focado) return;
  seguindo = false;
  const v = focado;
  focado = null;
  painel.hidden = true;
  document.body.classList.remove('focado');
  limparLocais();
  ajustarEnquadre();
  const volta = visaoGeral || { pos: new THREE.Vector3(0, 3.6, 11), alvo: new THREE.Vector3(0, 0.4, 0) };
  iniciarVoo(volta.pos, volta.alvo, () => {
    if (focado !== v) mostrarCidade(v, false);
  });
  controles.minDistance = 3;
  controles.autoRotateSpeed = 0.35;
}
function renderPainel() {
  if (!focado) return;
  const r = focado.r,
    b = BIOMAS[r.bioma],
    c = focado.cidade;
  const casas = c ? c.locais.find((l) => l.resumo)?.nome : `${nCasas(r)} casas`;
  const item = (cor, titulo, texto) =>
    `<li><i style="background:${cor}"></i><div><b>${titulo}</b><small>${texto}</small></div></li>`;
  const oficios = (c?.oficios || [])
    .map((o) =>
      item(
        b?.acento || '#ffd98a',
        `${esc(o.nome)} · ${o.n} ${o.n === 1 ? 'uso' : 'usos'}`,
        `${esc(o.desc)}: ${esc(o.ferramentas.join(', '))}`,
      ),
    )
    .join('');
  const caudas =
    r.guardiao === 'raposa espiritual' ? ` Suas ${nTorres(r)} caudas acompanham as torres do castelo.` : '';
  painel.innerHTML = `
    <button class="voltar" id="voltar">← Voltar ao céu</button>
    <div class="epiteto">O reino ${esc(b?.epiteto || '')}</div>
    <h2>${esc(r.reino)}</h2>
    <span class="pilula s-${esc(r.status)}">${esc(STATUS_TXT[r.status] || r.status)} · ${esc(ha(r.desde))}</span>
    ${r.chamado ? `<p class="chamado">${esc(r.chamado)}</p>` : ''}
    ${r.pedido ? `<p class="pedido">“${esc(r.pedido)}”</p>` : ''}
    <button class="seguir" id="seguir">${seguindo ? 'Voltar à cidade' : `Seguir ${artigoGuardiao(r.guardiao)}`}</button>
    <h3>O que existe nesta cidade</h3>
    <ul class="mapa">
      ${item('#f3ecff', `Castelo · ${nTorres(r)} torres`, `ganha torres conforme as ações crescem (${esc(r.acoes)} ações até agora)`)}
      ${item('#e6cdb0', esc(casas || ''), 'uma casa para cada 3 ações da sessão')}
      ${item('#a6f5cf', `${nHabitantes(r.status)} habitantes nas ruas`, r.status === 'chamando' ? 'reunidos na praça, esperando por você' : 'mais gente na rua quando a sessão trabalha')}
      ${item('#ffe6b0', 'Praça do pedido', r.pedido ? 'o pergaminho que flutua sobre a fonte guarda o último pedido' : 'ainda sem pedido')}
      ${oficios || item('#c4bfd8', 'Nenhuma guilda ainda', 'cada tipo de ferramenta usada ergue um prédio novo')}
      ${(r.cronica || []).length ? item(b?.acento || '#c9b6ff', `${Math.min(6, r.cronica.length)} estandartes`, 'um para cada registro recente da crônica') : ''}
      ${item(GUARDIOES_COR[r.guardiao] || '#ffd98a', `Guardião: ${esc(r.guardiao)}`, `voa em volta do reino e pousa no farol quando a sessão precisa de você.${caudas}`)}
    </ul>
    ${
      (r.cronica || []).length
        ? `<h3>Crônica</h3><ol class="cronica">${r.cronica
            .slice()
            .reverse()
            .map((l) => `<li>${esc(l.replace(/\[\[|\]\]/g, ''))}</li>`)
            .join('')}</ol>`
        : ''
    }
    ${modoDemo ? '<p class="dica">Reino de demonstração</p>' : `<button class="obsidian" id="abrirObsidian">Abrir a nota no Obsidian</button>`}`;
  painel.querySelector('#voltar').onclick = sairDoFoco;
  painel.querySelector('#seguir').onclick = () => seguirGuardiao(!seguindo);
  const ob = painel.querySelector('#abrirObsidian');
  if (ob)
    ob.onclick = () => {
      if (r.arquivo) location.href = 'obsidian://open?path=' + encodeURIComponent(r.arquivo);
    };
}
const artigoGuardiao = (g) =>
  ({
    dragão: 'o dragão',
    pégaso: 'o pégaso',
    'baleia celeste': 'a baleia celeste',
    'raposa espiritual': 'a raposa espiritual',
    fada: 'a fada',
    'água-viva': 'a água-viva',
    fênix: 'a fênix',
  })[g] || 'o guardião';
const GUARDIOES_COR = {
  dragão: '#a995ff',
  pégaso: '#ffe3a1',
  'baleia celeste': '#9fe1ff',
  'raposa espiritual': '#8fe3ff',
  fada: '#ffd36b',
  'água-viva': '#ff8fd8',
  fênix: '#ff7a3d',
};

function animarCamera(dt) {
  if (voo) {
    const u = clamp((performance.now() - voo.t0) / voo.dur, 0, 1),
      k = suave(u);
    if (focado) {
      voo.a1.copy(alvoAtual());
      voo.p1.copy(voo.a1).add(voo.off);
    }
    controles.target.lerpVectors(voo.a0, voo.a1, k);
    camera.position.lerpVectors(voo.p0, voo.p1, k);
    camera.position.y += Math.sin(Math.PI * k) * 0.8;
    if (u >= 1) {
      const fim = voo.depois;
      voo = null;
      controles.enabled = true;
      fim?.();
    }
    return;
  }
  if (focado) {
    const delta = alvoAtual().sub(controles.target);
    controles.target.add(delta);
    camera.position.add(delta);
    return;
  }
  if (!usuarioZoom) {
    enquadrar();
    const dist = camera.position.distanceTo(controles.target);
    camera.position
      .sub(controles.target)
      .setLength(lerp(dist, distanciaDesejada, Math.min(1, dt * 0.8)))
      .add(controles.target);
  }
}
function atualizarLocais() {
  if (!focado || voo || seguindo) {
    for (const x of locaisEl) x.el.style.display = 'none';
    return;
  }
  for (const x of locaisEl) {
    vTmp.copy(x.l.pos);
    focado.k.corpo.localToWorld(vTmp);
    const dist = vTmp.distanceTo(camera.position);
    vTmp.project(camera);
    if (vTmp.z > 1) {
      x.el.style.display = 'none';
      continue;
    }
    x.el.style.display = '';
    x.el.style.transform = `translate(-50%, -100%) translate(${(vTmp.x * 0.5 + 0.5) * innerWidth}px, ${(-vTmp.y * 0.5 + 0.5) * innerHeight}px)`;
    x.el.style.opacity = String(clamp(1.6 - dist * 0.35, 0.25, 1));
  }
}

// ---------- camera framing ----------
let distanciaDesejada = 11;
function enquadrar() {
  const aspecto = innerWidth / innerHeight;
  if (!(aspecto > 0) || !isFinite(aspecto)) return;
  distanciaDesejada = clamp((raioMundo * 2.1 + 6.5) / Math.min(1, aspecto * 0.85), 7, 40);
}

// ---------- main loop ----------
const relogio = new THREE.Clock();
let usuarioZoom = false;
renderer.domElement.addEventListener(
  'wheel',
  () => {
    usuarioZoom = true;
  },
  { passive: true },
);
renderer.domElement.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) usuarioZoom = true;
  },
  { passive: true },
);
function quadro() {
  const dt = Math.min(0.1, relogio.getDelta()),
    t = relogio.elapsedTime;
  aplicarCeu(ceuAtual(), t);

  for (const [id, v] of reinos) {
    animarReino(v, t, dt);
    if (v.saindo && v === focado) sairDoFoco();
    if (v.saindo && v.s < 0.01) {
      descartar(v.k.grupo);
      descartar(v.gu.raiz);
      descartar(v.gu.trilha);
      v.el.remove();
      reinos.delete(id);
    }
  }
  animarPontes(t);

  nuvens.rotation.y = t * 0.004;
  nuvens.children.forEach((s, i) => {
    s.position.y += Math.sin(t * 0.2 + i) * 0.0008;
  });
  for (const il of cena.userData.ilhotas) il.position.y += Math.sin(t * 0.3 + il.userData.f) * 0.002;
  for (let i = 0; i < vagaN; i++) {
    let y = vagaPos[i * 3 + 1] + vagaVel[i] * dt;
    if (y > 8) y = -4;
    vagaPos[i * 3 + 1] = y;
    vagaPos[i * 3] += Math.sin(t * 0.5 + i) * 0.002;
  }
  vagaGeo.attributes.position.needsUpdate = true;
  // sky whale far away
  const aB = t * 0.02;
  baleiaFundo.raiz.position.set(Math.cos(aB) * 55, 6 + Math.sin(t * 0.1) * 2, Math.sin(aB) * 55);
  baleiaFundo.modelo.lookAt(Math.cos(aB + 0.05) * 55, baleiaFundo.raiz.position.y, Math.sin(aB + 0.05) * 55);
  baleiaFundo.update(t, 0.6, {});

  animarParticulas(dt);
  animarCamera(dt);
  if (!Number.isFinite(camera.position.x + camera.position.y + camera.position.z)) camera.position.set(0, 3.6, 11);
  controles.update();

  atualizarRotulos();
  atualizarLocais();
  if (mouse) {
    foco = acharReino(mouse[0], mouse[1]);
    mostrarCartao(foco, mouse[0], mouse[1]);
  } else mostrarCartao(null);
  composer.render(dt);
  ajustarResolucao(dt);
  requestAnimationFrame(quadro);
}

// ---------- data: live vault or demo ----------
let fonte = null,
  timerDemo = null,
  conectado = false;
function conectar() {
  fonte = new EventSource('/eventos');
  fonte.onmessage = (e) => {
    conectado = true;
    if (!modoDemo) aplicarDados(JSON.parse(e.data));
  };
  fonte.onerror = () => {
    if (!conectado && !modoDemo)
      document.getElementById('resumo').textContent = 'Sem conexão com o servidor dos reinos';
  };
}
const DEMO = [
  {
    sessao: 'demo-aurora',
    projeto: 'site-loja',
    bioma: 'cascatas-douradas',
    guardiao: 'dragão',
    status: 'trabalhando',
    acoes: 120,
    ferramenta: 'Edit',
    pedido: 'Refaça o carrinho de compras com cupom de desconto',
    arquivosRecentes: ['carrinho.tsx', 'cupom.ts'],
    emissarios: 2,
    nArquivos: 14,
    oficios: ['Edit:46', 'Read:38', 'Bash:21', 'Agent:6', 'TodoWrite:5', 'WebSearch:4'],
  },
  {
    sessao: 'demo-lua',
    projeto: 'site-loja',
    bioma: 'cristal-lunar',
    guardiao: 'fada',
    status: 'chamando',
    acoes: 18,
    chamado: 'Claude precisa da sua permissão para usar o Bash',
    pedido: 'Rode os testes do checkout',
    nArquivos: 3,
    oficios: ['Bash:9', 'Read:9'],
  },
  {
    sessao: 'demo-gelo',
    projeto: 'api-pagamentos',
    bioma: 'aurora-de-gelo',
    guardiao: 'baleia celeste',
    status: 'trabalhando',
    acoes: 40,
    ferramenta: 'Read',
    pedido: 'Investigue por que o webhook falha às vezes',
    arquivosRecentes: ['cupom.ts', 'webhook.ts'],
    nArquivos: 9,
    oficios: ['Read:20', 'Grep:12', 'WebFetch:5', 'MCP:3'],
  },
  {
    sessao: 'demo-lanterna',
    projeto: 'estudos',
    bioma: 'floresta-de-lanternas',
    guardiao: 'raposa espiritual',
    status: 'repousando',
    acoes: 7,
    pedido: 'Resuma o capítulo 3',
    nArquivos: 2,
    oficios: ['Read:7'],
  },
  {
    sessao: 'demo-sakura',
    projeto: 'blog',
    bioma: 'jardim-sakura',
    guardiao: 'água-viva',
    status: 'trabalhando',
    acoes: 260,
    ferramenta: 'Write',
    pedido: 'Escreva o post sobre reinos mágicos',
    nArquivos: 22,
    oficios: ['Write:90', 'Edit:80', 'Read:60', 'WebSearch:20', 'MCP:10'],
  },
  {
    sessao: 'demo-abismo',
    projeto: 'notas',
    bioma: 'abismo-luminoso',
    guardiao: 'fênix',
    status: 'trabalhando',
    acoes: 55,
    ferramenta: 'Grep',
    pedido: 'Organize minhas notas por tema',
    nArquivos: 18,
    oficios: ['Grep:30', 'Read:15', 'Edit:10'],
  },
  {
    sessao: 'demo-prado',
    projeto: 'agentes',
    bioma: 'prado-celeste',
    guardiao: 'pégaso',
    status: 'repousando',
    acoes: 30,
    pedido: 'Crie os hooks dos reinos',
    nArquivos: 6,
    oficios: ['Write:12', 'Bash:10', 'Read:8'],
  },
  {
    sessao: 'demo-velho',
    projeto: 'rascunhos',
    bioma: 'cristal-lunar',
    guardiao: 'raposa espiritual',
    status: 'adormecido',
    acoes: 12,
  },
];
const NOMES = ['Aurerion', 'Seraquel', 'Thalwyn', 'Elosia', 'Zephdor', 'Mirawyn', 'Calune', 'Orathas'];
function dadosDemo() {
  const agora = Date.now();
  return {
    reinos: DEMO.map((d, i) => ({
      ...d,
      reino: NOMES[i],
      nota: NOMES[i],
      desde: new Date(agora - (i + 1) * 97e3).toISOString(),
      inicio: new Date(agora - i * 1e6).toISOString(),
      cronica: [
        'O reino surgiu entre as nuvens',
        'Novo pedido: “' + (d.pedido || 'um começo') + '”',
        'As torres se acenderam',
        'Uma ponte de luz surgiu até ' + NOMES[(i + 1) % NOMES.length],
      ],
    })),
    pontes: [
      { a: 'demo-aurora', b: 'demo-lua', tipo: 'alianca' },
      { a: 'demo-aurora', b: 'demo-gelo', tipo: 'ponte' },
      { a: 'demo-abismo', b: 'demo-prado', tipo: 'ponte' },
      { a: 'demo-prado', b: 'demo-velho', tipo: 'alianca' },
    ],
  };
}
function limparTudo() {
  if (focado) {
    focado = null;
    painel.hidden = true;
    document.body.classList.remove('focado');
    limparLocais();
    voo = null;
    controles.enabled = true;
    controles.minDistance = 3;
    controles.autoRotateSpeed = 0.35;
    controles.target.set(0, 0.4, 0);
    camera.position.set(0, 3.6, 11);
    camera.clearViewOffset();
  }
  for (const v of reinos.values()) {
    descartar(v.k.grupo);
    descartar(v.gu.raiz);
    descartar(v.gu.trilha);
    v.el.remove();
  }
  reinos.clear();
  for (const pt of pontes.values()) {
    descartar(pt.nucleo);
    descartar(pt.aura);
  }
  pontes.clear();
}
function ligarDemo(ligar) {
  modoDemo = ligar;
  document.getElementById('demo').setAttribute('aria-pressed', String(ligar));
  limparTudo();
  clearInterval(timerDemo);
  usuarioZoom = false;
  if (ligar) {
    const d = dadosDemo();
    aplicarDados(d);
    timerDemo = setInterval(() => {
      const despertos = d.reinos.filter((r) => r.status !== 'adormecido');
      const r = despertos[Math.floor(Math.random() * despertos.length)];
      const prox = { trabalhando: 'chamando', chamando: 'trabalhando', repousando: 'trabalhando' }[r.status];
      if (prox) {
        r.status = prox;
        r.desde = new Date().toISOString();
      }
      d.reinos.forEach((x) => {
        if (x.status === 'trabalhando') x.acoes += 3;
      });
      aplicarDados({ ...d, reinos: d.reinos.map((x) => ({ ...x })) });
    }, 6000);
  } else {
    fetch('/api/reinos')
      .then((r) => r.json())
      .then(aplicarDados)
      .catch(() => aplicarDados({ reinos: [], pontes: [] }));
  }
}

document.querySelectorAll('[data-ceu]').forEach((b) =>
  b.addEventListener('click', () => {
    modoCeu = b.dataset.ceu;
    document.querySelectorAll('[data-ceu]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    try {
      localStorage.setItem('reinos-ceu', modoCeu);
    } catch {}
  }),
);
document.getElementById('girar').addEventListener('click', (e) => {
  controles.autoRotate = !controles.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', String(controles.autoRotate));
  e.currentTarget.textContent = controles.autoRotate ? 'Girando' : 'Parado';
});
document.getElementById('som').addEventListener('click', (e) => {
  somLigado = !somLigado;
  e.currentTarget.setAttribute('aria-pressed', String(somLigado));
  e.currentTarget.textContent = somLigado ? 'Som ligado' : 'Som desligado';
  if (somLigado) tocarSino();
});
document.getElementById('demo').addEventListener('click', () => ligarDemo(!modoDemo));
document.getElementById('demo2').addEventListener('click', () => ligarDemo(true));
try {
  const salvo = localStorage.getItem('reinos-ceu');
  if (salvo && (salvo === 'auto' || CEUS[salvo])) document.querySelector(`[data-ceu="${salvo}"]`)?.click();
} catch {}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  ajustarEnquadre();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

window.__reinos3d = {
  reinos,
  camera,
  controles,
  ALVOS,
  aplicarDados,
  ligarDemo,
  focar,
  sairDoFoco,
  seguirGuardiao,
  get focado() {
    return focado;
  },
};
if (new URLSearchParams(location.search).has('demo')) ligarDemo(true);
else conectar();
requestAnimationFrame(quadro);
