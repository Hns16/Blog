import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { dedupeTags, toSlug } from "@/src/lib/admin-write-shared";
import { writeFileAtomic } from "@/src/lib/admin-write-server";
import type { BlogListItem, BlogPost } from "@/src/types/blog";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const STATE_DIR = path.join(BLOG_DIR, ".state");
const REVISIONS_DIR = path.join(BLOG_DIR, ".revisions");
const STORE_FILE = path.join(STATE_DIR, "publish-store.json");
const QUEUE_FILE = path.join(STATE_DIR, "schedule-queue.json");
const SLUG_RE = /^[a-z0-9-]+$/;

export type RevisionStatus = "draft" | "published" | "archived";
export type PostStatus = "draft" | "published" | "scheduled" | "archived";
export type PublishAction = "save_draft" | "publish" | "schedule" | "rollback" | "archive" | "cancel_schedule";

export type RevisionMeta = {
  slug: string;
  revisionId: string;
  status: RevisionStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  title: string;
  description: string;
  date: string;
  tags: string[];
  contentPath: string;
};

type PostEntry = {
  slug: string;
  status: PostStatus;
  publishedRevisionId: string | null;
  latestDraftRevisionId: string | null;
  publishedAt: string | null;
  revisions: RevisionMeta[];
  updatedAt: string;
};

type PublishStore = {
  version: 1;
  posts: Record<string, PostEntry>;
};

type ScheduleTask = {
  taskId: string;
  slug: string;
  revisionId: string;
  publishAt: string;
  status: "pending" | "done" | "canceled";
  createdAt: string;
  updatedAt: string;
};

type ScheduleQueue = {
  version: 1;
  tasks: ScheduleTask[];
};

export type PublishInput = {
  title: string;
  description: string;
  slugInput: string;
  date: string;
  tagsInput: string;
  content: string;
  action: PublishAction;
  scheduledAt?: string;
  originalSlug?: string;
  targetRevisionId?: string;
};

export type PublishResult = {
  slug: string;
  fromRevision: string | null;
  toRevision: string | null;
  status: PostStatus;
  scheduledAt: string | null;
};

export type PublishValidation = {
  ok: boolean;
  code:
    | "invalid_slug"
    | "invalid_date"
    | "missing_required"
    | "slug_conflict"
    | "schedule_invalid"
    | "not_found"
    | "revision_not_found"
    | "publish_failed";
  slug: string;
  normalizedDate: string | null;
};

