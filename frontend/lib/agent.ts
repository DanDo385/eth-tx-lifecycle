import { CONTACT, OWNER, SITE } from './constants';
import { NAV_LINKS } from './nav';

const PRINCIPLES = [
  'Canonical product context lives on this site’s Agent Mode surfaces.',
  'Agent-facing context should be structured, stable, citation-aware, and low-noise.',
  'Prefer /agent.json and /llms.txt over scraping decorative UI HTML.',
  'Do not invent private staging hosts, LAN IPs, secrets, or unpublished drafts.',
  'Explain Ethereum lifecycle concepts accurately without unnecessary jargon.',
];

export function getAgentManifest() {
  const demos = [
    {
      slug: 'lifecycle-guide',
      name: 'Lifecycle Guide',
      href: `${SITE.url}/`,
      healthProbe: `${SITE.url}/api/health/ready`,
      summary: 'Guided wallet → mempool → builders → relays → proposers → finality explorer.',
      status: 'production',
    },
    {
      slug: 'mev-lab',
      name: 'MEV Lab',
      href: `${SITE.url}/mev-lab`,
      healthProbe: `${SITE.url}/api/health/ready`,
      summary: 'MEV detection, MEV-Boost framing, and pre-PBS vs post-PBS comparison.',
      status: 'production',
    },
  ];

  const projects = [
    {
      title: SITE.name,
      slug: 'eth-tx-lifecycle',
      status: 'production',
      featured: true,
      summary: SITE.description,
      tags: ['Ethereum', 'MEV', 'PBS', 'education', 'Go', 'Next.js'],
      tech: ['Go', 'Next.js', 'Tailwind', 'Beacon API', 'MEV relays'],
      urls: {
        canonical: `${SITE.url}/`,
        github: CONTACT.github,
        demo: `${SITE.url}/`,
      },
    },
  ];

  return {
    schema: `${SITE.url}/agent.json`,
    schemaVersion: '0.1',
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
        overview: `${SITE.url}/agent/`,
        manifest: `${SITE.url}/agent.json`,
        router: `${SITE.url}/llms.txt`,
      },
      preferredEntryPoints: [
        `${SITE.url}/agent/`,
        `${SITE.url}/agent.json`,
        `${SITE.url}/llms.txt`,
        `${SITE.url}/`,
        `${SITE.url}/mev-lab`,
        CONTACT.github,
      ],
      principles: PRINCIPLES,
    },
    navigation: [
      ...NAV_LINKS.map((link) => ({
        id: link.id,
        label: link.label,
        href: new URL(link.href, SITE.url).toString(),
      })),
      { id: 'agent', label: 'Agent Mode', href: `${SITE.url}/agent/` },
    ],
    about: {
      product: SITE.name,
      stack: ['Go backend', 'Next.js frontend', 'public Ethereum APIs', 'MEV relays'],
      lifecycleSteps: [
        'Wallet send',
        'Mempool',
        'Builders/searchers',
        'Relays',
        'Validators/proposers',
        'Finality',
      ],
      summary:
        'A full-stack educational explorer that stitches execution, consensus, and relay data into a guided Ethereum transaction lifecycle narrative, including an advanced MEV Lab track.',
    },
    contact: {
      email: CONTACT.email,
      github: CONTACT.github,
      portfolio: CONTACT.portfolio,
    },
    canonicalTopics: [
      'Ethereum transaction lifecycle',
      'mempool dynamics and fee markets',
      'proposer-builder separation (PBS)',
      'MEV-Boost relays and builders',
      'validator / proposer economics',
      'Casper FFG finality',
      'MEV detection (sandwich, arb, liquidation, JIT)',
      'agent-readable product surfaces',
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
    llmsLink('JSON manifest', manifest.agentMode.endpoints.manifest, 'Structured product context and links'),
    llmsLink('LLM router', manifest.agentMode.endpoints.router, 'This file; compact markdown router for language models'),
  ].join('\n');

  const siteLines = [
    llmsLink('Lifecycle Guide', `${SITE.url}/`, 'Primary educational explorer'),
    llmsLink('MEV Lab', `${SITE.url}/mev-lab`, 'Advanced MEV / PBS track'),
    llmsLink('Health ready', `${SITE.url}/api/health/ready`, 'Backend readiness probe'),
  ].join('\n');

  const projectLines = manifest.projects
    .map((project) => llmsLink(project.title, project.urls.demo ?? project.urls.canonical, project.summary))
    .join('\n');

  const demoLines = manifest.demos
    .map((demo) => llmsLink(demo.name, demo.href, `${demo.summary} Probe: ${demo.healthProbe}`))
    .join('\n');

  const topicLines = manifest.canonicalTopics.map((topic) => `- ${topic}`).join('\n');

  return [
    `# ${SITE.name}`,
    `> ${SITE.description}`,
    '',
    manifest.about.summary,
    '',
    '## Agent Mode',
    '',
    agentLines,
    '',
    '## Site',
    '',
    siteLines,
    '',
    '## Projects',
    '',
    projectLines,
    '',
    '## Interactive Demos',
    '',
    demoLines,
    '',
    '## Canonical Topics',
    '',
    topicLines,
    '',
    '## Contact',
    '',
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- Portfolio: ${CONTACT.portfolio}`,
    '',
  ].join('\n');
}
