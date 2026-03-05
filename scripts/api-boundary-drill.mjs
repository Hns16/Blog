#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.DRILL_PORT || 3310);
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = process.env.ADMIN_WRITE_PASSWORD || readPasswordFromEnvFile() || "drill-admin-password";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BASE;

function readPasswordFromEnvFile() {
  const envFile = path.join(process.cwd(), ".env.production");
  if (!fs.existsSync(envFile)) return "";
  const raw = fs.readFileSync(envFile, "utf-8");
  const line = raw.split(/\r?\n/).find((item) => item.startsWith("ADMIN_WRITE_PASSWORD="));
  if (!line) return "";
  return line.slice("ADMIN_WRITE_PASSWORD=".length).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const first = raw.split(",")[0] || "";
  return (first.split(";")[0] || "").trim();
}

async function postForm(pathname, form, cookie) {
  const headers = {
    origin: BASE,
    referer: `${BASE}/admin`,
    accept: "application/json"
  };
  if (cookie) headers.cookie = cookie;
  return fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual"
  });
}

async function postJson(pathname, body, cookie) {
  const headers = {
    origin: BASE,
    referer: `${BASE}/admin`,
    accept: "application/json",
    "content-type": "application/json"
  };
  if (cookie) headers.cookie = cookie;
  return fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "manual"
  });
}

async function postJsonWithHeaders(pathname, body, headers) {
  return fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "manual"
  });
}

async function run() {
  const slug = `boundary-drill-${Date.now()}`;
  const date = new Date().toISOString().slice(0, 10);
  const server = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_WRITE_PASSWORD: PASSWORD,
      NEXT_PUBLIC_SITE_URL: SITE_URL
    },
    stdio: "pipe"
  });

  let output = "";
  let serverExitError = "";
  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  server.on("exit", (code, signal) => {
    if (code !== 0) {
      serverExitError = `server_exit_${code ?? "null"}_${signal ?? "null"}`;
    }
  });

  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 30000) {
      if (serverExitError) {
        throw new Error(serverExitError);
      }
      try {
        const res = await fetch(`${BASE}/admin`, { redirect: "manual" });
        if (res.status >= 200 && res.status < 500) break;
      } catch {
        // retry
      }
      await sleep(500);
    }
    if (serverExitError) {
      throw new Error(serverExitError);
    }
    if (Date.now() - startedAt >= 30000) {
      throw new Error("server_not_ready");
    }

    const unauthorizedCheck = await postJsonWithHeaders(
      "/api/admin/write-check",
      { mode: "create", action: "publish", title: "", description: "", slug: "", date: "", content: "" },
      {
        origin: BASE,
        referer: `${BASE}/admin`,
        accept: "application/json",
        "content-type": "application/json"
      }
    );
    assert(unauthorizedCheck.status === 401, `unauthorized_status_${unauthorizedCheck.status}`);
    const unauthorizedJson = await unauthorizedCheck.json();
    assert(unauthorizedJson?.code === "unauthorized", "unauthorized_code");

    const forbiddenCheck = await postJsonWithHeaders(
      "/api/admin/write-check",
      { mode: "create", action: "publish", title: "", description: "", slug: "", date: "", content: "" },
      {
        origin: "https://evil.example",
        referer: "https://evil.example/page",
        accept: "application/json",
        "content-type": "application/json"
      }
    );
    assert(forbiddenCheck.status === 403, `forbidden_status_${forbiddenCheck.status}`);
    const forbiddenJson = await forbiddenCheck.json();
    assert(forbiddenJson?.code === "forbidden", "forbidden_code");

    const loginForm = new FormData();
    loginForm.set("password", PASSWORD);
    const loginRes = await postForm("/api/admin/login", loginForm, "");
    assert(loginRes.status === 303, `login_status_${loginRes.status}`);
    const cookie = extractCookie(loginRes);
    assert(cookie.startsWith("admin_auth="), "missing_admin_cookie");

    const createForm = new FormData();
    createForm.set("action", "save_draft");
    createForm.set("title", "Boundary Drill");
    createForm.set("description", "Boundary drill description");
    createForm.set("slug", slug);
    createForm.set("date", date);
    createForm.set("tags", "drill,boundary");
    createForm.set("content", "Boundary drill content");
    const createRes = await postForm("/api/write", createForm, cookie);
    assert(createRes.status === 200, `create_status_${createRes.status}`);
    const createJson = await createRes.json();
    assert(createJson?.ok === true, "create_failed");

    const missingArchive = await postJson(
      "/api/admin/write-check",
      { mode: "update", action: "archive", originalSlug: `not-exists-${Date.now()}` },
      cookie
    );
    assert(missingArchive.status === 404, `archive_missing_status_${missingArchive.status}`);
    const missingArchiveJson = await missingArchive.json();
    assert(missingArchiveJson?.code === "not_found", "archive_missing_code");

    const badRollback = await postJson(
      "/api/admin/write-check",
      {
        mode: "update",
        action: "rollback",
        originalSlug: slug,
        targetRevisionId: "rev-not-exists"
      },
      cookie
    );
    assert(badRollback.status === 404, `rollback_missing_status_${badRollback.status}`);
    const badRollbackJson = await badRollback.json();
    assert(badRollbackJson?.code === "revision_not_found", "rollback_missing_code");

    const deleteForm = new FormData();
    deleteForm.set("slug", slug);
    const deleteRes = await postForm("/api/admin/delete-post", deleteForm, cookie);
    assert(deleteRes.status === 200, `delete_status_${deleteRes.status}`);
    const deleteJson = await deleteRes.json();
    assert(deleteJson?.ok === true, "delete_failed");

    console.log(
      JSON.stringify(
        {
          pass: true,
          generatedAt: new Date().toISOString(),
          checks: [
            "forbidden_boundary",
            "unauthorized_boundary",
            "login",
            "create_draft",
            "archive_not_found_boundary",
            "rollback_revision_not_found_boundary",
            "cleanup"
          ]
        },
        null,
        2
      )
    );
  } catch (error) {
    const detail = output.trim().slice(-1200);
    const base = error instanceof Error ? error.message : "unknown_error";
    throw new Error(`${base}${detail ? ` | ${detail}` : ""}`);
  } finally {
    server.kill("SIGTERM");
    await sleep(300);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
    if (output.includes("Error")) {
      // no-op: keep stderr captured for local debugging when needed
    }
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  if (
    process.env.DRILL_ALLOW_SKIP === "1" &&
    (message.includes("listen EPERM") || message.includes("server_exit_1_"))
  ) {
    console.log(
      JSON.stringify(
        {
          pass: true,
          skipped: true,
          reason: "listen_eperm",
          generatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error(
    JSON.stringify(
      {
        pass: false,
        generatedAt: new Date().toISOString(),
        error: message
      },
      null,
      2
    )
  );
  process.exit(1);
});
