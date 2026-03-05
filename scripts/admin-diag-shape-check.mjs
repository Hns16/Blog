#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIAG_FILE = path.join(ROOT, "src", "lib", "admin-diag.ts");
const DIAG_ROUTE_FILE = path.join(ROOT, "app", "api", "admin", "diag", "snapshot", "route.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const diagSource = fs.readFileSync(DIAG_FILE, "utf-8");
  const routeSource = fs.readFileSync(DIAG_ROUTE_FILE, "utf-8");

  assert(diagSource.includes("health: {"), "missing_diag_health_block");
  assert(diagSource.includes('summary: "ok" | "warn" | "error"'), "missing_diag_health_summary");
  assert(diagSource.includes("audit: { mode: "), "missing_diag_audit_block");
  assert(diagSource.includes("events: Array<{"), "missing_diag_events_block");
  assert(diagSource.includes("const events = getRecentAuditEvents"), "missing_diag_events_source");

  assert(routeSource.includes("getDiagSnapshot"), "diag_route_missing_snapshot_call");
  assert(routeSource.includes("jsonSuccessResponse"), "diag_route_missing_json_response");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "diag_health_shape",
          "diag_audit_shape",
          "diag_events_shape",
          "diag_route_snapshot_flow"
        ],
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
