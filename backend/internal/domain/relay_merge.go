package domain

import (
	"encoding/json"
	"fmt"
)

// MergeReceivedBlocks merges builder_blocks_received responses and dedupes by block_hash
// (or slot+builder_pubkey when hash is absent).
func MergeReceivedBlocks(bodies []json.RawMessage) []map[string]any {
	seen := make(map[string]bool)
	var out []map[string]any
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

// MergeDeliveredPayloads merges proposer_payload_delivered responses and dedupes by block_hash
// (or slot+block_number when hash is absent).
func MergeDeliveredPayloads(bodies []json.RawMessage) []map[string]any {
	seen := make(map[string]bool)
	var out []map[string]any
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
