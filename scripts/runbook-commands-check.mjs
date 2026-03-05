#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNBOOK = path.join(ROOT, "docs", "ops-runbook.md");
const PACKAGE_JSON = path.join(ROOT, "package.json");

function main() {
  const runbook = fs.readFileSync(RUNBOOK, "utf-8");
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf-8"));
  const scripts = new Set(Object.keys(pkg.scripts || {}));

  const inlineCommands = [...runbook.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const fencedBlocks = [...runbook.matchAll(/```(?:bash)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  const fencedCommands = fencedBlocks
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  const allCommands = [...inlineCommands, ...fencedCommands];
  const npmRunCommands = allCommands.filter((cmd) => cmd.startsWith("npm run "));
  const errors = [];

  for (const cmd of npmRunCommands) {
    const script = cmd.slice("npm run ".length).trim();
    if (!scripts.has(script)) {
      errors.push(`missing_script:${script}`);
    }
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedNpmRunCommands: npmRunCommands.length,
        commandSources: {
          inline: inlineCommands.length,
          fenced: fencedCommands.length
        },
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
