// Local server: reads the kingdoms from the Obsidian vault and streams them live to the page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PASTA_REINOS, COFRE, lerReinos, nomeDoLink } from './lib/reinos.mjs';

const PORTA = Number(process.env.PORT) || 4747;
const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MIN = 60e3;

function estado() {
  const agora = Date.now();
  const todos = lerReinos().map((r) => {
    const parado = agora - (Date.parse(r.atualizado) || r.mtime);
    let status = r.status || 'repousando';
    // A session can vanish without SessionEnd (app closed): let it fall asleep.
    if (status !== 'adormecido' && parado > 3 * 60 * MIN) status = 'adormecido';
    else if (status === 'trabalhando' && parado > 15 * MIN) status = 'repousando';
    return { ...r, status };
  });
  const despertos = todos.filter((r) => r.status !== 'adormecido');
  const adormecidos = todos
    .filter((r) => r.status === 'adormecido' && agora - r.mtime < 24 * 60 * MIN)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10);
  const visiveis = [...despertos, ...adormecidos];
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
        arquivos: compartilhados.slice(0, 5).map((f) => path.basename(f)),
      });
    }
  }

  return {
    cofre: COFRE,
    agora: new Date(agora).toISOString(),
    reinos: visiveis.map(({ corpo, mtime, tocou, ...r }) => ({
      ...r,
      cronica: (corpo.match(/^- .+$/gm) || []).slice(-6).map((l) => l.slice(2)),
      arquivosRecentes: (tocou || []).slice(0, 4).map((f) => path.basename(f)),
      nArquivos: (tocou || []).length,
    })),
    pontes: [...pontes.values()],
  };
}

const clientes = new Set();
let ultimo = '';
function transmitir(forcar = false) {
  const json = JSON.stringify(estado());
  if (!forcar && json === ultimo) return;
  ultimo = json;
  for (const res of clientes) res.write(`data: ${json}\n\n`);
}

fs.mkdirSync(PASTA_REINOS, { recursive: true });
let espera;
fs.watch(PASTA_REINOS, () => {
  clearTimeout(espera);
  espera = setTimeout(transmitir, 120);
});
setInterval(transmitir, 20e3);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/reinos') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(estado()));
    }
    if (url.pathname === '/eventos') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(estado())}\n\n`);
      clientes.add(res);
      const batida = setInterval(() => res.write(': ping\n\n'), 25e3);
      req.on('close', () => {
        clientes.delete(res);
        clearInterval(batida);
      });
      return;
    }
    const alvo = path.join(PUBLICO, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!alvo.startsWith(PUBLICO)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(alvo, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end('não encontrado');
      }
      res.writeHead(200, { 'content-type': TIPOS[path.extname(alvo)] || 'application/octet-stream' });
      res.end(buf);
    });
  })
  .listen(PORTA, '127.0.0.1', () => {
    console.log(`Reinos em http://localhost:${PORTA}  ·  cofre: ${COFRE}`);
  });
