import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { getDiagSnapshot } from "@/src/lib/admin-diag";
import { getAdminHealthStatus } from "@/src/lib/admin-health";
import { tAdmin } from "@/src/lib/admin-i18n";
import { getAdminPostsNotice } from "@/src/lib/admin-ui-shared";
import { getAdminPostSummaries } from "@/src/lib/publishing";
import Link from "next/link";
import { redirect } from "next/navigation";
import PostRowActions from "./post-row-actions";

type AdminPostsPageProps = {
  searchParams?: {
    success?: string;
    error?: string;
    rid?: string;
    slug?: string;
    q?: string;
    tag?: string;
    page?: string;
    status?: string;
  };
};

const PAGE_SIZE = 10;

function toPage(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function buildQuery(params: { q?: string; page?: number; status?: string }): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `?${text}` : "";
}

function maskAuditFilePath(filePath: string | null): string {
  if (!filePath) return "memory";
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 2) return normalized;
  return `.../${segments.slice(-2).join("/")}`;
}

function auditTooltip(level: "ok" | "warn" | "error"): string {
  if (level === "ok") return tAdmin("admin.posts.audit.tooltip.ok");
  if (level === "warn") return tAdmin("admin.posts.audit.tooltip.warn");
  return tAdmin("admin.posts.audit.tooltip.error");
}

export default function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const authed = isAdminAuthenticated(cookies());
  if (!authed) redirect("/admin");
  const health = getAdminHealthStatus();
  const snapshot = getDiagSnapshot(5);

  const statusFilter = searchParams?.status === "draft" || searchParams?.status === "published" || searchParams?.status === "scheduled" || searchParams?.status === "archived" ? searchParams.status : "all";
  const posts = getAdminPostSummaries(statusFilter);
  const q = searchParams?.q?.trim() ?? "";
  const qLower = q.toLowerCase();
  const filtered = posts.filter((post) => !qLower || post.title.toLowerCase().includes(qLower) || post.slug.toLowerCase().includes(qLower));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(toPage(searchParams?.page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = filtered.slice(start, start + PAGE_SIZE);
  const notice = getAdminPostsNotice({ success: searchParams?.success, error: searchParams?.error, rid: searchParams?.rid });

  return (
    <section className="space-y-6">
      <header className="ui-card space-y-2">
        <h1 className="text-3xl font-bold">文章管理</h1>
        <p className="text-sm ui-muted">搜索、筛选并管理文章（草稿/发布/计划/回滚）。</p>
      </header>

      <div className="ui-card flex flex-wrap items-center gap-2 p-4">
        <Link className="btn-secondary" href="/admin/new">新建文章</Link>
        <form action="/api/admin/logout" method="post">
          <button className="btn-secondary" type="submit">退出登录</button>
        </form>
      </div>

      {notice?.tone === "success" && <p className="notice-success">{notice.message}</p>}
      {notice?.tone === "error" && (
        <div className="space-y-1">
          <p className="notice-error">{notice.message}</p>
          {notice.telemetryCode && <p className="text-xs ui-muted">telemetry: {notice.telemetryCode}</p>}
        </div>
      )}
      {notice?.requestId && <p className="text-xs ui-muted">requestId: {notice.requestId}</p>}

      <form action="/admin/posts" className="ui-card grid gap-3 p-4 sm:grid-cols-4" method="get">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium ui-muted" htmlFor="q">搜索</label>
          <input className="form-input" defaultValue={q} id="q" name="q" placeholder="标题或 slug" type="text" />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="block text-xs font-medium ui-muted" htmlFor="status">状态</label>
          <select className="form-input" defaultValue={statusFilter} id="status" name="status">
            <option value="all">all</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="scheduled">scheduled</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-1">
          <button className="btn-secondary" type="submit">筛选</button>
          <Link className="btn-secondary" href="/admin/posts">重置</Link>
        </div>
      </form>

      <div className="ui-card px-4 py-3 text-sm ui-muted">
        共 {total} 篇，当前第 {currentPage} / {totalPages} 页
      </div>

      <div className="ui-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">系统状态</h2>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-semibold ${health.summary === "ok" ? "bg-green-100 text-green-700" : health.summary === "warn" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              {health.summary.toUpperCase()}
            </span>
            <Link className="btn-secondary px-2 py-1 text-xs" href="/admin/posts">刷新状态</Link>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <p>auth: <strong className={health.checks.auth === "ok" ? "text-green-600" : "text-amber-600"}>{health.checks.auth}</strong></p>
          <p>content_rw: <strong className={health.checks.content_rw === "ok" ? "text-green-600" : "text-red-600"}>{health.checks.content_rw}</strong></p>
          <p>write_probe: <strong className={health.checks.write_probe === "ok" ? "text-green-600" : "text-red-600"}>{health.checks.write_probe}</strong> ({health.writeProbe.latencyMs}ms)</p>
          <p>storage: <strong className={health.checks.storage === "ok" ? "text-green-600" : "text-amber-600"}>{health.checks.storage}</strong></p>
          <p>audit: <strong className={health.checks.audit === "ok" ? "text-green-600" : "text-amber-600"} title={auditTooltip(health.checks.audit)}>{health.checks.audit}</strong></p>
          <p>audit_mode: <strong>{health.audit.mode}</strong></p>
          <p>audit_file: <strong>{maskAuditFilePath(health.audit.filePath)}</strong></p>
          {health.audit.lastError && <p className="text-amber-700">audit_error: {health.audit.lastError}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <form action="/api/admin/invalidate-sessions" method="post">
            <button className="btn-secondary" type="submit">全量会话失效</button>
          </form>
          <form action="/api/admin/publish-scheduled" method="post">
            <button className="btn-secondary" type="submit">执行计划发布</button>
          </form>
        </div>
        <div className="rounded border border-[color:var(--border)] p-3 text-xs">
          <p className="font-medium">最近故障快照</p>
          <p className="mt-1 ui-muted">summary={snapshot.health.summary}, events={snapshot.events.length}</p>
          {snapshot.events[0] && <p className="mt-1 ui-muted">latest={snapshot.events[0].action}/{snapshot.events[0].result} at {snapshot.events[0].timestamp}</p>}
        </div>
      </div>

      <div className="ui-card hidden overflow-x-auto p-0 md:block">
        <table className="min-w-full text-sm">
          <thead style={{ background: "var(--bg-soft)" }}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">标题</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">PublishedAt</th>
              <th className="px-4 py-3 text-left font-medium">LatestRevision</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {pagePosts.map((post) => (
              <tr key={post.slug} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-4 py-3">{post.title}</td>
                <td className="px-4 py-3 font-mono text-xs ui-muted">{post.slug}</td>
                <td className="px-4 py-3">{post.status}</td>
                <td className="px-4 py-3">{post.publishedAt ?? "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{post.latestRevisionId ?? "-"}</td>
                <td className="px-4 py-3">
                  <PostRowActions slug={post.slug} targetRevisionId={post.latestDraftRevisionId ?? post.publishedRevisionId ?? ""} title={post.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
        <Link
          aria-disabled={currentPage <= 1}
          className={`btn-secondary ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
          href={`/admin/posts${buildQuery({ q, status: statusFilter, page: currentPage - 1 })}`}
        >
          上一页
        </Link>
        <Link
          aria-disabled={currentPage >= totalPages}
          className={`btn-secondary ${currentPage >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          href={`/admin/posts${buildQuery({ q, status: statusFilter, page: currentPage + 1 })}`}
        >
          下一页
        </Link>
      </nav>
    </section>
  );
}
