import fs from "node:fs";
import path from "node:path";

const STATE_DIR = path.join(process.cwd(), ".runtime", "admin");

export type PersistStatus = {
  mode: "persistent" | "memory_fallback";
  lastError: string | null;
};

function sanitizeError(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown_error";
  const maybe = error as { code?: string };
  if (typeof maybe.code === "string" && maybe.code) return maybe.code;
  return "io_error";
}

function ensureDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function filePath(name: string): string {
  return path.join(STATE_DIR, `${name}.json`);
}

export function loadPersistedState<T>(name: string, fallback: T): { value: T; status: PersistStatus } {
  try {
    ensureDir();
    const fullPath = filePath(name);
    if (!fs.existsSync(fullPath)) {
      return { value: fallback, status: { mode: "persistent", lastError: null } };
    }
    const raw = fs.readFileSync(fullPath, "utf-8");
    return {
      value: JSON.parse(raw) as T,
      status: { mode: "persistent", lastError: null }
    };
  } catch (error) {
    return {
      value: fallback,
      status: {
        mode: "memory_fallback",
        lastError: sanitizeError(error)
      }
    };
  }
}

export function savePersistedState<T>(name: string, value: T): PersistStatus {
  const fullPath = filePath(name);
  const tempPath = `${fullPath}.tmp.${process.pid}.${Date.now()}`;
  try {
    ensureDir();
    fs.writeFileSync(tempPath, JSON.stringify(value), "utf-8");
    fs.renameSync(tempPath, fullPath);
    return { mode: "persistent", lastError: null };
  } catch (error) {
    return {
      mode: "memory_fallback",
      lastError: sanitizeError(error)
    };
  } finally {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // noop
      }
    }
  }
}

export function getStorageCheckStatus(): { ok: boolean; code: string | null } {
  const tempPath = path.join(STATE_DIR, `.storage-check-${process.pid}-${Date.now()}.tmp`);
  try {
    ensureDir();
    fs.writeFileSync(tempPath, "ok", "utf-8");
    fs.unlinkSync(tempPath);
    return { ok: true, code: null };
  } catch (error) {
    return { ok: false, code: sanitizeError(error) };
  } finally {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // noop
      }
    }
  }
}
