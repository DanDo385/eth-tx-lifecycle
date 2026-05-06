// Package beacon provides the Ethereum consensus layer (beacon chain) REST client.
// Used by server (headers, finality), track, and snapshot. Responses are cached; health for /api/health.
package beacon

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

var (
	beaconBases      []string
	beaconHTTPClient *http.Client
	beaconCache      *pkg.Cache[beaconCacheVal]
	beaconHealth     *pkg.BaseDataSource
	lastSuccessBase  string
	beaconMu         sync.RWMutex
)

type beaconCacheVal struct {
	Body   json.RawMessage
	Status int
	Source string
}

func init() {
	beaconBases = configuredBeaconBases()
	if len(beaconBases) > 0 {
		lastSuccessBase = beaconBases[0]
	}
	beaconHTTPClient = config.NewHTTPClient("UPSTREAM_TIMEOUT_SECONDS", 3*time.Second)
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
	beaconCache = pkg.NewCache[beaconCacheVal](okTTL, errTTL)
	beaconHealth = pkg.NewBaseDataSource("beacon", "beacon_health", 30*time.Second)
}

func configuredBeaconBases() []string {
	primary := strings.TrimSpace(config.EnvOr("BEACON_API_URL", "https://beacon.prylabs.net"))
	fallbackEnv := config.EnvOr("BEACON_API_FALLBACK_URLS", "https://ethereum-beacon-api.publicnode.com,https://lodestar-mainnet.chainsafe.io")
	candidates := append([]string{primary}, strings.Split(fallbackEnv, ",")...)
	seen := map[string]bool{}
	out := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		base := strings.TrimRight(strings.TrimSpace(candidate), "/")
		if base == "" || seen[base] {
			continue
		}
		seen[base] = true
		out = append(out, base)
	}
	return out
}

// Get fetches data from the beacon API with caching, health tracking, and provider fallback.
func Get(path string) (json.RawMessage, int, error) {
	if v, ok := beaconCache.Get(path); ok {
		return v.Body, v.Status, nil
	}

	var lastErr error
	for _, base := range orderedBeaconBases() {
		url := strings.TrimRight(base, "/") + path
		resp, err := beaconHTTPClient.Get(url)
		if err != nil {
			lastErr = fmt.Errorf("%s: %w", config.SanitizeURL(base), err)
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = fmt.Errorf("%s: %w", config.SanitizeURL(base), readErr)
			continue
		}

		isErr := resp.StatusCode/100 != 2
		if !isErr {
			rememberSuccessBase(base)
			beaconCache.Set(path, beaconCacheVal{Body: json.RawMessage(body), Status: resp.StatusCode, Source: base}, false)
			beaconHealth.SetSuccess()
			return json.RawMessage(body), resp.StatusCode, nil
		}

		lastErr = fmt.Errorf("%s: HTTP %d", config.SanitizeURL(base), resp.StatusCode)
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("no beacon providers configured")
	}
	beaconHealth.SetError(lastErr)
	return nil, 0, lastErr
}

func orderedBeaconBases() []string {
	beaconMu.RLock()
	preferred := lastSuccessBase
	beaconMu.RUnlock()

	bases := make([]string, 0, len(beaconBases))
	if preferred != "" {
		for _, base := range beaconBases {
			if base == preferred {
				bases = append(bases, base)
				break
			}
		}
	}
	for _, base := range beaconBases {
		if base != preferred {
			bases = append(bases, base)
		}
	}
	return bases
}

func rememberSuccessBase(base string) {
	beaconMu.Lock()
	lastSuccessBase = base
	beaconMu.Unlock()
}

// CheckHealth performs one beacon request and returns health status.
func CheckHealth() pkg.HealthStatus {
	_, status, err := Get("/eth/v1/beacon/headers?limit=1")
	beaconHealth.SetError(err)
	if err == nil && status/100 == 2 {
		beaconHealth.SetSuccess()
	}
	return pkg.StatusFromSource(beaconHealth)
}

// SourceInfo returns sanitized beacon API URLs for the UI. The first URL is the last successful provider when known.
func SourceInfo() string {
	parts := make([]string, 0, len(orderedBeaconBases()))
	for _, base := range orderedBeaconBases() {
		parts = append(parts, config.SanitizeURL(base))
	}
	return strings.Join(parts, ", ")
}
