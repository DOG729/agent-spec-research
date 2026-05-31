import { saveState } from '../core/io.js';

function assertRoomExists(roomId, CONFIG) {
  if (!CONFIG?.rooms?.[roomId]) {
    throw new Error(`Room not found: ${roomId}`);
  }
}

function assertItemInInventory(itemId, STATE) {
  const idx = STATE?.player?.inventory?.indexOf(itemId) ?? -1;
  if (idx === -1) throw new Error(`Item not in inventory: ${itemId}`);
}

function applyLevelUpIfNeeded(CONFIG, STATE) {
  // Level increments while xp meets the threshold for current level.
  // Threshold formula is controlled exclusively by CONFIG.
  let leveledUp = false;
  // Use a loop to support multiple level-ups in a single room clear.
  // (No numeric literals for combat/progression constants; they come from CONFIG.)
  while (STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level) {
    STATE.player.level += 1;
    leveledUp = true;
  }
  return leveledUp;
}

function applyLootFromEnemy(CONFIG, STATE, enemyId) {
  const lootTable = CONFIG.enemies?.[enemyId]?.loot_table;
  const lootId = lootTable[Math.floor(Math.random() * lootTable.length)];

  if (STATE.player.inventory.length < CONFIG.balance.max_inventory) {
    STATE.player.inventory.push(lootId);
  }
  return lootId;
}

export function processRoom(roomId, CONFIG, STATE) {
  assertRoomExists(roomId, CONFIG);

  const enemies = CONFIG.rooms[roomId].enemies || [];
  let alive = true;
  let levelUp = false;
  const loot = [];

  for (const enemyId of enemies) {
    // Combat: subtract damage from player HP (state is the source of truth).
    const damage = CONFIG.enemies[enemyId].damage;
    STATE.player.hp -= damage;

    if (STATE.player.hp > 0) {
      // Reward: add XP.
      const xpReward = CONFIG.enemies[enemyId].xp_reward;
      STATE.player.xp += xpReward;

      // Reward: loot (single random item from loot_table).
      const gained = applyLootFromEnemy(CONFIG, STATE, enemyId);
      loot.push(gained);
    } else {
      alive = false;
      break;
    }
  }

  // Level-up after fights.
  levelUp = applyLevelUpIfNeeded(CONFIG, STATE);

  // Inventory limit is guaranteed by push logic; keep invariant check.
  if (STATE.player.inventory.length > CONFIG.balance.max_inventory) {
    STATE.player.inventory = STATE.player.inventory.slice(0, CONFIG.balance.max_inventory);
  }

  STATE.current_room_id = roomId;
  // Persist the updated runtime state.
  saveState(STATE);

  return { alive, levelUp, loot };
}

export function useItem(itemId, CONFIG, STATE) {
  assertItemInInventory(itemId, STATE);

  const item = CONFIG.items?.[itemId];
  const effect = item.effect;
  const value = item.value;

  // Ensure optional state fields exist (do not rely on initial file shape).
  STATE.player.gold ??= 0;
  STATE.player.unlocked ??= [];

  if (effect === 'heal') {
    STATE.player.hp += value;
  } else if (effect === 'currency') {
    STATE.player.gold += value;
  } else if (effect === 'unlock') {
    STATE.player.unlocked.push(itemId);
  }

  // Remove item from inventory.
  STATE.player.inventory = STATE.player.inventory.filter((id) => id !== itemId);

  saveState(STATE);
  return { ok: true };
}

export function initPlayer(CONFIG, STATE) {
  STATE.player.hp = CONFIG.balance.player_base_hp;
  STATE.player.xp = 0;
  STATE.player.level = 1;
  STATE.player.inventory = [];

  // Initialize optional fields used by item effects.
  STATE.player.gold ??= 0;
  STATE.player.unlocked ??= [];

  const firstRoomId = Object.keys(CONFIG.rooms)[0];
  STATE.current_room_id = firstRoomId;
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  saveState(STATE);
  return { ok: true };
}

export function getStatus(CONFIG, STATE) {
  const room = CONFIG.rooms[STATE.current_room_id];
  const maxHp = CONFIG.balance.player_base_hp;
  const xpPerLevel = CONFIG.balance.xp_per_level * STATE.player.level;
  const xpToNextLevel = xpPerLevel - STATE.player.xp;

  return {
    room: room.description,
    roomId: STATE.current_room_id,
    hp: STATE.player.hp,
    maxHp,
    level: STATE.player.level,
    xp: STATE.player.xp,
    xpToNextLevel: Math.max(0, xpToNextLevel),
    inventory: STATE.player.inventory,
    enemies: room.enemies || [],
    exits: room.exits,
  };
} 

