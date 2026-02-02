# Refactoring Opportunities Analysis

This document outlines opportunities for refactoring, optimization, and improvement across the codebase.

## 1. Refactoring Opportunities

### 1.1 Consolidate Caching Logic
**Location**: `backend/internal/beacon.go`, `backend/internal/relay.go`, `backend/internal/snapshot.go`

**Issue**: Three separate caching implementations with similar patterns:
- `beaconCacheGet/Set` with `beaconMu` mutex
- `relayCacheGet/Set` with `relayMu` mutex  
- `snapshotCacheGet/Set` with `snapshotMu` mutex

**Recommendation**: Create a generic `cache.go` with a reusable `Cache[T]` type:
```go
type Cache[T any] struct {
    mu      sync.RWMutex
    entries map[string]cacheEntry[T]
    ttl     time.Duration
    errTTL  time.Duration
}
```

**Benefits**:
- Reduces code duplication (~150 lines saved)
- Consistent caching behavior across all modules
- Easier to add features like LRU eviction later

### 1.2 Extract Environment/Config Management
**Location**: `backend/internal/eth_rpc.go` (lines 47-78)

**Issue**: `loadEnvFile()` and `envOr()` are defined in `eth_rpc.go` but used across multiple files (`beacon.go`, `relay.go`, `mempool_ws.go`, etc.)

**Recommendation**: Create `backend/internal/config.go`:
```go
package backend

import (
    "bufio"
    "os"
    "strconv"
    "strings"
    "time"
)

// LoadEnvFile reads .env.local and sets environment variables
func LoadEnvFile(filename string) { ... }

// EnvOr returns env var or fallback
func EnvOr(key, fallback string) string { ... }

// EnvOrInt returns env var as int or fallback
func EnvOrInt(key string, fallback int) int { ... }

// EnvOrDuration returns env var as duration or fallback
func EnvOrDuration(key string, fallback time.Duration) time.Duration { ... }
```

**Benefits**:
- Single source of truth for config
- Type-safe helpers reduce parsing errors
- Easier to add validation

### 1.3 Unify HTTP Client Configuration
**Location**: `backend/internal/eth_rpc.go`, `backend/internal/beacon.go`, `backend/internal/relay.go`

**Issue**: Three separate HTTP clients with similar timeout logic:
- `rpcHTTPClient` (5s default, configurable via `RPC_TIMEOUT_SECONDS`)
- `beaconHTTPClient` (3s default, configurable via `UPSTREAM_TIMEOUT_SECONDS`)
- `relayHTTPClient` (3s default, configurable via `UPSTREAM_TIMEOUT_SECONDS`)

**Recommendation**: Create `backend/internal/http_client.go`:
```go
func NewHTTPClient(timeoutKey string, defaultTimeout time.Duration) *http.Client {
    timeout := EnvOrDuration(timeoutKey, defaultTimeout)
    return &http.Client{Timeout: timeout}
}
```

**Benefits**:
- Consistent timeout handling
- Single place to add retry logic, circuit breakers, etc.

### 1.4 Extract Hex/Big Number Utilities
**Location**: `backend/internal/track_tx.go` (line 27), `backend/internal/tx_decoder.go` (multiple places)

**Issue**: Hex parsing and big.Int operations scattered across files:
- `parseHexUint64()` in `track_tx.go`
- `weiToEthString()` in `tx_decoder.go`
- Manual hex parsing in multiple places

**Recommendation**: Create `backend/internal/hexutil.go` (or use go-ethereum - see section 4):
```go
func ParseHexUint64(s string) (uint64, error) { ... }
func HexToBigInt(s string) (*big.Int, error) { ... }
func WeiToEth(wei *big.Int) *big.Float { ... }
func GweiToWei(gwei float64) *big.Int { ... }
```

## 2. Goroutine Opportunities

### 2.1 Parallelize Transaction Tracking (`track_tx.go`)
**Location**: `backend/internal/track_tx.go`, `handleTrackTx()` function

**Current**: Sequential API calls:
1. `rpcCall("eth_getTransactionByHash")` 
2. `rpcCall("eth_getTransactionReceipt")` (if not pending)
3. `rpcCall("eth_getBlockByNumber")` (if not pending)
4. `relayGET(...)` (if not pending)
5. `beaconGET("/eth/v1/beacon/genesis")` (if not pending)
6. `beaconGET("/eth/v1/beacon/states/finalized/finality_checkpoints")` (if not pending)

