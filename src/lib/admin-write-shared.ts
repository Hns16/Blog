import { type AdminMessageKey, tAdmin } from "@/src/lib/admin-i18n";

export const WRITE_ERROR_CODES = [
  "slug_conflict",
  "write_conflict",
  "invalid_slug",
  "invalid_date",
  "missing_required",
  "invalid_action",
  "schedule_invalid",
  "revision_not_found",
  "publish_failed",
  "not_found",
  "forbidden",
  "unauthorized"
] as const;

export type WriteErrorCode = (typeof WRITE_ERROR_CODES)[number];

export const WRITE_ERROR_MESSAGE_KEY_MAP: Record<WriteErrorCode, AdminMessageKey> = {
  slug_conflict: "admin.write.slug_conflict",
  write_conflict: "admin.write.write_conflict",
  invalid_slug: "admin.write.invalid_slug",
  invalid_date: "admin.write.invalid_date",
  missing_required: "admin.write.missing_required",
  invalid_action: "admin.write.invalid_action",
  schedule_invalid: "admin.write.schedule_invalid",
  revision_not_found: "admin.write.revision_not_found",
  publish_failed: "admin.write.publish_failed",
  not_found: "admin.write.not_found",
  forbidden: "admin.write.forbidden",
  unauthorized: "admin.write.unauthorized"
};

export function isWriteErrorCode(value: string): value is WriteErrorCode {
  return (WRITE_ERROR_CODES as readonly string[]).includes(value);
}

export function getWriteErrorMessage(code?: string): string | null {
  if (!code) return null;
  if (isWriteErrorCode(code)) return tAdmin(WRITE_ERROR_MESSAGE_KEY_MAP[code]);
  return tAdmin(WRITE_ERROR_MESSAGE_KEY_MAP.publish_failed);
}

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function countNonWhitespaceChars(content: string): number {
  return content.replace(/\s/g, "").length;
}

export function estimateReadingMinutes(content: string): number {
  const cjkMatches = content.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g);
  const cjkChars = cjkMatches?.length ?? 0;
  const latinWords = content.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
  const minutes = cjkChars / 300 + latinWords / 220;
  return Math.max(1, Math.ceil(minutes || 0));
}

export function dedupeTags(tagsInput: string): string[] {
  if (!tagsInput) return [];

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const rawTag of tagsInput.split(",")) {
    const tag = rawTag.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}
