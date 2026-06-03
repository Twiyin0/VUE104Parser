# CLAUDE.md

## Project Overview

IEC 60870-5-104 / DL/T634.5101-2002 dual-protocol parser with Vue 3 frontend and Express REST API backend.

## Package Manager

**Use `yarn`** — this project uses Yarn, not npm.

```bash
yarn              # install dependencies
yarn add <pkg>    # add dependency
yarn add -D <pkg> # add dev dependency
yarn dev          # start dev (frontend + backend)
yarn build        # production build
yarn start        # run production
```

## Architecture

- **Frontend**: Vue 3 + Pinia + Vue Router + Tailwind CSS (`src/`)
- **Backend**: Express + TypeScript (`server/`), runs via `tsx`
- **Parsers**: CommonJS classes in `src_parsers/` (104ParserClass.js, 101ParserClass.js) — logic untouched
- **Config**: `config.yml` at project root (port, CORS, API Key)

## Key Files

- `server/server.ts` — main Express entry, CORS middleware, mounts API router
- `server/routes/api.ts` — REST API v1 endpoints (`/api/v1/*`)
- `server/config.ts` — reads `config.yml`, exports `AppConfig` type
- `server/protocolDetector.ts` — auto-detect 104 vs 101 from hex
- `config.yml` — server port, CORS, API Key auth, site footer info (ICP/police)
- `src_parsers/104ParserClass.js` — IEC 104 parser (CommonJS)
- `src_parsers/101ParserClass.js` — IEC 101 parser (CommonJS)
- `src/components/ScrollToTop.vue` — back-to-top button (shared)
- `src/App.vue` — root layout with footer (reads site config from API)

## API

REST API at `/api/v1/`. See README.md for full endpoint list and examples.

Auth: `config.yml` → `auth.enabled: true` requires `X-API-Key` or `Authorization: Bearer <key>` header.

Public endpoints (no auth): `/api/v1/info`, `/api/v1/types`, `/api/v1/config`

## config.yml

- `server.port` — listen port (default 33104)
- `cors.enabled` / `cors.origins` — CORS settings
- `auth.enabled` / `auth.keys` — API Key authentication
- `site.copyright` / `site.icp` / `site.police` — footer display info, fetched by frontend via `GET /api/v1/config`

## Vite Proxy

`vite.config.ts` proxies `/api`, `/parse`, `/parseLog` to Express (localhost:33104). Add new API paths there.

## Conventions

- Server-side code is TypeScript (`.ts`), parsers are CommonJS (`.js`)
- Use `tsx` to run server TypeScript directly (no tsc compilation step for server)
- Frontend uses `<script setup lang="ts">` style
- CSS: Tailwind utility classes + custom classes in `style.css`
