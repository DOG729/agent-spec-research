# Спецификация системы модулей Navigator (navigator-module-system)

**Версия:** 2  
**Соответствует стандарту:** `yaml_spec_convention-mini.yaml` (версия конвенции 1)

## Стек технологий
- **PHP:** >=8.2
- **Laravel:** 12.x/13.x
- **Filament:** 5.x

## Структура директорий
**Корень:** `modules/`

### Файловая структура
- `modules/<ModuleName>/module.json` (**Обязательно**): Метаданные и контракт модуля.
- `modules/<ModuleName>/env.json` (**Опционально**): Типизированные значения настроек пользовательского интерфейса по умолчанию.
- `modules/<ModuleName>/Providers/*ServiceProvider.php`: Сервис-провайдеры модуля.
- `modules/<ModuleName>/Database/Migrations/*.php`: Миграции модуля.
- `modules/<ModuleName>/Database/Seeders/*.php` (**Опционально**): Сидеры модуля.
- `modules/<ModuleName>/Filament/Admin/Resources/*`: Ресурсы админ-панели Filament.
- `modules/<ModuleName>/Filament/Settings/*`: UI настроек Filament.
- `modules/<ModuleName>/Filament/Install.php` (**Опционально**): UI мастера установки.

### Контракт путей
- **Ожидаемое значение пути в БД:** `modules/<ModuleName>`
- **Разрешение в файловой системе:** `Module::getFullPath() -> base_path(path)`
- **Внимание:** Сохраняйте единообразие путей в БД между сидерами, установщиком и автообнаружением.

---

## Слои конфигурации

### Назначение слоев
- **Контракт метаданных:** Идентификация модуля, зависимости, провайдеры, навигация, миграции.
- **Поведение флагов фич:** Редактируемый в UI конфиг с файловыми значениями по умолчанию и переопределениями в БД.
- **Операционные значения времени выполнения:** Динамические данные в формате ключ-значение, сохраняемые модулями во время работы.

### Источники истины
| Слой | Источник по умолчанию (SOT) | Переопределения времени выполнения |
| :--- | :--- | :--- |
| **Контракт метаданных** | `module.json` | Отсутствуют |
| **Флаги фич** | `env.json` | Колонка `env` (JSON) в таблице `modules` |
| **Операционные значения** | Таблица `module_settings` | Строки таблицы `module_settings` |

### Приоритет чтения и записи (Флаги фич)
- **Приоритет чтения:** 
  1. Если ключ существует в `modules.env`, используется значение из БД.
  2. В противном случае используется значение из `env.json`.
- **Поведение записи:** 
  - UI сохраняет данные только в `modules.env`.
  - UI никогда не перезаписывает файл `env.json`.

### Границы и функции-хелперы
- `moduleConfig(name, key, default)` — для доступа к метаданным `module.json`.
- `moduleEnv(name, key, default)` — для значений `env.json` с учетом переопределений из БД.
- `moduleSetting(name, key, default)` — для динамических настроек из `module_settings`.
- **Важно:** Не дублируйте ключи между слоем `env` и `module_settings` без веской причины.

### Поддерживаемые типы данных в UI
`text`, `textarea`, `checkbox`, `radio`, `select`, `multiselect`, `file`, `multifile`.

---

## Манифест модуля (module.json)

- **Обязательные поля:** 
  - `name: string`
  - `providers: string[]`
- **Часто используемые поля:** 
  - `display_name`, `description`, `version`, `priority`.
  - `is_core: bool` (важно: читается из JSON, а не из БД).
  - `dependencies` (`required`, `optional`, `conflicts`).
  - `navigation.items`, `migrations.path`, `seeders[]`.
  - `install`, `skip_install`.
- **Заметки:** `slug` является устаревшим метаданным и не требуется для работы системы.

---

## Схема базы данных

### Таблица `modules`
**Назначение:** Учет зарегистрированных модулей и состояние их жизненного цикла.
- **Поля:** `name` (unique), `version`, `is_active`, `priority`, `env` (JSON переопределения), `path`, `namespace`, `installed_at`.
- **Индексы:** `[is_active, priority]`.
- **Заметки:** Поле `is_core` отсутствует в таблице, оно считывается напрямую из `module.json`.

