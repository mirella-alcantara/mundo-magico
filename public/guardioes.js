// Detailed guardian creatures. Every model faces +z (forward) and is built in island units (island radius = 1).
import * as THREE from 'three';

export const GUARDIOES = {
  'dragão':            { corpo: '#d9d2ff', ventre: '#f4efff', brilho: '#a995ff', acento: '#7b63ff', forma: 'dragao', vel: 0.5 },
  'pégaso':            { corpo: '#ffffff', ventre: '#f6f0ff', brilho: '#ffe3a1', acento: '#ffd36b', forma: 'pegaso', vel: 0.55 },
  'baleia celeste':    { corpo: '#5f8fe8', ventre: '#dcecff', brilho: '#9fe1ff', acento: '#7ff0ff', forma: 'baleia', vel: 0.2 },
  'raposa espiritual': { corpo: '#f5f8ff', ventre: '#ffffff', brilho: '#8fe3ff', acento: '#6fd8ff', forma: 'raposa', vel: 0.65 },
  'fada':              { corpo: '#fff3c2', ventre: '#ffe8d6', brilho: '#ffd36b', acento: '#ff9fd8', forma: 'fada', vel: 0.9 },
  'água-viva':         { corpo: '#ffc4ec', ventre: '#ffe6f6', brilho: '#ff8fd8', acento: '#b98bff', forma: 'aguaviva', vel: 0.28 },
  'fênix':             { corpo: '#ff9a3d', ventre: '#ffd36b', brilho: '#ff6a2a', acento: '#ffe27a', forma: 'fenix', vel: 0.7 },
};

const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: 0.05, ...o });
const brilhante = (cor, forca = 1.4, o = {}) => new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: forca, roughness: 0.4, ...o });
const membrana = (cor, emissivo, o = {}) => new THREE.MeshStandardMaterial({ color: cor, emissive: emissivo, emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.6, ...o });

function malha(geo, m, pos, escala, rot) {
  const x = new THREE.Mesh(geo, m);
  if (pos) x.position.set(...pos);
  if (escala) x.scale.set(...escala);
  if (rot) x.rotation.set(...rot);
  return x;
}
const esfera = (m, r, pos, esc, seg = 18) => malha(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m, pos, esc);
const cone = (m, r, h, pos, rot, seg = 10) => malha(new THREE.ConeGeometry(r, h, seg), m, pos, null, rot);

// A thin rod between two points (bones, legs, wand).
function osso(a, b, r, m) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const x = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 6), m);
  x.position.copy(va).add(vb).multiplyScalar(0.5);
  x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return x;
}

// Chain of nested segments: tails and necks that wave naturally.
function cadeia(n, passo, raio0, raio1, m, dir = -1, alongar = 1.4) {
  const raiz = new THREE.Group(), segs = [];
  let pai = raiz;
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.position.z = i === 0 ? 0 : dir * passo;
    const r = THREE.MathUtils.lerp(raio0, raio1, i / Math.max(1, n - 1));
    g.add(esfera(m, r, [0, 0, dir * passo * 0.5], [1, 1, alongar * passo / (r * 2) + 0.6], 12));
    pai.add(g); segs.push(g); pai = g;
  }
  return { raiz, segs, ponta: pai };
}

// Leaf-shaped feather lying in the XZ plane, pointing toward -z.
function geoPena(comp, larg) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(larg, comp * 0.35, larg * 0.35, comp);
  s.quadraticCurveTo(0, comp * 1.05, -larg * 0.35, comp);
  s.quadraticCurveTo(-larg, comp * 0.35, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  g.rotateX(Math.PI / 2);
  return g;
}

function triangulos(pontos, faces) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(faces.flat().flatMap((i) => pontos[i])), 3));
  g.computeVertexNormals();
  return g;
}

// Bat-like wing with bones and membrane. lado = +1 right, -1 left.
function asaMembrana(lado, envergadura, mOsso, mMembrana) {
  const piv = new THREE.Group();
  const s = envergadura, L = lado;
  const P = [
    [0, 0, 0],                         // 0 shoulder
    [L * s * 0.22, s * 0.1, 0.02],     // 1 elbow
    [L * s * 0.45, s * 0.14, 0.06],    // 2 wrist
    [L * s * 1.0, s * 0.02, 0.0],      // 3 finger 1 tip
    [L * s * 0.9, -s * 0.02, -s * 0.32], // 4 finger 2 tip
    [L * s * 0.62, -s * 0.03, -s * 0.5], // 5 finger 3 tip
    [L * s * 0.12, 0, -s * 0.42],      // 6 trailing edge at body
    [L * s * 0.7, s * 0.06, -s * 0.12], // 7 membrane bulge
  ];
  piv.add(osso(P[0], P[1], 0.014, mOsso), osso(P[1], P[2], 0.012, mOsso));
  for (const f of [3, 4, 5]) piv.add(osso(P[2], P[f], 0.007, mOsso));
  piv.add(new THREE.Mesh(triangulos(P, [[2, 3, 7], [2, 7, 4], [2, 4, 5], [2, 5, 6], [0, 2, 6], [0, 1, 2]]), mMembrana));
  piv.add(cone(mOsso, 0.012, 0.05, [P[2][0], P[2][1] + 0.025, P[2][2]], [0, 0, 0], 5)); // wrist claw
  return piv;
}

