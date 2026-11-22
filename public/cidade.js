// The city on top of each kingdom: every building mirrors something the session actually did.
import * as THREE from 'three';

const TOPO = 0.07; // island top surface height

export const OFICIOS = [
  {
    tipo: 'escriba',
    teste: /^(Edit|Write|MultiEdit|NotebookEdit)$/,
    nome: 'Ateliê dos Escribas',
    desc: 'escreve e edita arquivos',
  },
  { tipo: 'forja', teste: /^Bash$/, nome: 'Forja', desc: 'roda comandos no terminal' },
  { tipo: 'biblioteca', teste: /^(Read|Grep|Glob|LS)$/, nome: 'Grande Biblioteca', desc: 'lê e procura nos arquivos' },
  { tipo: 'observatorio', teste: /^(WebFetch|WebSearch)$/, nome: 'Observatório', desc: 'consulta a web' },
  { tipo: 'porto', teste: /^(Task|Agent)$/, nome: 'Porto dos Emissários', desc: 'envia subagentes em missão' },
  { tipo: 'portal', teste: /^MCP$/, nome: 'Portal Arcano', desc: 'usa conectores MCP' },
  {
    tipo: 'relogio',
    teste: /^(TodoWrite|Task(Create|Update|List|Get))$/,
    nome: 'Torre do Relógio',
    desc: 'organiza a lista de tarefas',
  },
  { tipo: 'guilda', teste: /.*/, nome: 'Guilda dos Ofícios', desc: 'outras ferramentas' },
];

export function lerOficios(r) {
  const contagem = new Map(),
    ferramentas = new Map();
  for (const o of r.oficios || []) {
    const [nome, n] = String(o).split(':');
    const of = OFICIOS.find((x) => x.teste.test(nome));
    contagem.set(of.tipo, (contagem.get(of.tipo) || 0) + (Number(n) || 0));
    (ferramentas.get(of.tipo) || ferramentas.set(of.tipo, []).get(of.tipo)).push(`${nome} ×${n}`);
  }
  return OFICIOS.filter((o) => contagem.get(o.tipo)).map((o) => ({
    ...o,
    n: contagem.get(o.tipo),
    ferramentas: ferramentas.get(o.tipo),
  }));
}

export const nCasas = (r) => Math.max(4, Math.min(72, Math.ceil((Number(r.acoes) || 0) / 3)));
export const nHabitantes = (st) => ({ trabalhando: 26, chamando: 20, repousando: 9, adormecido: 0 })[st] ?? 9;
export const assinaturaCidade = (r) =>
  [
    nCasas(r),
    (r.oficios || [])
      .map((o) => String(o).split(':')[0])
      .sort()
      .join(','),
    Math.min(25, r.nArquivos || 0),
    (r.cronica || []).length,
    !!r.pedido,
  ].join('|');

const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, flatShading: true, ...o });
const brilho = (cor, f = 1.5, o = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: f, roughness: 0.5, ...o });
function m(geo, material, pos, rot, esc) {
  const x = new THREE.Mesh(geo, material);
  if (pos) x.position.set(...pos);
  if (rot) x.rotation.set(...rot);
  if (esc) x.scale.set(...esc);
  return x;
}
const caixa = (w, h, d, material, pos) => m(new THREE.BoxGeometry(w, h, d), material, pos);
const cil = (rt, rb, h, material, pos, seg = 12) => m(new THREE.CylinderGeometry(rt, rb, h, seg), material, pos);
const telhado = (r, h, material, pos, lados = 4) =>
  m(new THREE.ConeGeometry(r, h, lados), material, pos, [0, Math.PI / lados, 0]);

