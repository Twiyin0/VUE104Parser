# VUE104Parser

IEC 60870-5-104 / DL/T634.5101-2002 双协议解析器

Vue 3 + TypeScript + Tailwind CSS 重构版本。

## 项目结构

```
VUE104Parser/
├── index.html                    # Vite 入口 HTML
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
│
├── src/                          # Vue 前端
│   ├── main.ts                   # 应用入口，路由配置
│   ├── App.vue                   # 根组件（初始化主题）
│   ├── style.css                 # Tailwind + 全局自定义类（两页共用）
│   │
│   ├── stores/
│   │   └── db.ts                 # Pinia store：点表数据库（两页共用）
│   │
│   ├── composables/
│   │   ├── useTheme.ts           # 主题切换逻辑（两页共用）
│   │   └── useHtmlUtils.ts       # esc/addrHex/protoBadge 等工具函数（两页共用）
│   │
│   ├── components/
│   │   ├── ThemeToggle.vue       # 主题切换按钮组件（两页共用）
│   │   ├── DbBar.vue             # 点表数据库上传栏（两页共用）
│   │   └── CollapseSection.vue   # 可折叠区块（HexParser 用）
│   │
│   └── views/
│       ├── HexParser.vue         # 原 index.html → 路由 /
│       └── FileParser.vue        # 原 fileParser.html → 路由 /fileParser
│
├── server/                       # Express 后端（TypeScript）
│   ├── server.ts                 # 原 src/server.js → TypeScript
│   └── protocolDetector.ts       # 原 src/protocolDetector.js → TypeScript
│
├── src_parsers/                  # 解析器原文件（保持 CommonJS，逻辑不变）
│   ├── 104ParserClass.js
│   └── 101ParserClass.js
│
└── upload/
    └── upload.ts                 # 原 upload/upload.js → TypeScript
```

## 代码量对比

| 文件 / 模块 | 原始行数 | 迁移后 | 说明 |
|---|---|---|---|
| CSS（两页合计） | 483 行 | ~280 行 | Tailwind 替代，共用一份 |
| 主题切换 | 重复×2 | `useTheme.ts` 44 行 | 提取为 composable |
| 点表 DB 逻辑 | 重复×2 | `db.ts` Pinia store | 提取为 store |
| 工具函数 | 重复×2 | `useHtmlUtils.ts` | esc/addrHex 等统一 |
| DB Bar UI | 重复×2 | `DbBar.vue` 单组件 | |
| 解析器（不变） | 1774 行 | 1774 行 | 逻辑零修改 |

## 启动开发

```bash
# 1. 复制原始解析器（逻辑不变）
cp src/104ParserClass.js src_parsers/
cp src/101ParserClass.js src_parsers/

# 2. 安装依赖
npm install

# 3. 开发模式（前后端同时启动）
npm run dev

# 4. 生产构建
npm run build
npm start
```

## 环境变量（部署用）

```env
SSH_HOST=your-server
SSH_PORT=22
SSH_USER=username
SSH_PASSWORD=password
PORT=33104
```
