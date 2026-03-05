import { cookies } from "next/headers";
import { jsonSuccessResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { getDiagSnapshot } from "@/src/lib/admin-diag";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_DIAG_SNAPSHOT;

export async function GET(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({ request, ctx, action: AUDIT_ACTION.HEALTH, slug: "diag" });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: AUDIT_ACTION.HEALTH,
    slug: "diag"
  });
  if (authError) return authError;

  const limitRaw = Number(new URL(request.url).searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 20;
  const snapshot = getDiagSnapshot(limit);

  auditAdminAction(AUDIT_ACTION.HEALTH, "diag", "success", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
  return jsonSuccessResponse({ requestId, ...snapshot });
}
