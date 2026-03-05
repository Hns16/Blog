import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonSuccessResponse, statusForWriteErrorCode } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";
import { type WriteErrorCode } from "@/src/lib/admin-write-shared";
import { type PublishAction, validatePublishInput } from "@/src/lib/publishing";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_WRITE_CHECK;

type CheckRequest = {
  mode: "create" | "update";
  action?: PublishAction;
  originalSlug?: string;
  targetRevisionId?: string;
  title: string;
  description: string;
  slug: string;
  date: string;
  tags?: string;
  content: string;
  scheduledAt?: string;
};

type ValidationChecks = {
  required: boolean;
  date: boolean;
  slugFormat: boolean;
  slugConflict: boolean;
};

function errorResponse(code: WriteErrorCode, status: number, requestId: string, checks?: ValidationChecks) {
  return NextResponse.json(
    {
      ok: false,
      code,
      checks,
      requestId
    },
    { status }
  );
}

function toChecks(code: WriteErrorCode): ValidationChecks {
  return {
    required: code !== "missing_required",
    date: code !== "invalid_date" && code !== "schedule_invalid",
    slugFormat: code !== "invalid_slug",
    slugConflict: code !== "slug_conflict"
  };
}

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({ request, ctx, action: "create", slug: "unknown" });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: "create",
    slug: "unknown"
  });
  if (authError) return authError;

  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    const durationMs = ctx.durationMs();
    auditAdminAction("create", "unknown", "fail", { requestId, route: ROUTE_PATH, durationMs });
    return errorResponse("missing_required", 400, requestId, toChecks("missing_required"));
  }

  const action = body.action ?? "publish";
  const validation = validatePublishInput({
    action,
    originalSlug: body.originalSlug,
    targetRevisionId: body.targetRevisionId,
    title: body.title ?? "",
    description: body.description ?? "",
    slugInput: body.slug ?? "",
    date: body.date ?? "",
    tagsInput: body.tags ?? "",
    content: body.content ?? "",
    scheduledAt: body.scheduledAt
  });

  const actionAudit = body.mode === "update" ? "update" : "create";
  if (!validation.ok) {
    const durationMs = ctx.durationMs();
    auditAdminAction(actionAudit, validation.slug || body.originalSlug || "unknown", "fail", { requestId, route: ROUTE_PATH, durationMs });
    return errorResponse(validation.code, statusForWriteErrorCode(validation.code), requestId, toChecks(validation.code));
  }

  const durationMs = ctx.durationMs();
  auditAdminAction(actionAudit, validation.slug, "success", { requestId, route: ROUTE_PATH, durationMs });
  return jsonSuccessResponse({
    ok: true,
    code: null,
    checks: toChecks("publish_failed"),
    requestId,
    slug: validation.slug
  });
}
