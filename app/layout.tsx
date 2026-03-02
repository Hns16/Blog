import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-neutral-50 text-neutral-900">
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
