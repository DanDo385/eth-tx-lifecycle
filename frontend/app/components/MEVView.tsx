/*
 * MEVView.tsx
 * Detects and displays MEV activity in Ethereum blocks.
 * Shows sandwiches, arbitrage, liquidations, and JIT liquidity.
 * Real MEV happening on mainnet right now - educational for understanding MEV impact.
 */
import React from 'react';
import { hexToNumber, formatNumber, shortenHash, formatTokenAmount, formatGasUsed } from '../utils/format';

// Helper to parse hex amount to BigInt
function hexToBigInt(hex: string | undefined | null): bigint {
  if (!hex || hex === '0x0' || hex === '0x' || hex === '0') return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

// Helper to format BigInt as token amount with decimals
function formatBigIntAmount(amount: bigint, decimals = 18): string {
  if (amount === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const significantDecimals = remainderStr.replace(/0+$/, '').slice(0, 6);
  if (significantDecimals) {
    return `${whole.toLocaleString('en-US')}.${significantDecimals}`;
  }
  return whole.toLocaleString('en-US');
}

// Estimate arbitrage profit by analyzing token flows across hops.
// Returns { amount, token, isEstimate, grossWei? } where token is 'ETH', 'wETH', 'USDC', 'USDT', 'wBTC', or 'tokens'.
// grossWei is set when token is ETH/wETH so the UI can compute net PnL (gross - gas).
function estimateArbProfit(hops: any[], poolNames: string[]): {
  amount: string;
  token: string;
  isEstimate: boolean;
  grossWei?: string;
} | null {
  if (!hops || hops.length < 2) return null;

  const hasWethPool = poolNames.some(name => name?.toLowerCase().includes('weth'));
  const hasEthPool = hasWethPool || poolNames.some(name => name?.toLowerCase().includes('/eth'));
  const hasUsdcPool = poolNames.some(name => name?.toLowerCase().includes('usdc'));
  const hasUsdtPool = poolNames.some(name => name?.toLowerCase().includes('usdt'));
  const hasWbtcPool = poolNames.some(name => name?.toLowerCase().includes('wbtc') || name?.toLowerCase().includes('btc'));

  // Sum all inflows and outflows across hops
  let totalToken0In = 0n;
  let totalToken0Out = 0n;
  let totalToken1In = 0n;
  let totalToken1Out = 0n;

  for (const hop of hops) {
    if (hop.amounts) {
      totalToken0In += hexToBigInt(hop.amounts.token0In);
      totalToken0Out += hexToBigInt(hop.amounts.token0Out);
      totalToken1In += hexToBigInt(hop.amounts.token1In);
      totalToken1Out += hexToBigInt(hop.amounts.token1Out);
    }
  }

  // For a circular arb, one token should have net positive flow (profit)
  // Net = In - Out (positive means we received more than we spent)
  const netToken0 = totalToken0In - totalToken0Out;
  const netToken1 = totalToken1In - totalToken1Out;

  // Determine which token is likely the profit token
  // ETH/WETH pools: WETH is usually token1 in Uniswap pairs (sorted by address)
  // Stablecoin pools: USDC/USDT are usually token0

  let profitAmount: bigint;
  let tokenName: string;
  let decimals: number;

  if (hasEthPool) {
    // ETH/WETH arbs: profit in ETH (18 decimals)
    if (netToken1 > 0n) {
      profitAmount = netToken1;
      tokenName = hasWethPool ? 'wETH' : 'ETH';
      decimals = 18;
    } else if (netToken0 > 0n) {
      profitAmount = netToken0;
      tokenName = hasWethPool ? 'wETH' : 'ETH';
      decimals = 18;
    } else {
      profitAmount = netToken1 > netToken0 ? netToken1 : netToken0;
      if (profitAmount < 0n) profitAmount = -profitAmount;
      tokenName = hasWethPool ? 'wETH' : 'ETH';
      decimals = 18;
    }
  } else if (hasUsdcPool) {
    profitAmount = netToken0 > 0n ? netToken0 : netToken1;
    if (profitAmount < 0n) profitAmount = -profitAmount;
    tokenName = 'USDC';
    decimals = 6;
  } else if (hasUsdtPool) {
    profitAmount = netToken0 > 0n ? netToken0 : netToken1;
    if (profitAmount < 0n) profitAmount = -profitAmount;
    tokenName = 'USDT';
    decimals = 6;
  } else if (hasWbtcPool) {
    profitAmount = netToken0 > 0n ? netToken0 : netToken1;
    if (profitAmount < 0n) profitAmount = -profitAmount;
    tokenName = 'wBTC';
    decimals = 8;
  } else {
    profitAmount = netToken0 > netToken1 ? netToken0 : netToken1;
    if (profitAmount < 0n) profitAmount = -profitAmount;
    tokenName = 'tokens';
    decimals = 18;
  }

  if (profitAmount === 0n) return null;

  const result: { amount: string; token: string; isEstimate: boolean; grossWei?: string } = {
    amount: formatBigIntAmount(profitAmount, decimals),
    token: tokenName,
    isEstimate: true
  };
  // Expose raw wei for ETH/wETH so UI can compute net PnL (gross - gas)
  if (tokenName === 'ETH' || tokenName === 'wETH') {
    result.grossWei = profitAmount.toString();
  }
  return result;
}

// Calculate gas cost in ETH (using ~30 gwei as typical gas price). Returns formatted string and raw wei.
function estimateGasCostEth(gasUsed: string | undefined): { formatted: string; wei: string } | null {
  if (!gasUsed) return null;
  try {
    const gas = BigInt(gasUsed);
    const gasPriceWei = 30n * 1000000000n; // 30 gwei
    const costWei = gas * gasPriceWei;
    return { formatted: formatBigIntAmount(costWei, 18), wei: costWei.toString() };
  } catch {
    return null;
  }
}

// Compute net PnL in ETH when gross is in ETH/wETH: netWei = grossWei - gasWei.
function netPnlEth(grossWei: string, gasWei: string): string | null {
  try {
    const g = BigInt(grossWei);
    const c = BigInt(gasWei);
    if (g <= c) return '0';
    return formatBigIntAmount(g - c, 18);
  } catch {
    return null;
  }
}

interface MEVViewProps {
  data: {
    sandwiches?: any[];
    arbitrages?: any[];
    liquidations?: any[];
    jitLiquidity?: any[];
    sandwichCount?: number;
    arbitrageCount?: number;
    liquidationCount?: number;
    jitCount?: number;
    swapCount?: number;
    block?: string;
    totalTx?: number;
    txScanned?: number;
  };
}

export default function MEVView({ data }: MEVViewProps) {
  if (!data) {
    return <p className="text-white/60">No MEV detection data available</p>;
  }

  const sandwiches = data.sandwiches || [];
  const arbitrages = data.arbitrages || [];
  const liquidations = data.liquidations || [];
  const jitLiquidity = data.jitLiquidity || [];
  const swapCount = data.swapCount || 0;
  const blockNum = data.block ? hexToNumber(data.block) : 0;
  const totalTxs = data.totalTx || 0;
  const scannedTxs = data.txScanned || 0;

  // Count unique victims for sandwiches
  const uniqueVictims = new Set(sandwiches.map(s => s.victim).filter(Boolean)).size;

  const hasSandwiches = sandwiches.length > 0;
  const hasArbitrage = arbitrages.length > 0;
  const hasLiquidations = liquidations.length > 0;
  const hasJIT = jitLiquidity.length > 0;
  const hasMEV = hasSandwiches || hasArbitrage || hasLiquidations || hasJIT;

  return (
    <div className="space-y-4">
      {/* Block Info */}
      <div className="bg-gradient-to-br from-orange-500/10 to-red-600/5 border border-orange-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-orange-400 text-xs font-medium mb-1">Scanning Block</div>
            <div className="text-white text-2xl font-bold">{blockNum > 0 ? formatNumber(blockNum) : data.block || 'Latest'}</div>
          </div>
          <div className="text-right">
            <div className="text-white/60 text-xs">Transactions Scanned</div>
            <div className="text-white text-lg font-bold">{scannedTxs} / {totalTxs}</div>
            <div className="text-white/50 text-xs">{swapCount} swaps detected</div>
          </div>
        </div>
      </div>

      {/* MEV Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`border rounded-lg p-4 ${
          hasSandwiches
            ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20'
            : 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20'
        }`}>
          <div className={`text-xs font-medium mb-1 ${hasSandwiches ? 'text-red-400' : 'text-green-400'}`}>
            🥪 Sandwiches
          </div>
          <div className="text-white text-2xl font-bold">{sandwiches.length}</div>
          <div className="text-white/60 text-xs mt-1">
            {hasSandwiches ? `${uniqueVictims} victim${uniqueVictims !== 1 ? 's' : ''}` : 'None detected'}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          hasArbitrage
            ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20'
            : 'bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20'
        }`}>
          <div className={`text-xs font-medium mb-1 ${hasArbitrage ? 'text-purple-400' : 'text-gray-400'}`}>
            🔄 Arbitrage
          </div>
          <div className="text-white text-2xl font-bold">{arbitrages.length}</div>
          <div className="text-white/60 text-xs mt-1">
            {hasArbitrage ? 'multi-pool swaps' : 'None detected'}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          hasLiquidations
            ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20'
            : 'bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20'
        }`}>
          <div className={`text-xs font-medium mb-1 ${hasLiquidations ? 'text-yellow-400' : 'text-gray-400'}`}>
            ⚡ Liquidations
          </div>
          <div className="text-white text-2xl font-bold">{liquidations.length}</div>
          <div className="text-white/60 text-xs mt-1">
            {hasLiquidations ? 'Aave/Compound' : 'None detected'}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          hasJIT
            ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20'
            : 'bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20'
        }`}>
          <div className={`text-xs font-medium mb-1 ${hasJIT ? 'text-blue-400' : 'text-gray-400'}`}>
            💧 JIT Liquidity
          </div>
          <div className="text-white text-2xl font-bold">{jitLiquidity.length}</div>
          <div className="text-white/60 text-xs mt-1">
            {hasJIT ? 'mint→swap→burn' : 'None detected'}
          </div>
        </div>
      </div>

      {/* Educational Info */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-sm space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-orange-400 text-lg">💡</span>
          <div className="text-white/80 space-y-2">
            <div>
              <strong className="text-white">MEV (Maximal Extractable Value):</strong> Profit searchers extract by reordering, inserting, or censoring transactions:
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs ml-4">
              <li><strong>🥪 Sandwich:</strong> Front-run + back-run a victim trade to profit from price movement</li>
              <li><strong>🔄 Arbitrage:</strong> Atomic swaps across multiple pools to capture price differences</li>
              <li><strong>⚡ Liquidations:</strong> Repay undercollateralized loans on Aave/Compound for a bonus</li>
              <li><strong>💧 JIT Liquidity:</strong> Add liquidity just before a large swap, remove after collecting fees</li>
            </ul>
            <div className="text-orange-400 text-xs bg-orange-400/10 border border-orange-400/20 rounded p-2 mt-2">
              ⚡ <strong>MEV Reality:</strong> {hasMEV
                ? `Found ${sandwiches.length + arbitrages.length + liquidations.length + jitLiquidity.length} MEV event${sandwiches.length + arbitrages.length + liquidations.length + jitLiquidity.length !== 1 ? 's' : ''} in this block. This is real value extraction happening on Ethereum.`
                : 'This block appears clean! But most blocks contain some form of MEV activity.'}
            </div>
          </div>
        </div>
      </div>

      {/* Sandwich Details */}
      {hasSandwiches && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-red-500/10 border-b border-white/10 p-3">
            <h4 className="text-red-400 font-semibold">🥪 Sandwich Attacks ({sandwiches.length})</h4>
          </div>
          <div className="divide-y divide-white/5">
            {sandwiches.map((sandwich, idx) => (
              <div key={idx} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium mb-1">Sandwich #{idx + 1}</div>
                    <div className="text-white/60 text-xs">
                      Pool: <span className="text-blue-400">{sandwich.poolName || shortenHash(sandwich.pool)}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/50">
                    <div>Tx positions: {sandwich.preTxIndex} → {sandwich.victimTxIndex} → {sandwich.postTxIndex}</div>
                  </div>
                </div>

                {/* Transaction Flow */}
                <div className="space-y-3 bg-black/40 rounded-lg p-3 border border-white/10">
                  {/* Front-run */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 text-red-400 text-xs font-medium">1. Front-run</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.preTx}</div>
                      <div className="text-white/60 text-xs mt-1">
                        Attacker: <span className="text-red-400 font-mono">{shortenHash(sandwich.attacker)}</span>
                      </div>
                      {sandwich.preSwap && (
                        <div className="mt-1 text-xs flex flex-wrap gap-2">
                          {sandwich.preSwap.token0In && sandwich.preSwap.token0In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.preSwap.token0In)} in</span>
                          )}
                          {sandwich.preSwap.token0Out && sandwich.preSwap.token0Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.preSwap.token0Out)} out</span>
                          )}
                          {sandwich.preSwap.token1In && sandwich.preSwap.token1In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.preSwap.token1In)} in</span>
                          )}
                          {sandwich.preSwap.token1Out && sandwich.preSwap.token1Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.preSwap.token1Out)} out</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-20">
                    <div className="text-orange-400">↓</div>
                    <div className="text-white/50 text-xs">Price moved against victim</div>
                  </div>

                  {/* Victim */}
                  <div className="flex items-start gap-3 bg-yellow-500/5 -mx-3 px-3 py-2 border-l-2 border-yellow-400">
                    <div className="flex-shrink-0 w-20 text-yellow-400 text-xs font-medium">2. Victim</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.victimTx}</div>
                      <div className="text-white/60 text-xs mt-1">
                        Victim: <span className="text-yellow-400 font-mono">{shortenHash(sandwich.victim)}</span>
                      </div>
                      {sandwich.victimSwap && (
                        <div className="mt-1 text-xs flex flex-wrap gap-2">
                          {sandwich.victimSwap.token0In && sandwich.victimSwap.token0In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.victimSwap.token0In)} in</span>
                          )}
                          {sandwich.victimSwap.token0Out && sandwich.victimSwap.token0Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.victimSwap.token0Out)} out</span>
                          )}
                          {sandwich.victimSwap.token1In && sandwich.victimSwap.token1In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.victimSwap.token1In)} in</span>
                          )}
                          {sandwich.victimSwap.token1Out && sandwich.victimSwap.token1Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.victimSwap.token1Out)} out</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-20">
                    <div className="text-orange-400">↓</div>
                    <div className="text-white/50 text-xs">Attacker captures profit</div>
                  </div>

                  {/* Back-run */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 text-red-400 text-xs font-medium">3. Back-run</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.postTx}</div>
                      {sandwich.postSwap && (
                        <div className="mt-1 text-xs flex flex-wrap gap-2">
                          {sandwich.postSwap.token0In && sandwich.postSwap.token0In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.postSwap.token0In)} in</span>
                          )}
                          {sandwich.postSwap.token0Out && sandwich.postSwap.token0Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.postSwap.token0Out)} out</span>
                          )}
                          {sandwich.postSwap.token1In && sandwich.postSwap.token1In !== '0x0' && (
                            <span className="text-green-400">+{formatTokenAmount(sandwich.postSwap.token1In)} in</span>
                          )}
                          {sandwich.postSwap.token1Out && sandwich.postSwap.token1Out !== '0x0' && (
                            <span className="text-red-400">-{formatTokenAmount(sandwich.postSwap.token1Out)} out</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arbitrage Details */}
      {hasArbitrage && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-purple-500/10 border-b border-white/10 p-3">
            <h4 className="text-purple-400 font-semibold">🔄 Arbitrage Transactions ({arbitrages.length})</h4>
          </div>
          <div className="divide-y divide-white/5">
            {arbitrages.map((arb, idx) => {
              // Calculate profit estimate and gas cost
              const poolNames = arb.hops?.map((h: any) => h.poolName) || [];
              const profitEstimate = estimateArbProfit(arb.hops, poolNames);
              const gasCost = estimateGasCostEth(arb.gasUsed);
              const isEthProfit = profitEstimate && (profitEstimate.token === 'ETH' || profitEstimate.token === 'wETH');
              const netEth = isEthProfit && profitEstimate.grossWei && gasCost
                ? netPnlEth(profitEstimate.grossWei, gasCost.wei)
                : null;

              return (
              <div key={idx} className="p-4 hover:bg-white/5">
                {/* Header with summary */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium mb-1 flex items-center gap-2">
                      Arb #{idx + 1}
                      {arb.status === '0x1' && (
                        <span className="text-green-400 text-xs bg-green-400/10 px-1.5 py-0.5 rounded">✓ Success</span>
                      )}
                      {arb.status === '0x0' && (
                        <span className="text-red-400 text-xs bg-red-400/10 px-1.5 py-0.5 rounded">✗ Reverted</span>
                      )}
                    </div>
                    <div className="text-white/60 text-xs">
                      Searcher: <span className="font-mono text-purple-400">{shortenHash(arb.searcher)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/60 text-xs">{arb.swapCount} swaps across {arb.pools?.length || 0} pools</div>
                    {arb.gasUsed && (
                      <div className="text-white/50 text-xs">Gas: {formatGasUsed(arb.gasUsed)}</div>
                    )}
                    {arb.txIndex !== undefined && (
                      <div className="text-white/50 text-xs">Tx #{arb.txIndex}</div>
                    )}
                  </div>
                </div>

                {/* Profit Summary Box: Gross (in token), Gas (ETH), Net PnL. Token label shown explicitly. */}
                {(profitEstimate || gasCost) && (
                  <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                    <div className="flex flex-wrap items-center gap-4">
                      {profitEstimate && (
                        <div>
                          <div className="text-white/50 text-xs">Gross PnL (in {profitEstimate.token})</div>
                          <div className="text-green-400 font-bold text-lg">
                            ~{profitEstimate.amount} {profitEstimate.token}
                          </div>
                        </div>
                      )}
                      {gasCost && (
                        <div>
                          <div className="text-white/50 text-xs">Gas Cost (@30 gwei)</div>
                          <div className="text-orange-400 font-medium">
                            ~{gasCost.formatted} ETH
                          </div>
                        </div>
                      )}
                      {netEth !== null && (
                        <div>
                          <div className="text-white/50 text-xs">Net PnL (gross − gas)</div>
                          <div className="text-cyan-400 font-bold text-lg">
                            ~{netEth} ETH
                          </div>
                        </div>
                      )}
                      {profitEstimate && !isEthProfit && gasCost && (
                        <div>
                          <div className="text-white/50 text-xs">Net PnL</div>
                          <div className="text-cyan-400 font-medium text-sm">
                            ≈ {profitEstimate.amount} {profitEstimate.token} <span className="text-white/50">(gas ~{gasCost.formatted} ETH not subtracted)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {profitEstimate?.isEstimate && (
                      <div className="text-white/40 text-xs mt-2">
                        ⚠️ Estimate based on token flows. Gains are in <strong>{profitEstimate.token}</strong>.
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction hash */}
                <div className="text-white/90 font-mono text-xs break-all bg-black/40 p-2 rounded mb-3">
                  {arb.txHash}
                </div>

                {/* Hop-by-hop path visualization */}
                {arb.hops && arb.hops.length > 0 && (
                  <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                    <div className="text-white/60 text-xs mb-2 font-medium">Arbitrage Path:</div>
                    <div className="space-y-2">
                      {arb.hops.map((hop: any, hopIdx: number) => (
                        <div key={hopIdx} className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-medium">
                            {hopIdx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white/90 text-xs">
                              {hop.poolName || shortenHash(hop.pool)}
                            </div>
                            {hop.amounts && (
                              <div className="text-xs mt-1 flex flex-wrap gap-2">
                                {hop.amounts.token0In && hop.amounts.token0In !== '0x0' && (
                                  <span className="text-green-400">+{formatTokenAmount(hop.amounts.token0In)} in</span>
                                )}
                                {hop.amounts.token0Out && hop.amounts.token0Out !== '0x0' && (
                                  <span className="text-red-400">-{formatTokenAmount(hop.amounts.token0Out)} out</span>
                                )}
                                {hop.amounts.token1In && hop.amounts.token1In !== '0x0' && (
                                  <span className="text-green-400">+{formatTokenAmount(hop.amounts.token1In)} in</span>
                                )}
                                {hop.amounts.token1Out && hop.amounts.token1Out !== '0x0' && (
                                  <span className="text-red-400">-{formatTokenAmount(hop.amounts.token1Out)} out</span>
                                )}
                              </div>
                            )}
                          </div>
                          {hopIdx < arb.hops.length - 1 && (
                            <div className="text-purple-400 text-lg">→</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: simple pool list if no hops */}
                {(!arb.hops || arb.hops.length === 0) && arb.pools && arb.pools.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {arb.pools.slice(0, 4).map((pool: string, i: number) => (
                      <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        {shortenHash(pool)}
                      </span>
                    ))}
                    {arb.pools.length > 4 && (
                      <span className="text-xs text-white/50">+{arb.pools.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liquidation Details */}
      {hasLiquidations && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-yellow-500/10 border-b border-white/10 p-3">
            <h4 className="text-yellow-400 font-semibold">⚡ Liquidations ({liquidations.length})</h4>
          </div>
          <div className="divide-y divide-white/5">
            {liquidations.map((liq, idx) => (
              <div key={idx} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium mb-1">Liquidation #{idx + 1}</div>
                    <div className="text-white/60 text-xs">
                      Protocol: <span className="text-yellow-400">{liq.protocol}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-white/60">
                    Liquidator: <span className="font-mono text-green-400">{shortenHash(liq.liquidator)}</span>
                  </div>
                  {liq.borrower && (
                    <div className="text-white/60">
                      Borrower: <span className="font-mono text-red-400">{shortenHash(liq.borrower)}</span>
                    </div>
                  )}
                  <div className="text-white/90 font-mono text-xs break-all bg-black/40 p-2 rounded mt-2">
                    {liq.txHash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JIT Liquidity Details */}
      {hasJIT && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-blue-500/10 border-b border-white/10 p-3">
            <h4 className="text-blue-400 font-semibold">💧 JIT Liquidity ({jitLiquidity.length})</h4>
          </div>
          <div className="divide-y divide-white/5">
            {jitLiquidity.map((jit, idx) => (
              <div key={idx} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium mb-1">JIT #{idx + 1}</div>
                    <div className="text-white/60 text-xs">
                      Pool: <span className="font-mono text-blue-400">{shortenHash(jit.pool)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 bg-black/40 rounded-lg p-3 border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 w-12">Mint:</span>
                    <span className="font-mono text-white/80 break-all">{shortenHash(jit.mintTx)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 w-12">Swap:</span>
                    <span className="font-mono text-white/80 break-all">{shortenHash(jit.swapTx)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 w-12">Burn:</span>
                    <span className="font-mono text-white/80 break-all">{shortenHash(jit.burnTx)}</span>
                  </div>
                </div>
                <div className="text-white/60 text-xs mt-2">
                  Provider: <span className="font-mono text-blue-400">{shortenHash(jit.provider)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No MEV Found */}
      {!hasMEV && (
        <div className="border border-green-500/20 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-green-400 font-medium mb-1">No MEV Activity Detected</div>
          <div className="text-white/60 text-sm">
            This block appears clean - no obvious MEV patterns found in the scanned transactions
          </div>
        </div>
      )}
    </div>
  );
}
