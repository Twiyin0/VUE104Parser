# Plugin System Documentation

中文版本: [PLUGIN_SYSTEM.zh-CN.md](PLUGIN_SYSTEM.zh-CN.md)

## Design Goals

The plugin system follows a lightweight runtime model inspired by Koishi's service-oriented design:

- core services are initialized once in a shared runtime
- plugins describe capabilities instead of hard-coding UI branches everywhere
- frontend and backend plugins can evolve independently
- internal APIs are registered centrally for future extension points

## Runtime Model

### Backend

Backend plugins are described in `server/plugins/builtin.ts` and managed by `server/core/plugin-manager.ts`.

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
- be enabled or disabled from the plugin center
- render backend-declared config fields in the plugin center
- save config changes back to the runtime without a restart

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

The repository now includes a runnable backend example plugin in `server/plugins/log-cleaner.ts`.

Behavior:

- disabled by default
- when enabled, it immediately scans `config.logger.dir`
- it skips the current active log file
- it removes `.log` files older than 14 days
- it repeats the cleanup every 6 hours
- its `keepDays` and `intervalHours` values can be changed directly from the frontend plugin center

Enable it by adding this plugin id to `config.yml`:

```yml
plugins:
  enabled:
    - "example.log-cleaner"
```

You can also toggle it from the plugin API/UI, and the backend host will start or stop the timer without a restart.

## Recommended Plugin Folder Layout

For future third-party or local plugins, use a structure like:

```text
plugins/
└─ my-plugin/
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

1. Prefer registering services through the runtime instead of importing global singletons everywhere.
2. Keep user-facing copy in i18n files, not inline in `.ts` or `.vue`.
3. If a plugin adds a theme, declare a `themeId` and let the frontend theme registry own the actual CSS variables.
4. If a plugin needs logs, use the shared logger API so the output format remains consistent.
5. If a backend plugin needs runtime settings, declare `backend.configFields` and let the plugin center render the form instead of hard-coding a separate settings page.

## Next Iteration

The current implementation is a stable scaffold. The next migration step is to move parser page rendering logic into plugin-friendly view models and component slots, rather than large inline HTML strings.
