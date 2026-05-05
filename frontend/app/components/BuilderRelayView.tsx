import React from 'react';
import { formatNumber } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildReceivedStepTable } from './stepTableAdapters';
import { stepPanelEmptyTextClass } from './stepPanelConstants';

interface BuilderRelayViewProps {
  data: {
    received_blocks?: any[];
    count?: number;
    latest_block?: number;
    fallback_delivered?: boolean;
  };
}

export default function BuilderRelayView({ data }: BuilderRelayViewProps) {
  const table = buildReceivedStepTable(data);
  const isFallbackDelivered = Boolean(data?.fallback_delivered);
  const totalProposals = table.rows.length;

  if (!data || !data.received_blocks || data.received_blocks.length === 0 || totalProposals === 0) {
    return (
      <div className="space-y-3">
        <p className={stepPanelEmptyTextClass}>
          No builder block submissions found. Some relays do not expose builder_blocks_received; try Relays → Validators for delivered payloads.
        </p>
        <StepRawJsonDetails data={data} className="mt-0" />
      </div>
    );
  }
  const uniqueBuilders = new Set(table.rows.map((row) => row.builder));
  const totalTx = table.rows.reduce((sum, row) => sum + row.txCount, 0);
  const avgBid = table.rows.length > 0
    ? table.rows.reduce((sum, row) => sum + parseFloat(row.bidEth), 0) / table.rows.length
    : 0;
  const highestBid = table.rows.reduce((max, row) => {
    const bid = parseFloat(row.bidEth);
    return bid > max ? bid : max;
  }, 0);

  return (
    <div className="space-y-4">
      {isFallbackDelivered && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
          <strong className="text-blue-400">Note:</strong>
          <span className="text-white/80 ml-2">builder_blocks_received was empty from all relays. Showing proposer_payload_delivered (winning blocks delivered to validators) instead so you can see recent builder activity.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
          <div className="text-purple-400 text-xs font-medium mb-1">Proposals</div>
          <div className="text-white text-2xl font-bold">{formatNumber(totalProposals)}</div>
          <div className="text-white/60 text-xs mt-1">from {uniqueBuilders.size} builders</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-xs font-medium mb-1">Avg Bid Value</div>
          <div className="text-white text-2xl font-bold">{avgBid.toFixed(6)}</div>
          <div className="text-white/60 text-xs mt-1">ETH per block</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-xs font-medium mb-1">Highest Bid</div>
          <div className="text-white text-2xl font-bold">{highestBid.toFixed(6)}</div>
          <div className="text-white/60 text-xs mt-1">ETH</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-4">
          <div className="text-orange-400 text-xs font-medium mb-1">Tx count</div>
          <div className="text-white text-2xl font-bold">{formatNumber(totalTx)}</div>
          <div className="text-white/60 text-xs mt-1">sum across proposals</div>
        </div>
      </div>

      <StandardStepTable
        columns={table.columns}
        rows={table.displayedRows}
        barText={table.barText}
        footnote={table.footnote}
        getRowKey={table.getRowKey}
        getRawHexData={table.getRawHexData}
      />

      <StepRawJsonDetails data={data} />
    </div>
  );
}
