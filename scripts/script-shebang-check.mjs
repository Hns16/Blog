#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const REQUIRED = "#!/usr/bin/env node";

function main() {
  const files = fs.readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith(".mjs")).sort();
  const failures = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf-8");
    const firstLine = source.split(/\r?\n/, 1)[0] || "";
    if (firstLine.trim() !== REQUIRED) {
      failures.push(`missing_shebang:${file}`);
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, failures, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: files.length, checkedAt: new Date().toISOString() }, null, 2));
}

main();
