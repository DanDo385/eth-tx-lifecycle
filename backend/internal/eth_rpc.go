// eth_rpc.go
// This file handles talking to the Ethereum execution layer (where all the transactions live).
// We use JSON-RPC over HTTP to grab blocks, transactions, and mempool data.
package backend

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

var rpcHTTP string
var rpcWS string
var rpcHTTPClient *http.Client

func init() {
	// Load .env.local first so we can use custom RPC endpoints
	loadEnvFile(".env.local")

	// Default to Alchemy's public demo endpoint (works but has rate limits)
	rpcHTTP = envOr("RPC_HTTP_URL", "https://eth-mainnet.g.alchemy.com/v2/demo")
	rpcWS = envOr("RPC_WS_URL", "")

	// Debug output to help troubleshoot mempool issues
	fmt.Printf("DEBUG: RPC_WS_URL = %s\n", rpcWS)
	fmt.Printf("DEBUG: MEMPOOL_DISABLE = %s\n", os.Getenv("MEMPOOL_DISABLE"))

	rpcHTTPClient = newHTTPClient("RPC_TIMEOUT_SECONDS", 5*time.Second)
}

// rpcRequest is the structure we send to Ethereum nodes via JSON-RPC
type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

// rpcResponse is what comes back from the RPC endpoint
type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// rpcCall does the actual work of calling the Ethereum JSON-RPC endpoint.
// It handles errors, updates health status, and returns the raw result.
func rpcCall(method string, params any) (json.RawMessage, error) {
	payload, _ := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	})

	res, err := rpcHTTPClient.Post(rpcHTTP, "application/json", bytes.NewReader(payload))
	if err != nil {
		// Let the health monitor know this failed
		if rpcHealth != nil {
			rpcHealth.SetError(err)
		}
		return nil, err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	var parsed rpcResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		if rpcHealth != nil {
			rpcHealth.SetError(err)
		}
		return nil, err
	}

	// RPC can return errors inside a 200 OK response, so check for those
	if parsed.Error != nil {
		err := errors.New(parsed.Error.Message)
		if rpcHealth != nil {
			rpcHealth.SetError(err)
		}
		return nil, err
	}

	// Success! Update health check
	if rpcHealth != nil {
		rpcHealth.SetSuccess()
	}

	return parsed.Result, nil
}
