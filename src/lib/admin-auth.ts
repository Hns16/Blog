import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { auditAdminAction } from "@/src/lib/admin-audit";
import { getAdminPassword } from "@/src/lib/env";
import { loadPersistedState, savePersistedState, type PersistStatus } from "@/src/lib/admin-state-store";

export const ADMIN_AUTH_COOKIE = "admin_auth";
const ADMIN_AUTH_MAX_AGE_SEC = 60 * 60 * 8;
const ADMIN_AUTH_VERSION = "v1";
const SESSION_VERSION_BASE = Number(process.env.ADMIN_SESSION_VERSION ?? "1") || 1;
const STORE_KEY = "session_state";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      maxAge?: number;
    }
  ): void;
};

type TokenPayload = {
  v: string;
  iat: number;
  exp: number;
  nonce: string;
  sv: number;
};

type SessionStore = {
  version: number;
  updatedAt: number;
};

let persistStatus: PersistStatus = { mode: "persistent", lastError: null };
let warned = false;

const loaded = loadPersistedState<SessionStore>(STORE_KEY, {
  version: SESSION_VERSION_BASE,
  updatedAt: Date.now()
});
persistStatus = loaded.status;
let currentSessionVersion = Math.max(SESSION_VERSION_BASE, loaded.value.version || SESSION_VERSION_BASE);
if (persistStatus.mode === "memory_fallback") {
  emitStorageWarn("load_failed", persistStatus.lastError);
}

function emitStorageWarn(reason: string, code: string | null): void {
  if (warned) return;
  warned = true;
  auditAdminAction("invalidate_sessions", `storage_${reason}_${code ?? "unknown"}`, "warn", {
    route: "admin-auth",
    durationMs: -1,
    requestId: "storage"
  });
}

function persistSessionVersion(): void {
  if (persistStatus.mode === "memory_fallback") return;
  const status = savePersistedState<SessionStore>(STORE_KEY, {
    version: currentSessionVersion,
    updatedAt: Date.now()
  });
  if (status.mode === "memory_fallback") {
    persistStatus = status;
    emitStorageWarn("save_failed", status.lastError);
  }
}

function getAuthSecret(): string | null {
  const adminPassword = getAdminPassword();
  if (!adminPassword) return null;
  return process.env.ADMIN_AUTH_SECRET ?? `admin-auth:${adminPassword}`;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function signPayload(rawPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(rawPayload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createAdminAuthToken(nowMs = Date.now()): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;

  const nowSec = Math.floor(nowMs / 1000);
  const payload: TokenPayload = {
    v: ADMIN_AUTH_VERSION,
    iat: nowSec,
    exp: nowSec + ADMIN_AUTH_MAX_AGE_SEC,
    nonce: randomBytes(16).toString("base64url"),
    sv: getCurrentSessionVersion()
  };

  const rawPayload = JSON.stringify(payload);
  const encodedPayload = encodeBase64Url(rawPayload);
  const signature = signPayload(rawPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminAuthToken(token: string, nowMs = Date.now()): boolean {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  try {
    const rawPayload = decodeBase64Url(encodedPayload);
    const expectedSignature = signPayload(rawPayload, secret);
    if (!safeEqual(signature, expectedSignature)) return false;

    const payload = JSON.parse(rawPayload) as Partial<TokenPayload>;
    if (payload.v !== ADMIN_AUTH_VERSION) return false;
    if (typeof payload.exp !== "number") return false;
    if (typeof payload.sv !== "number") return false;
    if (payload.sv !== getCurrentSessionVersion()) return false;

    const nowSec = Math.floor(nowMs / 1000);
    return nowSec <= payload.exp;
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(cookieStore: CookieReader): boolean {
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value ?? "";
  return verifyAdminAuthToken(token);
}

export function setAdminAuthCookie(cookieStore: CookieWriter): boolean {
  const token = createAdminAuthToken();
  if (!token) return false;

  cookieStore.set(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_AUTH_MAX_AGE_SEC
  });
  return true;
}

export function clearAdminAuthCookie(cookieStore: CookieWriter): void {
  cookieStore.set(ADMIN_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function getCurrentSessionVersion(): number {
  return currentSessionVersion;
}

export function invalidateAllAdminSessions(): number {
  currentSessionVersion += 1;
  persistSessionVersion();
  return getCurrentSessionVersion();
}

export function getAdminAuthConfigStatus(): { configured: boolean; sessionVersion: number; storage: PersistStatus } {
  return {
    configured: getAuthSecret() !== null,
    sessionVersion: getCurrentSessionVersion(),
    storage: persistStatus
  };
}
