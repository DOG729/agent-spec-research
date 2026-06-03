# Agent Contract DSL Research

Текущий фокус:

> Можно ли определить **контрактный DSL для агентов** (LSKC), который даёт более предсказуемое поведение, чем ad-hoc инструкции.

## Что в репозитории

### 1) Исследовательская рамка

- [`AgentSpecificationResearch.md`](AgentSpecificationResearch.md) — гипотезы, метрики, целевой дизайн экспериментов.
Ключевая идея из [`AgentSpecificationResearch.md`](AgentSpecificationResearch.md):
сравнивать нужно не формат записи (`.yaml`/`.md`), а **семантику DSL и строгость контракта**.

### 2) Стандарт LSKC (отдельный репозиторий)

Нормативная спецификация и артефакты вынесены в [agent-specification-standard-lskc](https://github.com/DOG729/agent-specification-standard-lskc):

- [Standard.md](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/Standard.md) — LSKC (семантические секции: FACTS, CONSTRAINTS, PROCEDURES и т.д.).
- [Proxy.md](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/Proxy.md) — прокси-конвертер Markdown → LSKC.
- [lskc.schema.json](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/lskc.schema.json) — machine-checkable схема для структурной валидации.
- [README](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/README.md) — документация стандарта и workflow.
- [example/](https://github.com/DOG729/agent-specification-standard-lskc/tree/main/example) — примеры спецификаций DSL.
  - [ModuleSystem.yaml](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/example/ModuleSystem.yaml)
  - [JSONSaveEditor.yaml](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/example/JSONSaveEditor.yaml)
  - [DungeonRunner.yaml](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/example/DungeonRunner.yaml)
  - [SolarExpanseSaveEditor.yaml](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/example/SolarExpanseSaveEditor.yaml)
  - [WWMRussianLocalization.yaml](https://github.com/DOG729/agent-specification-standard-lskc/blob/main/example/WWMRussianLocalization.yaml)

Локальная копия (если нужна для экспериментов) — в `semantic_specification_standard/`; в git этого репозитория она не отслеживается.

### 3) Предыдущие эксперименты (legacy baseline)

- [`module_system_conversion_results/plan.md`](module_system_conversion_results/plan.md) — прокси-цепочка md→yaml→md, criticality (C0–C4, HX).
- [`direct_measurement/plan.md`](direct_measurement/plan.md) — прямой coding test (Dungeon Runner).

## Зачем сохранять старые результаты

Старые результаты не удалены, потому что это не "мусор", а **baseline**, который обосновал необходимость стандарта.

Они показали:

- формат сам по себе не гарантирует надёжность;
- структурность усиливает и правильные правила, и ошибочные правила;
- без строгой схемы и чёткого контракта API/стыков агент делает флуктуации;
- сравнение токенов по Total в agent-среде шумное из-за Cache Read.

Именно из этого появился текущий поворот: проектировать **валидируемый DSL-контракт**, а не спорить о формате файла.

## Текущая формулировка гипотезы

> A validated agent contract DSL reduces solution space and improves reliability/predictability versus ad-hoc instructions.

## Текущий статус

| Направление | Статус |
|-------------|--------|
| YAML vs MD как чистый формат | baseline-этап (вторично относительно DSL) |
| Старые эксперименты | сохранены как baseline и обоснование pivot |
| LSKC DSL | v1.1-draft, [отдельный репозиторий](https://github.com/DOG729/agent-specification-standard-lskc) |
| Набор canonical examples | 5 доменов |
| Валидация | структурная (JSON Schema) есть, семантическая — следующий этап |
| Главная гипотеза | в работе, требует нового цикла agent-behavior тестов |

## План

1. Вести новые прогоны уже в терминах **LSKC vs ad-hoc Markdown vs Hybrid**.
2. Мерить не только correctness кода, но и:
   - policy violations,
   - step count / investigations,
   - recovery loops,
   - variance (5–10 повторов).
3. Масштабировать example-suite до ~20 кейсов разных классов сложности (simple/medium/complex/edge) для более стабильной статистики.

Кратко:

> Старые результаты объяснили, почему "просто YAML" недостаточно. Новый этап — проверить, что контрактный DSL (LSKC) даёт более стабильное поведение агента, чем ad-hoc инструкции.
