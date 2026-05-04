export type JsonObject = Record<string, unknown>;

export interface EduError {
  kind?: string;
  message?: string;
  hint?: string;
}

export interface EduEnvelope<T> {
  data?: T;
  error?: EduError;
}

export interface MempoolData {
  pendingTxs?: Array<Record<string, unknown>>;
  count?: number;
  lastUpdate?: number;
  lastBlock?: string;
  source?: string;
  metrics?: {
    totalGasRequested?: number;
    totalValueWei?: string;
    avgGasPrice?: number;
    highPriorityCount?: number;
  };
}

export interface RelayReceivedData {
  received_blocks?: Array<Record<string, unknown>>;
  count?: number;
  latest_block?: number;
  fallback_delivered?: boolean;
}

export interface RelayDeliveredData {
  delivered_payloads?: Array<Record<string, unknown>>;
  count?: number;
  latest_block?: number;
}

export interface BeaconHeadersData {
  headers?: Array<Record<string, unknown>>;
  count?: number;
}

export interface FinalityData {
  data?: {
    previous_justified?: { epoch?: string };
    current_justified?: { epoch?: string };
    finalized?: { epoch?: string };
  };
}

export interface MevData {
  block?: string;
  blockHash?: string;
  txScanned?: number;
  totalTx?: number;
  swapCount?: number;
  sandwiches?: Array<Record<string, unknown>>;
  sandwichCount?: number;
  arbitrages?: Array<Record<string, unknown>>;
  arbitrageCount?: number;
  liquidations?: Array<Record<string, unknown>>;
  liquidationCount?: number;
  jitLiquidity?: Array<Record<string, unknown>>;
  jitCount?: number;
  sources?: SourcesInfo;
  note?: string;
}

export interface TrackTxData {
  hash?: string;
  from?: string;
  to?: string | null;
  status?: { pending?: boolean; success?: boolean };
  economics?: Record<string, unknown>;
  inclusion?: Record<string, unknown>;
  pbs_relay?: Record<string, unknown> | null;
  beacon?: Record<string, unknown> | null;
  decoded?: Record<string, unknown> | null;
}

export interface SourcesInfo {
  rpc_http?: string;
  rpc_ws?: string;
  beacon_api?: string;
  relays?: string[];
}

export interface SnapshotData {
  mempool?: MempoolData;
  relays?: {
    received?: Array<Record<string, unknown>>;
    delivered?: Array<Record<string, unknown>>;
  };
  beacon?: {
    headers?: BeaconHeadersData;
    finality?: FinalityData;
  };
  mev?: MevData;
  sources?: SourcesInfo;
}
