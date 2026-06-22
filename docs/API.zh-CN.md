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
  "locale": {
    "default": "zh-cn",
    "fallback": "en",
    "frontend": "zh-cn",
    "backend": "zh-cn"
  },
  "logger": {
    "level": 3,
    "file": "data/log/20260622_1.log",
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

### `POST /api/v1/system/plugins/:id`

在运行时启用或禁用指定插件。

请求示例：

```json
{
  "enabled": true
}
```

### `POST /api/v1/system/plugins/:id/config`

在运行时更新插件配置。

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

将前端日志镜像写入后端日志系统。

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

它们底层仍然调用同一套运行时解析能力，在前端完全迁移到 `/api/v1` 之前可继续使用。
