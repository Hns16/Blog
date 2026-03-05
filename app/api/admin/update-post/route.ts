import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonErrorResponse, jsonSuccessResponse, statusForWriteErrorCode, toWriteErrorCode } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";
import { type WriteErrorCode } from "@/src/lib/admin-write-shared";
import {
  isHtmlRequest,
  redirectUrl,
  withSlugLock
} from "@/src/lib/admin-write-server";
import { applyPublishAction } from "@/src/lib/publishing";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_UPDATE_POST;

function errorResponse(
  request: Request,
  originalSlug: string,
  params: { code: WriteErrorCode; message: string; status: number; requestId: string }
) {
  if (isHtmlRequest(request)) {
    return NextResponse.redirect(
      redirectUrl(request, `/admin/edit/${encodeURIComponent(originalSlug)}?error=${params.code}&rid=${encodeURIComponent(params.requestId)}`),
      303
    );
  }
  return jsonErrorResponse({
    error: params.message,
    code: params.code,
    requestId: params.requestId,
    status: params.status
  });
}

function normalizeAction(raw: string): "save_draft" | "publish" | "schedule" | "rollback" | "archive" | "cancel_schedule" {
  if (raw === "save_draft" || raw === "schedule" || raw === "rollback" || raw === "archive" || raw === "cancel_schedule") return raw;
  return "publish";
}

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({
    request,
    ctx,
    action: "update",
    slug: "unknown",
    htmlRedirectPath: "/admin/posts?error=forbidden"
  });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: "update",
    slug: "unknown",
    htmlRedirectPath: "/admin/posts?error=unauthorized"
  });
  if (authError) return authError;

  const formData = await request.formData();
  const originalSlug = String(formData.get("originalSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const action = normalizeAction(String(formData.get("action") ?? "publish"));
  const auditAction = action === "save_draft"
    ? "save_draft"
    : action === "schedule"
      ? "schedule"
      : action === "rollback"
        ? "rollback"
        : action === "archive" || action === "cancel_schedule"
          ? "archive"
          : "publish";

  const lockKey = originalSlug || slugInput || title;
  const lockKeys = [originalSlug, slugInput || title].filter(Boolean);
  const lock = await withSlugLock(lockKeys, async () => {
    return applyPublishAction({
      action,
      originalSlug,
      targetRevisionId: String(formData.get("targetRevisionId") ?? "").trim() || undefined,
      title,
      description: String(formData.get("description") ?? "").trim(),
      slugInput,
      date: String(formData.get("date") ?? "").trim(),
      tagsInput: String(formData.get("tags") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      scheduledAt: String(formData.get("scheduledAt") ?? "").trim() || undefined
    });
  });

  if (!lock.locked) {
    const durationMs = ctx.durationMs();
    auditAdminAction(auditAction, lockKey || "unknown", "fail", { requestId, route: ROUTE_PATH, durationMs });
    return errorResponse(request, originalSlug || lockKey || "unknown", {
      code: "write_conflict",
      message: "Write conflict",
      status: 409,
      requestId
    });
  }

  try {
    const result = lock.value;
    if (!result) throw new Error("publish_failed");

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${originalSlug}`);
    revalidatePath(`/blog/${result.slug}`);

    const durationMs = ctx.durationMs();
    auditAdminAction(auditAction, result.slug, "success", {
      requestId,
      route: ROUTE_PATH,
      durationMs,
      fromRevision: result.fromRevision,
      toRevision: result.toRevision
    });

    if (isHtmlRequest(request)) {
      return NextResponse.redirect(redirectUrl(request, `/admin/posts?success=updated&rid=${encodeURIComponent(requestId)}`), 303);
    }

    return jsonSuccessResponse({ ok: true, oldSlug: originalSlug, slug: result.slug, requestId, status: result.status, revisionId: result.toRevision });
  } catch (error) {
    const code = toWriteErrorCode(error);
    const durationMs = ctx.durationMs();
    auditAdminAction(auditAction, lockKey || "unknown", "fail", { requestId, route: ROUTE_PATH, durationMs });
    return errorResponse(request, originalSlug || lockKey || "unknown", {
      code,
      message: code,
      status: statusForWriteErrorCode(code),
      requestId
    });
  }
}
