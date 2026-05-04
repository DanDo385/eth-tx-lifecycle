package pkg

import (
	"errors"
	"testing"
	"time"
)

func TestBaseDataSourceIsHealthy(t *testing.T) {
	t.Parallel()
	ds := NewBaseDataSource("t", "k", time.Minute)
	if !ds.IsHealthy() {
		t.Fatal("no success and no error should read healthy (not yet probed)")
	}
	ds.SetError(errors.New("boom"))
	if ds.IsHealthy() {
		t.Fatal("error with no recent success should be unhealthy")
	}
	ds.SetSuccess()
	if !ds.IsHealthy() {
		t.Fatal("after success should be healthy")
	}
}

func TestBuildOverallStatuses(t *testing.T) {
	t.Parallel()
	h := BuildOverall([]HealthStatus{
		{Name: "a", Healthy: true},
		{Name: "b", Healthy: false},
	})
	if h.Status != "degraded" {
		t.Fatalf("status %q", h.Status)
	}
	if h.Summary.Total != 2 || h.Summary.Healthy != 1 || h.Summary.Unhealthy != 1 {
		t.Fatalf("summary %+v", h.Summary)
	}
	h2 := BuildOverall([]HealthStatus{{Name: "a", Healthy: true}})
	if h2.Status != "healthy" {
		t.Fatalf("got %q", h2.Status)
	}
}
