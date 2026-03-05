import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/src/lib/admin-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEditablePostBySlug } from "@/src/lib/blog";
import { getWriteErrorMessage } from "@/src/lib/admin-write-shared";
import { getAdminPostDetails } from "@/src/lib/publishing";
import AdminEditForm from "./admin-edit-form";

type AdminEditPageProps = {
  params: { slug: string };
  searchParams?: { error?: string };
};

export default function AdminEditPage({ params, searchParams }: AdminEditPageProps) {
  const authed = isAdminAuthenticated(cookies());
  if (!authed) redirect("/admin");

  const post = getEditablePostBySlug(params.slug);
  const postDetails = getAdminPostDetails(params.slug);
  const error = searchParams?.error;
  const errorMessage = getWriteErrorMessage(error);

  if (!post && !error) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <header className="ui-card space-y-2">
        <h1 className="text-3xl font-bold">编辑文章</h1>
        <p className="text-sm ui-muted">修改字段后保存，保存成功返回文章管理页。</p>
      </header>

      <div className="ui-card flex flex-wrap items-center gap-2 p-4">
        <Link className="btn-secondary" href="/admin/posts">文章管理</Link>
        <Link className="btn-secondary" href="/admin/new">新建文章</Link>
      </div>

      {errorMessage && !post && <p className="notice-error">{errorMessage}</p>}

      {post && (
        <AdminEditForm
          errorCode={error}
          initialDraft={{
            title: post.title,
            description: post.description,
            slug: post.slug,
            date: post.date,
            tags: (post.tags ?? []).join(","),
            content: post.content
          }}
          postDetails={postDetails}
          originalSlug={params.slug}
        />
      )}
    </section>
  );
}
