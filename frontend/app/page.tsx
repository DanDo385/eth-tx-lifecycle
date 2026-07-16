"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import GlowButton from "./components/GlowButton";
import Panel from "./components/Panel";
import CaptureButton from "./components/CaptureButton";
import MermaidDiagram from "./components/MermaidDiagram";
import LifecycleStepExplainer, { type LifecyclePanel } from "./components/LifecycleStepExplainer";
import StampPricingCard from "./components/StampPricingCard";
import Alert from "./components/Alert";
import TransactionView from "./components/TransactionView";
import BuilderRelayView from "./components/BuilderRelayView";
import RelayDeliveredView from "./components/RelayDeliveredView";
import BeaconHeadersView from "./components/BeaconHeadersView";
import FinalityView from "./components/FinalityView";
import MempoolView from "./components/MempoolView";
import { weiToEth, formatNumber } from "./utils/format";
import type {
  EduEnvelope,
  MempoolData,
  RelayDeliveredData,
  RelayReceivedData,
  BeaconHeadersData,
  FinalityData,
  SnapshotData,
  SourcesInfo,
  TrackTxData,
} from "./types/api";

type ErrState = { title: string; message?: string; hint?: string } | null;

function hasEnvelopeData<T>(value: unknown): value is EduEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    ("data" in (value as Record<string, unknown>) || "error" in (value as Record<string, unknown>))
  );
}

function unwrapData<T>(value: EduEnvelope<T> | T | string | null): T | null {
  if (value == null || typeof value === "string") {
    return null;
  }
  if (hasEnvelopeData<T>(value)) {
    return value.data ?? null;
  }
  return value as T;
}

