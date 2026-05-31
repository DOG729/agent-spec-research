# Прямое измерение: удержание контракта при интерпретации LLM

---

## Цель

**Прокси-измерение** (фаза конвертации) проверяло, сколько фактов выживает при md→yaml→md.
Оно не отвечает на вопрос:

> **Насколько хорошо формат спеки удерживает контракт, когда LLM использует её для генерации кода?**

Формат может идеально сохранять текст и при этом не помогать LLM правильно выбирать
источник данных, слой, API. Прямое измерение фиксирует **нарушения контракта в коде**,
а не потери при конвертации.

---

## Домен эксперимента

**Dungeon Runner** — мини-игра на Node.js с двумя слоями данных:

| Слой | Файл | Роль |
|------|------|------|
| Config | `data.json` | статика: характеристики врагов, предметов, комнат, баланс |
| State | `state.json` | runtime: HP игрока, позиция, инвентарь, прогресс |

Ключевой контракт: **не захардкоживать значения в коде** и **не путать слои**.  
Это создаёт чёткие, детектируемые нарушения для измерения.

---

## Гипотеза

`yaml`-формат (spec.yaml) удерживает контракт при генерации кода лучше, чем `md`-формат (spec.md),
если оба файла содержат идентичные факты.

**Нулевая:** разницы в количестве нарушений нет.

---

## Протокол

```text
[spec.md]   ─┐
              ├─ + [coding_task.md] ──▶ LLM ──▶ [code_md.js]   ──▶ violation checker
[spec.yaml] ─┘                                  [code_yaml.js]
```

### Условия прогона

| Параметр | Значение |
|----------|----------|
| Входной контекст | **только** spec-файл + `coding_task.md` |
| Запрет | не читать другие файлы проекта; не опираться на prior knowledge о домене |
| Среда | тестировалось в IDE Cursor через Agent/Composer |
| Модели | одинаковые для обеих групп; минимум 3 независимых прогона |
| Temperature | не фиксировалась; Cursor default/unknown |
| Reasoning | фиксировать (Medium / Low); для контроля стохастики — повторные прогоны одной модели с тем же reasoning |
| Оценщик | независимый; не знает, какой формат был входом |
| Эталон | нарушения считаются по `violation_rubric` + functional checklist (I1–I3) |

### Файлы эксперимента

| Файл | Роль |
|------|------|
| `spec.md` | spec в md-формате → вход группы A |
| `spec.yaml` | spec в yaml-формате → вход группы B; те же факты |
| `coding_task.md` | задача на код; одна для обеих групп |
| `results/<run>/code_md.js` | сгенерированный код группы A |
| `results/<run>/code_yaml.js` | сгенерированный код группы B |

---

## Violation rubric

| ID | Нарушение | Crit | Как детектировать |
|----|-----------|------|-------------------|
| V1 | Урон/HP врага захардкожен (`damage = 4`, `hp = 20`) | C0 | литерал в combat-логике вместо `CONFIG.enemies[id].damage` |
| V2 | XP/loot-награда захардкожена | C0 | литерал вместо `CONFIG.enemies[id].xp_reward` / `loot_table` |
| V3 | Запись в `data.json` во время игры | C0 | `writeFile('data.json', ...)` в любом месте |
| V4 | Текущий HP читается из CONFIG, не STATE | C1 | `CONFIG.balance.player_base_hp` как current HP (не инициализация) |
| V5 | `data.json` перезагружается внутри функции | C1 | `readFile('data.json')` внутри engine-функции после startup |
| V6 | Начальный HP захардкожен при инициализации | C1 | `hp: 100` вместо `CONFIG.balance.player_base_hp` |
| V7 | Новый тип сущности определён inline в коде | C2 | объект с `hp/damage` прямо в `.js`, без записи в `data.json` |
| V8 | Инвентарь или прогресс изменяется в CONFIG | C2 | `CONFIG.player.inventory.push(...)` или аналог |
| V9 | UI читает `data.json` / `state.json` напрямую | C1 | `fetch('.../data.json')` в `ui/index.html` |
| V10 | Инвентарь/прогресс мутируется через CONFIG | C2 | см. V8 (дубль для coding_task) |
| V11 | Schema mismatch UI↔engine в `/status` | C1 | поле room id в `getStatus` ≠ поле, которое читает UI |

