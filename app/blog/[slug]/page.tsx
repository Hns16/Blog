import type { Metadata } from "next";
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
      <header className="space-y-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="text-neutral-600">{post.description}</p>
        <p className="text-sm text-neutral-500">{post.date}</p>
      </header>

      <div className="max-w-none space-y-4 leading-7">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
