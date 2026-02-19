import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/src/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Blog post list"
};

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-neutral-600">自动读取 content/blog 下的 MDX 文章。</p>
      </header>

      <ul className="space-y-4">
        {posts.map((post) => (
          <li className="rounded-lg border border-neutral-200 bg-white p-5" key={post.slug}>
            <Link className="text-xl font-semibold hover:underline" href={`/blog/${post.slug}`}>
              {post.title}
            </Link>
            <p className="mt-2 text-neutral-700">{post.description}</p>
            <p className="mt-2 text-sm text-neutral-500">{post.date}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