export default function Page() {
  const [mempool, setMempool] = useState<MempoolData | null>(null);
  const [received, setReceived] = useState<RelayReceivedData | null>(null);
  const [delivered, setDelivered] = useState<RelayDeliveredData | null>(null);
  const [headers, setHeaders] = useState<BeaconHeadersData | null>(null);
  const [finality, setFinality] = useState<FinalityData | null>(null);
  const [sources, setSources] = useState<SourcesInfo | null>(null);
  const [trackHash, setTrackHash] = useState<string>("");
  const [tracked, setTracked] = useState<TrackTxData | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackDetailsHidden, setTrackDetailsHidden] = useState(false);
  const [error, setError] = useState<ErrState>(null);
  const [trackError, setTrackError] = useState<ErrState>(null);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [lastSnapAt, setLastSnapAt] = useState<number>(0);
  const [activePanel, setActivePanel] = useState<LifecyclePanel | null>("wallet");

  const SNAP_TTL_MS = 30_000;
  const mempoolMetrics = mempool?.metrics;
  const avgGasPrice = mempoolMetrics?.avgGasPrice ?? 0;

  const lifecycleButtons: Array<{
    id: LifecyclePanel;
    title: string;
    subtitle: string;
    accentClass: string;
    shouldLoad: boolean;
  }> = [
    {
      id: "wallet",
      title: "1) Wallet send",
      subtitle: "Sign and broadcast",
      accentClass: "border-cyan-400/40",
      shouldLoad: false,
    },
    {
      id: "mempool",
      title: "2) Mempool",
      subtitle: "Pending flow",
      accentClass: "border-cyan-400/40",
      shouldLoad: !mempool,
    },
    {
      id: "received",
      title: "3) Builders/searchers",
      subtitle: "Block construction",
      accentClass: "border-purple-400/40",
      shouldLoad: !received,
    },
    {
      id: "delivered",
      title: "4) Relays",
      subtitle: "Payload handoff",
      accentClass: "border-purple-400/40",
      shouldLoad: !delivered,
    },
    {
      id: "headers",
      title: "5) Validators/proposers",
      subtitle: "Slot proposer",
      accentClass: "border-blue-400/40",
      shouldLoad: !headers,
    },
    {
      id: "finality",
      title: "6) Finality",
      subtitle: "Checkpoint lock",
      accentClass: "border-emerald-400/40",
      shouldLoad: !finality,
    },
  ];

  async function checkBackendHealth() {
    try {
      const r = await fetch("/api/health/ready");
      const isReady = r.ok && (await r.text()) === "READY";
      setBackendReady(isReady);
      return isReady;
    } catch (healthError) {
      console.warn("Backend health check failed:", healthError);
      setBackendReady(false);
      return false;
    }
  }

  async function safeFetch<T>(url: string, init?: RequestInit): Promise<EduEnvelope<T> | T | string | null> {
    setError(null);
    try {
      const res = await fetch(url, init);
      const contentType = res.headers.get("content-type") || "";
      const isJSON = contentType.includes("application/json") || url.endsWith(".json");

      if (!isJSON) {
        if (!res.ok) {
          setError({ title: "Request failed", message: `${res.status} ${res.statusText}` });
          return null;
        }
        return await res.text();
      }

      const payload = (await res.json()) as EduEnvelope<T>;
      if (!res.ok || payload?.error) {
        const errPayload = payload?.error ?? {};
        let errorMessage = errPayload.message || `${res.status} ${res.statusText}`;
        let errorHint = errPayload.hint;

        if (errPayload.kind === "TXPOOL") {
          errorMessage = "Mempool data not available from public RPC";
          errorHint = "Public RPC providers may not expose txpool APIs. Try using a different RPC endpoint.";
        } else if (errPayload.kind === "RELAY") {
          errorMessage = "Relay API temporarily unavailable";
          errorHint = "Public relays may be rate limiting. Try again in a few minutes.";
        } else if (errPayload.kind === "BEACON") {
          errorMessage = "Beacon API temporarily unavailable";
          errorHint = "Public beacon API may be rate limiting. Try again in a few minutes.";
        }

        setError({
          title: errPayload.kind || "Request failed",
          message: errorMessage,
          hint: errorHint,
        });
        return null;
      }

      return payload;
    } catch (err) {
      setError({
        title: "Network error",
        message: err instanceof Error ? err.message : String(err),
        hint: "Ensure the backend is reachable (default http://127.0.0.1:8081)",
      });
      return null;
    }
  }

  async function loadSnapshot() {
    if (backendReady === false) {
      setError({
        title: "Backend not ready",
        message: "The API server is still starting up. Please wait a moment and try again.",
        hint: "This usually takes 10-30 seconds on first startup.",
      });
      return;
    }

    if (backendReady === null) {
      const isReady = await checkBackendHealth();
      if (!isReady) {
        setError({
          title: "Backend not ready",
          message: "The API server is still starting up. Please wait a moment and try again.",
          hint: "This usually takes 10-30 seconds on first startup.",
        });
        return;
      }
    }

    const now = Date.now();
    if (now - lastSnapAt < SNAP_TTL_MS) {
      return;
    }

    const result = await safeFetch<SnapshotData>("/api/snapshot");
    const d = unwrapData<SnapshotData>(result);
    if (!d) return;

    if (d.mempool) {
      setMempool(d.mempool);
    }

    if (d.relays) {
      const receivedBlocks = d.relays.received ?? [];
      const deliveredPayloads = d.relays.delivered ?? [];
      setReceived({ received_blocks: receivedBlocks, count: receivedBlocks.length });
      setDelivered({ delivered_payloads: deliveredPayloads, count: deliveredPayloads.length });
    }

    if (d.beacon) {
      if (d.beacon.headers) setHeaders(d.beacon.headers);
      if (d.beacon.finality) setFinality(d.beacon.finality);
    }

    if (d.sources) {
      setSources(d.sources);
    }

    setLastSnapAt(now);
  }

  const shouldLoadPanel = (panelId: LifecyclePanel) => lifecycleButtons.find((item) => item.id === panelId)?.shouldLoad ?? false;

  const onSelectPanel = async (panelId: LifecyclePanel, shouldLoad = shouldLoadPanel(panelId)) => {
    if (shouldLoad) {
      await loadSnapshot();
    }
    setActivePanel(panelId);
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  useEffect(() => {
    if (
      error &&
      trackHash &&
      (error.title === "TX_NOT_FOUND" || error.title === "Validation" || error.title === "Request failed")
    ) {
      setTrackError(error);
      setError(null);
    }
  }, [error, trackHash]);

  return (
    <main className="max-w-6xl mx-auto px-4 pb-12">
      <header className="my-6 space-y-4">
        <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-6">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Ethereum transaction lifecycle</p>
          <h2 className="mt-1 text-3xl font-bold text-fg">What actually happens after Send?</h2>
          <p className="mt-3 max-w-3xl text-sm text-fg/80">
            Follow a transaction from wallet broadcast through pending flow, builder/relay markets, proposer selection, and finality.
            The goal is a clean walkthrough backed by live network data, not another wall of protocol jargon.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <GlowButton ariaLabel="Start guided journey" compact onClick={() => setActivePanel("wallet")}>
              Start walkthrough
            </GlowButton>
            <Link
              href="/mev-lab"
              className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-100 hover:bg-purple-500/20"
            >
              Go to MEV Lab
            </Link>
          </div>
        </section>

        {backendReady !== null && (
          <div
            className={`rounded-lg border p-3 ${
              backendReady ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${backendReady ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-sm font-medium">{backendReady ? "API Server Ready" : "API Server Not Ready"}</span>
              {!backendReady && (
                <button onClick={checkBackendHealth} className="ml-auto text-xs underline hover:no-underline">
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="my-6 rounded-2xl border border-line/10 bg-fill-subtle/5 p-4">
        <h3 className="mb-3 text-lg font-semibold text-fg">Lifecycle controls</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Lifecycle controls">
          {lifecycleButtons.map((item) => (
            <GlowButton
              key={item.id}
              ariaLabel={`Open ${item.title}`}
              onClick={() => onSelectPanel(item.id, item.shouldLoad)}
              className={`text-left ${item.accentClass} ${activePanel === item.id ? "ring-2 ring-neon-blue" : ""}`}
            >
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-xs text-fg/70">{item.subtitle}</div>
            </GlowButton>
          ))}
        </div>
        <p className="mt-3 text-xs text-fg/60">
          Want extraction details? Use the dedicated{" "}
          <Link href="/mev-lab" className="underline">
            MEV Lab
          </Link>{" "}
          for advanced analysis, pre-vs-post PBS diagrams, and estimate methodology.
        </p>
      </section>

      <div className="mb-8">
        <MermaidDiagram activePanel={activePanel} onSelectPanel={(panelId) => onSelectPanel(panelId)} />
        <LifecycleStepExplainer activePanel={activePanel} />
      </div>

      {activePanel === "wallet" && (
        <Panel id="panel-wallet" title="Wallet send">
          <div className="space-y-3 text-sm text-fg/85">
            <p>
              A wallet signs your transaction locally, then broadcasts it to peers. It is now visible to the network, but it is not
              included in chain history until a block proposal contains it.
            </p>
            <p className="rounded border border-amber-400/20 bg-amber-500/10 p-3 text-fg/85">
              <span className="font-semibold text-amber-200">Technical note:</span> the network does not guarantee
              first-come-first-served ordering. Fee pressure and builder strategy strongly influence what gets included next.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/mev-lab"
                className="rounded border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-100 hover:bg-purple-500/20"
              >
                Open MEV Lab
              </Link>
            </div>
          </div>
        </Panel>
      )}

      {activePanel === "mempool" && (
        <Panel id="panel-mempool" title="Mempool">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-fg/70">
              Pending transactions competing for blockspace. Data comes from <code>txpool_status</code> and <code>txpool_content</code>.
            </p>
            <CaptureButton targetId="panel-mempool" />
          </div>
          <div className="mt-2 text-xs text-fg/60">
            Feeds: WS {sources?.rpc_ws || "unset"}; HTTP {sources?.rpc_http || "unset"}
            {mempool?.source ? ` (source=${mempool.source})` : ""}
          </div>

          {Boolean(mempoolMetrics) && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
                <div className="mb-1 text-xs font-medium text-blue-400">Total Transactions</div>
                <div className="text-2xl font-bold text-fg">{formatNumber(mempool?.count || 0)}</div>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
                <div className="mb-1 text-xs font-medium text-purple-400">Gas Requested</div>
                <div className="text-2xl font-bold text-fg">{formatNumber(mempoolMetrics?.totalGasRequested || 0)}</div>
                <div className="mt-1 text-xs text-fg/60">gas units</div>
              </div>
              <div className="rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/5 p-4">
                <div className="mb-1 text-xs font-medium text-green-400">Total Value</div>
                <div className="text-2xl font-bold text-fg">{weiToEth(mempoolMetrics?.totalValueWei || "0x0")}</div>
                <div className="mt-1 text-xs text-fg/60">ETH</div>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4">
                <div className="mb-1 text-xs font-medium text-orange-400">Avg Gas Price</div>
                <div className="text-2xl font-bold text-fg">{avgGasPrice.toFixed(2)}</div>
                <div className="mt-1 text-xs text-fg/60">gwei</div>
              </div>
            </div>
          )}

          {(mempoolMetrics?.highPriorityCount || 0) > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm">
              <span className="text-red-400">🔥</span>
              <span className="text-fg/90">
                {mempoolMetrics?.highPriorityCount} high-priority tx{mempoolMetrics?.highPriorityCount !== 1 ? "s" : ""} (&gt;50 gwei)
              </span>
            </div>
          )}

          <StampPricingCard avgGasPriceGwei={avgGasPrice} className="mt-4" />
          {mempool ? <MempoolView data={mempool} /> : <p className="mt-4 text-sm text-fg/60">Loading mempool snapshot…</p>}
          <p className="mt-2 text-sm text-fg/60">
            Tip: live feeds use WebSocket <code>eth_subscribe("newPendingTransactions")</code>.
          </p>
        </Panel>
      )}

      {activePanel === "received" && (
        <Panel id="panel-received" variant="alt" title="Builders/searchers">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-fg/70">
              Competing builder proposals for the same slot. This is where optimization and bidding pressure appears.
            </p>
            <CaptureButton targetId="panel-received" />
          </div>
          <div className="mb-3 text-xs text-fg/60">
            Relays (configured): {Array.isArray(sources?.relays) ? sources.relays.join(", ") : "n/a"}
          </div>
          {received ? <BuilderRelayView data={received} /> : <p className="text-fg/60">Loading...</p>}
        </Panel>
      )}

      {activePanel === "delivered" && (
        <Panel id="panel-delivered" title="Relays">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-fg/70">
              Relay delivery view of which payloads reached proposers with payment and transaction count context.
            </p>
            <CaptureButton targetId="panel-delivered" />
          </div>
          <div className="mb-3 text-xs text-fg/60">
            Relays (configured): {Array.isArray(sources?.relays) ? sources.relays.join(", ") : "n/a"}
          </div>
          {delivered ? <RelayDeliveredView data={delivered} /> : <p className="text-fg/60">Loading...</p>}
        </Panel>
      )}

      {activePanel === "headers" && (
        <Panel id="panel-headers" variant="alt" title="Validators/proposers">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-fg/70">
              Consensus-layer headers with builder-payment enrichment when available.
            </p>
            <CaptureButton targetId="panel-headers" />
          </div>
          <div className="mb-3 text-xs text-fg/60">Beacon API: {sources?.beacon_api || "unset"}</div>
          <StampPricingCard avgGasPriceGwei={avgGasPrice} className="mb-3" />
          {headers ? <BeaconHeadersView data={headers} /> : <p className="text-fg/60">Loading...</p>}
        </Panel>
      )}

      {activePanel === "finality" && (
        <Panel id="panel-finality" title="Finality">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-fg/70">
              Finalized and justified checkpoints show when recent proposals become practically irreversible.
            </p>
            <CaptureButton targetId="panel-finality" />
          </div>
          <div className="mb-3 text-xs text-fg/60">Beacon API: {sources?.beacon_api || "unset"}</div>
          {finality ? <FinalityView data={finality} /> : <p className="text-fg/60">Loading...</p>}
        </Panel>
      )}

      <Panel id="panel-tracker" title="Track a transaction">
        <p className="text-fg/70">
          Enter a transaction hash (or type <strong className="text-fg">latest</strong>) to stitch together its journey:
          execution inclusion, relay context, and an approximate finality check.
        </p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            value={trackHash}
            onChange={(event) => setTrackHash(event.target.value)}
            placeholder="0x... or latest"
            aria-label="Transaction hash or latest"
            className="flex-1 rounded border border-line/10 bg-surface/40 px-3 py-2 text-sm"
          />
          <GlowButton
            ariaLabel="Track transaction"
            onClick={async () => {
              if (!trackHash) {
                setTrackError({ title: "Validation", message: "Enter a transaction hash or \"latest\"" });
                return;
              }
              setTracked(null);
              setTrackError(null);
              setTrackLoading(true);
              setTrackDetailsHidden(false);
              const result = await safeFetch<TrackTxData>(`/api/track/tx/${trackHash}`);
              setTrackLoading(false);
              const data = unwrapData<TrackTxData>(result);
              if (data) {
                setTracked(data);
                setTrackError(null);
              }
            }}
          >
            Track
          </GlowButton>
          {tracked && (
            <GlowButton
              ariaLabel={trackDetailsHidden ? "Show transaction details" : "Hide transaction details"}
              onClick={() => setTrackDetailsHidden(!trackDetailsHidden)}
            >
              {trackDetailsHidden ? "Unhide" : "Hide"}
            </GlowButton>
          )}
          <CaptureButton targetId="panel-tracker" />
        </div>
        {!trackDetailsHidden && (
          <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-line/10 bg-surface/40 p-3 text-xs">
            {trackLoading ? (
              <p className="text-fg/60">Loading transaction data...</p>
            ) : tracked ? (
              <TransactionView data={tracked} />
            ) : (
              <p className="text-fg/60">Enter a hash (or &quot;latest&quot;) and click Track.</p>
            )}
          </div>
        )}
        {trackError && (
          <div className="mt-3">
            <Alert title={trackError.title} message={trackError.message} hint={trackError.hint} />
          </div>
        )}
        {error && !trackError ? (
          <div className="mt-3">
            <Alert title={error.title} message={error.message} hint={error.hint} />
          </div>
        ) : null}
        {trackDetailsHidden && tracked && (
          <div className="mt-3 rounded-lg border border-line/10 bg-surface/20 p-3 text-center">
            <p className="text-sm text-fg/60">Transaction details hidden. Click "Unhide" to view.</p>
          </div>
        )}
      </Panel>

      <Panel id="panel-wrap" variant="alt" title="Wrap-up: lifecycle map">
        <ol className="list-decimal space-y-1 pl-5 text-fg/80">
          <li>
            <strong>Wallet send</strong>: user signs and broadcasts a transaction.
          </li>
          <li>
            <strong>Mempool queue</strong>: pending transactions compete via fee pressure.
          </li>
          <li>
            <strong>Builders/searchers</strong>: candidate blocks are optimized and bid.
          </li>
          <li>
            <strong>Relays</strong>: candidate payloads are delivered to proposers.
          </li>
          <li>
            <strong>Validators/proposers</strong>: one proposal is published per slot.
          </li>
          <li>
            <strong>Finality</strong>: justified/finalized checkpoints lock history.
          </li>
        </ol>
        <p className="mt-3 text-xs text-fg/65">
          For extraction economics and pre-vs-post PBS context, continue in{" "}
          <Link href="/mev-lab" className="underline">
            MEV Lab
          </Link>
          .
        </p>
      </Panel>

      <footer className="mt-12 border-t border-line/10 pt-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com/DanQB13"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-fg/70 transition-colors hover:text-fg"
              aria-label="Follow on X/Twitter"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-sm font-medium">@DanQB13</span>
            </a>

            <a
              href="https://github.com/DanDo385/eth-tx-lifecycle"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-fg/70 transition-colors hover:text-fg"
              aria-label="View source on GitHub"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">GitHub</span>
            </a>
          </div>

          <p className="text-xs text-fg/50">Built with ❤️ for Ethereum education</p>
        </div>
      </footer>
    </main>
  );
}
