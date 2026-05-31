import { saveState } from '../core/io.js';

function pickRandomLoot(lootTable) {
  const index = Math.floor(Math.random() * lootTable.length);
  return lootTable[index];
}

function tryAddLoot(STATE, CONFIG, itemId) {
  if (STATE.player.inventory.length >= CONFIG.balance.max_inventory) {
    return null;
  }
  STATE.player.inventory.push(itemId);
  return itemId;
}

function checkLevelUp(STATE, CONFIG) {
  let levelUp = false;
  const threshold = CONFIG.balance.xp_per_level;
  while (STATE.player.xp >= threshold * STATE.player.level) {
    STATE.player.level += 1;
    levelUp = true;
  }
  return levelUp;
}

export async function processRoom(roomId, CONFIG, STATE) {
  if (!CONFIG.rooms[roomId]) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const room = CONFIG.rooms[roomId];
  const loot = [];
  let levelUp = false;

  for (const enemyId of room.enemies) {
    const enemy = CONFIG.enemies[enemyId];
    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp > 0) {
      STATE.player.xp += enemy.xp_reward;
      const itemId = pickRandomLoot(enemy.loot_table);
      const added = tryAddLoot(STATE, CONFIG, itemId);
      if (added) {
        loot.push(added);
      }
    }
  }

  if (checkLevelUp(STATE, CONFIG)) {
    levelUp = true;
  }

  STATE.current_room_id = roomId;
  await saveState(STATE);

  return {
    alive: STATE.player.hp > 0,
    levelUp,
    loot,
  };
}

export async function useItem(itemId, CONFIG, STATE) {
  const index = STATE.player.inventory.indexOf(itemId);
  if (index === -1) {
    return { ok: false, error: 'Item not in inventory' };
  }

  const item = CONFIG.items[itemId];
  const { effect, value } = item;

  if (effect === 'heal') {
    STATE.player.hp += value;
  } else if (effect === 'currency') {
    if (STATE.player.gold === undefined) {
      STATE.player.gold = 0;
    }
    STATE.player.gold += value;
  } else if (effect === 'unlock') {
    if (!STATE.player.unlocked) {
      STATE.player.unlocked = [];
    }
    if (!STATE.player.unlocked.includes(itemId)) {
      STATE.player.unlocked.push(itemId);
    }
  }

  STATE.player.inventory.splice(index, 1);
  await saveState(STATE);

  return { ok: true };
}

export async function initPlayer(CONFIG, STATE) {
  STATE.player.hp = CONFIG.balance.player_base_hp;
  STATE.player.xp = 0;
  STATE.player.level = 1;
  STATE.player.inventory = [];

  const roomIds = Object.keys(CONFIG.rooms);
  STATE.current_room_id = roomIds[0];
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  await saveState(STATE);
}

export function getStatus(CONFIG, STATE) {
  const room = CONFIG.rooms[STATE.current_room_id];
  const threshold = CONFIG.balance.xp_per_level;

  return {
    room: room.description,
    hp: STATE.player.hp,
    maxHp: CONFIG.balance.player_base_hp,
    level: STATE.player.level,
    xp: STATE.player.xp,
    xpToNextLevel: threshold * STATE.player.level - STATE.player.xp,
    inventory: STATE.player.inventory,
    exits: room.exits,
    enemies: room.enemies,
    currentRoomId: STATE.current_room_id,
  };
}
