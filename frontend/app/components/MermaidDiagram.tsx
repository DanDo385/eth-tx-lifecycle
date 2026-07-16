"use client";

import type { LifecyclePanel } from "./LifecycleStepExplainer";

type DiagramStep = {
  id: LifecyclePanel;
  label: string;
  detail: string;
  color: string;
  activeColor: string;
};

const steps: DiagramStep[] = [
  {
    id: "wallet",
    label: "Wallet",
    detail: "sign + broadcast",
    color: "border-cyan-400/30 bg-cyan-500/10",
    activeColor: "border-cyan-300 bg-cyan-500/25 shadow-cyan-400/20",
  },
  {
    id: "mempool",
    label: "Mempool",
    detail: "pending flow",
    color: "border-green-400/30 bg-green-500/10",
    activeColor: "border-green-300 bg-green-500/25 shadow-green-400/20",
  },
  {
    id: "received",
    label: "Builders",
    detail: "block construction",
    color: "border-blue-400/30 bg-blue-500/10",
    activeColor: "border-blue-300 bg-blue-500/25 shadow-blue-400/20",
  },
  {
    id: "delivered",
    label: "Relays",
    detail: "payload handoff",
    color: "border-purple-400/30 bg-purple-500/10",
    activeColor: "border-purple-300 bg-purple-500/25 shadow-purple-400/20",
  },
  {
    id: "headers",
    label: "Proposal",
    detail: "slot winner",
    color: "border-yellow-400/30 bg-yellow-500/10",
    activeColor: "border-yellow-300 bg-yellow-500/25 shadow-yellow-400/20",
  },
  {
    id: "finality",
    label: "Finality",
    detail: "checkpoint lock",
    color: "border-emerald-400/30 bg-emerald-500/10",
    activeColor: "border-emerald-300 bg-emerald-500/25 shadow-emerald-400/20",
  },
];

export default function MermaidDiagram({
  activePanel,
  onSelectPanel,
}: {
  activePanel: LifecyclePanel | null;
  onSelectPanel: (panel: LifecyclePanel) => void;
}) {
  return (
    <section className="rounded-xl border border-line/10 bg-surface/30 p-4 md:p-5" aria-label="Interactive transaction flow diagram">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neon-blue">Transaction Flow</h2>
          <p className="mt-1 text-sm text-fg/60">Select a step to update the explanation and data panel below.</p>
        </div>
        <div className="text-xs text-fg/50">Wallet → Mempool → Builders → Relays → Proposal → Finality</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6" role="list">
        {steps.map((step, index) => {
          const isActive = activePanel === step.id;
          return (
            <button
              key={step.id}
              type="button"
              role="listitem"
              aria-pressed={isActive}
              onClick={() => onSelectPanel(step.id)}
              className={`relative min-h-24 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-fill-subtle/10 ${
                isActive ? `${step.activeColor} shadow-lg` : step.color
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-fg/50">Step {index + 1}</div>
              <div className="mt-2 text-base font-semibold text-fg">{step.label}</div>
              <div className="mt-1 text-xs text-fg/65">{step.detail}</div>
              {index < steps.length - 1 && (
                <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-fill-subtle/30 md:block" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
