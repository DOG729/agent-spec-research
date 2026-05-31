import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  const body = text;
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req) {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) return null;

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // На всякий случай ограничим размер.
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const CONFIG = await loadConfig(); // один раз при старте сервера
const uiHtml = await readFile(new URL('./ui/index.html', import.meta.url), 'utf8');

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(uiHtml),
      });
      res.end(uiHtml);
      return;
    }

    if (req.method === 'GET' && pathname === '/status') {
      const STATE = await loadState();
      sendJson(res, 200, getStatus(CONFIG, STATE));
      return;
    }

    if (req.method === 'POST' && pathname === '/init') {
      // Тело не важно, но дочитаем корректно, если вдруг придет.
      await readJsonBody(req).catch(() => null);
      const STATE = await loadState();
      await initPlayer(CONFIG, STATE);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/room/')) {
      const parts = pathname.split('/');
      const roomId = decodeURIComponent(parts[2] ?? '');

      await readJsonBody(req).catch(() => null);
      const STATE = await loadState();
      const result = await processRoom(roomId, CONFIG, STATE);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/item/')) {
      const parts = pathname.split('/');
      const itemId = decodeURIComponent(parts[2] ?? '');

      await readJsonBody(req).catch(() => null);
      const STATE = await loadState();
      const result = await useItem(itemId, CONFIG, STATE);
      // useItem сам может вернуть ok:false, но HTTP делаем 200 по контракту UI.
      sendJson(res, 200, result);
      return;
    }

    sendText(res, 404, 'Not found');
  } catch (e) {
    sendJson(res, 400, { error: (e && e.message) ? e.message : 'Bad request' });
  }
});

server.listen(3000, () => {
  // Intentionally no logging requirements in spec; keep minimal output.
});

