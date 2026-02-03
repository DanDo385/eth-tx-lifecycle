# eth-tx-lifecycle - Ethereum Transaction Visualizer

**An educational tool for understanding how Ethereum really works** - from your first "send" click to permanent blockchain finality.

Perfect for beginners with zero cryptocurrency knowledge! This visualizer shows real-time data from the Ethereum network with detailed explanations, analogies, and interactive learning tools.

## What You'll Learn

- **How cryptocurrency transactions work** - Complete journey from mempool to finality
- **Gas fees explained** - Base fees vs priority fees (tips), and where your money goes
- **MEV (Maximal Extractable Value)** - How professional traders profit from transaction ordering
- **Validator economics** - How block proposers earn money
- **Blockchain security** - How Ethereum makes transactions irreversible
- **Real MEV activity** - Sandwiches, arbitrage, liquidations, JIT liquidity happening on the network right now

## Features

### For Complete Beginners
- **Interactive Glossary** - 40+ terms organized by category with hover definitions
- **Step-by-Step Guide** - Numbered walkthrough explaining each panel
- **Real-World Analogies** - Post office metaphors, concert ticket scalpers, bank comparisons
- **Educational Tooltips** - Detailed explanations throughout with "why this matters" sections
- **Visual Metrics** - User-friendly cards showing gas prices, transaction counts, validator earnings

### Advanced Features
- **Real-Time Data** - Live transactions, blocks, and validator data from Ethereum mainnet
- **Transaction Tracking** - Follow any transaction hash (or enter "latest") through its complete lifecycle
- **Smart Transaction Decoding** - Identifies swaps, transfers, approvals, mints, claims, and contract calls using receipt analysis
- **MEV Detection** - Scan blocks for sandwiches, arbitrage, liquidations, and JIT liquidity using parallel receipt fetching
- **Builder Competition** - See multiple builders bidding for the same block slot
- **Finality Monitoring** - Watch Casper-FFG checkpoints in action

### Technical
- **No Local Node Required** - Uses public APIs (Alchemy/Infura JSON-RPC, Beacon API, MEV relays like Flashbots)
- **Parallel Data Fetching** - Goroutines with bounded worker pools for fast API responses
- **Generic TTL Cache** - Shared cache implementation across all data sources
- **Responsive Design** - Works on desktop, tablet, mobile
- **Dark Theme** - Easy on the eyes for extended learning sessions
- **Health Monitoring** - Liveness and readiness probes for all data sources

## Quick Start

### Prerequisites

