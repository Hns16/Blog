import { NextResponse } from "next/server";
import { isWriteErrorCode, type WriteErrorCode } from "@/src/lib/admin-write-shared";

export function jsonErrorResponse<TCode extends string>(
  params: { error: string; code: TCode; requestId: string; status: number } & Record<string, unknown>
) {
  const { status, ...body } = params;
  return NextResponse.json(body, { status });
}

export function jsonSuccessResponse<TBody extends Record<string, unknown>>(
  body: TBody,
  status = 200
) {
  return NextResponse.json(body, { status });
}

export function toWriteErrorCode(error: unknown): WriteErrorCode {
  const code = error instanceof Error ? error.message : "publish_failed";
  return isWriteErrorCode(code) ? code : "publish_failed";
}

export function statusForWriteErrorCode(code: WriteErrorCode): number {
  if (code === "forbidden") return 403;
  if (code === "unauthorized") return 401;
  if (code === "slug_conflict" || code === "write_conflict") return 409;
  if (code === "not_found" || code === "revision_not_found") return 404;
  if (code === "publish_failed") return 500;
  return 400;
}
