// What makes each kind of kingdom unique up close: its story, house style, landmark and weather.
import * as THREE from 'three';

const TOPO = 0.07;

export const DESCRICOES = {
  'cristal-lunar': {
    texto:
      'Torres de cristal brotam do chão e acendem com a luz da lua. No centro do reino, o Coração de Cristal flutua sobre um altar de pedra, e pontes de cristal ligam o castelo às muralhas.',
    marco: 'Coração de Cristal',
    marcoDesc: 'um cristal gigante que flutua e gira sobre o altar',
    clima: 'poeira de cristal subindo devagar',
  },
  'cascatas-douradas': {
    texto:
      'Um reino de terraços onde a água corre o tempo todo. Ela desce de degrau em degrau, gira a grande roda d’água e atravessa a cidade por um aqueduto, sob a luz dourada do fim de tarde.',
    marco: 'Terraços das Águas',
    marcoDesc: 'piscinas em degraus, cascatas entre elas e uma roda d’água',
    clima: 'brilhos dourados no ar',
  },
  'prado-celeste': {
    texto:
      'Campos floridos em fileiras coloridas, chalés com telhado de palha e moinhos que nunca param. Debaixo da árvore mais antiga do prado, um balanço vai e vem.',
    marco: 'Moinhos do Prado',
    marcoDesc: 'moinhos girando, canteiros de tulipas, fardos de feno e o balanço',
    clima: 'borboletas voando entre as flores',
  },
  'aurora-de-gelo': {
    texto:
      'Casas em forma de iglu, telhados cobertos de neve e pingentes de gelo pendurados sob a ilha. No lago congelado, os moradores patinam enquanto a aurora dança logo acima do reino.',
    marco: 'Lago Congelado',
    marcoDesc: 'patinadores, picos de gelo e um boneco de neve',
    clima: 'neve caindo sem parar',
  },
  'floresta-de-lanternas': {
    texto:
      'No meio do reino cresce a Árvore Ancestral, com casinhas penduradas nos galhos e uma escada em espiral. Cordões com mil lanternas cruzam as ruas, e toda noite lanternas de papel sobem para o céu.',
    marco: 'Árvore Ancestral',
    marcoDesc: 'casas nos galhos, escada em espiral e pontes de corda',
    clima: 'lanternas de papel subindo ao céu',
  },
  'abismo-luminoso': {
    texto:
      'Um recife que flutua fora d’água. Corais acesos fazem as vezes de torres, algas dançam ao vento, e uma concha gigante se abre devagar para mostrar sua pérola.',
    marco: 'Recife Luminoso',
    marcoDesc: 'corais brilhantes, algas, um cardume e a concha com a pérola',
    clima: 'bolhas subindo como se o céu fosse mar',
  },
  'jardim-sakura': {
    texto:
      'As cerejeiras nunca perdem as flores, e as pétalas caem o ano inteiro. Um portal vermelho leva ao lago das carpas, cruzado por uma ponte em arco e vigiado por um pagode de três andares.',
    marco: 'Lago das Carpas',
    marcoDesc: 'ponte em arco, carpas nadando, portal, pagode e lanternas de pedra',
    clima: 'pétalas de cerejeira caindo',
  },
};

// ---------- helpers ----------
const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, flatShading: true, ...o });
const brilho = (cor, f = 1.2, o = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: f, roughness: 0.4, ...o });
function m(geo, material, pos, rot, esc) {
  const x = new THREE.Mesh(geo, material);
  if (pos) x.position.set(...pos);
  if (rot) x.rotation.set(...rot);
  if (esc) x.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc]));
  return x;
}
const caixa = (w, h, d, mt, pos, rot) => m(new THREE.BoxGeometry(w, h, d), mt, pos, rot);
const cil = (rt, rb, h, mt, pos, seg = 10, rot) => m(new THREE.CylinderGeometry(rt, rb, h, seg), mt, pos, rot);
const cone = (r, h, mt, pos, seg = 8, rot) => m(new THREE.ConeGeometry(r, h, seg), mt, pos, rot);
const esfera = (r, mt, pos, esc, seg = 12) =>
  m(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mt, pos, null, esc);
function osso(a, b, r, mt, seg = 6) {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b);
  const x = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), mt);
  x.position.copy(va).add(vb).multiplyScalar(0.5);
  x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return x;
}
const aguaVS =
  'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
function materialAgua(cor, queda) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { tempo: { value: 0 }, cor: { value: new THREE.Color(cor) } },
    vertexShader: aguaVS,
    fragmentShader: queda
      ? `uniform float tempo; uniform vec3 cor; varying vec2 vUv; void main(){ float d = fract(vUv.y * 4.0 + tempo * 1.6 + sin(vUv.x * 12.0) * 0.15); float a = 0.55 + 0.45 * smoothstep(0.3, 1.0, d); gl_FragColor = vec4(cor * (0.9 + 0.3 * d), a * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x)); }`
      : `uniform float tempo; uniform vec3 cor; varying vec2 vUv; void main(){ float o = sin(vUv.x * 40.0 + tempo * 2.0) * sin(vUv.y * 35.0 - tempo * 1.5); gl_FragColor = vec4(cor * (0.85 + 0.25 * o), 0.85); }`,
  });
}
function figura(cor, pele = '#ffe0c8') {
  // tiny person
  const g = new THREE.Group();
  g.add(cil(0.006, 0.009, 0.022, mat(cor), [0, 0.011, 0], 6));
  g.add(esfera(0.0065, mat(pele), [0, 0.028, 0], null, 6));
  return g;
}
function catenaria(a, b, queda, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(
      new THREE.Vector3(
        THREE.MathUtils.lerp(a[0], b[0], u),
        THREE.MathUtils.lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * queda,
        THREE.MathUtils.lerp(a[2], b[2], u),
      ),
    );
  }
  return pts;
}

