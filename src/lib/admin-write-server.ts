import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { WriteErrorCode } from "@/src/lib/admin-write-shared";
import { toSlug } from "@/src/lib/admin-write-shared";

export const BLOG_DIR = path.join(process.cwd(), "content", "blog");
export const SLUG_RE = /^[a-z0-9-]+$/;
const ACTIVE_SLUG_LOCKS = new Set<string>();

type ValidationInput = {
  title: string;
  description: string;
  slugInput: string;
  date: string;
  content: string;
  mode: "create" | "update";
  originalSlug?: string;
};

export type ValidationResult = {
  ok: boolean;
  code?: WriteErrorCode;
  slug: string;
  normalizedDate: string | null;
  checks: {
    required: boolean;
    date: boolean;
    slugFormat: boolean;
    slugConflict: boolean;
  };
};

export function createRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function isHtmlRequest(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

export function redirectUrl(request: Request, pathname: string): URL {
  const requestUrl = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
  return new URL(pathname, `${proto}://${host}`);
}

function requestHost(request: Request): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function sameHost(urlValue: string, host: string): boolean {
  try {
    return new URL(urlValue).host === host;
  } catch {
    return false;
  }
}

export function isSameOrigin(request: Request): boolean {
  const host = requestHost(request);
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    return sameHost(origin, host);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    return sameHost(referer, host);
  }

  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const fetchSite = (request.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") {
    return true;
  }

  return false;
}

export function toValidDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? value : null;
}

export function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

export function findExistingPath(slug: string): string | null {
  const mdx = path.resolve(BLOG_DIR, `${slug}.mdx`);
  const md = path.resolve(BLOG_DIR, `${slug}.md`);
  if (fs.existsSync(mdx)) return mdx;
  if (fs.existsSync(md)) return md;
  return null;
}

export function resolveBlogPath(slug: string): string {
  return path.resolve(BLOG_DIR, `${slug}.mdx`);
}

export function isSafeBlogPath(filePath: string): boolean {
  const blogRoot = `${path.resolve(BLOG_DIR)}${path.sep}`;
  return filePath.startsWith(blogRoot);
}

export function ensureBlogDir(): void {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }
}

export function writeFileAtomic(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`
  );

  try {
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, targetPath);
  } finally {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // noop
      }
    }
  }
}

function toLockKeys(slugs: string[]): string[] {
  return Array.from(new Set(slugs.map((item) => item.trim()).filter(Boolean))).sort();
}

export async function withSlugLock<T>(slugs: string[], task: () => Promise<T>): Promise<{ locked: boolean; value?: T }> {
  const lockKeys = toLockKeys(slugs);
  if (lockKeys.some((key) => ACTIVE_SLUG_LOCKS.has(key))) {
    return { locked: false };
  }

  for (const key of lockKeys) {
    ACTIVE_SLUG_LOCKS.add(key);
  }

  try {
    const value = await task();
    return { locked: true, value };
  } finally {
    for (const key of lockKeys) {
      ACTIVE_SLUG_LOCKS.delete(key);
    }
  }
}

export function validateWriteInput(input: ValidationInput): ValidationResult {
  const title = input.title.trim();
  const description = input.description.trim();
  const date = input.date.trim();
  const content = input.content.trim();
  const slug = toSlug(input.slugInput || title);
  const normalizedDate = toValidDate(date);
  const required = Boolean(title && description && date && content);
  const slugFormat = Boolean(slug && SLUG_RE.test(slug));
  const dateValid = normalizedDate !== null;
  let slugConflict = false;

  if (slugFormat) {
    const outputPath = resolveBlogPath(slug);
    if (!isSafeBlogPath(outputPath)) {
      return {
        ok: false,
        code: "invalid_slug",
        slug,
        normalizedDate,
        checks: { required, date: dateValid, slugFormat: false, slugConflict: false }
      };
    }
    const originalSlug = input.originalSlug?.trim();
    if (input.mode === "update" && originalSlug && slug === originalSlug) {
      slugConflict = false;
    } else {
      slugConflict = fs.existsSync(outputPath);
    }
  }

  if (!required) {
    return {
      ok: false,
      code: "missing_required",
      slug,
      normalizedDate,
      checks: { required, date: dateValid, slugFormat, slugConflict: !slugConflict }
    };
  }

  if (!dateValid) {
    return {
      ok: false,
      code: "invalid_date",
      slug,
      normalizedDate,
      checks: { required, date: false, slugFormat, slugConflict: !slugConflict }
    };
  }

  if (!slugFormat) {
    return {
      ok: false,
      code: "invalid_slug",
      slug,
      normalizedDate,
      checks: { required, date: true, slugFormat: false, slugConflict: true }
    };
  }

  if (slugConflict) {
    return {
      ok: false,
      code: "slug_conflict",
      slug,
      normalizedDate,
      checks: { required, date: true, slugFormat: true, slugConflict: false }
    };
  }

  return {
    ok: true,
    slug,
    normalizedDate,
    checks: { required: true, date: true, slugFormat: true, slugConflict: true }
  };
}
