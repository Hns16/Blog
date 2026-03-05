#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TARGET = path.join(process.cwd(), "app", "api", "admin", "publish-scheduled", "route.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const source = fs.readFileSync(TARGET, "utf-8");

  assert(source.includes("const results = runScheduledPublish(new Date())"), "missing_results_collect");
  assert(source.includes("count: results.length"), "missing_count_field");
  assert(source.includes("requestId"), "missing_request_id_field");
  assert(source.includes("auditAdminAction(AUDIT_ACTION.UPDATE, \"scheduled\", \"success\""), "missing_update_audit");
  assert(source.includes("return jsonSuccessResponse"), "missing_success_response");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "results_collected",
          "count_field_present",
          "request_id_present",
          "update_audit_present",
          "success_response_present"
        ],
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
