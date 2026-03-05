import Link from "next/link";
import { getAllPosts } from "@/src/lib/blog";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <div className="space-y-8">
      <section className="ui-card space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide ui-muted">Personal Blog</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">写作、记录与沉淀</h1>
        <p className="max-w-2xl text-sm leading-7 ui-muted">这里持续发布基于 Next.js + MDX 的实践记录，包含开发笔记、项目复盘与可复用经验。</p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href="/blog">浏览博客</Link>
          <Link className="btn-secondary" href="/admin">进入管理</Link>
        </div>
      </section>

      <section className="ui-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">最新文章</h2>
          <Link className="text-sm underline-offset-4 hover:underline ui-muted" href="/blog">查看全部</Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {posts.slice(0, 6).map((post) => (
            <li className="ui-soft p-4" key={post.slug}>
              <p className="text-xs ui-muted">{post.date}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug">
                <Link className="hover:underline" href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="mt-2 text-sm leading-6 ui-muted">{post.excerpt || post.description}</p>
              {!!post.tags?.length && <p className="mt-3 text-xs ui-muted">#{post.tags.join(" #")}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
