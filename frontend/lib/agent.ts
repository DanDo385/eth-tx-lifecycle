import { CONTACT, OWNER, SITE } from './constants';
import { LIFECYCLE_STEPS } from './lifecycleSteps';
import { NAV_LINKS } from './nav';

const PRINCIPLES = [
  'Canonical product context lives on this site Agent Mode surfaces: /agent/, /agent.json, and /llms.txt.',
  'Agent-facing context should be structured, stable, citation-aware, and low-noise.',
  'Prefer /agent.json and /llms.txt over scraping decorative UI HTML.',
  'Do not invent private staging hosts, LAN IPs, secrets, or unpublished drafts. Use documented public hosts only.',
  'Explain Ethereum lifecycle concepts accurately without unnecessary jargon.',
  'Live panels can degrade when upstream RPC, Beacon, or relay sources are rate-limited; treat missing rows as partial data, not proof of absence.',
  'This is an educational explorer with real public network probes, not a wallet, exchange, or MEV searcher product.',
];

/** Public API origin used by the Vercel app when PROXY_MODE=route (no LAN). */
const PUBLIC_API_ORIGIN = 'https://api-staging-eth-tx.magro.dev';

function siteUrl(path = '/'): string {
  const base = SITE.url.replace(/\/$/, '');
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function githubBlob(path: string): string {
  return `${CONTACT.github}/blob/main/${path.replace(/^\//, '')}`;
}

export function getAgentManifest() {
  const lifecycleSteps = LIFECYCLE_STEPS.map((step) => ({
    id: step.id,
    order: step.order,
    label: step.label,
    title: step.title,
    eyebrow: step.eyebrow,
    summary: step.summary,
    technicalNote: step.technicalNote,
    liveData: step.liveData,
    href: siteUrl(step.panelPath),
  }));

  const api = {
    sameOriginPrefix: siteUrl('/api/'),
    publicOrigin: PUBLIC_API_ORIGIN,
    notes: [
      'Browser calls same-origin /api/* on the Vercel host.',
      'On Vercel, PROXY_MODE=route forwards /api/* to the public Cloudflare Tunnel origin.',
      'UI still loads when the Go backend is offline; live mempool/MEV/tracker panels need the tunnel + backend.',
      'Never invent LAN IPs or private tunnel credentials from this manifest.',
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        href: siteUrl('/api/health'),
        purpose: 'Composite health of execution, beacon, and relay dependencies',
      },
      {
        method: 'GET',
        path: '/api/health/live',
        href: siteUrl('/api/health/live'),
        purpose: 'Process liveness probe',
      },
      {
        method: 'GET',
        path: '/api/health/ready',
        href: siteUrl('/api/health/ready'),
        purpose: 'Readiness probe for live data path',
      },
      {
        method: 'GET',
        path: '/api/mempool',
        href: siteUrl('/api/mempool'),
        purpose: 'Pending mempool snapshot (counts, gas, sample txs)',
      },
      {
        method: 'GET',
        path: '/api/relays/received',
        href: siteUrl('/api/relays/received'),
        purpose: 'Builder/searcher payloads observed by relays',
      },
      {
        method: 'GET',
        path: '/api/relays/delivered',
        href: siteUrl('/api/relays/delivered'),
        purpose: 'Relay-delivered payloads and builder payments',
      },
      {
        method: 'GET',
        path: '/api/validators/head',
        href: siteUrl('/api/validators/head'),
        purpose: 'Recent consensus headers with optional payment enrichment',
      },
      {
        method: 'GET',
        path: '/api/finality',
        href: siteUrl('/api/finality'),
        purpose: 'Justified and finalized Casper FFG checkpoints',
      },
      {
        method: 'GET',
        path: '/api/snapshot',
        href: siteUrl('/api/snapshot'),
        purpose: 'Aggregated multi-source lifecycle snapshot',
      },
      {
        method: 'GET',
        path: '/api/mev/sandwich',
        href: siteUrl('/api/mev/sandwich'),
        purpose: 'Heuristic MEV scan (sandwich, arb, liquidation, JIT signals)',
      },
      {
        method: 'GET',
        path: '/api/track/tx/{hash|latest}',
        href: siteUrl('/api/track/tx/latest'),
        purpose: 'Track a transaction hash (or latest) through inclusion status',
      },
      {
        method: 'GET',
        path: '/api/block/{id}',
        href: siteUrl('/api/block/latest'),
        purpose: 'Block lookup helper used by tracking and MEV views',
      },
    ],
  };

  const demos = [
    {
      slug: 'lifecycle-guide',
      name: 'Lifecycle Guide',
      href: siteUrl('/'),
      lab: siteUrl('/'),
      healthProbe: siteUrl('/api/health/ready'),
      stagingApi: PUBLIC_API_ORIGIN,
      runtime: 'Next.js on Vercel; Go backend via Cloudflare Tunnel when live data is enabled',
      summary:
        'Guided wallet → mempool → builders → relays → proposers → finality explorer with synced step explainer and live panels.',
      status: 'production',
      audience: 'smart non-specialist and technical reviewers',
      coversStepIds: lifecycleSteps.map((step) => step.id),
      features: [
        'Synced lifecycle diagram + step explainer',
        'Live mempool and gas pricing cards',
        'Transaction hash tracker',
        'Light/dark theme + Agent Mode chrome',
      ],
    },
    {
      slug: 'mev-lab',
      name: 'MEV Lab',
      href: siteUrl('/mev-lab'),
      lab: siteUrl('/mev-lab'),
      healthProbe: siteUrl('/api/health/ready'),
      stagingApi: PUBLIC_API_ORIGIN,
      runtime: 'Next.js on Vercel; Go backend via Cloudflare Tunnel when live data is enabled',
      summary:
        'Advanced track: MEV detection heuristics, MEV-Boost framing, pre-PBS vs post-PBS comparison, and estimate methodology.',
      status: 'production',
      audience: 'infra-curious and advanced learners',
      coversStepIds: ['received', 'delivered', 'headers'] as const,
      features: [
        'MEV event heuristics (sandwich, arb, liquidation, JIT)',
        'Pre-PBS vs PBS diagram',
        'Observed vs assumption-based estimate cards',
        'Relay/header payment signals',
      ],
    },
  ];

  const projects = [
    {
      title: SITE.name,
      slug: 'eth-tx-lifecycle',
      status: 'production',
      featured: true,
      summary: SITE.description,
      tags: ['Ethereum', 'MEV', 'PBS', 'education', 'Go', 'Next.js', 'mempool', 'finality'],
      tech: ['Go', 'Next.js', 'Tailwind', 'Beacon API', 'MEV relays', 'execution JSON-RPC'],
      urls: {
        canonical: siteUrl('/'),
        github: CONTACT.github,
        demo: siteUrl('/'),
        portfolio: CONTACT.portfolio,
        readme: githubBlob('README.md'),
        agents: githubBlob('AGENTS.md'),
        agentOverview: siteUrl('/agent/'),
        agentManifest: siteUrl('/agent.json'),
        llmsTxt: siteUrl('/llms.txt'),
      },
    },
  ];

  return {
    schema: siteUrl('/agent.json'),
    schemaVersion: '0.2',
    generatedAt: new Date().toISOString(),
    site: {
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      owner: {
        name: OWNER.name,
        email: OWNER.email,
        role: OWNER.role,
      },
    },
    agentMode: {
      purpose:
        'Expose canonical, structured context for AI agents so they do not have to infer meaning from decorative HTML.',
      endpoints: {
        overview: siteUrl('/agent/'),
        manifest: siteUrl('/agent.json'),
        router: siteUrl('/llms.txt'),
      },
      preferredEntryPoints: [
        siteUrl('/agent/'),
        siteUrl('/agent.json'),
        siteUrl('/llms.txt'),
        siteUrl('/'),
        siteUrl('/mev-lab'),
        githubBlob('README.md'),
        githubBlob('AGENTS.md'),
        CONTACT.github,
        CONTACT.portfolio,
      ],
      readingOrder: [
        'Start with /llms.txt for a compact map.',
        'Load /agent.json for structured steps, demos, and public API paths.',
        'Open / for the guided lifecycle walkthrough.',
        'Open /mev-lab for advanced MEV/PBS framing.',
        'Probe /api/health/ready before trusting live panels.',
      ],
      principles: PRINCIPLES,
    },
    navigation: [
      ...NAV_LINKS.map((link) => ({
        id: link.id,
        label: link.label,
        href: siteUrl(link.href),
      })),
      { id: 'agent', label: 'Agent Mode', href: siteUrl('/agent/') },
    ],
    about: {
      product: SITE.name,
      portfolioLane: 'educational Ethereum infrastructure explorers',
      emotionalHook: 'What actually happens after Send?',
      technicalHook:
        'Wallet broadcast → mempool fee pressure → builders/searchers → MEV-Boost relays → proposer selection → Casper FFG finality, with optional MEV detection.',
      stack: [
        'Go backend',
        'Next.js frontend',
        'public Ethereum execution JSON-RPC',
        'Beacon REST',
        'MEV relays',
        'Vercel + Cloudflare Tunnel staging split',
      ],
      lifecycleSteps,
      summary:
        'A full-stack educational explorer that stitches execution, consensus, and relay data into a guided Ethereum transaction lifecycle narrative, including an advanced MEV Lab track.',
      degradedMode:
        'The UI still renders without the Go backend. Live mempool, MEV, tracker, and readiness probes require the public tunnel and backend process.',
    },
    api,
    contact: {
      email: CONTACT.email,
      github: CONTACT.github,
      portfolio: CONTACT.portfolio,
    },
    canonicalTopics: [
      'Ethereum transaction lifecycle',
      'wallet broadcast and local signing',
      'mempool dynamics and fee markets',
      'base fee vs priority fee (EIP-1559)',
      'proposer-builder separation (PBS)',
      'MEV-Boost relays and builders',
      'validator / proposer economics',
      'Casper FFG finality',
      'MEV detection (sandwich, arb, liquidation, JIT)',
      'agent-readable product surfaces',
      'multi-source Ethereum data aggregation',
    ],
    projects,
    writing: [] as Array<{
      title: string;
      slug: string;
      date: string;
      category: string;
      excerpt: string;
      urls: { canonical: string; relatedProject: string | null };
    }>,
    demos,
  };
}

