import fs from "node:fs";
import path from "node:path";
import { getAuditPersistenceStatus } from "@/src/lib/admin-audit";
import { getAdminAuthConfigStatus } from "@/src/lib/admin-auth";
import { getLoginGuardStorageStatus } from "@/src/lib/admin-login-guard";
import { getStorageCheckStatus } from "@/src/lib/admin-state-store";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

type CheckLevel = "ok" | "warn" | "error";
type SummaryLevel = "ok" | "warn" | "error";

type ProbeResult = {
  ok: boolean;
  timestamp: string;
  latencyMs: number;
  errorCode: string | null;
};

let lastWriteProbe: ProbeResult = {
  ok: false,
  timestamp: new Date(0).toISOString(),
  latencyMs: -1,
  errorCode: "not_checked"
};

function toErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown_error";
  const maybe = error as { code?: string };
  if (typeof maybe.code === "string" && maybe.code) return maybe.code;
  return "io_error";
}

function ensureDir(pathname: string): { ok: boolean; errorCode: string | null } {
  try {
    if (!fs.existsSync(pathname)) {
      fs.mkdirSync(pathname, { recursive: true });
    }
    return { ok: true, errorCode: null };
  } catch (error) {
    return { ok: false, errorCode: toErrorCode(error) };
  }
}

function runWriteProbe(): ProbeResult {
  const startedAt = Date.now();
  const filePath = path.join(BLOG_DIR, `.healthcheck-${process.pid}-${Date.now()}.tmp`);
  try {
    fs.writeFileSync(filePath, "ok", "utf-8");
    fs.unlinkSync(filePath);
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      errorCode: null
    };
  } catch (error) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      errorCode: toErrorCode(error)
    };
  } finally {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // noop
      }
    }
  }
}

function toSummary(levels: CheckLevel[]): SummaryLevel {
  if (levels.includes("error")) return "error";
  if (levels.includes("warn")) return "warn";
  return "ok";
}

export type AdminHealthStatus = {
  summary: SummaryLevel;
  checks: {
    auth: CheckLevel;
    content_rw: CheckLevel;
    write_probe: CheckLevel;
    storage: CheckLevel;
    audit: CheckLevel;
  };
  checkedAt: string;
  auth: {
    configured: boolean;
    sessionVersion: number;
  };
  contentRw: {
    readable: boolean;
    writable: boolean;
    errorCode: string | null;
  };
  writeProbe: ProbeResult;
  storage: {
    persistent: boolean;
    loginGuardMode: "persistent" | "memory_fallback";
    sessionMode: "persistent" | "memory_fallback";
    errorCode: string | null;
  };
  audit: {
    mode: "memory" | "file";
    filePath: string | null;
    lastError: string | null;
  };
  verbose?: {
    authStorageError: string | null;
    loginGuardStorageError: string | null;
    storageProbeError: string | null;
    writeProbeTimestamp: string;
    auditError: string | null;
  };
};

export function getAdminHealthStatus(options?: { verbose?: boolean }): AdminHealthStatus {
  const verbose = options?.verbose === true;
  const auth = getAdminAuthConfigStatus();
  const loginGuard = getLoginGuardStorageStatus();
  const storageProbe = getStorageCheckStatus();
  const auditStatus = getAuditPersistenceStatus();

  const ensured = ensureDir(BLOG_DIR);
  let readable = false;
  let writable = false;
  let contentError: string | null = ensured.errorCode;

  if (ensured.ok) {
    try {
      fs.accessSync(BLOG_DIR, fs.constants.R_OK);
      readable = true;
    } catch (error) {
      contentError = toErrorCode(error);
    }

    try {
      fs.accessSync(BLOG_DIR, fs.constants.W_OK);
      writable = true;
    } catch (error) {
      contentError = toErrorCode(error);
    }
  }

  lastWriteProbe = runWriteProbe();

  const authLevel: CheckLevel = auth.configured ? "ok" : "warn";
  const contentLevel: CheckLevel = readable && writable ? "ok" : "error";
  const probeLevel: CheckLevel = lastWriteProbe.ok ? "ok" : "error";
  const storagePersistent =
    auth.storage.mode === "persistent" && loginGuard.mode === "persistent" && storageProbe.ok;
  const storageLevel: CheckLevel = storagePersistent ? "ok" : "warn";
  const auditLevel: CheckLevel = auditStatus.lastError ? "warn" : "ok";

  const summary = toSummary([authLevel, contentLevel, probeLevel, storageLevel, auditLevel]);

  const payload: AdminHealthStatus = {
    summary,
    checks: {
      auth: authLevel,
      content_rw: contentLevel,
      write_probe: probeLevel,
      storage: storageLevel,
      audit: auditLevel
    },
    checkedAt: new Date().toISOString(),
    auth: {
      configured: auth.configured,
      sessionVersion: auth.sessionVersion
    },
    contentRw: {
      readable,
      writable,
      errorCode: contentError
    },
    writeProbe: lastWriteProbe,
    storage: {
      persistent: storagePersistent,
      loginGuardMode: loginGuard.mode,
      sessionMode: auth.storage.mode,
      errorCode: auth.storage.lastError ?? loginGuard.lastError ?? storageProbe.code
    },
    audit: {
      mode: auditStatus.mode,
      filePath: auditStatus.filePath,
      lastError: auditStatus.lastError
    }
  };

  if (verbose) {
    payload.verbose = {
      authStorageError: auth.storage.lastError,
      loginGuardStorageError: loginGuard.lastError,
      storageProbeError: storageProbe.code,
      writeProbeTimestamp: lastWriteProbe.timestamp,
      auditError: auditStatus.lastError
    };
  }

  return payload;
}
