// Package domain: this file decodes swap event data from Uniswap V2/V3 logs.
package domain

import (
	"math/big"
	"strings"
)

// DecodeSwapV2 extracts token amounts from a Uniswap V2 Swap event data field.
// V2 Swap event: Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)
// Data layout: amount0In (32 bytes) | amount1In (32 bytes) | amount0Out (32 bytes) | amount1Out (32 bytes)
func DecodeSwapV2(data string) *SwapAmounts {
	data = strings.TrimPrefix(data, "0x")
	if len(data) < 256 { // 4 * 64 hex chars = 256
		return nil
	}
	return &SwapAmounts{
		Token0In:  "0x" + trimLeadingZeros(data[0:64]),
		Token1In:  "0x" + trimLeadingZeros(data[64:128]),
		Token0Out: "0x" + trimLeadingZeros(data[128:192]),
		Token1Out: "0x" + trimLeadingZeros(data[192:256]),
	}
}

// DecodeSwapV3 extracts token amounts from a Uniswap V3 Swap event data field.
// V3 Swap event: Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
// Data layout: amount0 (32 bytes) | amount1 (32 bytes) | sqrtPriceX96 (32 bytes) | liquidity (32 bytes) | tick (32 bytes)
// For V3: positive amount = tokens going into pool (in), negative = tokens coming out (out)
func DecodeSwapV3(data string) *SwapAmounts {
	data = strings.TrimPrefix(data, "0x")
	if len(data) < 128 { // At least amount0 + amount1 = 2 * 64 hex chars
		return nil
	}

	// Parse amount0 and amount1 as signed int256
	amount0 := parseSignedInt256(data[0:64])
	amount1 := parseSignedInt256(data[64:128])

	result := &SwapAmounts{}

	// Positive = into pool (in), negative = out of pool (out)
	if amount0 != nil {
		if amount0.Sign() >= 0 {
			result.Token0In = "0x" + amount0.Text(16)
		} else {
			// Negate to get positive out amount
			result.Token0Out = "0x" + new(big.Int).Neg(amount0).Text(16)
		}
	}
	if amount1 != nil {
		if amount1.Sign() >= 0 {
			result.Token1In = "0x" + amount1.Text(16)
		} else {
			result.Token1Out = "0x" + new(big.Int).Neg(amount1).Text(16)
		}
	}

	return result
}

// parseSignedInt256 parses a 64-char hex string as a signed int256.
func parseSignedInt256(hexStr string) *big.Int {
	if len(hexStr) != 64 {
		return nil
	}

	// Parse as unsigned first
	n := new(big.Int)
	n.SetString(hexStr, 16)

	// Check if negative (high bit set)
	// int256 max positive = 2^255 - 1
	maxPositive := new(big.Int).Lsh(big.NewInt(1), 255)
	maxPositive.Sub(maxPositive, big.NewInt(1))

	if n.Cmp(maxPositive) > 0 {
		// It's negative, convert from two's complement
		// value = n - 2^256
		modulus := new(big.Int).Lsh(big.NewInt(1), 256)
		n.Sub(n, modulus)
	}

	return n
}

// trimLeadingZeros removes leading zeros from hex string but keeps at least one digit.
func trimLeadingZeros(s string) string {
	s = strings.TrimLeft(s, "0")
	if s == "" {
		return "0"
	}
	return s
}

// DecodeSwap attempts to decode swap data, trying V2 format first then V3.
// Topic is used to determine which decoder to use.
func DecodeSwap(data, topic string) *SwapAmounts {
	topic = strings.ToLower(topic)
	data = strings.TrimPrefix(data, "0x")

	// V2 has 256 hex chars (128 bytes), V3 has 320 hex chars (160 bytes)
	// But we can also check by topic
	if topic == swapTopicV2 {
		return DecodeSwapV2("0x" + data)
	}
	if topic == swapTopicV3 {
		return DecodeSwapV3("0x" + data)
	}

	// Fallback: try to detect by data length
	if len(data) >= 320 {
		// Likely V3 (has extra sqrtPriceX96, liquidity, tick)
		return DecodeSwapV3("0x" + data)
	}
	if len(data) >= 256 {
		// Likely V2
		return DecodeSwapV2("0x" + data)
	}

	return nil
}

// DecodeLiquidationAave extracts data from Aave LiquidationCall event.
// LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)
// Data layout: debtToCover (32 bytes) | liquidatedCollateralAmount (32 bytes) | liquidator (32 bytes) | receiveAToken (32 bytes)
func DecodeLiquidationAave(data string, topics []string) *LiquidationAmounts {
	data = strings.TrimPrefix(data, "0x")
	if len(data) < 128 { // At least debtToCover + liquidatedCollateralAmount
		return nil
	}

	result := &LiquidationAmounts{
		DebtToCover:      "0x" + trimLeadingZeros(data[0:64]),
		CollateralSeized: "0x" + trimLeadingZeros(data[64:128]),
	}

	// Extract indexed parameters from topics
	if len(topics) > 1 {
		result.CollateralAsset = "0x" + strings.TrimPrefix(topics[1], "0x")[24:] // Last 20 bytes of 32-byte topic
	}
	if len(topics) > 2 {
		result.DebtAsset = "0x" + strings.TrimPrefix(topics[2], "0x")[24:]
	}
	if len(topics) > 3 {
		result.Borrower = "0x" + strings.TrimPrefix(topics[3], "0x")[24:]
	}

	return result
}

// LiquidationAmounts holds decoded data from a liquidation event.
type LiquidationAmounts struct {
	CollateralAsset  string `json:"collateralAsset,omitempty"`
	DebtAsset        string `json:"debtAsset,omitempty"`
	Borrower         string `json:"borrower,omitempty"`
	DebtToCover      string `json:"debtToCover,omitempty"`
	CollateralSeized string `json:"collateralSeized,omitempty"`
}
