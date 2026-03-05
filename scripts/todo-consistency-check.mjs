#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TODO_FILE = path.join(process.cwd(), "docs", "dev-todo.md");

function main() {
  const raw = fs.readFileSync(TODO_FILE, "utf-8");
  const lines = raw.split(/\r?\n/);
  const taskLineRe = /^- \[[ x]\] T\d+\./;
  const acceptanceRe = /^  - 验收：/;
  const errors = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!taskLineRe.test(lines[i])) continue;
    const next = lines[i + 1] ?? "";
    if (!acceptanceRe.test(next)) {
      errors.push(`missing_acceptance:line_${i + 1}`);
    }
  }

  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          errors,
          checkedAt: new Date().toISOString()
        },
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
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
