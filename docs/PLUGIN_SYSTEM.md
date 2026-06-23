# Plugin System Documentation

中文版本: [PLUGIN_SYSTEM.zh-CN.md](PLUGIN_SYSTEM.zh-CN.md)

## Design Goals

The plugin system is built around a lightweight runtime model inspired by Koishi's service-oriented approach:

- shared backend services are initialized once and exposed through a stable runtime
- plugins describe capabilities instead of scattering feature branches across the UI
- frontend and backend plugins can evolve independently
- internal APIs are registered centrally for future extension points
- runtime configuration can be changed without restarting the whole app

## Runtime Model

### Backend

Backend plugins are declared in `server/plugins/builtin.ts` and managed by `server/core/plugin-manager.ts`.

Each plugin descriptor contains:

```ts
interface PluginDescriptor {
  id: string
  name: string
  description: string
  scopes: Array<'frontend' | 'backend'>
  category: 'core' | 'theme' | 'tooling'
  defaultEnabled: boolean
  frontend?: {
    featureFlags?: string[]
    themeIds?: string[]
  }
  backend?: {
    internalApis?: string[]
    configFields?: PluginConfigField[]
  }
}
```

```ts
interface PluginConfigField {
  key: string
  label: string
  description?: string
  type: 'boolean' | 'number' | 'string'
  default: boolean | number | string
  min?: number
  max?: number
  step?: number
  placeholder?: string
}
```

Runtime state is persisted in `data/plugins.json`.

### Frontend

Frontend plugins are consumed through `/api/v1/system/bootstrap`.

They can:

- expose feature flags
- expose theme ids
- be listed in the plugin center
- render backend-declared config fields in the plugin center
- apply runtime changes immediately after saving

## Plugin Center Permissions

The plugin center now has two modes:

- public mode: available from `/` and `/fileParser`, read-only
- admin mode: available after signing in from `/admin`, editable

Behavior:

- public users can view plugin metadata, status, and config schema
- public users cannot change plugin state or save plugin config
- admins sign in with username and password from `config.yml`
- the default credentials are `admin / admin`
- after login, plugin state and config changes take effect immediately in the current runtime

Relevant runtime files:

- `server/core/admin-auth.ts`
- `server/routes/api.ts`
- `src/stores/runtime.ts`
- `src/components/PluginDrawer.vue`
- `src/views/AdminView.vue`

## Current Built-in Plugins

| ID | Scope | Purpose |
|---|---|---|
| `core.parser` | backend | parser core and internal parser APIs |
| `core.log-viewer` | frontend/backend | debug log viewer and log APIs |
| `core.db-tools` | frontend | point table database tooling |
| `core.theme-ocean` | frontend | Ocean theme preset |
| `core.theme-graphite` | frontend | Graphite theme preset |
| `example.log-cleaner` | backend | example plugin that periodically removes expired log files |

## Internal APIs

The backend runtime exposes these internal APIs today:

- `parser.detect`
- `parser.parse.single`
- `parser.parse.log`
- `logger.read.current`
- `logger.list.files`
- `plugins.list`

Future backend plugins should register against this registry instead of importing random modules directly.

## Example Backend Plugin

The repository includes a runnable backend example plugin in `server/plugins/log-cleaner.ts`.

Behavior:

- disabled by default
- immediately scans `config.logger.dir` after being enabled
- skips the current active log file
- removes `.log` files older than 14 days
- repeats cleanup every 6 hours
- `keepDays` and `intervalHours` can be configured from the frontend plugin center

Enable it by default in `config.yml`:

```yml
plugins:
  enabled:
    - "example.log-cleaner"
```

You can also toggle it from the plugin API or the admin plugin center, and the backend host will start or stop the timer without a restart.

## Recommended Plugin Folder Layout

For future third-party or local plugins, use a structure like:

```text
plugins/
├─ my-plugin/
   ├─ plugin.json
   ├─ backend.ts
   ├─ frontend.ts
   ├─ themes/
   └─ README.md
```

Suggested `plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "scopes": ["frontend", "backend"],
  "entry": {
    "backend": "./backend.ts",
    "frontend": "./frontend.ts"
  }
}
```

## Development Notes

1. Register services through the runtime instead of importing global singletons everywhere.
2. Keep user-facing copy in i18n files, not inline in `.ts` or `.vue`.
3. If a plugin adds a theme, declare a `themeId` and let the frontend theme registry own the actual CSS variables.
4. If a plugin needs logs, use the shared logger API so the output format stays consistent.
5. If a backend plugin needs runtime settings, declare `backend.configFields` and let the plugin center render the form.
6. If a plugin changes frontend theme variables or feature flags, update runtime state immediately after save so the UI reflects the change without a reload.

## Next Iteration

The current implementation is a stable scaffold. The next migration step is to move more parser-page rendering logic into plugin-friendly view models and component slots instead of large inline HTML strings.
