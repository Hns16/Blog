#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = [
  "README.md",
  "docs/ops-runbook.md",
  "docs/release-checklist.md"
];
const ALLOWED_BASE_ONLY = new Set([
  "npm run dev",
  "npm run start",
  "npm run lint && npx tsc --noEmit && npm run build",
  "npm run check:smoke"
]);

function extractCommands(raw) {
  const fencedBlocks = [...raw.matchAll(/```(?:bash)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  const fenced = fencedBlocks
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.startsWith("npm run "));
  const inline = [...raw.matchAll(/`(npm run [^`]+)`/g)].map((m) => m[1].trim());
  const all = [...fenced, ...inline];
  const counts = new Map();
  for (const cmd of all) {
    counts.set(cmd, (counts.get(cmd) || 0) + 1);
  }
  return {
    unique: new Set(all),
    duplicates: [...counts.entries()].filter(([, count]) => count > 1).map(([cmd, count]) => ({ cmd, count }))
  };
}

function minus(a, b) {
  return [...a].filter((x) => !b.has(x));
}

function main() {
  const sets = new Map();
  const duplicateWarnings = [];
  for (const file of DOCS) {
    const raw = fs.readFileSync(path.join(ROOT, file), "utf-8");
    const extracted = extractCommands(raw);
    sets.set(file, extracted.unique);
    for (const item of extracted.duplicates) {
      duplicateWarnings.push(`${file}:duplicate:${item.cmd}:count=${item.count}`);
    }
  }

  const [baseFile, ...rest] = DOCS;
  const base = sets.get(baseFile);
  const errors = [];

  for (const file of rest) {
    const target = sets.get(file);
    const missingInTarget = minus(base, target).filter((cmd) => !ALLOWED_BASE_ONLY.has(cmd));
    const extraInTarget = minus(target, base);
    if (missingInTarget.length > 0) {
      errors.push(`${file}:missing:${missingInTarget.join(",")}`);
    }
    if (extraInTarget.length > 0) {
      errors.push(`${file}:extra:${extraInTarget.join(",")}`);
    }
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, warnings: duplicateWarnings, checkedAt: new Date().toISOString() }, null, 2));
}

main();
