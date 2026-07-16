import type { ReactNode } from 'react';

// Simple alert component for warnings and info messages
export default function Alert({ title, message, hint }: { title: string; message?: ReactNode; hint?: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-3">
      <div className="font-semibold text-yellow-200">{title}</div>
      {message ? <div className="text-sm text-fg/85">{message}</div> : null}
      {hint ? <div className="mt-1 text-xs text-fg/70">Hint: {hint}</div> : null}
    </div>
  );
}