# navigator-module-system — спецификация модуля

> Обратная конвертация из `module_system-TEST.yaml`  
> Стандарт: `yaml_spec_convention-mini.yaml`, convention_version: 1, version: 2

---

## Стек

| Компонент | Версия |
|-----------|--------|
| PHP | >=8.2 |
| Laravel | 12.x/13.x |
| Filament | 5.x |

---

## Факты

### Корневая директория модулей

- **root:** `modules/`

### Структура каталогов

| Путь | Обязателен | Назначение |
|------|:----------:|------------|
| `modules/<ModuleName>/module.json` | да | метаданные и контракт модуля |
| `modules/<ModuleName>/env.json` | нет | типизированные UI-дефолты настроек |
| `modules/<ModuleName>/Providers/*ServiceProvider.php` | — | service providers модуля |
| `modules/<ModuleName>/Database/Migrations/*.php` | — | миграции модуля |
| `modules/<ModuleName>/Database/Seeders/*.php` | нет | сидеры модуля |
| `modules/<ModuleName>/Filament/Admin/Resources/*` | — | Filament admin resources |
| `modules/<ModuleName>/Filament/Settings/*` | — | Filament settings UI |
| `modules/<ModuleName>/Filament/Install.php` | нет | wizard install UI |

### Контракт путей

| Параметр | Значение |
|----------|----------|
| Текущее ожидаемое значение в БД | `modules/<ModuleName>` |
| Разрешение в ФС | `Module::getFullPath() -> base_path(path)` |
| Предупреждение | сохранять согласованность путей в seeders, installer и autodiscovery |

### Манифест модуля (`module.json`)

**Обязательные поля:**

- `name: string`
- `providers: string[]`

**Часто используемые поля:**

- `display_name`
- `description`
- `version`
- `priority`
- `is_core: bool` — читается из JSON, а не из БД
- `dependencies.required`
- `dependencies.optional`
- `dependencies.conflicts`
- `navigation.items`
- `migrations.path`
- `seeders[]`
- `install`
- `skip_install`

**Заметки:**

- `slug` — legacy-метаданные, runtime не требует

### Поддерживаемые типы UI-настроек

`text`, `textarea`, `checkbox`, `radio`, `select`, `multiselect`, `file`, `multifile`

### Интеграция с Filament

| Элемент | Путь |
|---------|------|
| Provider | `app/Providers/Filament/AdminPanelProvider.php` |
| Resource | `app/Filament/Admin/Resources/ModuleResource.php` |

**Поведение:**

- активные модули из БД используются для autodiscovery Filament resources, pages и widgets по path и namespace модуля
- fallback без БД: сканирование filesystem core modules

**Действия:**

- `install_wizard` — для модулей с `install: true`
- `install_from_fs` — для модулей без wizard
- групповые: activate, deactivate, clear cache, edit, delete

**Заметки:**

- основные identity-поля модуля в production информационные и не должны свободно редактироваться

### Хелперы

**Файл:** `bootstrap/helpers.php`

**Структура:**

- `bootstrap/helpers/lang.php`
- `bootstrap/helpers/module.php`
- `bootstrap/helpers/media.php`
- `bootstrap/helpers/error.php`

**Ключевые функции:**

- `isModule(name)`
- `getModule(name)`
- `getActiveModules()`
- `moduleConfig(name, key, default)`
- `moduleEnv(name, key, default)`
- `moduleSetting(name, key, default)`
- `getModuleDependencies(name, type?)`
- `clearModulesCache()`

### Кэширование

**Ключи:**

- `module_providers_discovery`
- `module_navigation_items`
- `active_modules`
- `module_active_<Name>`

**Инвалидация после:**

- install
- uninstall
- activate
- deactivate
- metadata changes

### Известные ограничения

- несогласованный формат path ломает lookup `module.json`, `env.json` и Filament autodiscovery
- `namespace` критичен для runtime Filament discovery
- зависимости валидируются из `module.json`, а не из DB relations

### Чеклист агента

- определить правильный слой перед правкой module-related кода
- подтвердить, что DB path везде `modules/<ModuleName>`
- подтвердить соответствие namespace ожиданиям Filament discovery
- проверять dependencies в `module.json`, а не в БД
- инвалидировать/пересобирать module caches после lifecycle changes
- убедиться, что removed schema и features не возвращаются

