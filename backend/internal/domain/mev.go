// Package domain: this file detects various MEV types including sandwiches, arbitrage, liquidations, and JIT liquidity.
package domain

import (
	"encoding/hex"
	"encoding/json"
	"sort"
	"strconv"
	"strings"

	"golang.org/x/crypto/sha3"
	"golang.org/x/sync/errgroup"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
)

// Block is a minimal block structure for MEV detection.
type Block struct {
	Number       string
	Hash         string
	Timestamp    string
	Transactions []struct {
		Hash string `json:"hash"`
		From string `json:"from"`
	}
}

// SwapEvent represents a single swap found in a block.
type SwapEvent struct {
	TxHash   string
	TxFrom   string
	Pool     string
	TxIndex  int
	LogIndex int
}

// Sandwich represents a detected sandwich attack.
type Sandwich struct {
	Pool     string `json:"pool"`
	Attacker string `json:"attacker"`
	Victim   string `json:"victim"`
	PreTx    string `json:"preTx"`
	VictimTx string `json:"victimTx"`
	PostTx   string `json:"postTx"`
	Block    string `json:"block"`
}

// Arbitrage represents a detected arbitrage (multi-pool swaps in one tx).
type Arbitrage struct {
	Searcher  string   `json:"searcher"`
	TxHash    string   `json:"txHash"`
	Pools     []string `json:"pools"`
	SwapCount int      `json:"swapCount"`
	Block     string   `json:"block"`
}

// Liquidation represents a detected lending protocol liquidation.
type Liquidation struct {
	Liquidator string `json:"liquidator"`
	Borrower   string `json:"borrower"`
	TxHash     string `json:"txHash"`
	Protocol   string `json:"protocol"`
	Block      string `json:"block"`
}

// JITLiquidity represents just-in-time liquidity provision around a swap.
type JITLiquidity struct {
	Provider string `json:"provider"`
	Pool     string `json:"pool"`
	MintTx   string `json:"mintTx"`
	SwapTx   string `json:"swapTx"`
	BurnTx   string `json:"burnTx"`
	Block    string `json:"block"`
}

// MEVEvent is a generic container for any detected MEV log event.
type MEVEvent struct {
	Type     string
	TxHash   string
	TxIndex  int
	Searcher string
	Pool     string
	LogIndex int
	Data     string // Extra data for liquidations (borrower address)
}

// MEVAnalysis is the complete MEV analysis result for a block.
type MEVAnalysis struct {
	Block            string         `json:"block"`
	BlockHash        string         `json:"blockHash"`
	TxScanned        int            `json:"txScanned"`
	TotalTx          int            `json:"totalTx"`
	SwapCount        int            `json:"swapCount"`
	Sandwiches       []Sandwich     `json:"sandwiches"`
	Arbitrages       []Arbitrage    `json:"arbitrages"`
	Liquidations     []Liquidation  `json:"liquidations"`
	JITLiquidity     []JITLiquidity `json:"jitLiquidity"`
	SandwichCount    int            `json:"sandwichCount"`
	ArbitrageCount   int            `json:"arbitrageCount"`
	LiquidationCount int            `json:"liquidationCount"`
	JITCount         int            `json:"jitCount"`
}

func keccakTopic(signature string) string {
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(signature))
	var out [32]byte
	h.Sum(out[:0])
	return "0x" + hex.EncodeToString(out[:])
}

// Event topic signatures
var (
	// Uniswap V2/V3 Swap events
	swapTopicV2 = strings.ToLower(keccakTopic("Swap(address,uint256,uint256,uint256,uint256,address)"))
	swapTopicV3 = strings.ToLower(keccakTopic("Swap(address,address,int256,int256,uint160,uint128,int24)"))
	// Uniswap V2/V3 Mint events for JIT liquidity detection
	mintTopicV2 = strings.ToLower(keccakTopic("Mint(address,uint256,uint256)"))
	mintTopicV3 = strings.ToLower(keccakTopic("Mint(address,address,int24,int24,uint128,uint256,uint256)"))
	// Uniswap V2/V3 Burn events
	burnTopicV2 = strings.ToLower(keccakTopic("Burn(address,uint256,uint256,address)"))
	burnTopicV3 = strings.ToLower(keccakTopic("Burn(address,int24,int24,uint128,uint256,uint256)"))
	// Aave V2/V3 LiquidationCall
	liquidationAave = strings.ToLower(keccakTopic("LiquidationCall(address,address,address,uint256,uint256,address,bool)"))
	// Compound V2 LiquidateBorrow
	liquidationCompound = strings.ToLower(keccakTopic("LiquidateBorrow(address,address,uint256,address,uint256)"))

	mevMaxTx   int
	mevWorkers int
)

