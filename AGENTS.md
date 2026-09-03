# ActionD Web — Agent Guide

Guidance for AI coding agents (and humans in a hurry) working in this repo.

## Project in one line

actiond-web is the frontend console for the [ActionD](https://github.com/JoeGlenn1213/ActionD) local CI/CD daemon — a Next.js static-export SPA that renders its REST/SSE API.

## Dev Quickstart

- **Stack**: Next.js 16 (App Router, `output: "export"` static export) + React 19 + Tailwind 4 + shadcn/radix + Zustand; tests: Jest (`__tests__/`) + Playwright (`e2e/`, API mocked via `page.route` — no backend needed).
- **Commands**: `npm run dev` (:3001) / `npm run build` / `npm run deploy` (build + atomic swap of `~/.localgithub/actiond-web/out` — run this after changes if ActionD serves the console) / `npm start` (static preview via `scripts/serve.mjs`; `next start` does not work with static export) / `npm run lint` / `npm run typecheck` / `npm test` / `npm run test:e2e`.
- **Structure**: `app/` (routes), `components/` (features + `ui/` shadcn), `lib/` (`api.ts` unified API client, `types.ts` single source of types, `stream.ts` SSE, `use-polling.ts`/`use-health.ts` hooks), `stores/` (filter store, localStorage-persisted), `__tests__/`, `e2e/`, `scripts/`.
- **Runtime prerequisites**:
  - The ActionD backend owns port **:3000**; the dev server runs on **:3001**. `.env.development` sets `NEXT_PUBLIC_ACTIOND_BASE_URL=http://localhost:3000`; the backend sends `Access-Control-Allow-Origin: *`, so cross-origin dev just works.
  - In production ActionD serves `~/.localgithub/actiond-web/out` via `--web-dir`; same-origin relative paths then apply.

## Conventions

- All fetches must go through `lib/api.ts` / `apiUrl()` — no bare `fetch('/api/...')`. Failed mutations must throw and surface as a UI toast; never swallow errors silently.
- Status rendering uses `components/status-badge.tsx` exclusively (covers all 10 backend statuses — note it's `needs_approval`, not `pending_approval`; `retry_of`/`retry_count`/`original_run` are always present).
- No `alert()`/`confirm()`: feedback via sonner toasts, destructive confirmations via shadcn AlertDialog.
- The backend has no dedicated LGH status endpoint; the health light uses `GET /api/plugins` as a ping (`lib/use-health.ts`).
- Backend errors are plain text (`http.Error`) — parse error responses with `res.text()`, not `res.json()`.
- **Static export notes**: `trailingSlash: true` (directory-style index.html, otherwise ActionD deep links show a directory listing); deep-link fallback chain: `{route}/placeholder.html` (deploy.sh adds flattened copies) → `path/index.html` → `path.html` → generic index.html (implemented by the backend and `scripts/serve.mjs`). Terminal-job log replay reads the raw log through the artifacts endpoint.