---

## Таблицы слоёв конфигурации

### Назначение слоёв

| Слой | Назначение |
|------|------------|
| metadata_contract | identity модуля, dependencies, providers, navigation, migrations |
| feature_flags_behavior | UI-редактируемый конфиг с file defaults и DB overrides |
| runtime_operational_values | динамические key-value данные, сохраняемые модулями в runtime |

### Источник истины (defaults)

| Слой | Источник |
|------|----------|
| metadata_contract | `module.json` |
| feature_flags_behavior | `env.json` |
| runtime_operational_values | таблица `module_settings` |

### Runtime overrides

| Слой | Override |
|------|----------|
| metadata_contract | none |
| feature_flags_behavior | JSON-колонка `modules.env` |
| runtime_operational_values | строки таблицы `module_settings` |

### Приоритет чтения (`feature_flags_behavior`)

1. если ключ есть в `modules.env` — использовать DB value
2. иначе — default из `env.json`

### Поведение записи (`feature_flags_behavior`)

- UI сохраняет только в `modules.env`
- UI никогда не перезаписывает `env.json`

### Границы слоёв

| API | Слой |
|-----|------|
| `moduleConfig(name, key, default)` | metadata из `module.json` |
| `moduleEnv(name, key, default)` | defaults из `env.json` с overrides из `modules.env` |
| `moduleSetting(name, key, default)` | runtime values из `module_settings` |

**Правило:** не дублировать ключи между env-слоем и `module_settings` без явной причины.

---

## Схема БД

### Таблица `modules`

**Назначение:** зарегистрированные модули и lifecycle state

| Поле | Примечание |
|------|------------|
| `name` | unique |
| `version` | |
| `is_active` | |
| `priority` | |
| `env` | json — user overrides для `env.json` |
| `path` | |
| `namespace` | |
| `installed_at` | |

**Индексы:** `[is_active, priority]`

**Constraints:** —

**Заметки:**

- `is_core` читается из `module.json`, а не из таблицы `modules`

### Таблица `module_settings`

**Назначение:** гибкие runtime key-value настройки на модуль

| Поле | Тип / примечание |
|------|------------------|
| `module_id` | |
| `key` | |
| `value` | |
| `type` | `string` \| `boolean` \| `integer` \| `json` |
| `description` | |
| `is_public` | |

**Индексы:** —

**Constraints:** `unique(module_id, key)`

**Заметки:**

- для динамических параметров, сохраняемых модулем в БД
- не заменяет `env.json`

### Удалено (removed)

- таблица `module_dependencies`
- колонка `modules.slug`
- колонка `modules.is_core`
- колонка `modules.config` — заменена на `modules.env`

---

## Сервисы

### ModuleInstallerService

**Файл:** `app/Services/ModuleInstallerService.php`

**Методы:**

- `install(moduleName, activate=true)`
- `prepareForWizardInstall(moduleName)`
- `finalizeWizardInstall(moduleName)`
- `uninstall(moduleName, rollbackMigrations=false)`

**Поведение:**

- выполняет migrations и seeders из `module.json`
- создаёт DB record через `firstOrCreate`
- активирует модуль
- планирует cache rebuild

### ModuleAutoDiscoveryService

**Файл:** `app/Services/ModuleAutoDiscoveryService.php`

**Методы:** —

**Поведение:**

- сканирует filesystem modules и синхронизирует DB records
- обновляет version, priority и path
- предоставляет cache active module providers из `module.json`

### ModuleNavigationService

**Файл:** `app/Services/ModuleNavigationService.php`

**Методы:** —

**Поведение:**

- строит navigation из `module.json` navigation config
- использует cache key `module_navigation_items`

---

## do_not

- не возвращать removed DB schema или features из `body.db_schema.removed`
- не хранить редактируемые metadata модуля в `modules.env`
- не трактовать `modules.env` как что-либо кроме override values для `env.json`
- не полагаться на DB-колонки `slug` или `is_core`
- не смешивать форматы path `<ModuleName>` и `modules/<ModuleName>` в БД
