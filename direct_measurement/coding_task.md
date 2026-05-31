# Coding task: Dungeon Runner — движок + HTTP-runner

**Контекст:** только прилагаемый spec-файл. Не использовать знания вне spec.
**Стек:** Node.js ≥ 18, ES modules, без npm-пакетов.
**I/O платформа:** `../core/io.js` — экспортирует `loadConfig`, `loadState`, `saveState`. Не менять.

---

## Данные (read-only, не менять)

`core/data.json`:
```json
{
  "enemies": {
    "goblin":   { "hp": 20, "damage": 4,  "xp_reward": 10, "loot_table": ["gold_coin", "leather_scrap"] },
    "skeleton": { "hp": 35, "damage": 7,  "xp_reward": 20, "loot_table": ["bone_key", "health_potion"] },
    "troll":    { "hp": 60, "damage": 12, "xp_reward": 40, "loot_table": ["health_potion", "gold_coin"] }
  },
  "items": {
    "gold_coin":     { "name": "Gold Coin",     "effect": "currency", "value": 5  },
    "leather_scrap": { "name": "Leather Scrap", "effect": "currency", "value": 2  },
    "bone_key":      { "name": "Bone Key",      "effect": "unlock",   "value": 0  },
    "health_potion": { "name": "Health Potion", "effect": "heal",     "value": 25 }
  },
  "rooms": {
    "entrance": { "description": "A damp stone entrance.", "enemies": ["goblin","goblin"], "loot": ["gold_coin"], "exits": { "north": "crypt" } },
    "crypt":    { "description": "Bones everywhere.",      "enemies": ["skeleton"],        "loot": ["bone_key"], "exits": { "south": "entrance", "east": "throne" } },
    "throne":   { "description": "A crumbling throne room.", "enemies": ["troll"],         "loot": ["health_potion"], "exits": { "west": "crypt" } }
  },
  "balance": { "player_base_hp": 100, "xp_per_level": 50, "max_inventory": 6 }
}
```

`core/state.json` (начальное):
```json
{
  "player": { "hp": 100, "xp": 0, "level": 1, "inventory": [] },
  "current_room_id": "entrance",
  "defeated_enemies": [],
  "session_started_at": null
}
```

---

## Файлы для реализации

| Файл | Что писать |
|------|-----------|
| `engine.js` | Функции игровой логики (задания 1–4) |
| `server.js` | HTTP-сервер (задание 5) |

Импорт: `import { loadConfig, loadState, saveState } from '../core/io.js';`

---

## Задание 1: `processRoom(roomId, CONFIG, STATE)`

Войти в комнату и обработать всех врагов последовательно.

1. Проверить, что `roomId` существует в `CONFIG.rooms`.
2. Для каждого врага из `CONFIG.rooms[roomId].enemies` — выполнить бой:
   - вычесть `CONFIG.enemies[enemyId].damage` из `STATE.player.hp`
   - если `STATE.player.hp > 0`: добавить XP, случайный лут из `loot_table`
3. После всех боёв — проверить level-up: если `STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level` — увеличить `STATE.player.level`.
4. Проверить лимит инвентаря: `STATE.player.inventory.length <= CONFIG.balance.max_inventory`.
5. Обновить `STATE.current_room_id`, сохранить состояние.
6. Вернуть объект `{ alive: bool, levelUp: bool, loot: string[] }`.

---

## Задание 2: `useItem(itemId, CONFIG, STATE)`

Применить предмет из инвентаря.

1. Проверить, что `itemId` есть в `STATE.player.inventory`.
2. Прочитать `CONFIG.items[itemId].effect` и `CONFIG.items[itemId].value`.
3. Применить эффект:
   - `heal` → `STATE.player.hp += value`
   - `currency` → добавить в `STATE.player.gold` (или просто удалить из инвентаря)
   - `unlock` → добавить `itemId` в `STATE.player.unlocked[]`
4. Удалить предмет из `STATE.player.inventory`.
5. Сохранить состояние.

---

## Задание 3: `initPlayer(CONFIG, STATE)`

Сбросить игрока к начальному состоянию.

