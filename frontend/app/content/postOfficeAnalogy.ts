import visuals from "./postOfficeAnalogyVisuals.json";

export type PostOfficeAnalogyStep = {
  id: number;
  ethStep: string;
  analogyTitle: string;
  analogySummary: string;
  learnMore: string;
  realityCheck: string;
  dataProves: string;
  imageSrc: string;
  imagePrompt: string;
};

export const ANALOGY_IMAGE_STYLE =
  "Clean educational illustration, cinematic but simple, no text in image, high contrast, dark-theme compatible, 16:9 composition, warm post office lighting.";

const textById: Record<number, Omit<PostOfficeAnalogyStep, "ethStep" | "imageSrc" | "imagePrompt">> = {
  1: {
    id: 1,
    analogyTitle: "Drop a letter into the mailbox",
    analogySummary: "A sender writes a letter, pays a stamp, and drops it into a public mailbox to start delivery.",
    learnMore:
      "This mirrors signing and broadcasting: your wallet creates a transaction and submits it to Ethereum peers.",
    realityCheck:
      "Wallets sign transactions with private keys and broadcast to nodes; no central post office exists.",
    dataProves:
      "You can verify this entry point by tracking any tx hash and seeing where it first appears pending.",
  },
  2: {
    id: 2,
    analogyTitle: "Local sorting room queue",
    analogySummary: "Mail accumulates in sorting bins, and higher-priority stamps are often moved toward the next outgoing bag.",
    learnMore:
      "This mirrors the mempool: pending transactions wait while fees and congestion influence ordering pressure.",
    realityCheck:
      "Ethereum mempools are distributed and can differ by node, so there is no single global queue.",
    dataProves:
      "Step 1 mempool panel shows pending counts and gas-price distribution from your configured execution source.",
  },
  3: {
    id: 3,
    analogyTitle: "Logistics optimizers assemble route plans",
    analogySummary: "Specialized logistics teams build different route bags and compete to make their plan most attractive.",
    learnMore:
      "This mirrors builder/searcher competition: candidate blocks are optimized and bid into the market.",
    realityCheck:
      "Searchers and builders optimize transaction ordering and value capture, not physical routes.",
    dataProves:
      "Step 2 builders panel shows competing proposals, bids, and transaction totals for the same slot.",
  },
  4: {
    id: 4,
    analogyTitle: "Trusted handoff depots",
    analogySummary: "A trusted depot checks bags and forwards the best eligible dispatch package to the local authority.",
    learnMore:
      "This mirrors relay delivery: relays pass winning payloads toward proposers while exposing bidtrace information.",
    realityCheck:
      "Relays are optional off-chain infrastructure, and not every delivered block surface is uniformly available.",
    dataProves:
      "Step 3 relay panel shows delivered payloads and winner-side payment signals from configured relays.",
  },
  5: {
    id: 5,
    analogyTitle: "Dispatch authority sends the truck",
    analogySummary: "One dispatch authority chooses a valid bag and sends the truck, making that batch part of official records.",
    learnMore:
      "This mirrors block proposal: proposer selection finalizes one candidate block per slot for chain inclusion.",
    realityCheck:
      "Proposers choose among available payloads under protocol constraints and local client policy.",
    dataProves:
      "Step 4 proposed blocks panel shows on-chain headers with builder-payment enrichment where available.",
  },
  6: {
    id: 6,
    analogyTitle: "Certified delivery lock",
    analogySummary: "After enough confirmations, deliveries get a certified lock in the archive and become practically irreversible.",
    learnMore:
      "This mirrors Casper-FFG finality checkpoints: justified and finalized epochs harden transaction history.",
    realityCheck:
      "Finality is probabilistic over short windows, then economically irreversible once finalized under protocol rules.",
    dataProves:
      "Step 5 finality panel shows current justified and finalized checkpoints directly from beacon APIs.",
  },
};

type VisualStep = {
  id: number;
  ethStep: string;
  imageSrc: string;
  imagePrompt: string;
};

export const postOfficeAnalogySteps: PostOfficeAnalogyStep[] = (visuals as VisualStep[]).map((step) => ({
  ...textById[step.id],
  ethStep: step.ethStep,
  imageSrc: step.imageSrc,
  imagePrompt: step.imagePrompt,
}));
