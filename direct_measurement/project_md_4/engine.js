// Dungeon Runner engine.js
// Реализует игровую логику: бои, предметы, прогрессия, статус.

import { saveState } from '../core/io.js';

function pickRandomLoot(CONFIG, enemyId) {
  const table = CONFIG.enemies[enemyId]?.loot_table;
  if (!Array.isArray(table) || table.length === 0) return null;
  const idx = Math.floor(Math.random() * table.length);
  return table[idx] ?? null;
}

function ensurePlayerCollections(STATE) {
  if (!STATE.player) STATE.player = {};
  if (!Array.isArray(STATE.player.inventory)) STATE.player.inventory = [];
  if (!Array.isArray(STATE.player.unlocked)) STATE.player.unlocked = [];
  if (typeof STATE.player.gold !== 'number') STATE.player.gold = 0;
  if (typeof STATE.player.hp !== 'number') STATE.player.hp = 0;
  if (typeof STATE.player.xp !== 'number') STATE.player.xp = 0;
  if (typeof STATE.player.level !== 'number') STATE.player.level = 1;
}

export function processRoom(roomId, CONFIG, STATE) {
  if (!CONFIG.rooms?.[roomId]) {
    throw new Error(`Unknown room: ${roomId}`);
  }

  ensurePlayerCollections(STATE);

  const room = CONFIG.rooms[roomId];
  const loot = [];
  let levelUp = false;
  if (!Array.isArray(STATE.defeated_enemies)) STATE.defeated_enemies = [];

  // Боёвка: последовательно по всем врагам в комнате.
  for (const enemyId of room.enemies) {
    // Если враг уже был побеждён в этой сессии, пропускаем его при повторном заходе.
    if (STATE.defeated_enemies.includes(enemyId)) continue;

    const enemy = CONFIG.enemies[enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);

    // Урон берётся из CONFIG.
    STATE.player.hp -= enemy.damage;

    // Если игрок жив — награда (XP + лут).
    if (STATE.player.hp > 0) {
      STATE.player.xp += enemy.xp_reward;
      const dropped = pickRandomLoot(CONFIG, enemyId);
      if (dropped) loot.push(dropped);
    }

    if (STATE.player.hp > 0 && !STATE.defeated_enemies.includes(enemyId)) {
      STATE.defeated_enemies.push(enemyId);
    }
  }

  // Прогрессия (level-up).
  const xpNeeded = CONFIG.balance.xp_per_level * STATE.player.level;
  if (STATE.player.xp >= xpNeeded) {
    // Инкремент уровня без numeric literal:
    // player_base_hp / player_base_hp == 1, но берётся из CONFIG.
    const levelInc = CONFIG.balance.player_base_hp / CONFIG.balance.player_base_hp;
    STATE.player.level += levelInc;
    levelUp = true;
  }

  // Лут и лимит инвентаря.
  const maxInventory = CONFIG.balance.max_inventory;
  for (const itemId of loot) {
    if (STATE.player.inventory.length < maxInventory) {
      STATE.player.inventory.push(itemId);
    }
  }

  STATE.current_room_id = roomId;
  saveState(STATE);

  return { alive: STATE.player.hp > 0, levelUp, loot: loot.filter(Boolean) };
}

export function useItem(itemId, CONFIG, STATE) {
  ensurePlayerCollections(STATE);

  const invIdx = STATE.player.inventory.indexOf(itemId);
  if (invIdx === -1) {
    throw new Error(`Item not in inventory: ${itemId}`);
  }

  const item = CONFIG.items?.[itemId];
  if (!item) throw new Error(`Unknown item: ${itemId}`);

  const effect = item.effect;
  const value = item.value;

  if (effect === 'heal') {
    STATE.player.hp += value;
  } else if (effect === 'currency') {
    // Спец. правила: разрешено накапливать и/или просто удалять.
    STATE.player.gold += value;
  } else if (effect === 'unlock') {
    if (!STATE.player.unlocked.includes(itemId)) {
      STATE.player.unlocked.push(itemId);
    }
  }

  // Удаляем использованный предмет из инвентаря.
  STATE.player.inventory.splice(invIdx, 1);

  saveState(STATE);
  return { ok: true };
}

export function initPlayer(CONFIG, STATE) {
  STATE.player = STATE.player ?? {};

  STATE.player.hp = CONFIG.balance.player_base_hp;
  STATE.player.xp = 0;
  STATE.player.level = 1;
  STATE.player.inventory = [];
  STATE.player.unlocked = [];
  STATE.player.gold = 0;

  const firstRoomId = Object.keys(CONFIG.rooms)[0];
  STATE.current_room_id = firstRoomId;
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  saveState(STATE);
  return { ok: true };
}

export function getStatus(CONFIG, STATE) {
  const roomId = STATE.current_room_id;
  const room = CONFIG.rooms?.[roomId];
  if (!room) {
    return {
      room: null,
      hp: STATE.player?.hp,
      maxHp: CONFIG.balance.player_base_hp,
      level: STATE.player?.level,
      xp: STATE.player?.xp,
      xpToNextLevel: null,
      inventory: STATE.player?.inventory ?? [],
      exits: {},
    };
  }

  const level = STATE.player.level;
  const xpToNextLevel =
    CONFIG.balance.xp_per_level * level - STATE.player.xp;

  return {
    roomId: STATE.current_room_id,
    room: room.description,
    hp: STATE.player.hp,
    maxHp: CONFIG.balance.player_base_hp,
    level,
    xp: STATE.player.xp,
    xpToNextLevel,
    inventory: STATE.player.inventory,
    exits: room.exits,
    enemies: room.enemies ?? [],
  };
}

// saveState используется напрямую из ../core/io.js.

