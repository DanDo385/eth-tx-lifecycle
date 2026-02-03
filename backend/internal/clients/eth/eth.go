// Package eth provides the Ethereum execution layer JSON-RPC client (eth_blockNumber,
// eth_getBlockByNumber, eth_getTransactionReceipt, etc.). Used by mempool, track,
// mev, snapshot, and server (block handler). Health is reported via rpcHealth for /api/health.
package eth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

var (
	rpcProviders  []string
	rpcWS         string
	rpcHTTPClient *http.Client
	rpcHealth     *pkg.BaseDataSource
)

func init() {
	// Load multiple RPC providers from numbered env vars
	rpcProviders = []string{}
	for i := 1; i <= 10; i++ {
		key := fmt.Sprintf("RPC_HTTP_URL%d", i)
		if url := config.EnvOr(key, ""); url != "" {
			rpcProviders = append(rpcProviders, url)
		}
	}
	// Fallback to single RPC_HTTP_URL if no numbered providers
	if len(rpcProviders) == 0 {
		if url := config.EnvOr("RPC_HTTP_URL", ""); url != "" {
			rpcProviders = append(rpcProviders, url)
		}
	}
	// Final fallback to public Alchemy demo
	if len(rpcProviders) == 0 {
		rpcProviders = append(rpcProviders, "https://eth-mainnet.g.alchemy.com/v2/demo")
	}

	rpcWS = config.EnvOr("RPC_WS_URL", "")
	fmt.Printf("eth: loaded %d RPC providers\n", len(rpcProviders))
	for i, p := range rpcProviders {
		fmt.Printf("  [%d] %s\n", i+1, config.SanitizeURL(p))
	}

	rpcHTTPClient = config.NewHTTPClient("RPC_TIMEOUT_SECONDS", 5*time.Second)
	rpcHealth = pkg.NewBaseDataSource("rpc", "rpc_health", 30*time.Second)
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// bareError matches non-standard rate-limit responses from providers like Infura
// that return {"code":-32005,"message":"Too Many Requests"} without a JSON-RPC envelope.
type bareError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// callOne makes a single RPC call to a specific provider URL.
func callOne(url, method string, params any) (json.RawMessage, error) {
	payload, _ := json.Marshal(rpcRequest{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	res, err := rpcHTTPClient.Post(url, "application/json", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	var parsed rpcResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error != nil {
		return nil, errors.New(parsed.Error.Message)
	}
	// Detect non-standard error responses (e.g. Infura rate limits)
	if parsed.Result == nil {
		var bare bareError
		if json.Unmarshal(body, &bare) == nil && bare.Code != 0 {
			return nil, fmt.Errorf("rpc error %d: %s", bare.Code, bare.Message)
		}
		return nil, errors.New("rpc returned null result")
	}
	return parsed.Result, nil
}

// Call invokes an Ethereum JSON-RPC method, racing all providers in parallel.
// Returns the first successful response. This provides both redundancy and
// load distribution across multiple RPC endpoints.
func Call(method string, params any) (json.RawMessage, error) {
	if len(rpcProviders) == 1 {
		// Single provider - direct call
		result, err := callOne(rpcProviders[0], method, params)
		if err != nil {
			rpcHealth.SetError(err)
			return nil, err
		}
		rpcHealth.SetSuccess()
		return result, nil
	}

	// Multiple providers - race them all in parallel
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	type rpcResult struct {
		data json.RawMessage
		err  error
		url  string
	}

	resultCh := make(chan rpcResult, len(rpcProviders))
	g, gctx := errgroup.WithContext(ctx)

	for _, provider := range rpcProviders {
		provider := provider
		g.Go(func() error {
			result, err := callOne(provider, method, params)
			select {
			case resultCh <- rpcResult{data: result, err: err, url: provider}:
			case <-gctx.Done():
			}
			return nil // Don't cancel other goroutines on error
		})
	}

	// Collect results - return first success
	go func() {
		g.Wait()
		close(resultCh)
	}()

	var lastErr error
	for r := range resultCh {
		if r.err == nil && r.data != nil {
			cancel() // Cancel remaining requests
			rpcHealth.SetSuccess()
			return r.data, nil
		}
		lastErr = r.err
	}

	// All providers failed
	if lastErr == nil {
		lastErr = errors.New("all RPC providers failed or timed out")
	}
	rpcHealth.SetError(lastErr)
	return nil, lastErr
}

// CheckHealth performs one RPC call and returns health status.
func CheckHealth() pkg.HealthStatus {
	_, err := Call("eth_blockNumber", []any{})
	if err != nil {
		rpcHealth.SetError(err)
	} else {
		rpcHealth.SetSuccess()
	}
	return pkg.StatusFromSource(rpcHealth)
}

// SourceInfo returns sanitized RPC URLs for the UI.
func SourceInfo() (httpURL, wsURL string) {
	// Return first provider as primary, indicate multiple if available
	primary := ""
	if len(rpcProviders) > 0 {
		primary = config.SanitizeURL(rpcProviders[0])
		if len(rpcProviders) > 1 {
			primary = fmt.Sprintf("%s (+%d more)", primary, len(rpcProviders)-1)
		}
	}
	return primary, config.SanitizeURL(rpcWS)
}
