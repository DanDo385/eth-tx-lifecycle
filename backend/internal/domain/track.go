// Package domain: this file provides transaction lifecycle tracking (mempool → block → finality).
package domain

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/you/eth-tx-lifecycle-backend/config"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/beacon"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/eth"
	"github.com/you/eth-tx-lifecycle-backend/internal/clients/relay"
)

type trackTx struct {
	Hash                 string  `json:"hash"`
	From                 string  `json:"from"`
	To                   *string `json:"to"`
	BlockHash            *string `json:"blockHash"`
	BlockNumber          *string `json:"blockNumber"`
	Nonce                string  `json:"nonce"`
	GasPrice             *string `json:"gasPrice"`
	MaxFeePerGas         *string `json:"maxFeePerGas"`
	MaxPriorityFeePerGas *string `json:"maxPriorityFeePerGas"`
	Gas                  string  `json:"gas"`
	Value                string  `json:"value"`
	Input                string  `json:"input"`
	TransactionIndex     *string `json:"transactionIndex"`
}

// TrackTx returns the full lifecycle data for a transaction (or "latest").
func TrackTx(hash string) (map[string]any, error) {
	if hash == "" {
		return nil, nil
	}
	if strings.EqualFold(hash, "latest") {
		rawBlockNum, err := eth.Call("eth_blockNumber", []any{})
		if err != nil || string(rawBlockNum) == "null" {
			return nil, err
		}
		var blockNumStr string
		if json.Unmarshal(rawBlockNum, &blockNumStr) != nil {
			return nil, nil
		}
		rawBlock, err := eth.Call("eth_getBlockByNumber", []any{blockNumStr, true})
		if err != nil || string(rawBlock) == "null" {
			return nil, err
		}
		var blk struct {
			Transactions []struct {
				Hash  string  `json:"hash"`
				To    *string `json:"to"`
				Value string  `json:"value"`
				Input string  `json:"input"`
			} `json:"transactions"`
		}
		if json.Unmarshal(rawBlock, &blk) != nil || len(blk.Transactions) == 0 {
			return nil, nil
		}
		hash = ""
		for _, tx := range blk.Transactions {
			decoded := DecodeTransactionInput(tx.Input, tx.To, tx.Value, nil)
			if decoded != nil && decoded.ActionType != "" && decoded.ActionType != "contract_call" {
				hash = tx.Hash
				break
			}
			if decoded == nil || decoded.ActionType == "" || decoded.ActionType == "contract_call" {
				rawReceipt, err := eth.Call("eth_getTransactionReceipt", []any{tx.Hash})
				if err == nil && string(rawReceipt) != "null" {
					decodedWithReceipt := DecodeTransactionInput(tx.Input, tx.To, tx.Value, rawReceipt)
					if decodedWithReceipt != nil && decodedWithReceipt.ActionType != "" && decodedWithReceipt.ActionType != "contract_call" {
						hash = tx.Hash
						break
					}
				}
			}
		}
		if hash == "" {
			hash = blk.Transactions[0].Hash
		}
	}

	rawTx, err := eth.Call("eth_getTransactionByHash", []any{hash})
	if err != nil || string(rawTx) == "null" {
		return nil, err
	}
	var t trackTx
	if json.Unmarshal(rawTx, &t) != nil {
		return nil, nil
	}
	pending := t.BlockNumber == nil
	economics := map[string]any{"value": t.Value, "gas_limit": t.Gas}
	if t.GasPrice != nil {
		economics["gas_price"] = *t.GasPrice
	}
	if t.MaxFeePerGas != nil {
		economics["max_fee_per_gas"] = *t.MaxFeePerGas
	}
	if t.MaxPriorityFeePerGas != nil {
		economics["max_priority_fee_per_gas"] = *t.MaxPriorityFeePerGas
	}
	resp := map[string]any{
		"hash": t.Hash, "from": t.From, "to": t.To, "input": t.Input,
		"economics": economics, "status": map[string]any{"pending": pending},
		"pbs_relay": nil, "beacon": nil, "decoded": nil,
	}
	var rawReceipt json.RawMessage
	if !pending {
		receiptData, err := eth.Call("eth_getTransactionReceipt", []any{t.Hash})
		if err == nil && string(receiptData) != "null" {
			rawReceipt = receiptData
			var receipt struct {
				Status            string `json:"status"`
				GasUsed           string `json:"gasUsed"`
				EffectiveGasPrice string `json:"effectiveGasPrice"`
			}
			if json.Unmarshal(rawReceipt, &receipt) == nil {
				economics["gas_used"] = receipt.GasUsed
				economics["effective_gas_price"] = receipt.EffectiveGasPrice
				resp["status"] = map[string]any{"pending": false, "success": receipt.Status == "0x1"}
			}
		}
	}
	if decoded := DecodeTransactionInput(t.Input, t.To, t.Value, rawReceipt); decoded != nil {
		resp["decoded"] = decoded
	}
	if !pending && t.BlockNumber != nil {
		inclusion := map[string]any{"block_number": *t.BlockNumber}
		if t.TransactionIndex != nil {
			inclusion["transaction_index"] = *t.TransactionIndex
		}
		rawBlock, err := eth.Call("eth_getBlockByNumber", []any{*t.BlockNumber, true})
		if err == nil && string(rawBlock) != "null" {
			var b struct {
				Hash         string           `json:"hash"`
				Timestamp    string           `json:"timestamp"`
				Miner        string           `json:"miner"`
				GasUsed      string           `json:"gasUsed"`
				GasLimit     string           `json:"gasLimit"`
				Transactions []map[string]any `json:"transactions"`
			}
			if json.Unmarshal(rawBlock, &b) == nil {
				inclusion["block_hash"] = b.Hash
				inclusion["timestamp"] = b.Timestamp
				inclusion["miner"] = b.Miner
				inclusion["block_gas_used"] = b.GasUsed
				inclusion["block_gas_limit"] = b.GasLimit
				inclusion["total_transactions"] = len(b.Transactions)
				if t.TransactionIndex != nil {
					txIdx, _ := config.ParseHexUint64(*t.TransactionIndex)
					start := int(txIdx) - 2
					if start < 0 {
						start = 0
					}
					end := int(txIdx) + 3
					if end > len(b.Transactions) {
						end = len(b.Transactions)
					}
					neighbors := []map[string]any{}
					for i := start; i < end; i++ {
						tx := b.Transactions[i]
						neighbors = append(neighbors, map[string]any{"index": i, "hash": tx["hash"], "from": tx["from"], "to": tx["to"], "value": tx["value"]})
					}
					inclusion["neighboring_transactions"] = neighbors
				}
				if n, err := config.ParseHexUint64(*t.BlockNumber); err == nil {
					// Query relay directly by block number for accurate lookup
					blockNumStr := strconv.FormatUint(n, 10)
					rawRel, relErr := relay.Get("/relay/v1/data/bidtraces/proposer_payload_delivered?block_number=" + blockNumStr)
					if relErr == nil {
						var entries []map[string]any
						if json.Unmarshal(rawRel, &entries) == nil && len(entries) > 0 {
							entry := entries[0]
							resp["pbs_relay"] = map[string]any{
								"builder_pubkey": entry["builder_pubkey"], "proposer_pubkey": entry["proposer_pubkey"],
								"value": entry["value"], "relay": entry["relay"],
							}
						}
					}
					rawGenesis, _, err := beacon.Get("/eth/v1/beacon/genesis")
					if err == nil {
						var genesis struct {
							Data struct {
								GenesisTime string `json:"genesis_time"`
							} `json:"data"`
						}
						if json.Unmarshal(rawGenesis, &genesis) == nil {
							tsHex := strings.TrimPrefix(b.Timestamp, "0x")
							blockTs, _ := strconv.ParseUint(tsHex, 16, 64)
							genesisTs, _ := strconv.ParseUint(genesis.Data.GenesisTime, 10, 64)
							var slot uint64
							if blockTs >= genesisTs {
								slot = (blockTs - genesisTs) / 12
							}
							rawFinality, _, err := beacon.Get("/eth/v1/beacon/states/finalized/finality_checkpoints")
							if err == nil {
								var final struct {
									Data struct {
										Finalized struct {
											Epoch string `json:"epoch"`
										} `json:"finalized"`
									} `json:"data"`
								}
								if json.Unmarshal(rawFinality, &final) == nil {
									epoch, _ := strconv.ParseUint(final.Data.Finalized.Epoch, 10, 64)
									finalizedSlot := epoch*32 + 31
									resp["beacon"] = map[string]any{
										"slot": slot, "is_finalized": slot <= finalizedSlot, "finalized_epoch": epoch,
									}
								}
							}
						}
					}
				}
			}
		}
		resp["inclusion"] = inclusion
	}
	return resp, nil
}
