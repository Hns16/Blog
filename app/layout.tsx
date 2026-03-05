import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import "./globals.css";

import { getSiteUrl } from "@/src/lib/env";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "My Blog",
    template: "%s | My Blog"
  },
  description: "A minimal blog built with Next.js 14 + MDX.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "My Blog",
    description: "A minimal blog built with Next.js 14 + MDX.",
    type: "website",
    url: "/"
  }
};

const themeScript = `(() => {
  try {
    const saved = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'light' || saved === 'dark' ? saved : (systemDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <main className="ui-shell">
          <header className="ui-card flex flex-wrap items-center justify-between gap-3">
            <Link className="text-lg font-semibold" href="/">
              My Blog
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link className="btn-secondary" href="/blog">
                博客
              </Link>
              <Link className="btn-secondary" href="/admin">
                管理
              </Link>
              <ThemeToggle />
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
