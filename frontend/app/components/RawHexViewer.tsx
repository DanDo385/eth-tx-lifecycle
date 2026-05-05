'use client';

import React, { useMemo, useState } from 'react';

type RawHexEntry = {
  path: string;
  value: string;
};

type RawHexViewerButtonProps = {
  data: unknown;
  title?: string;
  buttonLabel?: string;
  className?: string;
  maxEntries?: number;
};

const HEX_RE = /^0x[0-9a-fA-F]+$/;

function looksLikeHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function extractHexEntries(input: unknown, maxEntries = 200): RawHexEntry[] {
  const out: RawHexEntry[] = [];
  const seen = new WeakSet<object>();

  function visit(value: unknown, path: string) {
    if (out.length >= maxEntries) return;

    if (looksLikeHex(value)) {
      out.push({ path, value });
      return;
    }

    if (!isObjectLike(value)) return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, idx) => visit(item, `${path}[${idx}]`));
      return;
    }

    Object.entries(value).forEach(([key, nested]) => {
      const nextPath = path ? `${path}.${key}` : key;
      visit(nested, nextPath);
    });
  }

  visit(input, 'root');
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function RawHexViewerButton({
  data,
  title = 'Raw Hex Details',
  buttonLabel = 'View Raw Hex',
  className,
  maxEntries = 200,
}: RawHexViewerButtonProps) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => extractHexEntries(data, maxEntries), [data, maxEntries]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-cyan-400/50 hover:text-cyan-300'
        }
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 md:p-8" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-4xl flex-col rounded-xl border border-white/15 bg-[#0b0b12]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
              <div className="overflow-auto rounded-lg border border-white/10">
                <div className="border-b border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  Extracted hex fields ({entries.length})
                </div>
                {entries.length === 0 ? (
                  <div className="p-3 text-xs text-white/60">No hex fields were found for this row.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 text-white/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Path</th>
                        <th className="px-3 py-2 text-left font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => (
                        <tr key={`${entry.path}-${idx}`} className="border-t border-white/5">
                          <td className="px-3 py-2 font-mono text-white/70">{entry.path}</td>
                          <td className="px-3 py-2 font-mono text-cyan-300 break-all">{entry.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="overflow-auto rounded-lg border border-white/10 bg-black/40">
                <div className="border-b border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">Full row payload</div>
                <pre className="p-3 text-xs text-white/80">{safeStringify(data)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
