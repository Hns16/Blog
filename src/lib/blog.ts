import type { BlogListItem, BlogPost } from "@/src/types/blog";
import {
  getPostDraftOrPublished,
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedSlugs
} from "@/src/lib/publishing";

export const getAllPosts = (): BlogListItem[] => getPublishedPosts();

export const getPostBySlug = (slug: string): BlogPost | null => getPublishedPostBySlug(slug);

export function getAllPostSlugs(): string[] {
  return getPublishedSlugs();
}

export function getEditablePostBySlug(slug: string): BlogPost | null {
  return getPostDraftOrPublished(slug);
}
