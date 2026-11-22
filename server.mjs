// Local server: reads the kingdoms from the Obsidian vault and streams them live to the page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PASTA_REINOS, COFRE, lerReinos, nomeDoLink } from './lib/reinos.mjs';

// ---------- configuration ----------
const PORTA = Number(process.env.PORT) || 4747;
const HOST = '127.0.0.1';
const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const MIN = 60e3;
const ADORMECE_APOS_MS = 3 * 60 * MIN; // no activity for 3h → the kingdom falls asleep
const REPOUSA_APOS_MS = 15 * MIN; // "working" with no update for 15min → resting
const ADORMECIDOS_JANELA_MS = 24 * 60 * MIN; // sleeping kingdoms stay visible for 24h
const MAX_ADORMECIDOS = 10;
const MAX_CRONICA = 6;
const MAX_ARQUIVOS_PONTE = 5;
const MAX_ARQUIVOS_RECENTES = 4;

const ESPERA_WATCH_MS = 120; // debounce for vault changes
const INTERVALO_TRANSMISSAO_MS = 20e3; // periodic refresh (status decays with time)
const BATIDA_SSE_MS = 25e3; // keep-alive ping for SSE connections

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

// ---------- state ----------
function statusEfetivo(r, agora) {
  const parado = agora - (Date.parse(r.atualizado) || r.mtime);
  const status = r.status || 'repousando';
  // A session can vanish without SessionEnd (app closed): let it fall asleep.
  if (status !== 'adormecido' && parado > ADORMECE_APOS_MS) return 'adormecido';
  if (status === 'trabalhando' && parado > REPOUSA_APOS_MS) return 'repousando';
  return status;
}

function calcularPontes(visiveis) {
  const porNota = new Map(visiveis.map((r) => [r.nota, r]));
  const pontes = new Map();
  for (const r of visiveis) {
    for (const link of r.conexoes || []) {
      const outro = porNota.get(nomeDoLink(link));
      if (!outro || outro === r) continue;
      const chave = [r.sessao, outro.sessao].sort().join('|');
      if (pontes.has(chave)) continue;
      const tocouA = new Set(r.tocou || []);
      const compartilhados = (outro.tocou || []).filter((t) => tocouA.has(t));
      pontes.set(chave, {
        a: r.sessao,
        b: outro.sessao,
        tipo: compartilhados.length ? 'ponte' : 'alianca',
        arquivos: compartilhados.slice(0, MAX_ARQUIVOS_PONTE).map((f) => path.basename(f)),
      });
    }
  }
  return [...pontes.values()];
}

function estado() {
  const agora = Date.now();
  const todos = lerReinos().map((r) => ({ ...r, status: statusEfetivo(r, agora) }));
  const despertos = todos.filter((r) => r.status !== 'adormecido');
  const adormecidos = todos
    .filter((r) => r.status === 'adormecido' && agora - r.mtime < ADORMECIDOS_JANELA_MS)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_ADORMECIDOS);
  const visiveis = [...despertos, ...adormecidos];

  return {
    cofre: COFRE,
    agora: new Date(agora).toISOString(),
    // `corpo`, `mtime` and `tocou` are internal: they are left out of the payload.
    reinos: visiveis.map(({ corpo, mtime, tocou, ...r }) => ({
      ...r,
      cronica: (corpo.match(/^- .+$/gm) || []).slice(-MAX_CRONICA).map((l) => l.slice(2)),
      arquivosRecentes: (tocou || []).slice(0, MAX_ARQUIVOS_RECENTES).map((f) => path.basename(f)),
      nArquivos: (tocou || []).length,
    })),
    pontes: calcularPontes(visiveis),
  };
}

// ---------- live stream (SSE) ----------
const clientes = new Set();
let ultimo = '';
const mensagemSSE = (json) => `data: ${json}\n\n`;

function transmitir(forcar = false) {
  let json;
  try {
    json = JSON.stringify(estado());
  } catch (err) {
    console.error('Falha ao ler os reinos:', err);
    return;
  }
  if (!forcar && json === ultimo) return;
  ultimo = json;
  for (const res of clientes) {
    try {
      res.write(mensagemSSE(json));
    } catch {
      clientes.delete(res);
    }
  }
}

fs.mkdirSync(PASTA_REINOS, { recursive: true });
let espera;
try {
  fs.watch(PASTA_REINOS, () => {
    clearTimeout(espera);
    espera = setTimeout(transmitir, ESPERA_WATCH_MS);
  }).on('error', (err) => console.error('Falha ao observar o vault:', err.message));
} catch (err) {
  console.error('Não foi possível observar o vault (seguindo só com a atualização periódica):', err.message);
}
setInterval(transmitir, INTERVALO_TRANSMISSAO_MS);

// ---------- HTTP ----------
function responderErro(res, codigo, texto = '') {
  if (res.headersSent) return res.end();
  res.writeHead(codigo, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(texto);
}

function abrirEventos(req, res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.write(mensagemSSE(JSON.stringify(estado())));
  clientes.add(res);
  const batida = setInterval(() => res.write(': ping\n\n'), BATIDA_SSE_MS);
  req.on('close', () => {
    clientes.delete(res);
    clearInterval(batida);
  });
}

function servirArquivo(url, res) {
  const alvo = path.join(PUBLICO, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
  // Block path traversal (and sibling folders such as "public2").
  if (!alvo.startsWith(PUBLICO + path.sep)) return responderErro(res, 403);
  fs.readFile(alvo, (err, buf) => {
    if (err) {
      const naoExiste = ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(err.code);
      if (!naoExiste) console.error(`Falha ao ler ${alvo}:`, err.message);
      return responderErro(res, naoExiste ? 404 : 500, naoExiste ? 'não encontrado' : 'erro interno');
    }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(alvo)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const servidor = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/reinos') {
      const corpo = JSON.stringify(estado());
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(corpo);
    }
    if (url.pathname === '/eventos') return abrirEventos(req, res);
    return servirArquivo(url, res);
  } catch (err) {
    console.error(`Erro em ${req.method} ${req.url}:`, err);
    responderErro(res, 500, 'erro interno');
  }
});

servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`A porta ${PORTA} já está em uso. Feche o outro servidor ou defina PORT no .env.`);
  } else {
    console.error('Erro no servidor:', err);
  }
  process.exit(1);
});

servidor.listen(PORTA, HOST, () => {
  console.log(`Reinos em http://localhost:${PORTA}  ·  cofre: ${COFRE}`);
});
