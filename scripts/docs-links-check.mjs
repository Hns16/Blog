#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const README = path.join(ROOT, "README.md");
const REQUIRED_DOCS = [
  "docs/ops-runbook.md",
  "docs/release-checklist.md",
  "docs/admin-api-contract.md",
  "docs/incident-response.md"
];

function main() {
  const source = fs.readFileSync(README, "utf-8");
  const missing = REQUIRED_DOCS.filter((doc) => !source.includes(doc));

  if (missing.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          missing,
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
        checked: REQUIRED_DOCS,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
