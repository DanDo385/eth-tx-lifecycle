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
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

var (
	beaconBase       string
	beaconHTTPClient *http.Client
	beaconCache      *pkg.Cache[beaconCacheVal]
	beaconHealth     *pkg.BaseDataSource
)

type beaconCacheVal struct {
	Body   json.RawMessage
	Status int
}

func init() {
	beaconBase = config.EnvOr("BEACON_API_URL", "https://beacon.prylabs.net")
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

// Get fetches data from the beacon API with caching and health tracking.
func Get(path string) (json.RawMessage, int, error) {
	if v, ok := beaconCache.Get(path); ok {
		return v.Body, v.Status, nil
	}
	url := strings.TrimRight(beaconBase, "/") + path
	resp, err := beaconHTTPClient.Get(url)
	if err != nil {
		beaconHealth.SetError(err)
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	isErr := resp.StatusCode/100 != 2
	beaconCache.Set(path, beaconCacheVal{Body: json.RawMessage(body), Status: resp.StatusCode}, isErr)
	if !isErr {
		beaconHealth.SetSuccess()
	} else {
		beaconHealth.SetError(fmt.Errorf("HTTP %d", resp.StatusCode))
	}
	return json.RawMessage(body), resp.StatusCode, nil
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

// SourceInfo returns sanitized beacon API URL for the UI.
func SourceInfo() string {
	return config.SanitizeURL(beaconBase)
}
