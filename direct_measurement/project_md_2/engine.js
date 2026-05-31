import { saveState } from '../core/io.js';

function assertKnownRoom(roomId, CONFIG) {
  if (!CONFIG.rooms[roomId]) {
    throw new Error(`Unknown room: ${roomId}`);
  }
}

function assertKnownItem(itemId, CONFIG) {
  if (!CONFIG.items[itemId]) {
    throw new Error(`Unknown item: ${itemId}`);
  }
}

function addLootToInventory(itemId, CONFIG, STATE, collectedLoot) {
  if (STATE.player.inventory.length < CONFIG.balance.max_inventory) {
    STATE.player.inventory.push(itemId);
    collectedLoot.push(itemId);
  }
}

function pickRandomLoot(lootTable) {
  if (!lootTable.length) {
    return null;
  }

  return lootTable[Math.floor(Math.random() * lootTable.length)];
}

export async function processRoom(roomId, CONFIG, STATE) {
  assertKnownRoom(roomId, CONFIG);

  const room = CONFIG.rooms[roomId];
  const collectedLoot = [];
  const previousLevel = STATE.player.level;

  for (const enemyId of room.enemies) {
    const enemy = CONFIG.enemies[enemyId];
    if (!enemy) {
      throw new Error(`Unknown enemy: ${enemyId}`);
    }

    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp > 0) {
      STATE.player.xp += enemy.xp_reward;
      STATE.defeated_enemies.push(enemyId);

      const lootItemId = pickRandomLoot(enemy.loot_table);
      if (lootItemId) {
        assertKnownItem(lootItemId, CONFIG);
        addLootToInventory(lootItemId, CONFIG, STATE, collectedLoot);
      }
    }
  }

  if (STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level) {
    STATE.player.level += 1;
  }

  STATE.current_room_id = roomId;
  await saveState(STATE);

  return {
    alive: STATE.player.hp > 0,
    levelUp: STATE.player.level > previousLevel,
    loot: collectedLoot,
  };
}

export async function useItem(itemId, CONFIG, STATE) {
  assertKnownItem(itemId, CONFIG);

  const inventoryIndex = STATE.player.inventory.indexOf(itemId);
  if (inventoryIndex === -1) {
    throw new Error(`Item is not in inventory: ${itemId}`);
  }

  const item = CONFIG.items[itemId];

  if (item.effect === 'heal') {
    STATE.player.hp += item.value;
  } else if (item.effect === 'currency') {
    if (typeof STATE.player.gold === 'number') {
      STATE.player.gold += item.value;
    } else {
      STATE.player.gold = item.value;
    }
  } else if (item.effect === 'unlock') {
    if (!Array.isArray(STATE.player.unlocked)) {
      STATE.player.unlocked = [];
    }
    STATE.player.unlocked.push(itemId);
  }

  STATE.player.inventory.splice(inventoryIndex, 1);
  await saveState(STATE);

  return {
    ok: true,
    item: itemId,
    effect: item.effect,
  };
}

export async function initPlayer(CONFIG, STATE) {
  STATE.player = {
    hp: CONFIG.balance.player_base_hp,
    xp: 0,
    level: 1,
    inventory: [],
  };
  STATE.current_room_id = Object.keys(CONFIG.rooms)[0];
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  await saveState(STATE);
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
    gold: STATE.player.gold,
    unlocked: STATE.player.unlocked,
    exits: room.exits,
    enemies: room.enemies,
  };
}
