#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const STATE_DIR = path.join(BLOG_DIR, ".state");
const REVISIONS_DIR = path.join(BLOG_DIR, ".revisions");
const STORE_FILE = path.join(STATE_DIR, "publish-store.json");
const QUEUE_FILE = path.join(STATE_DIR, "schedule-queue.json");

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(REVISIONS_DIR, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeAtomic(file, content) {
  const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, file);
}

function writeJson(file, value) {
  writeAtomic(file, JSON.stringify(value, null, 2));
}

function revisionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function doc(title, description, date, content) {
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ndate: ${JSON.stringify(date)}\n---\n\n${content}\n`;
}

function step(name, fn) {
  const started = Date.now();
  try {
    const data = fn();
    return { step: name, pass: true, durationMs: Date.now() - started, error: null, data };
  } catch (error) {
    return { step: name, pass: false, durationMs: Date.now() - started, error: error instanceof Error ? error.message : "unknown", data: null };
  }
}

ensureDirs();

const slug = `release-drill-${Date.now()}`;
const date = new Date().toISOString().slice(0, 10);
const title = "Release Drill Post";
const store = readJson(STORE_FILE, { version: 1, posts: {} });
const queue = readJson(QUEUE_FILE, { version: 1, tasks: [] });
const report = [];

let rev1 = "";
let rev2 = "";

report.push(step("create_draft", () => {
  rev1 = revisionId();
  const dir = path.join(REVISIONS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${rev1}.mdx`);
  writeAtomic(p, doc(title, "draft", date, "first-version"));
  store.posts[slug] = {
    slug,
    status: "draft",
    publishedRevisionId: null,
    latestDraftRevisionId: rev1,
    publishedAt: null,
    updatedAt: nowIso(),
    revisions: [
      { slug, revisionId: rev1, status: "draft", createdAt: nowIso(), updatedAt: nowIso(), publishedAt: null, title, description: "draft", date, tags: [], contentPath: path.relative(BLOG_DIR, p) }
    ]
  };
  writeJson(STORE_FILE, store);
  return { slug, revisionId: rev1 };
}));

report.push(step("publish", () => {
  const entry = store.posts[slug];
  if (!entry) throw new Error("missing_entry");
  const rev = entry.revisions.find((r) => r.revisionId === rev1);
  if (!rev) throw new Error("missing_revision");
  const source = fs.readFileSync(path.join(BLOG_DIR, rev.contentPath), "utf-8");
  writeAtomic(path.join(BLOG_DIR, `${slug}.mdx`), source);
  entry.status = "published";
  entry.publishedRevisionId = rev1;
  entry.publishedAt = nowIso();
  rev.status = "published";
  rev.publishedAt = nowIso();
  writeJson(STORE_FILE, store);
  return { publishedRevisionId: rev1 };
}));

report.push(step("publish_new_revision", () => {
  rev2 = revisionId();
  const dir = path.join(REVISIONS_DIR, slug);
  const p = path.join(dir, `${rev2}.mdx`);
  writeAtomic(p, doc(title, "v2", date, "second-version"));
  const entry = store.posts[slug];
  entry.revisions.push({ slug, revisionId: rev2, status: "published", createdAt: nowIso(), updatedAt: nowIso(), publishedAt: nowIso(), title, description: "v2", date, tags: [], contentPath: path.relative(BLOG_DIR, p) });
  entry.publishedRevisionId = rev2;
  entry.status = "published";
  entry.latestDraftRevisionId = null;
  writeAtomic(path.join(BLOG_DIR, `${slug}.mdx`), fs.readFileSync(p, "utf-8"));
  writeJson(STORE_FILE, store);
  return { revisionId: rev2 };
}));

report.push(step("rollback", () => {
  const entry = store.posts[slug];
  const rev = entry.revisions.find((r) => r.revisionId === rev1);
  if (!rev) throw new Error("missing_revision");
  const source = fs.readFileSync(path.join(BLOG_DIR, rev.contentPath), "utf-8");
  writeAtomic(path.join(BLOG_DIR, `${slug}.mdx`), source);
  entry.publishedRevisionId = rev1;
  entry.status = "published";
  writeJson(STORE_FILE, store);
  const current = fs.readFileSync(path.join(BLOG_DIR, `${slug}.mdx`), "utf-8");
  if (!current.includes("first-version")) throw new Error("rollback_verify_failed");
  return { rollbackTo: rev1 };
}));

report.push(step("republish", () => {
  const entry = store.posts[slug];
  const rev = entry.revisions.find((r) => r.revisionId === rev2);
  if (!rev) throw new Error("missing_revision");
  const source = fs.readFileSync(path.join(BLOG_DIR, rev.contentPath), "utf-8");
  writeAtomic(path.join(BLOG_DIR, `${slug}.mdx`), source);
  entry.publishedRevisionId = rev2;
  entry.status = "published";
  writeJson(STORE_FILE, store);
  const current = fs.readFileSync(path.join(BLOG_DIR, `${slug}.mdx`), "utf-8");
  if (!current.includes("second-version")) throw new Error("republish_verify_failed");
  return { republishedTo: rev2 };
}));

report.push(step("cleanup", () => {
  delete store.posts[slug];
  queue.tasks = (queue.tasks || []).filter((task) => task.slug !== slug);
  writeJson(STORE_FILE, store);
  writeJson(QUEUE_FILE, queue);
  const root = path.join(BLOG_DIR, `${slug}.mdx`);
  if (fs.existsSync(root)) fs.unlinkSync(root);
  const dir = path.join(REVISIONS_DIR, slug);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return { removed: slug };
}));

const pass = report.every((item) => item.pass);
const output = {
  pass,
  generatedAt: nowIso(),
  steps: report
};

console.log(JSON.stringify(output, null, 2));
if (!pass) process.exit(1);
