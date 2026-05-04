package domain

import (
	"encoding/json"
	"testing"
)

func TestMergeReceivedBlocksDedupesByBlockHash(t *testing.T) {
	t.Parallel()
	a := mustJSON(t, []map[string]any{{"block_hash": "0x1", "slot": "1"}})
	b := mustJSON(t, []map[string]any{{"block_hash": "0x1", "slot": "1"}, {"block_hash": "0x2", "slot": "2"}})
	out := MergeReceivedBlocks([]json.RawMessage{a, b})
	if len(out) != 2 {
		t.Fatalf("want 2 unique rows, got %d", len(out))
	}
}

func TestMergeDeliveredPayloadsEmptyInputs(t *testing.T) {
	t.Parallel()
	if len(MergeDeliveredPayloads(nil)) != 0 {
		t.Fatal("expected empty")
	}
}

func mustJSON(t *testing.T, v any) json.RawMessage {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return b
}
