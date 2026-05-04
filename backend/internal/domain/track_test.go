package domain

import "testing"

func TestTrackTxRequiresHash(t *testing.T) {
	t.Parallel()
	resp, err := TrackTx("")
	if err == nil {
		t.Fatal("expected validation error")
	}
	if resp != nil {
		t.Fatalf("expected nil payload, got %#v", resp)
	}
}
