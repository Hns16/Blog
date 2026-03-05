import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import type { AdminRequestContext } from "@/src/lib/admin-request-context";
import { isHtmlRequest, isSameOrigin, redirectUrl } from "@/src/lib/admin-write-server";

type GuardAction =
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

type GuardOptions = {
  request: Request;
  ctx: AdminRequestContext;
  action: GuardAction;
  slug: string;
  htmlRedirectPath?: string;
  forbiddenCode?: string;
  unauthorizedCode?: string;
};

export function guardSameOrigin(options: GuardOptions): Response | null {
  const { request, ctx, action, slug, htmlRedirectPath } = options;
  if (isSameOrigin(request)) return null;

  auditAdminAction(action, slug, "fail", {
    requestId: ctx.requestId,
    route: ctx.route,
    durationMs: ctx.durationMs()
  });
  if (htmlRedirectPath && isHtmlRequest(request)) {
    return NextResponse.redirect(redirectUrl(request, htmlRedirectPath), 303);
  }
  return jsonErrorResponse({
    error: "Forbidden",
    code: options.forbiddenCode ?? "forbidden",
    requestId: ctx.requestId,
    status: 403
  });
}

export function guardAdminAuthenticated(
  authenticated: boolean,
  options: GuardOptions
): Response | null {
  const { request, ctx, action, slug, htmlRedirectPath } = options;
  if (authenticated) return null;

  auditAdminAction(action, slug, "fail", {
    requestId: ctx.requestId,
    route: ctx.route,
    durationMs: ctx.durationMs()
  });
  if (htmlRedirectPath && isHtmlRequest(request)) {
    return NextResponse.redirect(redirectUrl(request, htmlRedirectPath), 303);
  }
  return jsonErrorResponse({
    error: "Unauthorized",
    code: options.unauthorizedCode ?? "unauthorized",
    requestId: ctx.requestId,
    status: 401
  });
}
