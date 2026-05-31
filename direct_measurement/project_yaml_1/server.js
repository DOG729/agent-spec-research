import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_PATH = join(__dirname, 'ui', 'index.html');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    if (req.method === 'GET' && pathname === '/') {
      const html = await readFile(UI_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && pathname === '/status') {
      const STATE = await loadState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStatus(CONFIG, STATE)));
      return;
    }

    if (req.method === 'POST' && pathname === '/init') {
      const STATE = await loadState();
      await initPlayer(CONFIG, STATE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
    if (req.method === 'POST' && roomMatch) {
      const STATE = await loadState();
      const result = await processRoom(decodeURIComponent(roomMatch[1]), CONFIG, STATE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    const itemMatch = pathname.match(/^\/item\/([^/]+)$/);
    if (req.method === 'POST' && itemMatch) {
      const STATE = await loadState();
      const result = await useItem(decodeURIComponent(itemMatch[1]), CONFIG, STATE);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(3000, () => {
  console.log('Dungeon Runner server listening on http://localhost:3000');
});
