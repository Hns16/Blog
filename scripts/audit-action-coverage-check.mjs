#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  "app/api/write/route.ts",
  "app/api/admin/health/route.ts",
  "app/api/admin/diag/snapshot/route.ts",
  "app/api/admin/invalidate-sessions/route.ts",
  "app/api/admin/publish-scheduled/route.ts",
  "app/api/admin/write-check/route.ts",
  "app/api/admin/delete-post/route.ts",
  "app/api/admin/update-post/route.ts",
  "app/api/admin/login/route.ts"
];

function main() {
  const failures = [];
  for (const rel of TARGETS) {
    const source = fs.readFileSync(path.join(ROOT, rel), "utf-8");
    if (!source.includes("auditAdminAction(")) {
      failures.push(`${rel}:missing_auditAdminAction`);
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: TARGETS.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
