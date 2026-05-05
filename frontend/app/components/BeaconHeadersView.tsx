import React from 'react';
import { formatNumber, weiToEth } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildHeadersStepTable } from './stepTableAdapters';
import { stepPanelEmptyTextClass } from './stepPanelConstants';

interface BeaconHeadersViewProps {
  data: {
    headers?: any[];
    count?: number;
  };
}

export default function BeaconHeadersView({ data }: BeaconHeadersViewProps) {
  const table = buildHeadersStepTable(data);

  if (!data || !data.headers || data.headers.length === 0 || table.rows.length === 0) {
    return (
      <div className="space-y-3">
        <p className={stepPanelEmptyTextClass}>No beacon headers found</p>
        <StepRawJsonDetails data={data ?? {}} className="mt-0" />
      </div>
    );
  }

  const mevRows = table.rows.filter((row) => row.type === 'MEV');
  const vanillaRows = table.rows.filter((row) => row.type !== 'MEV');
  const totalMevPaymentsWei = mevRows.reduce((sum, row) => {
    const raw = row.raw.builder_payment_eth;
    if (typeof raw !== 'string') return sum;
    return sum + BigInt(raw);
  }, BigInt(0));
  const avgMevPayment = mevRows.length > 0 ? Number(totalMevPaymentsWei) / mevRows.length / 1e18 : 0;
  const avgBlockFullness = table.rows.length > 0
    ? table.rows.reduce((sum, row) => sum + row.gasPercent, 0) / table.rows.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-lg p-4">
          <div className="text-indigo-400 text-xs font-medium mb-1">Proposed Blocks</div>
          <div className="text-white text-2xl font-bold">{formatNumber(table.rows.length)}</div>
          <div className="text-white/60 text-xs mt-1">
            {mevRows.length} MEV / {vanillaRows.length} vanilla
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-xs font-medium mb-1">Total Builder Payments</div>
          <div className="text-white text-2xl font-bold">{weiToEth(totalMevPaymentsWei.toString())}</div>
          <div className="text-white/60 text-xs mt-1">ETH to validators</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-xs font-medium mb-1">Avg MEV Payment</div>
          <div className="text-white text-2xl font-bold">{avgMevPayment.toFixed(4)}</div>
          <div className="text-white/60 text-xs mt-1">ETH per block</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-4">
          <div className="text-orange-400 text-xs font-medium mb-1">Avg Block Fullness</div>
          <div className="text-white text-2xl font-bold">{avgBlockFullness.toFixed(1)}%</div>
          <div className="text-white/60 text-xs mt-1">gas utilization</div>
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
