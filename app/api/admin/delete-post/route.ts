import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonErrorResponse, jsonSuccessResponse } from "@/src/lib/admin-api-shared";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH } from "@/src/lib/admin-route-meta";
import { guardAdminAuthenticated, guardSameOrigin } from "@/src/lib/admin-route-guard";
import { deletePostArtifacts } from "@/src/lib/publishing";
import {
  isHtmlRequest,
  redirectUrl
} from "@/src/lib/admin-write-server";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const SLUG_RE = /^[a-z0-9-]+$/;
const ROUTE_PATH = API_ROUTE_PATH.ADMIN_DELETE_POST;

function htmlBack(request: Request, query: string, requestId?: string) {
  const finalQuery = requestId ? `${query}&rid=${encodeURIComponent(requestId)}` : query;
  return NextResponse.redirect(redirectUrl(request, `/admin/posts?${finalQuery}`), 303);
}

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);
  const requestId = ctx.requestId;

  const originError = guardSameOrigin({
    request,
    ctx,
    action: "delete",
    slug: "unknown",
    htmlRedirectPath: "/admin/posts?error=forbidden",
    forbiddenCode: "FORBIDDEN"
  });
  if (originError) return originError;

  const authError = guardAdminAuthenticated(isAdminAuthenticated(cookies()), {
    request,
    ctx,
    action: "delete",
    slug: "unknown",
    htmlRedirectPath: "/admin/posts?error=unauthorized",
    unauthorizedCode: "UNAUTHORIZED"
  });
  if (authError) return authError;

  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!slug || !SLUG_RE.test(slug)) {
    const durationMs = ctx.durationMs();
    auditAdminAction("delete", slug || "unknown", "fail", { requestId, route: ROUTE_PATH, durationMs });
    if (isHtmlRequest(request)) return htmlBack(request, "error=delete_failed", requestId);
    return jsonErrorResponse({ error: "Invalid slug", code: "VALIDATION_ERROR", requestId, status: 400 });
  }

  const outputPath = path.resolve(BLOG_DIR, `${slug}.mdx`);
  const blogRoot = `${path.resolve(BLOG_DIR)}${path.sep}`;
  if (!outputPath.startsWith(blogRoot)) {
    const durationMs = ctx.durationMs();
    auditAdminAction("delete", slug, "fail", { requestId, route: ROUTE_PATH, durationMs });
    if (isHtmlRequest(request)) return htmlBack(request, "error=delete_failed", requestId);
    return jsonErrorResponse({ error: "Invalid slug path", code: "VALIDATION_ERROR", requestId, status: 400 });
  }

  if (!fs.existsSync(outputPath)) {
    const removed = deletePostArtifacts(slug);
    if (removed.removed) {
      revalidatePath("/");
      revalidatePath("/blog");
      revalidatePath(`/blog/${slug}`);
      const durationMs = ctx.durationMs();
      auditAdminAction("delete", slug, "success", { requestId, route: ROUTE_PATH, durationMs });
      if (isHtmlRequest(request)) return htmlBack(request, `success=deleted&slug=${encodeURIComponent(slug)}`, requestId);
      return jsonSuccessResponse({ ok: true, slug, requestId });
    }
    const durationMs = ctx.durationMs();
    auditAdminAction("delete", slug, "fail", { requestId, route: ROUTE_PATH, durationMs });
    if (isHtmlRequest(request)) return htmlBack(request, "error=not_found", requestId);
    return jsonErrorResponse({ error: "Post not found", code: "NOT_FOUND", requestId, status: 404 });
  }

  try {
    fs.unlinkSync(outputPath);
  } catch {
    const durationMs = ctx.durationMs();
    auditAdminAction("delete", slug, "fail", { requestId, route: ROUTE_PATH, durationMs });
    if (isHtmlRequest(request)) return htmlBack(request, "error=delete_failed", requestId);
    return jsonErrorResponse({ error: "Delete failed", code: "DELETE_FAILED", requestId, status: 500 });
  }
  deletePostArtifacts(slug);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  const durationMs = ctx.durationMs();
  auditAdminAction("delete", slug, "success", { requestId, route: ROUTE_PATH, durationMs });
  if (isHtmlRequest(request)) return htmlBack(request, `success=deleted&slug=${encodeURIComponent(slug)}`, requestId);
  return jsonSuccessResponse({ ok: true, slug, requestId });
}
