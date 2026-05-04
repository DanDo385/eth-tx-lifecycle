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

## Backend rules

- Use the existing package boundaries: config, clients, domain, server, shared internal/pkg helpers.
- Use `writeOK` / `writeErr` response conventions.
- Use bounded concurrency for expensive upstream calls.
- Sanitize URLs and never print secrets/API keys.

## Frontend rules

- Keep explanations beginner-friendly but not condescending.
- Always convert hex/wei/gwei values into human-readable units before display.
- Prefer visual hierarchy, tooltips, and concise explanations over raw JSON.

## Documentation rules

- README must match current commands, ports, endpoints, and demo positioning.

## Verification

Before reporting success after code changes:

```bash
cd /Users/openclaw/Code/eth-tx-lifecycle/frontend
npm run build
```
