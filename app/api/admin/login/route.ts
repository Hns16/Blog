import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { setAdminAuthCookie } from "@/src/lib/admin-auth";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getLoginSource,
  recordLoginFailure
} from "@/src/lib/admin-login-guard";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardSameOrigin } from "@/src/lib/admin-route-guard";
import { getAdminPassword } from "@/src/lib/env";
import { redirectUrl } from "@/src/lib/admin-write-server";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_LOGIN;

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;
  const source = getLoginSource(request);

  const originError = guardSameOrigin({ request, ctx, action: AUDIT_ACTION.LOGIN, slug: source, forbiddenCode: "FORBIDDEN" });
  if (originError) return originError;

  const rateLimitState = checkLoginRateLimit(source);
  if (rateLimitState.limited) {
    auditAdminAction(AUDIT_ACTION.LOGIN, `rate_limited:${source}`, "fail", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
    if ((request.headers.get("accept") ?? "").includes("text/html")) {
      return NextResponse.redirect(
        redirectUrl(request, `/admin?error=rate_limited&retry_after=${rateLimitState.retryAfterSec}`),
        303
      );
    }
    return jsonErrorResponse({
      error: "Too many attempts",
      code: "RATE_LIMITED",
      requestId,
      retryAfterSec: rateLimitState.retryAfterSec,
      status: 429
    });
  }

  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    auditAdminAction(AUDIT_ACTION.LOGIN, source, "fail", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
    return NextResponse.redirect(redirectUrl(request, "/admin?error=missing_password"), 303);
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (password !== adminPassword) {
    const failed = recordLoginFailure(source);
    auditAdminAction(AUDIT_ACTION.LOGIN, `invalid_password:${source}`, "fail", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
    if (failed.limited) {
      return NextResponse.redirect(
        redirectUrl(request, `/admin?error=rate_limited&retry_after=${failed.retryAfterSec}`),
        303
      );
    }
    return NextResponse.redirect(redirectUrl(request, "/admin?error=invalid_password"), 303);
  }

  clearLoginFailures(source);

  if (!setAdminAuthCookie(cookies())) {
    auditAdminAction(AUDIT_ACTION.LOGIN, source, "fail", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
    return NextResponse.redirect(redirectUrl(request, "/admin?error=missing_password"), 303);
  }

  auditAdminAction(AUDIT_ACTION.LOGIN, source, "success", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
  return NextResponse.redirect(redirectUrl(request, "/admin/posts"), 303);
}
