import React from 'react';
import { formatNumber, hexToNumber } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildMevStepTable } from './stepTableAdapters';
import { stepPanelEmptyTextClass } from './stepPanelConstants';

interface MEVViewProps {
  data: {
    sandwiches?: Array<Record<string, unknown>>;
    arbitrages?: Array<Record<string, unknown>>;
    liquidations?: Array<Record<string, unknown>>;
    jitLiquidity?: Array<Record<string, unknown>>;
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
    return (
      <div className="space-y-3">
        <p className={stepPanelEmptyTextClass}>No MEV detection data available</p>
        <StepRawJsonDetails data={{}} className="mt-0" />
      </div>
    );
  }

  const table = buildMevStepTable(data);
  const blockNum = data.block ? hexToNumber(data.block) : 0;
  const totalTxs = data.totalTx || 0;
  const scannedTxs = data.txScanned || 0;
  const swapCount = data.swapCount || 0;

  const sandwiches = data.sandwiches?.length ?? 0;
  const arbitrages = data.arbitrages?.length ?? 0;
  const liquidations = data.liquidations?.length ?? 0;
  const jit = data.jitLiquidity?.length ?? 0;
  const hasMEV = table.rows.length > 0;

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="text-xs font-medium mb-1 text-red-400">Sandwiches</div>
          <div className="text-white text-2xl font-bold">{sandwiches}</div>
        </div>
        <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="text-xs font-medium mb-1 text-purple-400">Arbitrage</div>
          <div className="text-white text-2xl font-bold">{arbitrages}</div>
        </div>
        <div className="border rounded-lg p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <div className="text-xs font-medium mb-1 text-yellow-400">Liquidations</div>
          <div className="text-white text-2xl font-bold">{liquidations}</div>
        </div>
        <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="text-xs font-medium mb-1 text-blue-400">JIT Liquidity</div>
          <div className="text-white text-2xl font-bold">{jit}</div>
        </div>
      </div>

      {hasMEV ? (
        <StandardStepTable
          columns={table.columns}
          rows={table.displayedRows}
          barText={table.barText}
          footnote={table.footnote}
          getRowKey={table.getRowKey}
          getRawHexData={table.getRawHexData}
        />
      ) : (
        <div className="border border-green-500/20 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-green-400 font-medium mb-1">No MEV Activity Detected</div>
          <div className="text-white/60 text-sm">
            This block appears clean for the scanned sample.
          </div>
        </div>
      )}

      <StepRawJsonDetails data={data} />
    </div>
  );
}
