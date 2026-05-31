import { saveState } from '../core/io.js';

/**
 * Задание 1: Войти в комнату и обработать всех врагов.
 */
export async function processRoom(roomId, CONFIG, STATE) {
  if (!CONFIG.rooms[roomId]) {
    throw new Error('Room not found');
  }

  const room = CONFIG.rooms[roomId];
  const newLoot = [];
  let levelUp = false;

  for (const enemyId of room.enemies) {
    const enemy = CONFIG.enemies[enemyId];
    
    // Получаем урон от врага
    STATE.player.hp -= enemy.damage;

    if (STATE.player.hp <= 0) {
      STATE.player.hp = 0;
      break;
    }

    // Награда за победу
    STATE.player.xp += enemy.xp_reward;
    
    // Случайный лут
    const lootIndex = Math.floor(Math.random() * enemy.loot_table.length);
    const item = enemy.loot_table[lootIndex];
    
    if (STATE.player.inventory.length < CONFIG.balance.max_inventory) {
      STATE.player.inventory.push(item);
      newLoot.push(item);
    }
  }

  // Проверка повышения уровня
  if (STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level) {
    STATE.player.level += 1;
    levelUp = true;
  }

  STATE.current_room_id = roomId;
  await saveState(STATE);

  return {
    alive: STATE.player.hp > 0,
    levelUp,
    loot: newLoot
  };
}

/**
 * Задание 2: Применить предмет из инвентаря.
 */
export async function useItem(itemId, CONFIG, STATE) {
  const itemIndex = STATE.player.inventory.indexOf(itemId);
  if (itemIndex === -1) {
    return { success: false, message: 'Item not in inventory' };
  }

  const itemConfig = CONFIG.items[itemId];
  const { effect, value } = itemConfig;

  if (effect === 'heal') {
    STATE.player.hp += value;
    // Ограничим HP базовым значением, если это подразумевается (в спеке не сказано)
    if (STATE.player.hp > CONFIG.balance.player_base_hp) {
      STATE.player.hp = CONFIG.balance.player_base_hp;
    }
  } else if (effect === 'currency') {
    if (!STATE.player.gold) STATE.player.gold = 0;
    STATE.player.gold += value;
  } else if (effect === 'unlock') {
    if (!STATE.player.unlocked) STATE.player.unlocked = [];
    if (!STATE.player.unlocked.includes(itemId)) {
      STATE.player.unlocked.push(itemId);
    }
  }

  // Удаляем предмет
  STATE.player.inventory.splice(itemIndex, 1);
  
  await saveState(STATE);
  return { success: true, item: itemId, effect };
}

/**
 * Задание 3: Сбросить игрока к начальному состоянию.
 */
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
  return { ok: true };
}

/**
 * Задание 4: Вернуть читаемый объект статуса.
 */
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