func init() {
	mevMaxTx = 400
	if s := config.EnvOr("SANDWICH_MAX_TX", "400"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			if n < 10 {
				n = 10
			}
			if n > 1000 {
				n = 1000
			}
			mevMaxTx = n
		}
	}
	mevWorkers = 10
	if s := config.EnvOr("SANDWICH_WORKERS", "10"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n >= 1 {
			if n > 50 {
				n = 50
			}
			mevWorkers = n
		}
	}
}

// FetchBlockFull returns a full block by tag.
func FetchBlockFull(tag string) (*Block, error) {
	raw, err := eth.Call("eth_getBlockByNumber", []any{tag, true})
	if err != nil {
		return nil, err
	}
	var b struct {
		Number       string `json:"number"`
		Hash         string `json:"hash"`
		Timestamp    string `json:"timestamp"`
		Transactions []struct {
			Hash string `json:"hash"`
			From string `json:"from"`
		} `json:"transactions"`
	}
	if err := json.Unmarshal(raw, &b); err != nil {
		return nil, err
	}
	return &Block{Number: b.Number, Hash: b.Hash, Timestamp: b.Timestamp, Transactions: b.Transactions}, nil
}

type mevReceipt struct {
	TxHash string
	From   string
	Logs   []struct {
		Address  string
		Topics   []string
		LogIndex int
	}
}

func fetchMEVReceipt(txHash, from string) (*mevReceipt, error) {
	raw, err := eth.Call("eth_getTransactionReceipt", []any{txHash})
	if err != nil {
		return nil, err
	}
	var r struct {
		TransactionHash string `json:"transactionHash"`
		Logs            []struct {
			Address  string   `json:"address"`
			Topics   []string `json:"topics"`
			LogIndex string   `json:"logIndex"`
		} `json:"logs"`
	}
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, err
	}
	rcpt := &mevReceipt{TxHash: r.TransactionHash, From: from}
	for _, l := range r.Logs {
		idx := parseHexInt(l.LogIndex)
		rcpt.Logs = append(rcpt.Logs, struct {
			Address  string
			Topics   []string
			LogIndex int
		}{Address: l.Address, Topics: l.Topics, LogIndex: idx})
	}
	return rcpt, nil
}

func parseHexInt(s string) int {
	s = strings.TrimPrefix(strings.ToLower(s), "0x")
	var n int
	for _, c := range s {
		n *= 16
		if c >= '0' && c <= '9' {
			n += int(c - '0')
		} else if c >= 'a' && c <= 'f' {
			n += int(c-'a') + 10
		}
	}
	return n
}

