import { saveState } from '../core/io.js';

export async function processRoom(roomId, CONFIG, STATE) {
  if (!CONFIG.rooms[roomId]) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const loot = [];
  let levelUp = false;

  for (const enemyId of CONFIG.rooms[roomId].enemies) {
    const enemy = CONFIG.enemies[enemyId];
    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp > 0) {
      STATE.player.xp += enemy.xp_reward;

      const lootTable = enemy.loot_table;
      const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];

      if (STATE.player.inventory.length < CONFIG.balance.max_inventory) {
        STATE.player.inventory.push(itemId);
        loot.push(itemId);
      }
    } else {
      break;
    }
  }

  while (STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level) {
    STATE.player.level += 1;
    levelUp = true;
  }

  if (STATE.player.inventory.length > CONFIG.balance.max_inventory) {
    STATE.player.inventory = STATE.player.inventory.slice(0, CONFIG.balance.max_inventory);
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
    throw new Error(`Item not in inventory: ${itemId}`);
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
}

export async function initPlayer(CONFIG, STATE) {
  STATE.player.hp = CONFIG.balance.player_base_hp;
  STATE.player.xp = 0;
  STATE.player.level = 1;
  STATE.player.inventory = [];
  STATE.player.gold = 0;
  STATE.player.unlocked = [];
  STATE.current_room_id = Object.keys(CONFIG.rooms)[0];
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();
  await saveState(STATE);
}

export function getStatus(CONFIG, STATE) {
  const room = CONFIG.rooms[STATE.current_room_id];
  return {
    room: room.description,
    hp: STATE.player.hp,
    maxHp: CONFIG.balance.player_base_hp,
    level: STATE.player.level,
    xp: STATE.player.xp,
    xpToNextLevel: CONFIG.balance.xp_per_level * STATE.player.level - STATE.player.xp,
    inventory: [...STATE.player.inventory],
    exits: room.exits,
    enemies: room.enemies,
    currentRoomId: STATE.current_room_id,
    gold: STATE.player.gold ?? 0,
  };
}