// Feathered wing: primaries, secondaries and coverts in layers.
function asaPenas(lado, envergadura, cores, mBraco) {
  const piv = new THREE.Group(), s = envergadura;
  piv.add(osso([0, 0, 0], [lado * s * 0.5, s * 0.06, 0.02], 0.02, mBraco));
  const camadas = [
    { n: 10, comp: s * 0.55, larg: s * 0.09, y: 0, recuo: 1, cor: cores[0] },
    { n: 8, comp: s * 0.34, larg: s * 0.08, y: 0.008, recuo: 0.8, cor: cores[1] },
    { n: 7, comp: s * 0.18, larg: s * 0.07, y: 0.016, recuo: 0.6, cor: cores[2] },
  ];
  for (const c of camadas) {
    const m = c.cor;
    for (let i = 0; i < c.n; i++) {
      const f = i / (c.n - 1);
      const p = new THREE.Mesh(geoPena(c.comp * (0.75 + 0.35 * Math.sin(f * Math.PI)), c.larg), m);
      p.position.set(lado * (0.04 + f * s * 0.5), c.y + s * 0.06 * f, 0.02);
      p.rotation.y = lado * (-0.15 - f * 1.1 * c.recuo);
      p.rotation.x = 0.04;
      piv.add(p);
    }
  }
  return piv;
}

function perna(comp, r, m, mCasco) {
  const quadril = new THREE.Group(), joelho = new THREE.Group();
  quadril.add(osso([0, 0, 0], [0, -comp * 0.5, 0], r, m));
  joelho.position.y = -comp * 0.5; quadril.add(joelho);
  joelho.add(osso([0, 0, 0], [0, -comp * 0.5, 0], r * 0.75, m));
  if (mCasco) joelho.add(malha(new THREE.CylinderGeometry(r * 0.9, r * 1.1, r * 1.6, 8), mCasco, [0, -comp * 0.52, 0]));
  return { quadril, joelho };
}

// ---------------- creatures ----------------
function dragao(G) {
  const corpo = mat(G.corpo, { roughness: 0.45, metalness: 0.15, flatShading: true });
  const ventre = mat(G.ventre, { roughness: 0.6 });
  const acento = brilhante(G.acento, 0.9);
  const chifre = mat('#f6ecd8', { roughness: 0.35 });
  const olho = brilhante('#ffe27a', 3);
  const m = new THREE.Group(), anim = {};
  // torso with belly plates
  m.add(esfera(corpo, 0.15, [0, 0, 0], [1, 0.95, 1.9]));
  for (let i = 0; i < 6; i++) m.add(esfera(ventre, 0.06, [0, -0.11, 0.18 - i * 0.07], [1.6, 0.45, 1], 10));
  // neck (rises and bends forward) and head
  const pescoco = cadeia(5, 0.07, 0.085, 0.06, corpo, 1, 1.5);
  pescoco.raiz.position.set(0, 0.06, 0.25); pescoco.raiz.rotation.x = -0.55; m.add(pescoco.raiz);
  pescoco.segs.forEach((s, i) => { s.rotation.x = 0.12; s.add(cone(acento, 0.018, 0.06, [0, 0.07, 0.03], [-0.3, 0, 0], 4)); });
  const cabeca = new THREE.Group(); cabeca.position.z = 0.09; cabeca.rotation.x = 0.35; pescoco.ponta.add(cabeca);
  cabeca.add(esfera(corpo, 0.075, [0, 0, 0], [1, 0.85, 1.2]));
  cabeca.add(malha(new THREE.BoxGeometry(0.09, 0.06, 0.13), corpo, [0, -0.012, 0.1]));
  cabeca.add(malha(new THREE.BoxGeometry(0.085, 0.022, 0.12), ventre, [0, -0.045, 0.095]));
  for (const l of [-1, 1]) {
    cabeca.add(esfera(olho, 0.014, [l * 0.045, 0.025, 0.05], [1, 0.7, 1], 8));
    const c = cone(chifre, 0.018, 0.16, [l * 0.035, 0.07, -0.05], [-1.0, 0, l * 0.25], 8); cabeca.add(c);
    cabeca.add(cone(chifre, 0.01, 0.07, [l * 0.07, 0.02, -0.05], [-1.3, 0, l * 0.9], 6));
    cabeca.add(esfera(acento, 0.008, [l * 0.025, 0.01, 0.165], null, 6)); // nostril glow
    cabeca.add(cone(corpo, 0.03, 0.08, [l * 0.07, -0.01, -0.02], [-1.2, 0, l * 1.2], 4)); // frill
  }
  anim.cabeca = cabeca;
  // back spikes
  for (let i = 0; i < 6; i++) m.add(cone(acento, 0.02, 0.07 - i * 0.006, [0, 0.14 - i * 0.008, 0.2 - i * 0.09], [-0.35, 0, 0], 4));
  // tail with spikes and a spade tip
  const cauda = cadeia(9, 0.08, 0.085, 0.022, corpo, -1, 1.4);
  cauda.raiz.position.set(0, 0.01, -0.26); m.add(cauda.raiz);
  cauda.segs.forEach((s, i) => { if (i % 2 === 0) s.add(cone(acento, 0.014, 0.05, [0, 0.05 - i * 0.004, -0.03], [-0.4, 0, 0], 4)); });
  cauda.ponta.add(malha(new THREE.OctahedronGeometry(0.05, 0), acento, [0, 0, -0.1], [0.4, 1.2, 1.6]));
  anim.cauda = cauda.segs; anim.pescoco = pescoco.segs;
  // tucked legs with claws
  for (const [x, z] of [[1, 0.14], [-1, 0.14], [1, -0.15], [-1, -0.15]]) {
    const p = perna(0.16, 0.026, corpo);
    p.quadril.position.set(x * 0.1, -0.07, z); p.quadril.rotation.x = 0.9; p.joelho.rotation.x = -1.2;
    for (let k = -1; k <= 1; k++) p.joelho.add(cone(chifre, 0.006, 0.03, [k * 0.01, -0.085, 0.01], [1.2, 0, 0], 4));
    m.add(p.quadril);
  }
  // wings
  const mm = membrana(G.brilho, G.acento, { opacity: 0.78 });
  anim.asas = [1, -1].map((l) => { const a = asaMembrana(l, 0.62, corpo, mm); a.position.set(l * 0.08, 0.1, 0.1); m.add(a); return { piv: a, lado: l }; });
  return {
    modelo: m,
    update(t, e) {
      const f = t * (5 + e * 3);
      for (const a of anim.asas) { a.piv.rotation.z = a.lado * (Math.sin(f) * 0.7 * e + 0.35); a.piv.rotation.x = Math.sin(f + 1) * 0.12; }
      anim.cauda.forEach((s, i) => { s.rotation.y = Math.sin(t * 2.2 - i * 0.55) * 0.22; s.rotation.x = Math.sin(t * 1.7 - i * 0.5) * 0.06; });
      anim.pescoco.forEach((s, i) => { s.rotation.y = Math.sin(t * 1.3 - i * 0.4) * 0.06; });
      anim.cabeca.rotation.y = Math.sin(t * 0.9) * 0.25;
      m.position.y = -Math.sin(f) * 0.03 * e;
    },
  };
}

