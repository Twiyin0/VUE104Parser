# 插件系统文档

English version: [PLUGIN_SYSTEM.md](PLUGIN_SYSTEM.md)

## 设计目标

插件系统采用轻量级运行时模型，设计思路参考了 Koishi 面向服务的扩展方式：

- 核心服务只初始化一次，并挂在共享运行时上
- 插件负责描述能力，而不是把界面逻辑硬编码到各个页面里
- 前端插件与后端插件可以独立演进
- 内部 API 统一注册，便于后续增加扩展点

## 运行时模型

### 后端

后端插件描述定义在 `server/plugins/builtin.ts`，状态管理位于 `server/core/plugin-manager.ts`。

每个插件描述项包含：

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

运行时状态持久化在 `data/plugins.json`。

### 前端

前端通过 `/api/v1/system/bootstrap` 获取插件信息。

插件目前可以：

- 暴露功能开关 `featureFlags`
- 暴露主题 ID `themeIds`
- 在插件中心中启用或禁用
- 在插件中心中渲染后端声明的配置字段
- 在不重启服务的情况下保存配置并回写运行时

## 当前内置插件

| ID | 作用域 | 说明 |
|---|---|---|
| `core.parser` | backend | 解析核心与内部解析 API |
| `core.log-viewer` | frontend/backend | 调试日志查看与日志接口 |
| `core.db-tools` | frontend | 点表工具与 SQL.js 辅助功能 |
| `core.theme-ocean` | frontend | Ocean 主题预设 |
| `core.theme-graphite` | frontend | Graphite 主题预设 |
| `example.log-cleaner` | backend | 定时清理过期日志文件的后端示例插件 |

## 内部 API

当前后端运行时已注册的内部 API 包括：

- `parser.detect`
- `parser.parse.single`
- `parser.parse.log`
- `logger.read.current`
- `logger.list.files`
- `plugins.list`

后续新增后端插件时，优先通过这个注册表协作，而不是在插件里随意直接引入全局模块。

## 后端示例插件

仓库中已经提供一个可运行的后端示例插件：`server/plugins/log-cleaner.ts`。

它的行为如下：

- 默认关闭
- 启用后立即扫描 `config.logger.dir`
- 会跳过当前正在写入的日志文件
- 删除超过 14 天的 `.log` 文件
- 每 6 小时重复执行一次清理
- `keepDays` 与 `intervalHours` 可直接在前端插件中心配置

如果希望默认启用，可以在 `config.yml` 中加入：

```yml
plugins:
  enabled:
    - "example.log-cleaner"
```

你也可以通过插件 API 或前端插件中心切换它的启用状态，后端宿主会在不重启服务的情况下自动启动或停止定时器。

## 推荐插件目录结构

未来如果接入第三方或本地插件，建议采用如下结构：

```text
plugins/
└─ my-plugin/
   ├─ plugin.json
   ├─ backend.ts
   ├─ frontend.ts
   ├─ themes/
   └─ README.md
```

建议的 `plugin.json`：

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

## 开发建议

1. 尽量通过运行时注册服务，不要在插件里到处直接引用全局单例。
2. 面向用户的文案放在 i18n 文件中，不要散落在 `.ts` 或 `.vue` 内联字符串里。
3. 如果插件提供主题，请只声明 `themeId`，具体主题变量由前端主题注册表统一管理。
4. 如果插件需要日志能力，请复用共享日志 API，保持输出格式一致。
5. 如果后端插件需要运行时配置，优先声明 `backend.configFields`，让插件中心自动渲染表单，而不是额外手写一个独立设置页。

## 下一步

当前实现已经提供稳定的插件脚手架。下一阶段更适合继续把页面渲染逻辑抽成更插件友好的 view model 和组件插槽，而不是继续扩大页面中的内联 HTML 拼接。
