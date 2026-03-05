#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SMOKE_FILE = path.join(ROOT, "scripts", "smoke-check.mjs");
const CI_FILE = path.join(ROOT, ".github", "workflows", "ci.yml");
const ALLOWED_NPX_STEPS = new Set([
  "npx tsc --noEmit"
]);

function extractSmokeSteps(source) {
  const blockMatch = source.match(/const steps = \[([\s\S]*?)\];/);
  if (!blockMatch) return [];
  const stepsBlock = blockMatch[1];
  const steps = [];
  const pairRe = /\["([^"]+)",\s*\[([^\]]*)\]\]/g;
  for (const match of stepsBlock.matchAll(pairRe)) {
    const cmd = match[1];
    const argsRaw = match[2];
    const args = [...argsRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    steps.push(`${cmd} ${args.join(" ")}`.trim());
  }
  return steps;
}

function extractCiSteps(source) {
  return [...source.matchAll(/run:\s*([^\n]+)/g)]
    .map((m) => m[1].trim())
    .filter((cmd) => cmd.startsWith("npm run ") || cmd === "npx tsc --noEmit");
}

function main() {
  const smoke = extractSmokeSteps(fs.readFileSync(SMOKE_FILE, "utf-8"));
  const ci = extractCiSteps(fs.readFileSync(CI_FILE, "utf-8"));
  const errors = [];
  const ciIndex = new Map(ci.map((cmd, idx) => [cmd, idx]));
  const unknownNpxInSmoke = smoke.filter((cmd) => cmd.startsWith("npx ") && !ALLOWED_NPX_STEPS.has(cmd));
  const unknownNpxInCi = ci.filter((cmd) => cmd.startsWith("npx ") && !ALLOWED_NPX_STEPS.has(cmd));
  if (unknownNpxInSmoke.length > 0) errors.push(`unknown_npx_in_smoke:${unknownNpxInSmoke.join(",")}`);
  if (unknownNpxInCi.length > 0) errors.push(`unknown_npx_in_ci:${unknownNpxInCi.join(",")}`);

  const missingInCi = smoke.filter((cmd) => !ciIndex.has(cmd));
  if (missingInCi.length > 0) errors.push(`missing_in_ci:${missingInCi.join(",")}`);

  const filteredCi = ci.filter((cmd) => smoke.includes(cmd));
  if (filteredCi.length !== smoke.length) {
    errors.push("ci_filtered_length_mismatch");
  } else {
    for (let i = 0; i < smoke.length; i += 1) {
      if (smoke[i] !== filteredCi[i]) {
        errors.push(`order_mismatch:index=${i}:smoke=${smoke[i]}:ci=${filteredCi[i]}`);
        break;
      }
    }
  }

  const extraInCi = ci.filter((cmd) => (cmd.startsWith("npm run check:") || cmd.startsWith("npm run drill:")) && !smoke.includes(cmd));
  if (extraInCi.length > 0) errors.push(`extra_in_ci:${extraInCi.join(",")}`);

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, smokeCount: smoke.length, ciCount: ci.length, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      { ok: true, smokeCount: smoke.length, ciCount: ci.length, allowedNpxSteps: [...ALLOWED_NPX_STEPS], checkedAt: new Date().toISOString() },
      null,
      2
    )
  );
}

main();
