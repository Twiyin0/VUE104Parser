# CHANGELOG

## [1.0.2] - 2026-03-30

### 修复

- **`CollapseSection` 折叠动画期间 `mb-0` 提前生效**：将 `collapsed = true` 从 `requestAnimationFrame` 回调移至 `transitionend` 事件，确保折叠 CSS 类在动画结束后才切换，避免底部间距在动画中途突变。`toggle()` 和 `close()` 均已修正。
- **遥测/遥信/电能量/遥控区块间距偏大**：`HexParser` 结果 grid 容器的 `gap-4`（1rem）与子元素 `.cs` 的 `mb-4`（1rem）叠加，导致间距约 2rem；移除 `style.css` 中 `.cs` 的 `mb-4` 及 `.cs.collapsed` 的 `mb-0`，统一由 grid `gap-4` 控制间距，两条独立区块（101链路层帧、其他事件）保留 `mt-4` 不变。
- **`upload.ts` 打包排除项补全**：新增排除 `old/**`、`dist/**`、`.yarn/**`、`*.log`，避免上传无关文件。

---

## [1.0.1] - 2026-03-30

### 修复

- **`CollapseSection` 折叠时底部 margin 多余**：`.cs.collapsed` 新增 `mb-0`，折叠状态下不再产生多余的 1rem 底部间距。
- **HexParser 底部两个区块（101链路层帧、其他事件）无间距**：两个游离于主容器外的 `CollapseSection` 新增 `class="mt-4"`，保证无论上方区块展开/折叠均有固定间隔。

---

## [1.0.0] - 2026-03-29

### 项目重构：原生 HTML/JS → Vue 3 + TypeScript

将原先两个独立的纯 HTML 页面（`index.html` / `fileParser.html`）完整迁移为 Vue 3 + TypeScript + Tailwind CSS 单页应用。解析器核心逻辑（`104ParserClass.js` / `101ParserClass.js`）保持零修改，共 1774 行。

---

### 新增

#### 前端架构
- **Vue Router**：`/` 对应 HexParser，`/fileParser` 对应 FileParser，两页共享同一 Vite 入口。
- **Pinia Store (`src/stores/db.ts`)**：将原先两页各自重复的点表数据库逻辑统一为单一 store，包含 SQLite `.db` 文件解析、五张点表（遥测/遥信/遥控/电能量/参数）的加载与查询、转发表（TableName）筛选、以及 `switchMap` / `allMap` 双级查询路径。
- **`useTheme` composable (`src/composables/useTheme.ts`)**：提取主题切换逻辑，支持 `localStorage` 持久化与 `prefers-color-scheme` 媒体查询跟随，替代原先两页各自 44 行的重复代码。
- **`useHtmlUtils` composable (`src/composables/useHtmlUtils.ts`)**：统一工具函数库，包含 `esc`（HTML 转义）、`addrHex`（地址十六进制格式化，按协议补位）、`protoBadge`、`nameCell`、`qdsStr`（QDS 品质位解析）、`opClass`（遥控操作 CSS 类）、`ycValueStr`（遥测值显示）、`dirBadge`（Tx/Rx 方向徽章）、`typeTag`（类型标签）、`highlightTime`（时间戳正则高亮）。
- **`ThemeToggle.vue` 组件**：亮色/暗色切换按钮，两页共用。
- **`DbBar.vue` 组件**：点表数据库上传栏，含状态指示、文件选择、转发表类型下拉选择器，两页共用。
- **`CollapseSection.vue` 组件**：可折叠区块，用于 HexParser 的遥测/遥信/遥控/链路层等各分类结果面板。

#### 后端
- **`server/server.ts`**：将原 `server.js` 迁移为 TypeScript ESM，新增 `/parseLog` 端点，支持上传整份 log 文件并逐行解析，返回结构化 `{ lines[] }` 结果，支持 `forceProtocol` 参数强制指定协议。
- **`server/protocolDetector.ts`**：将原 `protocolDetector.js` 迁移为 TypeScript，导出 `DetectResult` 接口，逻辑不变（101 固定帧 / 101 可变帧 / 104 自动判别 / 手动 `[101]`/`[104]` 前缀标注）。

#### 工具链
- **Vite**：替代原先无构建工具的开发方式，配置 `/parse` 和 `/parseLog` 开发代理指向 `localhost:33104`，生产构建输出至 `dist/public`。
- **Tailwind CSS**：替代原先约 483 行手写 CSS，两页共用一份 `src/style.css`，精简约 42%。
- **`upload/upload.ts`**：将原 `upload.js` 迁移为 TypeScript，通过 SSH2 将构建产物打包部署到远端服务器。
- **`concurrently`**：`npm run dev` 同时启动 `tsx watch server/server.ts` 与 `vite`，无需两个终端。

---

### 变更

| 原文件 | 迁移后 | 说明 |
|---|---|---|
| `src/index.html`（静态页）| `src/views/HexParser.vue` | 路由 `/` |
| `src/fileParser.html`（静态页）| `src/views/FileParser.vue` | 路由 `/fileParser` |
| `src/server.js` | `server/server.ts` | TypeScript，新增 `/parseLog` |
| `src/protocolDetector.js` | `server/protocolDetector.ts` | TypeScript，接口导出 |
| `upload/upload.js` | `upload/upload.ts` | TypeScript |
| 两页各自的主题逻辑 | `src/composables/useTheme.ts` | 统一 composable |
| 两页各自的工具函数 | `src/composables/useHtmlUtils.ts` | 统一工具库 |
| 两页各自的 DB UI | `src/components/DbBar.vue` | 统一组件 |
| 两页各自的 CSS（~483 行）| `src/style.css`（~280 行）| Tailwind 替代 |

---

### 保持不变

- `src_parsers/104ParserClass.js`：IEC 60870-5-104 解析器，CommonJS，逻辑零修改。
- `src_parsers/101ParserClass.js`：DL/T634.5101-2002 解析器，CommonJS，逻辑零修改。
- 所有解析协议行为、报文格式支持范围、点名查询语义均与原版完全一致。
