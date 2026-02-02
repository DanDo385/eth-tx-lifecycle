// helpers.go
// Shared utility functions used across the backend: environment loading, hex parsing,
// HTTP client construction, and URL sanitization for safe logging.
package backend

import (
	"bufio"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

// loadEnvFile reads a .env file and loads all KEY=VALUE pairs into environment variables.
// Skips comments (#) and blank lines. If the file doesn't exist, that's fine - we just use defaults.
func loadEnvFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return // No .env file? No problem, we'll use defaults
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			os.Setenv(key, value)
		}
	}
}

// envOr grabs an environment variable, or returns a fallback if it's not set
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ---------------------------------------------------------------------------
// Hex parsing helpers
// ---------------------------------------------------------------------------

// parseHexUint64 parses a "0x"-prefixed hex string into a uint64.
func parseHexUint64(h string) (uint64, error) {
	return strconv.ParseUint(strings.TrimPrefix(h, "0x"), 16, 64)
}

// parseHexBigInt parses a "0x"-prefixed hex string into a *big.Int.
// Returns (nil, false) on failure.
func parseHexBigInt(h string) (*big.Int, bool) {
	return new(big.Int).SetString(strings.TrimPrefix(h, "0x"), 16)
}

// ---------------------------------------------------------------------------
// HTTP client factory
// ---------------------------------------------------------------------------

// newHTTPClient creates an *http.Client whose timeout is read from the given
// environment variable (in seconds). Falls back to defaultTimeout.
func newHTTPClient(envKey string, defaultTimeout time.Duration) *http.Client {
	if s := envOr(envKey, ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 60 {
			return &http.Client{Timeout: time.Duration(n) * time.Second}
		}
	}
	return &http.Client{Timeout: defaultTimeout}
}

// ---------------------------------------------------------------------------
// URL sanitization (for safe logging of API endpoints)
// ---------------------------------------------------------------------------

// sanitizeURL removes API keys and sensitive parameters from URLs
func sanitizeURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// Parse the URL
	u, err := url.Parse(rawURL)
	if err != nil {
		// If parsing fails, try to redact common patterns
		return redactAPIKey(rawURL)
	}

	// Remove userinfo (username:password)
	u.User = nil

	// Remove sensitive query parameters
	q := u.Query()
	for key := range q {
		lowerKey := strings.ToLower(key)
		if strings.Contains(lowerKey, "key") || strings.Contains(lowerKey, "token") || strings.Contains(lowerKey, "secret") {
			q.Del(key)
		}
	}
	u.RawQuery = q.Encode()

	// Redact API keys in path
	u.Path = redactAPIKey(u.Path)

	return u.String()
}

// redactAPIKey removes common API key patterns from a string
func redactAPIKey(s string) string {
	// Redact Infura, Alchemy, and similar API keys (typically 32-40 character hex strings)
	// Pattern: /v3/[hex], /v2/[hex], /ws/v3/[hex]
	s = strings.ReplaceAll(s, "/v3/", "/v3/[REDACTED]")
	s = strings.ReplaceAll(s, "/v2/", "/v2/[REDACTED]")

	// Remove the actual key after redaction markers
	parts := strings.Split(s, "/[REDACTED]")
	if len(parts) > 1 {
		// Keep everything before [REDACTED], drop everything after
		return parts[0] + "/[REDACTED]"
	}

	return s
}

// sourcesInfo returns a summary of configured upstream feeds so the UI can display
// which services are backing each panel. Values come from package-level vars.
// API keys and sensitive credentials are sanitized.
func sourcesInfo() map[string]any {
	sanitizedRelays := make([]string, len(relayBases))
	for i, relay := range relayBases {
		sanitizedRelays[i] = sanitizeURL(relay)
	}

	return map[string]any{
		"rpc_http":   sanitizeURL(rpcHTTP),
		"rpc_ws":     sanitizeURL(rpcWS),
		"beacon_api": sanitizeURL(beaconBase),
		"relays":     sanitizedRelays,
	}
}
