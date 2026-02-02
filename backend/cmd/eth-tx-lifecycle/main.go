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
