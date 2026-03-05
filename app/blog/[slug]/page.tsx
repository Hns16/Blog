import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPostBySlug } from "@/src/lib/blog";

type PageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Not Found"
    };
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article"
    }
  };
}

export default function BlogDetailPage({ params }: PageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="space-y-6">
      <Link className="text-sm ui-muted underline-offset-4 hover:underline" href="/blog">
        返回博客列表
      </Link>

      <header className="ui-card space-y-3">
        <p className="text-xs ui-muted">{post.date}</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
        <p className="text-sm leading-7 ui-muted">{post.description}</p>
        {!!post.tags?.length && (
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag) => (
              <Link className="btn-secondary px-2 py-1 text-xs" href={`/blog?tag=${encodeURIComponent(tag)}`} key={tag}>
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="ui-card">
        <div className="prose-post">
          <MDXRemote source={post.content} />
        </div>
      </div>
    </article>
  );
}
