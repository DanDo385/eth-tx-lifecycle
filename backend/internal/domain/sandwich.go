// Package domain: this file detects MEV sandwich attacks (Uniswap V2/V3 heuristics).
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

// Block is a minimal block structure for sandwich detection.
type Block struct {
	Number       string
	Hash         string
	Timestamp    string
	Transactions []struct {
		Hash string `json:"hash"`
		From string `json:"from"`
	}
}

type sandwichReceipt struct {
	TransactionHash string `json:"transactionHash"`
	Logs            []struct {
		Address string   `json:"address"`
		Topics  []string `json:"topics"`
	} `json:"logs"`
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

func keccakTopic(signature string) string {
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(signature))
	var out [32]byte
	h.Sum(out[:0])
	return "0x" + hex.EncodeToString(out[:])
}

var (
	swapTopicV2     = strings.ToLower(keccakTopic("Swap(address,uint256,uint256,uint256,uint256,address)"))
	swapTopicV3     = strings.ToLower(keccakTopic("Swap(address,address,int256,int256,uint160,uint128,int24)"))
	sandwichMaxTx   int
	sandwichWorkers int
)

func init() {
	sandwichMaxTx = 120
	if s := config.EnvOr("SANDWICH_MAX_TX", "120"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			if n < 10 {
				n = 10
			}
			if n > 1000 {
				n = 1000
			}
			sandwichMaxTx = n
		}
	}
	sandwichWorkers = 10
	if s := config.EnvOr("SANDWICH_WORKERS", "10"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n >= 1 {
			if n > 50 {
				n = 50
			}
			sandwichWorkers = n
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

func fetchSandwichReceipt(txHash string) (*sandwichReceipt, error) {
	raw, err := eth.Call("eth_getTransactionReceipt", []any{txHash})
	if err != nil {
		return nil, err
	}
	var r sandwichReceipt
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// CollectSwaps scans a block for Uniswap V2/V3 swap events.
func CollectSwaps(b *Block) ([]SwapEvent, error) {
	maxN := len(b.Transactions)
	if sandwichMaxTx < maxN {
		maxN = sandwichMaxTx
	}
	results := make([][]SwapEvent, maxN)

	g := new(errgroup.Group)
	g.SetLimit(sandwichWorkers)

	for idx := 0; idx < maxN; idx++ {
		i := idx
		g.Go(func() error {
			tx := b.Transactions[i]
			rcpt, err := fetchSandwichReceipt(tx.Hash)
			if err != nil || rcpt == nil {
				return nil
			}
			var local []SwapEvent
			for logIdx, lg := range rcpt.Logs {
				if len(lg.Topics) == 0 {
					continue
				}
				topic := strings.ToLower(lg.Topics[0])
				if topic != swapTopicV2 && topic != swapTopicV3 {
					continue
				}
				local = append(local, SwapEvent{
					TxHash: strings.ToLower(tx.Hash), TxFrom: strings.ToLower(tx.From),
					Pool: strings.ToLower(lg.Address), TxIndex: i, LogIndex: logIdx,
				})
			}
			results[i] = local
			return nil
		})
	}

	_ = g.Wait()

	var swaps []SwapEvent
	for _, local := range results {
		swaps = append(swaps, local...)
	}
	sort.Slice(swaps, func(i, j int) bool {
		if swaps[i].TxIndex == swaps[j].TxIndex {
			return swaps[i].LogIndex < swaps[j].LogIndex
		}
		return swaps[i].TxIndex < swaps[j].TxIndex
	})
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
