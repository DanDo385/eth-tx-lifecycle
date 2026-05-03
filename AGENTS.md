# AGENTS.md

Canonical agent instructions for this repository.

Do not add separate root-level `.cursorrules`, `CLAUDE.md`, `GEMINI.md`, or tool-specific instruction files unless a tool absolutely requires a shim. If a shim is required, it must only point back to this file and must not contain independent rules.

## Project purpose

`eth-tx-lifecycle` is an educational Ethereum transaction lifecycle visualizer. It turns the invisible path after a wallet user clicks send into a guided product experience: mempool, builders, relays, validators, finality, and MEV.

Portfolio lane: `for-normies`.

## Demo principle

This should feel like a natural project walkthrough for a smart non-specialist.
The goal is not to flex jargon. The goal is to make Ethereum's transaction pipeline legible without losing technical accuracy.

## Architecture

- Go backend under `backend/` collects and aggregates Ethereum data.
- Next.js frontend under `frontend/` presents the lifecycle as an educational interface.
- External data sources can be partial or rate-limited, so the UI should handle degraded data gracefully.

## Backend rules

- Use the existing package boundaries: config, clients, domain, server, shared internal/pkg helpers.
- Use `writeOK` / `writeErr` response conventions.
- Use bounded concurrency for expensive upstream calls.
- Sanitize URLs and never print secrets/API keys.

## Frontend rules

- Keep explanations beginner-friendly but not condescending.
- Always convert hex/wei/gwei values into human-readable units before display.
- Preserve the `ForNormiesDemoDirector` and `DEMO_GUIDE.md` narrative flow.
- Prefer visual hierarchy, tooltips, and concise explanations over raw JSON.

## Documentation rules

- README must match current commands, ports, endpoints, and demo positioning.
- Update `DEMO_GUIDE.md` when adding or rearranging demo-facing UI.

## Verification

Before reporting success after code changes:

```bash
cd /Users/openclaw/Code/eth-tx-lifecycle/frontend
npm run build
```
