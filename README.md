# eth-tx-lifecycle - Ethereum Transaction Lifecycle Visualizer

`eth-tx-lifecycle` is a full-stack educational explorer that makes Ethereum's post-click transaction pipeline legible through a core post-office mapping: wallet send, mempool queue, builder/searcher optimization, relay handoff, proposer dispatch, and Casper finality lock. A Go backend aggregates heterogeneous upstreams (execution JSON-RPC, consensus REST, and MEV relays) with timeouts, fallback behavior, and caching; a Next.js frontend turns raw chain data into a guided, beginner-first narrative while preserving live-data evidence.

## Ethereum in Plain English (Post Office Analogy)

If you're brand new, start here:

- Ethereum is a global transaction network.
- A transaction is a letter you want delivered.
- Gas is the stamp price you pay for processing.
- Validators/proposers are dispatch authorities choosing which bag leaves next.
- Finality is the certified lock that makes the delivery record extremely hard to reverse.

### Core Mapping Used In This Project

1. **Wallet send -> Drop letter in mailbox**  
   Your wallet signs a transaction and broadcasts it to peers.
2. **Mempool -> Local sorting room**  
   Pending letters wait in queue-like bins while fee pressure changes urgency.
3. **Builders/searchers -> Logistics optimizers**  
   Specialized teams build competing route plans (candidate blocks).
4. **Relays -> Trusted handoff depots**  
   Candidate dispatch bags are checked and forwarded.
5. **Validators/proposers -> Dispatch authority**  
   One valid bag is selected and sent for that slot.
6. **Finality -> Certified delivery lock**  
   Checkpoints confirm records and make them economically irreversible.

### Why This Analogy Works

- It gives beginners a mental model before protocol jargon.
- It preserves technical correctness through "reality check" callouts in UI.
- It pairs narrative with live evidence so users see this is not mock data.

## What You'll Learn

- **How cryptocurrency transactions work** - Complete journey from mempool to finality
- **Gas fees explained** - Base fees vs priority fees (tips), and where your money goes
- **MEV (Maximal Extractable Value)** - How professional traders profit from transaction ordering
- **Validator economics** - How block proposers earn money
- **Blockchain security** - How Ethereum makes transactions irreversible
- **Real MEV activity** - Sandwiches, arbitrage, liquidations, JIT liquidity happening on the network right now

## Features

### For Beginners
- **Core Lifecycle Guide (`/`)** - wallet -> mempool -> builders/searchers -> relays -> proposers -> finality
- **Creative Analogy + Reality Checks** - each post-office scene includes a technical correction
- **Stamp Pricing Explainers** - variable postage analogy mapped to base fee + priority fee mechanics
- **Visual Metrics** - user-friendly cards showing gas prices, transaction counts, and proposer economics

### Advanced / Infra-Focused
- **MEV Lab (`/mev-lab`)** - dedicated page for MEV detection, MEV-Boost framing, and PBS comparisons
- **Real-Time Data** - live transactions, blocks, and validator data from Ethereum mainnet
- **Transaction Tracking** - follow any transaction hash (or enter "latest") through its complete lifecycle
- **Smart Transaction Decoding** - identifies swaps, transfers, approvals, mints, claims, and contract calls using receipt analysis
- **MEV Detection** - scan blocks for sandwiches, arbitrage, liquidations, and JIT liquidity using parallel receipt fetching
- **Finality Monitoring** - watch Casper-FFG checkpoints in action

### Technical Foundations
- **No Local Node Required** - Uses public APIs (Alchemy/Infura JSON-RPC, Beacon API, MEV relays like Flashbots)
- **Parallel Data Fetching** - Goroutines with bounded worker pools for fast API responses
- **Generic TTL Cache** - Shared cache implementation across all data sources
- **Responsive Design** - Works on desktop, tablet, mobile
- **Dark Theme** - Easy on the eyes for extended learning sessions
- **Health Monitoring** - Liveness and readiness probes for all data sources

## For Technical Reviewers

If you are evaluating this project for solutions architecture, technical BD, or infrastructure engineering roles, focus on:

- **Multi-source data stitching**: one API response aggregates execution, consensus, and relay data.
- **Failure-aware behavior**: upstream timeouts, cache fallback, and rate-limit handling instead of a single happy path.
- **Typed contracts at boundaries**: consistent backend envelope + typed frontend API contracts.
- **Operational hygiene**: health/readiness endpoints, CI checks, and environment-driven configuration.
- **Domain fluency**: transaction lifecycle, validator economics, and MEV mechanics explained with implementation context.

