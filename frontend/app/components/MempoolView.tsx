import React from 'react';
import { formatNumber } from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import StandardStepTable from './StandardStepTable';
import { buildMempoolStepTable } from './stepTableAdapters';
import { stepPanelEmptyTextClass } from './stepPanelConstants';

export interface MempoolViewProps {
  data: {
    pendingTxs?: Array<{
      hash?: string;
      from?: string;
      to?: string | null;
      value?: string;
      gasPrice?: string | null;
      gas?: string | null;
      nonce?: string;
      input?: string;
      timestamp?: number;
    }>;
    count?: number;
    lastUpdate?: number;
    source?: string;
    metrics?: unknown;
  };
}

export default function MempoolView({ data }: MempoolViewProps) {
  const txs = Array.isArray(data?.pendingTxs) ? data.pendingTxs : [];
  const table = buildMempoolStepTable(data);
  const total = typeof data?.count === 'number' ? data.count : txs.length;

  if (txs.length === 0) {
    return (
      <div className="mt-4 space-y-3">
        <p className={stepPanelEmptyTextClass}>
          No pending transactions in this snapshot yet. The node polls the pending block periodically; try again in a few
          seconds or check that your execution client exposes a non-empty pending block.
        </p>
        <StepRawJsonDetails data={data} className="mt-2" />
      </div>
    );
  }

  const lastUpdateLabel =
    data.lastUpdate && data.lastUpdate > 0
      ? new Date(data.lastUpdate * 1000).toLocaleString()
      : null;

  return (
    <div className="mt-4 space-y-4">
      <StandardStepTable
        columns={table.columns}
        rows={table.displayedRows}
        barText={
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>{table.barText}</span>
            {lastUpdateLabel && <span className="text-fg/50 sm:text-right">Snapshot: {lastUpdateLabel}</span>}
          </div>
        }
        footnote={table.footnote}
        getRowKey={table.getRowKey}
        getRawHexData={table.getRawHexData}
      />

      <p className="text-center text-xs text-fg/50">
        Total pending transactions in this snapshot: {formatNumber(total)}
      </p>

      <StepRawJsonDetails data={data} />
    </div>
  );
}
