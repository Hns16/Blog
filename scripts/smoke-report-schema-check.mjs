#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REPORT = path.join(process.cwd(), "output", "smoke-last.json");

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error(JSON.stringify({ ok: false, error: "missing_report", checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(REPORT, "utf-8"));
  const errors = [];

  if (payload?.ok !== true) errors.push("invalid:ok");
  if (!Array.isArray(payload?.steps) || payload.steps.length === 0) errors.push("invalid:steps");
  if (!Array.isArray(payload?.durations) || payload.durations.length === 0) errors.push("invalid:durations");
  if (typeof payload?.totalDurationMs !== "number") errors.push("invalid:totalDurationMs");
  if (!Array.isArray(payload?.slowStepWarnings) || !payload.slowStepWarnings.every((x) => typeof x === "string")) {
    errors.push("invalid:slowStepWarnings");
  }
  if (typeof payload?.generatedAt !== "string") errors.push("invalid:generatedAt");

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checkedAt: new Date().toISOString() }, null, 2));
}

main();
