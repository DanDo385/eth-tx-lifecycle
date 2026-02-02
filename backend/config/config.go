// Package config provides bootstrap and shared utilities used by almost every
// internal package: env vars (EnvOr, LoadEnvFile), hex parsing (ParseHexUint64,
// ParseHexBigInt), HTTP client creation (NewHTTPClient), and URL sanitization
// for safe logging (SanitizeURL, RedactAPIKey). It lives outside internal/ so
// config is clearly "bootstrap" and not part of internal implementation.
package config

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

// LoadEnvFile reads a .env file and loads KEY=VALUE pairs into environment variables.
// Silently no-ops if the file is missing (err is ignored); server.Run() calls this
// before starting so .env.local is optional.
func LoadEnvFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
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

// EnvOr returns an environment variable or fallback if not set.
func EnvOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ParseHexUint64 parses a "0x"-prefixed hex string into uint64.
func ParseHexUint64(h string) (uint64, error) {
	return strconv.ParseUint(strings.TrimPrefix(h, "0x"), 16, 64)
}

// ParseHexBigInt parses a "0x"-prefixed hex string into *big.Int. Returns (nil, false) on
// failure. Syntax: the two-value return (value, ok) is the usual Go pattern for "optional success."
func ParseHexBigInt(h string) (*big.Int, bool) {
	return new(big.Int).SetString(strings.TrimPrefix(h, "0x"), 16)
}

// NewHTTPClient creates an *http.Client with timeout from env (seconds). Falls back to defaultTimeout.
func NewHTTPClient(envKey string, defaultTimeout time.Duration) *http.Client {
	if s := EnvOr(envKey, ""); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 60 {
			return &http.Client{Timeout: time.Duration(n) * time.Second}
		}
	}
	return &http.Client{Timeout: defaultTimeout}
}

// SanitizeURL removes API keys and sensitive parameters from URLs.
func SanitizeURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return RedactAPIKey(rawURL)
	}
	u.User = nil
	q := u.Query()
	for key := range q {
		lowerKey := strings.ToLower(key)
		if strings.Contains(lowerKey, "key") || strings.Contains(lowerKey, "token") || strings.Contains(lowerKey, "secret") {
			q.Del(key)
		}
	}
	u.RawQuery = q.Encode()
	u.Path = RedactAPIKey(u.Path)
	return u.String()
}

// RedactAPIKey redacts common API key patterns from a string.
func RedactAPIKey(s string) string {
	s = strings.ReplaceAll(s, "/v3/", "/v3/[REDACTED]")
	s = strings.ReplaceAll(s, "/v2/", "/v2/[REDACTED]")
	parts := strings.Split(s, "/[REDACTED]")
	if len(parts) > 1 {
		return parts[0] + "/[REDACTED]"
	}
	return s
}
