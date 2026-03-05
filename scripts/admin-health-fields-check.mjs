#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TARGET = path.join(process.cwd(), "app", "api", "admin", "health", "route.ts");
const REQUIRED_TOKENS = [
  "requestId",
  "summary:",
  "checks:",
  "auth:",
  "contentRw:",
  "writeProbe:",
  "storage:",
  "audit:"
];

function main() {
  const source = fs.readFileSync(TARGET, "utf-8");
  const errors = REQUIRED_TOKENS.filter((token) => !source.includes(token)).map((token) => `missing:${token}`);
  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checkedAt: new Date().toISOString() }, null, 2));
}

main();
