import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ethereum Visualizer",
  description: "Mempool → PBS → Finality learning tool",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <h1 className="text-3xl font-bold text-center text-neon-blue">Ethereum Transaction Visualizer</h1>
          <nav
            aria-label="Primary"
            className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-white/5 p-1.5"
          >
            <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              <li>
                <Link
                  href="/"
                  className="block rounded-lg px-3 py-2 text-center text-white/80 transition-colors hover:bg-cyan-500/10 hover:text-white"
                >
                  Lifecycle Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/mev-lab"
                  className="block rounded-lg px-3 py-2 text-center text-white/80 transition-colors hover:bg-purple-500/10 hover:text-white"
                >
                  MEV Lab
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        {children}
      </body>
    </html>
  );
}
