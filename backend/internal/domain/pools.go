// Package domain: this file provides a registry of known DEX pool addresses.
package domain

import "strings"

// PoolInfo contains metadata about a known DEX pool.
type PoolInfo struct {
	Name  string `json:"name"`  // e.g., "USDC/WETH"
	DEX   string `json:"dex"`   // e.g., "Uniswap V3"
	Fee   string `json:"fee,omitempty"` // e.g., "0.05%" for V3 pools
}

// knownPools maps pool addresses (lowercase) to their metadata.
// This covers the most active Ethereum mainnet pools.
var knownPools = map[string]PoolInfo{
	// Uniswap V3 pools (most active)
	"0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640": {Name: "USDC/WETH", DEX: "Uniswap V3", Fee: "0.05%"},
	"0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8": {Name: "USDC/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x4e68ccd3e89f51c3074ca5072bbac773960dfa36": {Name: "WETH/USDT", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x11b815efb8f581194ae79006d24e0d814b7697f6": {Name: "WETH/USDT", DEX: "Uniswap V3", Fee: "0.05%"},
	"0xcbcdf9626bc03e24f779434178a73a0b4bad62ed": {Name: "WBTC/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x4585fe77225b41b697c938b018e2ac67ac5a20c0": {Name: "WBTC/WETH", DEX: "Uniswap V3", Fee: "0.05%"},
	"0x99ac8ca7087fa4a2a1fb6357269965a2014abc35": {Name: "WBTC/USDC", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x5777d92f208679db4b9778590fa3cab3ac9e2168": {Name: "DAI/USDC", DEX: "Uniswap V3", Fee: "0.01%"},
	"0x6c6bc977e13df9b0de53b251522280bb72383700": {Name: "DAI/USDC", DEX: "Uniswap V3", Fee: "0.05%"},
	"0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8": {Name: "DAI/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x60594a405d53811d3bc4766596efd80fd545a270": {Name: "DAI/WETH", DEX: "Uniswap V3", Fee: "0.05%"},
	"0xa3f558aebaecaf0e11ca4b2199cc5ed341edfd74": {Name: "LDO/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801": {Name: "UNI/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0xac4b3dacb91461209ae9d41ec517c2b9cb1b7daf": {Name: "APE/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0xe15e6583425700993bd08f51bf6e7b73cd5da91b": {Name: "PEPE/WETH", DEX: "Uniswap V3", Fee: "1%"},
	"0x11950d141ecb863f01007add7d1a342041227b58": {Name: "PEPE/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa": {Name: "wstETH/WETH", DEX: "Uniswap V3", Fee: "0.01%"},
	"0x2e4784446a0a5ed0b69ec2c0e58b5e2916a5c5eb": {Name: "cbETH/WETH", DEX: "Uniswap V3", Fee: "0.05%"},
	"0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8": {Name: "LINK/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x290a6a7460b308ee3f19023d2d00de604bcf5b42": {Name: "MATIC/WETH", DEX: "Uniswap V3", Fee: "0.3%"},
	"0x7bea39867e4169dbe237d55c8242a8f2fcdcc387": {Name: "USDC/USDT", DEX: "Uniswap V3", Fee: "0.01%"},
	"0x3416cf6c708da44db2624d63ea0aaef7113527c6": {Name: "USDC/USDT", DEX: "Uniswap V3", Fee: "0.05%"},
	"0xea4ba4ce14fdd287f380b55419b1c5b6c3f22ab6": {Name: "rETH/WETH", DEX: "Uniswap V3", Fee: "0.05%"},
	"0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec": {Name: "sfrxETH/WETH", DEX: "Uniswap V3", Fee: "0.05%"},

	// Uniswap V2 pools
	"0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc": {Name: "USDC/WETH", DEX: "Uniswap V2"},
	"0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852": {Name: "WETH/USDT", DEX: "Uniswap V2"},
	"0xbb2b8038a1640196fbe3e38816f3e67cba72d940": {Name: "WBTC/WETH", DEX: "Uniswap V2"},
	"0xa478c2975ab1ea89e8196811f51a7b7ade33eb11": {Name: "DAI/WETH", DEX: "Uniswap V2"},
	"0xd3d2e2692501a5c9ca623199d38826e513033a17": {Name: "UNI/WETH", DEX: "Uniswap V2"},
	"0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974": {Name: "LINK/WETH", DEX: "Uniswap V2"},
	"0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5": {Name: "DAI/USDC", DEX: "Uniswap V2"},
	"0x0d0d65e7a7db277d3e0f5e1676325e75f3340455": {Name: "wstETH/WETH", DEX: "Uniswap V2"},

	// Sushiswap V2 pools
	"0x397ff1542f962076d0bfe58ea045ffa2d347aca0": {Name: "USDC/WETH", DEX: "SushiSwap"},
	"0xceff51756c56ceffca006cd410b03ffc46dd3a58": {Name: "WBTC/WETH", DEX: "SushiSwap"},
	"0x06da0fd433c1a5d7a4faa01111c044910a184553": {Name: "USDT/WETH", DEX: "SushiSwap"},
	"0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f": {Name: "DAI/WETH", DEX: "SushiSwap"},
	"0xc40d16476380e4037e6b1a2594caf6a6cc8da967": {Name: "LINK/WETH", DEX: "SushiSwap"},
	"0xdafd66636e2561b0284edde37e42d192f2844d40": {Name: "UNI/WETH", DEX: "SushiSwap"},
	"0x795065dcc9f64b5614c407a6efdc400da6221fb0": {Name: "SUSHI/WETH", DEX: "SushiSwap"},

	// Curve pools (major stablecoin pools)
	"0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7": {Name: "3pool (DAI/USDC/USDT)", DEX: "Curve"},
	"0xdc24316b9ae028f1497c275eb9192a3ea0f67022": {Name: "stETH/ETH", DEX: "Curve"},
	"0x4dece678ceceb27446b35c672dc7d61f30bad69e": {Name: "crvUSD/USDC", DEX: "Curve"},
	"0x4ebdf703948ddcea3b11f675b4d1fba9d2414a14": {Name: "TriCRV", DEX: "Curve"},

	// Balancer pools
	"0x5c6ee304399dbdb9c8ef030ab642b10820db8f56": {Name: "B-80BAL-20WETH", DEX: "Balancer"},
	"0x32296969ef14eb0c6d29669c550d4a0449130230": {Name: "wstETH/WETH", DEX: "Balancer"},
}

// LookupPool returns pool info if known, or nil if not found.
func LookupPool(address string) *PoolInfo {
	address = strings.ToLower(address)
	if info, ok := knownPools[address]; ok {
		return &info
	}
	return nil
}

// GetPoolName returns a human-readable name for a pool, or shortened address if unknown.
func GetPoolName(address string) string {
	if info := LookupPool(address); info != nil {
		if info.Fee != "" {
			return info.Name + " (" + info.DEX + " " + info.Fee + ")"
		}
		return info.Name + " (" + info.DEX + ")"
	}
	// Return shortened address
	address = strings.ToLower(address)
	if len(address) > 10 {
		return address[:6] + "..." + address[len(address)-4:]
	}
	return address
}
