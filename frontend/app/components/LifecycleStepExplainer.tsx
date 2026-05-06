export type LifecyclePanel = "wallet" | "mempool" | "received" | "delivered" | "headers" | "finality";

type StepExplanation = {
  eyebrow: string;
  title: string;
  summary: string;
  technicalNote: string;
  liveData: string;
};

const stepExplanations: Record<LifecyclePanel, StepExplanation> = {
  wallet: {
    eyebrow: "Step 1 · Wallet send",
    title: "Signing and broadcast",
    summary:
      "Your wallet creates a signed transaction and submits it to Ethereum peers. At this point the transaction is validly formed, but it is not included in a block yet.",
    technicalNote:
      "The private key signs the transaction locally. Nodes can reject malformed, underpriced, or nonce-conflicting transactions before they spread very far.",
    liveData:
      "Track any transaction hash to see whether it is still pending, included in a block, or missing from the configured execution node.",
  },
  mempool: {
    eyebrow: "Step 2 · Mempool",
    title: "Pending flow and fee pressure",
    summary:
      "Pending transactions sit in node-level mempools while validators, builders, and users compete for scarce blockspace. Higher fees can improve priority, but ordering is not first-come, first-served.",
    technicalNote:
      "There is no single global Ethereum mempool. Each node sees a slightly different pending set based on peers, timing, filters, and RPC provider behavior.",
    liveData:
      "The mempool panel shows pending transaction counts, gas requested, value, and gas-price distribution from the configured execution source.",
  },
  received: {
    eyebrow: "Step 3 · Builders/searchers",
    title: "Block construction market",
    summary:
      "Searchers and builders assemble candidate blocks. They optimize transaction ordering, bundle opportunities, and bid for the right to have a payload selected.",
    technicalNote:
      "Builder/searcher activity is economic infrastructure around the protocol. It can improve efficiency, but it also concentrates ordering power in specialized actors.",
    liveData:
      "The builders panel shows competing proposals, bids, and transaction totals for recent slots where relay data is available.",
  },
  delivered: {
    eyebrow: "Step 4 · Relays",
    title: "Payload handoff",
    summary:
      "Relays sit between builders and validators in proposer-builder separation. They forward eligible payloads and expose bidtrace data for delivered blocks.",
    technicalNote:
      "Relay coverage is uneven. Public relay APIs can be sparse or rate-limited, so missing rows do not always mean missing market activity.",
    liveData:
      "The relays panel shows delivered payloads, proposer fee recipients, builder pubkeys, payment values, gas use, and transaction counts where available.",
  },
  headers: {
    eyebrow: "Step 5 · Validators/proposers",
    title: "Block proposal",
    summary:
      "A selected validator proposes one block for the slot. Once the block is published, included transactions move from pending intent to chain history.",
    technicalNote:
      "The proposer can use a local payload or an external builder payload, subject to client policy, relay availability, and protocol constraints.",
    liveData:
      "The headers panel shows recent consensus-layer headers with builder-payment enrichment when matching relay data is available.",
  },
  finality: {
    eyebrow: "Step 6 · Finality",
    title: "Economic lock-in",
    summary:
      "Finality checkpoints show when the chain has enough validator agreement that rewriting history becomes economically unrealistic under normal assumptions.",
    technicalNote:
      "Finality is not the same as first inclusion. A transaction can appear in a block quickly, then become increasingly secure as justified and finalized checkpoints advance.",
    liveData:
      "The finality panel shows current justified and finalized checkpoints from Beacon REST providers, with fallback endpoints if the primary provider is slow.",
  },
};

export default function LifecycleStepExplainer({ activePanel }: { activePanel: LifecyclePanel | null }) {
  const step = stepExplanations[activePanel ?? "wallet"];

  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 shadow-lg shadow-cyan-500/5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-wide text-cyan-200">{step.eyebrow}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/80">{step.summary}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/60">
          Synced to selected step
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Technical note</div>
          <p className="mt-1 text-sm leading-6 text-amber-50/90">{step.technicalNote}</p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Live data</div>
          <p className="mt-1 text-sm leading-6 text-emerald-50/90">{step.liveData}</p>
        </div>
      </div>
    </section>
  );
}
