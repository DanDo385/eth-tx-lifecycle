"use client";

import type { ReactNode } from "react";

export default function GlowButton({
  children,
  onClick,
  ariaLabel,
  className,
  compact = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-cyan-400/30 bg-panel text-fg transition-all outline-none focus:ring-2 focus:ring-neon-blue ${
        compact
          ? "px-3 py-2 text-sm hover:shadow-neonBlue"
          : "px-4 py-3 text-sm md:text-base hover:shadow-neonBlue"
      } ${
        disabled ? "cursor-not-allowed opacity-60" : "shadow-neon"
      } ${className || ""}`}
    >
      {children}
    </button>
  );
}
