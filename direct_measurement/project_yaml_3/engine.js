import { saveState } from '../core/io.js';

function pickRandom(arr) {
  // arr — массив строковых id сущностей из CONFIG
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function processRoom(roomId, CONFIG, STATE) {
  if (!CONFIG.rooms || !Object.prototype.hasOwnProperty.call(CONFIG.rooms, roomId)) {
    throw new Error(`Unknown roomId: ${roomId}`);
  }

  const room = CONFIG.rooms[roomId];

  const player = STATE.player;
  if (!player.inventory) player.inventory = [];
  if (!STATE.defeated_enemies) STATE.defeated_enemies = [];

  // Считаем, сколько уже побеждено каждого enemyId, чтобы не фармить бесконечно,
  // особенно в комнатах с повторами id (например, два goblin).
  const defeatedCounts = Object.create(null);
  for (const defeatedId of STATE.defeated_enemies) {
    defeatedCounts[defeatedId] = (defeatedCounts[defeatedId] ?? 0) + 1;
  }

  let alive = player.hp > 0;
  let levelUp = false;
  const lootCollected = [];

  // Бои последовательно по массиву room.enemies.
  for (let i = 0; i < room.enemies.length; i += 1) {
    const enemyId = room.enemies[i];
    const alreadyDefeatedCount = defeatedCounts[enemyId] ?? 0;

    // Если такой enemyId уже побежден в количестве, соответствующем текущему
    // вхождению в массив комнаты, пропускаем бой.
    if (alreadyDefeatedCount >= i + 1) continue;
    if (!alive) break;

    const enemy = CONFIG.enemies[enemyId];
    if (!enemy) throw new Error(`Unknown enemyId in CONFIG.enemies: ${enemyId}`);

    player.hp -= enemy.damage;
    if (player.hp > 0) {
      player.xp += enemy.xp_reward;

      const lootId = pickRandom(enemy.loot_table);
      if (player.inventory.length < CONFIG.balance.max_inventory) {
        player.inventory.push(lootId);
        lootCollected.push(lootId);
      }

      STATE.defeated_enemies.push(enemyId);
      defeatedCounts[enemyId] = alreadyDefeatedCount + 1;
    } else {
      alive = false;
    }
  }

  const previousLevel = player.level;
  while (player.xp >= CONFIG.balance.xp_per_level * player.level) {
    player.level += 1;
  }
  levelUp = player.level !== previousLevel;

  // Защитная проверка лимита инвентаря.
  while (player.inventory.length > CONFIG.balance.max_inventory) {
    player.inventory.pop();
  }

  STATE.current_room_id = roomId;
  await saveState(STATE);

  return { alive, levelUp, loot: lootCollected };
}

export async function useItem(itemId, CONFIG, STATE) {
  const player = STATE.player;
  if (!player.inventory) player.inventory = [];

  const idx = player.inventory.indexOf(itemId);
  if (idx === -1) {
    return { ok: false, error: 'Item not in inventory', itemId };
  }

  if (!CONFIG.items || !Object.prototype.hasOwnProperty.call(CONFIG.items, itemId)) {
    throw new Error(`Unknown itemId: ${itemId}`);
  }

  const item = CONFIG.items[itemId];
  const effect = item.effect;
  const value = item.value;

  if (effect === 'heal') {
    player.hp += value;
  } else if (effect === 'currency') {
    if (typeof player.gold !== 'number') player.gold = 0;
    player.gold += value;
  } else if (effect === 'unlock') {
    if (!Array.isArray(player.unlocked)) player.unlocked = [];
    if (!player.unlocked.includes(itemId)) player.unlocked.push(itemId);
  } else {
    throw new Error(`Unknown item effect: ${effect}`);
  }

  // Удаляем предмет из инвентаря после применения.
  player.inventory.splice(idx, 1);

  await saveState(STATE);
  return { ok: true, itemId, effect };
}

export async function initPlayer(CONFIG, STATE) {
  if (!STATE.player) STATE.player = {};

  STATE.player.hp = CONFIG.balance.player_base_hp;
  STATE.player.xp = 0;
  STATE.player.level = 1;
  STATE.player.inventory = [];

  if (!STATE.player.unlocked) STATE.player.unlocked = [];
  if (typeof STATE.player.gold !== 'number') STATE.player.gold = 0;

  STATE.current_room_id = Object.keys(CONFIG.rooms)[0];
  STATE.defeated_enemies = [];
  STATE.session_started_at = new Date().toISOString();

  await saveState(STATE);
  return { ok: true };
}

export function getStatus(CONFIG, STATE) {
  const room = CONFIG.rooms[STATE.current_room_id];
  const player = STATE.player;

  const maxHp = CONFIG.balance.player_base_hp;
  const xpPerLevel = CONFIG.balance.xp_per_level;
  const rawXpToNext = xpPerLevel * player.level - player.xp;
  const xpToNextLevel = rawXpToNext > 0 ? rawXpToNext : 0;

  return {
    currentRoomId: STATE.current_room_id,
    room: room.description,
    hp: player.hp,
    maxHp,
    level: player.level,
    xp: player.xp,
    xpToNextLevel,
    enemies: room.enemies,
    inventory: player.inventory,
    exits: room.exits,
  };
}