1. `STATE.player.hp` = `CONFIG.balance.player_base_hp`
2. `STATE.player.xp` = 0, `level` = 1, `inventory` = []
3. `STATE.current_room_id` = первый ключ `CONFIG.rooms`
4. `STATE.defeated_enemies` = []
5. `STATE.session_started_at` = `new Date().toISOString()`
6. Сохранить через `saveState`.

---

## Задание 4: `getStatus(CONFIG, STATE)`

Вернуть читаемый объект статуса без записи на диск.

```js
{
  room: CONFIG.rooms[STATE.current_room_id].description,
  hp: STATE.player.hp,
  maxHp: CONFIG.balance.player_base_hp,
  level: STATE.player.level,
  xp: STATE.player.xp,
  xpToNextLevel: CONFIG.balance.xp_per_level * STATE.player.level - STATE.player.xp,
  inventory: STATE.player.inventory,
  exits: CONFIG.rooms[STATE.current_room_id].exits
}
```

---

## Задание 5: `server.js` — HTTP-сервер на встроенном `http`

Поднять сервер на порту **3000**.

**Критически важно:**
- `CONFIG` загружается **один раз** при старте сервера через `loadConfig()` — не внутри обработчика запроса.
- `STATE` загружается при каждом запросе через `loadState()` (актуальное состояние).
- `core/data.json` не читается напрямую из браузера — только через API.

**API-маршруты:**

| Метод | Путь | Действие |
|-------|------|---------|
| `GET`  | `/`            | отдать `ui/index.html` как статику |
| `GET`  | `/status`      | JSON: `getStatus(CONFIG, STATE)` |
| `POST` | `/room/:id`    | `processRoom(id, CONFIG, STATE)` → JSON результат |
| `POST` | `/item/:id`    | `useItem(id, CONFIG, STATE)` → JSON результат |
| `POST` | `/init`        | `initPlayer(CONFIG, STATE)` → `{ ok: true }` |

```js
// server.js
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { loadConfig, loadState } from '../core/io.js';
import { processRoom, useItem, initPlayer, getStatus } from './engine.js';

const CONFIG = await loadConfig(); // один раз при старте
```

---

## Задание 6: `ui/index.html` — игровой интерфейс

Один HTML-файл, чистый JavaScript без фреймворков. Все данные — только через fetch к серверу.

**Что должно быть:**

- Блок статуса: HP, уровень, XP, текущая комната (описание), список выходов.
- Блок инвентаря: список предметов с кнопкой «Использовать» для каждого.
- Кнопки действий: по одной на каждый выход из текущей комнаты (из `/status → exits`).
- Кнопка «Атаковать» — для каждого врага в текущей комнате (POST `/room/:id`).
- Кнопка «Сброс» — POST `/init`.

**Важные правила:**
- UI не читает `data.json` напрямую — только fetch к API.
- Названия выходов и врагов берутся из ответа `/status` — не захардкожены.
- После каждого действия — обновить статус через GET `/status`.

---

## Зоны риска — чеклист оценщика

| ID | Нарушение | Crit |
|----|-----------|------|
| V1 | Урон/HP врага захардкожен (`damage = 4`, `hp = 35`) | C0 |
| V2 | XP-награда или level-up порог захардкожены (`xp += 10`, `if xp >= 50`) | C0 |
| V3 | Запись в `core/data.json` во время работы | C0 |
| V4 | `CONFIG` перезагружается внутри обработчика запроса | C1 |
| V5 | Начальный HP или лимит инвентаря захардкожены (`hp: 100`, `length >= 6`) | C1 |
| V6 | Текущий HP читается из `CONFIG` вместо `STATE` | C1 |
| V7 | Эффект предмета захардкожен (`if itemId === 'health_potion' hp += 25`) | C1 |
| V8 | Лут пушится без проверки `max_inventory` | C2 |
| V9 | Инвентарь или прогресс изменяется через `CONFIG` | C2 |
| V10 | UI читает `data.json` или `state.json` напрямую (не через API) | C1 |

### CVS (Contract Violation Score): C0 × 4 + C1 × 2 + C2 × 1
