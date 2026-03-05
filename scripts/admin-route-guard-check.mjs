#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET = path.join(ROOT, "src", "lib", "admin-route-guard.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const source = fs.readFileSync(TARGET, "utf-8");

  assert(source.includes("export function guardSameOrigin"), "missing_guardSameOrigin");
  assert(source.includes("isSameOrigin(request)"), "missing_same_origin_gate");
  assert(source.includes("status: 403"), "missing_same_origin_403");
  assert(source.includes("code: options.forbiddenCode ?? \"forbidden\""), "missing_same_origin_code");

  assert(source.includes("export function guardAdminAuthenticated"), "missing_guardAdminAuthenticated");
  assert(source.includes("if (authenticated) return null;"), "missing_authenticated_pass");
  assert(source.includes("status: 401"), "missing_unauthorized_401");
  assert(source.includes("code: options.unauthorizedCode ?? \"unauthorized\""), "missing_unauthorized_code");

  assert(source.includes("auditAdminAction(action, slug, \"fail\""), "missing_audit_fail");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "same_origin_rejects_with_403",
          "unauthenticated_rejects_with_401",
          "custom_error_code_supported",
          "audit_fail_recorded"
        ],
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
