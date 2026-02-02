// Package pkg provides shared infrastructure: cache (TTL) and health (BaseDataSource,
// aggregation). Used by clients (beacon, relay) and server. No business logic.
package pkg

import (
	"sync"
	"time"
)

// entry holds a cached value and expiry; unexported so only this package mutates it.
type entry[V any] struct {
	value   V
	expires time.Time
}

// Cache is a thread-safe TTL cache with separate TTLs for success and error entries.
type Cache[V any] struct {
	mu      sync.RWMutex
	entries map[string]entry[V]
	okTTL   time.Duration
	errTTL  time.Duration
}

// NewCache creates a cache. If errTTL is 0, error entries use okTTL.
func NewCache[V any](okTTL, errTTL time.Duration) *Cache[V] {
	if errTTL == 0 {
		errTTL = okTTL
	}
	return &Cache[V]{
		entries: make(map[string]entry[V]),
		okTTL:   okTTL,
		errTTL:  errTTL,
	}
}

// Get returns the cached value for key if present and not expired.
func (c *Cache[V]) Get(key string) (V, bool) {
	now := time.Now()
	c.mu.RLock()
	e, ok := c.entries[key]
	c.mu.RUnlock()
	if ok && now.Before(e.expires) {
		return e.value, true
	}
	if ok {
		c.mu.Lock()
		delete(c.entries, key)
		c.mu.Unlock()
	}
	var zero V
	return zero, false
}

// Set stores a value. When isError is true, errTTL is used.
func (c *Cache[V]) Set(key string, val V, isError bool) {
	ttl := c.okTTL
	if isError {
		ttl = c.errTTL
	}
	c.mu.Lock()
	c.entries[key] = entry[V]{value: val, expires: time.Now().Add(ttl)}
	c.mu.Unlock()
}

// Has returns true if key exists and has not expired.
func (c *Cache[V]) Has(key string) bool {
	_, ok := c.Get(key)
	return ok
}
