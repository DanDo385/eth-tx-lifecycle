"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "../components/Alert";
import GlowButton from "../components/GlowButton";
import Panel from "../components/Panel";
import MEVView from "../components/MEVView";
import PrePbsVsPbsDiagram from "../components/PrePbsVsPbsDiagram";
import EstimateMethodologyCard from "../components/EstimateMethodologyCard";
import type { BeaconHeadersData, EduEnvelope, MevData } from "../types/api";

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

export default function MevLabPage() {
  const [mev, setMev] = useState<MevData | null>(null);
  const [headers, setHeaders] = useState<BeaconHeadersData | null>(null);
  const [blockInput, setBlockInput] = useState<string>("latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrState>(null);

  async function safeFetch<T>(url: string): Promise<EduEnvelope<T> | T | string | null> {
    setError(null);
    try {
      const res = await fetch(url);
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
        setError({
          title: payload?.error?.kind || "Request failed",
          message: payload?.error?.message || `${res.status} ${res.statusText}`,
          hint: payload?.error?.hint,
        });
        return null;
      }
      return payload;
    } catch (err) {
      setError({
        title: "Network error",
        message: err instanceof Error ? err.message : String(err),
        hint: "Ensure frontend proxy and backend are running.",
      });
      return null;
    }
  }

  async function loadBaseline() {
    const [headersRes, mevRes] = await Promise.all([
      safeFetch<BeaconHeadersData>("/api/validators/head"),
      safeFetch<MevData>("/api/mev/sandwich?block=latest"),
    ]);
    const headersData = unwrapData<BeaconHeadersData>(headersRes);
    if (headersData) setHeaders(headersData);
    const mevData = unwrapData<MevData>(mevRes);
    if (mevData) setMev(mevData);
  }

  async function analyzeBlock(target: string) {
    setLoading(true);
    const result = await safeFetch<MevData>(`/api/mev/sandwich?block=${encodeURIComponent(target || "latest")}`);
    const data = unwrapData<MevData>(result);
    if (data) setMev(data);
    setLoading(false);
  }

  useEffect(() => {
    loadBaseline();
  }, []);

  const comparisonSignals = useMemo(() => {
    const headerRows = Array.isArray(headers?.headers) ? headers.headers : [];
    const mevTagged = headerRows.filter((row) => typeof row.builder_payment_eth === "string" && row.builder_payment_eth !== "0x0");
    const mevTaggedSharePct = headerRows.length > 0 ? (mevTagged.length / headerRows.length) * 100 : 0;

    const builderPaymentSum = mevTagged.reduce((sum, row) => {
      const payment = typeof row.builder_payment_eth === "string" ? BigInt(row.builder_payment_eth) : 0n;
      return sum + payment;
    }, 0n);
    const avgBuilderPaymentEth = mevTagged.length > 0 ? Number(builderPaymentSum) / mevTagged.length / 1e18 : 0;

    const totalEvents =
      (mev?.sandwiches?.length ?? 0) +
      (mev?.arbitrages?.length ?? 0) +
      (mev?.liquidations?.length ?? 0) +
      (mev?.jitLiquidity?.length ?? 0);
    const scannedTx = mev?.txScanned ?? 0;
    const mevEventsPerScannedTx = scannedTx > 0 ? totalEvents / scannedTx : 0;

    return { mevTaggedSharePct, avgBuilderPaymentEth, mevEventsPerScannedTx };
  }, [headers, mev]);

  return (
    <main className="max-w-6xl mx-auto px-4 pb-12 space-y-6">
      <section className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/15 to-blue-500/10 p-6">
        <p className="text-xs uppercase tracking-wide text-purple-200">Advanced track</p>
        <h2 className="mt-1 text-3xl font-bold text-white">MEV Lab</h2>
        <p className="mt-2 text-sm text-white/80">
          Explore real-world MEV patterns, how MEV-Boost and PBS changed block-building roles, and where extraction pressure
          still appears today.
        </p>
      </section>

      <Panel title="What MEV means in plain language" id="mev-lab-primer">
        <div className="space-y-3 text-sm text-white/85">
          <p>
            MEV is value captured by changing transaction order. In a post office analogy, it is like routing teams that can
            rearrange outgoing mail bags to profit from who gets processed first.
          </p>
          <p className="rounded-lg border border-orange-400/20 bg-orange-500/10 p-3 text-orange-100">
            Educational warning: detection here uses heuristics. It is great for learning patterns but not suitable for legal
            attribution or production forensics.
          </p>
        </div>
      </Panel>

      <PrePbsVsPbsDiagram />

      <Panel id="mev-detector-live" variant="alt" title="Live MEV detector">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/75 md:max-w-2xl">
            Scan a block for sandwich, arbitrage, liquidation, and JIT-liquidity patterns. Use <code>latest</code> for a quick
            sample or enter an explicit block number/tag.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={blockInput}
              onChange={(event) => setBlockInput(event.target.value)}
              placeholder="latest or block number"
              aria-label="Block number or latest"
              className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm"
            />
            <GlowButton
              ariaLabel="Analyze MEV block"
              compact
              disabled={loading}
              onClick={() => analyzeBlock(blockInput || "latest")}
            >
              {loading ? "Analyzing..." : "Analyze block"}
            </GlowButton>
          </div>
        </div>
        {mev ? <MEVView data={mev} /> : <p className="mt-3 text-sm text-white/60">Loading baseline scan...</p>}
      </Panel>

      <EstimateMethodologyCard
        mevTaggedSharePct={comparisonSignals.mevTaggedSharePct}
        avgBuilderPaymentEth={comparisonSignals.avgBuilderPaymentEth}
        mevEventsPerScannedTx={comparisonSignals.mevEventsPerScannedTx}
      />

      <Panel id="mev-lab-method" title="How to read these comparisons">
        <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
          <li>Observed signals come from current live endpoints (`/api/validators/head`, `/api/mev/sandwich`).</li>
          <li>Pre-PBS values shown here are explicit educational estimates with visible assumptions.</li>
          <li>Use this as an incentives explainer, not a precise historical accounting system.</li>
        </ul>
      </Panel>

      {error && <Alert title={error.title} message={error.message} hint={error.hint} />}
    </main>
  );
}
