import { cookies } from "next/headers";
import { jsonSuccessResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { getAdminHealthStatus } from "@/src/lib/admin-health";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_HEALTH;

export async function GET(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({ request, ctx, action: AUDIT_ACTION.HEALTH, slug: "system" });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: AUDIT_ACTION.HEALTH,
    slug: "system"
  });
  if (authError) return authError;

  const verbose = new URL(request.url).searchParams.get("verbose") === "1";
  const health = getAdminHealthStatus({ verbose });
  auditAdminAction(AUDIT_ACTION.HEALTH, "system", health.summary === "ok" ? "success" : "fail", {
    requestId,
    route: ROUTE_PATH,
    durationMs: ctx.durationMs()
  });
  if (verbose) {
    return jsonSuccessResponse({ ...health, requestId });
  }
  return jsonSuccessResponse({
    requestId,
    checkedAt: health.checkedAt,
    summary: health.summary,
    checks: health.checks,
    auth: health.auth,
    contentRw: health.contentRw,
    writeProbe: {
      ok: health.writeProbe.ok,
      latencyMs: health.writeProbe.latencyMs,
      errorCode: health.writeProbe.errorCode
    },
    storage: health.storage,
    audit: health.audit
  });
}
