import { tAdmin } from "@/src/lib/admin-i18n";

export function getLoginErrorMessage(error?: string, retryAfterSec?: string): string | null {
  if (!error) return null;
  if (error === "invalid_password") return tAdmin("admin.login.error.invalid_password");
  if (error === "missing_password") return tAdmin("admin.login.error.missing_password");
  if (error === "rate_limited") {
    const retry = Number(retryAfterSec ?? "0");
    if (Number.isFinite(retry) && retry > 0) {
      return tAdmin("admin.login.error.rate_limited", { retry_after: Math.ceil(retry) });
    }
    return tAdmin("admin.login.error.rate_limited_fallback");
  }
  return tAdmin("admin.login.error.unknown");
}