function pegaso(G) {
  const pelo = mat(G.corpo, { roughness: 0.55, emissive: G.brilho, emissiveIntensity: 0.12 });
  const crina = brilhante(G.acento, 1.2, { flatShading: true });
  const casco = mat('#c9a35a', { metalness: 0.6, roughness: 0.3 });
  const olho = mat('#2a2440');
  const m = new THREE.Group(), anim = { pernas: [] };
  m.add(esfera(pelo, 0.12, [0, 0, 0], [1, 1.05, 2.1]));
  m.add(esfera(pelo, 0.11, [0, 0.01, 0.16], [1, 1.1, 1]));
  // neck and head
  const pescoco = new THREE.Group(); pescoco.position.set(0, 0.07, 0.22); pescoco.rotation.x = -0.75; m.add(pescoco);
  pescoco.add(esfera(pelo, 0.07, [0, 0, 0.1], [0.9, 1, 2]));
  const cabeca = new THREE.Group(); cabeca.position.set(0, 0, 0.24); cabeca.rotation.x = 1.25; pescoco.add(cabeca);
  cabeca.add(esfera(pelo, 0.065, [0, 0, 0], [0.85, 0.9, 1.1]));
  cabeca.add(esfera(pelo, 0.045, [0, -0.02, 0.09], [0.85, 0.8, 1.5]));
  for (const l of [-1, 1]) {
    cabeca.add(esfera(olho, 0.011, [l * 0.045, 0.015, 0.03], null, 8));
    cabeca.add(cone(pelo, 0.016, 0.06, [l * 0.03, 0.07, -0.02], [-0.3, 0, l * 0.2], 6));
    cabeca.add(esfera(mat('#e8d6e0'), 0.006, [l * 0.02, -0.03, 0.155], null, 6));
  }
  // flowing glowing mane along the neck and a forelock
  const mechas = [];
  for (let i = 0; i < 9; i++) {
    const c = cone(crina, 0.022, 0.12, [0, 0.07, -0.02 + i * 0.035], [-1.9, 0, 0], 5);
    pescoco.add(c); mechas.push(c);
  }
  cabeca.add(cone(crina, 0.02, 0.07, [0, 0.06, 0.04], [0.6, 0, 0], 5));
  // tail: cascade of glowing strands
  const cauda = new THREE.Group(); cauda.position.set(0, 0.06, -0.24); m.add(cauda);
  const fios = [];
  for (let i = 0; i < 7; i++) {
    const f = cadeia(5, 0.06, 0.022, 0.008, crina, -1, 1.2);
    f.raiz.rotation.set(0.5 + i * 0.05, (i - 3) * 0.08, 0); cauda.add(f.raiz); fios.push(f.segs);
  }
  // legs with joints and golden hooves (galloping in the air)
  for (const [x, z, fase] of [[1, 0.17, 0], [-1, 0.17, Math.PI], [1, -0.17, Math.PI * 0.5], [-1, -0.17, Math.PI * 1.5]]) {
    const p = perna(0.22, 0.022, pelo, casco);
    p.quadril.position.set(x * 0.06, -0.08, z); m.add(p.quadril);
    anim.pernas.push({ ...p, fase });
  }
  // feathered wings
  const penas = [mat('#ffffff', { side: THREE.DoubleSide, emissive: G.brilho, emissiveIntensity: 0.15 }), mat('#fff8e6', { side: THREE.DoubleSide }), mat('#fff0c8', { side: THREE.DoubleSide, emissive: G.acento, emissiveIntensity: 0.2 })];
  anim.asas = [1, -1].map((l) => { const a = asaPenas(l, 0.7, penas, pelo); a.position.set(l * 0.07, 0.09, 0.13); m.add(a); return { piv: a, lado: l }; });
  return {
    modelo: m,
    update(t, e) {
      const f = t * (4 + e * 2.5);
      for (const a of anim.asas) a.piv.rotation.z = a.lado * (Math.sin(f) * 0.6 * e + 0.5);
      for (const p of anim.pernas) { p.quadril.rotation.x = Math.sin(t * 5 + p.fase) * 0.55 * e + 0.2; p.joelho.rotation.x = -Math.max(0, Math.sin(t * 5 + p.fase + 1)) * 1.1 * e - 0.15; }
      fios.forEach((segs, j) => segs.forEach((s, i) => { s.rotation.y = Math.sin(t * 2.6 - i * 0.6 + j) * 0.18; s.rotation.x = Math.sin(t * 2 - i * 0.5) * 0.1; }));
      mechas.forEach((c, i) => { c.rotation.z = Math.sin(t * 3 - i * 0.6) * 0.25; });
      m.position.y = -Math.sin(f) * 0.025 * e;
    },
  };
}

