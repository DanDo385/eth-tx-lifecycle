export default function ForNormiesDemoDirector() {
  const beats = [
    ["1", "Click Send", "A user signs a transaction. Treat it like a package entering the mail system."],
    ["2", "Mempool", "The transaction waits with everyone else. Fees are the postage and priority signal."],
    ["3", "Builders + relays", "Specialized actors assemble blocks and bid for the right to deliver them."],
    ["4", "Validator", "One block gets proposed. The winner becomes part of Ethereum history."],
    ["5", "Finality", "After enough attestations, rewriting the transaction becomes economically unrealistic."],
    ["6", "MEV", "Some actors can profit from ordering. The tool makes the invisible market visible."],
  ];

  return (
    <section className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/15 via-black/40 to-purple-500/15 p-5 shadow-xl shadow-blue-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-blue-300">for-normies · Loom recording spine</div>
          <h2 className="mt-1 text-2xl font-bold text-white">You clicked send. Where did your money actually go?</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Record this as a clear public explainer, not a protocol lecture. Keep the analogy simple: transactions are packages, gas is postage,
            builders are logistics companies, validators are final delivery, and finality is the receipt that cannot realistically be reversed.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">
          <div className="font-semibold text-white">Best GIF loop</div>
          <div>Package route: mempool → builder → validator → finalized</div>
          <div className="mt-2 font-semibold text-white">Thumbnail hook</div>
          <div>YOU CLICKED SEND. NOW WHAT?</div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        {beats.map(([step, title, detail]) => (
          <div key={step} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="h-7 w-7 rounded-full bg-blue-500/25 text-blue-200 flex items-center justify-center text-sm font-bold">{step}</div>
            <div className="mt-2 text-sm font-semibold text-white">{title}</div>
            <p className="mt-1 text-xs leading-5 text-white/65">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
