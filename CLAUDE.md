# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **eth-tx-lifecycle** - an educational Ethereum visualization tool designed for complete beginners with zero cryptocurrency knowledge. It demonstrates the complete journey of transactions from mempool to finality using real-time Ethereum data.

**Key Educational Features:**
- Interactive glossary with 40+ terms organized by category
- Step-by-step walkthrough explaining each visualization panel
- Real-world analogies (post office, concert tickets, banks)
- Detailed explanations of gas economics, MEV, validator earnings, and finality
- Live MEV sandwich attack detection with victim/attacker visualization
- Human-readable transaction tracking across execution and consensus layers

The system consists of a Go backend and a Next.js frontend that work together to fetch and display real-time Ethereum data with extensive educational commentary.

## Architecture

The project follows a clean separation between data fetching (Go) and presentation (React/Next.js):

- **Go Backend** (`backend/`): Handles all Ethereum data fetching, processing, and API endpoints
- **Next.js Frontend** (`frontend/`): Modern React application with TypeScript, Tailwind CSS, and interactive visualizations
- **Data Sources**: Uses public APIs (Alchemy, Beaconcha.in, Flashbots) - no local blockchain sync required

### Backend Structure (refactored)

The Go backend uses a consolidated layout: config outside internal, then four internal areas (pkg, clients, domain, server).

