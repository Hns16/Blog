#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAX_ARTIFACT_AGE_HOURS = Number(process.env.OUTPUT_ARTIFACT_MAX_AGE_HOURS || 168);
const STRICT_MODE = process.env.OUTPUT_ARTIFACT_STRICT === "1";
const STRICT_MISSING_AS_WARNING = process.env.OUTPUT_ARTIFACT_STRICT_MISSING_AS_WARNING === "1";
const MAX_AGE_MS = Math.max(MAX_ARTIFACT_AGE_HOURS, 1) * 60 * 60 * 1000;
const REQUIRED = [
  {
    file: path.join(ROOT, "output", "smoke-last.json"),
    minBytes: 32
  }
];
const OPTIONAL = [
  {
    file: path.join(ROOT, "output", "playwright", "playwright-cli.json"),
    minBytes: 2
  }
];
const STRICT_REQUIRED = [
  {
    file: path.join(ROOT, "output", "playwright", "example.com.png"),
    minBytes: 64
  }
];
const SMOKE_FAILURE = path.join(ROOT, "output", "smoke-failures.json");

function validateSmokeFailureSchema(file) {
  const errors = [];
  const payload = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (typeof payload !== "object" || payload === null) {
    errors.push("invalid_type:root");
  } else {
    if (payload.ok !== false) errors.push("invalid_field:ok_false_required");
    if (typeof payload.error !== "string" || payload.error.trim() === "") errors.push("invalid_field:error");
    if (!Array.isArray(payload.completedSteps)) errors.push("invalid_field:completedSteps");
    if (typeof payload.totalDurationMs !== "number") errors.push("invalid_field:totalDurationMs");
    if (typeof payload.generatedAt !== "string") errors.push("invalid_field:generatedAt");
  }
  return errors;
}

function main() {
  const now = Date.now();
  const missing = [];
  const empty = [];
  const stale = [];
  const warnings = [];
  const checked = [];

  function verify(entry, required) {
    if (!fs.existsSync(entry.file)) {
      if (required && !(STRICT_MODE && STRICT_MISSING_AS_WARNING && STRICT_REQUIRED.some((x) => x.file === entry.file))) {
        missing.push(path.relative(ROOT, entry.file));
      } else if (required) {
        warnings.push(`${path.relative(ROOT, entry.file)}:missing_but_warn_only`);
      }
      return;
    }
    const stat = fs.statSync(entry.file);
    const rel = path.relative(ROOT, entry.file);
    checked.push({
      file: rel,
      sizeBytes: stat.size,
      ageHours: Number(((now - stat.mtimeMs) / (60 * 60 * 1000)).toFixed(2))
    });
    if (stat.size < entry.minBytes) {
      if (required) empty.push(`${rel}:size_lt_${entry.minBytes}`);
      else warnings.push(`${rel}:size_lt_${entry.minBytes}`);
    }
    if (now - stat.mtimeMs > MAX_AGE_MS) {
      if (required) stale.push(`${rel}:older_than_${MAX_ARTIFACT_AGE_HOURS}h`);
      else warnings.push(`${rel}:older_than_${MAX_ARTIFACT_AGE_HOURS}h`);
    }
  }

  for (const item of REQUIRED) verify(item, true);
  if (STRICT_MODE) {
    for (const item of STRICT_REQUIRED) verify(item, true);
  }
  for (const item of OPTIONAL) verify(item, false);
  if (fs.existsSync(SMOKE_FAILURE)) {
    const schemaErrors = validateSmokeFailureSchema(SMOKE_FAILURE);
    const rel = path.relative(ROOT, SMOKE_FAILURE);
    checked.push({ file: rel, schemaChecked: true });
    if (schemaErrors.length > 0) {
      empty.push(`${rel}:schema_invalid:${schemaErrors.join("|")}`);
    }
  }

  if (missing.length > 0 || empty.length > 0 || stale.length > 0) {
    console.error(
      JSON.stringify(
        { ok: false, missing, empty, stale, maxArtifactAgeHours: MAX_ARTIFACT_AGE_HOURS, checked, checkedAt: new Date().toISOString() },
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
        maxArtifactAgeHours: MAX_ARTIFACT_AGE_HOURS,
        strictMode: STRICT_MODE,
        strictMissingAsWarning: STRICT_MISSING_AS_WARNING,
        warnings,
        checked,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
