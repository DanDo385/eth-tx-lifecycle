package eth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCallOneRateLimitedEmptyBody(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	oldClient := rpcHTTPClient
	rpcHTTPClient = &http.Client{Timeout: 2 * time.Second}
	defer func() { rpcHTTPClient = oldClient }()

	_, err := callOne(srv.URL, "eth_blockNumber", []any{})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("expected ErrRateLimited, got %v", err)
	}
}

func TestCallOneRateLimitedJSONRPCErrorCode(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"error":{"code":-32005,"message":"Too Many Requests"}}`))
	}))
	defer srv.Close()

	oldClient := rpcHTTPClient
	rpcHTTPClient = &http.Client{Timeout: 2 * time.Second}
	defer func() { rpcHTTPClient = oldClient }()

	_, err := callOne(srv.URL, "eth_blockNumber", []any{})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("expected ErrRateLimited, got %v", err)
	}
}

func TestCallOneNullResult(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":null}`))
	}))
	defer srv.Close()

	oldClient := rpcHTTPClient
	rpcHTTPClient = &http.Client{Timeout: 2 * time.Second}
	defer func() { rpcHTTPClient = oldClient }()

	_, err := callOne(srv.URL, "eth_getTransactionByHash", []any{"0xabc"})
	if !errors.Is(err, ErrNullResult) {
		t.Fatalf("expected ErrNullResult, got %v", err)
	}
}

func TestCallOneInvalidJSON(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{not-json`))
	}))
	defer srv.Close()

	oldClient := rpcHTTPClient
	rpcHTTPClient = &http.Client{Timeout: 2 * time.Second}
	defer func() { rpcHTTPClient = oldClient }()

	_, err := callOne(srv.URL, "eth_blockNumber", []any{})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrInvalidJSON) {
		t.Fatalf("expected ErrInvalidJSON, got %v", err)
	}
	if strings.TrimSpace(err.Error()) == "" {
		t.Fatal("expected explanatory error message")
	}
}
