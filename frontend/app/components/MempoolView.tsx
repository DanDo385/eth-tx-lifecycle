/*
 * MempoolView.tsx
 * Human-readable pending transaction list with a limited preview and optional raw JSON.
 */
import React from 'react';
import {
  weiToEth,
  hexToGwei,
  hexToNumber,
  formatNumber,
  shortenHash,
  shortenAddress,
  parseTransactionType,
} from '../utils/format';
import StepRawJsonDetails from './StepRawJsonDetails';
import {
  STEP_TABLE_PREVIEW_LIMIT,
  stepPanelTableBarClass,
  stepPanelTableFootnoteClass,
  stepPanelTableWrapClass,
  stepPanelEmptyTextClass,
} from './stepPanelConstants';

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

  const sorted = [...txs].sort((a, b) => {
    const ga = a.gasPrice ? hexToGwei(a.gasPrice) : 0;
    const gb = b.gasPrice ? hexToGwei(b.gasPrice) : 0;
    return gb - ga;
  });
  const displayed = sorted.slice(0, STEP_TABLE_PREVIEW_LIMIT);

  const lastUpdateLabel =
    data.lastUpdate && data.lastUpdate > 0
      ? new Date(data.lastUpdate * 1000).toLocaleString()
      : null;

  return (
    <div className="mt-4 space-y-4">
      <div className={stepPanelTableWrapClass}>
        <div
          className={`${stepPanelTableBarClass} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1`}
        >
          <span>
            Showing {displayed.length} of {formatNumber(total)} pending transactions (sorted by gas price, highest
            first).
          </span>
          {lastUpdateLabel && (
            <span className="text-white/50 sm:text-right">Snapshot: {lastUpdateLabel}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-3 text-white/80 font-medium">Tx hash</th>
                <th className="text-left p-3 text-white/80 font-medium">From</th>
                <th className="text-left p-3 text-white/80 font-medium">To</th>
                <th className="text-left p-3 text-white/80 font-medium">Type</th>
                <th className="text-right p-3 text-white/80 font-medium">Value</th>
                <th className="text-right p-3 text-white/80 font-medium">Gas limit</th>
                <th className="text-right p-3 text-white/80 font-medium">Gas price</th>
                <th className="text-right p-3 text-white/80 font-medium">Nonce</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((tx, idx) => {
                const hash = tx.hash || '';
                const from = tx.from || '';
                const to = tx.to ?? null;
                const valueEth = weiToEth(tx.value || '0x0');
                const gasLimit = tx.gas ? hexToNumber(tx.gas) : 0;
                const gwei = tx.gasPrice ? hexToGwei(tx.gasPrice) : 0;
                const nonce = tx.nonce ? hexToNumber(tx.nonce) : 0;
                const input = tx.input || '';
                const typeLabel = parseTransactionType(input, to ?? null);

                return (
                  <tr
                    key={hash || `row-${idx}`}
                    className="border-b border-white/5 hover:bg-white/5"
                    title={hash ? `Full hash: ${hash}` : undefined}
                  >
                    <td className="p-3 font-mono text-white/90">{hash ? shortenHash(hash) : '—'}</td>
                    <td className="p-3 font-mono text-white/80">{from ? shortenAddress(from) : '—'}</td>
                    <td className="p-3 font-mono text-white/80">
                      {to == null || to === '' ? (
                        <span className="text-amber-400/90">Contract create</span>
                      ) : (
                        shortenAddress(to)
                      )}
                    </td>
                    <td className="p-3 text-white/70 max-w-[140px] truncate" title={typeLabel}>
                      {typeLabel}
                    </td>
                    <td className="p-3 text-right text-green-400/90 font-medium">
                      {valueEth === '0' ? '0 ETH' : `${valueEth} ETH`}
                    </td>
                    <td className="p-3 text-right text-white/80">{formatNumber(gasLimit)}</td>
                    <td className="p-3 text-right text-white/80">
                      {gwei > 0 ? (
                        <>
                          {gwei.toFixed(2)} <span className="text-white/50">gwei</span>
                        </>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-white/70">{nonce}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {total > STEP_TABLE_PREVIEW_LIMIT && (
        <p className={stepPanelTableFootnoteClass}>
          Table lists the first {STEP_TABLE_PREVIEW_LIMIT} transactions after sorting. Summary cards above reflect all{' '}
          {formatNumber(total)} pending transactions in this snapshot.
        </p>
      )}

      <StepRawJsonDetails data={data} />
    </div>
  );
}
