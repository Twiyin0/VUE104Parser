---
name: vue104parser-project
description: Work effectively in the Vue104Parser repository. Use when modifying this project’s IEC 101/104 parsers, Vue frontend, Express backend runtime, plugin system, i18n files, logging, point-table mapping, or project documentation. Especially relevant for tasks touching `src_parsers/`, `server/`, `src/`, `public/i18n/`, `server/i18n/`, `docs/`, or `config.yml`.
---

# Vue104Parser Project Skill

## Quick map

- Edit IEC parser logic in `src_parsers/101ParserClass.ts` and `src_parsers/104ParserClass.ts`.
- Edit backend runtime and APIs in `server/`.
- Edit frontend pages, drawers, stores, and theming in `src/`.
- Frontend locale data lives in `public/i18n/zh-cn.yml` with English fallback from `src/i18n/en.ts`.
- Backend locale data lives in `server/i18n/zh-cn.json` with English fallback from `server/i18n/en.json`.
- Plugin descriptors live in `server/plugins/`; runtime plugin state persists to `data/plugins.json`.
- User-facing docs live in `README*.md` and `docs/*.md`.

## Working rules

- Preserve the parser-first architecture: parser core in `src_parsers/`, orchestration in `server/parseService.ts`, runtime wiring in `server/runtime.ts`.
- Keep import paths extensionless in project source.
- Prefer i18n-backed copy over inline strings when touching product UI or backend API messages.
- When adding backend plugin behavior, wire both descriptor metadata and runtime behavior.
- When changing plugin configuration, keep the full chain consistent:
  `server/plugins/types.ts` -> `server/core/plugin-manager.ts` -> `server/routes/api.ts` -> `src/stores/runtime.ts` -> `src/components/PluginDrawer.vue`.
- When changing log presentation, check both the backend log format in `server/core/logger.ts` and the frontend viewer in `src/components/DebugLogDrawer.vue`.

## Common tasks

### Parser fixes

- Check protocol detection first in `server/protocolDetector.ts`.
- Check parse entry flow in `server/parseService.ts`.
- For 101/104 frame behavior, verify how the parsed shape is consumed by:
  - `src/views/HexParser.vue`
  - `src/views/FileParser.vue`
  - `src/composables/useHtmlUtils.ts`

### Point-name / DB mapping

- Main logic lives in `src/stores/db.ts`.
- Respect these concepts:
  - all-point lookup
  - transfer-table lookup
  - protocol-specific offsets
  - `全点表` priority over `null` when applicable

### Plugin work

- Backend plugin runtime types: `server/plugins/backend.ts`
- Backend plugin host: `server/core/backend-plugin-host.ts`
- Built-in plugin registry: `server/plugins/builtin.ts`
- Example configurable backend plugin: `server/plugins/log-cleaner.ts`

### Documentation work

- Keep English and Chinese docs paired:
  - `README.md` <-> `README.zh-CN.md`
  - `docs/API.md` <-> `docs/API.zh-CN.md`
  - `docs/PLUGIN_SYSTEM.md` <-> `docs/PLUGIN_SYSTEM.zh-CN.md`

## Validation

- Run frontend build after meaningful code changes:

```bash
yarn build
```

- For backend runtime sanity checks, a lightweight load test is:

```bash
./node_modules/.bin/tsx --eval "import './server/runtime.ts'; console.log('runtime-ok')"
```

- If parser behavior is the issue, prefer direct `tsx --eval` repros against `src_parsers/` or `server/parseService.ts`.

## Known pitfalls

- This repo has had historical encoding issues. Avoid introducing non-i18n inline Chinese strings in `.ts` or `.vue` when possible.
- `tsc --noEmit` may report pre-existing repository issues unrelated to your change; do not assume every failure is caused by current edits.
- Some docs or terminal output may display mojibake in the shell; rely on actual file contents and project i18n layout, not terminal rendering alone.
