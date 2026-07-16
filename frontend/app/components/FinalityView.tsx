import React from 'react';
import { formatNumber } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildFinalityStepTable } from './stepTableAdapters';
import {
  stepPanelEmptyTextClass,
} from './stepPanelConstants';

interface FinalityViewProps {
  data: any;
}

export default function FinalityView({ data }: FinalityViewProps) {
  const table = buildFinalityStepTable(data ?? {});

  if (!data || !data.data) {
    return (
      <div className="space-y-3">
        <p className={stepPanelEmptyTextClass}>No finality data available</p>
        <StepRawJsonDetails data={data ?? {}} className="mt-0" />
      </div>
    );
  }

  const finalized = table.rows.find((r) => r.checkpoint === 'Finalized')?.epoch ?? 0;
  const currentJustified = table.rows.find((r) => r.checkpoint === 'Current Justified')?.epoch ?? 0;
  const previousJustified = table.rows.find((r) => r.checkpoint === 'Previous Justified')?.epoch ?? 0;
  const epochsSinceFinality = currentJustified - finalized;

  const isHealthy = epochsSinceFinality <= 2;
  const isCritical = epochsSinceFinality > 4;

  return (
    <div className="space-y-4">
      <div className={`border rounded-lg p-4 ${
        isCritical
          ? 'bg-red-500/10 border-red-500/30'
          : isHealthy
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {isCritical ? '⚠️' : isHealthy ? '✅' : '⏳'}
          </span>
          <div>
            <div className={`text-lg font-bold ${
              isCritical ? 'text-red-400' : isHealthy ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {isCritical ? 'Finality Issues Detected' : isHealthy ? 'Network Finalizing Normally' : 'Slow Finality'}
            </div>
            <div className="text-fg/70 text-sm mt-1">
              {epochsSinceFinality} epoch{epochsSinceFinality !== 1 ? 's' : ''} between justified and finalized
              {isHealthy ? ' (normal)' : isCritical ? ' (critical)' : ' (delayed)'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-xs font-medium mb-1">Finalized</div>
          <div className="text-fg text-2xl font-bold">{formatNumber(finalized)}</div>
          <div className="text-fg/60 text-xs mt-1">Slot {formatNumber(finalized * 32)}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-xs font-medium mb-1">Current Justified</div>
          <div className="text-fg text-2xl font-bold">{formatNumber(currentJustified)}</div>
          <div className="text-fg/60 text-xs mt-1">Slot {formatNumber(currentJustified * 32)}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
          <div className="text-purple-400 text-xs font-medium mb-1">Previous Justified</div>
          <div className="text-fg text-2xl font-bold">{formatNumber(previousJustified)}</div>
          <div className="text-fg/60 text-xs mt-1">Slot {formatNumber(previousJustified * 32)}</div>
        </div>
      </div>

      <StandardStepTable
        columns={table.columns}
        rows={table.displayedRows}
        barText={table.barText}
        getRowKey={table.getRowKey}
        getRawHexData={table.getRawHexData}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-soft border border-line/10 rounded-lg p-3">
          <div className="text-fg/60 text-xs mb-1">Time to Finality</div>
          <div className="text-fg text-lg font-bold">
            ~{(epochsSinceFinality * 6.4).toFixed(1)} minutes
          </div>
          <div className="text-fg/50 text-xs mt-1">
            ({epochsSinceFinality} epochs × 6.4 min/epoch)
          </div>
        </div>

        <div className="bg-soft border border-line/10 rounded-lg p-3">
          <div className="text-fg/60 text-xs mb-1">Blocks Since Finality</div>
          <div className="text-fg text-lg font-bold">
            {formatNumber((currentJustified - finalized) * 32)}
          </div>
          <div className="text-fg/50 text-xs mt-1">
            slots (32 slots/epoch × {epochsSinceFinality} epochs)
          </div>
        </div>
      </div>

      <StepRawJsonDetails data={data} />
    </div>
  );
}