function ensureDirs(): void {
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  if (!fs.existsSync(REVISIONS_DIR)) fs.mkdirSync(REVISIONS_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeFileAtomic(filePath, JSON.stringify(value, null, 2));
}

function emptyStore(): PublishStore {
  return { version: 1, posts: {} };
}

function emptyQueue(): ScheduleQueue {
  return { version: 1, tasks: [] };
}

function loadStore(): PublishStore {
  ensureDirs();
  const store = readJsonFile<PublishStore>(STORE_FILE, emptyStore());
  if (!store.posts) return emptyStore();
  return store;
}

function saveStore(store: PublishStore): void {
  ensureDirs();
  writeJsonFile(STORE_FILE, store);
}

function loadQueue(): ScheduleQueue {
  ensureDirs();
  return readJsonFile<ScheduleQueue>(QUEUE_FILE, emptyQueue());
}

function saveQueue(queue: ScheduleQueue): void {
  ensureDirs();
  writeJsonFile(QUEUE_FILE, queue);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeDate(input: string): string | null {
  if (!input) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === input ? input : null;
}

function generateRevisionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function buildDoc(title: string, description: string, date: string, tags: string[], content: string): string {
  const tagsBlock = tags.length > 0 ? `tags:\n${tags.map((tag) => `  - ${quoteYaml(tag)}`).join("\n")}\n` : "";
  return (
    `---\n` +
    `title: ${quoteYaml(title)}\n` +
    `description: ${quoteYaml(description)}\n` +
    `date: ${quoteYaml(date)}\n` +
    `${tagsBlock}---\n\n` +
    `${content}\n`
  );
}

function getRevisionDir(slug: string): string {
  return path.join(REVISIONS_DIR, slug);
}

function getRevisionPath(slug: string, revisionId: string): string {
  return path.join(getRevisionDir(slug), `${revisionId}.mdx`);
}

function writeRevisionFile(slug: string, revisionId: string, doc: string): string {
  const dir = getRevisionDir(slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const revisionPath = getRevisionPath(slug, revisionId);
  writeFileAtomic(revisionPath, doc);
  return path.relative(BLOG_DIR, revisionPath);
}

function writePublishedFile(slug: string, doc: string): void {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  writeFileAtomic(filePath, doc);
}

function readPostEntry(store: PublishStore, slug: string): PostEntry | null {
  return store.posts[slug] ?? null;
}

function ensurePostEntry(store: PublishStore, slug: string): PostEntry {
  const existing = readPostEntry(store, slug);
  if (existing) return existing;
  const created: PostEntry = {
    slug,
    status: "draft",
    publishedRevisionId: null,
    latestDraftRevisionId: null,
    publishedAt: null,
    revisions: [],
    updatedAt: nowIso()
  };
  store.posts[slug] = created;
  return created;
}

function getRevision(entry: PostEntry, revisionId: string | null): RevisionMeta | null {
  if (!revisionId) return null;
  return entry.revisions.find((item) => item.revisionId === revisionId) ?? null;
}

export function validatePublishInput(input: PublishInput): PublishValidation {
  const title = input.title.trim();
  const description = input.description.trim();
  const content = input.content.trim();
  const slug = toSlug(input.slugInput || title);
  const normalizedDate = normalizeDate(input.date.trim());
  const store = loadStore();

  if (input.action === "archive" || input.action === "cancel_schedule") {
    const slugFromOriginal = toSlug(input.originalSlug ?? "");
    if (!slugFromOriginal || !SLUG_RE.test(slugFromOriginal)) {
      return { ok: false, code: "invalid_slug", slug: slugFromOriginal, normalizedDate };
    }
    if (!readPostEntry(store, slugFromOriginal)) {
      return { ok: false, code: "not_found", slug: slugFromOriginal, normalizedDate };
    }
    return { ok: true, code: "publish_failed", slug: slugFromOriginal, normalizedDate: normalizedDate ?? "1970-01-01" };
  }

  if (input.action === "rollback") {
    const rollbackSlug = toSlug(input.originalSlug ?? input.slugInput);
    if (!rollbackSlug || !SLUG_RE.test(rollbackSlug)) {
      return { ok: false, code: "invalid_slug", slug: rollbackSlug, normalizedDate };
    }
    if (!input.targetRevisionId) {
      return { ok: false, code: "revision_not_found", slug: rollbackSlug, normalizedDate };
    }
    const rollbackEntry = readPostEntry(store, rollbackSlug);
    if (!rollbackEntry) {
      return { ok: false, code: "not_found", slug: rollbackSlug, normalizedDate };
    }
    if (!getRevision(rollbackEntry, input.targetRevisionId)) {
      return { ok: false, code: "revision_not_found", slug: rollbackSlug, normalizedDate };
    }
    return { ok: true, code: "publish_failed", slug: rollbackSlug, normalizedDate: normalizedDate ?? "1970-01-01" };
  }

  if ((input.action === "save_draft" || input.action === "publish" || input.action === "schedule") && (!title || !description || !content || !input.date.trim())) {
    return { ok: false, code: "missing_required", slug, normalizedDate };
  }
  if (!slug || !SLUG_RE.test(slug)) return { ok: false, code: "invalid_slug", slug, normalizedDate };
  if (!normalizedDate && (input.action === "save_draft" || input.action === "publish" || input.action === "schedule")) {
    return { ok: false, code: "invalid_date", slug, normalizedDate };
  }
  const existing = readPostEntry(store, slug);
  if (input.originalSlug && toSlug(input.originalSlug) !== slug && existing) {
    return { ok: false, code: "slug_conflict", slug, normalizedDate };
  }
  if (!input.originalSlug && existing && input.action !== "save_draft") {
    return { ok: false, code: "slug_conflict", slug, normalizedDate };
  }
  if (input.action === "schedule") {
    const scheduledAt = input.scheduledAt?.trim() ?? "";
    const scheduledDate = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return { ok: false, code: "schedule_invalid", slug, normalizedDate };
    }
  }
  return { ok: true, code: "publish_failed", slug, normalizedDate };
}

function toExcerpt(content: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function parseDocFromPath(fullPath: string, slug: string): BlogPost | null {
  if (!fs.existsSync(fullPath)) return null;
  try {
    const source = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(source);
    if (typeof data.title !== "string" || typeof data.description !== "string" || typeof data.date !== "string") return null;
    const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : undefined;
    return {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      tags,
      excerpt: toExcerpt(content),
      content
    };
  } catch {
    return null;
  }
}

function scheduleTask(slug: string, revisionId: string, publishAt: string): ScheduleTask {
  const now = nowIso();
  return {
    taskId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug,
    revisionId,
    publishAt,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
}

function removePendingTasks(queue: ScheduleQueue, slug: string): void {
  for (const task of queue.tasks) {
    if (task.slug === slug && task.status === "pending") {
      task.status = "canceled";
      task.updatedAt = nowIso();
    }
  }
}

function publishExistingRevision(store: PublishStore, slug: string, revisionId: string): PublishResult {
  const entry = readPostEntry(store, slug);
  if (!entry) throw new Error("not_found");
  const target = getRevision(entry, revisionId);
  if (!target) throw new Error("revision_not_found");

  const fullPath = path.join(BLOG_DIR, target.contentPath);
  if (!fs.existsSync(fullPath)) throw new Error("revision_not_found");
  const doc = fs.readFileSync(fullPath, "utf-8");

  const fromRevision = entry.publishedRevisionId;
  writePublishedFile(slug, doc);

  const now = nowIso();
  entry.publishedRevisionId = target.revisionId;
  entry.publishedAt = now;
  entry.status = "published";
  entry.updatedAt = now;
  target.status = "published";
  target.publishedAt = now;
  target.updatedAt = now;

  return {
    slug,
    fromRevision,
    toRevision: target.revisionId,
    status: entry.status,
    scheduledAt: null
  };
}

export function getAdminPostSummaries(filter: "all" | "draft" | "published" | "scheduled" | "archived" = "all"): Array<{
  slug: string;
  title: string;
  date: string;
  status: PostStatus;
  publishedAt: string | null;
  latestRevisionId: string | null;
  publishedRevisionId: string | null;
  latestDraftRevisionId: string | null;
}> {
  const store = loadStore();
  return Object.values(store.posts)
    .filter((post) => filter === "all" || post.status === filter)
    .map((post) => ({
      slug: post.slug,
      title: post.revisions.at(-1)?.title ?? post.slug,
      date: post.revisions.at(-1)?.date ?? "",
      status: post.status,
      publishedAt: post.publishedAt,
      latestRevisionId: post.revisions.at(-1)?.revisionId ?? null,
      publishedRevisionId: post.publishedRevisionId,
      latestDraftRevisionId: post.latestDraftRevisionId
    }))
    .sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "") * -1 || a.slug.localeCompare(b.slug));
}

export function getAdminPostDetails(slug: string): {
  slug: string;
  status: PostStatus;
  publishedRevisionId: string | null;
  latestDraftRevisionId: string | null;
  revisions: RevisionMeta[];
} | null {
  const store = loadStore();
  const post = readPostEntry(store, slug);
  if (!post) return null;
  return {
    slug: post.slug,
    status: post.status,
    publishedRevisionId: post.publishedRevisionId,
    latestDraftRevisionId: post.latestDraftRevisionId,
    revisions: [...post.revisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export function applyPublishAction(input: PublishInput): PublishResult {
  ensureDirs();
  const base = validatePublishInput(input);
  if (!base.ok || !base.normalizedDate) {
    const err = new Error(base.code);
    throw err;
  }

  const store = loadStore();
  const queue = loadQueue();
  const targetSlug = base.slug;
  const originalSlug = input.originalSlug?.trim() || targetSlug;

  if (input.action !== "rollback" && input.action !== "archive") {
    const existingBySlug = readPostEntry(store, targetSlug);
    if (input.originalSlug && input.originalSlug !== targetSlug && existingBySlug) {
      throw new Error("slug_conflict");
    }
  }

  if (input.originalSlug && input.originalSlug !== targetSlug) {
    const original = readPostEntry(store, originalSlug);
    if (original && !readPostEntry(store, targetSlug)) {
      original.slug = targetSlug;
      delete store.posts[originalSlug];
      store.posts[targetSlug] = original;
    }
  }

  const existingEntry = readPostEntry(store, targetSlug);
  if ((input.action === "archive" || input.action === "cancel_schedule" || input.action === "rollback") && !existingEntry) {
    throw new Error("not_found");
  }
  const entry = existingEntry ?? ensurePostEntry(store, targetSlug);
  const now = nowIso();

  if (input.action === "rollback") {
    if (!input.targetRevisionId) throw new Error("missing_required");
    const result = publishExistingRevision(store, targetSlug, input.targetRevisionId);
    removePendingTasks(queue, targetSlug);
    saveStore(store);
    saveQueue(queue);
    return result;
  }

  if (input.action === "archive") {
    const fromRevision = entry.publishedRevisionId;
    entry.status = "archived";
    entry.updatedAt = now;
    removePendingTasks(queue, targetSlug);
    saveStore(store);
    saveQueue(queue);
    return { slug: targetSlug, fromRevision, toRevision: null, status: entry.status, scheduledAt: null };
  }

  if (input.action === "cancel_schedule") {
    const fromRevision = entry.publishedRevisionId;
    removePendingTasks(queue, targetSlug);
    entry.status = entry.publishedRevisionId ? "published" : "draft";
    entry.updatedAt = now;
    saveStore(store);
    saveQueue(queue);
    return { slug: targetSlug, fromRevision, toRevision: null, status: entry.status, scheduledAt: null };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const tags = dedupeTags(input.tagsInput);
  const content = input.content.trim();
  const doc = buildDoc(title, description, base.normalizedDate, tags, content);
  const revisionId = generateRevisionId();
  const relativeContentPath = writeRevisionFile(targetSlug, revisionId, doc);

  const revision: RevisionMeta = {
    slug: targetSlug,
    revisionId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    title,
    description,
    date: base.normalizedDate,
    tags,
    contentPath: relativeContentPath
  };
  entry.revisions.push(revision);
  entry.latestDraftRevisionId = revisionId;
  entry.updatedAt = now;

  if (input.action === "save_draft") {
    entry.status = "draft";
    saveStore(store);
    return { slug: targetSlug, fromRevision: entry.publishedRevisionId, toRevision: revisionId, status: "draft", scheduledAt: null };
  }

  if (input.action === "schedule") {
    if (!input.scheduledAt) throw new Error("invalid_date");
    const scheduledDate = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) throw new Error("invalid_date");
    if (scheduledDate.getTime() <= Date.now()) throw new Error("invalid_date");
    entry.status = "scheduled";
    removePendingTasks(queue, targetSlug);
    queue.tasks.push(scheduleTask(targetSlug, revisionId, scheduledDate.toISOString()));
    saveStore(store);
    saveQueue(queue);
    return {
      slug: targetSlug,
      fromRevision: entry.publishedRevisionId,
      toRevision: revisionId,
      status: "scheduled",
      scheduledAt: scheduledDate.toISOString()
    };
  }

  const fromRevision = entry.publishedRevisionId;
  writePublishedFile(targetSlug, doc);
  entry.status = "published";
  entry.publishedRevisionId = revisionId;
  entry.publishedAt = now;
  revision.status = "published";
  revision.publishedAt = now;
  removePendingTasks(queue, targetSlug);
  saveStore(store);
  saveQueue(queue);
  return { slug: targetSlug, fromRevision, toRevision: revisionId, status: "published", scheduledAt: null };
}

export function runScheduledPublish(now = new Date()): Array<{ slug: string; revisionId: string; published: boolean }> {
  ensureDirs();
  const store = loadStore();
  const queue = loadQueue();
  const nowMs = now.getTime();
  const results: Array<{ slug: string; revisionId: string; published: boolean }> = [];

  for (const task of queue.tasks) {
    if (task.status !== "pending") continue;
    const publishAtMs = new Date(task.publishAt).getTime();
    if (Number.isNaN(publishAtMs) || publishAtMs > nowMs) continue;

    const post = readPostEntry(store, task.slug);
    if (!post) {
      task.status = "canceled";
      task.updatedAt = nowIso();
      results.push({ slug: task.slug, revisionId: task.revisionId, published: false });
      continue;
    }

    if (post.publishedRevisionId === task.revisionId) {
      task.status = "done";
      task.updatedAt = nowIso();
      results.push({ slug: task.slug, revisionId: task.revisionId, published: true });
      continue;
    }

    try {
      publishExistingRevision(store, task.slug, task.revisionId);
      task.status = "done";
      task.updatedAt = nowIso();
      results.push({ slug: task.slug, revisionId: task.revisionId, published: true });
    } catch {
      results.push({ slug: task.slug, revisionId: task.revisionId, published: false });
    }
  }

  saveStore(store);
  saveQueue(queue);
  return results;
}

export function deletePostArtifacts(slugInput: string): { removed: boolean } {
  const slug = toSlug(slugInput);
  if (!slug) return { removed: false };
  ensureDirs();
  const store = loadStore();
  const queue = loadQueue();
  const entry = readPostEntry(store, slug);
  if (!entry) return { removed: false };

  delete store.posts[slug];
  for (const task of queue.tasks) {
    if (task.slug === slug && task.status === "pending") {
      task.status = "canceled";
      task.updatedAt = nowIso();
    }
  }
  saveStore(store);
  saveQueue(queue);

  const revisionDir = getRevisionDir(slug);
  if (fs.existsSync(revisionDir)) {
    try {
      fs.rmSync(revisionDir, { recursive: true, force: true });
    } catch {
      // noop
    }
  }
  return { removed: true };
}

export const getPublishedPosts = cache((): BlogListItem[] => {
  ensureDirs();
  const store = loadStore();
  const posts: BlogListItem[] = [];

  for (const entry of Object.values(store.posts)) {
    if (entry.status !== "published" || !entry.publishedRevisionId) continue;
    const revision = getRevision(entry, entry.publishedRevisionId);
    if (!revision) continue;
    const fullPath = path.join(BLOG_DIR, revision.contentPath);
    const parsed = parseDocFromPath(fullPath, entry.slug);
    if (!parsed) continue;
    const { content: _content, ...meta } = parsed;
    posts.push(meta);
  }

  // fallback to legacy files not registered in store
  const legacyFiles = fs.existsSync(BLOG_DIR) ? fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith(".mdx") || file.endsWith(".md")) : [];
  for (const file of legacyFiles) {
    const slug = file.replace(/\.mdx?$/, "");
    if (store.posts[slug]) continue;
    const parsed = parseDocFromPath(path.join(BLOG_DIR, file), slug);
    if (!parsed) continue;
    const { content: _content, ...meta } = parsed;
    posts.push(meta);
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

export const getPublishedPostBySlug = cache((slug: string): BlogPost | null => {
  ensureDirs();
  const store = loadStore();
  const entry = readPostEntry(store, slug);
  if (entry && entry.status === "published" && entry.publishedRevisionId) {
    const revision = getRevision(entry, entry.publishedRevisionId);
    if (revision) {
      return parseDocFromPath(path.join(BLOG_DIR, revision.contentPath), slug);
    }
  }

  // legacy fallback
  const mdx = path.join(BLOG_DIR, `${slug}.mdx`);
  const md = path.join(BLOG_DIR, `${slug}.md`);
  if (fs.existsSync(mdx)) return parseDocFromPath(mdx, slug);
  if (fs.existsSync(md)) return parseDocFromPath(md, slug);
  return null;
});

export function getPublishedSlugs(): string[] {
  return getPublishedPosts().map((post) => post.slug);
}

export function getPostDraftOrPublished(slug: string): BlogPost | null {
  const store = loadStore();
  const entry = readPostEntry(store, slug);
  if (!entry) return getPublishedPostBySlug(slug);

  const pick = entry.latestDraftRevisionId ?? entry.publishedRevisionId;
  const revision = getRevision(entry, pick);
  if (!revision) return getPublishedPostBySlug(slug);
  return parseDocFromPath(path.join(BLOG_DIR, revision.contentPath), slug);
}
