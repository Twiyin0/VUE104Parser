# Vue104Parser

基于 IEC 60870-5-104 / DL/T634.5101-2002 的规约解析工作台，包含重构后的运行时核心、前后端 i18n、插件脚手架、主题系统、管理员鉴权插件管理和结构化日志能力。

English version: [README.md](README.md)

## 特性概览

- 以后端解析器为核心，并预留内部 API 供后续插件扩展。
- 前后端均支持 i18n，并提供英文兜底。
- 统一的运行时插件注册表，支持前端与后端能力描述。
- 主题系统已为插件注入主题预设做好准备。
- 公共页面上的插件中心为只读，访问 `/admin` 登录后可管理插件。
- 基于文件的日志系统，支持 `error/warn/info/debug` 四级日志与调试日志查看能力。

## 系统架构

```mermaid
flowchart TB
  User[浏览器用户]

  subgraph Frontend[前端]
    App[应用外壳]
    RuntimeStore[运行时状态]
    Hex[实时解析页面]
    Log[日志解析页面]
    Admin[管理页面]
    PluginDrawer[插件中心]
    LogDrawer[调试日志面板]
    Theme[主题运行时]
    Db[点表状态]
  end

  subgraph Backend[后端]
    Server[Express 服务]
    Api[API 路由]
    Runtime[后端运行时]
    AdminAuth[管理员鉴权服务]
    ParserService[解析服务]
    PluginManager[插件管理器]
    Logger[日志服务]
    I18n[I18n 服务]
    InternalApis[内部 API 注册表]
  end

  subgraph ParserCore[解析核心]
    P104[104 解析器]
    P101[101 解析器]
  end

  subgraph Assets[资源与状态]
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

  Standard -. 规范参考 .-> ParserCore
```

## 目录结构

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

## 运行时配置

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

如果项目要暴露到可信本地环境之外，请先修改默认管理员密码。

## 开发

```bash
yarn
yarn dev
yarn build
```

后端默认使用 `tsx watch server/server.ts`，前端使用 Vite。

## 日志

- `error = 1`
- `warn = 2`
- `info = 3`
- `debug = 4`

日志文件保存在 `data/log/yyyyMMdd_n.log`，同一天内每次重启都会生成新的递增文件。

日志格式示例：

```text
[backend][info]2026-06-23 12:00:00: parsed protocol payload {"route":"/parse","count":3}
```

前端可通过调试日志面板查看当前日志，也可通过 `/api/v1/system/logs` 拉取。

## 文档

- [API documentation](docs/API.md)
- [API 中文文档](docs/API.zh-CN.md)
- [Plugin system documentation](docs/PLUGIN_SYSTEM.md)
- [插件系统文档](docs/PLUGIN_SYSTEM.zh-CN.md)

## 当前迁移状态

- 后端运行时、插件注册表、日志系统、管理员鉴权和 i18n 基础设施已迁移完成。
- 前端外壳、主题运行时、插件中心、调试日志面板和管理页已迁移完成。
- 现有解析页面仍保留部分旧渲染逻辑，后续可继续迁移到新的 i18n / runtime / plugin 风格。
