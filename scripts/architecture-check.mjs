#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");

const REQUIRED_CONTEXT_ROUTES = [
  "app/api/write/route.ts",
  "app/api/admin/health/route.ts",
  "app/api/admin/diag/snapshot/route.ts",
  "app/api/admin/invalidate-sessions/route.ts",
  "app/api/admin/publish-scheduled/route.ts",
  "app/api/admin/write-check/route.ts",
  "app/api/admin/delete-post/route.ts",
  "app/api/admin/update-post/route.ts",
  "app/api/admin/login/route.ts",
  "app/api/admin/logout/route.ts"
];

const REQUIRED_GUARD_ROUTES = [
  "app/api/write/route.ts",
  "app/api/admin/health/route.ts",
  "app/api/admin/diag/snapshot/route.ts",
  "app/api/admin/invalidate-sessions/route.ts",
  "app/api/admin/publish-scheduled/route.ts",
  "app/api/admin/write-check/route.ts",
  "app/api/admin/delete-post/route.ts",
  "app/api/admin/update-post/route.ts",
  "app/api/admin/login/route.ts",
  "app/api/admin/logout/route.ts"
];

const ROUTE_GUARD_RULES = {
  "app/api/write/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/health/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/diag/snapshot/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/invalidate-sessions/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/publish-scheduled/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/write-check/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/delete-post/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/update-post/route.ts": ["guardSameOrigin", "guardAdminAuthenticated"],
  "app/api/admin/login/route.ts": ["guardSameOrigin"],
  "app/api/admin/logout/route.ts": ["guardSameOrigin"]
};

function readText(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`missing_file:${relPath}`);
  }
  return fs.readFileSync(abs, "utf-8");
}

function walkRoutes(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRoutes(full, files);
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
  return files;
}

function assertIncludes(relPath, token, errors) {
  const text = readText(relPath);
  if (!text.includes(token)) {
    errors.push(`${relPath}:missing:${token}`);
  }
}

function main() {
  const errors = [];
  const routeFiles = walkRoutes(API_DIR);

  for (const file of REQUIRED_CONTEXT_ROUTES) {
    assertIncludes(file, "createAdminRequestContext", errors);
  }

  for (const file of REQUIRED_GUARD_ROUTES) {
    assertIncludes(file, "guardSameOrigin", errors);
  }

  for (const [file, tokens] of Object.entries(ROUTE_GUARD_RULES)) {
    const text = readText(file);
    for (const token of tokens) {
      if (!text.includes(token)) {
        errors.push(`${file}:missing_guard:${token}`);
      }
    }
  }

  for (const file of routeFiles) {
    const text = readText(file);
    if (text.includes("Date.now() - startedAt")) {
      errors.push(`${file}:legacy_duration_pattern`);
    }
  }

  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          errorCount: errors.length,
          errors
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
        checkedRoutes: routeFiles.length,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
