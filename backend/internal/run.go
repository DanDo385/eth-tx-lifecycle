// Package backend is the root of the eth-tx-lifecycle backend.
//
// First-principles flow: Run() is the single entry from cmd/main. It delegates
// to server.Run(), which (1) loads .env.local via config, (2) starts the mempool
// background loop, (3) registers all /api/* routes, (4) wraps with CORS, then
// (5) blocks on http.ListenAndServe. All real logic lives in server and the
// packages it imports (beacon, cache, config, eth, health, mempool, mev, relay,
// snapshot, track).
package backend

import "github.com/you/eth-tx-lifecycle-backend/internal/server"

// Run starts the HTTP server and blocks until it exits.
func Run() error {
	return server.Run()
}
