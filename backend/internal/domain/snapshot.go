// Package domain: this file aggregates mempool, relays, beacon, and optional MEV into one response.
package domain

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/beacon"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/relay"
)

type snapshotR = map[string]any

// mergeReceivedBlocks merges builder_blocks_received from multiple relay responses and dedupes by block_hash (or slot+builder).
func mergeReceivedBlocks(bodies []json.RawMessage) []snapshotR {
	seen := make(map[string]bool)
	var out []snapshotR
	for _, raw := range bodies {
		var list []map[string]any
		if json.Unmarshal(raw, &list) != nil {
			continue
		}
		for _, b := range list {
			key := ""
			if h, _ := b["block_hash"].(string); h != "" {
				key = h
			} else if s, pk := b["slot"], b["builder_pubkey"]; s != nil || pk != nil {
				key = fmt.Sprintf("%v-%v", s, pk)
			}
			if key != "" && !seen[key] {
				seen[key] = true
				out = append(out, b)
			} else if key == "" {
				out = append(out, b)
			}
		}
	}
	return out
}

// mergeDeliveredPayloads merges proposer_payload_delivered from multiple relay responses and dedupes by block_hash (or slot+block_number).
func mergeDeliveredPayloads(bodies []json.RawMessage) []snapshotR {
	seen := make(map[string]bool)
	var out []snapshotR
	for _, raw := range bodies {
		var list []map[string]any
		if json.Unmarshal(raw, &list) != nil {
			continue
		}
		for _, b := range list {
			key := ""
			if h, _ := b["block_hash"].(string); h != "" {
				key = h
			} else if s, bn := b["slot"], b["block_number"]; s != nil || bn != nil {
				key = fmt.Sprintf("%v-%v", s, bn)
			}
			if key != "" && !seen[key] {
				seen[key] = true
				out = append(out, b)
			} else if key == "" {
				out = append(out, b)
			}
		}
	}
	return out
}

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

	ctx, cancel := context.WithTimeout(context.Background(), 4500*time.Millisecond)
	defer cancel()

	var receivedBlocks, deliveredPayloads []snapshotR
	var headersOut, finalityOut json.RawMessage

	g, _ := errgroup.WithContext(ctx)

	g.Go(func() error {
		const receivedLimit = 200
		// builder_blocks_received requires a slot parameter on most relays.
		if slot, err := relay.RecentSlot(); err == nil && slot != "" {
			path := fmt.Sprintf("/relay/v1/data/bidtraces/builder_blocks_received?slot=%s&limit=%d", slot, receivedLimit)
			if bodies, err := relay.GetFromAllRelays(path); err == nil && len(bodies) > 0 {
				receivedBlocks = mergeReceivedBlocks(bodies)
				return nil
			}
		}
		// Fallback: use delivered payloads as proxy for received
		const deliveredLimit = 200
		pathDel := fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", deliveredLimit)
		if bodiesDel, errDel := relay.GetFromAllRelays(pathDel); errDel == nil && len(bodiesDel) > 0 {
			receivedBlocks = mergeDeliveredPayloads(bodiesDel)
		}
		return nil
	})

	g.Go(func() error {
		const deliveredLimit = 200
		path := fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", deliveredLimit)
		bodies, err := relay.GetFromAllRelays(path)
		if err == nil && len(bodies) > 0 {
			deliveredPayloads = mergeDeliveredPayloads(bodies)
		}
		return nil
	})

	g.Go(func() error {
		const deliveredLimit = 200
		path := fmt.Sprintf("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=%d", deliveredLimit)
		bodies, err := relay.GetFromAllRelays(path)
		if err != nil || len(bodies) == 0 {
			return nil
		}
		merged := mergeDeliveredPayloads(bodies)
		enriched := make([]snapshotR, 0, len(merged))
		for _, bid := range merged {
			enriched = append(enriched, snapshotR{
				"slot": bid["slot"], "proposer_pubkey": bid["proposer_pubkey"], "proposer_index": "",
				"builder_payment_eth": bid["value"], "block_number": bid["block_number"],
				"gas_used": bid["gas_used"], "gas_limit": bid["gas_limit"], "num_tx": bid["num_tx"],
				"builder_pubkey": bid["builder_pubkey"], "block_hash": bid["block_hash"],
			})
			if len(enriched) >= deliveredLimit {
				break
			}
		}
		headersOut, _ = json.Marshal(snapshotR{"headers": enriched, "count": len(enriched)})
		return nil
	})

	g.Go(func() error {
		if raw, _, err := beacon.Get("/eth/v1/beacon/states/finalized/finality_checkpoints"); err == nil && raw != nil {
			finalityOut = raw
		}
		return nil
	})

	_ = g.Wait()

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
		mevCtx, mevCancel := context.WithTimeout(context.Background(), 6*time.Second)
		defer mevCancel()

		mevG, _ := errgroup.WithContext(mevCtx)
		var mevR snapshotR

		mevG.Go(func() error {
			b, err := FetchBlockFull(blockTag)
			if err != nil || b == nil {
				mevR = snapshotR{"error": "block fetch failed"}
				return nil
			}
			swaps, err := CollectSwaps(b)
			if err != nil {
				mevR = snapshotR{"error": "receipt scan failed"}
				return nil
			}
			s := DetectSandwiches(swaps, b.Number)
			if len(s) > limit {
				s = s[:limit]
			}
			sandwiches := make([]snapshotR, len(s))
			for i, v := range s {
				sandwiches[i] = snapshotR{"pool": v.Pool, "attacker": v.Attacker, "victim": v.Victim, "preTx": v.PreTx, "victimTx": v.VictimTx, "postTx": v.PostTx, "block": v.Block}
			}
			mevR = snapshotR{"block": b.Number, "blockHash": b.Hash, "swapCount": len(swaps), "sandwiches": sandwiches}
			return nil
		})

		if err := mevG.Wait(); err != nil || mevR == nil {
			response["mev"] = snapshotR{"error": "mev analysis timeout"}
		} else {
			response["mev"] = mevR
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