function baleia(G) {
  const pele = mat(G.corpo, { roughness: 0.45, metalness: 0.1 });
  const ventre = mat(G.ventre, { roughness: 0.6 });
  const pintas = brilhante(G.acento, 2.2);
  const m = new THREE.Group(), anim = {};
  m.add(esfera(pele, 0.3, [0, 0, 0], [1, 0.85, 2.4], 28));
  m.add(esfera(ventre, 0.28, [0, -0.06, 0.05], [0.92, 0.7, 2.2], 28));
  // throat grooves
  for (let i = -4; i <= 4; i++) m.add(malha(new THREE.BoxGeometry(0.006, 0.006, 0.42), mat('#b9d3f3'), [i * 0.035, -0.24 + Math.abs(i) * 0.008, 0.25]));
  // eyes and a gentle smile
  for (const l of [-1, 1]) {
    m.add(esfera(mat('#1b2140'), 0.022, [l * 0.22, 0.02, 0.42], null, 10));
    m.add(esfera(brilhante('#ffffff', 0.8), 0.007, [l * 0.235, 0.03, 0.43], null, 6));
  }
  m.add(malha(new THREE.TorusGeometry(0.2, 0.006, 6, 24, Math.PI * 0.55), mat('#2d3c6b'), [0, -0.05, 0.6], null, [0, 0, Math.PI * 1.22]));
  // bioluminescent spots along the flanks
  const luzes = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 * 3, z = 0.55 - (i / 26) * 1.2, rr = 0.27 * Math.sqrt(Math.max(0.1, 1 - (z / 0.72) ** 2));
    const p = esfera(pintas, 0.012 + (i % 3) * 0.004, [Math.cos(a) * rr, Math.abs(Math.sin(a)) * rr * 0.8, z], null, 6);
    m.add(p); luzes.push(p);
  }
  // pectoral fins
  anim.nadadeiras = [1, -1].map((l) => {
    const g = new THREE.Group(); g.position.set(l * 0.24, -0.1, 0.18);
    g.add(esfera(pele, 0.1, [l * 0.12, 0, -0.04], [1.8, 0.18, 0.8], 12)); m.add(g); return { g, l };
  });
  m.add(cone(pele, 0.06, 0.12, [0, 0.24, -0.35], [-0.9, 0, 0], 8)); // dorsal fin
  // tail in segments with flukes
  const cauda = cadeia(4, 0.14, 0.2, 0.07, pele, -1, 1.2);
  cauda.raiz.position.z = -0.58; m.add(cauda.raiz);
  const lobos = new THREE.Group(); lobos.position.z = -0.16; cauda.ponta.add(lobos);
  for (const l of [-1, 1]) lobos.add(esfera(pele, 0.12, [l * 0.13, 0, -0.04], [1.6, 0.15, 0.7], 12));
  anim.cauda = cauda.segs;
  // a tiny floating home on its back, like the old sky-whale tales
  const casinha = new THREE.Group(); casinha.position.set(0, 0.25, 0.05); m.add(casinha);
  casinha.add(malha(new THREE.CylinderGeometry(0.13, 0.15, 0.03, 12), mat('#7fbf6a')));
  casinha.add(malha(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat('#fff4e6'), [0.03, 0.045, 0]));
  casinha.add(cone(mat('#c0606a'), 0.055, 0.06, [0.03, 0.105, 0], [0, Math.PI / 4, 0], 4));
  casinha.add(malha(new THREE.BoxGeometry(0.015, 0.02, 0.002), brilhante('#ffd27a', 2), [0.03, 0.04, 0.031]));
  casinha.add(malha(new THREE.IcosahedronGeometry(0.045, 0), mat('#4f9b48', { flatShading: true }), [-0.06, 0.07, 0.02]));
  casinha.add(osso([-0.06, 0.01, 0.02], [-0.06, 0.05, 0.02], 0.008, mat('#6b4a33')));
  return {
    modelo: m,
    update(t, e) {
      anim.cauda.forEach((s, i) => { s.rotation.x = Math.sin(t * 1.3 - i * 0.7) * 0.18 * (0.4 + e * 0.6); });
      for (const n of anim.nadadeiras) n.g.rotation.z = n.l * Math.sin(t * 1.1) * 0.25;
      luzes.forEach((p, i) => p.scale.setScalar(0.7 + 0.5 * Math.sin(t * 2 + i)));
      m.rotation.z = Math.sin(t * 0.5) * 0.06;
    },
  };
}

