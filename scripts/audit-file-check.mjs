#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILES = [".env.production", ".env.local", ".env"];

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
  const vars = {};
  for (const file of ENV_FILES) {
    Object.assign(vars, parseEnvFile(path.join(ROOT, file)));
  }
  return { ...vars, ...process.env };
}

function toErrorCode(error) {
  if (!error || typeof error !== "object") return "unknown_error";
  const code = error.code;
  return typeof code === "string" && code ? code : "io_error";
}

function checkDirWritable(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    fs.accessSync(dirPath, fs.constants.W_OK);
    return { ok: true, errorCode: null };
  } catch (error) {
    return { ok: false, errorCode: toErrorCode(error) };
  }
}

function main() {
  const env = loadEnvSnapshot();
  const auditFile = String(env.ADMIN_AUDIT_FILE ?? "").trim();

  if (!auditFile) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "memory",
          reason: "ADMIN_AUDIT_FILE_not_set",
          checkedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
    return;
  }

  if (!path.isAbsolute(auditFile)) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          mode: "file",
          filePath: auditFile,
          errorCode: "invalid_path_not_absolute",
          checkedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const parentDir = path.dirname(auditFile);
  const writable = checkDirWritable(parentDir);
  const payload = {
    ok: writable.ok,
    mode: "file",
    filePath: auditFile,
    parentDir,
    writable,
    checkedAt: new Date().toISOString()
  };

  console.log(JSON.stringify(payload, null, 2));
  if (!payload.ok) process.exit(1);
}

main();
