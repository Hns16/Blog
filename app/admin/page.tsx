import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import { tAdmin } from "@/src/lib/admin-i18n";
import { hasAdminPassword } from "@/src/lib/env";
import { getLoginErrorMessage } from "@/src/lib/admin-login-shared";
import Link from "next/link";
import { redirect } from "next/navigation";

type AdminPageProps = {
  searchParams?: {
    error?: string;
    retry_after?: string;
  };
};

export default function AdminPage({ searchParams }: AdminPageProps) {
  const hasPassword = hasAdminPassword();

  const authed = isAdminAuthenticated(cookies());
  const error = searchParams?.error;
  const errorMessage = getLoginErrorMessage(error, searchParams?.retry_after);

  if (authed) {
    redirect("/admin/posts");
  }

  return (
    <section className="space-y-6">
      <header className="ui-card space-y-2">
        <h1 className="text-3xl font-bold">管理登录</h1>
        <p className="text-sm ui-muted">输入管理密码后进入文章管理（/admin/posts），可从管理页进入新建（/admin/new）。</p>
      </header>

      <div className="ui-card space-y-2">
        {!hasPassword && <p className="notice-warn">{tAdmin("admin.login.warn.missing_password_config")}</p>}
        {error === "session_invalidated" && <p className="notice-warn">{tAdmin("admin.login.warn.session_invalidated")}</p>}
        {errorMessage && <p className="notice-error">{errorMessage}</p>}

        <form action="/api/admin/login" className="mt-4 space-y-3" method="post">
          <div className="space-y-1">
            <label className="form-label" htmlFor="password">密码</label>
            <input className="form-input" disabled={!hasPassword} id="password" name="password" type="password" required />
          </div>
          <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!hasPassword} type="submit">
            进入管理
          </button>
        </form>
      </div>

      <div className="ui-card p-4">
        <p className="text-xs ui-muted">
          普通访问入口：
          <Link className="underline" href="/blog"> /blog</Link>
        </p>
      </div>
    </section>
  );
}
