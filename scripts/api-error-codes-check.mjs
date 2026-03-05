#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CHECKS = [
  { file: "src/lib/admin-route-guard.ts", token: 'code: options.forbiddenCode ?? "forbidden"' },
  { file: "src/lib/admin-route-guard.ts", token: 'code: options.unauthorizedCode ?? "unauthorized"' },
  { file: "src/lib/admin-write-shared.ts", token: '"slug_conflict"' },
  { file: "src/lib/admin-write-shared.ts", token: '"write_conflict"' },
  { file: "src/lib/admin-write-shared.ts", token: '"invalid_slug"' },
  { file: "src/lib/admin-write-shared.ts", token: '"invalid_date"' },
  { file: "src/lib/admin-write-shared.ts", token: '"missing_required"' },
  { file: "src/lib/admin-write-shared.ts", token: '"invalid_action"' },
  { file: "src/lib/admin-write-shared.ts", token: '"schedule_invalid"' },
  { file: "src/lib/admin-write-shared.ts", token: '"revision_not_found"' },
  { file: "src/lib/admin-write-shared.ts", token: '"publish_failed"' },
  { file: "src/lib/admin-write-shared.ts", token: '"not_found"' },
  { file: "app/api/admin/login/route.ts", token: 'code: "RATE_LIMITED"' }
];

function main() {
  const errors = [];
  for (const check of CHECKS) {
    const abs = path.join(ROOT, check.file);
    const source = fs.readFileSync(abs, "utf-8");
    if (!source.includes(check.token)) {
      errors.push(`${check.file}:missing:${check.token}`);
    }
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, checked: CHECKS.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
