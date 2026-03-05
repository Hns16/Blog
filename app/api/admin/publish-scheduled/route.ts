import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonSuccessResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";
import { isHtmlRequest, redirectUrl } from "@/src/lib/admin-write-server";
import { runScheduledPublish } from "@/src/lib/publishing";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_PUBLISH_SCHEDULED;

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({ request, ctx, action: AUDIT_ACTION.UPDATE, slug: "scheduled" });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: AUDIT_ACTION.UPDATE,
    slug: "scheduled"
  });
  if (authError) return authError;

  const results = runScheduledPublish(new Date());
  for (const item of results) {
    auditAdminAction(AUDIT_ACTION.PUBLISH, item.slug, item.published ? "success" : "fail", {
      requestId,
      route: ROUTE_PATH,
      durationMs: ctx.durationMs(),
      fromRevision: null,
      toRevision: item.revisionId
    });
  }
  for (const item of results) {
    revalidatePath(`/blog/${item.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/blog");

  auditAdminAction(AUDIT_ACTION.UPDATE, "scheduled", "success", { requestId, route: ROUTE_PATH, durationMs: ctx.durationMs() });
  if (isHtmlRequest(request)) {
    return NextResponse.redirect(redirectUrl(request, `/admin/posts?success=scheduled_run&rid=${encodeURIComponent(requestId)}`), 303);
  }
  return jsonSuccessResponse({ ok: true, requestId, count: results.length, results });
}
