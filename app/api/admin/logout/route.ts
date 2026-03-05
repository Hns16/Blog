import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAdminAuthCookie } from "@/src/lib/admin-auth";
import { createAdminRequestContext } from "@/src/lib/admin-request-context";
import { API_ROUTE_PATH, AUDIT_ACTION } from "@/src/lib/admin-route-meta";
import { guardSameOrigin } from "@/src/lib/admin-route-guard";
import { redirectUrl } from "@/src/lib/admin-write-server";

const ROUTE_PATH = API_ROUTE_PATH.ADMIN_LOGOUT;

export async function POST(request: Request) {
  const ctx = createAdminRequestContext(ROUTE_PATH);

  const originError = guardSameOrigin({
    request,
    ctx,
    action: AUDIT_ACTION.LOGIN,
    slug: "logout",
    forbiddenCode: "FORBIDDEN"
  });
  if (originError) return originError;

  clearAdminAuthCookie(cookies());

  return NextResponse.redirect(redirectUrl(request, "/admin"), 303);
}
