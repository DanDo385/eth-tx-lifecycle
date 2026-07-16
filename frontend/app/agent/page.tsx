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
      <div className="agent-shell">
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
          <div className="section-label">Canonical context</div>
          <div className="agent-context">
            <div>
              <h2>What this site wants agents to know</h2>
              <p>{SITE.description}</p>
              <p className="agent-hook">
                <strong>{manifest.about.emotionalHook}</strong>
                <span>{manifest.about.technicalHook}</span>
              </p>
              <ul className="agent-topic-list">
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
          <div className="agent-step-grid">
            {manifest.about.lifecycleSteps.map((step) => (
              <article key={step.id} className="agent-card agent-step-card">
                <span className="agent-card-label">
                  {String(step.order).padStart(2, '0')} · {step.label}
                </span>
                <h2>{step.title}</h2>
                <p>{step.summary}</p>
                <a className="agent-step-link" href={step.href}>
                  Open step surface
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="agent-section">
          <div className="section-label">Public API (same-origin)</div>
          <p className="agent-section-intro">{manifest.about.degradedMode}</p>
          <ul className="agent-api-list">
            {manifest.api.endpoints.map((endpoint) => (
              <li key={endpoint.path} className="agent-api-row">
                <a href={endpoint.href} className="agent-api-method">
                  <span className="agent-api-verb">{endpoint.method}</span>
                  <span className="agent-api-path">{endpoint.path}</span>
                </a>
                <p className="agent-api-purpose">{endpoint.purpose}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="agent-section">
          <div className="section-label">Reading order</div>
          <ol className="agent-reading-list">
            {manifest.agentMode.readingOrder.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        <section className="agent-section">
          <div className="section-label">Manifest preview</div>
          <p className="agent-section-intro">
            Machines should fetch{' '}
            <a href="/agent.json" className="underline">
              /agent.json
            </a>{' '}
            directly. This is a human-readable preview of the same payload.
          </p>
          <pre className="agent-code">
            <code>{prettyManifest}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
