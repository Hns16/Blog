#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const ALLOWED_TIMESTAMP_KEYS = ["checkedAt", "generatedAt", "timestamp"];
const REQUIRE_JSON_PRINT = "JSON.stringify";

function main() {
  const files = fs.readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith("-check.mjs")).sort();
  const failures = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf-8");
    const hasOk = /(^|[^\w])ok([^\w]|$)/m.test(source) || source.includes('"ok"');
    const hasTimestamp = ALLOWED_TIMESTAMP_KEYS.some((key) => source.includes(key));
    const hasJsonPrint = source.includes(REQUIRE_JSON_PRINT);
    if (!hasOk || !hasTimestamp || !hasJsonPrint) {
      failures.push(`invalid_json_contract:${file}`);
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, checked: files.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