**Recommendation**: Use goroutines with channels:
```go
type txData struct {
    receipt  json.RawMessage
    block    json.RawMessage
    relay    json.RawMessage
    genesis  json.RawMessage
    finality json.RawMessage
    errs     map[string]error
}

data := &txData{errs: make(map[string]error)}
var wg sync.WaitGroup

if !pending {
    wg.Add(5)
    go func() { defer wg.Done(); data.receipt, data.errs["receipt"] = rpcCall(...) }()
    go func() { defer wg.Done(); data.block, data.errs["block"] = rpcCall(...) }()
    go func() { defer wg.Done(); data.relay, data.errs["relay"] = relayGET(...) }()
    go func() { defer wg.Done(); data.genesis, _, data.errs["genesis"] = beaconGET(...) }()
    go func() { defer wg.Done(); data.finality, _, data.errs["finality"] = beaconGET(...) }()
    wg.Wait()
}
```

**Expected Improvement**: 3-5x faster (from ~2-3s to ~500-800ms)

### 2.2 Parallelize Receipt Fetching (`sandwich.go`)
**Location**: `backend/internal/sandwich.go`, `collectSwaps()` function

**Current**: Sequential receipt fetching in loop:
```go
for idx := 0; idx < maxN; idx++ {
    rcpt, err := fetchReceipt(tx.Hash)  // Blocks here
    // ... process receipt
}
```

**Recommendation**: Batch fetch with worker pool:
```go
type receiptResult struct {
    idx int
    rcpt *receipt
    err error
}

results := make(chan receiptResult, maxN)
var wg sync.WaitGroup

// Worker pool (10 concurrent workers)
sem := make(chan struct{}, 10)
for idx := 0; idx < maxN; idx++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        sem <- struct{}{}  // Acquire
        defer func() { <-sem }()  // Release
        
        rcpt, err := fetchReceipt(b.Transactions[i].Hash)
        results <- receiptResult{i, rcpt, err}
    }(idx)
}

go func() { wg.Wait(); close(results) }()

// Collect results in order
receipts := make(map[int]*receipt)
for r := range results {
    if r.err == nil {
        receipts[r.idx] = r.rcpt
    }
}
```

**Expected Improvement**: 5-10x faster for blocks with 100+ transactions (from ~10s to ~1-2s)

### 2.3 Parallelize Relay Requests (`relay.go`)
**Location**: `backend/internal/relay.go`, `relayGET()` function

**Current**: Tries relays sequentially with time budget:
```go
for _, base := range relayBases {
    if time.Since(started) > relayBudget { break }
    // Try this relay...
}
```

**Recommendation**: Try all relays in parallel, return first success:
```go
type relayResult struct {
    body json.RawMessage
    base string
    err  error
}

results := make(chan relayResult, len(relayBases))
ctx, cancel := context.WithTimeout(context.Background(), relayBudget)
defer cancel()

for _, base := range relayBases {
    go func(b string) {
        body, err := tryRelay(ctx, b, path)
        select {
        case results <- relayResult{body, b, err}:
        case <-ctx.Done():
        }
    }(base)
}

// Return first successful result
for i := 0; i < len(relayBases); i++ {
    select {
    case r := <-results:
        if r.err == nil && len(r.body) > 0 {
            relayCacheSet(path, r.body)
            return r.body, nil
        }
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}
```

**Expected Improvement**: 2-3x faster when first relay succeeds (from ~500ms to ~150-200ms)

### 2.4 Background Cache Warming
**Location**: `backend/internal/snapshot.go`

**Current**: Cache is populated on-demand when requests come in.

**Recommendation**: Background goroutine that pre-fetches snapshot data:
```go
func startSnapshotWarmer() {
    ticker := time.NewTicker(snapshotTTL / 2)  // Refresh at 50% TTL
    go func() {
        for range ticker.C {
            // Pre-fetch common queries
            keys := []string{
                "limit=10|sandwich=false|block=latest",
                "limit=20|sandwich=false|block=latest",
            }
            for _, key := range keys {
                // Fetch in background without blocking
                go func(k string) {
                    // Parse key and fetch data
                    // This warms cache before next request
                }(key)
            }
        }
    }()
}
```

**Benefits**: Reduces latency for common queries, better user experience

## 3. Combining Internal Files

### 3.1 Merge `beacon.go` and `relay.go` Caching
**Recommendation**: Extract caching to `cache.go`, keep API-specific logic separate:
- `cache.go`: Generic cache implementation
- `beacon.go`: Beacon API client (uses cache)
- `relay.go`: Relay API client (uses cache)

### 3.2 Consider Merging Small Utilities
**Files to consider merging**:
- `meta.go` (74 lines) + `tx_decoder.go` helpers → Could stay separate (different concerns)
- `data_source.go` (89 lines) → Currently underutilized, could be expanded or removed

