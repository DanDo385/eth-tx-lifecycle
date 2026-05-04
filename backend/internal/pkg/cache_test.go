package pkg

import (
	"testing"
	"time"
)

func TestCacheHitMissAndExpiry(t *testing.T) {
	t.Parallel()
	c := NewCache[string](50*time.Millisecond, 0)
	if _, ok := c.Get("k"); ok {
		t.Fatal("expected miss")
	}
	c.Set("k", "v", false)
	if v, ok := c.Get("k"); !ok || v != "v" {
		t.Fatalf("got %q ok=%v", v, ok)
	}
	time.Sleep(60 * time.Millisecond)
	if _, ok := c.Get("k"); ok {
		t.Fatal("expected expiry")
	}
}

func TestCacheErrorTTLUsesErrBranch(t *testing.T) {
	t.Parallel()
	c := NewCache[int](1*time.Hour, 30*time.Millisecond)
	c.Set("e", 1, true)
	if v, ok := c.Get("e"); !ok || v != 1 {
		t.Fatalf("got %v ok=%v", v, ok)
	}
	time.Sleep(40 * time.Millisecond)
	if _, ok := c.Get("e"); ok {
		t.Fatal("expected error entry to expire")
	}
}

func TestCacheHas(t *testing.T) {
	t.Parallel()
	c := NewCache[struct{}](time.Minute, 0)
	if c.Has("x") {
		t.Fatal("expected false")
	}
	c.Set("x", struct{}{}, false)
	if !c.Has("x") {
		t.Fatal("expected true")
	}
}
