#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLISHING_FILE = path.join(ROOT, "src", "lib", "publishing.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkSourceBranches() {
  const source = fs.readFileSync(PUBLISHING_FILE, "utf-8");

  assert(source.includes('if (input.action === "rollback")'), "missing_branch:rollback");
  assert(source.includes('if (input.action === "schedule")'), "missing_branch:schedule");
  assert(source.includes('if (input.action === "archive" || input.action === "cancel_schedule")'), "missing_branch:archive_cancel");

  assert(source.includes('code: "not_found"'), "missing_error:not_found");
  assert(source.includes('code: "schedule_invalid"'), "missing_error:schedule_invalid");
  assert(source.includes('code: "revision_not_found"'), "missing_error:revision_not_found");
}

function checkReleaseDrillRollback() {
  const result = spawnSync(process.execPath, [path.join("scripts", "release-drill.mjs")], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf-8"
  });
  if (result.error) {
    const isEperm = result.error.code === "EPERM" || String(result.error.message || "").includes("EPERM");
    if (process.env.DRILL_ALLOW_SKIP === "1" && isEperm) {
      return { skipped: true, reason: "spawn_eperm" };
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`drill_release_exit_${result.status}`);
  }
  const raw = result.stdout || "";
  const start = raw.indexOf("{");
  assert(start >= 0, "drill_release_json_missing");
  const payload = JSON.parse(raw.slice(start));
  assert(payload?.pass === true, "drill_release_fail");
  const rollback = Array.isArray(payload?.steps)
    ? payload.steps.find((step) => step?.step === "rollback")
    : null;
  assert(rollback?.pass === true, "drill_release_rollback_fail");
  return { skipped: false, reason: "" };
}

function main() {
  checkSourceBranches();
  const releaseDrill = checkReleaseDrillRollback();
  const checks = [
    "source_branch_rollback",
    "source_branch_schedule",
    "source_error_not_found",
    "source_error_schedule_invalid"
  ];
  if (releaseDrill.skipped) {
    checks.push("release_drill_rollback_skipped");
  } else {
    checks.push("release_drill_rollback");
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
        skipped: releaseDrill.skipped,
        skipReason: releaseDrill.reason || "",
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