// CollectMEVEvents scans a block for all MEV-related events.
func CollectMEVEvents(b *Block) ([]MEVEvent, error) {
	maxN := len(b.Transactions)
	if mevMaxTx < maxN {
		maxN = mevMaxTx
	}
	results := make([][]MEVEvent, maxN)

	g := new(errgroup.Group)
	g.SetLimit(mevWorkers)

	for idx := 0; idx < maxN; idx++ {
		i := idx
		g.Go(func() error {
			tx := b.Transactions[i]
			rcpt, err := fetchMEVReceipt(tx.Hash, tx.From)
			if err != nil || rcpt == nil {
				return nil
			}
			var local []MEVEvent
			for _, lg := range rcpt.Logs {
				if len(lg.Topics) == 0 {
					continue
				}
				topic := strings.ToLower(lg.Topics[0])
				evt := MEVEvent{
					TxHash:   strings.ToLower(rcpt.TxHash),
					TxIndex:  i,
					Searcher: strings.ToLower(rcpt.From),
					Pool:     strings.ToLower(lg.Address),
					LogIndex: lg.LogIndex,
				}
				switch topic {
				case swapTopicV2, swapTopicV3:
					evt.Type = "swap"
					local = append(local, evt)
				case mintTopicV2, mintTopicV3:
					evt.Type = "mint"
					local = append(local, evt)
				case burnTopicV2, burnTopicV3:
					evt.Type = "burn"
					local = append(local, evt)
				case liquidationAave:
					evt.Type = "liquidation"
					evt.Data = "aave"
					// Extract borrower from topics[3] if available
					if len(lg.Topics) > 3 {
						evt.Data = "aave:" + strings.ToLower(lg.Topics[3])
					}
					local = append(local, evt)
				case liquidationCompound:
					evt.Type = "liquidation"
					evt.Data = "compound"
					local = append(local, evt)
				}
			}
			results[i] = local
			return nil
		})
	}

	_ = g.Wait()

	var events []MEVEvent
	for _, local := range results {
		events = append(events, local...)
	}
	// Sort by tx index, then log index
	sort.Slice(events, func(i, j int) bool {
		if events[i].TxIndex == events[j].TxIndex {
			return events[i].LogIndex < events[j].LogIndex
		}
		return events[i].TxIndex < events[j].TxIndex
	})
	return events, nil
}

// CollectSwaps scans a block for Uniswap V2/V3 swap events (legacy function for compatibility).
func CollectSwaps(b *Block) ([]SwapEvent, error) {
	events, err := CollectMEVEvents(b)
	if err != nil {
		return nil, err
	}
	var swaps []SwapEvent
	for _, e := range events {
		if e.Type == "swap" {
			swaps = append(swaps, SwapEvent{
				TxHash:   e.TxHash,
				TxFrom:   e.Searcher,
				Pool:     e.Pool,
				TxIndex:  e.TxIndex,
				LogIndex: e.LogIndex,
			})
		}
	}
	return swaps, nil
}

// DetectSandwiches finds sandwich patterns in a list of swaps.
func DetectSandwiches(swaps []SwapEvent, blockNum string) []Sandwich {
	grouped := map[string][]SwapEvent{}
	for _, s := range swaps {
		grouped[s.Pool] = append(grouped[s.Pool], s)
	}
	var out []Sandwich
	for pool, seq := range grouped {
		for i := 0; i+2 < len(seq); i++ {
			pre, victim, post := seq[i], seq[i+1], seq[i+2]
			if pre.Pool != victim.Pool || victim.Pool != post.Pool {
				continue
			}
			if pre.TxFrom == "" || post.TxFrom == "" || victim.TxFrom == "" {
				continue
			}
			if pre.TxFrom == post.TxFrom && pre.TxFrom != victim.TxFrom {
				out = append(out, Sandwich{
					Pool: pool, Attacker: pre.TxFrom, Victim: victim.TxFrom,
					PreTx: pre.TxHash, VictimTx: victim.TxHash, PostTx: post.TxHash, Block: blockNum,
				})
				i += 2
			}
		}
	}
	return out
}

// DetectArbitrage finds transactions with swaps across multiple pools (atomic arb).
func DetectArbitrage(events []MEVEvent, blockNum string) []Arbitrage {
	// Group swaps by transaction
	txSwaps := make(map[string][]MEVEvent)
	for _, e := range events {
		if e.Type == "swap" {
			txSwaps[e.TxHash] = append(txSwaps[e.TxHash], e)
		}
	}

	var arbs []Arbitrage
	for txHash, swaps := range txSwaps {
		if len(swaps) < 2 {
			continue
		}
		// Check if swaps touch multiple unique pools
		pools := make(map[string]bool)
		for _, s := range swaps {
			pools[s.Pool] = true
		}
		if len(pools) >= 2 {
			poolList := make([]string, 0, len(pools))
			for p := range pools {
				poolList = append(poolList, p)
			}
			arbs = append(arbs, Arbitrage{
				Searcher:  swaps[0].Searcher,
				TxHash:    txHash,
				Pools:     poolList,
				SwapCount: len(swaps),
				Block:     blockNum,
			})
		}
	}
	return arbs
}

