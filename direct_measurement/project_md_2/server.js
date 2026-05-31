import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { loadConfig, loadState } from '../core/io.js';
import { getStatus, initPlayer, processRoom, useItem } from './engine.js';

const CONFIG = await loadConfig();
const PORT = 3000;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendNotFound(response) {
  sendJson(response, 404, { error: 'Not found' });
}

function getPathPart(pathname, prefix) {
  return decodeURIComponent(pathname.slice(prefix.length));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/') {
      const html = await readFile(new URL('./ui/index.html', import.meta.url), 'utf8');
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }

    const STATE = await loadState();

    if (request.method === 'GET' && url.pathname === '/status') {
      sendJson(response, 200, getStatus(CONFIG, STATE));
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/room/')) {
      const roomId = getPathPart(url.pathname, '/room/');
      sendJson(response, 200, await processRoom(roomId, CONFIG, STATE));
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/item/')) {
      const itemId = getPathPart(url.pathname, '/item/');
      sendJson(response, 200, await useItem(itemId, CONFIG, STATE));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/init') {
      await initPlayer(CONFIG, STATE);
      sendJson(response, 200, { ok: true });
      return;
    }

    sendNotFound(response);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(PORT);