### Functional checklist (вне CVS, доставка)

| ID | Проверка | Как детектировать |
|----|----------|-------------------|
| I1 | Поле id комнаты в `getStatus` | grep `roomId` / `currentRoomId` в `engine.js` |
| I2 | UI использует то же поле | grep в `ui/index.html` |
| I3 | I1 === I2 | match / mismatch |
| I4 | Атака в entrance (2× goblin) | клик «Атаковать» → HP меняется; второй goblin не no-op |
| F1 | Игра запускается, `/init` + `/status` | ручной smoke |

### Агрегат

| Метрика | Формула |
|---------|---------|
| **CVS** (Contract Violation Score) | сумма: C0 × 4 + C1 × 2 + C2 × 1 |
| **Max crit** | максимальный уровень нарушения в прогоне |
| **Violation rate** | кол-во сработавших V1–V8 / 8 |

### Сводная таблица (8 прогонов)

Оценка: ручной просмотр `engine.js`, `server.js`, `ui/index.html` (2026-05-31).

| Прогон | Модель | Reasoning | Проект | fmt | V1–8 | V11 | CVS | I3 | I4 | F1 | Токены | UI | Ключевое |
|--------|--------|-----|--------|-----|------|-----|-----|----|----|-----|--------|-----|----------|
| run1 | Composer | Med | `project_md_1` | md | 0 | — | 0 | ✓ | ✓ | ✓ | 153.5k | 5/10 | — |
| run1 | Composer | Med | `project_yaml_1` | yaml | 0 | — | 0 | ✓ | ✓ | ✓ | 86.3k | 5/10 | −44% tok; бой без stop hp≤0 |
| run2 | GPT-5.5 | Med | `project_md_2` | md | 0 | — | 0 | ✓ | ✓ | ✓ | 225.2k | 2/10 | Input 23,6k; JSON result |
| run2 | GPT-5.5 | Med | `project_yaml_2` | yaml | 0 | — | 0 | ✓ | ✓ | ✓ | 200.2k | 6/10 | Total −11%; Input −46%; лучший UI |
| run3 | Nano | Med | `project_md_3` | md | 0 | — | 0 | ✓ | ✓ | ✓ | 279.5k | 2/10 | sync; `getZeroAndOne`; перефарм |
| run3 | Nano | Med | `project_yaml_3` | yaml | 0 | **✓** | **2** | **✗** | ✗ | ~ | 216.5k | 2/10 | **V11** `currentRoomId`≠`roomId`; async; duplicate skip ✓ |
| run4 | Nano | Low | `project_md_4` | md | 0 | — | 0 | ✓ | **✗** | ~ | 349.5k | 2/10 | skip defeated **by id** → 2× goblin |
| run4 | Nano | Low | `project_yaml_4` | yaml | 0 | — | 0 | ✓ | ✓ | ✓ | 268.1k | 2/10 | −23% tok; перефарм при повторе |

**Легенда:** V1–8 = число сработавших из 8 (слои CONFIG/STATE). V11 «✓» = mismatch сработал.  
**CVS** = C0×4 + C1×2 + C2×1 (V1–V11). I3 = поле room id engine↔UI. I4 = entrance 2× goblin. F1 = smoke. Reasoning = режим рассуждения модели, не temperature.  
**~** = частично (запуск есть, атака/entrance с дефектом).

### Что проверялось по V1–V8 (все 8 прогонов — pass по слоям CONFIG/STATE)

| ID | Проверка | Результат |
|----|----------|-----------|
| V1 | combat: `enemy.damage` из CONFIG, без литералов урона/HP врага | pass (8/8) |
| V2 | XP/loot: `xp_reward`, `loot_table` из CONFIG | pass (8/8) |
| V3 | нет `writeFile('data.json')` | pass (8/8) |
| V4 | текущий HP только из `STATE.player.hp` (не CONFIG в бою) | pass (8/8) |
| V5 | нет повторного `readFile('data.json')` в engine/handler | pass (8/8) |
| V6 | init HP: `CONFIG.balance.player_base_hp` (не `hp: 100`) | pass (8/8) |
| V7 | нет inline `{ hp, damage }` сущностей в `.js` | pass (8/8) |
| V8 | нет мутаций CONFIG (inventory/progress) | pass (8/8) |

