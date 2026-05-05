import { blockNumberToNumber, formatNumber, getBuilderName, hexToGwei, hexToNumber, parseTransactionType, shortenAddress, shortenHash, weiToEth, weiToEthExtended } from '../utils/format';
import type { StepTableColumn } from './StandardStepTable';
import { STEP_TABLE_PREVIEW_LIMIT } from './stepPanelConstants';

type AdapterResult<Row> = {
  columns: Array<StepTableColumn<Row>>;
  rows: Row[];
  displayedRows: Row[];
  barText: string;
  footnote?: string;
  getRowKey: (row: Row, index: number) => string;
  getRawHexData: (row: Row) => unknown;
};

export type MempoolRow = {
  hash: string;
  from: string;
  to: string | null;
  type: string;
  valueEth: string;
  gasLimit: number;
  gasPriceGwei: number;
  nonce: number;
  raw: Record<string, unknown>;
};

export function buildMempoolStepTable(data: { pendingTxs?: Array<Record<string, unknown>>; count?: number }): AdapterResult<MempoolRow> {
  const txs = Array.isArray(data?.pendingTxs) ? data.pendingTxs : [];
  const rows: MempoolRow[] = txs.map((tx) => {
    const hash = typeof tx.hash === 'string' ? tx.hash : '';
    const from = typeof tx.from === 'string' ? tx.from : '';
    const to = typeof tx.to === 'string' ? tx.to : null;
    const value = typeof tx.value === 'string' ? tx.value : '0x0';
    const gas = typeof tx.gas === 'string' ? tx.gas : '0x0';
    const gasPrice = typeof tx.gasPrice === 'string' ? tx.gasPrice : '0x0';
    const nonce = typeof tx.nonce === 'string' ? tx.nonce : '0x0';
    const input = typeof tx.input === 'string' ? tx.input : '';
    return {
      hash,
      from,
      to,
      type: parseTransactionType(input, to),
      valueEth: weiToEth(value),
      gasLimit: hexToNumber(gas),
      gasPriceGwei: hexToGwei(gasPrice),
      nonce: hexToNumber(nonce),
      raw: tx,
    };
  }).sort((a, b) => b.gasPriceGwei - a.gasPriceGwei);

  const displayedRows = rows.slice(0, STEP_TABLE_PREVIEW_LIMIT);
  const total = typeof data?.count === 'number' ? data.count : rows.length;

  const columns: Array<StepTableColumn<MempoolRow>> = [
    { key: 'hash', header: 'Tx hash', cell: (r) => (r.hash ? shortenHash(r.hash) : '—') },
    { key: 'from', header: 'From', cell: (r) => (r.from ? shortenAddress(r.from) : '—') },
    { key: 'to', header: 'To', cell: (r) => (r.to ? shortenAddress(r.to) : 'Contract create') },
    { key: 'type', header: 'Type', cell: (r) => r.type },
    { key: 'value', header: 'Value', align: 'right', cell: (r) => `${r.valueEth} ETH` },
    { key: 'gasLimit', header: 'Gas limit', align: 'right', cell: (r) => formatNumber(r.gasLimit) },
    { key: 'gasPrice', header: 'Gas price', align: 'right', cell: (r) => `${r.gasPriceGwei.toFixed(2)} gwei` },
    { key: 'nonce', header: 'Nonce', align: 'right', cell: (r) => String(r.nonce) },
  ];

  return {
    columns,
    rows,
    displayedRows,
    barText: `Showing ${displayedRows.length} of ${formatNumber(total)} pending transactions (sorted by gas price, highest first).`,
    footnote: rows.length > STEP_TABLE_PREVIEW_LIMIT ? `Summary metrics include all ${formatNumber(total)} pending transactions.` : undefined,
    getRowKey: (row, idx) => row.hash || `mempool-${idx}`,
    getRawHexData: (row) => row.raw,
  };
}

export type BuilderReceivedRow = {
  slot: string;
  blockNumber: number;
  builder: string;
  bidEth: string;
  gasUsed: number;
  gasPercent: number;
  txCount: number;
  raw: Record<string, unknown>;
};

