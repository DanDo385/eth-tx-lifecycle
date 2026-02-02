// Package relay provides the MEV relay HTTP client for bidtraces.
// Used by server (delivered/received), snapshot, and track. Caching and health for /api/health.
package relay

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

var (
	relayBases      []string
	relayHTTPClient *http.Client
	relayCache      *pkg.Cache[json.RawMessage]
	relayFailCache  *pkg.Cache[struct{}]
	relayBudget     time.Duration
	relayHealth     *pkg.BaseDataSource
)

func init() {
	raw := config.EnvOr("RELAY_URLS", "https://0xa15b5e1a7e51010198401aab7e@aestus.live,https://0xa7ab7e550200401aab7e@agnostic-relay.net,https://0x8b5d2e1a7e51010198401aab7e@bloxroute.max-profit.blxrbdn.com,https://0xb0b07e550200401aab7e@bloxroute.regulated.blxrbdn.com,https://0xac6e7e51010198401aab7e@boost-relay.flashbots.net,https://0x98650e550200401aab7e@mainnet-relay.securerpc.com,https://0xa1559e51010198401aab7e@relay.ultrasound.money,https://0x8c7d3e550200401aab7e@relay.wenmerge.com,https://0x8c4edc51010198401aab7e@titanrelay.xyz")
	parts := strings.Split(raw, ",")
	relayBases = make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			relayBases = append(relayBases, t)
		}
	}
	if len(relayBases) == 0 {
		relayBases = append(relayBases, "https://boost-relay.flashbots.net")
	}
	relayHTTPClient = config.NewHTTPClient("UPSTREAM_TIMEOUT_SECONDS", 3*time.Second)
	relayBudget = 2500 * time.Millisecond
	if s := config.EnvOr("RELAY_BUDGET_MS", ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 100 && n <= 20000 {
			relayBudget = time.Duration(n) * time.Millisecond
		}
	}
	okTTL := 20 * time.Second
	if s := config.EnvOr("CACHE_TTL_SECONDS", "20"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 300 {
			okTTL = time.Duration(n) * time.Second
		}
	}
	errTTL := 10 * time.Second
	if s := config.EnvOr("ERROR_CACHE_TTL_SECONDS", "10"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 120 {
			errTTL = time.Duration(n) * time.Second
		}
	}
	relayCache = pkg.NewCache[json.RawMessage](okTTL, 0)
	relayFailCache = pkg.NewCache[struct{}](errTTL, 0)
	relayHealth = pkg.NewBaseDataSource("relay", "relay_health", 30*time.Second)
}

// Get fetches data from MEV relays (tries multiple until one succeeds).
func Get(path string) (json.RawMessage, error) {
	if relayFailCache.Has(path) {
		err := errors.New("relay recently failed; backing off")
		relayHealth.SetError(err)
		return nil, err
	}
	if body, ok := relayCache.Get(path); ok {
		return body, nil
	}
	started := time.Now()
	var lastErr error
	successCount := 0
	for _, base := range relayBases {
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
		func() {
			defer resp.Body.Close()
			if resp.StatusCode/100 != 2 {
				lastErr = fmt.Errorf("non-2xx status %d from %s", resp.StatusCode, base)
				return
			}
			body, _ := io.ReadAll(resp.Body)
			if len(strings.TrimSpace(string(body))) == 0 {
				lastErr = fmt.Errorf("empty response from %s", base)
				return
			}
			relayCache.Set(path, json.RawMessage(body), false)
			successCount++
		}()
		if body, ok := relayCache.Get(path); ok {
			fmt.Printf("relay: success from %s after %s\n", base, time.Since(started))
			relayHealth.SetSuccess()
			return body, nil
		}
	}
	relayFailCache.Set(path, struct{}{}, false)
	if lastErr != nil {
		err := fmt.Errorf("all %d relays failed, last error: %w", len(relayBases), lastErr)
		relayHealth.SetError(err)
		return nil, err
	}
	return nil, fmt.Errorf("all %d relays failed or timed out", len(relayBases))
}

// CheckHealth performs one relay request and returns health status.
func CheckHealth() pkg.HealthStatus {
	_, err := Get("/relay/v1/data/bidtraces/proposer_payload_delivered?limit=1")
	relayHealth.SetError(err)
	if err == nil {
		relayHealth.SetSuccess()
	}
	return pkg.StatusFromSource(relayHealth)
}

// SourceInfo returns sanitized relay URLs for the UI.
func SourceInfo() []string {
	out := make([]string, len(relayBases))
	for i, r := range relayBases {
		out[i] = config.SanitizeURL(r)
	}
	return out
}
