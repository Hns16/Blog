#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHECKS = [
  { file: "app/admin/page.tsx", tokens: ['href="/blog"'] },
  { file: "app/admin/posts/page.tsx", tokens: ['href="/admin/new"', 'action="/api/admin/logout"'] },
  { file: "app/admin/new/page.tsx", tokens: ['href="/admin/posts"', 'action="/api/admin/logout"'] },
  { file: "app/admin/edit/[slug]/page.tsx", tokens: ['href="/admin/posts"', 'href="/admin/new"'] }
];

function main() {
  const failures = [];
  for (const check of CHECKS) {
    const source = fs.readFileSync(path.join(ROOT, check.file), "utf-8");
    for (const token of check.tokens) {
      if (!source.includes(token)) failures.push(`${check.file}:missing:${token}`);
    }
  }
  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: CHECKS.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
