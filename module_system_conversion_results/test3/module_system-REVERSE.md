# Спецификация `navigator-module-system`

## Соответствие и версия

- Спецификация соответствует стандарту `yaml_spec_convention-mini.yaml`.
- Версия соглашения: `1`.
- Версия спецификации: `2`.
- Имя системы: `navigator-module-system`.

## Стек

- PHP: `>=8.2`.
- Laravel: `12.x/13.x`.
- Filament: `5.x`.

## Каталоги и структура модулей

- Корневой каталог модулей: `modules/`.

### Обязательные и поддерживаемые пути

| Путь | Обязательность | Назначение |
| --- | --- | --- |
| `modules/<ModuleName>/module.json` | Да | Метаданные и контракт модуля |
| `modules/<ModuleName>/env.json` | Нет | Типизированные значения настроек UI по умолчанию |
| `modules/<ModuleName>/Providers/*ServiceProvider.php` | Не указано | Service provider'ы модуля |
| `modules/<ModuleName>/Database/Migrations/*.php` | Не указано | Миграции модуля |
| `modules/<ModuleName>/Database/Seeders/*.php` | Нет | Seeder'ы модуля |
| `modules/<ModuleName>/Filament/Admin/Resources/*` | Не указано | Административные ресурсы Filament |
| `modules/<ModuleName>/Filament/Settings/*` | Не указано | UI настроек Filament |
| `modules/<ModuleName>/Filament/Install.php` | Нет | UI мастера установки |

### Контракт путей

- Ожидаемое текущее значение пути в БД: `modules/<ModuleName>`.
- Разрешение пути в файловой системе: `Module::getFullPath() -> base_path(path)`.
- Предупреждение: пути в БД должны оставаться согласованными между seeders, installer и autodiscovery.

## Слои конфигурации

Система разделяет три слоя конфигурации:

- `metadata_contract`: идентичность модуля, зависимости, providers, навигация, миграции.
- `feature_flags_behavior`: UI-редактируемая конфигурация с файловыми значениями по умолчанию и переопределениями в БД.
- `runtime_operational_values`: динамические key-value данные, сохраняемые модулями во время выполнения.

### Источники значений по умолчанию

- Для `metadata_contract`: `module.json`.
- Для `feature_flags_behavior`: `env.json`.
- Для `runtime_operational_values`: таблица `module_settings`.

### Runtime-переопределения

- Для `metadata_contract`: отсутствуют.
- Для `feature_flags_behavior`: JSON-колонка `modules.env`.
- Для `runtime_operational_values`: строки таблицы `module_settings`.

### Приоритет чтения feature flags

1. Если ключ существует в `modules.env`, используется значение из БД.
2. Иначе используется значение по умолчанию из `env.json`.

### Поведение записи feature flags

- UI сохраняет значения только в `modules.env`.
- UI никогда не перезаписывает `env.json`.

### Границы использования helper'ов

- `moduleConfig(name, key, default)` используется для metadata из `module.json`.
- `moduleEnv(name, key, default)` используется для значений по умолчанию из `env.json` с переопределениями из `modules.env`.
- `moduleSetting(name, key, default)` используется для runtime-значений из `module_settings`.
- Ключи не должны дублироваться между env-слоем и `module_settings` без явной причины.

### Поддерживаемые типы настроек

- `text`
- `textarea`
- `checkbox`
- `radio`
- `select`
- `multiselect`
- `file`
- `multifile`

## Манифест модуля

### Обязательные поля

- `name: string`
- `providers: string[]`

### Часто используемые поля

- `display_name`
- `description`
- `version`
- `priority`
- `is_core: bool`, читается из JSON, а не из БД
- `dependencies.required`
- `dependencies.optional`
- `dependencies.conflicts`
- `navigation.items`
- `migrations.path`
- `seeders[]`
- `install`
- `skip_install`

### Примечание

- `slug` является legacy metadata и не требуется runtime.

## Схема базы данных

### Таблица `modules`

- Назначение: зарегистрированные записи модулей и состояние lifecycle.

Поля:

- `name: unique`
- `version`
- `is_active`
- `priority`
- `env: json user overrides for env.json`
- `path`
- `namespace`
- `installed_at`

Индексы:

- `[is_active, priority]`

Ограничения:

- Нет.

Примечания:

- `is_core` читается из `module.json`, а не из таблицы `modules`.

