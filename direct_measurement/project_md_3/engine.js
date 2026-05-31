import { saveState } from '../core/io.js';

// ВАЖНО: CONFIG передаётся параметром (его загрузка происходит на старте сервера).

function getZeroAndOne(CONFIG) {
  // Избегаем числовых литералов в боевой логике: 1 = base/base, 0 = base-base.
  const one = CONFIG.balance.player_base_hp / CONFIG.balance.player_base_hp;
  const zero = CONFIG.balance.player_base_hp - CONFIG.balance.player_base_hp;
  return { zero, one };
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function initPlayer(CONFIG, STATE) {
  const { zero, one } = getZeroAndOne(CONFIG);

  const [firstRoomId] = Object.keys(CONFIG.rooms);
  STATE.player = {
    hp: CONFIG.balance.player_base_hp,
    gold: zero,
    xp: zero,
    level: one,
    inventory: [],
    unlocked: [],
  };
  STATE.current_room_id = firstRoomId;
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  saveState(STATE);
  return { ok: true };
}

export function getStatus(CONFIG, STATE) {
  const roomId = STATE.current_room_id;
  const room = CONFIG.rooms[roomId];

  return {
    room: room.description,
    roomId,
    hp: STATE.player.hp,
    maxHp: CONFIG.balance.player_base_hp,
    level: STATE.player.level,
    xp: STATE.player.xp,
    xpToNextLevel: CONFIG.balance.xp_per_level * STATE.player.level - STATE.player.xp,
    inventory: STATE.player.inventory,
    enemies: room.enemies,
    exits: room.exits,
  };
}

export function useItem(itemId, CONFIG, STATE) {
  const { zero, one } = getZeroAndOne(CONFIG);

  if (!STATE.player?.inventory?.includes(itemId)) {
    throw new Error(`Item '${itemId}' not found in inventory`);
  }
  const item = CONFIG.items[itemId];
  if (!item) {
    throw new Error(`Unknown item '${itemId}'`);
  }

  const effect = item.effect;
  const value = item.value;

  if (!Array.isArray(STATE.player.unlocked)) STATE.player.unlocked = [];
  if (STATE.player.gold == null) STATE.player.gold = zero;

  if (effect === 'heal') {
    STATE.player.hp += value;
  } else if (effect === 'currency') {
    STATE.player.gold += value;
  } else if (effect === 'unlock') {
    if (!STATE.player.unlocked.includes(itemId)) STATE.player.unlocked.push(itemId);
  }

  const index = STATE.player.inventory.indexOf(itemId);
  if (index >= 0) STATE.player.inventory.splice(index, one);

  saveState(STATE);
  return getStatus(CONFIG, STATE);
}

export function processRoom(roomId, CONFIG, STATE) {
  const { zero, one } = getZeroAndOne(CONFIG);

  const room = CONFIG.rooms[roomId];
  if (!room) {
    throw new Error(`Room '${roomId}' not found in CONFIG.rooms`);
  }

  const loot = [];
  let levelUp = false;

  // Бой идёт последовательно по списку enemies в комнате.
  for (const enemyId of room.enemies) {
    const enemy = CONFIG.enemies[enemyId];
    if (!enemy) {
      throw new Error(`Enemy '${enemyId}' not found in CONFIG.enemies`);
    }

    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp > zero) {
      STATE.player.xp += enemy.xp_reward;
      const found = pickRandom(enemy.loot_table);

      if (found && STATE.player.inventory.length < CONFIG.balance.max_inventory) {
        STATE.player.inventory.push(found);
        loot.push(found);
      }

      if (!Array.isArray(STATE.defeated_enemies)) STATE.defeated_enemies = [];
      STATE.defeated_enemies.push(enemyId);
    } else {
      break;
    }
  }

  if (STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level) {
    STATE.player.level += one;
    levelUp = true;
  }

  STATE.current_room_id = roomId;
  saveState(STATE);

  return {
    alive: STATE.player.hp > zero,
    levelUp,
    loot,
  };
}

