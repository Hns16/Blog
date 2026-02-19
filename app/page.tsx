import Link from "next/link";
import { getAllPosts } from "@/src/lib/blog";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">My Blog</h1>
        <p className="text-neutral-600">基于 Next.js 14 + MDX 的最小博客系统。</p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">最新文章</h2>
          <Link className="text-sm text-blue-600 hover:underline" href="/blog">
            查看全部
          </Link>
        </div>

        <ul className="space-y-4">
          {posts.slice(0, 5).map((post) => (
            <li className="rounded-lg border border-neutral-200 bg-white p-4" key={post.slug}>
              <Link className="text-lg font-medium hover:underline" href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
              <p className="mt-1 text-sm text-neutral-600">{post.description}</p>
              <p className="mt-2 text-xs text-neutral-500">{post.date}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
