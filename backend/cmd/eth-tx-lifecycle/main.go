// Command eth-tx-lifecycle is the entrypoint for the backend.
//
// Flow: main() → backend.Run() → server.Run() (load env, start mempool goroutine,
// register HTTP routes, then block on ListenAndServe). All implementation lives
// under internal/; this file only delegates to backend.Run() and exits on error.
package main

import (
	"log"

	backend "github.com/you/eth-tx-lifecycle-backend/internal"
)

func main() {
	if err := backend.Run(); err != nil {
		log.Fatal(err)
	}
}
