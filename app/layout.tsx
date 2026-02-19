import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "My Blog",
    template: "%s | My Blog"
  },
  description: "A minimal blog built with Next.js 14 + MDX.",
  openGraph: {
    title: "My Blog",
    description: "A minimal blog built with Next.js 14 + MDX.",
    type: "website",
    url: "https://example.com"
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
