# API 文档

English version: [API.md](API.md)

基础路径：`/api/v1`

## 公共启动接口

### `GET /api/v1/info`

返回 API 版本、支持的协议以及接口摘要。

### `GET /api/v1/config`

返回前端可见的站点信息、语言与主题默认配置。

### `GET /api/v1/types`

返回当前支持的规约类型元数据。

### `GET /api/v1/system/bootstrap`

返回前端运行时启动所需的完整 bootstrap 数据。

响应结构：

```json
{
  "apiVersion": "2.0.0",
  "admin": {
    "username": "admin",
    "authenticated": false,
    "expiresAt": null
  },
  "locale": {
    "default": "zh-cn",
    "fallback": "en",
    "frontend": "zh-cn",
    "backend": "zh-cn"
  },
  "logger": {
    "level": 3,
    "file": "data/log/20260623_1.log",
    "exposeDebugApi": true
  },
  "theme": {
    "defaultMode": "system",
    "defaultTheme": "theme-ocean"
  },
  "site": {},
  "plugins": []
}
```

如果请求中携带有效的管理员 token，`admin.authenticated` 会变为 `true`。

## 管理员鉴权

### `POST /api/v1/system/admin/login`

管理员登录接口，用于开启插件管理权限。

请求示例：

```json
{
  "username": "admin",
  "password": "admin"
}
```

响应示例：

```json
{
  "ok": true,
  "token": "generated-admin-token",
  "username": "admin",
  "expiresAt": 1780000000000
}
```

之后可在以下任一请求头中携带 token 调用管理员接口：

- `X-Admin-Token: <token>`
- `Authorization: Bearer <token>`

## 解析接口

### `POST /api/v1/detect`

只检测协议类型，不执行完整解析。

请求示例：

```json
{
  "hex": "68 0E 02 00 00 00 64 01 06 00 01 00 00 00 00 14"
}
```

### `POST /api/v1/parse`

自动识别并解析一条或多条十六进制报文。

### `POST /api/v1/parse/104`

强制按 IEC 104 解析。

### `POST /api/v1/parse/101`

强制按 IEC 101 解析。

### `POST /api/v1/parseLog`

解析带有 `Tx(...)` / `Rx(...)` 前缀的日志文本。

## 系统接口

### `GET /api/v1/system/plugins`

返回运行时插件描述、当前启用状态以及当前插件配置值。

这个接口是公开接口，普通页面上的只读插件中心就使用它来展示信息。

### `POST /api/v1/system/plugins/:id`

在运行时启用或禁用指定插件。

需要管理员 token。

请求示例：

```json
{
  "enabled": true
}
```

### `POST /api/v1/system/plugins/:id/config`

在运行时更新插件配置。

需要管理员 token。

请求示例：

```json
{
  "config": {
    "keepDays": 14,
    "intervalHours": 6
  }
}
```

后端会基于插件声明的 `backend.configFields` schema 校验配置，并持久化到 `data/plugins.json`。

### `GET /api/v1/system/logs?limit=200`

读取当前日志文件末尾内容。

### `POST /api/v1/system/logs/client`

将前端日志镜像写入后端 logger。

请求示例：

```json
{
  "level": "info",
  "message": "runtime bootstrapped",
  "meta": {
    "apiVersion": "2.0.0"
  }
}
```

### `GET /api/v1/system/internal-apis`

列出当前注册的内部 API，供插件或扩展能力调用。

## 兼容接口

为了兼容当前前端，以下旧接口仍然保留：

- `POST /parse`
- `POST /parseLog`

它们底层仍然调用同一套运行时解析能力，在前端完全迁移到 `/api/v1` 之前可以继续使用。
