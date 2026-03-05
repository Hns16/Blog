import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/src/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Blog post list"
};

const PAGE_SIZE = 6;

type BlogListPageProps = {
  searchParams?: {
    page?: string;
    tag?: string;
  };
};

function toPage(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function buildQuery(page: number, tag?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (tag) params.set("tag", tag);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function BlogListPage({ searchParams }: BlogListPageProps) {
  const posts = getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags ?? []))).sort();
  const activeTag = searchParams?.tag?.trim() || undefined;
  const filtered = activeTag ? posts.filter((post) => (post.tags ?? []).includes(activeTag)) : posts;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(toPage(searchParams?.page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = filtered.slice(start, start + PAGE_SIZE);

  return (
    <section className="space-y-6">
      <header className="ui-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Blog</h1>
          <Link className="btn-primary" href="/admin">
            新建文章
          </Link>
        </div>
        <p className="text-sm ui-muted">{activeTag ? `筛选标签：#${activeTag}` : "自动读取 content/blog 下的文章。"}</p>
        <div className="flex flex-wrap gap-2">
          <Link className={`rounded px-2.5 py-1 text-xs ${!activeTag ? "btn-primary" : "btn-secondary"}`} href="/blog">
            全部
          </Link>
          {allTags.map((tag) => (
            <Link className={`rounded px-2.5 py-1 text-xs ${activeTag === tag ? "btn-primary" : "btn-secondary"}`} href={`/blog${buildQuery(1, tag)}`} key={tag}>
              #{tag}
            </Link>
          ))}
        </div>
      </header>

      {pagePosts.length === 0 ? (
        <div className="ui-card p-8 text-center">
          <p className="text-base font-medium">没有找到匹配文章</p>
          <p className="mt-1 text-sm ui-muted">尝试更换标签，或回到全部文章。</p>
          <Link className="btn-secondary mt-4 inline-block" href="/blog">
            重置筛选
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pagePosts.map((post) => (
            <li className="ui-card" key={post.slug}>
              <p className="text-xs ui-muted">{post.date}</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug">
                <Link className="hover:underline" href={`/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-7 ui-muted">{post.excerpt || post.description}</p>
              <p className="mt-3 text-xs ui-muted">阅读量 -- · 评论 --</p>
              {!!post.tags?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link className="btn-secondary px-2 py-1 text-xs" href={`/blog${buildQuery(1, tag)}`} key={tag}>
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
        <Link
          aria-disabled={currentPage <= 1}
          className={`btn-secondary ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
          href={`/blog${buildQuery(currentPage - 1, activeTag)}`}
        >
          上一页
        </Link>
        <span className="text-sm ui-muted">
          {currentPage} / {totalPages}
        </span>
        <Link
          aria-disabled={currentPage >= totalPages}
          className={`btn-secondary ${currentPage >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          href={`/blog${buildQuery(currentPage + 1, activeTag)}`}
        >
          下一页
        </Link>
      </nav>
    </section>
  );
}
