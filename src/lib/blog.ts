import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import type { BlogFrontmatter, BlogListItem, BlogPost } from "@/src/types/blog";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function assertFrontmatter(
  value: unknown,
  slug: string
): asserts value is Omit<BlogFrontmatter, "date"> & { date: string | Date } {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid frontmatter in ${slug}.mdx`);
  }

  const data = value as Record<string, unknown>;
  const requiredStringKeys = ["title", "description"] as const;

  for (const key of requiredStringKeys) {
    if (typeof data[key] !== "string" || data[key].trim().length === 0) {
      throw new Error(`Missing or invalid \"${key}\" in ${slug}.mdx`);
    }
  }

  if (!(typeof data.date === "string" || data.date instanceof Date)) {
    throw new Error(`Missing or invalid \"date\" in ${slug}.mdx`);
  }

  const parsedDate = new Date(data.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid \"date\" in ${slug}.mdx`);
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string")) {
      throw new Error(`Invalid \"tags\" in ${slug}.mdx`);
    }
  }
}

function normalizeDate(date: string | Date): string {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  return date;
}

function getMdxFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));
}

function parsePost(fileName: string): BlogPost {
  const slug = fileName.replace(/\.mdx?$/, "");
  const fullPath = path.join(BLOG_DIR, fileName);
  const source = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(source);

  assertFrontmatter(data, slug);

  return {
    slug,
    title: data.title,
    description: data.description,
    date: normalizeDate(data.date),
    tags: data.tags as string[] | undefined,
    content
  };
}

function safeParsePost(fileName: string): BlogPost | null {
  try {
    return parsePost(fileName);
  } catch {
    return null;
  }
}

export const getAllPosts = cache((): BlogListItem[] => {
  return getMdxFiles()
    .map(safeParsePost)
    .filter((post): post is BlogPost => post !== null)
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

export const getPostBySlug = cache((slug: string): BlogPost | null => {
  const fileName = `${slug}.mdx`;
  const mdFileName = `${slug}.md`;

  if (fs.existsSync(path.join(BLOG_DIR, fileName))) {
    return safeParsePost(fileName);
  }

  if (fs.existsSync(path.join(BLOG_DIR, mdFileName))) {
    return safeParsePost(mdFileName);
  }

  return null;
});

export function getAllPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}
