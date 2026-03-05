#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPECS = [
  {
    file: "app/admin/page.tsx",
    keys: ["error?: string;", "retry_after?: string;"]
  },
  {
    file: "app/admin/posts/page.tsx",
    keys: ["success?: string;", "error?: string;", "rid?: string;", "q?: string;", "page?: string;", "status?: string;"]
  },
  {
    file: "app/admin/new/page.tsx",
    keys: ["error?: string;", "success?: string;", "slug?: string;"]
  },
  {
    file: "app/admin/edit/[slug]/page.tsx",
    keys: ["searchParams?: { error?: string };"]
  }
];

function main() {
  const failures = [];
  for (const spec of SPECS) {
    const source = fs.readFileSync(path.join(ROOT, spec.file), "utf-8");
    for (const key of spec.keys) {
      if (!source.includes(key)) {
        failures.push(`${spec.file}:missing:${key}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: SPECS.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