function raposa(G) {
  const pelo = mat(G.corpo, { roughness: 0.7, flatShading: true });
  const marca = brilhante(G.acento, 1.6);
  const interno = brilhante('#ffb3d9', 0.8);
  const m = new THREE.Group(), anim = { pernas: [], caudas: [] };
  m.add(esfera(pelo, 0.09, [0, 0, 0], [1, 1, 2.1]));
  m.add(esfera(pelo, 0.085, [0, 0.01, 0.12], [1, 1.05, 1]));
  // head: skull, long snout, nose, eyes, tall ears
  const cabeca = new THREE.Group(); cabeca.position.set(0, 0.08, 0.22); m.add(cabeca);
  cabeca.add(esfera(pelo, 0.07, [0, 0, 0], [1.1, 0.9, 1]));
  cabeca.add(cone(pelo, 0.045, 0.12, [0, -0.015, 0.09], [Math.PI / 2, 0, 0], 8));
  cabeca.add(esfera(mat('#2a2440'), 0.012, [0, -0.015, 0.15], null, 8));
  for (const l of [-1, 1]) {
    cabeca.add(esfera(brilhante(G.acento, 2.5), 0.012, [l * 0.035, 0.02, 0.05], [1.4, 0.7, 1], 8));
    const orelha = new THREE.Group(); orelha.position.set(l * 0.04, 0.06, -0.01); orelha.rotation.z = -l * 0.25; cabeca.add(orelha);
    orelha.add(cone(pelo, 0.032, 0.1, [0, 0.04, 0], null, 4));
    orelha.add(cone(interno, 0.018, 0.07, [0, 0.035, 0.012], null, 4));
    cabeca.add(malha(new THREE.BoxGeometry(0.03, 0.004, 0.004), marca, [l * 0.05, -0.005, 0.07], null, [0, 0, l * 0.4])); // whisker marks
  }
  cabeca.add(malha(new THREE.OctahedronGeometry(0.014, 0), marca, [0, 0.05, 0.04], [0.7, 1.4, 0.4])); // forehead jewel
  anim.cabeca = cabeca;
  // running legs
  for (const [x, z, fase] of [[1, 0.12, 0], [-1, 0.12, 0.6], [1, -0.12, Math.PI], [-1, -0.12, Math.PI + 0.6]]) {
    const p = perna(0.15, 0.016, pelo, marca);
    p.quadril.position.set(x * 0.05, -0.06, z); m.add(p.quadril); anim.pernas.push({ ...p, fase });
  }
  // nine fluffy tails (as many appear as the kingdom has towers)
  for (let i = 0; i < 9; i++) {
    const c = cadeia(6, 0.06, 0.035, 0.05, pelo, -1, 1.2);
    const a = ((i - 4) / 4) * 0.9;
    c.raiz.position.set(0, 0.04, -0.17); c.raiz.rotation.set(-0.5 - Math.abs(a) * 0.15, a, 0);
    c.ponta.add(esfera(marca, 0.04, [0, 0, -0.06], [1, 1, 1.3], 10));
    m.add(c.raiz); anim.caudas.push(c);
  }
  return {
    modelo: m,
    update(t, e, extra) {
      const n = Math.max(1, Math.min(9, extra.caudas || 3));
      anim.caudas.forEach((c, i) => {
        const vis = Math.abs(i - 4) <= (n - 1) / 2 + 0.01 || (n % 2 === 0 && i === 4 + n / 2);
        c.raiz.visible = vis;
        c.segs.forEach((s, k) => { s.rotation.y = Math.sin(t * 2.4 - k * 0.6 + i) * 0.2; s.rotation.x = Math.sin(t * 1.8 - k * 0.5 + i * 0.7) * 0.12 + 0.08; });
      });
      for (const p of anim.pernas) { p.quadril.rotation.x = Math.sin(t * 7 + p.fase) * 0.7 * e; p.joelho.rotation.x = -Math.max(0, Math.sin(t * 7 + p.fase + 1)) * 0.9 * e; }
      anim.cabeca.rotation.y = Math.sin(t * 0.8) * 0.3;
      m.position.y = Math.abs(Math.sin(t * 7)) * 0.03 * e;
    },
  };
}

