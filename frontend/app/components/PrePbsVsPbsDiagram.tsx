export default function PrePbsVsPbsDiagram() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <h3 className="text-xl font-semibold text-white">Before PBS vs with PBS/MEV-Boost</h3>
      <p className="mt-1 text-sm text-white/70">
        Both models still process user transactions, but PBS separates specialized block construction from proposer selection.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-red-400/25 bg-red-500/5 p-4">
          <h4 className="font-semibold text-red-300">Before PBS</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Wallet tx enters mempool.</li>
            <li>Proposer must build and order block locally.</li>
            <li>MEV extraction sophistication depends on proposer setup.</li>
            <li>Potentially uneven access to advanced orderflow strategies.</li>
          </ul>
          <div className="mt-3 rounded border border-red-300/25 bg-black/20 p-2 text-xs text-red-100">
            Risk story: validators either miss value or over-optimize for extraction with uneven tooling.
          </div>
        </article>

        <article className="rounded-xl border border-green-400/25 bg-green-500/5 p-4">
          <h4 className="font-semibold text-green-300">With PBS / MEV-Boost</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Wallet tx enters mempool and can be bundled by searchers/builders.</li>
            <li>Builders compete to produce blocks and submit bids.</li>
            <li>Relays verify and forward candidate payloads.</li>
            <li>Proposers pick the best valid bid and publish the block.</li>
          </ul>
          <div className="mt-3 rounded border border-green-300/25 bg-black/20 p-2 text-xs text-green-100">
            Outcome story: role separation increases specialization and exposes clearer builder-payment signals.
          </div>
        </article>
      </div>
    </section>
  );
}