### Таблица `module_settings`

- Назначение: гибкие runtime key-value настройки по модулю.

Поля:

- `module_id`
- `key`
- `value`
- `type: string|boolean|integer|json`
- `description`
- `is_public`

Индексы:

- Нет.

Ограничения:

- `unique(module_id, key)`

Примечания:

- Таблица используется для динамических параметров, которые модуль хранит в БД.
- Таблица не заменяет `env.json`.

### Удаленная схема

Удалены и не должны возвращаться:

- Таблица `module_dependencies`.
- Колонка `modules.slug`.
- Колонка `modules.is_core`.
- Колонка `modules.config`, заменена на `modules.env`.

## Ключевые сервисы

### `ModuleInstallerService`

- Файл: `app/Services/ModuleInstallerService.php`.

Методы:

- `install(moduleName, activate=true)`
- `prepareForWizardInstall(moduleName)`
- `finalizeWizardInstall(moduleName)`
- `uninstall(moduleName, rollbackMigrations=false)`

Поведение:

- Запускает миграции и seeders из `module.json`.
- Создает запись в БД через `firstOrCreate`.
- Активирует модуль.
- Планирует перестроение cache.

### `ModuleAutoDiscoveryService`

- Файл: `app/Services/ModuleAutoDiscoveryService.php`.
- Методы: не указаны.

Поведение:

- Сканирует модули в файловой системе и синхронизирует записи в БД.
- Обновляет `version`, `priority` и `path`.
- Предоставляет cache активных module providers из `module.json`.

### `ModuleNavigationService`

- Файл: `app/Services/ModuleNavigationService.php`.
- Методы: не указаны.

Поведение:

- Строит навигацию из navigation config в `module.json`.
- Использует cache key `module_navigation_items`.

## Интеграция

- Provider: `app/Providers/Filament/AdminPanelProvider.php`.
- Resource: `app/Filament/Admin/Resources/ModuleResource.php`.

Поведение:

- Активные модули из БД используются для discovery ресурсов, страниц и widgets Filament по пути и namespace модуля.
- Fallback без БД сканирует filesystem core modules.

Действия:

- `install_wizard` для модулей с `install: true`.
- `install_from_fs` для модулей без wizard.
- Сгруппированные действия: `activate`, `deactivate`, `clear cache`, `edit`, `delete`.

Примечание:

- Основные поля идентичности модуля являются информационными в production и не должны свободно редактироваться.

## Helper'ы

- Основной файл: `bootstrap/helpers.php`.

Структура helper'ов:

- `bootstrap/helpers/lang.php`
- `bootstrap/helpers/module.php`
- `bootstrap/helpers/media.php`
- `bootstrap/helpers/error.php`

Ключевые функции:

- `isModule(name)`
- `getModule(name)`
- `getActiveModules()`
- `moduleConfig(name, key, default)`
- `moduleEnv(name, key, default)`
- `moduleSetting(name, key, default)`
- `getModuleDependencies(name, type?)`
- `clearModulesCache()`

## Кеширование

Ключи cache:

- `module_providers_discovery`
- `module_navigation_items`
- `active_modules`
- `module_active_<Name>`

Cache инвалидируется после:

- `install`
- `uninstall`
- `activate`
- `deactivate`
- metadata changes

## Известные ограничения

- Несогласованный формат path ломает lookup `module.json`, lookup `env.json` и Filament autodiscovery.
- `namespace` критичен для runtime discovery Filament.
- Зависимости валидируются из `module.json`, а не из DB relations.

## Checklist для агента

- Определить правильный слой перед редактированием module-related code.
- Подтвердить, что DB path везде равен `modules/<ModuleName>`.
- Подтвердить, что namespace соответствует ожиданиям Filament discovery.
- Проверять зависимости в `module.json`, а не в БД.
- Инвалидировать или перестраивать module caches после lifecycle changes.
- Проверить, что удаленные schema и features не возвращаются.

## Запрещено

- Возвращать удаленные DB schema или features, перечисленные в `body.db_schema.removed`.
- Хранить редактируемые metadata модуля в `modules.env`.
- Рассматривать `modules.env` как что-либо, кроме override-значений для `env.json`.
- Полагаться на DB-колонки `slug` или `is_core`.
- Смешивать форматы path `<ModuleName>` и `modules/<ModuleName>` в БД.
