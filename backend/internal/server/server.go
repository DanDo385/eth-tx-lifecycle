// Package server provides the HTTP server and all API handlers.
//
// Flow: Run() loads .env.local, starts domain.Start() (mempool), registers routes (below),
// wraps with CORS, then ListenAndServe. Handlers parse query/path, call config,
// pkg, clients (eth, beacon, relay), or domain, and write JSON via writeOK/writeErr.
// All responses use the eduEnvelope shape (Data or Error, never both).
package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/beacon"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/relay"
	"github.com/you/eth-tx-lifecycle-backend/internal/domain"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

// eduError and eduEnvelope wrap every API response so the frontend sees a
// consistent shape: either Data or Error, never both.
type eduError struct {
	Kind    string `json:"kind"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
}

type eduEnvelope struct {
	Error *eduError `json:"error,omitempty"`
	Data  any       `json:"data,omitempty"`
}

func writeErr(w http.ResponseWriter, status int, kind, message, hint string) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(eduEnvelope{Error: &eduError{Kind: kind, Message: message, Hint: hint}})
}

func writeOK(w http.ResponseWriter, payload any) {
	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(eduEnvelope{Data: payload}) // ok to ignore Encode error; status already sent
}

// parseLimit reads ?limit=N from the request and clamps to [1, 200]. Syntax: err == nil
// is the idiomatic Go "only use value if no error" pattern.
func parseLimit(r *http.Request, defaultLimit int) int {
	limit := defaultLimit
	if s := r.URL.Query().Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			if n < 1 {
				n = 1
			}
			if n > 200 {
				n = 200
			}
			limit = n
		}
	}
	return limit
}

func handleMempool(w http.ResponseWriter, _ *http.Request) {
	writeOK(w, domain.GetData())
}

func handleRelaysDelivered(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r, 10)
	raw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", limit))
	if err != nil {
		writeErr(w, http.StatusTooManyRequests, "RELAY", "Failed to fetch delivered payloads", "MEV relays may be rate limiting or unavailable")
		return
	}
	var deliveredPayloads []map[string]any
	if json.Unmarshal(raw, &deliveredPayloads) != nil {
		writeErr(w, http.StatusInternalServerError, "RELAY_PARSE", "Failed to parse delivered payloads", "")
		return
	}
	var latestBlockNum uint64
	if rawBlockNum, err := eth.Call("eth_blockNumber", []any{}); err == nil {
		var blockNumStr string
		if json.Unmarshal(rawBlockNum, &blockNumStr) == nil {
			latestBlockNum, _ = config.ParseHexUint64(blockNumStr)
		}
	}
	writeOK(w, map[string]any{
		"delivered_payloads": deliveredPayloads,
		"count":              len(deliveredPayloads),
		"latest_block":       latestBlockNum,
	})
}

func handleRelaysReceived(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r, 10)
	raw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/builder_blocks_received?limit=%d", limit))
	if err != nil {
		writeErr(w, http.StatusTooManyRequests, "RELAY", "Failed to fetch received blocks", "MEV relays may be rate limiting or unavailable")
		return
	}
	var receivedBlocks []map[string]any
	if json.Unmarshal(raw, &receivedBlocks) != nil {
		writeErr(w, http.StatusInternalServerError, "RELAY_PARSE", "Failed to parse received blocks", "")
		return
	}
	var latestBlockNum uint64
	if rawBlockNum, err := eth.Call("eth_blockNumber", []any{}); err == nil {
		var blockNumStr string
		if json.Unmarshal(rawBlockNum, &blockNumStr) == nil {
			latestBlockNum, _ = config.ParseHexUint64(blockNumStr)
		}
	}
	writeOK(w, map[string]any{
		"received_blocks": receivedBlocks,
		"count":           len(receivedBlocks),
		"latest_block":    latestBlockNum,
	})
}

func handleBeaconHeaders(w http.ResponseWriter, r *http.Request) {
	type beaconResult struct {
		raw    json.RawMessage
		status int
		err    error
	}
	type relayResult struct {
		raw json.RawMessage
		err error
	}
	beaconCh := make(chan beaconResult, 1)
	relayCh := make(chan relayResult, 1)
	go func() {
		raw, status, err := beacon.Get("/eth/v1/beacon/headers?limit=20")
		beaconCh <- beaconResult{raw, status, err}
	}()
	go func() {
		raw, err := relay.Get("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=50")
		relayCh <- relayResult{raw, err}
	}()
	br := <-beaconCh
	rr := <-relayCh
	headersRaw, status, err := br.raw, br.status, br.err
	if err != nil || status/100 != 2 {
		writeErr(w, http.StatusTooManyRequests, "BEACON", "Beacon headers fetch failed", "Public beacon API may be rate limiting.")
		return
	}
	relayRaw, relayErr := rr.raw, rr.err
	var headersObj struct {
		Data []struct {
			Header struct {
				Message struct {
					Slot          string `json:"slot"`
					ProposerIndex string `json:"proposer_index"`
				} `json:"message"`
			} `json:"header"`
		} `json:"data"`
	}
	if json.Unmarshal(headersRaw, &headersObj) != nil {
		w.Header().Set("content-type", "application/json")
		w.Write(headersRaw)
		return
	}
	relayBids := make(map[string]map[string]any)
	if relayErr == nil && relayRaw != nil {
		var bids []map[string]any
		if json.Unmarshal(relayRaw, &bids) == nil {
			for _, bid := range bids {
				if slot, ok := bid["slot"].(string); ok {
					relayBids[slot] = bid
				}
			}
		}
	}
	enriched := make([]map[string]any, 0, len(headersObj.Data))
	for _, h := range headersObj.Data {
		slot := h.Header.Message.Slot
		item := map[string]any{"slot": slot, "proposer_index": h.Header.Message.ProposerIndex}
		if bid, found := relayBids[slot]; found {
			item["builder_payment_eth"] = bid["value"]
			item["block_number"] = bid["block_number"]
			item["gas_used"] = bid["gas_used"]
			item["gas_limit"] = bid["gas_limit"]
			item["num_tx"] = bid["num_tx"]
			item["builder_pubkey"] = bid["builder_pubkey"]
			item["proposer_fee_recipient"] = bid["proposer_fee_recipient"]
		}
		enriched = append(enriched, item)
	}
	writeOK(w, map[string]any{"headers": enriched, "count": len(enriched)})
}

func handleFinality(w http.ResponseWriter, r *http.Request) {
	raw, status, err := beacon.Get("/eth/v1/beacon/states/finalized/finality_checkpoints")
	if err != nil || status/100 != 2 {
		writeErr(w, http.StatusTooManyRequests, "BEACON", "Finality checkpoints fetch failed", "")
		return
	}
	w.Header().Set("content-type", "application/json")
	w.Write(raw)
}

func handleBlock(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/api/block/"):]
	if id == "" {
		id = "latest"
	}
	raw, err := eth.Call("eth_getBlockByNumber", []any{id, true})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "EL_BLOCK", "Block fetch failed", "")
		return
	}
	w.Header().Set("content-type", "application/json")
	w.Write(raw)
}

func handleSandwich(w http.ResponseWriter, r *http.Request) {
	blockTag := r.URL.Query().Get("block")
	if blockTag == "" {
		blockTag = "latest"
	}
	b, err := domain.FetchBlockFull(blockTag)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "EL_BLOCK_FETCH", "Failed to fetch block", "")
		return
	}
	swaps, err := domain.CollectSwaps(b)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "EL_RECEIPTS", "Failed to scan receipts", "")
		return
	}
	sandwiches := domain.DetectSandwiches(swaps, b.Number)
	httpURL, wsURL := eth.SourceInfo()
	writeOK(w, map[string]any{
		"block": b.Number, "blockHash": b.Hash, "swapCount": len(swaps), "sandwiches": sandwiches,
		"sources": map[string]any{"rpc_http": httpURL, "rpc_ws": wsURL, "beacon_api": beacon.SourceInfo(), "relays": relay.SourceInfo()},
		"note":    "Heuristic: same address swaps before and after a victim in the same pool (Uniswap V2/V3).",
	})
}

func handleTrackTx(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Path[len("/api/track/tx/"):]
	if hash == "" {
		writeErr(w, http.StatusBadRequest, "BAD_REQUEST", "Missing transaction hash", "Invoke /api/track/tx/{hash} or /api/track/tx/latest")
		return
	}
	resp, err := domain.TrackTx(hash)
	if err != nil {
		writeErr(w, http.StatusNotFound, "TX_NOT_FOUND", "Transaction not visible on this execution node", "")
		return
	}
	if resp == nil {
		writeErr(w, http.StatusBadGateway, "RPC_ERROR", "Failed to resolve transaction", "")
		return
	}
	writeOK(w, resp)
}

var snapshotCache *pkg.Cache[[]byte]

func init() {
	snapshotCache = pkg.NewCache[[]byte](30*time.Second, 0)
}

func handleSnapshot(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("snapshot: panic: %v\n", rec)
			writeErr(w, http.StatusInternalServerError, "INTERNAL", "Snapshot handler panic", "")
		} else {
			domain.LogSnapshot(started, nil)
		}
	}()
	limit := parseLimit(r, 10)
	includeSandwich := false
	if s := r.URL.Query().Get("sandwich"); s == "1" || s == "true" || s == "yes" {
		includeSandwich = true
	}
	blockTag := r.URL.Query().Get("block")
	if blockTag == "" {
		blockTag = "latest"
	}
	cacheKey := fmt.Sprintf("limit=%d|sandwich=%v|block=%s", limit, includeSandwich, blockTag)
	if body, ok := snapshotCache.Get(cacheKey); ok && len(body) > 0 {
		w.Header().Set("content-type", "application/json")
		w.Write(body)
		return
	}
	response, err := domain.BuildSnapshot(limit, includeSandwich, blockTag)
	if err != nil {
		domain.LogSnapshot(started, err)
		writeErr(w, http.StatusInternalServerError, "SNAPSHOT", "Failed to build snapshot", "")
		return
	}
	body, err := json.Marshal(eduEnvelope{Data: response})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "SNAPSHOT_MARSHAL", "Failed to serialize snapshot", "")
		return
	}
	snapshotCache.Set(cacheKey, body, false)
	w.Header().Set("content-type", "application/json")
	w.Write(body)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	statuses := []pkg.HealthStatus{
		eth.CheckHealth(),
		beacon.CheckHealth(),
		relay.CheckHealth(),
		domain.CheckHealth(),
	}
	writeOK(w, pkg.BuildOverall(statuses))
}

func handleHealthLiveness(w http.ResponseWriter, r *http.Request) {
	pkg.WriteLiveness(w, r)
}

func handleHealthReadiness(w http.ResponseWriter, r *http.Request) {
	beaconStatus := beacon.CheckHealth()
	rpcStatus := eth.CheckHealth()
	if beaconStatus.Healthy && rpcStatus.Healthy {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte("NOT_READY"))
	}
}

// corsMiddleware sets CORS headers and handles OPTIONS. Single origin from env so
// the frontend (e.g. localhost:3000) can call the backend (e.g. :8080).
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := config.EnvOr("GOAPI_ORIGIN", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Run starts the HTTP server and blocks. Load env first, then start mempool
// background loop (so /api/mempool has data), register all routes, apply CORS, then ListenAndServe.
func Run() error {
	config.LoadEnvFile(".env.local")
	domain.Start()
	mux := http.NewServeMux()
	// Data endpoints: mempool, relay (delivered/received), beacon (headers, finality), block, snapshot.
	mux.HandleFunc("/api/mempool", handleMempool)
	mux.HandleFunc("/api/relays/delivered", handleRelaysDelivered)
	mux.HandleFunc("/api/relays/received", handleRelaysReceived)
	mux.HandleFunc("/api/validators/head", handleBeaconHeaders)
	mux.HandleFunc("/api/finality", handleFinality)
	mux.HandleFunc("/api/snapshot", handleSnapshot)
	mux.HandleFunc("/api/block/", handleBlock)
	mux.HandleFunc("/api/mev/sandwich", handleSandwich)
	mux.HandleFunc("/api/track/tx/", handleTrackTx)
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/api/health/live", handleHealthLiveness)
	mux.HandleFunc("/api/health/ready", handleHealthReadiness)
	addr := config.EnvOr("GOAPI_ADDR", ":"+config.EnvOr("PORT", "8080"))
	log.Println("backend listening on", addr)
	return http.ListenAndServe(addr, corsMiddleware(mux))
}
