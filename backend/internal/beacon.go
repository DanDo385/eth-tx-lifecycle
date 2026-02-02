// beacon.go
// Connects to the Ethereum consensus layer (beacon chain) to get block proposals,
// finality checkpoints, and other PoS-related data.
package backend

import (
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
)

// beaconBase is the URL for our beacon chain API (consensus layer)
var beaconBase = envOr("BEACON_API_URL", "https://beacon.prylabs.net")

// HTTP client for beacon API calls with timeout
var beaconHTTPClient = newHTTPClient("UPSTREAM_TIMEOUT_SECONDS", 3*time.Second)

// beaconCacheVal holds both the response body and HTTP status code.
type beaconCacheVal struct {
	Body   json.RawMessage
	Status int
}

// beaconCache stores beacon responses keyed by API path.
var beaconCache = NewCache[beaconCacheVal](
	func() time.Duration {
		s := envOr("CACHE_TTL_SECONDS", "20")
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 300 {
			return time.Duration(n) * time.Second
		}
		return 20 * time.Second
	}(),
	func() time.Duration {
		s := envOr("ERROR_CACHE_TTL_SECONDS", "10")
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 120 {
			return time.Duration(n) * time.Second
		}
		return 10 * time.Second
	}(),
)

// beaconGET fetches data from the beacon API with caching and health monitoring
func beaconGET(path string) (json.RawMessage, int, error) {
	// Check cache first - beacon data doesn't change super fast
	if v, ok := beaconCache.Get(path); ok {
		return v.Body, v.Status, nil
	}

	url := strings.TrimRight(beaconBase, "/") + path
	resp, err := beaconHTTPClient.Get(url)
	if err != nil {
		// Network error - update health monitor
		if beaconHealth != nil {
			beaconHealth.SetError(err)
		}
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	isErr := resp.StatusCode/100 != 2
	beaconCache.Set(path, beaconCacheVal{Body: json.RawMessage(body), Status: resp.StatusCode}, isErr)

	// Track health based on HTTP status
	if beaconHealth != nil && !isErr {
		beaconHealth.SetSuccess()
	} else if beaconHealth != nil {
		beaconHealth.SetError(fmt.Errorf("HTTP %d", resp.StatusCode))
	}

	return json.RawMessage(body), resp.StatusCode, nil
}