**V11 (schema UI↔engine):** сработал только в `project_yaml_3` (1/8).  
**Не вошло в CVS:** логика боя при смерти, `defeated_enemies` + duplicate enemy id, `level: 1` при init, перефарм комнаты.

**Пороги:** C0 в yaml — нет ни в одном прогоне; **yaml CVS < md CVS** — **не выполнено** (с V11: md сумма 0, yaml 2 — единичный прогон, n=1 на ячейку); разница форматов по **слоям** **не значима**; по **доставке** — **flaky**, не систематически в пользу md или yaml.

### Дыры в spec / coding_task (общие для md и yaml)

| Пробел | Эффект |
|--------|--------|
| `getStatus` в `coding_task.md` без `roomId`, `enemies[]` | модель выбирает имя поля сама → V11 |
| `POST /room/:id` без пояснения «id = текущая комната» | UI путает room id и enemy id |
| `entrance.enemies: ["goblin","goblin"]` без правила duplicate id | md_4: `defeated_enemies.includes(id)` ломает второго goblin |
| Кнопка «на каждого врага» vs API «комната целиком» | семантический разрыв UX ↔ engine |

### Агрегаты по токенам

См. колонку **Токены** (= Cursor **Total**, incl. Cache Read). yaml vs md Total: run1 −44%, run2 −11%, run3 −23%, run4 −23%.  
run2 (GPT-5.5, есть разбивка): Input md 23,6k / yaml 12,7k (**−46%**); Output ~5,2–5,5k.  
Nano Reasoning Low > Medium по Total (+25% md, +24% yaml) — cost не монотонен по reasoning.

### Nano — контроль reasoning (run3 vs run4)

| | run3 Reasoning Medium | run4 Reasoning Low |
|---|-------------|----------|
| md | F1 ✓, I3 ✓ | F1 частично, I4 ✗ (`defeated_enemies` by id) |
| yaml | F1 частично, V11 ✗ | F1 ✓, I3 ✓ |

**Вывод контроля:** картина **инвертируется** (md ломается / yaml чинится) при смене reasoning → баг доставки **не предсказывается форматом spec**; n=1 на ячейку недостаточно для «yaml хуже» или «md надёжнее».

### Замечания вне rubric (не CVS)

| Проект | Замечание | Crit |
|--------|-----------|------|
| `project_yaml_1` | `processRoom` не прерывает цикл при `hp <= 0` — бой с остальными врагами продолжается | поведение |
| `project_md_1`, `project_yaml_1` | `defeated_enemies` не пополняется в `processRoom` (в init — да) | C2? / incomplete |
| `project_md_2`, `project_yaml_2` | `defeated_enemies.push` в бою — ближе к spec | — |
| `project_md_3` | `saveState` без `await`; sync engine — гонка записи state | надёжность |
| `project_md_3` | `getZeroAndOne()` — 0/1 через CONFIG (обход «no literals») | хитрость, не V1 |
| `project_yaml_3` | **V11:** UI `data.roomId`, API `currentRoomId` → POST `/room/undefined` | C1 / интеграция |
| `project_yaml_3` | `processRoom`: skip по счётчику duplicate id — корректнее md_4, но no-op при повторе | поведение |
| `project_md_4` | **I4:** `defeated_enemies.includes(enemyId)` — второй `goblin` в entrance пропускается; повторный клик no-op | логика |
| `project_md_4` | UI комментирует skip defeated — модель «знала» про проблему, реализация всё равно ломает duplicate id | — |
| `project_yaml_4` | нет skip в `processRoom` — атака работает, но повторный клик перефармит всю комнату | поведение |
| `project_yaml_4` | `server.js` тяжелее md_4; `parts[1]` без `decodeURIComponent` | стиль |
| все 8 | CONFIG один раз в server; combat из `CONFIG.enemies` | ok |

### Предварительный вывод (n=4 tier: strong + Nano×2 reasoning)

