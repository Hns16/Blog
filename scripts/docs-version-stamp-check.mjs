#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STALE_DAYS_WARNING = Number(process.env.DOCS_STAMP_STALE_DAYS || 30);
const STALE_MS = Math.max(STALE_DAYS_WARNING, 1) * 24 * 60 * 60 * 1000;
const FILES = [
  "README.md",
  "docs/ops-runbook.md",
  "docs/release-checklist.md",
  "docs/admin-api-contract.md",
  "docs/incident-response.md"
];
const STAMP_RE = /Last Updated:\s*(\d{4}-\d{2}-\d{2})/;

function main() {
  const warnings = [];
  const invalid = [];
  const checked = [];

  for (const file of FILES) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf-8");
    const match = source.match(STAMP_RE);
    if (!match) {
      warnings.push(`${file}:missing_last_updated_stamp`);
      continue;
    }
    const stamp = match[1];
    const stampMs = Date.parse(`${stamp}T00:00:00Z`);
    if (Number.isNaN(stampMs)) {
      invalid.push(`${file}:invalid_last_updated_stamp:${stamp}`);
      continue;
    }
    if (Date.now() - stampMs > STALE_MS) {
      warnings.push(`${file}:stale_last_updated_stamp:older_than_${STALE_DAYS_WARNING}d`);
    }
    checked.push({ file, lastUpdated: stamp });
  }

  if (invalid.length > 0) {
    console.error(JSON.stringify({ ok: false, invalid, warnings, checked, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify({ ok: true, staleDaysWarning: STALE_DAYS_WARNING, warnings, checked, checkedAt: new Date().toISOString() }, null, 2)
  );
}

main();
