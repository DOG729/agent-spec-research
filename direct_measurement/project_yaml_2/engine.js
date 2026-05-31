import { saveState } from '../core/io.js';

export async function processRoom(roomId, CONFIG, STATE) {
  const room = CONFIG.rooms[roomId];

  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }

  const collectedLoot = [];
  let alive = true;
  let levelUp = false;

  for (const enemyId of room.enemies) {
    const enemy = CONFIG.enemies[enemyId];

    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp > 0) {
      STATE.player.xp += enemy.xp_reward;
      STATE.defeated_enemies.push(enemyId);

      const lootIndex = Math.floor(Math.random() * enemy.loot_table.length);
      const lootItem = enemy.loot_table[lootIndex];

      if (STATE.player.inventory.length < CONFIG.balance.max_inventory) {
        STATE.player.inventory.push(lootItem);
        collectedLoot.push(lootItem);
      }
    } else {
      alive = false;
      break;
    }
  }

  const nextLevelXp = CONFIG.balance.xp_per_level * STATE.player.level;

  if (STATE.player.xp >= nextLevelXp) {
    STATE.player.level += 1;
    levelUp = true;
  }

  STATE.player.inventory = STATE.player.inventory.slice(0, CONFIG.balance.max_inventory);
  STATE.current_room_id = roomId;

  await saveState(STATE);

  return {
    alive,
    levelUp,
    loot: collectedLoot
  };
}

export async function useItem(itemId, CONFIG, STATE) {
  const itemIndex = STATE.player.inventory.indexOf(itemId);

  if (itemIndex === -1) {
    throw new Error(`Item is not in inventory: ${itemId}`);
  }

  const item = CONFIG.items[itemId];

  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }

  if (item.effect === 'heal') {
    STATE.player.hp += item.value;
  }

  if (item.effect === 'currency') {
    STATE.player.gold = (STATE.player.gold ?? 0) + item.value;
  }

  if (item.effect === 'unlock') {
    STATE.player.unlocked ??= [];
    STATE.player.unlocked.push(itemId);
  }

  STATE.player.inventory.splice(itemIndex, 1);

  await saveState(STATE);

  return {
    ok: true
  };
}

export async function initPlayer(CONFIG, STATE) {
  STATE.player = {
    hp: CONFIG.balance.player_base_hp,
    xp: 0,
    level: 1,
    inventory: []
  };
  STATE.current_room_id = Object.keys(CONFIG.rooms)[0];
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  await saveState(STATE);
}

export function getStatus(CONFIG, STATE) {
  const room = CONFIG.rooms[STATE.current_room_id];

  return {
    roomId: STATE.current_room_id,
    room: room.description,
    hp: STATE.player.hp,
    maxHp: CONFIG.balance.player_base_hp,
    level: STATE.player.level,
    xp: STATE.player.xp,
    xpToNextLevel: CONFIG.balance.xp_per_level * STATE.player.level - STATE.player.xp,
    inventory: STATE.player.inventory,
    exits: room.exits,
    enemies: room.enemies
  };
}
