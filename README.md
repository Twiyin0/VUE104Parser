# VUE104Parser

IEC 60870-5-104 / DL/T634.5101-2002 双协议解析器

Vue 3 + TypeScript + Tailwind CSS 重构版本，内置 REST API 供第三方平台对接。

## 项目结构

```
VUE104Parser/
├── config.yml                    # 服务配置（端口、CORS、API Key）
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
│   │   ├── CollapseSection.vue   # 可折叠区块（HexParser 用）
│   │   └── ScrollToTop.vue       # 回到顶部按钮（两页共用）
│   │
│   └── views/
│       ├── HexParser.vue         # 原 index.html → 路由 /
│       └── FileParser.vue        # 原 fileParser.html → 路由 /fileParser
│
├── server/                       # Express 后端（TypeScript）
│   ├── server.ts                 # 主服务入口
│   ├── config.ts                 # config.yml 读取模块
│   ├── protocolDetector.ts       # 协议自动识别
│   └── routes/
│       └── api.ts                # REST API v1 路由
│
├── src_parsers/                  # 解析器原文件（保持 CommonJS，逻辑不变）
│   ├── 104ParserClass.js
│   └── 101ParserClass.js
│
└── upload/
    └── upload.ts                 # 部署上传脚本
```

## 启动开发

```bash
# 安装依赖
yarn

# 开发模式（前后端同时启动）
yarn dev

# 生产构建
yarn build
yarn start
```

## 配置（config.yml）

```yaml
server:
  port: 33104

cors:
  enabled: true
  origins: "*"  # "*" 或数组 ["https://example.com"]

auth:
  enabled: false
  keys:
    - "your-secret-key-here"

# 站点信息（显示在页面底部 footer）
site:
  copyright: "© 2025 VUE104Parser"
  icp: ""                # ICP 备案号，如 "京ICP备XXXXXXXX号"
  icp_url: "https://beian.miit.gov.cn/"
  police: ""             # 公安备案号，如 "京公网安备XXXXXXXXXX号"
  police_url: "https://www.beian.gov.cn/"
```

- `auth.enabled: true` 时，API 请求需携带 `X-API-Key` 或 `Authorization: Bearer <key>` 头
- `GET /api/v1/info`、`GET /api/v1/types`、`GET /api/v1/config` 始终免认证
- `site.icp` 和 `site.police` 填入后页面底部 footer 自动显示备案链接

## REST API

所有 API 端点前缀为 `/api/v1/`，原始前端端点 `/parse`、`/parseLog` 保持向后兼容。

### 端点列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/info` | API 信息、版本、端点列表 |
| GET | `/api/v1/config` | 站点配置（footer 备案信息） |
| GET | `/api/v1/types` | 支持的 24 种帧类型（TI） |
| POST | `/api/v1/parse` | 自动识别协议解析 hex 报文 |
| POST | `/api/v1/parse/104` | 强制按 IEC 104 解析 |
| POST | `/api/v1/parse/101` | 强制按 IEC 101 解析 |
| POST | `/api/v1/detect` | 仅检测协议类型，不解析 |
| POST | `/api/v1/parseLog` | 解析含 Tx/Rx 前缀的日志文本 |

### 请求示例

**解析报文** — 支持单帧字符串或多帧数组：

```bash
curl -X POST http://localhost:33104/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"hex": "68 0E 02 00 00 00 64 01 06 00 01 00 00 00 00 14"}'
```

响应：

```json
{
  "success": true,
  "frames": [
    { "type": "total_call", "command": "total", "cot": 6, "addr": 1, "cotDesc": "act", "protocol": "104" }
  ],
  "errors": []
}
```

**协议检测**：

```bash
curl -X POST http://localhost:33104/api/v1/detect \
  -H "Content-Type: application/json" \
  -d '{"hex": ["68 0E ...", "10 49 01 00 4A 16"]}'
```

**解析日志文件**：

```bash
curl -X POST http://localhost:33104/api/v1/parseLog \
  -H "Content-Type: application/json" \
  -d '{"logText": "2024-01-01 Tx(1) ---> 68 0E ...", "forceProtocol": "auto"}'
```

### 支持的帧类型

| TI | 类型标识 | 说明 |
|----|---------|------|
| 1 | M_SP_NA_1 | 单点遥信 |
| 3 | M_DP_NA_1 | 双点遥信 |
| 9 | M_ME_NA_1 | 归一化遥测值 |
| 11 | M_ME_NB_1 | 标度化遥测值 |
| 13 | M_ME_NC_1 | 短浮点遥测值 |
| 30 | M_SP_TB_1 | 带时标单点遥信(SOE) |
| 31 | M_DP_TB_1 | 带时标双点遥信(SOE) |
| 45 | C_SC_NA_1 | 单命令遥控 |
| 46 | C_DC_NA_1 | 双命令遥控 |
| 70 | M_EI_NA_1 | 初始化结束 |
| 100 | C_IC_NA_1 | 总召唤命令 |
| 101 | C_CI_NA_1 | 电能量召唤命令 |
| 103 | C_CS_NA_1 | 时钟同步/读取 |
| 104 | C_TS_NA_1 | 测试命令 |
| 105 | C_RP_NA_1 | 复位进程 |
| 200-203 | P_ME/AC | 定值读写 |
| 206 | M_ME_ND_1 | 累计量短浮点数 |
| 207 | M_ME_TD_1 | 带时标累计量短浮点数 |
| 210 | F_XX_XX | 文件服务(私有扩展) |

完整列表见 `GET /api/v1/types`。

## 环境变量（部署用）

```env
SSH_HOST=your-server
SSH_PORT=22
SSH_USER=username
SSH_PASSWORD=password
PORT=33104
REMOTE_DIR=remote server directory
```