### Таблица `module_settings`
**Назначение:** Гибкое хранение операционных настроек модулей (key-value).
- **Поля:** `module_id`, `key`, `value`, `type` (`string|boolean|integer|json`), `description`, `is_public`.
- **Ограничения:** Уникальность пары `(module_id, key)`.
- **Заметки:** Предназначена для динамических параметров; не заменяет собой слой `env.json`.

### Удаленные (Deprecated) элементы
- Таблица `module_dependencies`.
- Колонка `modules.slug`.
- Колонка `modules.is_core`.
- Колонка `modules.config` (заменена на `modules.env`).

---

## Основные сервисы

### ModuleInstallerService 
- **Файл:** `app/Services/ModuleInstallerService.php`
- **Ключевые методы:** `install`, `prepareForWizardInstall`, `finalizeWizardInstall`, `uninstall`.
- **Поведение:**
  - Запускает миграции и сидеры, указанные в `module.json`.
  - Создает запись в БД через `firstOrCreate`.
  - Активирует модуль и планирует очистку кэша.

### ModuleAutoDiscoveryService
- **Файл:** `app/Services/ModuleAutoDiscoveryService.php`
- **Поведение:**
  - Сканирует файловую систему и синхронизирует состояние с БД.
  - Обновляет версию, приоритет и путь модулей.
  - Формирует кэш провайдеров активных модулей.

### ModuleNavigationService
- **Файл:** `app/Services/ModuleNavigationService.php`
- **Поведение:**
  - Строит навигационное меню на основе данных из `module.json`.
  - Использует ключ кэша `module_navigation_items`.

---

## Интеграция с Filament

- **Провайдер:** `app/Providers/Filament/AdminPanelProvider.php`
- **Ресурс управления:** `app/Filament/Admin/Resources/ModuleResource.php`
- **Механизм обнаружения:** Ресурсы, страницы и виджеты Filament загружаются на основе активных модулей из БД (по их пути и namespace). Если БД недоступна, используется фоллбэк на сканирование core-модулей в ФС.
- **Доступные действия:**
  - Мастер установки (`install_wizard`) для модулей с `install: true`.
  - Прямая установка из ФС (`install_from_fs`).
  - Управление жизненным циклом (активация, деактивация, редактирование, удаление, очистка кэша).
- **Заметка:** Основные поля идентификации модуля в продакшене носят информационный характер.

---

## Хелперы и функции
- **Главный файл:** `bootstrap/helpers.php`
- **Разделение:** `lang.php`, `module.php`, `media.php`, `error.php`.
- **Ключевые функции:**
  - `isModule(name)`, `getModule(name)`, `getActiveModules()`.
  - `moduleConfig()`, `moduleEnv()`, `moduleSetting()`.
  - `getModuleDependencies(name, type?)`.
  - `clearModulesCache()`.

---

## Кэширование
- **Ключи кэша:** 
  - `module_providers_discovery`
  - `module_navigation_items`
  - `active_modules`
  - `module_active_<Name>`
- **События инвалидации:** Установка, удаление, активация, деактивация, изменение метаданных.

---

## Известные ограничения и правила (Constraints)
- Нарушение формата путей в БД ломает поиск файлов (`module.json`, `env.json`) и автообнаружение Filament.
- `namespace` критически важен для корректной работы Filament.
- Зависимости проверяются исключительно по манифесту `module.json`.

## Чек-лист для агента
- [ ] Всегда определять целевой слой (Config, Env или Setting) перед правками.
- [ ] Проверять, что путь в БД соответствует формату `modules/<ModuleName>`.
- [ ] Убедиться, что `namespace` модуля соответствует ожиданиям Filament.
- [ ] Использовать `module.json` как единственный источник истины для зависимостей.
- [ ] Сбрасывать кэш после любых изменений состояния модуля.
- [ ] Не пытаться использовать удаленные поля или таблицы.

## Запрещено (Do Not)
1. **Не возвращать** удаленные элементы схемы (см. раздел "Удаленные элементы").
2. **Не хранить** общие метаданные модуля в `modules.env`.
3. **Не использовать** `modules.env` для чего-либо, кроме переопределений `env.json`.
4. **Не полагаться** на колонки `slug` или `is_core` в базе данных.
5. **Не смешивать** форматы путей: всегда использовать `modules/<ModuleName>` в БД.
