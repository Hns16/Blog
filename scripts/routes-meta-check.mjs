#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ROUTES = [
  { file: "app/api/write/route.ts", expected: "API_ROUTE_PATH.WRITE" },
  { file: "app/api/admin/health/route.ts", expected: "API_ROUTE_PATH.ADMIN_HEALTH" },
  { file: "app/api/admin/diag/snapshot/route.ts", expected: "API_ROUTE_PATH.ADMIN_DIAG_SNAPSHOT" },
  { file: "app/api/admin/invalidate-sessions/route.ts", expected: "API_ROUTE_PATH.ADMIN_INVALIDATE_SESSIONS" },
  { file: "app/api/admin/publish-scheduled/route.ts", expected: "API_ROUTE_PATH.ADMIN_PUBLISH_SCHEDULED" },
  { file: "app/api/admin/write-check/route.ts", expected: "API_ROUTE_PATH.ADMIN_WRITE_CHECK" },
  { file: "app/api/admin/delete-post/route.ts", expected: "API_ROUTE_PATH.ADMIN_DELETE_POST" },
  { file: "app/api/admin/update-post/route.ts", expected: "API_ROUTE_PATH.ADMIN_UPDATE_POST" },
  { file: "app/api/admin/login/route.ts", expected: "API_ROUTE_PATH.ADMIN_LOGIN" },
  { file: "app/api/admin/logout/route.ts", expected: "API_ROUTE_PATH.ADMIN_LOGOUT" }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) throw new Error(`missing_file:${file}`);
  return fs.readFileSync(abs, "utf-8");
}

function main() {
  const failures = [];

  for (const item of ROUTES) {
    const source = read(item.file);
    if (!source.includes(item.expected)) {
      failures.push(`${item.file}:missing_meta_ref:${item.expected}`);
    }
    if (!source.includes("const ROUTE_PATH")) {
      failures.push(`${item.file}:missing_ROUTE_PATH_const`);
    }
    if (source.includes('const ROUTE_PATH = "/api/')) {
      failures.push(`${item.file}:hardcoded_route_path`);
    }
  }

  assert(failures.length === 0, failures.join("|"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: ROUTES.length,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
