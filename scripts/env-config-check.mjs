#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILES = [".env.production", ".env.local", ".env"];
const REQUIRED_KEYS = ["ADMIN_WRITE_PASSWORD", "NEXT_PUBLIC_SITE_URL"];
const MIN_PASSWORD_LEN = 12;

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function loadEnvSnapshot() {
  const fileVars = {};
  for (const file of ENV_FILES) {
    const abs = path.join(ROOT, file);
    Object.assign(fileVars, parseEnvFile(abs));
  }
  return {
    ...fileVars,
    ...process.env
  };
}

function main() {
  const env = loadEnvSnapshot();
  const missing = REQUIRED_KEYS.filter((key) => !String(env[key] ?? "").trim());
  const errors = [];
  const warnings = [];

  if (missing.length > 0) {
    errors.push(`missing_required:${missing.join(",")}`);
  }

  const siteUrl = String(env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (siteUrl && !/^https?:\/\//.test(siteUrl)) {
    errors.push("invalid:NEXT_PUBLIC_SITE_URL");
  }
  if (siteUrl && /^https?:\/\//.test(siteUrl)) {
    try {
      const parsed = new URL(siteUrl);
      const expectedPort = String(process.env.PORT ?? process.env.DRILL_PORT ?? "").trim();
      if (expectedPort && parsed.port && parsed.port !== expectedPort) {
        warnings.push(`site_url_port_mismatch:expected_${expectedPort}:actual_${parsed.port}`);
      }
    } catch {
      errors.push("invalid:NEXT_PUBLIC_SITE_URL_parse");
    }
  }

  const password = String(env.ADMIN_WRITE_PASSWORD ?? "").trim();
  if (password) {
    if (password.length < MIN_PASSWORD_LEN) {
      warnings.push("weak_password:length");
    }
    if (!/[a-z]/.test(password)) {
      warnings.push("weak_password:missing_lowercase");
    }
    if (!/[A-Z]/.test(password)) {
      warnings.push("weak_password:missing_uppercase");
    }
    if (!/[0-9]/.test(password)) {
      warnings.push("weak_password:missing_number");
    }
  }

  const auditFile = String(env.ADMIN_AUDIT_FILE ?? "").trim();
  if (auditFile && !path.isAbsolute(auditFile)) {
    errors.push("invalid:ADMIN_AUDIT_FILE_not_absolute");
  }

  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          errors,
          warnings,
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
        requiredKeys: REQUIRED_KEYS,
        passwordPolicy: {
          minLength: MIN_PASSWORD_LEN,
          requireLowercase: true,
          requireUppercase: true,
          requireNumber: true
        },
        warnings,
        checkedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main();
