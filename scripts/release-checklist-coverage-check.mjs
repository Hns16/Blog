#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_CHECKLIST = path.join(ROOT, "docs", "release-checklist.md");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const EXCLUDED = new Set(["check:smoke"]);

function main() {
  const checklist = fs.readFileSync(RELEASE_CHECKLIST, "utf-8");
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf-8"));
  const allCheckScripts = Object.keys(pkg.scripts || {})
    .filter((name) => name.startsWith("check:") && !EXCLUDED.has(name))
    .sort();
  const listed = new Set(
    [...checklist.matchAll(/`npm run (check:[^`]+)`/g)].map((match) => match[1])
  );
  const missing = allCheckScripts.filter((script) => !listed.has(script));
  if (missing.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          missing,
          expectedCount: allCheckScripts.length,
          listedCount: listed.size,
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
        expectedCount: allCheckScripts.length,
        listedCount: listed.size,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
