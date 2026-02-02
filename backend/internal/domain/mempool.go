// Package domain provides feature logic: mempool, track, txdecode, sandwich (MEV), snapshot.
// This file: mempool monitoring via HTTP polling of the execution layer.
package domain

import (
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
	"github.com/you/eth-tx-lifecycle-backend/internal/pkg"
)

// PendingTx is a simplified view of a transaction before it's included in a block.
type PendingTx struct {
	Hash      string  `json:"hash"`
	From      string  `json:"from"`
	To        *string `json:"to"`
	Value     string  `json:"value"`
	GasPrice  *string `json:"gasPrice"`
	Gas       *string `json:"gas"`
	Nonce     string  `json:"nonce"`
	Input     string  `json:"input"`
	Timestamp int64   `json:"timestamp"`
}

// MempoolMetrics provides aggregated stats about pending transactions.
type MempoolMetrics struct {
	TotalGasRequested uint64  `json:"totalGasRequested"`
	TotalValueWei     string  `json:"totalValueWei"`
	AvgGasPrice       float64 `json:"avgGasPrice"`
	HighPriorityCount int     `json:"highPriorityCount"`
}

// MempoolData holds the current snapshot of pending transactions.
type MempoolData struct {
	PendingTxs []PendingTx     `json:"pendingTxs"`
	Count      int             `json:"count"`
	LastUpdate int64           `json:"lastUpdate"`
	Source     string          `json:"source"`
	Metrics    *MempoolMetrics `json:"metrics,omitempty"`
}

var (
	mempoolData   = MempoolData{PendingTxs: make([]PendingTx, 0), Source: "ws"}
	mempoolMu     sync.RWMutex
	mempoolHealth *pkg.BaseDataSource
)

func init() {
	mempoolHealth = pkg.NewBaseDataSource("mempool", "mempool_health", 30*time.Second)
}

// GetData returns the current mempool snapshot.
func GetData() MempoolData {
	mempoolMu.RLock()
	defer mempoolMu.RUnlock()
	return mempoolData
}

// Start begins mempool monitoring in the background.
func Start() {
	if d := strings.ToLower(config.EnvOr("MEMPOOL_DISABLE", "")); d == "1" || d == "true" || d == "yes" || d == "on" {
		log.Println("mempool WS: disabled via MEMPOOL_DISABLE env")
		mempoolMu.Lock()
		mempoolData.Source = "ws-disabled"
		mempoolData.Count = 10
		mempoolData.LastUpdate = time.Now().Unix()
		mockTxs := make([]PendingTx, 10)
		for i := range 10 {
			to := fmt.Sprintf("0x%040x", i*2000)
			mockTxs[i] = PendingTx{
				Hash:      fmt.Sprintf("0x%064x", i+1),
				From:      fmt.Sprintf("0x%040x", i*1000),
				Value:     fmt.Sprintf("0x%x", (i+1)*1e18),
				Timestamp: time.Now().Unix() - int64(i*10),
				To:        &to,
			}
		}
		mempoolData.PendingTxs = mockTxs
		mempoolMu.Unlock()
		return
	}
	log.Println("mempool: starting HTTP polling for pending transactions")
	go mempoolPoll()
}

func calculateMempoolMetrics(txs []PendingTx) *MempoolMetrics {
	if len(txs) == 0 {
		return nil
	}
	metrics := &MempoolMetrics{}
	var totalGasPrice uint64
	var gasPriceCount int
	totalValue := big.NewInt(0)
	for _, tx := range txs {
		if tx.Gas != nil {
			if gas, err := config.ParseHexUint64(*tx.Gas); err == nil {
				metrics.TotalGasRequested += gas
			}
		}
		if tx.Value != "" && tx.Value != "0x" && tx.Value != "0x0" {
			if val, ok := config.ParseHexBigInt(tx.Value); ok {
				totalValue.Add(totalValue, val)
			}
		}
		var gasPrice uint64
		if tx.GasPrice != nil && *tx.GasPrice != "" {
			if gp, err := config.ParseHexUint64(*tx.GasPrice); err == nil {
				gasPrice = gp
			}
		}
		if gasPrice > 0 {
			totalGasPrice += gasPrice
			gasPriceCount++
			if gasPrice > 50_000_000_000 {
				metrics.HighPriorityCount++
			}
		}
	}
	metrics.TotalValueWei = "0x" + totalValue.Text(16)
	if gasPriceCount > 0 {
		metrics.AvgGasPrice = float64(totalGasPrice/uint64(gasPriceCount)) / 1e9
	}
	return metrics
}

func mempoolPoll() {
	log.Println("mempool HTTP: starting polling of pending block")
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		raw, err := eth.Call("eth_getBlockByNumber", []any{"pending", true})
		if err != nil {
			log.Printf("mempool HTTP: failed to fetch pending block: %v\n", err)
			mempoolHealth.SetError(err)
			continue
		}
		var block struct {
			Transactions []struct {
				Hash     string  `json:"hash"`
				From     string  `json:"from"`
				To       *string `json:"to"`
				Value    string  `json:"value"`
				GasPrice *string `json:"gasPrice"`
				Gas      *string `json:"gas"`
				Nonce    string  `json:"nonce"`
				Input    string  `json:"input"`
			} `json:"transactions"`
		}
		if err := json.Unmarshal(raw, &block); err != nil {
			log.Printf("mempool HTTP: failed to parse pending block: %v\n", err)
			continue
		}
		if len(block.Transactions) == 0 {
			continue
		}
		now := time.Now().Unix()
		pendingTxs := make([]PendingTx, len(block.Transactions))
		for i := range block.Transactions {
			tx := block.Transactions[i]
			pendingTxs[i] = PendingTx{
				Hash:      tx.Hash,
				From:      tx.From,
				To:        tx.To,
				Value:     tx.Value,
				GasPrice:  tx.GasPrice,
				Gas:       tx.Gas,
				Nonce:     tx.Nonce,
				Input:     tx.Input,
				Timestamp: now,
			}
		}
		metrics := calculateMempoolMetrics(pendingTxs)
		mempoolMu.Lock()
		mempoolData.PendingTxs = pendingTxs
		mempoolData.Count = len(pendingTxs)
		mempoolData.LastUpdate = now
		mempoolData.Source = "http-polling"
		mempoolData.Metrics = metrics
		mempoolMu.Unlock()
		mempoolHealth.SetSuccess()
		log.Printf("mempool HTTP: fetched %d pending transactions (avg gas: %.2f gwei)\n", len(pendingTxs), metrics.AvgGasPrice)
	}
}

// CheckHealth returns health status based on recent mempool data.
func CheckHealth() pkg.HealthStatus {
	d := GetData()
	healthy := d.Count > 0 || d.Source == "ws-disabled"
	if healthy {
		mempoolHealth.SetSuccess()
	} else {
		mempoolHealth.SetError(nil)
	}
	return pkg.StatusFromSource(mempoolHealth)
}