## Quick Start

### Prerequisites

- **Go** — use a toolchain that satisfies [`backend/go.mod`](backend/go.mod) (`go` directive; install from [go.dev](https://go.dev/dl/))
- **Node.js 18+** (for the frontend) - [Download Node.js](https://nodejs.org/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/DanDo385/eth-tx-lifecycle.git
   cd eth-tx-lifecycle
   ```

2. **Install dependencies**:
   ```bash
   # Install Go dependencies (backend)
   cd backend && go mod tidy && cd ..

   # Install Node.js dependencies (frontend)
   cd frontend && npm install && cd ..
   ```

3. **Start both servers**:
   ```bash
   # Option A: Use Make (recommended) - starts backend in background, frontend in foreground
   make start

   # Option B: Use scripts in separate terminals
   ./scripts/start-backend.sh   # Terminal 1 (port 8080)
   ./scripts/start-frontend.sh  # Terminal 2 (port 3000)
   ```

4. **Open your browser**:
   ```
   http://localhost:3000
   ```

5. **Sanity check (optional)**:
   ```bash
   cd backend && go test ./... -count=1 && cd ..
   cd frontend && npm run lint && npm run build && cd ..
   ```

### Stopping Services

```bash
make stop       # Stop both services and free ports
make status     # Check if services are running
```

## How to Use

### Lifecycle Guide (`/`)

The default route is a beginner-first core flow:

1. **Wallet send** - your signed transaction enters the network.
2. **Mempool** - pending transactions wait in a queue-like market.
3. **Builders/searchers** - competing candidate blocks are optimized.
4. **Relays** - candidate payloads are handed to proposers.
5. **Validators/proposers** - one block is proposed per slot.
6. **Finality** - justified/finalized checkpoints lock history.

If you're presenting this live, use [`demo.md`](demo.md) for the full demo script, timing, fallback flow, and Q&A prompts.

### Step 2 (Core): Mempool
Click **2) Mempool**. The backend polls the execution client’s **pending block** (`eth_getBlockByNumber` with tag `pending`) on an interval, then derives aggregate metrics. What you see is **RPC-dependent** (not a full public mempool feed).

**What you'll see:** pending txs (when the node exposes a non-empty pending block), counts, and gas/value summaries when metrics are available.

**Key insight:** Higher gas competition shows up as higher average priority pricing in the pending set your RPC returns.

### Steps 3–4 (Core): Builders and relays (PBS)
Click **3) Builders/searchers**, then **4) Relays**.

**What you'll see:** competing builder payloads vs payloads actually delivered to proposers; sometimes a **fallback** path surfaces delivered data when `builder_blocks_received` is empty—still useful for the story.

**Key insight:** The same user txs can appear across multiple competing builder blocks, so counts look “inflated” compared to on-chain inclusion.

### Step 5 (Core): Validators/proposers
Click **5) Validators/proposers** for consensus head headers enriched with relay bid fields where available.

### Step 6 (Core): Finality
Click **6) Finality** for Casper-FFG checkpoints (justified / finalized epochs).

### MEV Lab (`/mev-lab`)
Use the dedicated MEV page for:

- live MEV scans (`/api/mev/sandwich`) with block input;
- pre-PBS vs PBS architecture narrative;
- estimate methodology cards that clearly separate observed live signals from assumption-based historical proxies.

Treat MEV output as **educational heuristics** (sandwiches, arb-like patterns, liquidations, JIT-style liquidity), not production-grade forensics.

### Track a transaction (panel below the steps)
Enter a **tx hash** or **`latest`**, then **Track**. You get execution + receipt context, optional relay bidtrace fields, and a beacon-derived finality hint when data is available.

## Architecture

```
+-----------------------------------------------------------+
|                  Browser (localhost:3000)                   |
|                                                            |
|  Next.js Frontend with Educational Components              |
|  - Step-by-step on-page guide                              |
|  - User-friendly Metric Cards                              |
|  - Transaction decoder (swap, transfer, approve, etc.)     |
+----------------------------+-------------------------------+
                             | API Calls (/api/*)
                             v
+-----------------------------------------------------------+
|              Backend Server (localhost:8080)                |
|                                                            |
|  - Parallel data fetching with goroutines                  |
|  - Generic TTL cache (beacon, relay, snapshot)             |
|  - Worker pool for receipt scanning (MEV detection)        |
|  - Transaction lifecycle tracking with receipt analysis    |
|  - Health monitoring (liveness + readiness probes)         |
+----+----------+----------+-----------+--------------------+
     |          |          |           |
     v          v          v           v
+---------+ +--------+ +---------+ +--------------+
| RPC API | | Beacon | |Flashbots| | Other Relays |
|  (EL)   | |  API   | |  Relay  | |              |
+---------+ +--------+ +---------+ +--------------+
```

### Why This Architecture?

- **Go Backend**: Fast, concurrent data fetching from multiple APIs with goroutines
- **Next.js Frontend**: React app router + client UI; `/api/*` is rewritten to the Go server in dev
- **Public APIs**: No blockchain sync required (saves 500+ GB disk space!)
- **Generic Cache**: Single `Cache[V any]` type shared across beacon, relay, and snapshot modules
- **API Proxy**: Configurable proxy mode (`next.config.mjs` rewrites by default, `PROXY_MODE=route` for Railway/Vercel)

## Key Design Decisions

1. **Single response envelope (`data`/`error`)**  
   Every backend endpoint returns the same shape, which simplifies frontend error handling and keeps demo behavior predictable under partial failures.

2. **Parallel fetch + bounded time budgets**  
   RPC providers are raced and relay requests use a budget window to avoid slow upstreams dominating user-facing latency.

3. **Graceful degradation over strict failure**  
   When a preferred upstream endpoint is empty/unavailable, the app falls back to adjacent data so the learning flow still works.

4. **UI optimized for explanation, not raw telemetry**  
   Values are converted from hex/wei/gwei into human units, and each panel explains why the metric matters.

5. **Configuration-first runtime behavior**  
   Timeouts, relay URLs, cache TTLs, and analysis limits are all driven by env vars to keep deployments portable.

6. **Creative analogy with explicit boundaries**  
   Post-office storytelling is intentionally simplified for learning, but each major section includes a "reality check" so the narrative remains technically honest.

7. **Estimate labeling for historical comparisons**  
   Any pre/post PBS comparison values in UI are marked as educational estimates with confidence labels and visible assumptions.

## What I'd Do Differently in Production

- Add structured JSON logging (`slog`) with request IDs and correlation across upstream calls.
- Add explicit rate limiting and abuse protection on expensive analysis endpoints.
- Add OpenTelemetry traces + RED metrics for route-level latency/error monitoring.
- Expand integration tests with fixture-backed upstream mocks and contract testing.
- Replace canary frontend dependency pin with stable release policy + automated dependency updates.

## Tech Stack (and Why)

- **Go (backend)**: explicit concurrency primitives and predictable runtime for multi-upstream aggregation.
- **Next.js + React + TypeScript (frontend)**: rapid UI iteration for educational storytelling plus type-safe contracts.
- **Tailwind CSS**: quick, consistent visual hierarchy without heavy component-framework lock-in.
- **GitHub Actions**: low-friction CI gate for test/build/lint quality checks.

## Project Structure

```
eth-tx-lifecycle/
├── backend/                           # Go backend service
│   ├── cmd/
│   │   └── eth-tx-lifecycle/
│   │       └── main.go                # Service entrypoint
│   ├── config/
│   │   └── config.go                  # Env + shared helpers (+ tests)
│   ├── internal/
│   │   ├── run.go                     # backend.Run entrypoint
│   │   ├── server/
│   │   │   └── server.go              # HTTP routes & handlers (+ tests)
│   │   ├── clients/
│   │   │   ├── eth/eth.go             # JSON-RPC client (+ tests)
│   │   │   ├── beacon/beacon.go       # Beacon REST client
│   │   │   └── relay/relay.go         # MEV relay HTTP client
│   │   ├── domain/
│   │   │   ├── mempool.go             # Pending-block polling + metrics
│   │   │   ├── track.go               # Transaction lifecycle tracking
│   │   │   ├── relay_merge.go         # Shared relay list merge/dedupe
│   │   │   ├── txdecode.go            # Transaction input decoder
│   │   │   ├── mev.go                 # MEV heuristics (parallel receipts)
│   │   │   └── snapshot.go            # Aggregated snapshot (+ tests)
│   │   └── pkg/
│   │       ├── cache.go               # Generic TTL cache (+ tests)
│   │       └── health.go              # Health helpers (+ tests)
│   ├── go.mod
│   └── go.sum
│
├── frontend/                          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                   # Core lifecycle guide (beginner-first)
│   │   ├── mev-lab/page.tsx           # Dedicated MEV lab and PBS comparison view
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles
│   │   ├── types/
│   │   │   └── api.ts                 # Typed API / envelope contracts
│   │   ├── components/                # Panels, views, diagrams, API displays
│   │   ├── api/
│   │   │   ├── [...path]/route.ts     # Optional route proxy (`PROXY_MODE=route`)
│   │   │   └── test/route.ts          # Dev-only test route (404 in prod unless enabled)
│   │   └── utils/
│   │       └── format.ts              # Hex / wei / gwei → human units
│   ├── next.config.mjs                # Rewrites + CSP headers
│   ├── tailwind.config.ts             # Tailwind configuration
│   ├── tsconfig.json                  # TypeScript (strict)
│   ├── package.json                   # `lint` = `tsc --noEmit`
│   └── public/
│       └── favicon.ico
│
├── .github/workflows/
│   └── ci.yml                           # Go test + vet + frontend lint/build
├── scripts/
│   ├── start-backend.sh               # Source root `.env.local`, build, run API
│   └── start-frontend.sh              # Source root `.env.local`, `next dev`
├── Makefile                           # start / stop / status
├── .env.example                       # Template env (copy to `.env.local`)
├── .env.local                         # Local secrets/overrides (not committed)
├── AGENTS.md                          # AI/agent instructions for this repo
└── README.md                          # This file
```

## API Endpoints

### Data Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/mempool` | Pending-block snapshot + aggregate metrics (from `eth_getBlockByNumber("pending", true)` polling) |
| `GET /api/relays/received` | Builder blocks submitted to relays |
| `GET /api/relays/delivered` | Winning blocks delivered to validators |
| `GET /api/validators/head` | Beacon chain headers enriched with builder payments |
| `GET /api/finality` | Casper-FFG finality checkpoints |
| `GET /api/snapshot` | Aggregated data from all sources (server + upstream caching) |
| `GET /api/block/{number}` | Full block with all transactions |

### Tracking & Analysis
| Endpoint | Description |
|----------|-------------|
| `GET /api/track/tx/{hash}` | Complete transaction lifecycle (supports "latest") |
| `GET /api/mev/sandwich?block={id}` | MEV detection (sandwiches, arbitrage, liquidations, JIT) |

### Health
| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Detailed health status of all data sources |
| `GET /api/health/live` | Liveness probe (is the server running?) |
| `GET /api/health/ready` | Readiness probe (are critical sources healthy?) |

## Configuration

Copy the template and edit only what you need:

```bash
cp .env.example .env.local
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GOAPI_ORIGIN` | Next rewrites **and** Go CORS (same name—see note below) | Usually **omit** locally so defaults apply |
| `PROXY_MODE` | Optional route-based proxy mode (`route`) | unset |
| `ENABLE_TEST_API_ROUTE` | Keep `/api/test` enabled in production | `false` |
| `GOAPI_ADDR` | Backend listen address | `:8080` |
| `PORT` | Fallback backend port (used when `GOAPI_ADDR` unset) | `8080` |
| `WEB_PORT` | Next dev server port (`scripts/start-frontend.sh`) | `3000` |
| `RPC_HTTP_URL` | Primary execution-layer RPC endpoint | public endpoint fallback |
| `RPC_HTTP_URL1..10` | Optional multi-provider RPC failover/racing | unset |
| `RPC_WS_URL` | Optional websocket endpoint for source display | unset |
| `RPC_TIMEOUT_SECONDS` | Execution RPC timeout (1-60) | `5` |
| `BEACON_API_URL` | Primary consensus-layer API endpoint | `https://beacon.prylabs.net` |
| `BEACON_API_FALLBACK_URLS` | Comma-separated fallback Beacon REST endpoints | PublicNode + ChainSafe Lodestar |
| `RELAY_URLS` | Comma-separated MEV relay base URLs | built-in public list |
| `RELAY_BUDGET_MS` | Total relay fanout budget per request | `2500` |
| `UPSTREAM_TIMEOUT_SECONDS` | HTTP timeout for beacon/relay clients | `3` |
| `CACHE_TTL_SECONDS` | Success cache TTL for upstream responses | `20` |
| `ERROR_CACHE_TTL_SECONDS` | Error cache TTL | `10` |
| `SNAPSHOT_TTL_SECONDS` | Snapshot cache override | `30` |
| `MEMPOOL_DISABLE` | Disable live mempool and use mock data | `false` |
| `MEV_MAX_TX` | Max tx scanned per block during MEV analysis | `400` |
| `MEV_WORKERS` | Parallel workers for MEV receipt fetching | `10` |

The defaults are chosen for local demos. For evaluator-facing demos, use your own RPC key(s) and keep relay lists explicit in `.env.local`.

**`GOAPI_ORIGIN` in local dev:** `scripts/start-*.sh` source the same root `.env.local` for both processes. Next needs the **backend URL** for rewrites; Go needs the **browser origin** for CORS. If you set `GOAPI_ORIGIN=http://localhost:8080` for Next, the Go process may inherit it and emit the wrong `Access-Control-Allow-Origin` for a UI on port 3000. **Practical default:** omit `GOAPI_ORIGIN` from root `.env.local` so Next’s rewrite default (`http://localhost:8080`) and Go’s CORS default (`http://localhost:3000`) both apply; override only when your ports or hosts differ.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`/`master`:

- **Go:** `go test ./...` (with a low coverage floor), `go vet ./...`
- **Frontend:** `npm ci`, `npm run lint` (`tsc --noEmit`), `npm run build`

## Timed demo (150 seconds)

**Prep (before the clock):** start the stack, open `http://localhost:3000`, click **1) Mempool** once and wait for data so the first snapshot is warm.

| Time | Do |
|------|-----|
| 0:00–0:15 | One-sentence hook; point at the **Transaction Flow** diagram. |
| 0:15–0:45 | **1) Mempool** — pending block view + metrics. |
| 0:45–1:15 | **2) Builders → Relays** then **3) Relays → Validators** — auction vs winner; mention fallback if shown. |
| 1:15–1:30 | **5) Finality checkpoints** — one line on justified vs finalized. |
| 1:30–1:45 | **Track** — `latest` or a pre-tested hash. |
| 1:45–2:30 | One architecture sentence (Go aggregates + envelope; Next explains); **skip 6) MEV** on a cold run unless pre-warmed. |

For a fuller presenter-focused runbook (3-minute and 6-minute versions), see [`demo.md`](demo.md).

## Demo assets (optional)

Capture under `docs/assets/` for portfolio/README embeds: main flow + step buttons; 2→3 toggle; tracker panel; `GET /api/health` JSON or in-app source line.

## Troubleshooting

### Common Issues

**"No builder block submissions found"**
- The relay API may be rate limiting. Try again in a few minutes.

**Empty or sparse mempool panel**
- Data comes from the node’s **pending block** view (`eth_getBlockByNumber("pending", true)`). Some RPCs return an empty or minimal pending block.
- Use a dedicated RPC (your own key) or retry after a few seconds.

**"Beacon API temporarily unavailable"**
- The backend now tries the primary Beacon REST endpoint, then the fallback list in `BEACON_API_FALLBACK_URLS`.
- If all public endpoints are slow or rate-limited, wait a minute or configure a dedicated Beacon REST endpoint.

**Port already in use**
- Run `make stop` to stop all services and free ports.
- Or manually: `lsof -ti:8080 | xargs kill` and `lsof -ti:3000 | xargs kill`

### Checking Service Health

```bash
# Detailed health status
curl http://localhost:8080/api/health

# Liveness probe
curl http://localhost:8080/api/health/live

# Readiness probe
curl http://localhost:8080/api/health/ready

# Test mempool endpoint
curl http://localhost:8080/api/mempool
```

## Contributing

This is an educational project and contributions are welcome!

**How to contribute:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Verify backend: `cd backend && go test ./... -count=1 && go vet ./... && go build ./cmd/eth-tx-lifecycle`
5. Verify frontend: `cd frontend && npm run lint && npm run build`
6. Submit a pull request

## License

MIT License - Educational use encouraged!

This tool is for learning purposes. Not financial advice. Use at your own risk.

## Acknowledgments

- **Ethereum Foundation** - For building this technology
- **Flashbots** - For MEV research and transparency
- **Alchemy** - For public RPC endpoints
- **Beacon API providers (Prysm, PublicNode, Beaconcha.in)** - For beacon chain API access

---

**GitHub**: [DanDo385/eth-tx-lifecycle](https://github.com/DanDo385/eth-tx-lifecycle)