// DetectLiquidations extracts liquidation events from the MEV events.
func DetectLiquidations(events []MEVEvent, blockNum string) []Liquidation {
	var liqs []Liquidation
	for _, e := range events {
		if e.Type == "liquidation" {
			protocol := "Aave"
			borrower := ""
			if strings.HasPrefix(e.Data, "compound") {
				protocol = "Compound"
			} else if strings.HasPrefix(e.Data, "aave:") {
				parts := strings.SplitN(e.Data, ":", 2)
				if len(parts) > 1 {
					borrower = parts[1]
				}
			}
			liqs = append(liqs, Liquidation{
				Liquidator: e.Searcher,
				Borrower:   borrower,
				TxHash:     e.TxHash,
				Protocol:   protocol,
				Block:      blockNum,
			})
		}
	}
	return liqs
}

// DetectJITLiquidity finds mint→swap→burn patterns in the same pool within a block.
func DetectJITLiquidity(events []MEVEvent, blockNum string) []JITLiquidity {
	// Group events by pool
	poolEvents := make(map[string][]MEVEvent)
	for _, e := range events {
		if e.Type == "mint" || e.Type == "burn" || e.Type == "swap" {
			poolEvents[e.Pool] = append(poolEvents[e.Pool], e)
		}
	}

	var jits []JITLiquidity
	for pool, evts := range poolEvents {
		// Categorize events
		var mints, swaps, burns []MEVEvent
		for _, e := range evts {
			switch e.Type {
			case "mint":
				mints = append(mints, e)
			case "swap":
				swaps = append(swaps, e)
			case "burn":
				burns = append(burns, e)
			}
		}
		// For each mint, check if there's a swap then burn from same address
		for _, m := range mints {
			for _, burn := range burns {
				if m.Searcher != burn.Searcher {
					continue
				}
				if m.TxIndex >= burn.TxIndex {
					continue // mint must be before burn
				}
				// Check for swap in between (from a different address - the victim)
				for _, swap := range swaps {
					if swap.TxIndex > m.TxIndex && swap.TxIndex < burn.TxIndex && swap.Searcher != m.Searcher {
						jits = append(jits, JITLiquidity{
							Provider: m.Searcher,
							Pool:     pool,
							MintTx:   m.TxHash,
							SwapTx:   swap.TxHash,
							BurnTx:   burn.TxHash,
							Block:    blockNum,
						})
						break // Found one JIT for this mint/burn pair
					}
				}
			}
		}
	}
	return jits
}

// AnalyzeBlockMEV performs complete MEV analysis on a block.
func AnalyzeBlockMEV(b *Block) (*MEVAnalysis, error) {
	events, err := CollectMEVEvents(b)
	if err != nil {
		return nil, err
	}

	// Extract swaps for sandwich detection
	var swaps []SwapEvent
	for _, e := range events {
		if e.Type == "swap" {
			swaps = append(swaps, SwapEvent{
				TxHash:   e.TxHash,
				TxFrom:   e.Searcher,
				Pool:     e.Pool,
				TxIndex:  e.TxIndex,
				LogIndex: e.LogIndex,
			})
		}
	}

	sandwiches := DetectSandwiches(swaps, b.Number)
	arbitrages := DetectArbitrage(events, b.Number)
	liquidations := DetectLiquidations(events, b.Number)
	jits := DetectJITLiquidity(events, b.Number)

	maxN := len(b.Transactions)
	if mevMaxTx < maxN {
		maxN = mevMaxTx
	}

	return &MEVAnalysis{
		Block:            b.Number,
		BlockHash:        b.Hash,
		TxScanned:        maxN,
		TotalTx:          len(b.Transactions),
		SwapCount:        len(swaps),
		Sandwiches:       sandwiches,
		Arbitrages:       arbitrages,
		Liquidations:     liquidations,
		JITLiquidity:     jits,
		SandwichCount:    len(sandwiches),
		ArbitrageCount:   len(arbitrages),
		LiquidationCount: len(liquidations),
		JITCount:         len(jits),
	}, nil
}
