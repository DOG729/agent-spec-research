import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig();
const PORT = 3000;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function sendNotFound(res) {
  sendJson(res, 404, {
    error: 'Not found'
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = await readFile(new URL('./ui/index.html', import.meta.url), 'utf8');

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      const STATE = await loadState();

      sendJson(res, 200, getStatus(CONFIG, STATE));
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/room/')) {
      const STATE = await loadState();
      const roomId = decodeURIComponent(url.pathname.slice('/room/'.length));
      const result = await processRoom(roomId, CONFIG, STATE);

      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/item/')) {
      const STATE = await loadState();
      const itemId = decodeURIComponent(url.pathname.slice('/item/'.length));
      const result = await useItem(itemId, CONFIG, STATE);

      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/init') {
      const STATE = await loadState();

      await initPlayer(CONFIG, STATE);
      sendJson(res, 200, {
        ok: true
      });
      return;
    }

    sendNotFound(res);
  } catch (error) {
    sendJson(res, 400, {
      error: error.message
    });
  }
});

server.listen(PORT);
