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
const META_IMPORT_RE = /import\s*{[^}]*API_ROUTE_PATH[^}]*}\s*from\s*["']@\/src\/lib\/admin-route-meta["']/;

function main() {
  const failures = [];

  for (const item of ROUTES) {
    const abs = path.join(ROOT, item.file);
    if (!fs.existsSync(abs)) {
      failures.push(`missing_file:${item.file}`);
      continue;
    }
    const source = fs.readFileSync(abs, "utf-8");
    if (!META_IMPORT_RE.test(source)) {
      failures.push(`${item.file}:missing_API_ROUTE_PATH_import`);
    }
    if (!source.includes(`const ROUTE_PATH = ${item.expected};`)) {
      failures.push(`${item.file}:missing_or_drifted_ROUTE_PATH_assignment:${item.expected}`);
    }
    if (source.match(/['"]\/api\//)) {
      failures.push(`${item.file}:hardcoded_api_path_literal_detected`);
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, checked: ROUTES.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
