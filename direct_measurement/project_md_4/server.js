import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { loadConfig, loadState, saveState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig(); // один раз при старте

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(payload);
}

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function parseUrl(req) {
  const host = `http://${req.headers.host ?? 'localhost'}`;
  return new URL(req.url ?? '/', host);
}

const uiPath = new URL('./ui/index.html', import.meta.url);

const server = createServer(async (req, res) => {
  try {
    const url = parseUrl(req);
    const method = req.method ?? 'GET';

    if (method === 'GET' && url.pathname === '/') {
      const html = await readFile(uiPath, 'utf-8');
      return sendHtml(res, html);
    }

    if (method === 'GET' && url.pathname === '/status') {
      const STATE = await loadState();
      return json(res, 200, getStatus(CONFIG, STATE));
    }

    if (method === 'POST' && url.pathname === '/init') {
      const STATE = await loadState();
      initPlayer(CONFIG, STATE);
      // initPlayer сам сохраняет, но для надёжности пусть будет идемпотентно:
      // сохранение уже выполнено через engine/init.
      return json(res, 200, { ok: true });
    }

    const roomMatch = method === 'POST' && url.pathname.match(/^\/room\/([^/]+)$/);
    if (roomMatch) {
      const id = decodeURIComponent(roomMatch[1]);
      const STATE = await loadState();
      const result = processRoom(id, CONFIG, STATE);
      return json(res, 200, result);
    }

    const itemMatch = method === 'POST' && url.pathname.match(/^\/item\/([^/]+)$/);
    if (itemMatch) {
      const id = decodeURIComponent(itemMatch[1]);
      const STATE = await loadState();
      const result = useItem(id, CONFIG, STATE);
      return json(res, 200, result);
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(3000);
console.log('Dungeon Runner listening on http://localhost:3000');

