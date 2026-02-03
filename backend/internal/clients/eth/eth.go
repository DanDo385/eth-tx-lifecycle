// Package eth provides the Ethereum execution layer JSON-RPC client (eth_blockNumber,
// eth_getBlockByNumber, eth_getTransactionReceipt, etc.). Used by mempool, track,
// mev, snapshot, and server (block handler). Health is reported via rpcHealth for /api/health.
package eth

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

var (
	rpcHTTP       string
	rpcWS         string
	rpcHTTPClient *http.Client
	rpcHealth     *pkg.BaseDataSource
)

func init() {
	rpcHTTP = config.EnvOr("RPC_HTTP_URL", "https://eth-mainnet.g.alchemy.com/v2/demo")
	rpcWS = config.EnvOr("RPC_WS_URL", "")
	fmt.Printf("DEBUG: RPC_WS_URL = %s\n", rpcWS)
	fmt.Printf("DEBUG: MEMPOOL_DISABLE = %s\n", os.Getenv("MEMPOOL_DISABLE"))
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

// Call invokes an Ethereum JSON-RPC method and returns the raw result.
func Call(method string, params any) (json.RawMessage, error) {
	payload, _ := json.Marshal(rpcRequest{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	res, err := rpcHTTPClient.Post(rpcHTTP, "application/json", bytes.NewReader(payload))
	if err != nil {
		rpcHealth.SetError(err)
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	var parsed rpcResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		rpcHealth.SetError(err)
		return nil, err
	}
	if parsed.Error != nil {
		err := errors.New(parsed.Error.Message)
		rpcHealth.SetError(err)
		return nil, err
	}
	// Detect non-standard error responses (e.g. Infura rate limits) that lack the
	// JSON-RPC envelope: {"code":-32005,"message":"Too Many Requests","data":{...}}.
	if parsed.Result == nil {
		var bare bareError
		if json.Unmarshal(body, &bare) == nil && bare.Code != 0 {
			err := fmt.Errorf("rpc error %d: %s", bare.Code, bare.Message)
			rpcHealth.SetError(err)
			return nil, err
		}
		err := errors.New("rpc returned null result")
		rpcHealth.SetError(err)
		return nil, err
	}
	rpcHealth.SetSuccess()
	return parsed.Result, nil
}

// CheckHealth performs one RPC call and returns health status.
func CheckHealth() pkg.HealthStatus {
	_, err := Call("eth_blockNumber", []any{})
	rpcHealth.SetError(err)
	if err == nil {
		rpcHealth.SetSuccess()
	}
	return pkg.StatusFromSource(rpcHealth)
}

// SourceInfo returns sanitized RPC URLs for the UI.
func SourceInfo() (httpURL, wsURL string) {
	return config.SanitizeURL(rpcHTTP), config.SanitizeURL(rpcWS)
}
