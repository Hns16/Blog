import { auditAdminAction } from "@/src/lib/admin-audit";
import { loadPersistedState, savePersistedState, type PersistStatus } from "@/src/lib/admin-state-store";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const STORE_KEY = "login_guard";

type LoginState = {
  failures: number;
  firstFailureAt: number;
  lockUntil: number;
};

type StoreShape = {
  updatedAt: number;
  attempts: Record<string, LoginState>;
};

let persistStatus: PersistStatus = { mode: "persistent", lastError: null };
let warned = false;

const initialStore = loadPersistedState<StoreShape>(STORE_KEY, { updatedAt: Date.now(), attempts: {} });
persistStatus = initialStore.status;
let loginAttempts = new Map<string, LoginState>(Object.entries(initialStore.value.attempts));
cleanupExpired();
if (persistStatus.mode === "memory_fallback") {
  emitStorageWarn("load_failed", persistStatus.lastError);
}

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(): void {
  const now = nowMs();
  for (const [source, state] of loginAttempts.entries()) {
    const windowExpired = now - state.firstFailureAt > WINDOW_MS;
    const lockExpired = state.lockUntil > 0 && state.lockUntil <= now;
    if (windowExpired || lockExpired) {
      loginAttempts.delete(source);
    }
  }
}

function emitStorageWarn(reason: string, code: string | null): void {
  if (warned) return;
  warned = true;
  auditAdminAction("login", `storage_${reason}_${code ?? "unknown"}`, "warn", {
    route: "admin-login-guard",
    durationMs: -1,
    requestId: "storage"
  });
}

function persist(): void {
  cleanupExpired();
  if (persistStatus.mode === "memory_fallback") {
    return;
  }
  const shape: StoreShape = {
    updatedAt: nowMs(),
    attempts: Object.fromEntries(loginAttempts.entries())
  };
  const next = savePersistedState(STORE_KEY, shape);
  if (next.mode === "memory_fallback") {
    persistStatus = next;
    emitStorageWarn("save_failed", next.lastError);
  }
}

export function getLoginSource(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim() || "unknown";
  return "unknown";
}

export function checkLoginRateLimit(source: string): { limited: boolean; retryAfterSec: number } {
  cleanupExpired();
  const state = loginAttempts.get(source);
  if (!state) return { limited: false, retryAfterSec: 0 };

  const now = nowMs();
  if (state.lockUntil > now) {
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((state.lockUntil - now) / 1000)) };
  }

  if (now - state.firstFailureAt > WINDOW_MS) {
    loginAttempts.delete(source);
    persist();
    return { limited: false, retryAfterSec: 0 };
  }

  return { limited: false, retryAfterSec: 0 };
}

export function recordLoginFailure(source: string): { limited: boolean; retryAfterSec: number } {
  cleanupExpired();

  const now = nowMs();
  const prev = loginAttempts.get(source);

  if (!prev || now - prev.firstFailureAt > WINDOW_MS) {
    loginAttempts.set(source, {
      failures: 1,
      firstFailureAt: now,
      lockUntil: 0
    });
    persist();
    return { limited: false, retryAfterSec: 0 };
  }

  const failures = prev.failures + 1;
  const lockUntil = failures >= MAX_FAILURES ? now + LOCK_MS : 0;
  loginAttempts.set(source, {
    failures,
    firstFailureAt: prev.firstFailureAt,
    lockUntil
  });
  persist();

  if (lockUntil > now) {
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((lockUntil - now) / 1000)) };
  }
  return { limited: false, retryAfterSec: 0 };
}

export function clearLoginFailures(source: string): void {
  loginAttempts.delete(source);
  persist();
}

export function getLoginGuardStorageStatus(): PersistStatus {
  return persistStatus;
}
