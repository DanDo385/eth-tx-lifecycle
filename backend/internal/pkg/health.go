// Health types and aggregation live in package pkg (see cache.go for package doc).
package pkg

import (
	"net/http"
	"time"
)

// BaseDataSource tracks last success/error for a data source. Used by eth, beacon,
// relay, mempool to report health without storing full history.
type BaseDataSource struct {
	Name        string
	LastError   error
	LastSuccess time.Time
	CacheKey    string
	TTL         time.Duration
}

// NewBaseDataSource creates a new base data source.
func NewBaseDataSource(name, cacheKey string, ttl time.Duration) *BaseDataSource {
	return &BaseDataSource{
		Name:     name,
		CacheKey: cacheKey,
		TTL:      ttl,
	}
}

func (b *BaseDataSource) GetName() string           { return b.Name }
func (b *BaseDataSource) GetLastError() error       { return b.LastError }
func (b *BaseDataSource) GetLastSuccess() time.Time { return b.LastSuccess }
func (b *BaseDataSource) GetCacheKey() string       { return b.CacheKey }
func (b *BaseDataSource) GetTTL() time.Duration     { return b.TTL }

// SetError records an error and clears success timestamp.
func (b *BaseDataSource) SetError(err error) {
	b.LastError = err
	b.LastSuccess = time.Time{}
}

// SetSuccess records success and clears error.
func (b *BaseDataSource) SetSuccess() {
	b.LastSuccess = time.Now()
	b.LastError = nil
}

// IsHealthy returns true if the source has had recent success. Syntax: zero LastSuccess
// with no error is treated as healthy (e.g. before first request); otherwise we require
// success within 5 minutes so transient failures don't mark the source unhealthy forever.
func (b *BaseDataSource) IsHealthy() bool {
	if b.LastSuccess.IsZero() && b.LastError == nil {
		return true
	}
	return time.Since(b.LastSuccess) < 5*time.Minute
}

// HealthStatus is the health status of one data source.
type HealthStatus struct {
	Name        string    `json:"name"`
	Healthy     bool      `json:"healthy"`
	LastSuccess time.Time `json:"lastSuccess,omitempty"`
	LastError   string    `json:"lastError,omitempty"`
	Uptime      string    `json:"uptime,omitempty"`
}

// OverallHealth is the aggregated health of all sources.
type OverallHealth struct {
	Status      string         `json:"status"`
	Timestamp   time.Time      `json:"timestamp"`
	DataSources []HealthStatus `json:"dataSources"`
	Summary     struct {
		Total     int `json:"total"`
		Healthy   int `json:"healthy"`
		Unhealthy int `json:"unhealthy"`
	} `json:"summary"`
}

// BuildOverall builds OverallHealth from individual statuses.
func BuildOverall(statuses []HealthStatus) OverallHealth {
	healthyCount := 0
	for _, s := range statuses {
		if s.Healthy {
			healthyCount++
		}
	}
	total := len(statuses)
	var status string
	switch {
	case healthyCount == total:
		status = "healthy"
	case healthyCount > 0:
		status = "degraded"
	default:
		status = "unhealthy"
	}
	h := OverallHealth{
		Status:      status,
		Timestamp:   time.Now(),
		DataSources: statuses,
	}
	h.Summary.Total = total
	h.Summary.Healthy = healthyCount
	h.Summary.Unhealthy = total - healthyCount
	return h
}

// StatusFromSource builds HealthStatus from a BaseDataSource.
func StatusFromSource(ds *BaseDataSource) HealthStatus {
	errStr := ""
	if ds.LastError != nil {
		errStr = ds.LastError.Error()
	}
	return HealthStatus{
		Name:        ds.GetName(),
		Healthy:     ds.IsHealthy(),
		LastSuccess: ds.GetLastSuccess(),
		LastError:   errStr,
	}
}

// WriteLiveness writes a simple liveness response.
func WriteLiveness(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
