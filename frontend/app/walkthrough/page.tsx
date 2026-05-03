"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const stages = [
  {
    key: "wallet",
    title: "1. Click Send",
    label: "Label created",
    analogy: "Your wallet creates the package label and receipt: the transaction hash.",
    technical: "Signed transaction leaves the wallet.",
  },
  {
    key: "mempool",
    title: "2. Mempool",
    label: "Drop-off bin",
    analogy: "The package waits with everyone else's packages. Gas is the priority shipping bid.",
    technical: "Pending transaction is visible before inclusion.",
  },
  {
    key: "builders",
    title: "3. Builders + Relays",
    label: "Pack the truck",
    analogy: "Specialized logistics companies compete to assemble the most valuable delivery truck.",
    technical: "Block builders order transactions and relays pass bids to validators.",
  },
  {
    key: "mev",
    title: "4. MEV Risk",
    label: "Sorting-center games",
    analogy: "If someone sees a valuable package in the waiting room, they may reorder around it for profit.",
    technical: "A sandwich inserts one transaction before and one after the user.",
  },
  {
    key: "validator",
    title: "5. Validator",
    label: "Delivery accepted",
    analogy: "The winning truck is accepted by the driver and starts becoming part of history.",
    technical: "A validator proposes the block.",
  },
  {
    key: "finality",
    title: "6. Finality",
    label: "Signed delivery",
    analogy: "The receipt is locked in. Reversing it is no longer realistic.",
    technical: "Consensus finality makes the transaction economically irreversible.",
  },
];

function PackageTracker({ activeIndex }: { activeIndex: number }) {
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (stages.length - 1)) * 100;

  return (
    <div className="rounded-3xl border border-blue-400/30 bg-gradient-to-br from-slate-950 via-blue-950/40 to-purple-950/30 p-6 shadow-2xl shadow-blue-950/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-blue-300">Transaction walkthrough auto tour</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">You clicked Send. Now what?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            An Ethereum transaction is like a package with a public tracking number. This route is the clean recording surface: no raw JSON, no jargon wall, just the journey from wallet to finality.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-center md:block">
          <div className="text-4xl">📦</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-blue-200">tracking hash</div>
          <div className="mt-1 font-mono text-sm text-white/80">0xSEND…FINAL</div>
        </div>
      </div>

      <div className="relative mt-8 h-24">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded bg-white/10" />
        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded bg-gradient-to-r from-blue-400 to-emerald-300 transition-all duration-700" style={{ width: `${progress}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-700" style={{ left: `calc(${progress}% - 18px)` }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-500 text-xl shadow-lg shadow-blue-500/40">📦</div>
        </div>
        <div className="relative z-10 grid grid-cols-6 gap-2">
          {stages.map((stage, index) => (
            <div key={stage.key} className="flex flex-col items-center gap-2 text-center">
              <div className={`h-4 w-4 rounded-full border transition ${index <= activeIndex ? "border-emerald-200 bg-emerald-400" : "border-white/25 bg-slate-900"}`} />
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${index === activeIndex ? "text-white" : "text-white/45"}`}>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MEVMiniAnimation() {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-amber-200">MEV mini-animation</div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-red-100">Bot buy goes before you</div>
        <div className="rounded-lg border border-blue-400/40 bg-blue-500/15 px-3 py-2 text-blue-100">Your swap executes at worse price</div>
        <div className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-red-100">Bot sell goes after you</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-amber-100/80">This is the sandwich: profit from ordering, not from improving the user's trade.</p>
    </div>
  );
}

export default function WalkthroughPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoTour, setAutoTour] = useState(false);
  const activeStage = stages[activeIndex];

  useEffect(() => {
    if (!autoTour) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= stages.length - 1) {
          setAutoTour(false);
          return current;
        }
        return current + 1;
      });
    }, 2600);
    return () => window.clearInterval(timer);
  }, [autoTour]);

  const scriptLine = useMemo(() => {
    if (activeStage.key === "wallet") return "When you send ETH, it does not instantly land on-chain. It enters a public delivery network.";
    if (activeStage.key === "mempool") return "First stop: the mempool. Think of it as the drop-off bin. Gas fees are priority shipping bids.";
    if (activeStage.key === "builders") return "Builders compete to pack the most valuable delivery truck, then relays pass winning bids to validators.";
    if (activeStage.key === "mev") return "Because the waiting room is visible, sophisticated bots can sometimes reorder transactions for profit. That's MEV.";
    if (activeStage.key === "validator") return "A validator accepts the winning block and proposes it to Ethereum.";
    return "After finality, it is not just confirmed. It is economically irreversible.";
  }, [activeStage]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-blue-300 hover:text-blue-200">← Full technical explorer</Link>
        <div className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-200">Transaction walkthrough</div>
      </div>

      <PackageTracker activeIndex={activeIndex} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm text-blue-300">Current stage</div>
              <h2 className="mt-1 text-2xl font-bold text-white">{activeStage.title}</h2>
              <p className="mt-3 text-lg leading-8 text-white/85">{scriptLine}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setActiveIndex(0); setAutoTour(true); }} className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400">Track a transaction</button>
              <button onClick={() => { setAutoTour(false); setActiveIndex((i) => Math.min(i + 1, stages.length - 1)); }} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/85 hover:bg-white/10">Next</button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-widest text-white/45">Analogy</div>
              <p className="mt-2 text-sm leading-6 text-white/80">{activeStage.analogy}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-widest text-white/45">Real protocol term</div>
              <p className="mt-2 text-sm leading-6 text-white/80">{activeStage.technical}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <MEVMiniAnimation />
          <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-purple-200">Thumbnail</div>
            <div className="mt-3 rounded-xl bg-black/40 p-5 text-center">
              <div className="text-2xl font-black text-white">YOU CLICKED SEND.</div>
              <div className="mt-1 text-xl font-black text-blue-200">NOW WHAT?</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-widest text-purple-200">Transaction walkthrough</div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