function fada(G) {
  const pele = mat('#ffe8d6', { roughness: 0.7 });
  const cabelo = brilhante('#ffcf6b', 0.6, { flatShading: true });
  const vestido = brilhante(G.acento, 0.5, { side: THREE.DoubleSide });
  const m = new THREE.Group(), anim = {};
  const fig = new THREE.Group(); fig.rotation.x = 0.5; m.add(fig); // leaning forward in flight
  fig.add(esfera(pele, 0.05, [0, 0.2, 0], [1, 1.08, 1]));
  fig.add(esfera(cabelo, 0.056, [0, 0.215, -0.012], [1.05, 1, 1.05]));
  for (let i = 0; i < 5; i++) fig.add(cone(cabelo, 0.02, 0.12, [(i - 2) * 0.018, 0.16, -0.04], [0.5, 0, (i - 2) * 0.15], 5)); // flowing hair
  fig.add(malha(new THREE.TorusGeometry(0.045, 0.006, 6, 18), brilhante('#fff3c2', 2), [0, 0.265, 0], null, [Math.PI / 2 - 0.3, 0, 0])); // flower crown
  for (const l of [-1, 1]) fig.add(esfera(mat('#3a2a50'), 0.007, [l * 0.018, 0.205, 0.045], null, 6));
  fig.add(esfera(vestido, 0.035, [0, 0.12, 0], [1, 1.3, 0.8], 12));
  const saia = malha(new THREE.ConeGeometry(0.075, 0.14, 14, 1, true), vestido, [0, 0.03, 0]); fig.add(saia);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; fig.add(cone(vestido, 0.018, 0.04, [Math.cos(a) * 0.07, -0.04, Math.sin(a) * 0.07], [Math.PI, 0, 0], 4)); } // petal hem
  fig.add(osso([0.02, -0.04, 0], [0.025, -0.13, -0.02], 0.009, pele), osso([-0.02, -0.04, 0], [-0.02, -0.12, -0.04], 0.009, pele));
  const braco = new THREE.Group(); braco.position.set(0.035, 0.15, 0); fig.add(braco);
  braco.add(osso([0, 0, 0], [0.07, -0.02, 0.06], 0.008, pele));
  braco.add(osso([0.07, -0.02, 0.06], [0.1, 0.07, 0.1], 0.004, mat('#d9b46a', { metalness: 0.6 })));
  const estrela = malha(new THREE.OctahedronGeometry(0.02, 0), brilhante('#fff6c8', 4), [0.1, 0.08, 0.1]); braco.add(estrela);
  fig.add(osso([-0.035, 0.15, 0], [-0.08, 0.08, 0.02], 0.008, pele));
  anim.braco = braco; anim.estrela = estrela;
  // four dragonfly wings with glowing veins
  const mAsa = membrana(G.brilho, G.brilho, { opacity: 0.45 });
  const mVeia = new THREE.LineBasicMaterial({ color: G.brilho, transparent: true, opacity: 0.9 });
  anim.asas = [];
  for (const [l, cima] of [[1, 1], [-1, 1], [1, 0], [-1, 0]]) {
    const piv = new THREE.Group(); piv.position.set(l * 0.015, 0.15, -0.03); fig.add(piv);
    const s = new THREE.Shape(); const c = cima ? 0.2 : 0.14, w = cima ? 0.08 : 0.06;
    s.moveTo(0, 0); s.bezierCurveTo(w, c * 0.2, w, c * 0.9, w * 0.2, c); s.bezierCurveTo(-w * 0.3, c * 0.8, -w * 0.2, c * 0.2, 0, 0);
    const geo = new THREE.ShapeGeometry(s, 10);
    const asa = new THREE.Mesh(geo, mAsa);
    const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(s.getPoints(24)), mVeia);
    const veia = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector2(0, 0), new THREE.Vector2(w * 0.4, c * 0.7)]), mVeia);
    const folha = new THREE.Group(); folha.add(asa, borda, veia);
    folha.rotation.z = -l * (cima ? 1.0 : 1.9); folha.rotation.y = l * 0.2;
    piv.add(folha); anim.asas.push({ piv, l, cima });
  }
  m.scale.setScalar(1.25);
  return {
    modelo: m,
    update(t, e) {
      for (const a of anim.asas) a.piv.rotation.y = a.l * (Math.sin(t * 26 + (a.cima ? 0 : 1)) * 0.5 * (0.4 + e * 0.6) - 0.6);
      anim.braco.rotation.z = Math.sin(t * 3) * 0.3;
      anim.estrela.rotation.y = t * 4;
      m.position.y = Math.sin(t * 3) * 0.03;
    },
  };
}

