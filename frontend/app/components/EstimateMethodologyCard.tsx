type EstimateMethodologyCardProps = {
  mevTaggedSharePct: number;
  avgBuilderPaymentEth: number;
  mevEventsPerScannedTx: number;
};

const PRE_PBS_COST_MULTIPLIER = 1.35;
const PRE_PBS_EXTRACTION_MULTIPLIER = 1.6;

export default function EstimateMethodologyCard({
  mevTaggedSharePct,
  avgBuilderPaymentEth,
  mevEventsPerScannedTx,
}: EstimateMethodologyCardProps) {
  const estimatedPrePbsBuilderEquivalent = avgBuilderPaymentEth * PRE_PBS_COST_MULTIPLIER;
  const estimatedPrePbsMevEventRate = mevEventsPerScannedTx * PRE_PBS_EXTRACTION_MULTIPLIER;

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5">
      <h3 className="text-xl font-semibold text-fg">Estimated pre-PBS vs post-PBS comparison</h3>
      <p className="mt-2 text-sm text-fg/75">
        This panel separates observed live signals from assumption-based historical estimates. It is educational guidance, not
        a definitive causal measurement.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-line/15 bg-surface/25 p-3">
          <div className="text-xs text-fg/60">Observed current MEV-tagged block share</div>
          <div className="mt-1 text-2xl font-bold text-fg">{mevTaggedSharePct.toFixed(1)}%</div>
          <div className="text-xs text-emerald-300">Confidence: High (directly from current headers)</div>
        </div>
        <div className="rounded-lg border border-line/15 bg-surface/25 p-3">
          <div className="text-xs text-fg/60">Observed avg builder payment (current)</div>
          <div className="mt-1 text-2xl font-bold text-fg">{avgBuilderPaymentEth.toFixed(4)} ETH</div>
          <div className="text-xs text-emerald-300">Confidence: High (live header enrichment)</div>
        </div>
        <div className="rounded-lg border border-line/15 bg-surface/25 p-3">
          <div className="text-xs text-fg/60">Observed MEV event rate (scan sample)</div>
          <div className="mt-1 text-2xl font-bold text-fg">{(mevEventsPerScannedTx * 100).toFixed(2)}%</div>
          <div className="text-xs text-yellow-300">Confidence: Medium (heuristic detector)</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
          <div className="text-xs text-red-200">Assumption-based estimate: pre-PBS extraction pressure proxy</div>
          <div className="mt-1 text-xl font-semibold text-fg">{(estimatedPrePbsMevEventRate * 100).toFixed(2)}%</div>
          <p className="mt-1 text-xs text-red-100">
            Uses multiplier {PRE_PBS_EXTRACTION_MULTIPLIER}x applied to current heuristic event rate.
          </p>
        </div>
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
          <div className="text-xs text-red-200">Assumption-based estimate: pre-PBS value concentration proxy</div>
          <div className="mt-1 text-xl font-semibold text-fg">{estimatedPrePbsBuilderEquivalent.toFixed(4)} ETH</div>
          <p className="mt-1 text-xs text-red-100">
            Uses multiplier {PRE_PBS_COST_MULTIPLIER}x applied to current average builder payment signal.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded border border-line/15 bg-surface/30 p-3 text-xs text-fg/65">
        Methodology notes: multipliers are configurable educational assumptions. Use this panel to reason about incentives, not
        to claim precise historical costs. For publication-quality claims, pair with peer-reviewed studies and archived datasets.
      </div>
    </section>
  );
}
