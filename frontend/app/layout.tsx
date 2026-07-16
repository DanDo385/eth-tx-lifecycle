import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader } from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "Ethereum Visualizer",
  description: "Mempool → PBS → Finality learning tool",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('eth-tx-lifecycle-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);return;}if(window.matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
