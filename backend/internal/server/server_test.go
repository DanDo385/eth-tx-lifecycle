package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteErrEnvelope(t *testing.T) {
	t.Parallel()

	rec := httptest.NewRecorder()
	writeErr(rec, http.StatusBadRequest, "BAD_REQUEST", "bad input", "check hash")

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d", rec.Code)
	}
	if ct := rec.Header().Get("content-type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("content-type: got %q", ct)
	}

	var got eduEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if got.Error == nil || got.Error.Kind != "BAD_REQUEST" {
		t.Fatalf("error envelope: %+v", got.Error)
	}
	if got.Data != nil {
		t.Fatalf("expected data nil, got %#v", got.Data)
	}
}

func TestWriteOKEnvelope(t *testing.T) {
	t.Parallel()

	rec := httptest.NewRecorder()
	writeOK(rec, map[string]any{"ok": true})

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if ct := rec.Header().Get("content-type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("content-type: got %q", ct)
	}

	var got eduEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if got.Error != nil {
		t.Fatalf("expected no error, got %+v", got.Error)
	}
	obj, ok := got.Data.(map[string]any)
	if !ok || obj["ok"] != true {
		t.Fatalf("unexpected data payload: %#v", got.Data)
	}
}

func TestParseLimitClamp(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		url  string
		want int
	}{
		{name: "default", url: "/api/snapshot", want: 10},
		{name: "low", url: "/api/snapshot?limit=0", want: 1},
		{name: "high", url: "/api/snapshot?limit=9999", want: 200},
		{name: "valid", url: "/api/snapshot?limit=25", want: 25},
		{name: "invalid", url: "/api/snapshot?limit=abc", want: 10},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			req := httptest.NewRequest(http.MethodGet, tc.url, nil)
			if got := parseLimit(req, 10); got != tc.want {
				t.Fatalf("got %d want %d", got, tc.want)
			}
		})
	}
}

func TestCorsMiddlewareHandlesOptions(t *testing.T) {
	t.Parallel()
	req := httptest.NewRequest(http.MethodOptions, "/api/mempool", nil)
	rec := httptest.NewRecorder()

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusTeapot)
	})
	corsMiddleware(next).ServeHTTP(rec, req)

	if nextCalled {
		t.Fatal("next handler should not be called for OPTIONS")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
}

func TestHandleTrackTxMissingHash(t *testing.T) {
	t.Parallel()
	req := httptest.NewRequest(http.MethodGet, "/api/track/tx/", nil)
	rec := httptest.NewRecorder()

	handleTrackTx(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d", rec.Code)
	}
	var got eduEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if got.Error == nil || got.Error.Kind != "BAD_REQUEST" {
		t.Fatalf("unexpected error payload: %+v", got.Error)
	}
}
