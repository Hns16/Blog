import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonSuccessResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { clearAdminAuthCookie, invalidateAllAdminSessions, isAdminAuthenticated } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";
import { redirectUrl } from "@/src/lib/admin-write-server";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_INVALIDATE_SESSIONS;

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({ request, ctx, action: AUDIT_ACTION.INVALIDATE_SESSIONS, slug: "global" });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: AUDIT_ACTION.INVALIDATE_SESSIONS,
    slug: "global"
  });
  if (authError) return authError;

  const newVersion = invalidateAllAdminSessions();
  clearAdminAuthCookie(cookies());
  auditAdminAction(AUDIT_ACTION.INVALIDATE_SESSIONS, "global", "success", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });

  if ((request.headers.get("accept") ?? "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl(request, "/admin?error=session_invalidated"), 303);
  }
  return jsonSuccessResponse({ ok: true, sessionVersion: newVersion, requestId });
}
