/*
 * MEVView.tsx
 * Detects and displays MEV activity in Ethereum blocks.
 * Shows sandwiches, arbitrage, liquidations, and JIT liquidity.
 * Real MEV happening on mainnet right now - educational for understanding MEV impact.
 */
import React from 'react';
import { hexToNumber, formatNumber, shortenHash } from '../utils/format';

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

  // Count unique victims and attackers for sandwiches
  const uniqueVictims = new Set(sandwiches.map(s => s.victim).filter(Boolean)).size;
  const uniqueAttackers = new Set(sandwiches.map(s => s.attacker).filter(Boolean)).size;
  const uniquePools = new Set(sandwiches.map(s => s.pool).filter(Boolean)).size;

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
                    <div className="text-white/60 text-xs">Pool: <span className="font-mono text-blue-400">{shortenHash(sandwich.pool)}</span></div>
                  </div>
                </div>

                {/* Transaction Flow */}
                <div className="space-y-2 bg-black/40 rounded-lg p-3 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 text-red-400 text-xs font-medium">1. Front-run</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.preTx}</div>
                      <div className="text-white/60 text-xs mt-1">
                        Attacker: <span className="text-red-400 font-mono">{shortenHash(sandwich.attacker)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-20">
                    <div className="text-orange-400">↓</div>
                    <div className="text-white/50 text-xs">Victim sandwiched</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 text-yellow-400 text-xs font-medium">2. Victim</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.victimTx}</div>
                      <div className="text-white/60 text-xs mt-1">
                        Victim: <span className="text-yellow-400 font-mono">{shortenHash(sandwich.victim)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-20">
                    <div className="text-orange-400">↓</div>
                    <div className="text-white/50 text-xs">Profit captured</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 text-red-400 text-xs font-medium">3. Back-run</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 font-mono text-xs break-all">{sandwich.postTx}</div>
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
            {arbitrages.map((arb, idx) => (
              <div key={idx} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium mb-1">Arb #{idx + 1}</div>
                    <div className="text-white/60 text-xs">
                      Searcher: <span className="font-mono text-purple-400">{shortenHash(arb.searcher)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/60 text-xs">{arb.swapCount} swaps</div>
                    <div className="text-white/60 text-xs">{arb.pools?.length || 0} pools</div>
                  </div>
                </div>
                <div className="text-white/90 font-mono text-xs break-all bg-black/40 p-2 rounded">
                  {arb.txHash}
                </div>
                {arb.pools && arb.pools.length > 0 && (
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
            ))}
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
