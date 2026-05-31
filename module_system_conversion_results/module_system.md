---
name: navigator-module-system
description: >-
  Navigator CMS modular architecture (Laravel + Filament). Use when creating,
  installing, configuring, or debugging modules; working with module.json,
  env.json, modules.env, module_settings; ModuleInstallerService,
  autodiscovery, Filament admin integration, or module helpers/caching.
version: 2
---

# Navigator CMS — Module System

Stack: PHP >=8.2, Laravel 12.x/13.x, Filament 5.x.

Before changing module-related code, map the task to the correct layer (metadata / config / runtime settings) and verify path + namespace consistency.

## Config layers — pick the right one

| Layer | Source | Helper | Purpose |
|-------|--------|--------|---------|
| Metadata & contract | `module.json` | `moduleConfig(name, key, default)` | name, providers, dependencies, navigation, migrations |
| Feature flags & behavior | `env.json` defaults + `modules.env` overrides | `moduleEnv(name, key, default)` | UI-editable config; DB wins over file |
| Runtime operational values | `module_settings` table | `moduleSetting(name, key, default)` | dynamic key-value stored by module at runtime |

**Read priority for env:** if key exists in `modules.env` → use DB value; else → use `env.json` default `value`.

**Write behavior:** UI saves only to `modules.env`; never overwrite `env.json` from UI.

**Do not duplicate keys** between env layer and `module_settings` without a clear reason.

## Module filesystem layout

Root: `modules/`

```
modules/<ModuleName>/
├── module.json          # required
├── env.json             # optional, typed settings defaults for UI
├── Providers/*ServiceProvider.php
├── Database/Migrations/*.php
├── Database/Seeders/*.php   # optional
├── Filament/Admin/Resources/*
├── Filament/Settings/*
└── Filament/Install.php     # optional, wizard install
```

## module.json contract

**Required:**
- `name`: string
- `providers`: string[]

**Commonly used:**
- `display_name`, `description`, `version`, `priority`
- `is_core`: bool (read from JSON, not DB)
- `dependencies.required|optional|conflicts`
- `navigation.items`
- `migrations.path`
- `seeders[]`
- `install`: bool
- `skip_install`: bool

**Note:** `slug` is legacy metadata; not required by runtime.

## Database schema

### `modules` table

Fields: `name` (unique), `version`, `is_active`, `priority`, `env` (json — user overrides for env.json), `path`, `namespace`, `installed_at`.

Index: `(is_active, priority)`.

### `module_settings` table

Flexible runtime key-value settings per module.

Fields: `module_id`, `key`, `value`, `type` (string|boolean|integer|json), `description`, `is_public`.

Constraint: `unique(module_id, key)`.

Used for dynamic parameters the module stores in DB. Does **not** replace `env.json`.

### Removed / unused (do not reintroduce)

- `module_dependencies` table
- `modules.slug`, `modules.is_core` columns
- `modules.config` column (replaced by `modules.env`)

## Path contract

- **Expected DB value:** `modules/<ModuleName>`
- **Resolution:** `Module::getFullPath()` → `base_path(path)`

**Critical:** do not mix `<ModuleName>` and `modules/<ModuleName>` in DB. Path format must be consistent across seeder, installer, and autodiscovery. Inconsistent paths break `module.json`/`env.json` lookup and Filament autodiscovery.

## env.json supported UI types

`text`, `textarea`, `checkbox`, `radio`, `select`, `multiselect`, `file`, `multifile`

Defaults live in `modules/<Module>/env.json`. Overrides live in `modules.env` JSON column.

## Core services

### ModuleInstallerService

File: `app/Services/ModuleInstallerService.php`

Methods:
- `install(moduleName, activate=true)`
- `prepareForWizardInstall(moduleName)`
- `finalizeWizardInstall(moduleName)`
- `uninstall(moduleName, rollbackMigrations=false)`

Behavior: runs migrations/seeders from `module.json`; creates DB record via `firstOrCreate`; activates module; schedules cache rebuild.

### ModuleAutoDiscoveryService

File: `app/Services/ModuleAutoDiscoveryService.php`

Behavior: scans filesystem modules and syncs DB records; updates version/priority/path; provides active module providers cache from `module.json`.

### ModuleNavigationService

File: `app/Services/ModuleNavigationService.php`

Behavior: builds navigation from `module.json` → `navigation` config; cache key `module_navigation_items`.

## Filament admin integration

Provider: `app/Providers/Filament/AdminPanelProvider.php`

- For active modules from DB: discovers Filament resources/pages/widgets by module path + namespace.
- Fallback without DB: scans filesystem core modules.

Resource: `app/Filament/Admin/Resources/ModuleResource.php`

Table actions:
- `install_wizard` — for `install: true` modules
- `install_from_fs` — modules without wizard
- grouped: activate/deactivate, clear cache, edit, delete

**Production:** main module identity fields are informational; avoid free editing.

## Helpers

Entry: `bootstrap/helpers.php`

Modules:
- `bootstrap/helpers/lang.php`
- `bootstrap/helpers/module.php`
- `bootstrap/helpers/media.php`
- `bootstrap/helpers/error.php`

Key functions:
- `isModule(name)`
- `getModule(name)`
- `getActiveModules()`
- `moduleConfig(name, key, default)` — `module.json`
- `moduleEnv(name, key, default)` — `modules.env` with `env.json` fallback
- `moduleSetting(name, key, default)` — `module_settings`
- `getModuleDependencies(name, type?)` — `module.json` dependencies
- `clearModulesCache()`

## Cache keys

- `module_providers_discovery`
- `module_navigation_items`
- `active_modules`
- `module_active_<Name>`

After install/uninstall/activate/deactivate or metadata changes, expect cache rebuild via `clearModulesCache()` or admin actions.

## Known constraints

- Inconsistent path format → lookup and Filament autodiscovery failures.
- `namespace` is runtime-critical for Filament discovery.
- Dependencies validated from `module.json`, not DB relations.

## Do not

- Re-introduce `module_dependencies` table logic.
- Store editable module metadata in `modules.env`; env column is only for `env.json` override values.
- Rely on `slug` / `is_core` DB columns; core flag comes from `module.json`.

## Agent checklist

When implementing or reviewing module changes:

1. Identify layer: `moduleConfig` vs `moduleEnv` vs `moduleSetting`.
2. Confirm DB `path` is `modules/<ModuleName>` everywhere.
3. Confirm `namespace` matches Filament discovery expectations.
4. Check dependencies in `module.json`, not DB.
5. Invalidate or rebuild module caches after lifecycle changes.
6. Verify no removed schema/features are reintroduced.
