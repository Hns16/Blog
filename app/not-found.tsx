import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">404 - 页面不存在</h1>
      <Link className="text-blue-600 hover:underline" href="/blog">
        返回文章列表
      </Link>
    </div>
  );
}
