# ActionD Web Dashboard

**ActionD Web** is the frontend console for the [ActionD](https://github.com/JoeGlenn1213/ActionD) local CI/CD daemon. Built with Next.js and shadcn/ui, it is the "human cockpit" for monitoring local “Slow Intelligence” workflows — a live list, honest status, and one-click retry/cancel without leaving the browser.

## ✨ Features

- **Cockpit charts**: 14-day pass-rate trend, success rate by plugin, duration distribution and runs-by-hour — colored via the theme's chart tokens, dark-mode aware.
- **Live monitoring**: Dashboard and Actions auto-refresh every 5s (pauses while the tab is hidden); action detail streams logs over SSE with reconnect + a 0-100 progress bar.
- **Honest status**: One unified StatusBadge covering all backend statuses (`running`, `done`, `failed`, `cancelled`, `needs_approval`, …); dual health lights (ActionD via `/api/health`, LGH via the proxy) and a page banner when the backend is unreachable.
- **Failure loop in-browser**: failed jobs get a one-click **diagnosis card** (category / cause / fix steps / related files); a **retry timeline** rebuilds the lineage chain with clickable nodes.
- **Event grouping**: deep-linkable `/events/{id}` view of every job from that push, with the LGH commit status report.
- **Approval gate**: `needs_approval` jobs can be approved from the detail page (the backend supports approve only).
- **Filtering & search**: Status/repo/plugin filters, full-text search, sorting and page size — persisted across sessions.
- **Plugin management**: CRUD + enable/disable + hot reload for custom CI plugins; free-form triggers; shell-style quoted arguments.
- **Action details**: Duration/plugin/repo/trigger cards, git context, error summary + structured result rendering, downloadable artifacts, retry/cancel with confirmation dialogs.
- **Profile switching**: fast / full / release execution profiles in Settings.
- **Responsive & accessible**: mobile drawer navigation, keyboard-operable table rows; single-language English UI (recorded decision).
- **Feedback everywhere**: Toasts for every mutation outcome; destructive actions (clear-all) use a double confirmation.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, `output: "export"` static export)
- **Styling**: Tailwind CSS 4, shadcn/ui (Radix primitives), next-themes
- **State**: Zustand (filter store, localStorage-persisted)
- **Fonts**: Geist Sans / Geist Mono via `next/font` (mono is used for logs, IDs and SHAs)
- **Testing**: Jest (unit) + Playwright (e2e, API mocked via `page.route`)

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- ActionD backend running on port `:3000` (its REST API is the data source).

### Installation

```bash
cd actiond-web
npm install
```

### Development

```bash
npm run dev
# Console at http://localhost:3001
```

The dev server runs on **3001** (ActionD owns 3000). `.env.development` points
`NEXT_PUBLIC_ACTIOND_BASE_URL` at `http://localhost:3000`; the backend sends
`Access-Control-Allow-Origin: *`, so cross-origin dev just works.

### Build / Deploy

```bash
npm run build     # static export to ./out
npm run deploy    # build + atomically swap ~/.localgithub/actiond-web/out
```

ActionD serves the deployed bundle via `--web-dir` (auto-detected from
`~/.localgithub/actiond-web/out` when the flag is omitted). `npm start` runs a
minimal static server over `./out` for local preview — `next start` does not
work with `output: "export"`.

### Verification

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # jest unit tests (real lib/api.ts under test)
npm run test:e2e    # playwright (mocked API, no backend needed)
```

## 📁 Project Structure

- `/app` — routes: Dashboard (`page.tsx`), `/actions` (list), `/actions/[...id]` (detail), `/plugins`, `/settings`
- `/components` — feature components (`runs-table`, `action-detail-client`, `status-badge`, `app-sidebar`, …) + `ui/` (shadcn primitives)
- `/lib` — API client (`api.ts` via `apiUrl()`), types matching backend JSON tags (`types.ts`), SSE client (`stream.ts`), health/polling hooks
- `/stores` — Zustand filter store (persisted sort/pageSize)
- `/e2e`, `/__tests__` — Playwright e2e + Jest unit tests
- `/scripts` — `deploy.sh` (build+swap), `serve.mjs` (static preview server)

## 🔌 API Integration

All calls go through `lib/api.ts` → `apiUrl()` (honors `NEXT_PUBLIC_ACTIOND_BASE_URL`, same-origin by default when served by ActionD):

```
GET  /api/actions                 # list jobs
GET  /api/actions/{id}            # job detail
GET  /api/actions/{id}/stream     # SSE log stream (progress 0-100)
GET  /api/actions/{id}/diagnose   # structured failure analysis
GET  /api/actions/by-event/{id}   # all jobs from one push/event
POST /api/actions/{id}/retry      # retry (failed/cancelled only)
POST /api/actions/{id}/cancel     # cancel active job
POST /api/actions/{id}/approve    # approve a needs_approval job
GET  /api/actions/{id}/artifacts/{name}  # download artifact
POST /api/actions/cleanup         # cleanup old actions
POST /api/actions/clear-all       # destructive clear (double confirm in UI)
GET/POST/PUT/DELETE /api/plugins… # plugin CRUD + toggle + reload
GET/POST /api/profile             # execution profile (fast|full|release)
GET  /api/health                  # liveness probe
GET  /api/lgh/ping                # LGH connectivity (proxied)
GET  /api/lgh/status/{repo}/{sha} # commit status report (proxied from LGH)
```

Errors from mutations surface as toasts; the backend's plain-text messages are
propagated as-is.

## License

MIT License - Copyright (c) 2025 JoeGlenn1213
