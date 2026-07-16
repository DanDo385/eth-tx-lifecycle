import type { Metadata } from 'next';
import Link from 'next/link';
import { getAgentManifest } from '../../lib/agent';
import { SITE } from '../../lib/constants';

export const metadata: Metadata = {
  title: 'Agent Mode | Ethereum Transaction Lifecycle',
  description:
    'Structured, low-noise context for AI agents exploring the Ethereum transaction lifecycle visualizer.',
  alternates: { canonical: '/agent/' },
};

export default function AgentPage() {
  const manifest = getAgentManifest();
  const prettyManifest = JSON.stringify(manifest, null, 2);

  return (
    <main className="agent-page">
      <header className="agent-hero">
        <p className="agent-kicker">Agent Mode</p>
        <h1>Human pages for humans. Structured context for agents.</h1>
        <p>
          Agent Mode exposes canonical, low-noise context so AI systems do not have to infer meaning from
          decorative HTML. This site publishes a human overview, a JSON manifest with lifecycle steps and
          public API paths, and an LLM router.
        </p>
        <div className="agent-actions">
          <a href="/agent.json" className="agent-action">
            agent.json
          </a>
          <a href="/llms.txt" className="agent-action">
            llms.txt
          </a>
          <Link href="/" className="agent-action muted">
            Lifecycle Guide
          </Link>
          <Link href="/mev-lab" className="agent-action muted">
            MEV Lab
          </Link>
        </div>
      </header>

      <section className="agent-grid" aria-label="Agent Mode endpoints">
        <article className="agent-card">
          <span className="agent-card-label">01</span>
          <h2>/agent/</h2>
          <p>
            Human-readable explanation of the contract: what this product is, what agents should read first,
            and how the lifecycle story is organized.
          </p>
        </article>
        <article className="agent-card">
          <span className="agent-card-label">02</span>
          <h2>/agent.json</h2>
          <p>
            Structured context: site metadata, six lifecycle steps, demos, public API map, topics, and
            canonical links in one stable JSON surface.
          </p>
        </article>
        <article className="agent-card">
          <span className="agent-card-label">03</span>
          <h2>/llms.txt</h2>
          <p>
            A compact router for language models. It points agents at the important pages, steps, and probes
            before they fall into layout noise.
          </p>
        </article>
      </section>

      <section className="agent-section">
        <div className="section-label">Canonical Context</div>
        <div className="agent-context">
          <div>
            <h2>What this site wants agents to know</h2>
            <p>{SITE.description}</p>
            <p className="mt-2 text-sm text-fg/80">
              <strong>{manifest.about.emotionalHook}</strong> {manifest.about.technicalHook}
            </p>
            <ul>
              {manifest.canonicalTopics.slice(0, 8).map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
          <div className="agent-principles">
            <h3>Use guidelines</h3>
            <ul>
              {manifest.agentMode.principles.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="agent-section">
        <div className="section-label">Lifecycle steps</div>
        <ul className="agent-context" style={{ display: 'grid', gap: '0.75rem' }}>
          {manifest.about.lifecycleSteps.map((step) => (
            <li key={step.id} className="agent-card" style={{ listStyle: 'none' }}>
              <span className="agent-card-label">
                {step.order}. {step.label}
              </span>
              <h2 style={{ fontSize: '1rem' }}>{step.title}</h2>
              <p>{step.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="agent-section">
        <div className="section-label">Public API (same-origin)</div>
        <ul className="agent-context" style={{ display: 'grid', gap: '0.35rem' }}>
          {manifest.api.endpoints.map((endpoint) => (
            <li key={endpoint.path}>
              <a href={endpoint.href} className="agent-action muted" style={{ marginRight: '0.5rem' }}>
                {endpoint.method} {endpoint.path}
              </a>
              <span className="text-sm text-fg/80">{endpoint.purpose}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-fg/70">{manifest.about.degradedMode}</p>
      </section>

      <section className="agent-section">
        <div className="section-label">Reading order</div>
        <ol className="pl-5 text-sm text-fg/85" style={{ display: 'grid', gap: '0.35rem' }}>
          {manifest.agentMode.readingOrder.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="agent-section">
        <div className="section-label">Manifest Preview</div>
        <pre className="agent-code">
          <code>{prettyManifest}</code>
        </pre>
      </section>
    </main>
  );
}
