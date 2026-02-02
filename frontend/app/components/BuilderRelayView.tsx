/*
 * BuilderRelayView.tsx
 * Shows all the blocks that builders submitted to MEV relays for a given slot.
 * This is the competition phase - multiple builders bid for the same slot, but only one wins.
 * Helps explain why transaction counts seem inflated (same txs in multiple competing blocks).
 */
import React from 'react';
import { weiToEth, hexToNumber, formatNumber, shortenHash, getBuilderName, slotToTime, blockNumberToNumber } from '../utils/format';

interface BuilderRelayViewProps {
  data: {
    received_blocks?: any[];
    count?: number;
    latest_block?: number;
    fallback_delivered?: boolean;
  };
}

export default function BuilderRelayView({ data }: BuilderRelayViewProps) {
  if (!data || !data.received_blocks || data.received_blocks.length === 0) {
    return (
      <p className="text-white/60">
        No builder block submissions found. Some relays do not expose builder_blocks_received; try Relays → Validators for delivered payloads.
      </p>
    );
  }

  // Focus on the next block in production: only the highest slot (one slot, no mixing)
  const allBlocks = data.received_blocks;
  const isFallbackDelivered = Boolean(data.fallback_delivered);
  const allSlots = allBlocks.map(b => b.slot ? parseInt(b.slot) : 0).filter(s => s > 0).sort((a, b) => b - a);
  const nextSlot = allSlots.length > 0 ? allSlots[0] : 0;

  // Deduplicate by block_hash (or slot+builder) so we never show the same proposal twice
  const seen = new Set<string>();
  const deduped = allBlocks.filter(block => {
    const key = block.block_hash || `${block.slot}-${block.builder_pubkey || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Only show blocks for the single next slot (next block in production)
  const blocks = deduped.filter(block => {
    const slot = block.slot ? parseInt(block.slot) : 0;
    return slot > 0 && slot === nextSlot;
  });

  if (blocks.length === 0) {
    return <p className="text-white/60">No builder submissions for the next slot yet</p>;
  }

  // Sort by bid value descending so the likely winner is at the top
  const sortedBlocks = [...blocks].sort((a, b) => {
    const va = a.value ? BigInt(a.value) : BigInt(0);
    const vb = b.value ? BigInt(b.value) : BigInt(0);
    return vb > va ? 1 : va > vb ? -1 : 0;
  });

  const DISPLAY_LIMIT = 10;
  const displayedBlocks = sortedBlocks.slice(0, DISPLAY_LIMIT);

  // Metrics for this slot only (no mixing with other slots)
  const totalValue = sortedBlocks.reduce((sum, block) => {
    const value = block.value ? BigInt(block.value) : BigInt(0);
    return sum + value;
  }, BigInt(0));

  const avgValue = sortedBlocks.length > 0 ? Number(totalValue) / sortedBlocks.length / 1e18 : 0;

  const totalNumTx = sortedBlocks.reduce((sum, block) => {
    return sum + (block.num_tx ? hexToNumber(block.num_tx) : 0);
  }, 0);

  const uniqueBuilders = new Set(sortedBlocks.map(b => b.builder_pubkey).filter(Boolean));

  const highestBid = sortedBlocks.reduce((max, block) => {
    const value = block.value ? BigInt(block.value) : BigInt(0);
    return value > max ? value : max;
  }, BigInt(0));

  return (
    <div className="space-y-4">
      {isFallbackDelivered && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
          <strong className="text-blue-400">Note:</strong>
          <span className="text-white/80 ml-2">builder_blocks_received was empty from all relays. Showing proposer_payload_delivered (winning blocks delivered to validators) instead so you can see recent builder activity.</span>
        </div>
      )}
      {/* Summary: next slot only */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm mb-2">
        <strong className="text-amber-400">Next block in production (slot {nextSlot.toLocaleString()}):</strong>
        <span className="text-white/80 ml-2">Showing all {sortedBlocks.length} competing builder proposals for this slot. Only one will win; the rest are discarded.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
          <div className="text-purple-400 text-xs font-medium mb-1">Proposals (slot {nextSlot.toLocaleString()})</div>
          <div className="text-white text-2xl font-bold">{formatNumber(sortedBlocks.length)}</div>
          <div className="text-white/60 text-xs mt-1">from {uniqueBuilders.size} builders</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-xs font-medium mb-1">Avg Bid Value</div>
          <div className="text-white text-2xl font-bold">{avgValue.toFixed(4)}</div>
          <div className="text-white/60 text-xs mt-1">ETH per block</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-xs font-medium mb-1">Highest Bid</div>
          <div className="text-white text-2xl font-bold">{weiToEth(highestBid.toString())}</div>
          <div className="text-white/60 text-xs mt-1">ETH</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-4">
          <div className="text-orange-400 text-xs font-medium mb-1">
            {sortedBlocks.length === 1 ? 'Tx count' : 'Tx count (sum across proposals)'}
          </div>
          <div className="text-white text-2xl font-bold">{formatNumber(totalNumTx)}</div>
          <div className="text-white/60 text-xs mt-1">
            {sortedBlocks.length === 1
              ? 'all will land on-chain if this proposal wins'
              : 'overlapping; ~1 block\'s worth will land on-chain'}
          </div>
        </div>
      </div>

      {/* One slot only */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-lg">⚡</span>
          <div className="text-white/80">
            <strong className="text-white">Single-slot view:</strong> All {sortedBlocks.length} proposals shown are for slot {nextSlot.toLocaleString()} only (the next block in production). No other slots are included, so there is no duplication across different blocks. Only the highest bid below will be delivered to the validator; the rest are discarded.
          </div>
        </div>
      </div>

      {/* Educational Info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-400 text-lg">💡</span>
          <div className="text-white/80 space-y-2">
            <div>
              <strong className="text-white">The Builder Competition:</strong> Multiple builders compete for EACH slot by submitting different block proposals to relays.
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs ml-4">
              <li><strong>Same Slot, Multiple Bids:</strong> You'll see several blocks with the same slot number - these are competing bids from different builders</li>
              <li><strong>Overlapping Transactions:</strong> Many transactions appear in multiple competing blocks. Total tx count is inflated because builders include the same popular transactions</li>
              <li><strong>Only One Wins:</strong> Per slot, only the highest bid gets delivered to the validator. The rest are discarded</li>
              <li><strong>MEV Extraction:</strong> Builders include sandwich attacks, arbitrage, and optimal ordering to maximize profits and bid higher</li>
            </ul>
            <div className="text-yellow-400 text-xs bg-yellow-400/10 border border-yellow-400/20 rounded p-2 mt-2">
              {sortedBlocks.length === 1 ? (
                <>
                  ⚠️ <strong>This slot has 1 proposal</strong> ({formatNumber(totalNumTx)} txs). If it wins, all {formatNumber(totalNumTx)} txs land on-chain. When multiple builders compete, the sum overcounts (same txs in multiple blocks) and only one block&apos;s worth (~200–400 txs) actually lands.
                </>
              ) : (
                <>
                  ⚠️ <strong>Key Insight:</strong> The {formatNumber(totalNumTx)} transactions above are the sum of txs in all {sortedBlocks.length} proposals for this slot. Most txs appear in multiple proposals (same mempool). Only one block wins, so only ~200–400 unique txs for this slot will actually land on-chain.
                </>
              )}
            </div>
            {sortedBlocks.length === 1 && (
              <div className="text-white/50 text-xs mt-2">
                Only 1 proposal in this response for this slot. The relay API returns a limited window; more builders may have submitted for this slot.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table shows first 10 proposals; metrics above use full count */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 px-3 py-2 text-xs text-white/70">
          Showing {displayedBlocks.length} of {formatNumber(sortedBlocks.length)} proposals below (sorted by bid, highest first).
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-3 text-white/80 font-medium">Slot</th>
                <th className="text-left p-3 text-white/80 font-medium">Block #</th>
                <th className="text-left p-3 text-white/80 font-medium">Builder</th>
                <th className="text-right p-3 text-white/80 font-medium">Bid Value</th>
                <th className="text-right p-3 text-white/80 font-medium">Gas Used</th>
                <th className="text-right p-3 text-white/80 font-medium">Txs</th>
              </tr>
            </thead>
            <tbody>
              {displayedBlocks.map((block, idx) => {
                const bidValue = block.value ? weiToEth(block.value) : '0';
                const gasUsed = block.gas_used ? hexToNumber(block.gas_used) : 0;
                const gasLimit = block.gas_limit ? hexToNumber(block.gas_limit) : 0;
                const gasPercent = gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0;
                const numTx = block.num_tx ? hexToNumber(block.num_tx) : 0;

                return (
                  <tr key={block.block_hash || `${block.slot}-${block.builder_pubkey}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white/90 font-mono">{block.slot || 'N/A'}</td>
                    <td className="p-3 text-white/90 font-mono">{block.block_number ? blockNumberToNumber(block.block_number).toLocaleString() : 'N/A'}</td>
                    <td className="p-3 text-white/90">
                      <span className="text-purple-400">{getBuilderName(block.builder_pubkey || '')}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-green-400 font-medium">{bidValue} ETH</span>
                    </td>
                    <td className="p-3 text-right text-white/80">
                      {formatNumber(gasUsed)} <span className="text-white/50">({gasPercent}%)</span>
                    </td>
                    <td className="p-3 text-right text-white/80">{numTx}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-white/50 text-xs text-center mt-2">
        {sortedBlocks.length > DISPLAY_LIMIT
          ? `Showing ${DISPLAY_LIMIT} of ${formatNumber(sortedBlocks.length)} proposals for slot ${nextSlot.toLocaleString()} (sorted by bid, highest first). Total count and metrics above include all ${formatNumber(sortedBlocks.length)} proposals.`
          : `All ${sortedBlocks.length} proposals for slot ${nextSlot.toLocaleString()} (sorted by bid, highest first)`}
      </p>
    </div>
  );
}