// ---------- house styles ----------
export function estiloCasas(bioma, b) {
  const caixaGeo = () => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  };
  const telhado4 = (r = 0.78, h = 0.7) => {
    const g = new THREE.ConeGeometry(r, h, 4);
    g.rotateY(Math.PI / 4);
    g.translate(0, h / 2, 0);
    return g;
  };
  switch (bioma) {
    case 'cristal-lunar': {
      const casa = new THREE.CylinderGeometry(0.5, 0.55, 1, 6);
      casa.translate(0, 0.5, 0);
      const teto = new THREE.ConeGeometry(0.55, 1.4, 6);
      teto.translate(0, 0.7, 0);
      return {
        casa,
        teto,
        paredes: ['#e9e2ff', '#d9ccff', '#f3eeff'],
        tetos: [b.acento, '#8f7bff', '#c9b6ff'],
        tetoMat: { emissive: b.acento, emissiveIntensity: 0.35, transparent: true, opacity: 0.9, roughness: 0.2 },
        alturaTeto: 1.3,
      };
    }
    case 'prado-celeste': {
      const casa = new THREE.CylinderGeometry(0.5, 0.52, 1, 10);
      casa.translate(0, 0.5, 0);
      const teto = new THREE.ConeGeometry(0.66, 0.8, 10);
      teto.translate(0, 0.4, 0);
      return {
        casa,
        teto,
        paredes: ['#fffaf0', '#f6ecd8', '#fff3e6'],
        tetos: ['#d9b86a', '#c9a25a', '#e3c47a'],
        alturaTeto: 0.95,
      };
    }
    case 'aurora-de-gelo': {
      const casa = new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      casa.scale(1, 1.6, 1);
      const teto = new THREE.CylinderGeometry(0.12, 0.14, 0.4, 8);
      teto.translate(0, -0.1, 0.45);
      return {
        janelaY: 0.3,
        casa,
        teto,
        paredes: ['#f4fbff', '#e6f4ff', '#ffffff'],
        tetos: ['#d7ecf8', '#bfe0f5'],
        paredeMat: { roughness: 0.35 },
        alturaTeto: 0.4,
      };
    }
    case 'floresta-de-lanternas': {
      const casa = new THREE.BoxGeometry(1, 0.5, 1);
      casa.translate(0, 0.75, 0);
      const pilotis = [
        [-0.4, -0.4],
        [0.4, -0.4],
        [-0.4, 0.4],
        [0.4, 0.4],
      ].map(([x, z]) => {
        const p = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5);
        p.translate(x, 0.25, z);
        return p;
      });
      const geo = mesclar([casa, ...pilotis]);
      return {
        janelaY: 0.75,
        casa: geo,
        teto: telhado4(0.85, 0.7),
        paredes: ['#8a6a4a', '#7a5a3e', '#a07a52'],
        tetos: ['#7a3f2e', '#a8553a', '#5a3a2a'],
        alturaTeto: 1.3,
      };
    }
    case 'abismo-luminoso': {
      const casa = new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
      casa.scale(1, 1.5, 1);
      const teto = new THREE.ConeGeometry(0.22, 0.9, 7, 6);
      teto.translate(0, 0.45, 0);
      return {
        casa,
        teto,
        paredes: ['#f2e6ff', '#ffe6f3', '#e0f7ff'],
        tetos: ['#ff8fd8', '#7ff0ff', '#c9a8ff'],
        tetoMat: { emissive: '#ff8fd8', emissiveIntensity: 0.4 },
        alturaTeto: 0.6,
      };
    }
    case 'jardim-sakura': {
      const teto = mesclar([
        (() => {
          const g = new THREE.ConeGeometry(0.95, 0.35, 4);
          g.rotateY(Math.PI / 4);
          g.translate(0, 0.17, 0);
          return g;
        })(),
        (() => {
          const g = new THREE.ConeGeometry(0.55, 0.45, 4);
          g.rotateY(Math.PI / 4);
          g.translate(0, 0.42, 0);
          return g;
        })(),
      ]);
      return {
        casa: caixaGeo(),
        teto,
        paredes: ['#fff7f0', '#f6ead8', '#fffaf4'],
        tetos: ['#3f3a5c', '#2e2a40', '#5a3a4a'],
        alturaTeto: 0.7,
      };
    }
    case 'cascatas-douradas':
    default:
      return {
        casa: caixaGeo(),
        teto: telhado4(),
        paredes: [b.muro, '#f6e6cc', '#efe0c4', '#fff6ea'],
        tetos: [b.teto, '#3f4f88', '#6a7ab8', '#c9a35a'],
        alturaTeto: 0.9,
      };
  }
}
function mesclar(geos) {
  const pos = [],
    nor = [],
    idx = [];
  let base = 0;
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) idx.push(base + i);
    base += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

