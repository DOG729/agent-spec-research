import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_PATH = join(__dirname, 'ui', 'index.html');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/') {
      const html = await readFile(UI_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    const STATE = await loadState();

    if (req.method === 'GET' && pathname === '/status') {
      sendJson(res, 200, getStatus(CONFIG, STATE));
      return;
    }

    if (req.method === 'POST' && pathname === '/init') {
      await initPlayer(CONFIG, STATE);
      sendJson(res, 200, { ok: true });
      return;
    }

    const roomMatch = pathname.match(/^\/room\/(.+)$/);
    if (req.method === 'POST' && roomMatch) {
      const roomId = decodeURIComponent(roomMatch[1]);
      const result = await processRoom(roomId, CONFIG, STATE);
      sendJson(res, 200, result);
      return;
    }

    const itemMatch = pathname.match(/^\/item\/(.+)$/);
    if (req.method === 'POST' && itemMatch) {
      const itemId = decodeURIComponent(itemMatch[1]);
      await useItem(itemId, CONFIG, STATE);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(3000, () => {
  console.log('Dungeon Runner server running on http://localhost:3000');
});
