import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';
import path from 'path';
import { fileURLToPath } from 'url';

const CONFIG = await loadConfig(); // one-time load at startup

const PORT = 3000;

// Robust UI_PATH resolution to support cross-platform and nested directory cases.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_PATH = path.join(__dirname, 'ui', 'index.html');

async function readUi() {
  if (!existsSync(UI_PATH)) {
    throw new Error(`UI HTML file not found at ${UI_PATH}`);
  }
  return readFile(UI_PATH, 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      try {
        const html = await readUi();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      } catch (e) {
        sendJson(res, 500, { error: e.message });
      }
      return;
    }

    const state = await loadState(); // per-request load

    if (req.method === 'GET' && req.url === '/status') {
      sendJson(res, 200, getStatus(CONFIG, state));
      return;
    }

    if (req.method === 'POST') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const parts = url.pathname.split('/').filter(Boolean);

      if (parts[0] === 'room' && parts[1]) {
        const result = processRoom(parts[1], CONFIG, state);
        sendJson(res, 200, result);
        return;
      }
      if (parts[0] === 'item' && parts[1]) {
        const result = useItem(parts[1], CONFIG, state);
        sendJson(res, 200, result);
        return;
      }
      if (parts[0] === 'init') {
        const result = initPlayer(CONFIG, state);
        sendJson(res, 200, result);
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 400, { error: message });
  }
});

server.listen(PORT, () => {
  // Intentionally no extra logging needed by the spec.
});
