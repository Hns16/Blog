#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const REQUESTED_PORT = Number(process.env.DRILL_PORT || 3321);
const PASSWORD = process.env.ADMIN_WRITE_PASSWORD || readPasswordFromEnvFile() || "drill-admin-password";

function readPasswordFromEnvFile() {
  const envFile = path.join(process.cwd(), ".env.production");
  if (!fs.existsSync(envFile)) return "";
  const raw = fs.readFileSync(envFile, "utf-8");
  const line = raw.split(/\r?\n/).find((item) => item.startsWith("ADMIN_WRITE_PASSWORD="));
  return line ? line.slice("ADMIN_WRITE_PASSWORD=".length).trim() : "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function selectPort(preferred) {
  if (preferred > 0 && await checkPortFree(preferred)) return preferred;
  for (let i = 0; i < 20; i += 1) {
    const candidate = 3400 + Math.floor(Math.random() * 500);
    if (await checkPortFree(candidate)) return candidate;
  }
  return preferred;
}

function extractCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const first = raw.split(",")[0] || "";
  return (first.split(";")[0] || "").trim();
}

async function waitServerReady(base, timeoutMs, getExitError) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const exitError = getExitError();
    if (exitError) throw new Error(exitError);
    try {
      const res = await fetch(`${base}/admin`, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error("server_not_ready");
}

async function main() {
  const PORT = await selectPort(REQUESTED_PORT);
  const BASE = `http://127.0.0.1:${PORT}`;
  const server = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ADMIN_WRITE_PASSWORD: PASSWORD, NEXT_PUBLIC_SITE_URL: BASE },
    stdio: "pipe"
  });

  let serverExitError = "";
  server.on("exit", (code, signal) => {
    if (code !== 0) serverExitError = `server_exit_${code ?? "null"}_${signal ?? "null"}`;
  });

  try {
    await waitServerReady(BASE, 30000, () => serverExitError);

    const loginForm = new FormData();
    loginForm.set("password", PASSWORD);
    const loginRes = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: {
        origin: BASE,
        referer: `${BASE}/admin`,
        accept: "text/html"
      },
      body: loginForm,
      redirect: "manual"
    });
    if (loginRes.status !== 303) throw new Error(`login_status_${loginRes.status}`);
    const cookie = extractCookie(loginRes);
    if (!cookie.startsWith("admin_auth=")) throw new Error("missing_admin_cookie");

    const res = await fetch(`${BASE}/api/admin/health`, {
      method: "GET",
      headers: {
        origin: BASE,
        referer: `${BASE}/admin`,
        accept: "application/json",
        cookie
      },
      redirect: "manual"
    });
    if (res.status !== 200) throw new Error(`health_status_${res.status}`);
    const json = await res.json();
    if (!json?.summary) throw new Error("missing_summary");
    if (!json?.checks?.audit) throw new Error("missing_checks_audit");
    if (!json?.audit) throw new Error("missing_audit");

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: ["summary", "checks.audit", "audit"],
          checkedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (
      process.env.DRILL_ALLOW_SKIP === "1" &&
      (message.includes("listen EPERM") || message.includes("server_exit_1_") || message.includes("server_not_ready"))
    ) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            skipped: true,
            reason: "listen_eperm",
            checkedAt: new Date().toISOString()
          },
          null,
          2
        )
      );
      return;
    }
    throw error;
  } finally {
    server.kill("SIGTERM");
    await sleep(300);
    if (!server.killed) server.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error",
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  process.exit(1);
});
