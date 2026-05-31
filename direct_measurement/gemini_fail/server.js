import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = await loadConfig();

const server = createServer(async (req, res) => {
  // Загружаем состояние на каждый запрос
  const state = await loadState();
  const { method, url } = req;
  const path = new URL(url, `http://${req.headers.host}`).pathname;

  // Установка заголовков для JSON ответов по умолчанию
  const sendJson = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  if (method === 'GET' && path === '/') {
    try {
      const htmlPath = join(__dirname, 'ui', 'index.html');
      const html = await readFile(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end('UI file not found or error reading it');
    }
    return;
  }

  if (method === 'GET' && path === '/status') {
    const status = getStatus(CONFIG, state);
    sendJson(status);
    return;
  }

  if (method === 'POST' && path === '/init') {
    const result = await initPlayer(CONFIG, state);
    sendJson(result);
    return;
  }

  if (method === 'POST' && path.startsWith('/room/')) {
    const roomId = path.split('/room/')[1];
    try {
      const result = await processRoom(roomId, CONFIG, state);
      sendJson(result);
    } catch (err) {
      sendJson({ error: err.message }, 404);
    }
    return;
  }

  if (method === 'POST' && path.startsWith('/item/')) {
    const itemId = path.split('/item/')[1];
    const result = await useItem(itemId, CONFIG, state);
    sendJson(result);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, () => {
  // console.log(`Dungeon Runner server listening on port ${PORT}`);
});