function aguaviva(G) {
  const sino = new THREE.MeshPhysicalMaterial({ color: G.corpo, emissive: G.brilho, emissiveIntensity: 0.35, transparent: true, opacity: 0.6, roughness: 0.2, transmission: 0.3, side: THREE.DoubleSide });
  const nucleo = brilhante(G.acento, 2.2);
  const m = new THREE.Group(), anim = {};
  // bell from a lathe profile with a ruffled rim
  const perfil = [[0, 0.26], [0.1, 0.255], [0.19, 0.21], [0.26, 0.13], [0.3, 0.04], [0.31, -0.01], [0.28, -0.03]].map(([x, y]) => new THREE.Vector2(x, y));
  const geoSino = new THREE.LatheGeometry(perfil, 40);
  const p = geoSino.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0.02) { const a = Math.atan2(z, x), k = 1 + Math.sin(a * 14) * 0.06; p.setXYZ(i, x * k, y + Math.sin(a * 14) * 0.012, z * k); } }
  geoSino.computeVertexNormals();
  const cupula = new THREE.Mesh(geoSino, sino); m.add(cupula);
  m.add(esfera(nucleo, 0.08, [0, 0.12, 0], [1, 0.8, 1], 16));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; m.add(malha(new THREE.TorusGeometry(0.05, 0.01, 6, 16), nucleo, [Math.cos(a) * 0.09, 0.1, Math.sin(a) * 0.09], null, [Math.PI / 2, 0, a])); } // gonads, the four glowing rings
  // frilly oral arms (ribbons)
  anim.bracos = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const geo = new THREE.PlaneGeometry(0.06, 0.55, 2, 18); geo.translate(0, -0.275, 0);
    const fita = new THREE.Mesh(geo, membrana(G.ventre, G.acento, { opacity: 0.7 }));
    fita.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05); fita.rotation.y = a;
    m.add(fita); anim.bracos.push({ fita, base: geo.attributes.position.array.slice(), i });
  }
  // long fine tentacles
  const mFio = new THREE.LineBasicMaterial({ color: G.brilho, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  anim.fios = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, N = 22;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const linha = new THREE.Line(geo, mFio); linha.frustumCulled = false; m.add(linha);
    anim.fios.push({ geo, a, N, comp: 0.7 + (i % 3) * 0.18 });
  }
  m.rotation.x = 0;
  return {
    modelo: m, semGirar: true,
    update(t, e) {
      const pulso = Math.sin(t * (2 + e));
      cupula.scale.set(1 + pulso * 0.08, 1 - pulso * 0.1, 1 + pulso * 0.08);
      for (const f of anim.fios) {
        const arr = f.geo.attributes.position.array, r = 0.27 * (1 + pulso * 0.08);
        for (let k = 0; k < f.N; k++) {
          const u = k / (f.N - 1), y = -0.02 - u * f.comp;
          const onda = Math.sin(t * 2.2 - u * 7 + f.a * 3) * 0.05 * u;
          arr[k * 3] = Math.cos(f.a) * (r * (1 - u * 0.5)) + onda; arr[k * 3 + 1] = y; arr[k * 3 + 2] = Math.sin(f.a) * (r * (1 - u * 0.5)) + Math.cos(t * 1.7 - u * 6 + f.a) * 0.05 * u;
        }
        f.geo.attributes.position.needsUpdate = true;
      }
      for (const b of anim.bracos) {
        const arr = b.fita.geometry.attributes.position.array;
        for (let k = 0; k < arr.length; k += 3) { const y = b.base[k + 1]; arr[k + 2] = Math.sin(t * 2.5 + y * 14 + b.i) * 0.03 * -y * 3; arr[k] = b.base[k] * (1 + Math.sin(y * 30 + t * 3) * 0.4); }
        b.fita.geometry.attributes.position.needsUpdate = true;
      }
      m.position.y = pulso * 0.04;
    },
  };
}

