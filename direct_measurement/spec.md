# Dungeon Runner — Game Spec

Node.js ≥ 18, ES modules, no npm packages. All persistence via `fs/promises`.

---

## Two JSON files, two purposes

The game uses exactly two JSON files. **Never mix their roles.**

**`data.json`** is the game design document. It holds everything a designer controls:
enemy stats, item definitions, room layouts, and balance numbers like starting HP or
XP needed to level up. This file is **read once at startup** and never written to during
a session. Treat it as a constant.

**`state.json`** is the save file. It holds everything that changes as the player plays:
current HP, XP, level, inventory contents, position in the dungeon, list of defeated
enemies. This file is read at session start and saved after every meaningful action.

--- 

## What goes where

| Data | Correct file | Notes |
|------|-------------|-------|
| Goblin damage value | `data.json` | Balance — designer controls this |
| XP reward for killing skeleton | `data.json` | Balance |
| Player's current HP | `state.json` | Changes during combat |
| Player's current inventory | `state.json` | Changes when loot is picked up |
| Player's level | `state.json` | Changes when XP threshold is reached |
| `player_base_hp` | `data.json` | Used **only** when creating a new player |
| Room descriptions and enemy lists | `data.json` | Static content |
| Which room the player is in now | `state.json` | Runtime position |

---

## File layout

| File | Mutability | Purpose |
|------|-----------|---------|
| `core/data.json` | **read-only** | Static game config |
| `core/state.json` | **read-write** | Runtime player state |
| `core/io.js` | do not modify | Shared I/O platform: `loadConfig`, `loadState`, `saveState` |
| `engine.js` | implement | All game logic: combat, rooms, items, progression |
| `server.js` | implement | HTTP server on port 3000; `CONFIG` loaded **once** at startup |
| `ui/index.html` | implement | Browser UI; all data via API fetch only |

## How to read data in code

Load `data.json` once via `loadConfig()` at **server startup**. Store as a module-level
constant `CONFIG`. **Never call `readFile('data.json')` inside a request handler or
engine function.** Pass `CONFIG` as a parameter.

Load `state.json` via `loadState()` at the start of **each request** to get the latest
state. After any mutation, call `saveState(STATE)`.

The browser UI **never** reads `data.json` or `state.json` directly — all data comes
through the HTTP API.

---

## Combat rules

When a player fights an enemy:
- The **damage dealt** comes from `CONFIG.enemies[id].damage`.
- The **XP reward** comes from `CONFIG.enemies[id].xp_reward`.
- The **loot** is picked randomly from `CONFIG.enemies[id].loot_table`.
- The **player's HP** is decremented in `STATE.player.hp`.

There must be **no numeric literals** in the combat logic of `engine.js`. Every number
comes from `CONFIG`. If you find yourself writing `damage -= 7` you are doing it wrong.

## Progression (level-up)

After gaining XP, check if the player levels up:
- Threshold comes from `CONFIG.balance.xp_per_level`.
- Level is stored in `STATE.player.level`.
- Rule: level up when `STATE.player.xp >= CONFIG.balance.xp_per_level * STATE.player.level`.

Never hardcode the XP threshold (e.g. `if xp >= 50`). Read it from `CONFIG`.

## Inventory capacity

Before pushing loot, check:
- Max capacity comes from `CONFIG.balance.max_inventory`.
- Current inventory is `STATE.player.inventory`.
- If full, drop the item silently.

Never hardcode the limit (e.g. `if inventory.length >= 10`).

## Item effects

Each item has an `effect` field in `CONFIG.items[id]`:
- `currency` — accumulate value in STATE, no HP change.
- `heal` — add `CONFIG.items[id].value` to `STATE.player.hp`.
- `unlock` — set a flag in STATE for door/exit logic.

Effect type and value always come from `CONFIG.items[id]`. Never hardcode per item id.

---

## Adding new enemies or items

Any new enemy type or item type **must have a `data.json` entry** before code can
reference its id. You cannot define `{ hp: 30, damage: 6 }` inline in a JavaScript file
and use it as an enemy. The id must exist in `data.json` first.

---

## Known constraints

- `CONFIG` is read-only. Mutating it at runtime causes desync between what the code
  thinks and what `data.json` says.
- `core/state.json` is the **only file the game writes to** during a session.
- Balance values live in `data.json` specifically so they can be tuned without touching code.
- Referencing an id that has no `data.json` entry will fail at runtime.

---

## Do not

- Hardcode damage, HP, XP, item values, or thresholds as literals — read from `CONFIG`.
- Write to `data.json` at runtime — it is read-only.
- Read the player's current HP, level, or inventory from `data.json` — use `STATE`.
- Read enemy stats or balance values from `state.json` — use `CONFIG`.
- Call `fs.readFile('data.json')` inside a request handler — load once at startup.
- Define an enemy or item inline in JavaScript without a `data.json` entry.
- Store config keys and state keys in the same JSON file.
- Fetch `data.json` or `state.json` directly from the browser — use the API only.