// ---------- landmarks (built in a local frame: +z faces the castle) ----------
export function construirMarco(bioma, ctx) {
  const { b, R, animar } = ctx;
  const g = new THREE.Group();
  const extras = new THREE.Group(); // pieces placed in city coordinates (bridges, icicles, lantern strings)

  if (bioma === 'cristal-lunar') {
    const pedra = mat('#8f86b8');
    g.add(cil(0.12, 0.14, 0.03, pedra, [0, 0.015, 0], 6));
    g.add(cil(0.09, 0.1, 0.02, mat('#b7aee0'), [0, 0.04, 0], 6));
    const cristal = brilho(b.acento, 0.9, { transparent: true, opacity: 0.88, roughness: 0.15, flatShading: true });
    const coracao = new THREE.Group();
    coracao.position.y = 0.3;
    g.add(coracao);
    coracao.add(m(new THREE.OctahedronGeometry(0.05, 0), cristal, [0, 0, 0], null, [1, 2.6, 1]));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      coracao.add(
        m(
          new THREE.OctahedronGeometry(0.025, 0),
          cristal,
          [Math.cos(a) * 0.04, -0.03 + (i % 2) * 0.04, Math.sin(a) * 0.04],
          [Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6],
          [1, 2.2, 1],
        ),
      );
    }
    const estilhacos = [];
    for (let i = 0; i < 10; i++) {
      const s = m(new THREE.OctahedronGeometry(0.012, 0), cristal, [0, 0, 0], null, [1, 1.8, 1]);
      g.add(s);
      estilhacos.push(s);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4,
        x = Math.cos(a) * 0.11,
        z = Math.sin(a) * 0.11;
      g.add(m(new THREE.OctahedronGeometry(0.02, 0), cristal, [x, 0.09, z], null, [1, 3.5, 1]));
      const feixe = osso([x, 0.15, z], [0, 0.3, 0], 0.003, brilho('#ffffff', 2, { transparent: true, opacity: 0.5 }));
      g.add(feixe);
    }
    animar((t) => {
      coracao.rotation.y = t * 0.5;
      coracao.position.y = 0.3 + Math.sin(t * 1.2) * 0.02;
      estilhacos.forEach((s, i) => {
        const a = t * 0.8 + i * 0.63;
        s.position.set(Math.cos(a) * 0.1, 0.3 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.1);
        s.rotation.y = t * 2;
      });
    });
    // crystal bridges from the castle to the outer turrets
    const ponte = brilho(b.acento, 0.5, { transparent: true, opacity: 0.55, roughness: 0.1 });
    for (let i = 0; i < 3; i++) {
      const a = ctx.angulo + Math.PI * (0.45 + i * 0.55);
      const curva = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.cos(a) * 0.2, 0.55, Math.sin(a) * 0.2),
        new THREE.Vector3(Math.cos(a) * 0.6, 0.62, Math.sin(a) * 0.6),
        new THREE.Vector3(Math.cos(a) * 0.96, 0.2, Math.sin(a) * 0.96),
      );
      extras.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 30, 0.008, 6), ponte));
    }
    // geodes scattered on the ground
    for (let i = 0; i < 12; i++) {
      const a = R() * Math.PI * 2,
        d = 0.55 + R() * 0.38;
      for (let k = 0; k < 3; k++)
        extras.add(
          m(
            new THREE.OctahedronGeometry(0.01 + R() * 0.008, 0),
            cristal,
            [Math.cos(a) * d + (R() - 0.5) * 0.02, TOPO + 0.015, Math.sin(a) * d + (R() - 0.5) * 0.02],
            [R(), R(), R()],
            [1, 2, 1],
          ),
        );
    }
  } else if (bioma === 'cascatas-douradas') {
    const pedra = mat('#e6d3b3'),
      ouro = mat('#d9b46a', { metalness: 0.8, roughness: 0.25, flatShading: false });
    const azul = '#5fb0e6';
    const aguas = [];
    for (let k = 0; k < 3; k++) {
      // terraces stepping down toward the rim
      const z = 0.08 - k * 0.1,
        h = 0.16 - k * 0.05;
      g.add(caixa(0.26, h, 0.1, pedra, [0, h / 2, z]));
      const piscina = m(
        new THREE.PlaneGeometry(0.22, 0.08),
        materialAgua(azul, false),
        [0, h + 0.001, z],
        [-Math.PI / 2, 0, 0],
      );
      g.add(piscina);
      aguas.push(piscina.material);
      if (k < 2) {
        const queda = m(new THREE.PlaneGeometry(0.12, 0.05), materialAgua('#bfe6ff', true), [0, h - 0.025, z - 0.051]);
        g.add(queda);
        aguas.push(queda.material);
      }
      for (const l of [-1, 1]) g.add(cil(0.008, 0.01, 0.05, ouro, [l * 0.12, h + 0.025, z + 0.04], 8)); // golden posts
    }
    // water wheel turning in the last fall
    const roda = new THREE.Group();
    roda.position.set(0.16, 0.07, -0.12);
    roda.rotation.y = Math.PI / 2;
    g.add(roda);
    roda.add(m(new THREE.TorusGeometry(0.06, 0.006, 6, 24), mat('#7a5638')));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      roda.add(osso([0, 0, 0], [Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0], 0.003, mat('#7a5638')));
      roda.add(caixa(0.02, 0.012, 0.03, mat('#8a6448'), [Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0], [0, 0, a]));
    }
    // golden statue on a pedestal
    g.add(cil(0.025, 0.03, 0.05, pedra, [-0.15, 0.025, 0.1], 8));
    const estatua = new THREE.Group();
    estatua.position.set(-0.15, 0.05, 0.1);
    g.add(estatua);
    estatua.add(
      cil(0.01, 0.015, 0.05, ouro, [0, 0.025, 0], 8),
      esfera(0.012, ouro, [0, 0.062, 0]),
      osso([0, 0.045, 0], [0.025, 0.08, 0], 0.004, ouro),
    );
    // aqueduct with flowing water crossing the city
    const ag = new THREE.Group();
    extras.add(ag);
    const a0 = ctx.angulo + Math.PI * 0.75;
    const ini = [Math.cos(a0) * 0.9, 0, Math.sin(a0) * 0.9],
      fim = [Math.cos(a0 + 1.1) * 0.9, 0, Math.sin(a0 + 1.1) * 0.9];
    const n = 8,
      alt = 0.13;
    for (let i = 0; i <= n; i++) {
      const u = i / n,
        x = THREE.MathUtils.lerp(ini[0], fim[0], u),
        z = THREE.MathUtils.lerp(ini[2], fim[2], u);
      ag.add(caixa(0.018, alt, 0.018, pedra, [x, TOPO + alt / 2, z]));
    }
    const dx = fim[0] - ini[0],
      dz = fim[2] - ini[2],
      comp = Math.hypot(dx, dz),
      ang = Math.atan2(dz, dx);
    ag.add(
      caixa(comp, 0.02, 0.03, pedra, [(ini[0] + fim[0]) / 2, TOPO + alt + 0.01, (ini[2] + fim[2]) / 2], [0, -ang, 0]),
    );
    const canal = m(
      new THREE.PlaneGeometry(comp, 0.018),
      materialAgua(azul, false),
      [(ini[0] + fim[0]) / 2, TOPO + alt + 0.021, (ini[2] + fim[2]) / 2],
      [-Math.PI / 2, 0, -ang],
    );
    ag.add(canal);
    aguas.push(canal.material);
    animar((t) => {
      roda.rotation.z = -t * 1.2;
      for (const a of aguas) a.uniforms.tempo.value = t;
    });
  } else if (bioma === 'prado-celeste') {
    const moinho = (x, z, escala, fase) => {
      const w = new THREE.Group();
      w.position.set(x, 0, z);
      w.scale.setScalar(escala);
      g.add(w);
      w.add(cil(0.03, 0.045, 0.2, mat('#fff6ea'), [0, 0.1, 0], 10));
      w.add(cone(0.045, 0.06, mat('#b0563f'), [0, 0.23, 0], 10));
      w.add(caixa(0.02, 0.03, 0.002, brilho('#ffe199', 0.8), [0, 0.06, 0.044]));
      const pas = new THREE.Group();
      pas.position.set(0, 0.19, 0.05);
      w.add(pas);
      pas.add(cil(0.008, 0.008, 0.02, mat('#7a5638'), [0, 0, 0], 6, [Math.PI / 2, 0, 0]));
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Group();
        p.rotation.z = (i / 4) * Math.PI * 2;
        pas.add(p);
        p.add(caixa(0.004, 0.14, 0.004, mat('#7a5638'), [0, 0.07, 0]));
        p.add(caixa(0.035, 0.1, 0.002, mat('#fff3e0', { side: THREE.DoubleSide }), [0.02, 0.085, 0]));
      }
      animar((t) => {
        pas.rotation.z = t * 1.4 + fase;
      });
    };
    moinho(-0.1, -0.05, 1.2, 0);
    moinho(0.12, 0.06, 0.9, 1.3);
    // tulip fields in colored rows
    const cores = ['#ff5f8f', '#ffd23f', '#ff8fb1', '#b98bff', '#ffffff'];
    const fileiras = 5,
      porFila = 14,
      total = fileiras * porFila;
    const flores = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.007, 6, 4),
      mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.15 }),
      total,
    );
    const hastes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.018, 4), mat('#4f9b48'), total);
    const o = new THREE.Object3D();
    let i = 0;
    for (let f = 0; f < fileiras; f++)
      for (let k = 0; k < porFila; k++) {
        o.position.set(-0.13 + k * 0.02, TOPO - 0.07 + 0.009, -0.2 + f * 0.025);
        o.updateMatrix();
        hastes.setMatrixAt(i, o.matrix);
        o.position.y += 0.012;
        o.updateMatrix();
        flores.setMatrixAt(i, o.matrix);
        flores.setColorAt(i, new THREE.Color(cores[f]));
        i++;
      }
    flores.position.y = hastes.position.y = 0.0;
    g.add(flores, hastes);
    g.add(caixa(0.3, 0.012, 0.003, mat('#8a6448'), [0.01, 0.01, -0.215])); // fence
    for (let k = 0; k < 4; k++)
      g.add(
        cil(0.022, 0.022, 0.03, mat('#e3c47a'), [0.15 - k * 0.04, 0.022, -0.1 + (k % 2) * 0.03], 10, [
          0,
          0,
          Math.PI / 2,
        ]),
      ); // hay bales
    // the old tree with a swing
    const arvore = new THREE.Group();
    arvore.position.set(-0.05, 0, 0.12);
    g.add(arvore);
    arvore.add(cil(0.015, 0.025, 0.18, mat('#6b4a33'), [0, 0.09, 0], 7));
    for (let k = 0; k < 6; k++)
      arvore.add(
        m(new THREE.IcosahedronGeometry(0.05 + R() * 0.03, 0), mat('#4f9b48'), [
          (R() - 0.5) * 0.12,
          0.2 + R() * 0.06,
          (R() - 0.5) * 0.12,
        ]),
      );
    arvore.add(osso([0, 0.14, 0], [0.08, 0.17, 0], 0.006, mat('#6b4a33')));
    const balanco = new THREE.Group();
    balanco.position.set(0.07, 0.165, 0);
    arvore.add(balanco);
    balanco.add(
      osso([-0.012, 0, 0], [-0.012, -0.11, 0], 0.001, mat('#d9c9a8')),
      osso([0.012, 0, 0], [0.012, -0.11, 0], 0.001, mat('#d9c9a8')),
      caixa(0.032, 0.004, 0.014, mat('#8a6448'), [0, -0.11, 0]),
    );
    animar((t) => {
      balanco.rotation.z = Math.sin(t * 1.6) * 0.5;
    });
  } else if (bioma === 'aurora-de-gelo') {
    const lago = m(
      new THREE.CircleGeometry(0.14, 32),
      mat('#bfe8ff', {
        roughness: 0.05,
        metalness: 0.3,
        flatShading: false,
        emissive: '#7cf5c8',
        emissiveIntensity: 0.08,
      }),
      [0, 0.004, 0],
      [-Math.PI / 2, 0, 0],
    );
    g.add(lago);
    g.add(m(new THREE.TorusGeometry(0.14, 0.01, 6, 40), mat('#ffffff'), [0, 0.005, 0], [Math.PI / 2, 0, 0]));
    const patinadores = [0, 1, 2].map((i) => {
      const f = figura(['#c0606a', '#3f6fa0', '#6a5a8f'][i]);
      g.add(f);
      return f;
    });
    const gelo = mat('#dff7ff', {
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      emissive: '#7cf5c8',
      emissiveIntensity: 0.15,
    });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + R() * 0.3,
        h = 0.06 + R() * 0.14;
      g.add(cone(0.015 + R() * 0.01, h, gelo, [Math.cos(a) * 0.17, h / 2, Math.sin(a) * 0.17], 5));
    }
    const neve = mat('#ffffff', { flatShading: false });
    const boneco = new THREE.Group();
    boneco.position.set(0.12, 0, 0.14);
    g.add(boneco);
    boneco.add(
      esfera(0.022, neve, [0, 0.02, 0]),
      esfera(0.016, neve, [0, 0.052, 0]),
      esfera(0.011, neve, [0, 0.075, 0]),
    );
    boneco.add(cone(0.003, 0.016, mat('#ff8a3d'), [0, 0.075, 0.016], 5, [Math.PI / 2, 0, 0]));
    boneco.add(
      cil(0.009, 0.009, 0.012, mat('#20203a'), [0, 0.09, 0], 8),
      cil(0.014, 0.014, 0.002, mat('#20203a'), [0, 0.084, 0], 10),
    );
    animar((t) =>
      patinadores.forEach((p, i) => {
        const a = t * (0.6 + i * 0.15) + i * 2.1,
          r = 0.06 + i * 0.025;
        p.position.set(Math.cos(a) * r, 0.004, Math.sin(a) * r);
        p.rotation.y = -a;
        p.rotation.z = 0.25;
      }),
    );
    // icicles under the rim
    const pingente = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 0.08, 5), gelo, 46);
    const o = new THREE.Object3D();
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2,
        h = 0.5 + R();
      o.position.set(Math.cos(a) * 1.0, -0.075 - h * 0.04, Math.sin(a) * 1.0);
      o.rotation.set(Math.PI, 0, 0);
      o.scale.set(1, h, 1);
      o.updateMatrix();
      pingente.setMatrixAt(i, o.matrix);
    }
    extras.add(pingente);
    // snow caps on the wall turrets
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.1;
      extras.add(esfera(0.03, neve, [Math.cos(a) * 0.965, TOPO + 0.14, Math.sin(a) * 0.965], [1, 0.45, 1]));
    }
    // a small aurora right above the kingdom
    const aurora = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.35, 48, 1, true, 0, Math.PI * 1.3),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { tempo: { value: 0 } },
        vertexShader: aguaVS,
        fragmentShader:
          'uniform float tempo; varying vec2 vUv; void main(){ float o = sin(vUv.x * 20.0 + tempo) * 0.5 + 0.5; float f = smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5 + o * 0.3, 1.0, vUv.y)); gl_FragColor = vec4(mix(vec3(0.4, 1.0, 0.75), vec3(0.7, 0.5, 1.0), vUv.y), f * 0.45); }',
      }),
    );
    aurora.position.y = 1.25;
    extras.add(aurora);
    animar((t) => {
      aurora.material.uniforms.tempo.value = t;
      aurora.rotation.y = t * 0.05;
    });
  } else if (bioma === 'floresta-de-lanternas') {
    const madeira = mat('#5a3d28'),
      folhas = mat('#24472d'),
      luz = brilho(b.janela, 1.6);
    g.add(cil(0.03, 0.05, 0.5, madeira, [0, 0.25, 0], 9));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(osso([0, 0.03, 0], [Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08], 0.012, madeira));
    }
    const galhos = [
      [0.12, 0.32, 0.03],
      [-0.1, 0.38, -0.06],
      [0.02, 0.44, 0.12],
      [-0.06, 0.28, 0.1],
    ];
    for (const [x, y, z] of galhos) {
      g.add(osso([0, y - 0.05, 0], [x, y, z], 0.012, madeira));
      g.add(caixa(0.045, 0.035, 0.04, mat('#8a6a4a'), [x, y + 0.018, z]));
      g.add(cone(0.038, 0.035, mat('#7a3f2e'), [x, y + 0.052, z], 4, [0, Math.PI / 4, 0]));
      g.add(caixa(0.012, 0.012, 0.002, luz, [x, y + 0.018, z + 0.021]));
    }
    for (let i = 0; i < 9; i++)
      g.add(
        m(new THREE.IcosahedronGeometry(0.07 + R() * 0.05, 0), folhas, [
          (R() - 0.5) * 0.25,
          0.5 + R() * 0.12,
          (R() - 0.5) * 0.25,
        ]),
      );
    for (let i = 0; i < 22; i++) {
      const a = i * 0.6,
        y = 0.03 + i * 0.019;
      g.add(caixa(0.02, 0.004, 0.01, mat('#8a6448'), [Math.cos(a) * 0.045, y, Math.sin(a) * 0.045], [0, -a, 0]));
    } // spiral stair
    for (let i = 0; i < 12; i++) g.add(esfera(0.008, luz, [(R() - 0.5) * 0.3, 0.42 + R() * 0.1, (R() - 0.5) * 0.3])); // lanterns in the canopy
    // lantern strings across the city
    const cores = [b.janela, '#ff6a4a', '#ffd36b'];
    const pontosLant = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const ini = [Math.cos(a) * 0.3, TOPO + 0.32, Math.sin(a) * 0.3],
        fim = [Math.cos(a + 0.5) * 0.92, TOPO + 0.12, Math.sin(a + 0.5) * 0.92];
      const pts = catenaria(ini, fim, 0.06, 14);
      extras.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: '#3a2a20' }),
        ),
      );
      pts.slice(1, -1).forEach((p, i) => pontosLant.push({ p, c: cores[(i + k) % 3] }));
    }
    const lant = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.008, 6, 4),
      brilho('#ffffff', 1.8),
      pontosLant.length,
    );
    const o = new THREE.Object3D();
    pontosLant.forEach(({ p, c }, i) => {
      o.position.copy(p);
      o.position.y -= 0.01;
      o.updateMatrix();
      lant.setMatrixAt(i, o.matrix);
      lant.setColorAt(i, new THREE.Color(c));
    });
    extras.add(lant);
    // rope bridge from the great tree to the wall
    const ini = [0, 0.4, 0],
      fim = [0, 0.13, -0.32];
    const tabuas = catenaria(ini, fim, 0.03, 12);
    tabuas.forEach((p) => g.add(caixa(0.03, 0.003, 0.012, mat('#8a6448'), [p.x, p.y, p.z])));
    for (const l of [-1, 1])
      g.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(catenaria([l * 0.015, 0.43, 0], [l * 0.015, 0.16, -0.32], 0.03, 12)),
          new THREE.LineBasicMaterial({ color: '#d9c9a8' }),
        ),
      );
  } else if (bioma === 'abismo-luminoso') {
    const coral = [brilho('#ff7fc8', 0.7), brilho('#7ff0ff', 0.7), brilho('#c9a8ff', 0.6), brilho('#ffb36b', 0.6)];
    const ramo = (x, z, cor, alt) => {
      // branching coral tower
      const raiz = new THREE.Group();
      raiz.position.set(x, 0, z);
      g.add(raiz);
      const crescer = (pai, comp, raio, nivel) => {
        const s = new THREE.Group();
        pai.add(s);
        s.add(cil(raio * 0.7, raio, comp, cor, [0, comp / 2, 0], 6));
        if (nivel > 0)
          for (const l of [-1, 1]) {
            const f = new THREE.Group();
            f.position.y = comp;
            f.rotation.z = l * (0.4 + R() * 0.3);
            f.rotation.y = R() * 3;
            s.add(f);
            crescer(f, comp * 0.75, raio * 0.7, nivel - 1);
          }
        else s.add(esfera(raio * 1.4, cor, [0, comp, 0], null, 6));
      };
      crescer(raiz, alt, 0.012, 3);
    };
    ramo(-0.1, -0.05, coral[0], 0.09);
    ramo(0.08, -0.1, coral[1], 0.07);
    ramo(0.12, 0.08, coral[2], 0.06);
    const cerebro = new THREE.IcosahedronGeometry(0.035, 2);
    const p = cerebro.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      v.multiplyScalar(1 + Math.sin(v.x * 220) * Math.sin(v.z * 220) * 0.08);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    cerebro.computeVertexNormals();
    g.add(m(cerebro, coral[3], [-0.13, 0.02, 0.1], null, [1, 0.6, 1]));
    for (let i = 0; i < 3; i++)
      g.add(
        m(
          new THREE.CircleGeometry(0.05, 12),
          brilho('#ff8fd8', 0.5, { side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
          [0.02 + i * 0.05, 0.06, -0.18],
          [0, R() * 0.6, 0],
        ),
      ); // sea fans
    // giant clam with a pearl
    const concha = new THREE.Group();
    concha.position.set(0, 0.02, 0.06);
    g.add(concha);
    const nacar = mat('#f2e6ff', { roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide, flatShading: false });
    concha.add(
      m(
        new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        nacar,
        [0, 0, 0],
        null,
        [1, 0.5, 1],
      ),
    );
    const tampa = new THREE.Group();
    tampa.position.z = -0.06;
    concha.add(tampa);
    tampa.add(
      m(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), nacar, [0, 0, 0.06], null, [1, 0.5, 1]),
    );
    const perola = esfera(
      0.02,
      brilho('#ffffff', 1.4, { flatShading: false, roughness: 0.1 }),
      [0, 0.012, 0],
      null,
      16,
    );
    concha.add(perola);
    // kelp swaying
    const algas = [];
    for (let i = 0; i < 9; i++) {
      const geo = new THREE.PlaneGeometry(0.02, 0.22, 1, 10);
      geo.translate(0, 0.11, 0);
      const a = m(
        geo,
        brilho('#3fbf9a', 0.25, { side: THREE.DoubleSide }),
        [-0.16 + (i % 5) * 0.08, 0, 0.16 - Math.floor(i / 5) * 0.32],
        [0, R() * 3, 0],
      );
      g.add(a);
      algas.push({ a, base: geo.attributes.position.array.slice(), f: R() * 6 });
    }
    // a school of fish
    const peixes = [];
    for (let i = 0; i < 12; i++) {
      const f = cone(0.007, 0.022, brilho(['#ffd36b', '#7ff0ff'][i % 2], 0.6), [0, 0, 0], 5);
      g.add(f);
      peixes.push(f);
    }
    animar((t) => {
      tampa.rotation.x = 0.25 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.7;
      perola.material.emissiveIntensity = 1 + Math.sin(t * 2) * 0.5;
      for (const k of algas) {
        const arr = k.a.geometry.attributes.position.array;
        for (let j = 0; j < arr.length; j += 3)
          arr[j] = k.base[j] + Math.sin(t * 1.6 + k.base[j + 1] * 25 + k.f) * 0.015 * (k.base[j + 1] / 0.22);
        k.a.geometry.attributes.position.needsUpdate = true;
      }
      peixes.forEach((f, i) => {
        const a = t * 0.9 + i * 0.3;
        f.position.set(Math.cos(a) * 0.17, 0.18 + Math.sin(a * 3 + i) * 0.02, Math.sin(a) * 0.17);
        f.rotation.set(0, -a, Math.PI / 2);
      });
    });
  } else if (bioma === 'jardim-sakura') {
    const vermelho = mat('#c2362f'),
      pedra = mat('#9a9590'),
      agua = materialAgua('#3f7f8f', false);
    g.add(m(new THREE.CircleGeometry(0.12, 28), agua, [0, 0.004, -0.02], [-Math.PI / 2, 0, 0]));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.add(
        m(new THREE.DodecahedronGeometry(0.012 + R() * 0.008, 0), pedra, [
          Math.cos(a) * 0.125,
          0.006,
          -0.02 + Math.sin(a) * 0.125,
        ]),
      );
    }
    const ponte = new THREE.Group();
    ponte.position.set(0, 0, -0.02);
    g.add(ponte);
    ponte.add(m(new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), vermelho, [0, 0, 0], null, [1, 0.5, 2.6]));
    for (const l of [-1, 1])
      ponte.add(
        m(new THREE.TorusGeometry(0.1, 0.002, 4, 20, Math.PI), vermelho, [0, 0.025, l * 0.018], null, [1, 0.55, 1]),
      );
    const carpas = [];
    for (let i = 0; i < 5; i++) {
      const c = esfera(
        0.011,
        mat(i % 2 ? '#ff8a3d' : '#ffffff', { flatShading: false }),
        [0, 0.003, 0],
        [0.6, 0.4, 1.6],
        8,
      );
      g.add(c);
      carpas.push(c);
    }
    const torii = new THREE.Group();
    torii.position.set(0, 0, 0.16);
    g.add(torii);
    for (const l of [-1, 1]) torii.add(cil(0.006, 0.007, 0.13, vermelho, [l * 0.05, 0.065, 0], 8));
    torii.add(
      caixa(0.14, 0.01, 0.014, mat('#20203a'), [0, 0.135, 0]),
      caixa(0.12, 0.008, 0.01, vermelho, [0, 0.11, 0]),
    );
    const pagode = new THREE.Group();
    pagode.position.set(0.15, 0, -0.12);
    g.add(pagode);
    for (let k = 0; k < 3; k++) {
      const s = 1 - k * 0.22,
        y = k * 0.07;
      pagode.add(caixa(0.05 * s, 0.045, 0.05 * s, mat('#fff7f0'), [0, y + 0.022, 0]));
      pagode.add(cone(0.06 * s, 0.03, mat('#3f3a5c'), [0, y + 0.06, 0], 4, [0, Math.PI / 4, 0]));
    }
    pagode.add(cil(0.002, 0.002, 0.05, mat('#d9b46a', { metalness: 0.6 }), [0, 0.24, 0], 5));
    for (const [x, z] of [
      [-0.15, 0.08],
      [-0.12, -0.14],
      [0.14, 0.12],
    ]) {
      // stone lanterns
      g.add(
        cil(0.008, 0.01, 0.03, pedra, [x, 0.015, z], 6),
        caixa(0.022, 0.015, 0.022, pedra, [x, 0.037, z]),
        caixa(0.012, 0.008, 0.012, brilho('#ffd6a0', 1.4), [x, 0.037, z]),
        cone(0.02, 0.015, pedra, [x, 0.052, z], 4, [0, Math.PI / 4, 0]),
      );
    }
    for (const [x, z] of [
      [-0.17, -0.02],
      [0.05, -0.18],
      [0.17, 0.03],
    ]) {
      g.add(cil(0.007, 0.01, 0.08, mat('#5a3a3a'), [x, 0.04, z], 6));
      for (let k = 0; k < 5; k++)
        g.add(
          m(new THREE.IcosahedronGeometry(0.03 + R() * 0.02, 0), brilho('#ffb7d0', 0.15), [
            x + (R() - 0.5) * 0.06,
            0.09 + R() * 0.04,
            z + (R() - 0.5) * 0.06,
          ]),
        );
    }
    animar((t) => {
      agua.uniforms.tempo.value = t;
      carpas.forEach((c, i) => {
        const a = t * (0.4 + i * 0.07) + i * 1.3,
          r = 0.04 + (i % 3) * 0.025;
        c.position.set(Math.cos(a) * r, 0.003, -0.02 + Math.sin(a) * r);
        c.rotation.y = -a;
      });
    });
  }

  return { grupo: g, extras };
}

