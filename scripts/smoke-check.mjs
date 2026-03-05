#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const steps = [
  ["npm", ["run", "lint"]],
  ["npx", ["tsc", "--noEmit"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "check:architecture"]],
  ["npm", ["run", "check:state"]],
  ["npm", ["run", "check:publishing"]],
  ["npm", ["run", "check:admin-health"]],
  ["npm", ["run", "check:admin-diag"]],
  ["npm", ["run", "check:content-permissions"]],
  ["npm", ["run", "check:routes-meta"]],
  ["npm", ["run", "check:admin-route-meta-usage"]],
  ["npm", ["run", "check:publish-scheduled-html"]],
  ["npm", ["run", "check:publish-scheduled-zero"]],
  ["npm", ["run", "check:route-guard"]],
  ["npm", ["run", "check:env"]],
  ["npm", ["run", "check:audit-file"]],
  ["npm", ["run", "check:todo-consistency"]],
  ["npm", ["run", "check:admin-ui-telemetry"]],
  ["npm", ["run", "check:admin-i18n-coverage"]],
  ["npm", ["run", "check:admin-redirect-rid"]],
  ["npm", ["run", "check:request-id-presence"]],
  ["npm", ["run", "check:docs-links"]],
  ["npm", ["run", "check:api-error-codes"]],
  ["npm", ["run", "check:runbook-commands"]],
  ["npm", ["run", "check:runbook-matrix-sync"]],
  ["npm", ["run", "check:ci-steps-order"]],
  ["npm", ["run", "check:smoke-step-order"]],
  ["npm", ["run", "check:api-route-count"]],
  ["npm", ["run", "check:audit-action-coverage"]],
  ["npm", ["run", "check:docs-toc"]],
  ["npm", ["run", "check:script-shebang"]],
  ["npm", ["run", "check:json-output"]],
  ["npm", ["run", "check:admin-pages-params"]],
  ["npm", ["run", "check:smoke-report-schema"]],
  ["npm", ["run", "check:doc-command-sync"]],
  ["npm", ["run", "check:admin-health-fields"]],
  ["npm", ["run", "check:output-artifacts"]],
  ["npm", ["run", "check:admin-page-links"]],
  ["npm", ["run", "check:docs-version-stamp"]],
  ["npm", ["run", "check:release-checklist-coverage"]],
  ["npm", ["run", "check:health-shape-runtime"]],
  ["npm", ["run", "check:diag-shape-runtime"]],
  ["npm", ["run", "drill:api"]],
  ["npm", ["run", "drill:release"]]
];
const SLOW_STEP_MS = Number(process.env.SMOKE_SLOW_STEP_MS || 20000);
const RUNTIME_RETRY_STEPS = new Set([
  "npm run check:health-shape-runtime",
  "npm run check:diag-shape-runtime"
]);
const RUNTIME_RETRY_MAX = 1;
const ALLOW_BUILD_SKIP = process.env.SMOKE_ALLOW_BUILD_SKIP === "1";
const OUTPUT_DIR = path.join(process.cwd(), "output");
const SMOKE_LAST_FILE = path.join(OUTPUT_DIR, "smoke-last.json");
const SMOKE_FAILURE_FILE = path.join(OUTPUT_DIR, "smoke-failures.json");

function runStep(command, args) {
  const stepName = `${command} ${args.join(" ")}`;
  const maxRetry = RUNTIME_RETRY_STEPS.has(stepName) ? RUNTIME_RETRY_MAX : 0;
  let attempt = 0;
  const startedAt = Date.now();
  while (attempt <= maxRetry) {
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env
    });
    if (result.error) throw result.error;
    if (result.status === 0) {
      return { durationMs: Date.now() - startedAt, retries: attempt, skipped: false };
    }
    if (ALLOW_BUILD_SKIP && stepName === "npm run build") {
      return { durationMs: Date.now() - startedAt, retries: attempt, skipped: true };
    }
    if (attempt >= maxRetry) {
      throw new Error(`step_failed:${command} ${args.join(" ")}`);
    }
    attempt += 1;
  }
  throw new Error(`step_failed:${command} ${args.join(" ")}`);
}

function writeJson(file, payload) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
}

function main() {
  const startedAt = Date.now();
  const durations = [];
  try {
    for (const [command, args] of steps) {
      const stepName = `${command} ${args.join(" ")}`;
      const result = runStep(command, args);
      durations.push({ step: stepName, durationMs: result.durationMs, retries: result.retries, skipped: result.skipped });
    }
  } catch (error) {
    const payload = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      completedSteps: durations,
      totalDurationMs: Date.now() - startedAt,
      generatedAt: new Date().toISOString()
    };
    writeJson(SMOKE_FAILURE_FILE, payload);
    throw error;
  }
  const totalDurationMs = Date.now() - startedAt;
  const slowSteps = durations.filter((item) => item.durationMs >= SLOW_STEP_MS);
  const payload = {
    ok: true,
    steps: steps.map(([command, args]) => `${command} ${args.join(" ")}`),
    durations,
    totalDurationMs,
    slowStepThresholdMs: SLOW_STEP_MS,
    slowStepWarnings: slowSteps.map((item) => `${item.step}:${item.durationMs}ms`),
    generatedAt: new Date().toISOString()
  };
  writeJson(SMOKE_LAST_FILE, payload);
  console.log(
    JSON.stringify(payload, null, 2)
  );
}

main();
