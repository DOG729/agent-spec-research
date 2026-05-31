import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_PATH  = join(ROOT, 'data.json');
const STATE_PATH = join(ROOT, 'state.json');

/**
 * Load static game config from data.json.
 * Call once at startup — cache the result as CONFIG.
 */
export async function loadConfig() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  return Object.freeze(JSON.parse(raw));
}

/**
 * Load runtime player state from state.json.
 * Call once per session start — keep as mutable STATE.
 */
export async function loadState() {
  const raw = await readFile(STATE_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Persist the current STATE to state.json.
 * Call after every action that mutates STATE.
 */
export async function saveState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}
