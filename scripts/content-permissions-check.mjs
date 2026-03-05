#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content", "blog");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toErrorCode(error) {
  if (!error || typeof error !== "object") return "unknown_error";
  const code = error.code;
  return typeof code === "string" && code ? code : "io_error";
}

function checkAccess(target, mode) {
  try {
    fs.accessSync(target, mode);
    return { ok: true, errorCode: null };
  } catch (error) {
    return { ok: false, errorCode: toErrorCode(error) };
  }
}

function checkWriteProbe(target) {
  const probePath = path.join(target, `.perm-check-${process.pid}-${Date.now()}.tmp`);
  const startedAt = Date.now();
  try {
    fs.writeFileSync(probePath, "ok", "utf-8");
    fs.unlinkSync(probePath);
    return { ok: true, latencyMs: Date.now() - startedAt, errorCode: null };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, errorCode: toErrorCode(error) };
  } finally {
    if (fs.existsSync(probePath)) {
      try {
        fs.unlinkSync(probePath);
      } catch {
        // noop
      }
    }
  }
}

function main() {
  const exists = fs.existsSync(CONTENT_DIR);
  if (!exists) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          contentDir: CONTENT_DIR,
          exists: false,
          read: { ok: false, errorCode: "not_found" },
          write: { ok: false, errorCode: "not_found" },
          writeProbe: { ok: false, latencyMs: -1, errorCode: "not_found" },
          generatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const read = checkAccess(CONTENT_DIR, fs.constants.R_OK);
  const write = checkAccess(CONTENT_DIR, fs.constants.W_OK);
  const writeProbe = checkWriteProbe(CONTENT_DIR);
  const ok = read.ok && write.ok && writeProbe.ok;

  const payload = {
    ok,
    contentDir: CONTENT_DIR,
    exists,
    read,
    write,
    writeProbe,
    generatedAt: new Date().toISOString()
  };

  // Self-check schema to prevent silent output-shape drift.
  assert(typeof payload.ok === "boolean", "schema:ok");
  assert(typeof payload.contentDir === "string" && payload.contentDir.length > 0, "schema:contentDir");
  assert(typeof payload.exists === "boolean", "schema:exists");
  assert(typeof payload.read?.ok === "boolean", "schema:read.ok");
  assert(payload.read?.errorCode === null || typeof payload.read?.errorCode === "string", "schema:read.errorCode");
  assert(typeof payload.write?.ok === "boolean", "schema:write.ok");
  assert(payload.write?.errorCode === null || typeof payload.write?.errorCode === "string", "schema:write.errorCode");
  assert(typeof payload.writeProbe?.ok === "boolean", "schema:writeProbe.ok");
  assert(typeof payload.writeProbe?.latencyMs === "number", "schema:writeProbe.latencyMs");
  assert(payload.writeProbe?.errorCode === null || typeof payload.writeProbe?.errorCode === "string", "schema:writeProbe.errorCode");
  assert(typeof payload.generatedAt === "string" && payload.generatedAt.length > 0, "schema:generatedAt");

  console.log(JSON.stringify(payload, null, 2));

  if (!payload.ok) process.exit(1);
}

main();