- **Go 1.22+** (for the API server) - [Download Go](https://go.dev/dl/)
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

### Stopping Services

```bash
make stop       # Stop both services and free ports
make status     # Check if services are running
```

## How to Use (Beginner's Guide)

### Step 1: Start with the Mempool
Click **"1) Mempool"** to see real transactions waiting to be processed. This is like watching mail waiting to be sorted at the post office.

**What you'll see:**
- How many transactions are waiting (could be thousands!)
- Current gas prices (fees people are paying)
- Total value being transferred
- Explanation of base fees vs priority fees (tips)

**Key insight**: Gas prices change constantly based on network demand. Higher prices = more competition for block space!

### Step 2-3: See the MEV Competition
Click **"2) Builders -> Relays"** to see professional block builders competing, then **"3) Relays -> Validators"** to see which blocks won.

**What you'll see:**
- Multiple builders creating different blocks for the same 12-second slot
- How much they're bidding to have their block chosen
- Only one winner per slot gets included on-chain
- Builder payments to validators (MEV profit sharing)

**Key insight**: The total transaction count is inflated because the same transactions appear in multiple competing blocks!

### Step 3: Track a Transaction
Enter any transaction hash or type **"latest"** to follow a real transaction through its lifecycle.

**What you'll see:**
- Transaction type detection (swap, transfer, approval, contract call, etc.)
- Gas economics breakdown
- Block inclusion details with neighboring transactions
- MEV relay data (builder/proposer info)
- Finality status from beacon chain checkpoints

### Step 4: Explore Proposed Blocks
Click **"4) Proposed blocks + Builder payments"** to see actual blocks that made it on-chain.

**What you'll see:**
- MEV-Boost blocks (built by professionals) vs Vanilla blocks (built locally)
- Complete breakdown of validator earnings
- Block fullness and gas utilization
- Which builders dominate the market

### Step 5: Understand Finality
Click **"5) Finality checkpoints"** to see how transactions become permanent and irreversible.

**What you'll see:**
- Justification -> Finalization process (2-step security)
- Current network health status
- Economic security ($30+ billion to reverse finalized blocks)

### Step 6: Detect MEV Attacks
Click **"6) MEV detector"** and enter "latest" or a specific block number to scan for attacks.

**What you'll see:**
- Sandwich attacks where traders lost money (front-run → victim → back-run)
- Arbitrage transactions (multi-pool atomic swaps)
- Liquidations on Aave/Compound lending protocols
- JIT liquidity (just-in-time mint → swap → burn patterns)

## Architecture

```
+-----------------------------------------------------------+
|                  Browser (localhost:3000)                   |
|                                                            |
|  Next.js Frontend with Educational Components              |
|  - Interactive Glossary (40+ terms)                        |
|  - Step-by-step Walkthrough                                |
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
- **Next.js Frontend**: Modern React with server-side rendering
- **Public APIs**: No blockchain sync required (saves 500+ GB disk space!)
- **Generic Cache**: Single `Cache[V any]` type shared across beacon, relay, and snapshot modules
- **API Proxy**: Configurable proxy mode (`next.config.mjs` rewrites by default, `PROXY_MODE=route` for Railway/Vercel)

## Project Structure

```
eth-tx-lifecycle/
├── backend/                           # Go backend service
│   ├── cmd/
│   │   └── eth-tx-lifecycle/
│   │       └── main.go                # Service entrypoint
│   ├── config/
│   │   └── config.go                  # Env + shared helpers
│   ├── internal/
│   │   ├── run.go                     # backend.Run entrypoint
│   │   ├── server/
│   │   │   └── server.go              # HTTP routes & request handlers
│   │   ├── clients/
│   │   │   ├── eth/eth.go             # Ethereum JSON-RPC client
│   │   │   ├── beacon/beacon.go       # Beacon chain REST client
│   │   │   └── relay/relay.go         # MEV relay client
│   │   ├── domain/
│   │   │   ├── mempool.go             # Mempool polling + metrics
│   │   │   ├── track.go               # Transaction lifecycle tracking
│   │   │   ├── txdecode.go            # Transaction input decoder
│   │   │   ├── mev.go                 # MEV detection (sandwiches, arbitrage, liquidations, JIT)
│   │   │   └── snapshot.go            # Aggregated snapshot data
│   │   └── pkg/
│   │       ├── cache.go               # Generic TTL cache
│   │       └── health.go              # Health monitoring helpers
│   ├── go.mod
│   └── go.sum
│
├── frontend/                          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                   # Main application with intro & guides
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles
│   │   ├── components/
│   │   │   ├── TransactionView.tsx    # Human-readable transaction display
│   │   │   ├── BuilderRelayView.tsx   # Builder competition visualization
│   │   │   ├── RelayDeliveredView.tsx # Winning blocks display
│   │   │   ├── BeaconHeadersView.tsx  # Block proposals & validator earnings
│   │   │   ├── FinalityView.tsx       # Casper-FFG finality checkpoints
│   │   │   ├── MEVView.tsx            # MEV detection results (sandwiches, arbs, liquidations, JIT)
│   │   │   ├── Glossary.tsx           # Interactive glossary (40+ terms)
│   │   │   ├── MermaidDiagram.tsx     # Transaction flow diagram
│   │   │   ├── MetricCard.tsx         # Reusable metric display card
│   │   │   ├── Panel.tsx              # Panel wrapper
│   │   │   ├── GlowButton.tsx         # Styled button component
│   │   │   ├── Alert.tsx              # Alert/notification component
│   │   │   ├── ProgressBar.tsx        # Progress bar component
│   │   │   └── CaptureButton.tsx      # Screenshot capture button
│   │   ├── api/
│   │   │   ├── [...path]/route.ts     # Conditional API proxy to Go backend
│   │   │   └── test/route.ts          # Test route to verify API routing
│   │   ├── utils/
│   │   │   └── format.ts              # Data formatting (hex->decimal, wei->ETH)
│   ├── next.config.mjs                # Next.js config with API rewrites
│   ├── tailwind.config.ts             # Tailwind CSS configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── package.json                   # Frontend dependencies
│   └── public/
│       └── favicon.ico
│
├── scripts/
│   ├── start-backend.sh               # Compile and start backend server
│   └── start-frontend.sh              # Start Next.js dev server
├── Makefile                           # Build/start/stop commands
├── .env.local                         # Environment configuration (not committed)
├── CLAUDE.md                          # AI assistant documentation
├── .cursorrules                       # Cursor IDE rules
└── README.md                          # This file
```

## API Endpoints

### Data Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/mempool` | Real-time mempool data with aggregate metrics |
| `GET /api/relays/received` | Builder blocks submitted to relays |
| `GET /api/relays/delivered` | Winning blocks delivered to validators |
| `GET /api/validators/head` | Beacon chain headers enriched with builder payments |
| `GET /api/finality` | Casper-FFG finality checkpoints |
| `GET /api/snapshot` | Aggregated data from all sources (cached) |
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

The application uses `.env.local` at the repository root. Key variables:

```bash
# Ethereum RPC (execution layer)
RPC_HTTP_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_TIMEOUT_SECONDS=5

# Beacon API (consensus layer)
BEACON_API_URL=https://beacon.prylabs.net
UPSTREAM_TIMEOUT_SECONDS=3

# MEV Relays (comma-separated)
RELAY_URLS=https://boost-relay.flashbots.net,https://agnostic-relay.net
RELAY_BUDGET_MS=2500

# Server / Frontend
GOAPI_ADDR=:8080
WEB_PORT=3000
GOAPI_ORIGIN=http://localhost:8080

# Frontend Proxy (for Railway/Vercel deployments)
PROXY_MODE=                  # Set to "route" for server-side proxy

# Caching
CACHE_TTL_SECONDS=30
ERROR_CACHE_TTL_SECONDS=15
SNAPSHOT_TTL_SECONDS=30      # Used by SnapshotTTL helper

# MEV Detection
MEV_MAX_TX=400               # Max transactions to scan per block
MEV_WORKERS=10               # Parallel receipt fetch workers

# Mempool
MEMPOOL_DISABLE=false        # Set to true/1 for mock data
```

**Note**: `GOAPI_ORIGIN` is used by the Next.js proxy target and by the Go backend for CORS allow-origin (backend default is `http://localhost:3000` if unset). The default public endpoints work for learning; change them only if you want to use your own API keys or local nodes.

## Troubleshooting

### Common Issues

**"No builder block submissions found"**
- The relay API may be rate limiting. Try again in a few minutes.

**"Mempool data not available from public RPC"**
- Some RPC providers don't expose txpool APIs. The tool works with limited mempool data.
- For full mempool access, use your own Alchemy API key.

**"Beacon API temporarily unavailable"**
- Public beacon APIs have rate limits. Wait a minute and try again.

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
4. Verify: `cd backend && go build ./cmd/eth-tx-lifecycle && go vet ./...`
5. Verify: `cd frontend && npm run build`
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
