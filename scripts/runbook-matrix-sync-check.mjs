#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNBOOK = path.join(ROOT, "docs", "ops-runbook.md");
const REQUIRED_VARS = [
  "DRILL_ALLOW_SKIP",
  "SMOKE_ALLOW_BUILD_SKIP",
  "OUTPUT_ARTIFACT_STRICT"
];

function main() {
  const source = fs.readFileSync(RUNBOOK, "utf-8");
  const missing = REQUIRED_VARS.filter((name) => !source.includes(`\`${name}`));
  if (missing.length > 0) {
    console.error(JSON.stringify({ ok: false, missing, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, requiredVars: REQUIRED_VARS, checkedAt: new Date().toISOString() }, null, 2));
}

main();