1. **V1–V8:** **8/8 прогонов — 0** по слоям CONFIG/STATE; формат md vs yaml **не разделяет** контракт слоёв.
2. **V11 / I3:** 1/8 (только yaml_3); **доставка flaky** — run3 yaml сломан, run4 yaml OK; run3 md OK, run4 md сломан.
3. **Total токены** yaml ниже md (run1 −44%, run2 −11%, run3−4 −23%); **Input** run2 −46% — сильнее сигнал формата; Total доминирует Cache Read.
4. **Гипотеза «yaml удерживает контракт лучше»** — **не подтверждена** по V1–V11/F1; token economy — слабый/частичный сигнал.
5. **GPT-5.4 Nano создал больше шума:** run3/run4 лучше считать артефактом очень маленькой модели в Cursor Agent, а не устойчивым сигналом формата.
6. **Spec хорош для слоёв, слаб для API** — нужно дописать `getStatus` schema в `coding_task.md` для честного A/B.
7. **Следующее:** репликация Nano ×5 на Medium (обе группы); Gemma/gpt-oss; опционально run5 с уточнённым spec.
8. Gemini 3 — выбыл (игнор промпта, тестирование); md 185.8k — без yaml-пары.

### run3 — GPT-5.4 Nano Reasoning Medium: сравнение кода

| Область | md_3 | yaml_3 |
|---------|------|--------|
| **Игра / F1** | работает | атака сломана |
| **V11 I1→I2** | `roomId` → `data.roomId` ✓ | `currentRoomId` → `data.roomId` ✗ |
| **Строк кода** | engine 138, server 75, ui 200 | engine 155, server 113, ui 169 |
| **async** | sync; `saveState` без await | async; `await saveState` |
| **init level** | `getZeroAndOne()` → level из CONFIG | literal `level: 1` |
| **processRoom** | все враги за POST; defeated push, **без skip** | skip duplicate id **по индексу**; умнее |
| **level-up** | один `if` | `while` (multi level-up) |
| **useItem return** | полный `getStatus()` | `{ ok, itemId, effect }` |
| **server** | минимальный | preload HTML, `Content-Length`, `readJsonBody` |
| **UI** | grid + `#lastResult` JSON | 3 card; нет JSON panel |
| **Баг** | перефарм при повторной атаке | `POST /room/undefined` |

Примечание: yaml_3 engine **лучше** по duplicate goblin, но V11 блокирует доставку. md_3 «выиграл» случайным `roomId`, не форматом spec.

### run4 — GPT-5.4 Nano Reasoning Low (контроль reasoning)

| | md_4 | yaml_4 |
|---|------|--------|
| CVS (V1–V8) | 0 | 0 |
| V11 | нет | нет |
| I3 | match (`roomId`) | match (`roomId`) |
| F1 / I4 | частично — второй goblin no-op | да |
| Токены | 349.5k | 268.1k (−23%) |
| Engine | sync; skip defeated **by id** (баг duplicate); levelInc через `base/base` | sync; **нет** skip defeated; while level-up; `level: 1` |
| UI | `status.roomId`; комментарий про skip defeated | `status.roomId`; JSON result area |
| Server | компактный, `decodeURIComponent` | verbose, `path`/`existsSync` |

### Резерв (run5+)

| Прогон | Модель | Reasoning | Формат | V1–V8 | V11 | CVS | F1 | Примечание |
|--------|--------|------|--------|-------|-----|-----|-----|------------|
| run5a…e | Nano | Med | md | — | — | — | — | репликация контроля |
| run5a…e | Nano | Med | yaml | — | — | — | — | репликация контроля |
| run6 | * | * | * | — | — | — | — | spec + `roomId`/`enemies` в coding_task |

`—` = прогон не проводился.

---

## Метрики успеха

| Критерий | Порог | Статус (8 прогонов) |
|----------|-------|---------------------|
| yaml CVS < md CVS | разница ≥ 4 (≥ 1 C1) | **не выполнено** (yaml 2 vs md 0 — один V11, n=1) |
| Нет C0 в yaml-группе | необходимый минимум | **выполнено** |
| Max crit yaml ≤ C1 | yaml-спека пригодна как контекст | **выполнено** (max C1) |
| F1 smoke md = yaml | одинаковая доля pass | **не выполнено** (flaky, 2/4 ячейки Nano) | 

---

## Связь с прокси-этапом

| Находка из конвертации | Ожидаемый сигнал здесь |
|------------------------|------------------------|
| F03 (C0, test2): хелперы перепутаны в `runtime_overrides` | V1/V2 — путаница слоёв в коде |
| F12/F14 (C1): path warning усечён | V4 — путаница CONFIG/STATE |
| HX (test2): healing в L3 | проверить, компенсирует ли LLM дефект yaml при генерации кода |
