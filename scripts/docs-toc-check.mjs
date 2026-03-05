#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPECS = [
  {
    file: "docs/ops-runbook.md",
    mustInclude: ["# Ops Runbook", "## 1. Pre-Release Gate", "## 7. Read-Only Troubleshooting"]
  },
  {
    file: "docs/release-checklist.md",
    mustInclude: ["# Release Checklist", "## 1. Build Gate", "## 4. Manual Verification"]
  },
  {
    file: "docs/admin-api-contract.md",
    mustInclude: ["# Admin API Contract", "## Base Rules", "## Endpoints"]
  },
  {
    file: "docs/incident-response.md",
    mustInclude: ["# Incident Response", "## 1. Trigger Conditions", "## 8. Escalation Thresholds (SLO/SLA)"]
  }
];

function main() {
  const errors = [];
  for (const spec of SPECS) {
    const source = fs.readFileSync(path.join(ROOT, spec.file), "utf-8");
    for (const marker of spec.mustInclude) {
      if (!source.includes(marker)) {
        errors.push(`${spec.file}:missing:${marker}`);
      }
    }
  }
  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: SPECS.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
