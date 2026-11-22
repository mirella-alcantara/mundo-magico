#!/usr/bin/env node
// Claude Code hook: each session is a magical kingdom, recorded as a note in the Obsidian vault.
// Never blocks Claude: any error is swallowed and the script always exits 0.
import fs from 'node:fs';
import path from 'node:path';
import {
  PASTA_REINOS, nomeDoReino, biomaDe, guardiaoDe, EPITETOS, COM_ARTIGO, lerNota, escreverNota, nomeDoLink,
} from '../lib/reinos.mjs';

const agora = () => new Date().toISOString();
const MAX_CRONICA = 40;
const JANELA_VIZINHOS_MS = 6 * 3600e3;

function lerEntrada() {
  return new Promise((ok) => {
    let txt = '';
    const fim = setTimeout(() => ok(txt), 1500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => (txt += d));
    process.stdin.on('end', () => { clearTimeout(fim); ok(txt); });
  });
}

function trancar(alvo) {
  const lock = alvo + '.lock';
  for (let i = 0; i < 40; i++) {
    try { fs.mkdirSync(lock); return () => fs.rmSync(lock, { recursive: true, force: true }); } catch {
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 4000) fs.rmSync(lock, { recursive: true, force: true }); } catch {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  return () => {};
}

function arquivoDaSessao(sessao) {
  const base = nomeDoReino(sessao);
  const principal = path.join(PASTA_REINOS, base + '.md');
  try {
    const { dados } = lerNota(fs.readFileSync(principal, 'utf8'));
    if (dados.sessao && dados.sessao !== sessao) return path.join(PASTA_REINOS, `${base} ${sessao.slice(0, 4)}.md`);
  } catch {}
  return principal;
}

const resumir = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function vizinhos(eu, nomeProprio) {
  const achados = new Set();
  let arquivos = [];
  try { arquivos = fs.readdirSync(PASTA_REINOS).filter((f) => f.endsWith('.md')); } catch { return achados; }
  const meus = new Set(eu.tocou || []);
  for (const f of arquivos) {
    const nome = f.slice(0, -3);
    if (nome === nomeProprio) continue;
    const arq = path.join(PASTA_REINOS, f);
    try {
      if (Date.now() - fs.statSync(arq).mtimeMs > JANELA_VIZINHOS_MS) continue;
      const { dados } = lerNota(fs.readFileSync(arq, 'utf8'));
      if (dados.status === 'adormecido') continue;
      const mesmaPasta = dados.pasta && dados.pasta === eu.pasta;
      const mesmoArquivo = (dados.tocou || []).some((t) => meus.has(t));
      if (mesmaPasta || mesmoArquivo) achados.add(nome);
    } catch {}
  }
  return achados;
}

async function main() {
  const bruto = await lerEntrada();
  if (!bruto) return;
  const e = JSON.parse(bruto);
  const sessao = e.session_id;
  if (!sessao) return;
  fs.mkdirSync(PASTA_REINOS, { recursive: true });

  const arquivo = arquivoDaSessao(sessao);
  const nomeNota = path.basename(arquivo, '.md');
  const soltar = trancar(arquivo);
  try {
    let dados = {}, corpo = '';
    try { ({ dados, corpo } = lerNota(fs.readFileSync(arquivo, 'utf8'))); } catch {}

    const projeto = path.basename(e.cwd || dados.pasta || '') || 'sem projeto';
    const bioma = dados.bioma || biomaDe(projeto);
    const nome = dados.reino || nomeDoReino(sessao);
    const d = {
      reino: nome,
      sessao,
      projeto: dados.projeto || projeto,
      pasta: dados.pasta || e.cwd || '',
      bioma,
      guardiao: dados.guardiao || guardiaoDe(sessao),
      status: dados.status || 'repousando',
      desde: dados.desde || agora(),
      inicio: dados.inicio || agora(),
      atualizado: agora(),
      acoes: Number(dados.acoes) || 0,
      ferramenta: dados.ferramenta || '',
      emissarios: Number(dados.emissarios) || 0,
      pedido: dados.pedido || '',
      chamado: dados.chamado || '',
      conexoes: Array.isArray(dados.conexoes) ? dados.conexoes : [],
      tocou: Array.isArray(dados.tocou) ? dados.tocou : [],
      oficios: Array.isArray(dados.oficios) ? dados.oficios : [],
      tags: ['reino'],
    };
    const cronica = [];
    const statusAntes = d.status;
    let procurarVizinhos = !corpo;

    switch (e.hook_event_name) {
      case 'SessionStart':
        if (d.status === 'adormecido' || !corpo) d.status = 'repousando';
        cronica.push(e.source === 'resume' ? 'O reino despertou de novo' : 'O reino surgiu entre as nuvens');
        break;
      case 'UserPromptSubmit':
        d.status = 'trabalhando';
        d.pedido = resumir(e.prompt, 180);
        d.chamado = '';
        cronica.push(`Novo pedido: “${resumir(e.prompt, 90)}”`);
        procurarVizinhos = true;
        break;
      case 'PreToolUse': {
        d.status = 'trabalhando';
        d.chamado = '';
        d.ferramenta = e.tool_name || '';
        d.acoes += 1;
        {
          const nomeOficio = /^mcp__/.test(e.tool_name || '') ? 'MCP' : (e.tool_name || 'Outra');
          const mapa = new Map(d.oficios.map((o) => { const [k, n] = String(o).split(':'); return [k, Number(n) || 0]; }));
          mapa.set(nomeOficio, (mapa.get(nomeOficio) || 0) + 1);
          d.oficios = [...mapa].sort((x, y) => y[1] - x[1]).slice(0, 14).map(([k, n]) => `${k}:${n}`);
        }
        const ti = e.tool_input || {};
        if (/^(Task|Agent)$/.test(e.tool_name)) {
          d.emissarios += 1;
          cronica.push(`Enviou um emissário: ${resumir(ti.description || ti.subagent_type || 'missão', 80)}`);
        }
        const f = ti.file_path || ti.notebook_path;
        if (f) {
          d.tocou = [f, ...d.tocou.filter((t) => t !== f)].slice(0, 25);
          procurarVizinhos = true;
        }
        break;
      }
      case 'PostToolUse':
        if (/^(Task|Agent)$/.test(e.tool_name)) d.emissarios = Math.max(0, d.emissarios - 1);
        break;
      case 'Notification': {
        const msg = resumir(e.message, 160);
        if (/waiting for your input/i.test(msg)) break;
        d.status = 'chamando';
        d.chamado = msg;
        break;
      }
      case 'Stop':
        d.status = 'repousando';
        d.ferramenta = '';
        d.emissarios = 0;
        break;
      case 'SessionEnd':
        d.status = 'adormecido';
        d.ferramenta = '';
        d.emissarios = 0;
        break;
      default:
        break;
    }

    if (d.status !== statusAntes || !corpo) {
      d.desde = agora();
      const frases = {
        trabalhando: 'As torres se acenderam',
        chamando: `Acendeu o farol: ${d.chamado || 'precisa de você'}`,
        repousando: 'O reino repousa, à espera do próximo pedido',
        adormecido: 'O reino adormeceu sob as nuvens',
      };
      if (statusAntes !== d.status || !corpo) cronica.push(frases[d.status]);
    }

    if (procurarVizinhos) {
      const atuais = new Set(d.conexoes.map(nomeDoLink));
      for (const v of vizinhos(d, nomeNota)) {
        if (!atuais.has(v)) {
          d.conexoes.push(`[[${v}]]`);
          cronica.push(`Uma ponte de luz surgiu até [[${v}]]`);
        }
      }
    }

    // Body: title + chronicle (newest last), kept readable in Obsidian.
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dia = new Date().toLocaleDateString('pt-BR');
    let linhas = [];
    const m = corpo.match(/## Crônica\n([\s\S]*)$/);
    if (m) linhas = m[1].split('\n').filter((l) => l.startsWith('- '));
    for (const c of cronica) linhas.push(`- ${dia} ${hora} · ${c}`);
    linhas = linhas.slice(-MAX_CRONICA);
    const novoCorpo = `# Reino de ${nome}\n\n*${EPITETOS[bioma] ? `O reino ${EPITETOS[bioma]}` : 'Um reino'}, guardado por ${COM_ARTIGO[d.guardiao] || d.guardiao}, nascido do projeto \`${d.projeto}\`.*\n\n## Crônica\n${linhas.join('\n')}\n`;

    const tmp = arquivo + '.tmp';
    fs.writeFileSync(tmp, escreverNota(d, novoCorpo));
    fs.renameSync(tmp, arquivo);
  } finally {
    soltar();
  }
}

main().catch(() => {}).finally(() => process.exit(0));
