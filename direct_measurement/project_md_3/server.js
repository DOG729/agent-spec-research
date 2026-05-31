import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig(); // загрузка один раз при старте

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uiIndexPath = join(__dirname, 'ui', 'index.html');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(payload);
}

async function handler(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';
  const pathname = url.pathname;

  try {
    if (method === 'GET' && pathname === '/') {
      const html = await readFile(uiIndexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (method === 'GET' && pathname === '/status') {
      const STATE = await loadState();
      sendJson(res, 200, getStatus(CONFIG, STATE));
      return;
    }

    if (method === 'POST' && pathname.startsWith('/room/')) {
      const roomId = decodeURIComponent(pathname.slice('/room/'.length));
      const STATE = await loadState();
      const result = processRoom(roomId, CONFIG, STATE);
      sendJson(res, 200, result);
      return;
    }

    if (method === 'POST' && pathname.startsWith('/item/')) {
      const itemId = decodeURIComponent(pathname.slice('/item/'.length));
      const STATE = await loadState();
      const result = useItem(itemId, CONFIG, STATE);
      sendJson(res, 200, result);
      return;
    }

    if (method === 'POST' && pathname === '/init') {
      const STATE = await loadState();
      initPlayer(CONFIG, STATE);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendText(res, 404, 'Not found');
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}

createServer(handler).listen(3000);

