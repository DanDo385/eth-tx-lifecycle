// relay.go
// Handles connections to MEV relays (the middlemen in proposer-builder separation).
// Relays show us which blocks builders are submitting and which ones actually get chosen.
// We try multiple relays because they sometimes rate-limit or go offline.
package backend

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// relayBases is our list of MEV relay URLs to try.
// We start with a bunch of popular public relays and fall back to Flashbots if none are configured.
var relayBases = func() []string {
	raw := envOr("RELAY_URLS", "https://0xa15b5e1a7e51010198401aab7e@aestus.live,https://0xa7ab7e550200401aab7e@agnostic-relay.net,https://0x8b5d2e1a7e51010198401aab7e@bloxroute.max-profit.blxrbdn.com,https://0xb0b07e550200401aab7e@bloxroute.regulated.blxrbdn.com,https://0xac6e7e51010198401aab7e@boost-relay.flashbots.net,https://0x98650e550200401aab7e@mainnet-relay.securerpc.com,https://0xa1559e51010198401aab7e@relay.ultrasound.money,https://0x8c7d3e550200401aab7e@relay.wenmerge.com,https://0x8c4edc51010198401aab7e@titanrelay.xyz")
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	// Safety net: always have at least one relay
	if len(out) == 0 {
		out = append(out, "https://boost-relay.flashbots.net")
	}
	return out
}()

// HTTP client for relay requests with a short timeout (relays can be slow)
var relayHTTPClient = newHTTPClient("UPSTREAM_TIMEOUT_SECONDS", 3*time.Second)

// relayBudget is how long we'll spend trying different relays before giving up
var relayBudget = func() time.Duration {
	if s := envOr("RELAY_BUDGET_MS", ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 100 && n <= 20000 {
			return time.Duration(n) * time.Millisecond
		}
	}
	return 2500 * time.Millisecond
}()

// === Caching layer ===
// We cache successful responses and failures using the generic Cache type.

// relayCache stores successful relay responses keyed by API path.
var relayCache = NewCache[json.RawMessage](
	func() time.Duration {
		s := envOr("CACHE_TTL_SECONDS", "20")
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 300 {
			return time.Duration(n) * time.Second
		}
		return 20 * time.Second
	}(),
	0, // errors aren't stored in this cache; we use relayFailCache instead
)

// relayFailCache is a negative cache — tracks recent failures so we back off.
var relayFailCache = NewCache[struct{}](
	func() time.Duration {
		s := envOr("ERROR_CACHE_TTL_SECONDS", "10")
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 120 {
			return time.Duration(n) * time.Second
		}
		return 10 * time.Second
	}(),
	0,
)

// relayGET tries to fetch data from multiple MEV relays until one succeeds.
// It checks the cache first, then tries relays in order, respecting the time budget.
// If a path recently failed, we skip it entirely (negative caching).
func relayGET(path string) (json.RawMessage, error) {
	// Don't hammer relays that just failed - back off for a bit
	if relayFailCache.Has(path) {
		err := errors.New("relay recently failed; backing off")
		if relayHealth != nil {
			relayHealth.SetError(err)
		}
		return nil, err
	}

	// Check if we already have this cached
	if body, ok := relayCache.Get(path); ok {
		return body, nil
	}

	started := time.Now()
	var lastErr error
	successCount := 0

	// Try each relay in our list until one works
	for _, base := range relayBases {
		// Stop if we've exceeded our time budget
		if time.Since(started) > relayBudget {
			fmt.Printf("relay: budget exceeded after trying %d relays\n", successCount)
			break
		}

		url := strings.TrimRight(base, "/") + path
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			lastErr = fmt.Errorf("request creation failed: %w", err)
			continue
		}

		req.Header.Set("Accept", "application/json")
		resp, err := relayHTTPClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed for %s: %w", base, err)
			continue
		}

		// Process the response in a closure so we can defer the body close
		func() {
			defer resp.Body.Close()

			// Relays sometimes return non-200 status codes when rate limiting
			if resp.StatusCode/100 != 2 {
				lastErr = fmt.Errorf("non-2xx status %d from %s", resp.StatusCode, base)
				return
			}

			body, _ := io.ReadAll(resp.Body)
			// Some relays send empty responses even on 200 - skip those
			if len(strings.TrimSpace(string(body))) == 0 {
				lastErr = fmt.Errorf("empty response from %s", base)
				return
			}

			relayCache.Set(path, json.RawMessage(body), false)
			successCount++
		}()

		// If the cache now has it, we succeeded
		if body, ok := relayCache.Get(path); ok {
			fmt.Printf("relay: success from %s after %s\n", base, time.Since(started))
			if relayHealth != nil {
				relayHealth.SetSuccess()
			}
			return body, nil
		}
	}

	// All relays failed - mark this path as failing and return error
	relayFailCache.Set(path, struct{}{}, false)
	if lastErr != nil {
		err := fmt.Errorf("all %d relays failed, last error: %w", len(relayBases), lastErr)
		if relayHealth != nil {
			relayHealth.SetError(err)
		}
		return nil, err
	}
	return nil, fmt.Errorf("all %d relays failed or timed out", len(relayBases))
}
