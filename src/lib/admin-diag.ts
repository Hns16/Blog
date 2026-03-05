import { getAuditPersistenceStatus, getRecentAuditEvents } from "@/src/lib/admin-audit";
import { getAdminHealthStatus } from "@/src/lib/admin-health";

const KEY_ACTIONS = new Set(["login", "create", "update", "invalidate_sessions", "save_draft", "publish", "schedule", "rollback", "archive"]);

export function getDiagSnapshot(limit = 20): {
  generatedAt: string;
  health: { summary: "ok" | "warn" | "error"; checks: { auth: string; content_rw: string; write_probe: string; storage: string; audit: string } };
  audit: { mode: "memory" | "file"; filePath: string | null; lastError: string | null };
  events: Array<{
    requestId: string;
    route: string;
    action: string;
    result: string;
    slug: string;
    timestamp: string;
    durationMs: number;
  }>;
} {
  const health = getAdminHealthStatus();
  const audit = getAuditPersistenceStatus();
  const events = getRecentAuditEvents(limit).filter((event) => {
    if (!KEY_ACTIONS.has(event.action)) return false;
    if (event.action === "login") return event.result !== "success";
    if (event.action === "invalidate_sessions") return true;
    return event.result === "fail";
  });

  return {
    generatedAt: new Date().toISOString(),
    health: {
      summary: health.summary,
      checks: health.checks
    },
    audit,
    events: events.map((event) => ({
      requestId: event.requestId,
      route: event.route,
      action: event.action,
      result: event.result,
      slug: event.slug,
      timestamp: event.timestamp,
      durationMs: event.durationMs
    }))
  };
}
