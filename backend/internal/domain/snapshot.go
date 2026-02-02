// Package domain: this file aggregates mempool, relays, beacon, and optional MEV into one response.
package domain

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/beacon"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/relay"
)

type snapshotR = map[string]any

func snapshotSourcesInfo() snapshotR {
	httpURL, wsURL := eth.SourceInfo()
	return snapshotR{
		"rpc_http":   httpURL,
		"rpc_ws":     wsURL,
		"beacon_api": beacon.SourceInfo(),
		"relays":     relay.SourceInfo(),
	}
}

// BuildSnapshot builds the aggregated snapshot map for the given params.
func BuildSnapshot(limit int, includeSandwich bool, blockTag string) (map[string]any, error) {
	mp := GetData()
	recCh := make(chan []snapshotR, 1)
	delCh := make(chan []snapshotR, 1)
	hdrCh := make(chan json.RawMessage, 1)
	finCh := make(chan json.RawMessage, 1)

	go func() {
		var out []snapshotR
		if raw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/builder_blocks_received?limit=%d", limit)); err == nil && raw != nil {
			if json.Unmarshal(raw, &out) == nil && len(out) > 0 {
				recCh <- out
				return
			}
		}
		if raw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", limit)); err == nil && raw != nil {
			_ = json.Unmarshal(raw, &out)
		}
		recCh <- out
	}()
	go func() {
		var out []snapshotR
		if raw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", limit)); err == nil && raw != nil {
			_ = json.Unmarshal(raw, &out)
		}
		delCh <- out
	}()
	go func() {
		var out json.RawMessage
		if relayRaw, err := relay.Get(fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", limit)); err == nil && relayRaw != nil {
			var bids []map[string]any
			if json.Unmarshal(relayRaw, &bids) == nil {
				enriched := make([]snapshotR, 0, len(bids))
				for _, bid := range bids {
					enriched = append(enriched, snapshotR{
						"slot": bid["slot"], "proposer_pubkey": bid["proposer_pubkey"], "proposer_index": "",
						"builder_payment_eth": bid["value"], "block_number": bid["block_number"],
						"gas_used": bid["gas_used"], "gas_limit": bid["gas_limit"], "num_tx": bid["num_tx"],
						"builder_pubkey": bid["builder_pubkey"], "block_hash": bid["block_hash"],
					})
					if len(enriched) >= limit {
						break
					}
				}
				out, _ = json.Marshal(snapshotR{"headers": enriched, "count": len(enriched)})
			}
		}
		hdrCh <- out
	}()
	go func() {
		var out json.RawMessage
		if raw, _, err := beacon.Get("/eth/v1/beacon/states/finalized/finality_checkpoints"); err == nil && raw != nil {
			out = raw
		}
		finCh <- out
	}()

	timeout := time.After(4500 * time.Millisecond)
	var receivedBlocks, deliveredPayloads []snapshotR
	var headersOut, finalityOut json.RawMessage
	gotRec, gotDel, gotHdr, gotFin := false, false, false, false
	for !(gotRec && gotDel && gotHdr && gotFin) {
		select {
		case v := <-recCh:
			receivedBlocks, gotRec = v, true
		case v := <-delCh:
			deliveredPayloads, gotDel = v, true
		case v := <-hdrCh:
			headersOut, gotHdr = v, true
		case v := <-finCh:
			finalityOut, gotFin = v, true
		case <-timeout:
			gotRec, gotDel, gotHdr, gotFin = true, true, true, true
		}
	}
	if receivedBlocks == nil {
		receivedBlocks = []snapshotR{}
	}
	if deliveredPayloads == nil {
		deliveredPayloads = []snapshotR{}
	}
	relaysData := snapshotR{"received": receivedBlocks, "delivered": deliveredPayloads}
	beaconData := snapshotR{}
	if len(headersOut) > 0 {
		var headersObj any
		if json.Unmarshal(headersOut, &headersObj) == nil {
			beaconData["headers"] = headersObj
		}
	}
	if len(finalityOut) > 0 {
		var finalityObj any
		if json.Unmarshal(finalityOut, &finalityObj) == nil {
			beaconData["finality"] = finalityObj
		}
	}
	response := snapshotR{
		"timestamp": time.Now().Unix(), "limit": limit, "mempool": mp,
		"relays": relaysData, "beacon": beaconData, "sources": snapshotSourcesInfo(),
	}
	if includeSandwich {
		mevCh := make(chan snapshotR, 1)
		go func() {
			b, err := FetchBlockFull(blockTag)
			var mevR snapshotR
			if err == nil && b != nil {
				if swaps, err2 := CollectSwaps(b); err2 == nil {
					s := DetectSandwiches(swaps, b.Number)
					if len(s) > limit {
						s = s[:limit]
					}
					sandwiches := make([]snapshotR, len(s))
					for i, v := range s {
						sandwiches[i] = snapshotR{"pool": v.Pool, "attacker": v.Attacker, "victim": v.Victim, "preTx": v.PreTx, "victimTx": v.VictimTx, "postTx": v.PostTx, "block": v.Block}
					}
					mevR = snapshotR{"block": b.Number, "blockHash": b.Hash, "swapCount": len(swaps), "sandwiches": sandwiches}
				} else {
					mevR = snapshotR{"error": "receipt scan failed"}
				}
			} else {
				mevR = snapshotR{"error": "block fetch failed"}
			}
			mevCh <- mevR
		}()
		select {
		case mevR := <-mevCh:
			response["mev"] = mevR
		case <-time.After(6 * time.Second):
			response["mev"] = snapshotR{"error": "mev analysis timeout"}
		}
	}
	return response, nil
}

// SnapshotTTL returns the TTL duration from config.
func SnapshotTTL() time.Duration {
	if s := config.EnvOr("SNAPSHOT_TTL_SECONDS", ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 600 {
			return time.Duration(n) * time.Second
		}
	}
	if s := config.EnvOr("CACHE_TTL_SECONDS", ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 600 {
			return time.Duration(n) * time.Second
		}
	}
	return 30 * time.Second
}

// LogSnapshot logs snapshot timing (for server to call).
func LogSnapshot(started time.Time, err error) {
	if err != nil {
		log.Printf("snapshot: error: %v\n", err)
	} else {
		log.Printf("snapshot: served in %s\n", time.Since(started))
	}
}
