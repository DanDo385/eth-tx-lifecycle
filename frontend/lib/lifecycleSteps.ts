export type LifecycleStepId =
  | 'wallet'
  | 'mempool'
  | 'received'
  | 'delivered'
  | 'headers'
  | 'finality';

export type LifecycleStep = {
  id: LifecycleStepId;
  order: number;
  eyebrow: string;
  title: string;
  label: string;
  summary: string;
  technicalNote: string;
  liveData: string;
  panelPath: string;
};

/** Canonical six-step lifecycle story shared by UI explainer + Agent Mode. */
export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'wallet',
    order: 1,
    eyebrow: 'Step 1 · Wallet send',
    title: 'Signing and broadcast',
    label: 'Wallet send',
    summary:
      'Your wallet creates a signed transaction and submits it to Ethereum peers. At this point the transaction is validly formed, but it is not included in a block yet.',
    technicalNote:
      'The private key signs the transaction locally. Nodes can reject malformed, underpriced, or nonce-conflicting transactions before they spread very far.',
    liveData:
      'Track any transaction hash to see whether it is still pending, included in a block, or missing from the configured execution node.',
    panelPath: '/#panel-wallet',
  },
  {
    id: 'mempool',
    order: 2,
    eyebrow: 'Step 2 · Mempool',
    title: 'Pending flow and fee pressure',
    label: 'Mempool',
    summary:
      'Pending transactions sit in node-level mempools while validators, builders, and users compete for scarce blockspace. Higher fees can improve priority, but ordering is not first-come, first-served.',
    technicalNote:
      'There is no single global Ethereum mempool. Each node sees a slightly different pending set based on peers, timing, filters, and RPC provider behavior.',
    liveData:
      'The mempool panel shows pending transaction counts, gas requested, value, and gas-price distribution from the configured execution source.',
    panelPath: '/#panel-mempool',
  },
  {
    id: 'received',
    order: 3,
    eyebrow: 'Step 3 · Builders/searchers',
    title: 'Block construction market',
    label: 'Builders/searchers',
    summary:
      'Searchers and builders assemble candidate blocks. They optimize transaction ordering, bundle opportunities, and bid for the right to have a payload selected.',
    technicalNote:
      'Builder/searcher activity is economic infrastructure around the protocol. It can improve efficiency, but it also concentrates ordering power in specialized actors.',
    liveData:
      'The builders panel shows competing proposals, bids, and transaction totals for recent slots where relay data is available.',
    panelPath: '/#panel-received',
  },
  {
    id: 'delivered',
    order: 4,
    eyebrow: 'Step 4 · Relays',
    title: 'Payload handoff',
    label: 'Relays',
    summary:
      'Relays sit between builders and validators in proposer-builder separation. They forward eligible payloads and expose bidtrace data for delivered blocks.',
    technicalNote:
      'Relay coverage is uneven. Public relay APIs can be sparse or rate-limited, so missing rows do not always mean missing market activity.',
    liveData:
      'The relays panel shows delivered payloads, proposer fee recipients, builder pubkeys, payment values, gas use, and transaction counts where available.',
    panelPath: '/#panel-delivered',
  },
  {
    id: 'headers',
    order: 5,
    eyebrow: 'Step 5 · Validators/proposers',
    title: 'Block proposal',
    label: 'Validators/proposers',
    summary:
      'A selected validator proposes one block for the slot. Once the block is published, included transactions move from pending intent to chain history.',
    technicalNote:
      'The proposer can use a local payload or an external builder payload, subject to client policy, relay availability, and protocol constraints.',
    liveData:
      'The headers panel shows recent consensus-layer headers with builder-payment enrichment when matching relay data is available.',
    panelPath: '/#panel-headers',
  },
  {
    id: 'finality',
    order: 6,
    eyebrow: 'Step 6 · Finality',
    title: 'Economic lock-in',
    label: 'Finality',
    summary:
      'Finality checkpoints show when the chain has enough validator agreement that rewriting history becomes economically unrealistic under normal assumptions.',
    technicalNote:
      'Finality is not the same as first inclusion. A transaction can appear in a block quickly, then become increasingly secure as justified and finalized checkpoints advance.',
    liveData:
      'The finality panel shows current justified and finalized checkpoints from Beacon REST providers, with fallback endpoints if the primary provider is slow.',
    panelPath: '/#panel-finality',
  },
];

export function getLifecycleStep(id: LifecycleStepId | null | undefined): LifecycleStep {
  return LIFECYCLE_STEPS.find((step) => step.id === id) ?? LIFECYCLE_STEPS[0];
}
