import React from 'react';
import { formatNumber } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildDeliveredStepTable } from './stepTableAdapters';
import { stepPanelEmptyTextClass } from './stepPanelConstants';

interface RelayDeliveredViewProps {
  data: {
    delivered_payloads?: any[];
    count?: number;
    latest_block?: number;
  };
}

export default function RelayDeliveredView({ data }: RelayDeliveredViewProps) {
  const table = buildDeliveredStepTable(data);

  if (!data || !data.delivered_payloads || data.delivered_payloads.length === 0 || table.rows.length === 0) {
    return (
      <div className="space-y-3">
        <p className={stepPanelEmptyTextClass}>No delivered payloads found</p>
        <StepRawJsonDetails data={data ?? {}} className="mt-0" />
      </div>
    );
  }

  const totalBlocks = table.rows.length;
  const uniqueBuilders = new Set(table.rows.map((r) => r.builder));
  const totalEarnings = table.rows.reduce((sum, r) => sum + parseFloat(r.paymentEth), 0);
  const avgPayment = totalBlocks > 0 ? totalEarnings / totalBlocks : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-lg p-4">
          <div className="text-cyan-400 text-xs font-medium mb-1">Blocks Delivered</div>
          <div className="text-fg text-2xl font-bold">{formatNumber(totalBlocks)}</div>
          <div className="text-fg/60 text-xs mt-1">to validators</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-xs font-medium mb-1">Total Validator Earnings</div>
          <div className="text-fg text-2xl font-bold">{totalEarnings.toFixed(3)}</div>
          <div className="text-fg/60 text-xs mt-1">ETH from builders</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-xs font-medium mb-1">Avg Payment</div>
          <div className="text-fg text-2xl font-bold">{avgPayment.toFixed(4)}</div>
          <div className="text-fg/60 text-xs mt-1">ETH per block</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
          <div className="text-purple-400 text-xs font-medium mb-1">Winning Builders</div>
          <div className="text-fg text-2xl font-bold">{uniqueBuilders.size}</div>
          <div className="text-fg/60 text-xs mt-1">unique winners</div>
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
