#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HEALTH_FILE = path.join(ROOT, "src", "lib", "admin-health.ts");
const ROUTE_FILE = path.join(ROOT, "app", "api", "admin", "health", "route.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const healthSource = fs.readFileSync(HEALTH_FILE, "utf-8");
  const routeSource = fs.readFileSync(ROUTE_FILE, "utf-8");

  assert(healthSource.includes("checks: {"), "missing_checks_block");
  assert(healthSource.includes("auth: CheckLevel;"), "missing_check_auth");
  assert(healthSource.includes("content_rw: CheckLevel;"), "missing_check_content_rw");
  assert(healthSource.includes("write_probe: CheckLevel;"), "missing_check_write_probe");
  assert(healthSource.includes("storage: CheckLevel;"), "missing_check_storage");
  assert(healthSource.includes("audit: CheckLevel;"), "missing_check_audit");
  assert(healthSource.includes("audit: {"), "missing_audit_payload");

  assert(routeSource.includes("checks: health.checks"), "route_missing_checks_forward");
  assert(routeSource.includes("audit: health.audit"), "route_missing_audit_forward");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "health_checks_shape",
          "health_audit_shape",
          "route_checks_forward",
          "route_audit_forward"
        ],
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
