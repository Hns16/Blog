#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET = path.join(ROOT, "app", "api", "admin", "publish-scheduled", "route.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const source = fs.readFileSync(TARGET, "utf-8");

  assert(source.includes("isHtmlRequest"), "missing_isHtmlRequest");
  assert(source.includes("NextResponse.redirect"), "missing_html_redirect");
  assert(source.includes("success=scheduled_run"), "missing_scheduled_success_redirect");
  assert(source.includes("rid=${encodeURIComponent(requestId)}"), "missing_request_id_redirect");
  assert(source.includes("jsonSuccessResponse"), "missing_json_fallback");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "html_request_detected",
          "html_redirect_present",
          "scheduled_success_query_present",
          "request_id_query_present",
          "json_response_preserved"
        ],
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
