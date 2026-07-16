# AGENTS.md

Single source of truth for AI coding assistants working in this repository (Cursor, Claude Code, and similar).

## Agent configuration

- **This file is the only root-level agent instruction document.** Keep all substantive rules here.
- Do not add parallel root-level copies (`.cursorrules`, `CLAUDE.md`, `GEMINI.md`, tool-specific rule dumps, and so on) unless an external tool **requires** a particular filename; if it does, that file must only point back to this document.

---

## Project purpose

`eth-tx-lifecycle` is an educational Ethereum transaction lifecycle visualizer. It turns the invisible path after a wallet user clicks send into a guided product experience: mempool, builders, relays, validators, finality, and MEV.

## Demo principle

The main explorer should feel like a clear end-to-end story for a smart non-specialist.
The goal is not to flex jargon. The goal is to make Ethereum's transaction pipeline legible without losing technical accuracy.

## Architecture

- Go backend under `backend/` collects and aggregates Ethereum data.
- Next.js frontend under `frontend/` presents the lifecycle as an educational interface.
- External data sources can be partial or rate-limited, so the UI should handle degraded data gracefully.

## Production (Vercel + local tunnel)

- **Ports:** single source of truth is `config/ports.json` (frontend **3000**, backend **8081** so eth-l2 can keep **8080**). See `config/README.md`.
- **Frontend (Vercel):** project `eth-tx-lifecycle`, Root Directory `frontend` (link/deploy from `frontend/`). Production URL: `https://eth-tx-lifecycle.vercel.app`.
- **Backend (via Cloudflare Tunnel):** public origin `https://api-staging-eth-tx.magro.dev` → `http://127.0.0.1:8081` (never expose LAN IPs). Example ingress: `docs/cloudflare-tunnel.example.yml`.
- **Same-origin API:** browser calls `/api/*` on the Vercel app. On Vercel set:
  - `PROXY_MODE=route` (route handler proxy; preferred over rewrites on Vercel)
  - `GOAPI_ORIGIN=https://api-staging-eth-tx.magro.dev`
- **Durable local API:** `./scripts/start-staging-backend.sh` or `./scripts/install-backend-launch-agent.sh` (launchd KeepAlive).
- **Embeddable from magro.dev:** CSP `frame-ancestors` allows `'self'`, `https://magro.dev`, and `https://www.magro.dev` (`frontend/next.config.mjs`).
- **Degraded mode:** UI still loads without the Go backend; live mempool/MEV/tracker data needs the tunnel + Go process. `/api/health` and `/api/health/ready` fail closed when the tunnel/backend is offline.
- Do not commit LAN IPs, private keys, or paid RPC secrets. Prefer public RPC defaults from `.env.example` unless production needs paid providers.

## Backend rules

- Use the existing package boundaries: config, clients, domain, server, shared internal/pkg helpers.
- Use `writeOK` / `writeErr` response conventions.
- Use bounded concurrency for expensive upstream calls.
- Sanitize URLs and never print secrets/API keys.

## Frontend rules

- Keep explanations beginner-friendly but not condescending.
- Always convert hex/wei/gwei values into human-readable units before display.
- Prefer visual hierarchy, tooltips, and concise explanations over raw JSON.

## Display (light / dark theme)

- Theme uses `data-theme` on `<html>` with CSS variables in `frontend/app/globals.css` (dark defaults on `:root`, light overrides under `html[data-theme='light']`).
- Helpers live in `frontend/lib/theme.ts` (`THEME_STORAGE_KEY = eth-tx-lifecycle-theme`).
- Blocking inline script in `frontend/app/layout.tsx` prevents FOUC; storage key must stay identical to `THEME_STORAGE_KEY`.
- Toggle UI: `frontend/app/components/ThemeToggle.tsx` under the Display control in `SiteHeader`.
- Do not introduce `next-themes` or a ThemeProvider context.

### Contrast rule (required whenever light/dark is present)

**Adding a theme toggle is not done until both modes have readable colors.** Dark-first pastel Tailwind utilities (`text-*-50` through `text-*-400`, especially green/amber/emerald/yellow) often look fine on dark backgrounds and fail WCAG-ish contrast on light ones.

Rules:

1. **Body / paragraph copy** must use semantic tokens (`text-fg`, `text-fg/80`, `text-fg/85`, `text-muted`) that follow `--fg` / `--muted`, not near-white pastel shades.
2. **Accent labels** may keep `text-green-300`, `text-amber-200`, etc. for dark mode, but must be covered by `html[data-theme='light']` overrides in `globals.css` (darker 700-ish hues) or use dual-aware classes.
3. **Status chips** (e.g. API Server Ready with `text-green-300`) need light-mode overrides; never rely on pale green on pale green tint alone.
4. When adding new accent text colors, extend the light-mode override block in `globals.css` in the same PR, and spot-check both themes (toggle Display, read labels + body on tinted cards).
5. Prefer fixing with tokens + CSS overrides over `next-themes` or hard-coded dual class trees unless a component is purely decorative.

## Agent Mode

First-class structured surfaces for AI systems. Keep them updated in the same change as site content/nav.

| Surface | Path | Source |
|---------|------|--------|
| Human overview | `/agent/` | `frontend/app/agent/page.tsx` |
| JSON manifest | `/agent.json` | `frontend/lib/agent.ts` → `frontend/app/agent.json/route.ts` |
| LLM router | `/llms.txt` | `frontend/lib/agent.ts` (`getLlmsTxt`) → `frontend/app/llms.txt/route.ts` |

### What updates automatically

- **`getLlmsTxt()`** is derived from **`getAgentManifest()`** — they cannot drift.
- **Navigation labels/hrefs** for primary app links come from `frontend/lib/nav.ts` (shared with `SiteHeader`).
- **Lifecycle step copy** comes from `frontend/lib/lifecycleSteps.ts` (shared with `LifecycleStepExplainer` and agent surfaces).
- **Demos / API map / topics** are curated in `frontend/lib/agent.ts` (this repo has no separate content loaders yet).

### What you must update manually

When the product changes, review **`frontend/lib/agent.ts`** and **`frontend/lib/lifecycleSteps.ts`** (and related files):

1. **`lib/nav.ts`** — primary nav ids/labels/hrefs (UI + manifest stay aligned).
2. **`lib/lifecycleSteps.ts`** — step titles, summaries, technical notes, live-data notes when the guided story changes.
3. **`about` / `contact` / `canonicalTopics` / `PRINCIPLES` / `api.endpoints`** — when positioning, copy, or public routes change.
4. **`agentMode.preferredEntryPoints` / `readingOrder`** — when new high-value agent entry URLs are added.
5. **`demos` / `projects`** — when routes, features, or health probes change.
6. **`lib/constants.ts`** — `SITE` / `OWNER` / `CONTACT` flow into manifest and `llms.txt`.
7. **`app/agent/page.tsx`** — human overview copy if endpoints or principles change.

Never put secrets, LAN IPs, localhost-only hosts, or private staging details in agent surfaces. Public production URL and documented public health probes are fine.

### Checklist: after content / nav / about changes

- [ ] `lib/nav.ts` matches the real header links.
- [ ] `/agent.json` and `/llms.txt` reflect the change (spot-check locally).
- [ ] No secrets or private hosts in agent output.
- [ ] `make verify` passes.

## Documentation rules

- README must match current commands, ports, endpoints, and demo positioning.

## Verification

Before reporting success after code changes:

```bash
make verify
```