function fenix(G) {
  const pena = brilhante(G.corpo, 0.3, { flatShading: true });
  const ouro = brilhante(G.ventre, 0.5);
  const fogo = brilhante('#ff4a1a', 1.1, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const m = new THREE.Group(), anim = {};
  m.add(esfera(pena, 0.1, [0, 0, 0], [1, 1, 1.9]));
  m.add(esfera(ouro, 0.08, [0, -0.03, 0.08], [1, 0.9, 1.3]));
  const cabeca = new THREE.Group(); cabeca.position.set(0, 0.08, 0.2); m.add(cabeca);
  cabeca.add(esfera(pena, 0.06, [0, 0, 0], [0.95, 1, 1.15]));
  cabeca.add(cone(mat('#ffd36b', { metalness: 0.7, roughness: 0.25 }), 0.022, 0.08, [0, -0.01, 0.08], [Math.PI / 2 + 0.25, 0, 0], 6));
  for (const l of [-1, 1]) cabeca.add(esfera(brilhante('#fff6c8', 3), 0.011, [l * 0.035, 0.015, 0.04], null, 6));
  for (let i = 0; i < 5; i++) cabeca.add(cone(i % 2 ? ouro : fogo, 0.012, 0.11 - Math.abs(i - 2) * 0.015, [0, 0.06, -0.02 - i * 0.012], [-0.5 - i * 0.18, 0, (i - 2) * 0.12], 4)); // crest
  // flame wings
  const cores = [brilhante('#ff5a1f', 0.55, { side: THREE.DoubleSide }), brilhante('#ff9a3d', 0.45, { side: THREE.DoubleSide }), brilhante('#ffd36b', 0.5, { side: THREE.DoubleSide })];
  anim.asas = [1, -1].map((l) => { const a = asaPenas(l, 0.75, cores, pena); a.position.set(l * 0.06, 0.06, 0.08); m.add(a); return { piv: a, lado: l }; });
  // long trailing tail plumes with glowing eyes at the tips
  anim.plumas = [];
  for (let i = 0; i < 7; i++) {
    const c = cadeia(7, 0.08, 0.02, 0.012, i % 2 ? ouro : pena, -1, 1.1);
    c.raiz.position.set(0, 0.02, -0.17); c.raiz.rotation.set(0.15 + Math.abs(i - 3) * 0.03, (i - 3) * 0.12, 0);
    const ponta = new THREE.Mesh(geoPena(0.16, 0.06), fogo); ponta.rotation.y = Math.PI; ponta.position.z = -0.05; c.ponta.add(ponta);
    c.ponta.add(esfera(brilhante('#fff6c8', 3), 0.016, [0, 0.005, -0.12], null, 8));
    m.add(c.raiz); anim.plumas.push(c.segs);
  }
  return {
    modelo: m,
    particulas: { cor: '#ffb347', taxa: 34, vida: 1.3, subir: 0.35, espalhar: 0.08 },
    update(t, e) {
      const f = t * (4.5 + e * 2.5);
      for (const a of anim.asas) a.piv.rotation.z = a.lado * (Math.sin(f) * 0.7 * e + 0.45);
      anim.plumas.forEach((segs, j) => segs.forEach((s, i) => { s.rotation.x = Math.sin(t * 2.4 - i * 0.6 + j * 0.4) * 0.1; s.rotation.y = Math.sin(t * 1.9 - i * 0.5 + j) * 0.08; }));
      m.position.y = -Math.sin(f) * 0.025 * e;
    },
  };
}

const CONSTRUTORES = { dragao, pegaso, baleia, raposa, fada, aguaviva, fenix };
const PARTICULAS = {
  fada: { cor: '#ffe7a8', taxa: 26, vida: 1.6, subir: -0.08, espalhar: 0.05 },
  raposa: { cor: '#8fe3ff', taxa: 14, vida: 1.4, subir: 0.25, espalhar: 0.1 },
  aguaviva: { cor: '#ffb3e6', taxa: 6, vida: 2.5, subir: 0.2, espalhar: 0.15 },
  dragao: { cor: '#c9b6ff', taxa: 8, vida: 1.0, subir: 0.05, espalhar: 0.06 },
  pegaso: { cor: '#fff0c0', taxa: 10, vida: 1.2, subir: 0.05, espalhar: 0.06 },
  baleia: { cor: '#9fe1ff', taxa: 5, vida: 2.0, subir: 0.15, espalhar: 0.2 },
};

export function construirGuardiao(nome, texBrilho) {
  const G = { ...(GUARDIOES[nome] || GUARDIOES['fada']) };
  if (nome === 'fênix') G.forma = 'fenix';
  const raiz = new THREE.Group();
  const feito = CONSTRUTORES[G.forma](G);
  const modelo = new THREE.Group(); modelo.add(feito.modelo); raiz.add(modelo);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, color: G.brilho, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(G.forma === 'baleia' ? 1.8 : 0.9); raiz.add(halo);
  const mats = new Set();
  raiz.traverse((o) => { if (o.material) mats.add(o.material); });
  for (const m of mats) { m.userData.opacidade = m.transparent ? m.opacity : 1; }
  return {
    raiz, modelo, halo, G, semGirar: !!feito.semGirar,
    particulas: feito.particulas || PARTICULAS[G.forma],
    update: feito.update,
    esmaecer(f) { for (const m of mats) { m.transparent = true; m.opacity = m.userData.opacidade * f; } },
  };
}
