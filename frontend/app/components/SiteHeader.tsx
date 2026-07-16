'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import type { Route } from 'next';
import { NAV_LINKS } from '../../lib/nav';
import { ThemeToggle } from './ThemeToggle';

const AGENT_RETURN_KEY = 'agent-mode-return-to';

function isAgentPath(pathname: string | null) {
  return pathname === '/agent' || pathname === '/agent/';
}

function currentLocation() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const onAgent = isAgentPath(pathname);
  const [agentReturnTo, setAgentReturnTo] = useState<Route>('/');

  useEffect(() => {
    if (!onAgent) return;
    try {
      const stored = sessionStorage.getItem(AGENT_RETURN_KEY);
      const pathOnly = (stored || '/').split(/[?#]/)[0] || '/';
      if (stored && !isAgentPath(pathOnly)) {
        setAgentReturnTo(stored as Route);
      }
    } catch {
      setAgentReturnTo('/');
    }
  }, [onAgent]);

  const handleAgentModeClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onAgent) return;

    e.preventDefault();
    try {
      sessionStorage.setItem(AGENT_RETURN_KEY, currentLocation());
    } catch {
      // sessionStorage may be unavailable
    }
    router.push('/agent' as Route);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <h1 className="text-3xl font-bold text-center text-neon-blue">Ethereum Transaction Visualizer</h1>
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Primary" className="flex-1 rounded-xl border border-line/10 bg-fill-subtle/5 p-1.5">
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/' || pathname === ''
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-center transition-colors ${
                      active
                        ? 'bg-neon-blue/10 text-fg'
                        : 'text-fg/80 hover:bg-neon-blue/10 hover:text-fg'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="nav-end flex shrink-0 items-center justify-center gap-3 sm:justify-end">
          <div className="nav-control" role="group" aria-label="Agent Mode">
            <span className="nav-control-label">Agent Mode</span>
            <Link
              href={onAgent ? agentReturnTo : ('/agent' as Route)}
              className={`nav-agent-toggle${onAgent ? ' active' : ''}`}
              aria-label={onAgent ? 'Exit Agent Mode' : 'Enter Agent Mode'}
              aria-pressed={onAgent}
              title={onAgent ? 'Exit Agent Mode' : 'Enter Agent Mode'}
              onClick={handleAgentModeClick}
            >
              <span className="nav-agent-emoji" aria-hidden="true">
                🤖
              </span>
            </Link>
          </div>
          <div className="nav-control" role="group" aria-label="Display">
            <span className="nav-control-label">Display</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
