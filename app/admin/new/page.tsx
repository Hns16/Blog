import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getWriteErrorMessage } from "@/src/lib/admin-write-shared";
import AdminNewForm, { AdminDraftClearButton } from "./admin-new-form";

type AdminNewPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
    slug?: string;
  };
};

export default function AdminNewPage({ searchParams }: AdminNewPageProps) {
  const authed = isAdminAuthenticated(cookies());

  if (!authed) {
    redirect("/admin");
  }

  const today = new Date().toISOString().slice(0, 10);
  const clearOnSuccess = searchParams?.success === "1";
  const status = searchParams?.error ?? (searchParams?.success === "1" ? "success" : "");
  const errorMessage = getWriteErrorMessage(searchParams?.error);

  return (
    <section className="space-y-6">
      <header className="ui-card space-y-2">
        <h1 className="text-3xl font-bold">新建文章</h1>
        <p className="text-sm ui-muted">填写后发布到博客，支持自动保存草稿。</p>
      </header>

      <div className="ui-card flex flex-wrap items-center gap-2 p-4">
        <Link className="btn-secondary" href="/admin/posts">文章管理</Link>
        <AdminDraftClearButton />
        <form action="/api/admin/logout" method="post">
          <button className="btn-secondary" type="submit">退出登录</button>
        </form>
      </div>

      {status === "success" && (
        <p className="notice-success">
          发布成功
          {searchParams?.slug && (
            <>
              {"，"}
              <Link className="underline" href={`/blog/${searchParams.slug}`}>查看文章</Link>
            </>
          )}
        </p>
      )}
      {status !== "success" && errorMessage && <p className="notice-error">{errorMessage}</p>}

      <div className="ui-card p-1 sm:p-2">
        <AdminNewForm clearOnSuccess={clearOnSuccess} defaultDate={today} />
      </div>
    </section>
  );
}
