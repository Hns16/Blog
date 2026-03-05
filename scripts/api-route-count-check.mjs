#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");
const EXPECTED_ROUTE_COUNT = 10;

function walkRoutes(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRoutes(full, files);
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
  return files;
}

function main() {
  const routes = walkRoutes(API_DIR).sort();
  const ok = routes.length === EXPECTED_ROUTE_COUNT;
  const payload = {
    ok,
    expected: EXPECTED_ROUTE_COUNT,
    actual: routes.length,
    routes,
    checkedAt: new Date().toISOString()
  };
  if (!ok) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(payload, null, 2));
}

main();