**Recommendation**: Keep `meta.go` separate (URL sanitization is distinct). `data_source.go` could be expanded to actually use the interface pattern, or removed if not needed.

### 3.3 Consolidate HTTP Request Helpers
**Recommendation**: Create `backend/internal/http_helpers.go`:
```go
// Common HTTP request patterns
func GetJSON(url string, timeout time.Duration) (json.RawMessage, int, error) { ... }
func PostJSON(url string, body []byte, timeout time.Duration) (json.RawMessage, int, error) { ... }
```

Then `beacon.go` and `relay.go` can use these instead of duplicating HTTP logic.

## 4. go-ethereum Integration

### 4.1 Add go-ethereum Dependencies
**Package**: `github.com/ethereum/go-ethereum`

**Recommended imports**:
```go
import (
    "github.com/ethereum/go-ethereum/common"
    "github.com/ethereum/go-ethereum/common/hexutil"
    "github.com/ethereum/go-ethereum/common/math"
)
```

### 4.2 Replace Frontend Formatting Functions

**Functions that can be eliminated from `frontend/app/utils/format.ts`**:

| Frontend Function | go-ethereum Replacement | Backend Location |
|------------------|------------------------|------------------|
| `hexToNumber()` | `hexutil.DecodeUint64()` | Return as number in JSON |
| `blockNumberToNumber()` | `hexutil.DecodeUint64()` | Return as number in JSON |
| `weiToEth()` | `new(big.Float).Quo(wei, big.NewFloat(1e18))` | Return as float in JSON |
| `hexToGwei()` | `new(big.Float).Quo(wei, big.NewFloat(1e9))` | Return as float in JSON |

**Implementation Example** (`backend/internal/format.go`):
```go
package backend

import (
    "math/big"
    "github.com/ethereum/go-ethereum/common/hexutil"
)

type FormattedValue struct {
    Hex    string  `json:"hex"`     // Original hex
    Wei    *big.Int `json:"wei"`    // As big.Int (for precision)
    Eth    float64  `json:"eth"`     // As ETH (human-readable)
    Gwei   float64 `json:"gwei"`    // As Gwei (human-readable)
}

func FormatWei(hexWei string) (*FormattedValue, error) {
    wei, err := hexutil.DecodeBig(hexWei)
    if err != nil {
        return nil, err
    }
    
    eth := new(big.Float).SetInt(wei)
    eth.Quo(eth, big.NewFloat(1e18))
    ethFloat, _ := eth.Float64()
    
    gwei := new(big.Float).SetInt(wei)
    gwei.Quo(gwei, big.NewFloat(1e9))
    gweiFloat, _ := gwei.Float64()
    
    return &FormattedValue{
        Hex:  hexWei,
        Wei:  wei,
        Eth:  ethFloat,
        Gwei: gweiFloat,
    }, nil
}

func FormatBlockNumber(hexBlock string) (uint64, error) {
    return hexutil.DecodeUint64(hexBlock)
}
```

**Backend Changes Needed**:
1. Update `track_tx.go` to return formatted values:
   ```go
   economics := map[string]any{
       "value_hex": t.Value,
       "value": FormatWei(t.Value),  // Returns {hex, wei, eth, gwei}
       "gas_limit_hex": t.Gas,
       "gas_limit": hexutil.DecodeUint64(t.Gas),
   }
   ```

2. Update `mempool_ws.go` to return formatted metrics:
   ```go
   type MempoolMetrics struct {
       TotalGasRequested uint64  `json:"totalGasRequested"`
       TotalValueWei     string  `json:"totalValueWei"`
       TotalValueEth     float64 `json:"totalValueEth"`  // NEW
       AvgGasPriceGwei   float64 `json:"avgGasPriceGwei"` // NEW (rename from avgGasPrice)
   }
   ```

3. Update all endpoints to return numbers instead of hex strings where appropriate.

**Frontend Changes**:
- Remove `hexToNumber()`, `blockNumberToNumber()`, `weiToEth()`, `hexToGwei()` from `format.ts`
- Update components to use `data.value.eth` instead of `weiToEth(data.value)`
- Keep display helpers like `shortenAddress()`, `timeAgo()`, `formatUSD()` (these are UI-specific)

**Benefits**:
- Eliminates ~40 lines from frontend
- More accurate (big.Int precision preserved)
- Consistent formatting across backend/frontend
- Type safety (numbers vs strings)

### 4.3 Additional go-ethereum Utilities

