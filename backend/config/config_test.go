package config

import (
	"math/big"
	"os"
	"strings"
	"testing"
)

func TestParseHexUint64(t *testing.T) {
	t.Parallel()
	cases := []struct {
		in   string
		want uint64
		ok   bool
	}{
		{"0x0", 0, true},
		{"0x1", 1, true},
		{"0xa", 10, true},
		{"0xFFFFFFFFFFFFFFFF", 1<<64 - 1, true},
		{"0x10000000000000000", 0, false},
		{"not-hex", 0, false},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.in, func(t *testing.T) {
			t.Parallel()
			got, err := ParseHexUint64(tc.in)
			if tc.ok {
				if err != nil {
					t.Fatalf("unexpected err: %v", err)
				}
				if got != tc.want {
					t.Fatalf("got %d want %d", got, tc.want)
				}
			} else if err == nil {
				t.Fatalf("expected error for %q", tc.in)
			}
		})
	}
}

func TestParseHexBigInt(t *testing.T) {
	t.Parallel()
	got, ok := ParseHexBigInt("0x10")
	if !ok || got.Cmp(big.NewInt(16)) != 0 {
		t.Fatalf("got %v ok=%v", got, ok)
	}
	_, ok = ParseHexBigInt("zz")
	if ok {
		t.Fatal("expected failure")
	}
}

func TestSanitizeURL(t *testing.T) {
	t.Parallel()
	u := "https://eth-mainnet.g.alchemy.com/v2/SECRET123/path?apiKey=abc&token=def"
	out := SanitizeURL(u)
	if out == "" {
		t.Fatal("empty")
	}
	// path segment redaction and sensitive query params stripped
	if strings.Contains(out, "SECRET123") || strings.Contains(out, "apiKey=abc") || strings.Contains(out, "token=def") {
		t.Fatalf("leaked sensitive material: %s", out)
	}
}

func TestEnvOr(t *testing.T) {
	key := "ETH_TX_LIFECYCLE_CONFIG_TEST_KEY"
	_ = os.Unsetenv(key)
	if got := EnvOr(key, "fallback"); got != "fallback" {
		t.Fatalf("got %q", got)
	}
	t.Setenv(key, "set")
	if got := EnvOr(key, "fallback"); got != "set" {
		t.Fatalf("got %q", got)
	}
}
