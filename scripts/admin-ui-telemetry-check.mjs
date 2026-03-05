#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TARGET = path.join(process.cwd(), "src", "lib", "admin-ui-shared.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const source = fs.readFileSync(TARGET, "utf-8");

  assert(source.includes("admin_posts_unknown_error:${error}"), "missing_unknown_telemetry_template");
  assert(source.includes("telemetryCode"), "missing_telemetry_field");
  assert(source.includes("admin.posts.error.unknown"), "missing_unknown_message_key");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "unknown_error_telemetry_pattern",
          "telemetry_field_present",
          "unknown_message_key_present"
        ],
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
