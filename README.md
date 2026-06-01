# Structured Agent Specs — итоги исследований

Этот репозиторий фиксирует два связанных эксперимента о том, помогает ли структурированный YAML-контракт агентам лучше удерживать правила, чем обычный Markdown.

Главная гипотеза из [`AgentSpecificationResearch.md`](AgentSpecificationResearch.md): преимущество может быть не в YAML как синтаксисе, а в том, что **структурированный контракт сужает пространство решений агента**.

## 1. Прокси-эксперимент: `module_system`

Подробный журнал: [`module_system_conversion_results/plan.md`](module_system_conversion_results/plan.md).

Что проверялось:

- цепочка `module_system.md` → YAML → reverse Markdown;
- сколько фактов и ограничений сохраняется при преобразовании;
- где появляются критичные потери: C0–C4 и HX (`healing`).

Ключевые результаты:

- Лучший YAML для дальнейшего использования агентом: `module_system_conversion_results/test3/module_system-TEST.yaml`.
- `test3` удержал смысл достаточно хорошо: max crit в L2 = C2.
- `test2` непригоден как кодовая спека: C0 из-за смешения helpers в `runtime_overrides`.
- Reverse Markdown нельзя оценивать наивно: `L3 vs L1` смешивает потери разных фаз; корректнее сначала смотреть `L3 vs L2`.
- HX важен: модель может "починить" текст при обратной генерации Markdown, но это не доказывает качество исходного YAML.

Вывод:

> Конвертация Markdown → YAML может дать пригодный структурированный контракт, но только при проверке criticality. YAML усиливает контракт, но усиливает и ошибку в контракте: неверно разложенные слои выглядят для агента как авторитетное правило.

## 2. Прямой эксперимент: `direct_measurement`

Подробный протокол: [`direct_measurement/plan.md`](direct_measurement/plan.md).

Среда: IDE Cursor, Agent/Composer. Temperature не фиксировалась (`Cursor default/unknown`), фиксировался только Reasoning (`Medium` / `Low`).

Что проверялось:

- генерация мини-игры Dungeon Runner из `spec.md` vs `spec.yaml`;
- удержание контракта CONFIG/STATE;
- нарушения V1–V11, smoke/F1, schema mismatch UI↔engine;
- токены Cursor Total и, где есть, Input/Output.

Ключевые результаты:

- По слоям CONFIG/STATE все 8 прогонов прошли: `V1–V8 = 0`.
- YAML не показал устойчивого преимущества по надёжности кода.
- Доставка flaky: `project_yaml_3` сломался на `currentRoomId` vs `roomId`, `project_md_4` сломался на duplicate `goblin`.
- Основная дырка была не в формате, а в задаче: `coding_task.md` не задавал схему `/status` (`roomId`, `enemies[]`) и семантику duplicate enemy id.
- По токенам есть сигнал в пользу YAML, но Cursor Total сильно доминируется Cache Read. Самый чистый фрагмент: run2 GPT-5.5 Input md 23,6k vs yaml 12,7k.

Вывод:

> На хорошо описанном coding task YAML не доказал лучшего удержания контракта. Он может быть дешевле по Input, но надежность доставки определялась пробелами API-контракта и стохастикой агентской среды.

## Общий итог

Сильный вывод пока **не доказан**:

> Structured contracts improve reliability and predictability of agent behavior.

Что уже видно:

- YAML/structured format помогает компактно выражать правила и потенциально снижает Input.
- Если контракт неполный, структура не спасает: агент всё равно выбирает имена полей и стыки сам.
- Прямое сравнение Total-токенов в Cursor Agent надо трактовать осторожно из-за Cache Read и разного числа шагов.
- Для production-like спеки важнее не "похоже на YAML", а отсутствие C0/C1 по criticality.

Текущий статус:

| Направление | Итог |
|-------------|------|
| Конвертация md→yaml→md | полезно как прокси, но требует criticality-разбора |
| Генерация кода md vs yaml | по CONFIG/STATE разницы нет |
| Надёжность доставки | flaky, не привязана устойчиво к формату |
| Токены | YAML выглядит дешевле, но Total шумный |
| Главная гипотеза | не подтверждена и не опровергнута |

## Что делать дальше

Следующий тест должен быть не про обычную генерацию мини-приложения, а про **агентское поведение**:

- policy compliance;
- число tool calls / investigations;
- recovery loops;
- запреты вроде "не запускать тесты" или "не читать другие файлы";
- API-first vs browser fallback;
- variance на 5–10 повторных прогонах.

Следующий этап:

1. Взять лучший структурированный контракт (`module_system` test3-style).
2. Сконструировать задачу с явными агентскими ловушками.
3. Провести 5–10 прогонов Markdown vs YAML vs Hybrid в Cursor Agent.
4. Считать не только code correctness, но и policy violations, steps, recovery behavior, Input/Output, variance.

Кратко:

> Dungeon Runner показал, что обычная кодогенерация слишком мягкая для главной гипотезы. Следующий честный тест должен мерить именно поведение агента во времени.

### Заметки
Надо улучшить спецификацию YAML
