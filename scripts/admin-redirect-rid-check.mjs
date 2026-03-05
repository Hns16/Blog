#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, "app", "api", "admin", "update-post", "route.ts"),
  path.join(ROOT, "app", "api", "admin", "delete-post", "route.ts"),
  path.join(ROOT, "app", "api", "admin", "publish-scheduled", "route.ts")
];

function main() {
  const failures = [];
  for (const file of TARGETS) {
    const source = fs.readFileSync(file, "utf-8");
    if (!source.includes("rid=")) {
      failures.push(`${path.relative(ROOT, file)}:missing_rid_query`);
    }
    if (!source.includes("encodeURIComponent(requestId)")) {
      failures.push(`${path.relative(ROOT, file)}:missing_request_id_encode`);
    }
  }

  if (failures.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          failures,
          checkedAt: new Date().toISOString()
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
        checked: TARGETS.length,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
