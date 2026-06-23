# API Documentation

中文版本: [API.zh-CN.md](API.zh-CN.md)

Base path: `/api/v1`

## Public bootstrap endpoints

### `GET /api/v1/info`

Returns API version, supported protocols, and endpoint summary.

### `GET /api/v1/config`

Returns frontend-facing site, locale, and theme defaults.

### `GET /api/v1/types`

Returns supported frame type metadata.

### `GET /api/v1/system/bootstrap`

Returns the runtime bootstrap payload used by the frontend shell.

Response shape:

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

When the request contains a valid admin token, `admin.authenticated` becomes `true`.

## Admin authentication

### `POST /api/v1/system/admin/login`

Sign in to enable plugin management.

Request:

```json
{
  "username": "admin",
  "password": "admin"
}
```

Response:

```json
{
  "ok": true,
  "token": "generated-admin-token",
  "username": "admin",
  "expiresAt": 1780000000000
}
```

Use the returned token in one of these headers for admin-only endpoints:

- `X-Admin-Token: <token>`
- `Authorization: Bearer <token>`

## Parser endpoints

### `POST /api/v1/detect`

Detect protocol without parsing.

Request:

```json
{
  "hex": "68 0E 02 00 00 00 64 01 06 00 01 00 00 00 00 14"
}
```

### `POST /api/v1/parse`

Auto-detect and parse one or more hex payloads.

### `POST /api/v1/parse/104`

Force IEC 104 parsing.

### `POST /api/v1/parse/101`

Force IEC 101 parsing.

### `POST /api/v1/parseLog`

Parse text logs containing `Tx(...)` / `Rx(...)` prefixes.

## System endpoints

### `GET /api/v1/system/plugins`

List runtime plugin descriptors, current enabled state, and current plugin config values.

This endpoint is public and is used by the read-only plugin center on normal pages.

### `POST /api/v1/system/plugins/:id`

Enable or disable a plugin at runtime.

Admin token required.

Request:

```json
{
  "enabled": true
}
```

### `POST /api/v1/system/plugins/:id/config`

Update plugin config values at runtime.

Admin token required.

Request:

```json
{
  "config": {
    "keepDays": 14,
    "intervalHours": 6
  }
}
```

The backend validates config values against the plugin's declared `backend.configFields` schema and persists them into `data/plugins.json`.

### `GET /api/v1/system/logs?limit=200`

Read the current log file tail.

### `POST /api/v1/system/logs/client`

Mirror frontend logs into the backend logger.

Request:

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

List backend internal APIs registered for plugin use.

## Legacy compatibility endpoints

These are still exposed for the current frontend:

- `POST /parse`
- `POST /parseLog`

They call the same parser runtime underneath and should be considered compatibility bridges until the views fully migrate to `/api/v1`.
