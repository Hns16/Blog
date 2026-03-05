import fs from "node:fs";
import path from "node:path";

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "invalidate_sessions"
  | "health"
  | "save_draft"
  | "publish"
  | "schedule"
  | "rollback"
  | "archive";
type AuditResult = "success" | "fail" | "warn";

type AuditMeta = {
  requestId?: string;
  route?: string;
  durationMs?: number;
  fromRevision?: string | null;
  toRevision?: string | null;
};

export type AdminAuditEvent = {
  requestId: string;
  route: string;
  durationMs: number;
  action: AuditAction;
  slug: string;
  result: AuditResult;
  timestamp: string;
  fromRevision?: string | null;
  toRevision?: string | null;
};

const MAX_AUDIT_EVENTS = 400;
const recentAuditEvents: AdminAuditEvent[] = [];
const AUDIT_FILE_PATH = (process.env.ADMIN_AUDIT_FILE ?? "").trim();

let auditPersistError: string | null = null;

function appendAuditToFile(event: AdminAuditEvent): void {
  if (!AUDIT_FILE_PATH) return;
  try {
    const dir = path.dirname(AUDIT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(AUDIT_FILE_PATH, `${JSON.stringify(event)}\n`, "utf-8");
    auditPersistError = null;
  } catch (error) {
    auditPersistError =
      error instanceof Error && error.message ? error.message : "audit_persist_failed";
  }
}

export function auditAdminAction(action: AuditAction, slug: string, result: AuditResult, meta?: AuditMeta): void {
  const payload: AdminAuditEvent = {
    requestId: meta?.requestId ?? "unknown",
    route: meta?.route ?? "unknown",
    durationMs: typeof meta?.durationMs === "number" ? meta.durationMs : -1,
    action,
    slug,
    result,
    timestamp: new Date().toISOString(),
    ...(meta?.fromRevision !== undefined ? { fromRevision: meta.fromRevision } : {}),
    ...(meta?.toRevision !== undefined ? { toRevision: meta.toRevision } : {})
  };
  recentAuditEvents.push(payload);
  if (recentAuditEvents.length > MAX_AUDIT_EVENTS) {
    recentAuditEvents.shift();
  }
  appendAuditToFile(payload);
  console.info("[admin-audit]", JSON.stringify(payload));
}

export function getRecentAuditEvents(limit = 20): AdminAuditEvent[] {
  const capped = Math.max(1, Math.min(limit, MAX_AUDIT_EVENTS));
  return recentAuditEvents.slice(-capped).reverse();
}

export function getAuditPersistenceStatus(): {
  mode: "memory" | "file";
  filePath: string | null;
  lastError: string | null;
} {
  return {
    mode: AUDIT_FILE_PATH ? "file" : "memory",
    filePath: AUDIT_FILE_PATH || null,
    lastError: auditPersistError
  };
}
