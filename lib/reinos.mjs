// Shared helpers: kingdom naming, biomes, and the note format in the Obsidian vault.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COFRE = process.env.REINOS_COFRE || path.join(RAIZ, 'vault');
export const PASTA_REINOS = path.join(COFRE, 'Reinos');

export const BIOMAS = [
  'cristal-lunar',
  'cascatas-douradas',
  'prado-celeste',
  'aurora-de-gelo',
  'floresta-de-lanternas',
  'abismo-luminoso',
  'jardim-sakura',
];
export const GUARDIOES = ['dragão', 'pégaso', 'baleia celeste', 'raposa espiritual', 'fada', 'água-viva', 'fênix'];
export const COM_ARTIGO = {
  dragão: 'um dragão',
  pégaso: 'um pégaso',
  'baleia celeste': 'uma baleia celeste',
  'raposa espiritual': 'uma raposa espiritual',
  fada: 'uma fada',
  'água-viva': 'uma água-viva',
  fênix: 'uma fênix',
};
export const EPITETOS = {
  'cristal-lunar': 'das Torres de Cristal',
  'cascatas-douradas': 'das Cascatas Douradas',
  'prado-celeste': 'do Prado Celeste',
  'aurora-de-gelo': 'da Aurora de Gelo',
  'floresta-de-lanternas': 'das Mil Lanternas',
  'abismo-luminoso': 'do Abismo Luminoso',
  'jardim-sakura': 'das Pétalas Eternas',
};

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const INICIOS = [
  'Aure',
  'Vel',
  'Lumi',
  'Sera',
  'Thal',
  'Ery',
  'Mor',
  'Cael',
  'Ond',
  'Ili',
  'Nym',
  'Aster',
  'Ela',
  'Syl',
  'Vae',
  'Ora',
  'Mira',
  'Zeph',
  'Elo',
  'Rha',
];
const FINAIS = [
  'lith',
  'mora',
  'wyn',
  'dell',
  'aris',
  'ion',
  'heim',
  'vale',
  'thas',
  'rion',
  'enn',
  'ire',
  'sia',
  'dor',
  'lune',
  'quel',
];

export function nomeDoReino(sessao) {
  const h = hash(sessao);
  const a = INICIOS[h % INICIOS.length];
  let b = FINAIS[(h >>> 8) % FINAIS.length];
  if (/[aeiou]$/i.test(a) && /^[aeiou]/i.test(b)) b = b.slice(1);
  return a + b;
}
export const biomaDe = (projeto) => BIOMAS[hash(projeto || '?') % BIOMAS.length];
export const guardiaoDe = (sessao) => GUARDIOES[(hash(sessao) >>> 16) % GUARDIOES.length];

// --- Minimal frontmatter (the YAML subset Obsidian writes for properties) ---
function lerValor(v) {
  v = v.trim();
  if (v === '') return '';
  if (v.startsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === '[]') return [];
  if (v.startsWith('[') && v.endsWith(']'))
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => lerValor(s))
      .filter((s) => s !== '');
  return v;
}

export function lerNota(texto) {
  const dados = {};
  let corpo = texto;
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    corpo = texto.slice(m[0].length);
    let lista = null;
    for (const linha of m[1].split('\n')) {
      const item = linha.match(/^\s+-\s?(.*)$/);
      if (item && lista) {
        dados[lista].push(lerValor(item[1]));
        continue;
      }
      const kv = linha.match(/^([^:\s][^:]*):\s?(.*)$/);
      if (!kv) continue;
      const [, k, v] = kv;
      if (v.trim() === '') {
        dados[k] = [];
        lista = k;
      } else {
        dados[k] = lerValor(v);
        lista = null;
      }
    }
  }
  return { dados, corpo };
}

function escreverValor(v) {
  if (typeof v === 'number') return String(v);
  return JSON.stringify(String(v ?? ''));
}

export function escreverNota(dados, corpo) {
  const linhas = ['---'];
  for (const [k, v] of Object.entries(dados)) {
    if (Array.isArray(v)) {
      if (!v.length) {
        linhas.push(`${k}: []`);
        continue;
      }
      linhas.push(`${k}:`);
      for (const it of v) linhas.push(`  - ${escreverValor(it)}`);
    } else linhas.push(`${k}: ${escreverValor(v)}`);
  }
  linhas.push('---', '');
  return linhas.join('\n') + corpo;
}

export function lerReinos() {
  let arquivos = [];
  try {
    arquivos = fs.readdirSync(PASTA_REINOS).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  const reinos = [];
  for (const f of arquivos) {
    const arquivo = path.join(PASTA_REINOS, f);
    try {
      const { dados, corpo } = lerNota(fs.readFileSync(arquivo, 'utf8'));
      if (!dados.sessao) continue;
      reinos.push({ ...dados, nota: f.slice(0, -3), arquivo, corpo, mtime: fs.statSync(arquivo).mtimeMs });
    } catch {}
  }
  return reinos;
}

export const nomeDoLink = (s) =>
  String(s)
    .replace(/^\[\[|\]\]$/g, '')
    .split('|')[0];
