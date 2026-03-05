#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const CI_FILE = path.join(process.cwd(), ".github", "workflows", "ci.yml");

const GROUPS = [
  {
    name: "build",
    markers: ["name: Lint", "name: Type check", "name: Build"]
  },
  {
    name: "checks",
    markers: ["name: Architecture check", "name: Diag shape runtime check"]
  },
  {
    name: "drills",
    markers: ["name: API boundary drill", "name: Release drill"]
  }
];

function main() {
  const source = fs.readFileSync(CI_FILE, "utf-8");
  const errors = [];
  const ranges = [];

  for (const group of GROUPS) {
    const indexes = group.markers.map((marker) => source.indexOf(marker));
    for (let i = 0; i < group.markers.length; i += 1) {
      if (indexes[i] < 0) {
        errors.push(`missing_marker:${group.name}:${group.markers[i]}`);
      }
    }
    for (let i = 1; i < indexes.length; i += 1) {
      if (indexes[i] >= 0 && indexes[i - 1] >= 0 && indexes[i] < indexes[i - 1]) {
        errors.push(`intra_group_order_violation:${group.name}:${group.markers[i - 1]}->${group.markers[i]}`);
      }
    }
    if (indexes.every((idx) => idx >= 0)) {
      ranges.push({
        name: group.name,
        start: Math.min(...indexes),
        end: Math.max(...indexes)
      });
    }
  }

  for (let i = 1; i < ranges.length; i += 1) {
    if (ranges[i].start < ranges[i - 1].end) {
      errors.push(`group_order_violation:${ranges[i - 1].name}->${ranges[i].name}`);
    }
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, checkedAt: new Date().toISOString() }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, groups: GROUPS.map((g) => g.name), checkedAt: new Date().toISOString() }, null, 2));
}

main();
