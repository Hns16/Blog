import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/src/lib/publishing";
import { getSiteUrl } from "@/src/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl().replace(/\/+$/, "");
  const posts = getPublishedPosts();
  const base: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${site}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 }
  ];
  return base.concat(
    posts.map((post) => ({
      url: `${site}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "weekly",
      priority: 0.8
    }))
  );
}