- **Entrypoint:** `cmd/eth-tx-lifecycle/main.go` → `internal/run.go` (`Run()`) → `internal/server.Run()`.
- **config/** (sibling of internal): `config.go` — env (`LoadEnvFile`, `EnvOr`), hex parsing, HTTP client, URL sanitization.
- **internal/pkg/:** `cache.go` (TTL cache, `NewCache`), `health.go` (`BaseDataSource`, aggregation). Shared by clients and server.
- **internal/clients/:** External API clients (subpackages):
  - `eth/` — JSON-RPC client (`Call`, `CheckHealth`, `SourceInfo`).
  - `beacon/` — Beacon REST client (`Get`, `CheckHealth`, `SourceInfo`).
  - `relay/` — MEV relay client (`Get`, `CheckHealth`, `SourceInfo`); negative caching.
- **internal/domain/:** Feature logic (one package, multiple files): `mempool.go` (pending tx polling; `GetData`, `Start`, `CheckHealth`), `track.go` (transaction lifecycle `TrackTx`; supports "latest"), `txdecode.go` (input decoder `DecodeTransactionInput`), `sandwich.go` (MEV sandwich detection; `FetchBlockFull`, `CollectSwaps`, `DetectSandwiches`), `snapshot.go` (aggregated data `BuildSnapshot`, `LogSnapshot`).
- **internal/server/:** `server.go` — HTTP server, CORS, routes, handlers; `writeOK`/`writeErr`, `eduEnvelope`; calls config, pkg, clients, domain.

### Frontend Structure

The Next.js app uses the App Router pattern with extensive educational components:

- `app/page.tsx`: Main application with welcome introduction, step-by-step walkthrough, and interactive panels
- `app/components/`: Specialized React components for each visualization:
  - `Glossary.tsx`: Interactive glossary with 40+ terms in 5 categories (basics, lifecycle, MEV, economics, security)
  - `TransactionView.tsx`: Human-readable transaction display with economics, MEV info, and finality tracking
  - `BuilderRelayView.tsx`: Builder competition visualization showing all block submissions
  - `RelayDeliveredView.tsx`: Winning blocks delivered to validators
  - `BeaconHeadersView.tsx`: Proposed blocks with builder payments and validator earnings
  - `FinalityView.tsx`: Casper-FFG finality checkpoints with health status
  - `SandwichView.tsx`: MEV sandwich attack detection with step-by-step explanations
  - `MermaidDiagram.tsx`: Transaction flow visualization
- `app/utils/format.ts`: Data formatting utilities (hex→decimal, wei→ETH, gwei conversions, hash shortening)
- `frontend/app/api/[...path]/route.ts`: API proxy to Go backend
- Styling: Tailwind CSS with dark theme and gradient accents

## Development Commands

### Starting Services

Always use the provided scripts which handle environment loading:

```bash
# Start backend server (runs on :8080 by default, or GOAPI_ADDR from .env.local)
./scripts/start-backend.sh

# Start Next.js development server (runs on :3000 by default, or WEB_PORT from .env.local)
./scripts/start-frontend.sh
```

### Build Commands

```bash
# Build backend binary
cd backend && go build -o eth-tx-lifecycle-backend ./cmd/eth-tx-lifecycle

# Build Next.js for production
cd frontend && npm run build

# Start production Next.js server
cd frontend && npm run start
```

### Testing and Linting

The project does not currently have automated tests or linting configured.

## Environment Configuration

Configuration is handled through `.env.local` at the repository root. Key variables:

- `RPC_HTTP_URL`: Ethereum RPC endpoint (defaults to public Alchemy)
- `BEACON_API_URL`: Beacon chain API endpoint
- `RELAY_URLS`: Comma-separated list of MEV relay endpoints
- `WEB_PORT`: Next.js development server port (default: 3000)
- `GOAPI_ADDR`: Backend server address (default: :8080)
- `GOAPI_ORIGIN`: Backend origin for CORS (should match GOAPI_ADDR)

## Key Dependencies

### Go Dependencies
- `golang.org/x/crypto`: Keccak (sha3) for MEV sandwich topic hashing in `internal/domain/sandwich.go`
- Otherwise standard library; mempool uses HTTP polling via `internal/clients/eth`, not WebSocket

### Frontend Dependencies
- `next`: Next.js 14 with App Router and TypeScript
- `react` + `react-dom`: React 18
- `tailwindcss`: Utility-first CSS framework for responsive design
- `react-tooltip`: Interactive tooltips for glossary terms and educational content
- `html2canvas`: Diagram export functionality
- `mermaid`: Transaction flow diagram rendering

## API Endpoints

The backend exposes these educational endpoints:

- `GET /api/mempool`: Real-time mempool data with aggregate metrics (total gas, value, avg gas price, high-priority count)
- `GET /api/relays/received`: Builder block submissions received by relays (shows all competing blocks for each slot)
- `GET /api/relays/delivered`: Winning payloads delivered to validators (only blocks that won the auction)
- `GET /api/validators/head`: Beacon chain block headers enriched with builder payments and MEV-Boost metadata
- `GET /api/finality`: Casper-FFG finality checkpoints with justification and finalization status
- `GET /api/track/tx/{hash}`: Complete transaction lifecycle tracking (mempool → block → finality)
- `GET /api/mev/sandwich?block={id}`: MEV sandwich attack detection for specific block ("latest" or block number)
- `GET /api/snapshot`: Aggregated data from all sources with caching

## Common Development Patterns

### Adding New API Endpoints

1. Add handler in `internal/server/server.go` and register route in `Run()`.
2. Implement data fetching in the right package: `internal/clients/*` for new external APIs, `internal/domain/*` for new feature logic.
3. Use `writeOK()` and `writeErr()` for responses.
4. Create or update React component in `frontend/app/components/`, add panel in `frontend/app/page.tsx`, include educational content.

### Working with Real-time Data

The backend uses HTTP polling for mempool (no WebSocket) and TTL caching for expensive calls:
- **internal/domain/mempool.go**: Polls pending block via `internal/clients/eth`; `GetData()`, `Start()`, metrics; started once from server `Run()`.
- **internal/domain/snapshot.go**: Builds aggregated response; relay fallback (builder_blocks_received then proposer_payload_delivered); server caches serialized snapshot in `pkg.Cache`.
- All endpoints handle rate limits and unavailable sources.

### Frontend State Management

The main application uses React state with useEffect hooks for data fetching:
- Each panel (mempool, builder relay, delivered, headers, finality, sandwich) has dedicated state
- Data is fetched from the backend and transformed using `app/utils/format.ts` utilities
- Educational components include summary metrics, detailed explanations, and human-readable tables
- All monetary values converted from wei/gwei to ETH, all hex values converted to decimal

### Educational Content Guidelines

When adding new features or components:
- **Always include beginner-friendly explanations** with real-world analogies
- **Use metric cards** with gradients and color-coding for key statistics
- **Provide context** about why things matter and how they impact users
- **Show the math** - explain calculations for gas fees, validator earnings, etc.
- **Add tooltips** to glossary terms and technical concepts
- **Use visual hierarchy** - important insights in colored boxes with icons
- **Explain edge cases** - what happens during congestion, rate limiting, etc.

## Port Configuration

Default ports:
- Backend: `:8080` (configurable via `GOAPI_ADDR`)
- Next.js: `:3000` (configurable via `WEB_PORT`)

Both start scripts check for port conflicts and load configuration from `.env.local`.
