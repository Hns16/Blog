import { tAdmin } from "@/src/lib/admin-i18n";
import { getWriteErrorMessage } from "@/src/lib/admin-write-shared";

type NoticeTone = "success" | "error";

export function getAdminPostsNotice(params: { success?: string; error?: string; rid?: string }): { tone: NoticeTone; message: string; telemetryCode?: string; requestId?: string } | null {
  const requestId = params.rid?.trim() || undefined;
  const success = params.success?.trim();
  if (success === "deleted") return { tone: "success", message: tAdmin("admin.posts.success.deleted"), requestId };
  if (success === "updated") return { tone: "success", message: tAdmin("admin.posts.success.updated"), requestId };
  if (success === "scheduled_run") return { tone: "success", message: tAdmin("admin.posts.success.scheduled_run"), requestId };
  if (success === "sessions_invalidated") return { tone: "success", message: tAdmin("admin.posts.success.sessions_invalidated"), requestId };

  const error = params.error?.trim();
  if (!error) return null;
  if (error === "delete_failed") return { tone: "error", message: tAdmin("admin.posts.error.delete_failed"), requestId };

  const writeErrorMessage = getWriteErrorMessage(error);
  if (writeErrorMessage) return { tone: "error", message: writeErrorMessage, requestId };

  return { tone: "error", message: tAdmin("admin.posts.error.unknown"), telemetryCode: `admin_posts_unknown_error:${error}`, requestId };
}