**Address Validation**:
```go
import "github.com/ethereum/go-ethereum/common"

func IsValidAddress(addr string) bool {
    return common.IsHexAddress(addr)
}

func ToChecksumAddress(addr string) string {
    return common.HexToAddress(addr).Hex()
}
```

**Hash Utilities**:
```go
import "github.com/ethereum/go-ethereum/common"

func ShortenHash(hash string) string {
    addr := common.HexToHash(hash)
    return addr.Hex()[:10] + "..." + addr.Hex()[len(addr.Hex())-8:]
}
```

## 5. Frontend API Refactoring

### 5.1 Current Architecture
**Location**: `frontend/app/api/[...path]/route.ts`

**Current**: Catch-all proxy that forwards all requests to `GOAPI_ORIGIN`:
- Works for Railway (backend on different domain)
- Works for local dev (backend on localhost:8080)
- No type safety
- Hard to add request/response transformations

### 5.2 Recommended Refactoring

**Option A: Environment-Based Direct Calls (Recommended)**

Create typed API client that switches based on environment:

```typescript
// frontend/app/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 
  (process.env.NODE_ENV === 'production' 
    ? process.env.GOAPI_ORIGIN || 'http://localhost:8080'
    : 'http://localhost:8080');

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/api/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message);
  }
  return envelope.data;
}

// Typed endpoints
export const api = {
  mempool: () => apiGet<MempoolData>('mempool'),
  relaysDelivered: (limit = 10) => apiGet('relays/delivered', { limit: limit.toString() }),
  relaysReceived: (limit = 10) => apiGet('relays/received', { limit: limit.toString() }),
  // ... etc
};
```

**Keep Proxy Route for Railway** (`frontend/app/api/proxy/[...path]/route.ts`):
```typescript
// Only used when NEXT_PUBLIC_USE_PROXY=true (Railway deployment)
const GOAPI_ORIGIN = process.env.GOAPI_ORIGIN || 'http://localhost:8080';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (process.env.NEXT_PUBLIC_USE_PROXY !== 'true') {
    return NextResponse.json({ error: 'Proxy disabled' }, { status: 404 });
  }
  // ... existing proxy logic
}
```

**Option B: Next.js Rewrites (Alternative)**

Use Next.js rewrites in `next.config.mjs`:
```javascript
async rewrites() {
  const useProxy = process.env.NEXT_PUBLIC_USE_PROXY === 'true';
  if (useProxy) {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.GOAPI_ORIGIN}/api/:path*`,
      },
    ];
  }
  return [];
}
```

Then frontend always calls `/api/...` and Next.js handles routing.

### 5.3 Benefits of Refactoring

1. **Type Safety**: Typed API client prevents runtime errors
2. **Better DX**: Autocomplete for API endpoints
3. **Easier Testing**: Mock API client in tests
4. **Railway Compatible**: Proxy route still available when needed
5. **Performance**: Direct calls in dev (no proxy overhead)

### 5.4 Migration Path

1. Create `api-client.ts` with typed functions
2. Update one component (e.g., `MempoolView`) to use new client
3. Test locally and on Railway
4. Gradually migrate other components
5. Remove catch-all route once all migrated
6. Keep proxy route as fallback

## Summary of Impact

| Opportunity | Lines Saved | Performance Gain | Complexity Change |
|------------|-------------|-------------------|-------------------|
| Consolidate caching | ~150 | None | Lower |
| Extract config | ~50 | None | Lower |
| Unify HTTP clients | ~30 | None | Lower |
| Parallelize track_tx | 0 | 3-5x faster | Slightly higher |
| Parallelize sandwich | 0 | 5-10x faster | Slightly higher |
| Parallelize relays | 0 | 2-3x faster | Slightly higher |
| go-ethereum integration | ~40 (frontend) | None | Lower |
| API refactoring | ~20 | Slight (no proxy) | Lower |

**Total Estimated Impact**:
- **~290 lines of code removed/simplified**
- **3-10x performance improvement** for transaction tracking and sandwich detection
- **Better type safety** and developer experience
- **Easier maintenance** with consolidated utilities

## Implementation Priority

1. **High Priority** (Quick wins):
   - Extract config management (`config.go`)
   - Add go-ethereum for formatting (eliminates frontend utils)
   - Parallelize `track_tx.go` (biggest user-facing improvement)

2. **Medium Priority** (Significant improvements):
   - Parallelize `sandwich.go` receipt fetching
   - Consolidate caching logic
   - Refactor frontend API client

3. **Low Priority** (Nice to have):
   - Parallelize relay requests

   - Unify HTTP clients