function textoTex(texto) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#f3e3bf';
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#5a3d1e';
  g.font = 'italic 30px Georgia, serif';
  g.textAlign = 'center';
  const palavras = String(texto).split(' ');
  let linha = '',
    y = 52;
  for (const p of palavras) {
    if (g.measureText(linha + p).width > 470) {
      g.fillText(linha, 256, y);
      linha = '';
      y += 38;
      if (y > 140) break;
    }
    linha += p + ' ';
  }
  if (y <= 140) g.fillText(linha, 256, y);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function construirCidade(r, b, semente, tex) {
  let s = semente >>> 0;
  const R = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const grupo = new THREE.Group();
  const animar = [];
  const locais = [];
  const janelas = [];

  const pedra = mat('#cbbfae'),
    pedraEscura = mat('#8f8476');
  const muro = mat(b.muro),
    teto = mat(b.teto),
    madeira = mat('#7a5638');
  const luzJanela = brilho(b.janela, 1.2);
  janelas.push(luzJanela);

  const oficios = lerOficios(r);
  const sitios = [{ tipo: 'praca' }, ...oficios];
  const angulo0 = R() * Math.PI * 2;
  sitios.forEach((x, i) => {
    x.ang = angulo0 + (i / sitios.length) * Math.PI * 2;
    x.raio = x.tipo === 'praca' ? 0.68 : x.tipo === 'porto' ? 0.86 : 0.76;
  });
  const ruas = [0, 1, 2, 3].map((i) => angulo0 + Math.PI / 4 + (i * Math.PI) / 2);
  const pos = (ang, raio, y = TOPO) => [Math.cos(ang) * raio, y, Math.sin(ang) * raio];
  const virarParaCentro = (obj, ang) => {
    obj.rotation.y = -ang - Math.PI / 2;
  };

  // --- streets: ring road, radial avenues, outer wall with turrets ---
  const anel = m(
    new THREE.RingGeometry(0.49, 0.545, 64),
    mat('#b9ab95', { side: THREE.DoubleSide }),
    [0, TOPO + 0.002, 0],
    [-Math.PI / 2, 0, 0],
  );
  grupo.add(anel);
  for (const a of ruas) {
    const rua = m(
      new THREE.PlaneGeometry(0.045, 0.42),
      mat('#b9ab95', { side: THREE.DoubleSide }),
      pos(a, 0.75, TOPO + 0.002),
      [-Math.PI / 2, 0, -a + Math.PI / 2],
    );
    grupo.add(rua);
    for (let k = 0; k < 4; k++) {
      // street lamps
      const p = pos(a + 0.05, 0.58 + k * 0.1, TOPO);
      grupo.add(cil(0.003, 0.004, 0.05, pedraEscura, [p[0], TOPO + 0.025, p[2]], 5));
      grupo.add(m(new THREE.SphereGeometry(0.008, 6, 4), luzJanela, [p[0], TOPO + 0.055, p[2]]));
    }
  }
  const muralha = m(
    new THREE.CylinderGeometry(0.965, 0.965, 0.05, 72, 1, true),
    mat(b.muro, { side: THREE.DoubleSide }),
    [0, TOPO + 0.025, 0],
  );
  grupo.add(muralha);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.1;
    grupo.add(cil(0.028, 0.03, 0.09, muro, pos(a, 0.965, TOPO + 0.045), 8));
    grupo.add(telhado(0.036, 0.05, teto, pos(a, 0.965, TOPO + 0.115), 8));
  }

  // --- houses: one for every 3 actions of the session (instanced) ---
  const ocupado = (ang, raio) => {
    for (const x of sitios) {
      const d = Math.abs(Math.atan2(Math.sin(ang - x.ang), Math.cos(ang - x.ang)));
      if (d < (x.tipo === 'praca' ? 0.36 : 0.3) && raio > 0.6) return true;
    }
    for (const a of ruas) {
      const d = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a)));
      if (d * raio < 0.035) return true;
    }
    return false;
  };
  const vagas = [];
  for (const raio of [0.6, 0.7, 0.8, 0.89]) {
    const n = Math.floor((Math.PI * 2 * raio) / 0.085);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + raio * 3;
      if (!ocupado(ang, raio)) vagas.push({ ang, raio, ord: raio + R() * 0.15 });
    }
  }
  vagas.sort((x, y) => x.ord - y.ord);
  const totalCasas = Math.min(nCasas(r), vagas.length);
  const casaGeo = new THREE.BoxGeometry(1, 1, 1);
  casaGeo.translate(0, 0.5, 0);
  const tetoGeo = new THREE.ConeGeometry(0.78, 0.7, 4);
  tetoGeo.rotateY(Math.PI / 4);
  tetoGeo.translate(0, 0.35, 0);
  const janelaGeo = new THREE.PlaneGeometry(1, 1);
  const paredes = new THREE.InstancedMesh(casaGeo, mat('#ffffff'), totalCasas);
  const telhados = new THREE.InstancedMesh(tetoGeo, mat('#ffffff'), totalCasas);
  const vidros = new THREE.InstancedMesh(janelaGeo, luzJanela, totalCasas * 2);
  const coresParede = [b.muro, '#f1e4cf', '#e8d8c8', '#f6efe6'].map((c) => new THREE.Color(c));
  const coresTeto = [b.teto, '#b0563f', '#6a5a8f', '#4f6f5a'].map((c) => new THREE.Color(c));
  const o = new THREE.Object3D();
  for (let i = 0; i < totalCasas; i++) {
    const v = vagas[i];
    const w = 0.045 + R() * 0.025,
      h = 0.04 + R() * 0.035,
      d = 0.04 + R() * 0.02;
    o.position.set(...pos(v.ang, v.raio));
    o.rotation.set(0, -v.ang + Math.PI / 2, 0);
    o.scale.set(w, h, d);
    o.updateMatrix();
    paredes.setMatrixAt(i, o.matrix);
    paredes.setColorAt(i, coresParede[Math.floor(R() * coresParede.length)]);
    o.position.y = TOPO + h;
    o.scale.set(w, w * 0.9, d);
    o.updateMatrix();
    telhados.setMatrixAt(i, o.matrix);
    telhados.setColorAt(i, coresTeto[Math.floor(R() * coresTeto.length)]);
    for (let k = 0; k < 2; k++) {
      const lado = k ? 1 : -1;
      o.position.set(...pos(v.ang, v.raio - d / 2 - 0.0005));
      o.position.y = TOPO + h * 0.55;
      o.position.x += Math.cos(v.ang + Math.PI / 2) * lado * w * 0.22;
      o.position.z += Math.sin(v.ang + Math.PI / 2) * lado * w * 0.22;
      o.rotation.set(0, -v.ang - Math.PI / 2, 0);
      o.scale.set(w * 0.18, h * 0.3, 1);
      o.updateMatrix();
      vidros.setMatrixAt(i * 2 + k, o.matrix);
    }
  }
  grupo.add(paredes, telhados, vidros);
  // chimneys and small gardens between houses
  for (let i = 0; i < totalCasas; i += 3) {
    const v = vagas[i];
    grupo.add(caixa(0.01, 0.03, 0.01, pedraEscura, pos(v.ang + 0.02, v.raio + 0.01, TOPO + 0.08)));
  }
  const arvore = mat(b.arvore);
  for (let i = totalCasas; i < Math.min(vagas.length, totalCasas + 14); i++) {
    const v = vagas[i];
    grupo.add(cil(0.004, 0.006, 0.03, madeira, pos(v.ang, v.raio, TOPO + 0.015), 5));
    grupo.add(m(new THREE.IcosahedronGeometry(0.028, 0), arvore, pos(v.ang, v.raio, TOPO + 0.05)));
  }
  locais.push({
    nome: `${totalCasas} casas`,
    detalhe: 'uma para cada 3 ações',
    pos: new THREE.Vector3(...pos(vagas[0]?.ang || 0, 0.89, TOPO + 0.12)),
    resumo: true,
  });

  // --- banners on the castle walls: one per entry in the chronicle ---
  const bandeiras = [];
  const nBand = Math.min(6, (r.cronica || []).length);
  for (let i = 0; i < nBand; i++) {
    const a = (i / Math.max(nBand, 1)) * Math.PI * 2 + 0.3,
      p = pos(a, 0.46, TOPO);
    grupo.add(cil(0.003, 0.003, 0.22, mat('#d9b46a', { metalness: 0.6 }), [p[0], TOPO + 0.2, p[2]], 5));
    const pano = m(new THREE.PlaneGeometry(0.07, 0.05, 6, 1), brilho(b.acento, 0.5, { side: THREE.DoubleSide }), [
      p[0],
      TOPO + 0.28,
      p[2],
    ]);
    pano.geometry.translate(0.035, 0, 0);
    grupo.add(pano);
    bandeiras.push({ pano, base: pano.geometry.attributes.position.array.slice(), i });
  }

  // --- the plaza: fountain, and the current request floating as a scroll ---
  const praca = sitios[0];
  const pp = pos(praca.ang, praca.raio);
  grupo.add(m(new THREE.CylinderGeometry(0.14, 0.14, 0.006, 32), pedra, [pp[0], TOPO + 0.003, pp[2]]));
  grupo.add(
    m(new THREE.TorusGeometry(0.05, 0.008, 6, 24), pedraEscura, [pp[0], TOPO + 0.012, pp[2]], [Math.PI / 2, 0, 0]),
  );
  grupo.add(cil(0.008, 0.012, 0.06, pedra, [pp[0], TOPO + 0.03, pp[2]], 8));
  const agua = m(
    new THREE.CylinderGeometry(0.045, 0.045, 0.004, 24),
    brilho(b.agua, 0.6, { transparent: true, opacity: 0.8 }),
    [pp[0], TOPO + 0.012, pp[2]],
  );
  grupo.add(agua);
  const jatos = [];
  for (let i = 0; i < 6; i++) {
    const j = m(new THREE.SphereGeometry(0.006, 6, 4), brilho(b.agua, 1.2), [pp[0], TOPO + 0.06, pp[2]]);
    grupo.add(j);
    jatos.push(j);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    grupo.add(
      cil(0.004, 0.005, 0.03, pedraEscura, [pp[0] + Math.cos(a) * 0.12, TOPO + 0.015, pp[2] + Math.sin(a) * 0.12], 5),
    );
  } // benches/posts
  let pergaminho = null;
  if (r.pedido) {
    pergaminho = new THREE.Group();
    pergaminho.position.set(pp[0], TOPO + 0.24, pp[2]);
    const folha = m(
      new THREE.PlaneGeometry(0.22, 0.07),
      new THREE.MeshStandardMaterial({
        map: textoTex(r.pedido),
        emissive: '#ffe6b0',
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    pergaminho.add(folha);
    for (const l of [-1, 1])
      pergaminho.add(
        m(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), mat('#c9a35a', { metalness: 0.5 }), [l * 0.112, 0, 0]),
      );
    pergaminho.add(
      m(
        new THREE.SphereGeometry(0.03, 8, 6),
        brilho('#ffe6b0', 0.6, { transparent: true, opacity: 0.25 }),
        [0, 0, 0],
        null,
        [4, 1.6, 0.3],
      ),
    );
    grupo.add(pergaminho);
  }
  locais.push({
    nome: 'Praça do pedido',
    detalhe: r.pedido ? 'o pergaminho guarda o seu último pedido' : 'sem pedido ainda',
    pos: new THREE.Vector3(pp[0], TOPO + 0.34, pp[2]),
  });

  // --- guild buildings: one for each kind of tool the session used ---
  const fumacas = [];
  for (const sitio of sitios.slice(1)) {
    const g = new THREE.Group();
    const [x, , z] = pos(sitio.ang, sitio.raio);
    g.position.set(x, TOPO, z);
    virarParaCentro(g, sitio.ang);
    const esc = 1 + Math.min(0.6, Math.log10(1 + sitio.n) * 0.25);
    g.scale.setScalar(esc);
    grupo.add(g);
    let alturaRotulo = 0.25;
    if (sitio.tipo !== 'porto') {
      // common hall
      g.add(caixa(0.13, 0.08, 0.1, muro, [0, 0.04, 0]));
      g.add(telhado(0.1, 0.07, teto, [0, 0.115, 0]));
      g.add(caixa(0.025, 0.04, 0.002, luzJanela, [0, 0.02, 0.051]));
    }
    if (sitio.tipo === 'escriba') {
      const pena = new THREE.Group();
      pena.position.set(0, 0.24, 0);
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(0.04, 0.08, 0.01, 0.2);
      s.quadraticCurveTo(-0.02, 0.1, 0, 0);
      pena.add(m(new THREE.ShapeGeometry(s, 8), brilho('#fff6e0', 0.8, { side: THREE.DoubleSide })));
      pena.add(
        m(new THREE.ConeGeometry(0.006, 0.04, 5), mat('#d9b46a', { metalness: 0.7 }), [0, -0.02, 0], [Math.PI, 0, 0]),
      );
      pena.rotation.z = 0.4;
      g.add(pena);
      g.add(cil(0.015, 0.02, 0.025, mat('#20203a'), [0.05, 0.0125, 0.06], 8)); // inkwell
      animar.push((t) => {
        pena.rotation.y = t * 0.8;
        pena.position.y = 0.24 + Math.sin(t * 2) * 0.01;
      });
      alturaRotulo = 0.48;
    } else if (sitio.tipo === 'forja') {
      g.add(cil(0.015, 0.018, 0.12, pedraEscura, [0.04, 0.14, -0.02], 8));
      const bigorna = caixa(0.03, 0.015, 0.015, brilho('#ff7a2a', 2.2), [-0.03, 0.01, 0.07]);
      g.add(bigorna);
      const luz = new THREE.PointLight('#ff7a2a', 0.6, 0.6, 2);
      luz.position.set(-0.03, 0.05, 0.08);
      g.add(luz);
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex.brilho,
            color: '#d8d0e0',
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        f.position.set(0.04, 0.2, -0.02);
        g.add(f);
        fumacas.push({ f, fase: i / 6 });
      }
      animar.push((t, e) => {
        bigorna.material.emissiveIntensity = 1.2 + Math.abs(Math.sin(t * 6)) * 2 * e;
        luz.intensity = 0.3 + Math.abs(Math.sin(t * 6)) * 0.8 * e;
      });
      alturaRotulo = 0.38;
    } else if (sitio.tipo === 'biblioteca') {
      g.add(
        m(
          new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          mat('#9fb8d9', { metalness: 0.3 }),
          [0, 0.08, 0],
        ),
      );
      const livros = new THREE.Group();
      livros.position.y = 0.16;
      g.add(livros);
      const nLivros = Math.max(3, Math.min(25, r.nArquivos || 0));
      const capas = ['#b0563f', '#3f5fa0', '#4f8a5a', '#8a5aa0', '#c9a35a'].map((c) => brilho(c, 0.25));
      for (let i = 0; i < nLivros; i++) {
        const a = (i / nLivros) * Math.PI * 2,
          rr = 0.09 + (i % 3) * 0.02;
        const l = caixa(0.018, 0.025, 0.006, capas[i % capas.length], [
          Math.cos(a) * rr,
          (i % 4) * 0.015,
          Math.sin(a) * rr,
        ]);
        l.rotation.y = -a;
        livros.add(l);
      }
      animar.push((t) => {
        livros.rotation.y = t * 0.3;
      });
      sitio.extra = `${r.nArquivos || 0} livros: os arquivos tocados`;
      alturaRotulo = 0.3;
    } else if (sitio.tipo === 'observatorio') {
      g.add(cil(0.04, 0.045, 0.16, muro, [0.03, 0.08, -0.02], 12));
      const cupula = new THREE.Group();
      cupula.position.set(0.03, 0.16, -0.02);
      g.add(cupula);
      cupula.add(
        m(new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#5a6fa8', { metalness: 0.4 })),
      );
      cupula.add(
        m(
          new THREE.CylinderGeometry(0.008, 0.012, 0.09, 8),
          mat('#d9b46a', { metalness: 0.7 }),
          [0, 0.04, 0.03],
          [0.8, 0, 0],
        ),
      );
      animar.push((t) => {
        cupula.rotation.y = Math.sin(t * 0.3) * 1.5;
      });
      alturaRotulo = 0.34;
    } else if (sitio.tipo === 'porto') {
      g.add(caixa(0.06, 0.01, 0.34, madeira, [0, 0.005, -0.12]));
      for (let k = 0; k < 4; k++)
        for (const l of [-1, 1]) g.add(cil(0.004, 0.004, 0.06, madeira, [l * 0.035, -0.02, -0.26 + k * 0.09], 5));
      g.add(caixa(0.07, 0.06, 0.06, muro, [0, 0.03, 0.06]));
      g.add(telhado(0.06, 0.05, teto, [0, 0.085, 0.06]));
      const navios = [];
      const nNav = Math.max(1, Math.min(5, Number(r.emissarios) || 0) + 1);
      for (let i = 0; i < nNav; i++) {
        const n = new THREE.Group();
        n.add(
          m(
            new THREE.SphereGeometry(0.035, 12, 8),
            mat(i % 2 ? '#e6c9a8' : b.acento),
            [0, 0.05, 0],
            null,
            [0.8, 0.8, 1.6],
          ),
        );
        n.add(caixa(0.025, 0.015, 0.04, madeira, [0, 0.005, 0]));
        n.add(m(new THREE.SphereGeometry(0.004, 6, 4), luzJanela, [0, 0.005, 0.022]));
        g.add(n);
        navios.push(n);
      }
      animar.push((t) =>
        navios.forEach((n, i) => {
          if (i === 0) {
            n.position.set(0.05, 0.03 + Math.sin(t * 2) * 0.004, -0.25);
            return;
          }
          const a = t * 0.25 + i * 1.7;
          n.position.set(Math.sin(a) * 0.35, 0.18 + Math.sin(a * 2) * 0.04, -0.55 + Math.cos(a) * 0.25);
          n.rotation.y = a + Math.PI / 2;
        }),
      );
      sitio.extra = `${Number(r.emissarios) || 0} dirigível(is) em missão agora`;
      alturaRotulo = 0.22;
    } else if (sitio.tipo === 'portal') {
      const arco = m(new THREE.TorusGeometry(0.07, 0.012, 8, 32), brilho('#b98bff', 1.8), [0, 0.1, 0.06]);
      const espiral = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex.brilho,
          color: '#9fe1ff',
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      espiral.position.set(0, 0.1, 0.06);
      espiral.scale.setScalar(0.13);
      g.add(arco, espiral);
      for (const l of [-1, 1]) g.add(caixa(0.02, 0.03, 0.02, pedra, [l * 0.075, 0.015, 0.06]));
      animar.push((t) => {
        espiral.material.rotation = t * 2;
        espiral.scale.setScalar(0.12 + Math.sin(t * 3) * 0.015);
        arco.rotation.z = t * 0.5;
      });
      alturaRotulo = 0.3;
    } else if (sitio.tipo === 'relogio') {
      g.add(caixa(0.05, 0.22, 0.05, muro, [0.05, 0.11, 0]));
      g.add(telhado(0.045, 0.08, teto, [0.05, 0.26, 0]));
      const mostrador = m(new THREE.CircleGeometry(0.02, 20), brilho('#fff6e0', 0.9), [0.05, 0.18, 0.026]);
      const horas = caixa(0.003, 0.012, 0.002, mat('#20203a'), [0.05, 0.18, 0.028]);
      horas.geometry.translate(0, 0.006, 0);
      const minutos = caixa(0.002, 0.017, 0.002, mat('#20203a'), [0.05, 0.18, 0.029]);
      minutos.geometry.translate(0, 0.0085, 0);
      g.add(mostrador, horas, minutos);
      animar.push(() => {
        const d = new Date();
        minutos.rotation.z = -(d.getMinutes() / 60) * Math.PI * 2;
        horas.rotation.z = -((d.getHours() % 12) / 12 + d.getMinutes() / 720) * Math.PI * 2;
      });
      alturaRotulo = 0.36;
    } else {
      const pano = m(
        new THREE.PlaneGeometry(0.05, 0.07),
        brilho(b.acento, 0.5, { side: THREE.DoubleSide }),
        [0.07, 0.12, 0],
      );
      g.add(cil(0.003, 0.003, 0.2, madeira, [0.07, 0.1, -0.02], 5), pano);
      animar.push((t) => {
        pano.rotation.y = Math.sin(t * 2) * 0.3;
      });
    }
    const local = new THREE.Vector3(0, alturaRotulo, 0);
    g.updateMatrix();
    local.applyMatrix4(g.matrix);
    locais.push({
      nome: sitio.nome,
      detalhe: sitio.extra || `${sitio.desc} · ${sitio.n}×`,
      pos: local,
      tipo: sitio.tipo,
    });
  }

  // --- citizens walking the streets, each carrying a little lantern ---
  const N = 28;
  const corpoGeo = new THREE.CylinderGeometry(0.006, 0.009, 0.022, 6);
  corpoGeo.translate(0, 0.011, 0);
  const cabecaGeo = new THREE.SphereGeometry(0.0065, 6, 5);
  const povo = new THREE.InstancedMesh(corpoGeo, mat('#ffffff'), N);
  const cabecas = new THREE.InstancedMesh(cabecaGeo, mat('#ffe0c8'), N);
  const lanternas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.004, 5, 4), luzJanela, N);
  const roupas = ['#6a5a8f', '#b0563f', '#3f6fa0', '#4f8a5a', '#c9a35a', b.acento].map((c) => new THREE.Color(c));
  const habitantes = Array.from({ length: N }, (_, i) => {
    povo.setColorAt(i, roupas[i % roupas.length]);
    return {
      raio: [0.52, 0.515, 0.53, 0.65, 0.75, 0.85][i % 6],
      ang: R() * Math.PI * 2,
      vel: (0.08 + R() * 0.12) * (R() > 0.5 ? 1 : -1),
      rua: ruas[i % 4],
      fase: R() * 6,
    };
  });
  grupo.add(povo, cabecas, lanternas);

  return {
    grupo,
    locais,
    oficios,
    update(t, estado) {
      const e = estado.luz;
      for (const j of janelas) j.emissiveIntensity = 0.15 + e * 1.4;
      for (const f of animar) f(t, e);
      // citizens
      const quantos = nHabitantes(estado.status);
      const reunir = estado.status === 'chamando';
      for (let i = 0; i < N; i++) {
        const h = habitantes[i];
        if (i >= quantos) {
          o.position.set(0, -10, 0);
          o.scale.setScalar(0.0001);
        } else {
          let x, z;
          if (reunir) {
            const a = (i / quantos) * Math.PI * 2 + t * 0.1;
            x = pp[0] + Math.cos(a) * (0.08 + (i % 3) * 0.012);
            z = pp[2] + Math.sin(a) * (0.08 + (i % 3) * 0.012);
          } else if (h.raio > 0.6) {
            const u = Math.sin(t * h.vel * 3 + h.fase) * 0.5 + 0.5;
            const rr = 0.56 + u * 0.36;
            x = Math.cos(h.rua + 0.02) * rr;
            z = Math.sin(h.rua + 0.02) * rr;
          } else {
            h.ang += h.vel * 0.016 * (0.5 + e);
            x = Math.cos(h.ang) * h.raio;
            z = Math.sin(h.ang) * h.raio;
          }
          o.position.set(x, TOPO + Math.abs(Math.sin(t * 8 + h.fase)) * 0.004, z);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(1);
        }
        o.updateMatrix();
        povo.setMatrixAt(i, o.matrix);
        o.position.y += 0.028;
        o.updateMatrix();
        cabecas.setMatrixAt(i, o.matrix);
        o.position.x += 0.008;
        o.position.y -= 0.012;
        o.updateMatrix();
        lanternas.setMatrixAt(i, o.matrix);
      }
      povo.instanceMatrix.needsUpdate =
        cabecas.instanceMatrix.needsUpdate =
        lanternas.instanceMatrix.needsUpdate =
          true;
      // fountain, banners, smoke, scroll
      jatos.forEach((j, i) => {
        const f = (t * 0.8 + i / 6) % 1,
          a = (i / 6) * Math.PI * 2;
        j.position.set(
          pp[0] + Math.cos(a) * f * 0.04,
          TOPO + 0.06 + Math.sin(f * Math.PI) * 0.03 - f * 0.04,
          pp[2] + Math.sin(a) * f * 0.04,
        );
        j.visible = e > 0.2;
      });
      for (const bd of bandeiras) {
        const arr = bd.pano.geometry.attributes.position.array;
        for (let k = 0; k < arr.length; k += 3)
          arr[k + 2] = bd.base[k + 2] + Math.sin(t * 4 + bd.base[k] * 60 + bd.i) * 0.006 * (bd.base[k] / 0.07);
        bd.pano.geometry.attributes.position.needsUpdate = true;
      }
      for (const fu of fumacas) {
        const f = (t * 0.25 + fu.fase) % 1;
        fu.f.position.set(0.04 + Math.sin(f * 5) * 0.02, 0.2 + f * 0.3, -0.02);
        fu.f.scale.setScalar(0.04 + f * 0.12);
        fu.f.material.opacity = (1 - f) * 0.5 * (0.3 + e);
      }
      if (pergaminho) {
        pergaminho.position.y = TOPO + 0.24 + Math.sin(t * 1.5) * 0.015;
        pergaminho.rotation.y = t * 0.35;
      }
    },
  };
}
