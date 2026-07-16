'use client';

import React from 'react';

type StepRawJsonDetailsProps = {
  data: unknown;
  className?: string;
};

/**
 * Collapsible raw JSON — same pattern for each numbered flow step (1–6).
 */
export default function StepRawJsonDetails({ data, className = 'mt-4' }: StepRawJsonDetailsProps) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-fg/60 text-xs hover:text-fg/80 select-none">
        Show raw JSON data
      </summary>
      <pre className="mt-2 text-xs bg-surface/60 p-3 rounded overflow-auto max-h-64 border border-line/10">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