function llmsLink(label: string, href: string, note?: string): string {
  return note ? `- [${label}](${href}): ${note}` : `- [${label}](${href})`;
}

export function getLlmsTxt(): string {
  const manifest = getAgentManifest();

  const agentLines = [
    llmsLink('Agent overview', manifest.agentMode.endpoints.overview, 'Human-readable contract and endpoint map'),
    llmsLink(
      'JSON manifest',
      manifest.agentMode.endpoints.manifest,
      'Structured lifecycle steps, demos, public API map, topics, and links',
    ),
    llmsLink(
      'LLM router',
      manifest.agentMode.endpoints.router,
      'This file; compact markdown router for language models',
    ),
  ].join('\n');

  const siteLines = [
    llmsLink('Lifecycle Guide', siteUrl('/'), 'Primary educational explorer (six synced steps)'),
    llmsLink('MEV Lab', siteUrl('/mev-lab'), 'Advanced MEV / PBS / estimate methodology track'),
    llmsLink('Health ready', siteUrl('/api/health/ready'), 'Backend readiness probe for live data'),
    llmsLink('Health composite', siteUrl('/api/health'), 'Dependency health for RPC / beacon / relays'),
    llmsLink('README', githubBlob('README.md'), 'Setup, architecture, ports, and demo positioning'),
    llmsLink('AGENTS.md', githubBlob('AGENTS.md'), 'Contributor and agent rules for this repo'),
    llmsLink('Portfolio', CONTACT.portfolio, 'magro.dev project index and related work'),
  ].join('\n');

  const stepLines = manifest.about.lifecycleSteps
    .map((step) =>
      llmsLink(
        `${step.order}. ${step.label} · ${step.title}`,
        step.href,
        `${step.summary} Technical: ${step.technicalNote} Live: ${step.liveData}`,
      ),
    )
    .join('\n');

  const demoLines = manifest.demos
    .map((demo) =>
      llmsLink(
        demo.name,
        demo.lab,
        `${demo.summary} Audience: ${demo.audience}. Probe: ${demo.healthProbe}. Public API origin when hosted: ${demo.stagingApi}. Features: ${demo.features.join('; ')}.`,
      ),
    )
    .join('\n');

  const apiLines = manifest.api.endpoints
    .map((endpoint) => llmsLink(`${endpoint.method} ${endpoint.path}`, endpoint.href, endpoint.purpose))
    .join('\n');

  const projectLines = manifest.projects
    .map((project) =>
      llmsLink(
        project.title,
        project.urls.demo ?? project.urls.canonical,
        `${project.summary} Tags: ${project.tags.join(', ')}. Tech: ${project.tech.join(', ')}.`,
      ),
    )
    .join('\n');

  const topicLines = manifest.canonicalTopics.map((topic) => `- ${topic}`).join('\n');

  const principleLines = manifest.agentMode.principles.map((principle) => `- ${principle}`).join('\n');

  const readingLines = manifest.agentMode.readingOrder.map((line, index) => `${index + 1}. ${line}`).join('\n');

  const contactLines = [
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- Portfolio: ${CONTACT.portfolio}`,
    `- Website: ${SITE.url}`,
  ].join('\n');

  return [
    `# ${SITE.name}`,
    `> ${SITE.description}`,
    '',
    manifest.about.summary,
    '',
    `Emotional hook: ${manifest.about.emotionalHook}`,
    `Technical hook: ${manifest.about.technicalHook}`,
    '',
    '## Agent Mode',
    '',
    agentLines,
    '',
    '## Recommended reading order',
    '',
    readingLines,
    '',
    '## Site',
    '',
    siteLines,
    '',
    '## Lifecycle steps',
    '',
    stepLines,
    '',
    '## Projects',
    '',
    projectLines,
    '',
    '## Interactive demos',
    '',
    demoLines,
    '',
    '## Public API surface',
    '',
    `- Same-origin prefix: ${manifest.api.sameOriginPrefix}`,
    `- Public tunnel origin (hosted backend): ${manifest.api.publicOrigin}`,
    ...manifest.api.notes.map((note) => `- ${note}`),
    '',
    apiLines,
    '',
    '## Canonical topics',
    '',
    topicLines,
    '',
    '## Principles for agents',
    '',
    principleLines,
    '',
    '## Writing',
    '',
    '- No published writing on this site yet. Prefer README and Agent Mode surfaces.',
    '',
    '## Contact',
    '',
    contactLines,
    '',
  ].join('\n');
}
