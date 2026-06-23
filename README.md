# Vue104Parser

IEC 60870-5-104 / DL/T634.5101-2002 parser workstation with a refactored runtime core, frontend/backend i18n, plugin scaffolding, theme system, admin-gated plugin management, and structured logging.

中文说明: [README.zh-CN.md](README.zh-CN.md)

## Highlights

- Parser-first backend core with internal APIs for future plugins.
- Frontend and backend i18n with English fallback.
- Runtime plugin registry for both frontend and backend capabilities.
- Theme system prepared for plugin-contributed theme presets.
- Read-only public plugin center plus admin-editable plugin center at `/admin`.
- File-based logger with `error/warn/info/debug` levels and debug log viewer API.

## Architecture

```mermaid
flowchart TB
  User[Browser User]

  subgraph Frontend
    App[App Shell]
    RuntimeStore[Runtime Store]
    Hex[Hex Parser View]
    Log[File Parser View]
    Admin[Admin View]
    PluginDrawer[Plugin Center]
    LogDrawer[Debug Log Drawer]
    Theme[Theme Runtime]
    Db[Point Table Store]
  end

  subgraph Backend
    Server[Express Server]
    Api[API Router]
    Runtime[Backend Runtime]
    AdminAuth[Admin Auth Service]
    ParserService[Parser Service]
    PluginManager[Plugin Manager]
    Logger[Logger Service]
    I18n[I18n Service]
    InternalApis[Internal API Registry]
  end

  subgraph ParserCore
    P104[104 Parser]
    P101[101 Parser]
  end

  subgraph Assets
    FrontI18n[public/i18n/zh-cn.yml]
    BackI18n[server/i18n/zh-cn.json]
    Config[config.yml]
    Logs[data/log/yyyyMMdd_n.log]
    PluginState[data/plugins.json]
    Standard[public/standard/*.pdf]
  end

  User --> App
  App --> RuntimeStore
  RuntimeStore --> PluginDrawer
  RuntimeStore --> LogDrawer
  RuntimeStore --> Theme
  RuntimeStore --> Db
  App --> Hex
  App --> Log
  App --> Admin

  RuntimeStore -->|GET /api/v1/system/bootstrap| Api
  RuntimeStore -->|POST /api/v1/system/admin/login| Api
  RuntimeStore -->|POST /api/v1/system/plugins/:id| Api
  RuntimeStore -->|POST /api/v1/system/plugins/:id/config| Api
  RuntimeStore -->|GET /api/v1/system/logs| Api
  Hex -->|POST /parse| Server
  Log -->|POST /parseLog| Server

  Server --> Api
  Api --> Runtime
  Runtime --> AdminAuth
  Runtime --> ParserService
  Runtime --> PluginManager
  Runtime --> Logger
  Runtime --> I18n
  Runtime --> InternalApis

  ParserService --> P104
  ParserService --> P101
  Logger --> Logs
  PluginManager --> PluginState
  Runtime --> Config
  App --> FrontI18n
  I18n --> BackI18n

  Standard -. reference .-> ParserCore
```

## Directory Layout

```text
VUE104Parser/
├─ config.yml
├─ public/
│  ├─ i18n/zh-cn.yml
│  ├─ iconLib/
│  └─ standard/
├─ server/
│  ├─ core/
│  ├─ i18n/
│  ├─ plugins/
│  ├─ routes/
│  ├─ config.ts
│  ├─ parseService.ts
│  ├─ protocolDetector.ts
│  ├─ runtime.ts
│  └─ server.ts
├─ src/
│  ├─ components/
│  ├─ composables/
│  ├─ i18n/
│  ├─ services/
│  ├─ stores/
│  ├─ theme/
│  ├─ views/
│  ├─ App.vue
│  └─ main.ts
├─ src_parsers/
│  ├─ 101ParserClass.ts
│  └─ 104ParserClass.ts
└─ docs/
   ├─ API.md
   ├─ API.zh-CN.md
   ├─ PLUGIN_SYSTEM.md
   └─ PLUGIN_SYSTEM.zh-CN.md
```

## Runtime Configuration

`config.yml`

```yaml
server:
  port: 33104

admin:
  username: "admin"
  password: "admin"

locale:
  default: "zh-cn"
  fallback: "en"
  frontend: "zh-cn"
  backend: "zh-cn"

logger:
  level: 3
  dir: "data/log"
  exposeDebugApi: true
  clientMirror: true

plugins:
  enabled:
    - "core.parser"
    - "core.log-viewer"
    - "core.db-tools"
    - "core.theme-ocean"
    - "core.theme-graphite"
  stateFile: "data/plugins.json"

theme:
  defaultMode: "system"
  defaultTheme: "theme-ocean"
```

Change the default admin password before exposing the service beyond trusted local use.

## Development

```bash
yarn
yarn dev
yarn build
```

Backend runs with `tsx watch server/server.ts`, frontend runs with Vite.

## Logging

- `error = 1`
- `warn = 2`
- `info = 3`
- `debug = 4`

Log files are stored in `data/log/yyyyMMdd_n.log`. Each restart creates a new incremented file for the same day.

Log line format:

```text
[backend][info]2026-06-23 12:00:00: parsed protocol payload {"route":"/parse","count":3}
```

Frontend can view current logs through the debug log drawer and the `/api/v1/system/logs` endpoint.

## Documentation

- [API documentation](docs/API.md)
- [API 中文文档](docs/API.zh-CN.md)
- [Plugin system documentation](docs/PLUGIN_SYSTEM.md)
- [插件系统文档](docs/PLUGIN_SYSTEM.zh-CN.md)

## Current Migration Notes

- Backend runtime, plugin registry, logger, admin auth, and i18n infrastructure are migrated.
- Frontend shell, theme runtime, plugin drawer, debug log drawer, and admin view are migrated.
- Existing parser pages still contain legacy rendering code and should be progressively migrated to the new i18n/runtime style in later iterations.
