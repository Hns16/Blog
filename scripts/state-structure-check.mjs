#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, "content", "blog", ".state");
const STORE_FILE = path.join(STATE_DIR, "publish-store.json");
const QUEUE_FILE = path.join(STATE_DIR, "schedule-queue.json");

const SLUG_RE = /^[a-z0-9-]+$/;

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, value: null };
  const raw = fs.readFileSync(filePath, "utf-8");
  return { exists: true, value: JSON.parse(raw) };
}

function isIso(value) {
  if (typeof value !== "string" || value.length < 10) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function validateStore(store, errors) {
  if (typeof store !== "object" || store === null) {
    errors.push("publish-store:not_object");
    return;
  }
  if (store.version !== 1) errors.push("publish-store:version_not_1");
  if (typeof store.posts !== "object" || store.posts === null || Array.isArray(store.posts)) {
    errors.push("publish-store:posts_not_object");
    return;
  }

  for (const [slug, post] of Object.entries(store.posts)) {
    if (!SLUG_RE.test(slug)) errors.push(`publish-store:slug_invalid:${slug}`);
    if (typeof post !== "object" || post === null) {
      errors.push(`publish-store:post_not_object:${slug}`);
      continue;
    }
    if (post.slug !== slug) errors.push(`publish-store:post_slug_mismatch:${slug}`);
    if (!["draft", "published", "scheduled", "archived"].includes(post.status)) {
      errors.push(`publish-store:status_invalid:${slug}`);
    }
    if (!(post.publishedRevisionId === null || typeof post.publishedRevisionId === "string")) {
      errors.push(`publish-store:publishedRevisionId_invalid:${slug}`);
    }
    if (!(post.latestDraftRevisionId === null || typeof post.latestDraftRevisionId === "string")) {
      errors.push(`publish-store:latestDraftRevisionId_invalid:${slug}`);
    }
    if (!(post.publishedAt === null || isIso(post.publishedAt))) {
      errors.push(`publish-store:publishedAt_invalid:${slug}`);
    }
    if (!isIso(post.updatedAt)) {
      errors.push(`publish-store:updatedAt_invalid:${slug}`);
    }
    if (!Array.isArray(post.revisions)) {
      errors.push(`publish-store:revisions_not_array:${slug}`);
      continue;
    }
    for (const rev of post.revisions) {
      if (typeof rev !== "object" || rev === null) {
        errors.push(`publish-store:revision_not_object:${slug}`);
        continue;
      }
      if (rev.slug !== slug) errors.push(`publish-store:revision_slug_mismatch:${slug}`);
      if (typeof rev.revisionId !== "string" || !rev.revisionId) errors.push(`publish-store:revision_id_invalid:${slug}`);
      if (!["draft", "published", "archived"].includes(rev.status)) errors.push(`publish-store:revision_status_invalid:${slug}`);
      if (!isIso(rev.createdAt)) errors.push(`publish-store:revision_createdAt_invalid:${slug}`);
      if (!isIso(rev.updatedAt)) errors.push(`publish-store:revision_updatedAt_invalid:${slug}`);
      if (!(rev.publishedAt === null || isIso(rev.publishedAt))) errors.push(`publish-store:revision_publishedAt_invalid:${slug}`);
      if (typeof rev.title !== "string") errors.push(`publish-store:revision_title_invalid:${slug}`);
      if (typeof rev.description !== "string") errors.push(`publish-store:revision_description_invalid:${slug}`);
      if (typeof rev.date !== "string") errors.push(`publish-store:revision_date_invalid:${slug}`);
      if (!Array.isArray(rev.tags)) errors.push(`publish-store:revision_tags_invalid:${slug}`);
      if (typeof rev.contentPath !== "string" || !rev.contentPath) errors.push(`publish-store:revision_contentPath_invalid:${slug}`);
    }
  }
}

function validateQueue(queue, errors) {
  if (typeof queue !== "object" || queue === null) {
    errors.push("schedule-queue:not_object");
    return;
  }
  if (queue.version !== 1) errors.push("schedule-queue:version_not_1");
  if (!Array.isArray(queue.tasks)) {
    errors.push("schedule-queue:tasks_not_array");
    return;
  }
  for (const task of queue.tasks) {
    if (typeof task !== "object" || task === null) {
      errors.push("schedule-queue:task_not_object");
      continue;
    }
    if (typeof task.taskId !== "string" || !task.taskId) errors.push("schedule-queue:task_id_invalid");
    if (typeof task.slug !== "string" || !SLUG_RE.test(task.slug)) errors.push("schedule-queue:task_slug_invalid");
    if (typeof task.revisionId !== "string" || !task.revisionId) errors.push("schedule-queue:task_revision_invalid");
    if (!isIso(task.publishAt)) errors.push("schedule-queue:task_publishAt_invalid");
    if (!["pending", "done", "canceled"].includes(task.status)) errors.push("schedule-queue:task_status_invalid");
    if (!isIso(task.createdAt)) errors.push("schedule-queue:task_createdAt_invalid");
    if (!isIso(task.updatedAt)) errors.push("schedule-queue:task_updatedAt_invalid");
  }
}

function main() {
  const errors = [];
  const store = readJsonIfExists(STORE_FILE);
  const queue = readJsonIfExists(QUEUE_FILE);

  if (store.exists) {
    try {
      validateStore(store.value, errors);
    } catch {
      errors.push("publish-store:validate_failed");
    }
  }
  if (queue.exists) {
    try {
      validateQueue(queue.value, errors);
    } catch {
      errors.push("schedule-queue:validate_failed");
    }
  }

  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          errors
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: {
          publishStore: store.exists,
          scheduleQueue: queue.exists
        },
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();