// ---------- ambient weather particles (city coordinates) ----------
const CLIMAS = {
  'cristal-lunar': { modo: 'subir', cores: ['#d9ccff', '#b9a3ff', '#ffffff'], n: 90, tam: 0.02, vel: 0.06 },
  'cascatas-douradas': { modo: 'subir', cores: ['#ffe27a', '#ffd27a', '#fff3c2'], n: 80, tam: 0.018, vel: 0.05 },
  'prado-celeste': { modo: 'voar', cores: ['#ff8fb1', '#ffe27a', '#b98bff', '#7ff0ff'], n: 26, tam: 0.03, vel: 0.12 },
  'aurora-de-gelo': { modo: 'cair', cores: ['#ffffff', '#eaf6ff'], n: 260, tam: 0.018, vel: 0.12 },
  'floresta-de-lanternas': { modo: 'subir', cores: ['#ffb54d', '#ff8a3d', '#ffd36b'], n: 40, tam: 0.045, vel: 0.07 },
  'abismo-luminoso': { modo: 'subir', cores: ['#9ff2ff', '#ffffff', '#ff8fd8'], n: 120, tam: 0.02, vel: 0.1 },
  'jardim-sakura': { modo: 'cair', cores: ['#ffc4d9', '#ffb7d0', '#ffffff'], n: 160, tam: 0.024, vel: 0.07 },
};
export function construirClima(bioma, texBrilho) {
  const c = CLIMAS[bioma] || CLIMAS['cascatas-douradas'];
  const pos = new Float32Array(c.n * 3),
    cor = new Float32Array(c.n * 3),
    fase = new Float32Array(c.n);
  const cores = c.cores.map((x) => new THREE.Color(x));
  for (let i = 0; i < c.n; i++) {
    const a = Math.random() * Math.PI * 2,
      d = Math.sqrt(Math.random()) * 0.95;
    pos.set([Math.cos(a) * d, TOPO + Math.random() * 0.9, Math.sin(a) * d], i * 3);
    const k = cores[i % cores.length];
    cor.set([k.r, k.g, k.b], i * 3);
    fase[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  const pontos = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: texBrilho,
      size: c.tam,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: c.modo === 'cair' ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  pontos.frustumCulled = false;
  return {
    pontos,
    descricao: c,
    update(t, dt) {
      for (let i = 0; i < c.n; i++) {
        const j = i * 3;
        if (c.modo === 'cair') {
          pos[j + 1] -= c.vel * dt * (0.7 + (i % 5) * 0.1);
          pos[j] += Math.sin(t * 1.3 + fase[i]) * 0.0015;
          pos[j + 2] += Math.cos(t * 1.1 + fase[i]) * 0.0015;
          if (pos[j + 1] < TOPO) pos[j + 1] = TOPO + 0.9;
        } else if (c.modo === 'subir') {
          pos[j + 1] += c.vel * dt * (0.6 + (i % 4) * 0.15);
          pos[j] += Math.sin(t * 0.9 + fase[i]) * 0.0008;
          if (pos[j + 1] > TOPO + 1.1) pos[j + 1] = TOPO + 0.02;
        } else {
          const a = t * c.vel * 3 + fase[i];
          const r = 0.2 + (i % 6) * 0.12;
          pos[j] = Math.cos(a + Math.sin(t * 2 + i)) * r;
          pos[j + 2] = Math.sin(a) * r;
          pos[j + 1] = TOPO + 0.08 + Math.abs(Math.sin(t * 6 + fase[i])) * 0.04 + (i % 3) * 0.05;
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