export function buildReceivedStepTable(data: { received_blocks?: Array<Record<string, unknown>> }): AdapterResult<BuilderReceivedRow> {
  const rawBlocks = Array.isArray(data?.received_blocks) ? data.received_blocks : [];

  const seen = new Set<string>();
  const deduped = rawBlocks.filter((block) => {
    const hash = typeof block.block_hash === 'string' ? block.block_hash : '';
    const slot = typeof block.slot === 'string' ? block.slot : '';
    const builder = typeof block.builder_pubkey === 'string' ? block.builder_pubkey : '';
    const key = hash || `${slot}-${builder}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const nextSlot = deduped
    .map((block) => (typeof block.slot === 'string' ? parseInt(block.slot, 10) : 0))
    .filter((s) => Number.isFinite(s) && s > 0)
    .sort((a, b) => b - a)[0] ?? 0;

  const rows: BuilderReceivedRow[] = deduped
    .filter((block) => {
      const slot = typeof block.slot === 'string' ? parseInt(block.slot, 10) : 0;
      return slot > 0 && slot === nextSlot;
    })
    .map((block) => {
      const gasUsedHex = typeof block.gas_used === 'string' ? block.gas_used : '0x0';
      const gasLimitHex = typeof block.gas_limit === 'string' ? block.gas_limit : '0x0';
      const gasUsed = hexToNumber(gasUsedHex);
      const gasLimit = hexToNumber(gasLimitHex);
      return {
        slot: typeof block.slot === 'string' ? block.slot : 'N/A',
        blockNumber: block.block_number ? blockNumberToNumber(block.block_number as string | number) : 0,
        builder: getBuilderName(typeof block.builder_pubkey === 'string' ? block.builder_pubkey : ''),
        bidEth: weiToEthExtended(typeof block.value === 'string' ? block.value : '0x0'),
        gasUsed,
        gasPercent: gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0,
        txCount: hexToNumber(typeof block.num_tx === 'string' ? block.num_tx : '0x0'),
        raw: block,
      };
    })
    .sort((a, b) => parseFloat(b.bidEth) - parseFloat(a.bidEth));

  const displayedRows = rows.slice(0, STEP_TABLE_PREVIEW_LIMIT);
  const slotLabel = nextSlot > 0 ? nextSlot.toLocaleString() : 'n/a';

  const columns: Array<StepTableColumn<BuilderReceivedRow>> = [
    { key: 'slot', header: 'Slot', cell: (r) => r.slot },
    { key: 'block', header: 'Block #', cell: (r) => (r.blockNumber > 0 ? r.blockNumber.toLocaleString() : 'N/A') },
    { key: 'builder', header: 'Builder', cell: (r) => r.builder },
    { key: 'bid', header: 'Bid', align: 'right', cell: (r) => `${r.bidEth} ETH` },
    { key: 'gas', header: 'Gas used', align: 'right', cell: (r) => `${formatNumber(r.gasUsed)} (${r.gasPercent}%)` },
    { key: 'tx', header: 'Txs', align: 'right', cell: (r) => formatNumber(r.txCount) },
  ];

  return {
    columns,
    rows,
    displayedRows,
    barText: `Showing ${displayedRows.length} of ${formatNumber(rows.length)} proposals for slot ${slotLabel}.`,
    footnote: rows.length > STEP_TABLE_PREVIEW_LIMIT ? `Summary metrics include all ${formatNumber(rows.length)} proposals for slot ${slotLabel}.` : undefined,
    getRowKey: (row, idx) => `${row.slot}-${row.blockNumber}-${idx}`,
    getRawHexData: (row) => row.raw,
  };
}

export type DeliveredRow = {
  slot: string;
  blockNumber: number;
  builder: string;
  paymentEth: string;
  gasUsed: number;
  gasPercent: number;
  txCount: number;
  paymentPerTx: number;
  raw: Record<string, unknown>;
};

export function buildDeliveredStepTable(data: { delivered_payloads?: Array<Record<string, unknown>> }): AdapterResult<DeliveredRow> {
  const payloads = Array.isArray(data?.delivered_payloads) ? data.delivered_payloads : [];
  const rows: DeliveredRow[] = payloads.map((payload) => {
    const paymentEth = weiToEth(typeof payload.value === 'string' ? payload.value : '0x0');
    const gasUsed = hexToNumber(typeof payload.gas_used === 'string' ? payload.gas_used : '0x0');
    const gasLimit = hexToNumber(typeof payload.gas_limit === 'string' ? payload.gas_limit : '0x0');
    const txCount = hexToNumber(typeof payload.num_tx === 'string' ? payload.num_tx : '0x0');
    return {
      slot: typeof payload.slot === 'string' ? payload.slot : 'N/A',
      blockNumber: payload.block_number ? blockNumberToNumber(payload.block_number as string | number) : 0,
      builder: getBuilderName(typeof payload.builder_pubkey === 'string' ? payload.builder_pubkey : ''),
      paymentEth,
      gasUsed,
      gasPercent: gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0,
      txCount,
      paymentPerTx: txCount > 0 ? parseFloat(paymentEth) / txCount : 0,
      raw: payload,
    };
  }).sort((a, b) => Number(b.slot) - Number(a.slot));

  const displayedRows = rows.slice(0, STEP_TABLE_PREVIEW_LIMIT);

  const columns: Array<StepTableColumn<DeliveredRow>> = [
    { key: 'slot', header: 'Slot', cell: (r) => r.slot },
    { key: 'block', header: 'Block #', cell: (r) => (r.blockNumber > 0 ? r.blockNumber.toLocaleString() : 'N/A') },
    { key: 'builder', header: 'Winning builder', cell: (r) => r.builder },
    { key: 'payment', header: 'Payment', align: 'right', cell: (r) => `${r.paymentEth} ETH` },
    { key: 'gas', header: 'Gas used', align: 'right', cell: (r) => `${formatNumber(r.gasUsed)} (${r.gasPercent}%)` },
    { key: 'tx', header: 'Txs', align: 'right', cell: (r) => formatNumber(r.txCount) },
    { key: 'ppt', header: 'Payment/Tx', align: 'right', cell: (r) => `${r.paymentPerTx.toFixed(6)} ETH` },
  ];

  return {
    columns,
    rows,
    displayedRows,
    barText: `Showing ${displayedRows.length} of ${formatNumber(rows.length)} delivered blocks (most recent first).`,
    footnote: rows.length > STEP_TABLE_PREVIEW_LIMIT ? `Summary metrics include all ${formatNumber(rows.length)} delivered blocks.` : undefined,
    getRowKey: (row, idx) => `${row.slot}-${row.blockNumber}-${idx}`,
    getRawHexData: (row) => row.raw,
  };
}

export type HeaderRow = {
  slot: string;
  blockNumber: number;
  type: string;
  builder: string;
  paymentEth: string;
  gasUsed: number;
  gasPercent: number;
  txCount: number;
  raw: Record<string, unknown>;
};

export function buildHeadersStepTable(data: { headers?: Array<Record<string, unknown>> }): AdapterResult<HeaderRow> {
  const headers = Array.isArray(data?.headers) ? data.headers : [];
  const rows: HeaderRow[] = headers.map((header) => {
    const paymentHex = typeof header.builder_payment_eth === 'string' ? header.builder_payment_eth : '';
    const gasUsed = hexToNumber(typeof header.gas_used === 'string' ? header.gas_used : '0x0');
    const gasLimit = hexToNumber(typeof header.gas_limit === 'string' ? header.gas_limit : '0x0');
    return {
      slot: typeof header.slot === 'string' ? header.slot : 'N/A',
      blockNumber: header.block_number ? blockNumberToNumber(header.block_number as string | number) : 0,
      type: paymentHex ? 'MEV' : 'Vanilla',
      builder: header.builder_pubkey ? getBuilderName(String(header.builder_pubkey)) : 'Local',
      paymentEth: paymentHex ? weiToEth(paymentHex) : '—',
      gasUsed,
      gasPercent: gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0,
      txCount: hexToNumber(typeof header.num_tx === 'string' ? header.num_tx : '0x0'),
      raw: header,
    };
  });

  const displayedRows = rows.slice(0, STEP_TABLE_PREVIEW_LIMIT);

  const columns: Array<StepTableColumn<HeaderRow>> = [
    { key: 'slot', header: 'Slot', cell: (r) => r.slot },
    { key: 'block', header: 'Block #', cell: (r) => (r.blockNumber > 0 ? r.blockNumber.toLocaleString() : 'N/A') },
    { key: 'type', header: 'Type', cell: (r) => r.type },
    { key: 'builder', header: 'Builder', cell: (r) => r.builder },
    { key: 'payment', header: 'Payment', align: 'right', cell: (r) => (r.paymentEth === '—' ? '—' : `${r.paymentEth} ETH`) },
    { key: 'gas', header: 'Gas used', align: 'right', cell: (r) => `${formatNumber(r.gasUsed)} (${r.gasPercent}%)` },
    { key: 'tx', header: 'Txs', align: 'right', cell: (r) => formatNumber(r.txCount) },
  ];

  return {
    columns,
    rows,
    displayedRows,
    barText: `Showing ${displayedRows.length} of ${formatNumber(rows.length)} proposed blocks.`,
    footnote: rows.length > STEP_TABLE_PREVIEW_LIMIT ? `Summary metrics include all ${formatNumber(rows.length)} blocks.` : undefined,
    getRowKey: (row, idx) => `${row.slot}-${row.blockNumber}-${idx}`,
    getRawHexData: (row) => row.raw,
  };
}

export type FinalityRow = {
  checkpoint: string;
  epoch: number;
  slot: number;
  status: string;
  rootPreview: string;
  raw: Record<string, unknown>;
};

export function buildFinalityStepTable(data: { data?: Record<string, unknown> }): AdapterResult<FinalityRow> {
  const cp = (data?.data ?? {}) as Record<string, Record<string, unknown>>;

  function getEpoch(source: Record<string, unknown> | undefined): number {
    const epoch = source?.epoch;
    return typeof epoch === 'string' ? parseInt(epoch, 10) || 0 : 0;
  }

  function previewRoot(source: Record<string, unknown> | undefined): string {
    const root = source?.root;
    if (typeof root !== 'string') return '—';
    return shortenHash(root);
  }

  const finalized = cp.finalized as Record<string, unknown> | undefined;
  const current = cp.current_justified as Record<string, unknown> | undefined;
  const previous = cp.previous_justified as Record<string, unknown> | undefined;

  const rows: FinalityRow[] = [
    {
      checkpoint: 'Finalized',
      epoch: getEpoch(finalized),
      slot: getEpoch(finalized) * 32,
      status: 'Safe',
      rootPreview: previewRoot(finalized),
      raw: finalized ?? {},
    },
    {
      checkpoint: 'Current Justified',
      epoch: getEpoch(current),
      slot: getEpoch(current) * 32,
      status: 'Awaiting finalization',
      rootPreview: previewRoot(current),
      raw: current ?? {},
    },
    {
      checkpoint: 'Previous Justified',
      epoch: getEpoch(previous),
      slot: getEpoch(previous) * 32,
      status: 'Historical',
      rootPreview: previewRoot(previous),
      raw: previous ?? {},
    },
  ];

  const columns: Array<StepTableColumn<FinalityRow>> = [
    { key: 'cp', header: 'Checkpoint', cell: (r) => r.checkpoint },
    { key: 'epoch', header: 'Epoch', align: 'right', cell: (r) => formatNumber(r.epoch) },
    { key: 'slot', header: 'Slot', align: 'right', cell: (r) => formatNumber(r.slot) },
    { key: 'status', header: 'Status', cell: (r) => r.status },
    { key: 'root', header: 'Root', cell: (r) => r.rootPreview },
  ];

  return {
    columns,
    rows,
    displayedRows: rows,
    barText: 'Casper-FFG checkpoints for finalized and justified states.',
    getRowKey: (row) => row.checkpoint,
    getRawHexData: (row) => row.raw,
  };
}

export type MevEventRow = {
  id: string;
  category: string;
  actor: string;
  target: string;
  txRef: string;
  details: string;
  raw: Record<string, unknown>;
};

export function buildMevStepTable(data: {
  sandwiches?: Array<Record<string, unknown>>;
  arbitrages?: Array<Record<string, unknown>>;
  liquidations?: Array<Record<string, unknown>>;
  jitLiquidity?: Array<Record<string, unknown>>;
}): AdapterResult<MevEventRow> {
  const rows: MevEventRow[] = [];

  const sandwiches = Array.isArray(data?.sandwiches) ? data.sandwiches : [];
  sandwiches.forEach((item, idx) => {
    rows.push({
      id: `sandwich-${idx}`,
      category: 'Sandwich',
      actor: shortenAddress(String(item.attacker ?? '—')),
      target: shortenAddress(String(item.victim ?? '—')),
      txRef: shortenHash(String(item.victimTx ?? item.preTx ?? '—')),
      details: `Pool ${String(item.poolName ?? item.pool ?? 'unknown')}`,
      raw: item,
    });
  });

  const arbitrages = Array.isArray(data?.arbitrages) ? data.arbitrages : [];
  arbitrages.forEach((item, idx) => {
    const hops = Array.isArray(item.hops) ? item.hops.length : 0;
    rows.push({
      id: `arb-${idx}`,
      category: 'Arbitrage',
      actor: shortenAddress(String(item.searcher ?? '—')),
      target: `${hops} hop${hops === 1 ? '' : 's'}`,
      txRef: shortenHash(String(item.txHash ?? '—')),
      details: String(item.status === '0x1' ? 'Success' : item.status === '0x0' ? 'Reverted' : 'Unknown'),
      raw: item,
    });
  });

  const liquidations = Array.isArray(data?.liquidations) ? data.liquidations : [];
  liquidations.forEach((item, idx) => {
    rows.push({
      id: `liq-${idx}`,
      category: 'Liquidation',
      actor: shortenAddress(String(item.liquidator ?? '—')),
      target: shortenAddress(String(item.borrower ?? '—')),
      txRef: shortenHash(String(item.txHash ?? '—')),
      details: String(item.protocol ?? 'Unknown protocol'),
      raw: item,
    });
  });

  const jit = Array.isArray(data?.jitLiquidity) ? data.jitLiquidity : [];
  jit.forEach((item, idx) => {
    rows.push({
      id: `jit-${idx}`,
      category: 'JIT liquidity',
      actor: shortenAddress(String(item.provider ?? '—')),
      target: shortenHash(String(item.pool ?? '—')),
      txRef: shortenHash(String(item.swapTx ?? item.mintTx ?? '—')),
      details: 'mint -> swap -> burn sequence',
      raw: item,
    });
  });

  const displayedRows = rows.slice(0, STEP_TABLE_PREVIEW_LIMIT);
  const columns: Array<StepTableColumn<MevEventRow>> = [
    { key: 'cat', header: 'Category', cell: (r) => r.category },
    { key: 'actor', header: 'Actor', cell: (r) => r.actor },
    { key: 'target', header: 'Target', cell: (r) => r.target },
    { key: 'tx', header: 'Tx reference', cell: (r) => r.txRef },
    { key: 'detail', header: 'Details', cell: (r) => r.details },
  ];

  return {
    columns,
    rows,
    displayedRows,
    barText: `Showing ${displayedRows.length} of ${formatNumber(rows.length)} detected MEV events.`,
    footnote: rows.length > STEP_TABLE_PREVIEW_LIMIT ? `Summary counters include all ${formatNumber(rows.length)} events.` : undefined,
    getRowKey: (row) => row.id,
    getRawHexData: (row) => row.raw,
  };
}
