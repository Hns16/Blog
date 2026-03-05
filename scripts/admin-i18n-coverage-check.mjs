#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const I18N_FILE = path.join(ROOT, "src", "lib", "admin-i18n.ts");
const CHECK_FILES = [
  path.join(ROOT, "src", "lib", "admin-write-shared.ts"),
  path.join(ROOT, "src", "lib", "admin-ui-shared.ts"),
  path.join(ROOT, "src", "lib", "admin-login-shared.ts"),
  path.join(ROOT, "app", "admin", "page.tsx")
];

function collectMessageKeys(source) {
  const keys = new Set();
  const keyRe = /"((?:admin)\.[a-z0-9_.-]+)"\s*:/g;
  let m;
  while ((m = keyRe.exec(source))) {
    keys.add(m[1]);
  }
  return keys;
}

function collectUsedKeys(source) {
  const keys = new Set();
  const tRe = /tAdmin\(\s*"((?:admin)\.[a-z0-9_.-]+)"/g;
  let m;
  while ((m = tRe.exec(source))) {
    keys.add(m[1]);
  }
  return keys;
}

function main() {
  const defined = collectMessageKeys(fs.readFileSync(I18N_FILE, "utf-8"));
  const used = new Set();

  for (const file of CHECK_FILES) {
    const source = fs.readFileSync(file, "utf-8");
    for (const key of collectUsedKeys(source)) used.add(key);
  }

  const missing = [...used].filter((key) => !defined.has(key));
  if (missing.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          missing,
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
        definedCount: defined.size,
        usedCount: used.size,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
