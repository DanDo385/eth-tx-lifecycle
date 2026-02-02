// cache.go
// Generic TTL cache used by beacon, relay, and snapshot modules.
// Replaces three separate cache implementations with one reusable type.
package backend

import (
	"sync"
	"time"
)

// cacheEntry holds a cached value with an expiration timestamp.
type cacheEntry[V any] struct {
	value   V
	expires time.Time
}

// Cache is a thread-safe TTL cache with separate TTLs for success and error entries.
// V is the value type stored in the cache.
type Cache[V any] struct {
	mu      sync.RWMutex
	entries map[string]cacheEntry[V]
	okTTL   time.Duration
	errTTL  time.Duration
}

// NewCache creates a cache with the given TTLs for successful and error entries.
// If errTTL is 0, error entries use the same TTL as successful ones.
func NewCache[V any](okTTL, errTTL time.Duration) *Cache[V] {
	if errTTL == 0 {
		errTTL = okTTL
	}
	return &Cache[V]{
		entries: make(map[string]cacheEntry[V]),
		okTTL:   okTTL,
		errTTL:  errTTL,
	}
}

// Get returns the cached value for key if it exists and hasn't expired.
// Returns (value, true) on hit, (zero, false) on miss or expiration.
func (c *Cache[V]) Get(key string) (V, bool) {
	now := time.Now()

	c.mu.RLock()
	e, ok := c.entries[key]
	c.mu.RUnlock()

	if ok && now.Before(e.expires) {
		return e.value, true
	}

	// Expired — clean up
	if ok {
		c.mu.Lock()
		delete(c.entries, key)
		c.mu.Unlock()
	}

	var zero V
	return zero, false
}

// Set stores a value in the cache. When isError is true, the shorter errTTL is used.
func (c *Cache[V]) Set(key string, val V, isError bool) {
	ttl := c.okTTL
	if isError {
		ttl = c.errTTL
	}
	c.mu.Lock()
	c.entries[key] = cacheEntry[V]{value: val, expires: time.Now().Add(ttl)}
	c.mu.Unlock()
}

// Has returns true if the key exists and hasn't expired.
func (c *Cache[V]) Has(key string) bool {
	_, ok := c.Get(key)
	return ok
}
