import { postOfficeAnalogySteps } from "../content/postOfficeAnalogy";

export default function PostOfficeAnalogy() {
  return (
    <section
      id="post-office-analogy"
      aria-label="Transaction lifecycle analogy for the six steps"
      className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 md:p-5"
    >
      <div className="mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-neon-blue">Transaction path, in plain English</h3>
        <p className="mt-1 text-sm text-white/70">
          The analogy is a bridge, not the point. Each card keeps the technical boundary clear.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {postOfficeAnalogySteps.map((step) => (
          <article key={step.id} className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
            <img
              src={step.imageSrc}
              alt={`Step ${step.id} visual: ${step.analogyTitle}`}
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
            <div className="p-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/50">Step {step.id} - {step.ethStep}</p>
              <h4 className="font-semibold text-white">{step.analogyTitle}</h4>
              <p className="text-sm text-white/80">{step.analogySummary}</p>
              <p className="text-xs text-neon-blue/90" title={step.learnMore}>
                {step.learnMore}
              </p>
              <p className="rounded border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                Technical note: {step.realityCheck}
              </p>
              <p className="text-xs text-emerald-300">Live data: {step.dataProves}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
