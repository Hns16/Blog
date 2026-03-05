import { getPublishedPosts } from "@/src/lib/publishing";
import { getSiteUrl } from "@/src/lib/env";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const site = getSiteUrl().replace(/\/+$/, "");
  const posts = getPublishedPosts();
  const items = posts
    .map((post) => {
      const link = `${site}/blog/${post.slug}`;
      return (
        `<item>` +
        `<title>${escapeXml(post.title)}</title>` +
        `<link>${escapeXml(link)}</link>` +
        `<guid>${escapeXml(link)}</guid>` +
        `<pubDate>${new Date(post.date).toUTCString()}</pubDate>` +
        `<description>${escapeXml(post.description)}</description>` +
        `</item>`
      );
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>My Blog</title>` +
    `<link>${escapeXml(site)}</link>` +
    `<description>Published posts</description>` +
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>` +
    `${items}` +
    `</channel></rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}
