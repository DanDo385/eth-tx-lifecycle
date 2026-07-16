import { getLifecycleStep, type LifecycleStepId } from '../../lib/lifecycleSteps';

export type LifecyclePanel = LifecycleStepId;

export default function LifecycleStepExplainer({ activePanel }: { activePanel: LifecyclePanel | null }) {
  const step = getLifecycleStep(activePanel);

  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 shadow-lg shadow-cyan-500/5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-wide text-cyan-200">{step.eyebrow}</p>
          <h3 className="mt-1 text-xl font-semibold text-fg">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-fg/80">{step.summary}</p>
        </div>
        <div className="rounded-full border border-line/10 bg-surface/30 px-3 py-1 text-xs text-fg/60">
          Synced to selected step
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Technical note</div>
          {/* Body uses theme fg tokens so light mode stays readable (not near-white amber-50). */}
          <p className="mt-1 text-sm leading-6 text-fg/85">{step.technicalNote}</p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Live data</div>
          <p className="mt-1 text-sm leading-6 text-fg/85">{step.liveData}</p>
        </div>
      </div>
    </section>
  );
}
