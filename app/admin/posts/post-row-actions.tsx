"use client";

import Link from "next/link";
import { useState } from "react";
import DeletePostForm from "./delete-post-form";

type PostRowActionsProps = {
  slug: string;
  title: string;
  targetRevisionId: string;
};

export default function PostRowActions({ slug, title, targetRevisionId }: PostRowActionsProps) {
  const [locked, setLocked] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (locked) {
      event.preventDefault();
      return;
    }
    setLocked(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className={`btn-secondary px-2 py-1 text-xs ${locked ? "pointer-events-none opacity-50" : ""}`} href={`/admin/edit/${slug}`}>编辑/回滚</Link>
      <Link className={`btn-secondary px-2 py-1 text-xs ${locked ? "pointer-events-none opacity-50" : ""}`} href={`/blog/${slug}`}>查看</Link>

      <form action="/api/admin/update-post" method="post" onSubmit={onSubmit}>
        <input name="originalSlug" type="hidden" value={slug} />
        <input name="action" type="hidden" value="rollback" />
        <input name="targetRevisionId" type="hidden" value={targetRevisionId} />
        <button className="btn-secondary px-2 py-1 text-xs disabled:opacity-50" disabled={locked} type="submit">发布</button>
      </form>

      <form action="/api/admin/update-post" method="post" onSubmit={onSubmit}>
        <input name="originalSlug" type="hidden" value={slug} />
        <input name="action" type="hidden" value="cancel_schedule" />
        <button className="btn-secondary px-2 py-1 text-xs disabled:opacity-50" disabled={locked} type="submit">取消计划</button>
      </form>

      <form action="/api/admin/update-post" method="post" onSubmit={onSubmit}>
        <input name="originalSlug" type="hidden" value={slug} />
        <input name="action" type="hidden" value="archive" />
        <button className="btn-secondary px-2 py-1 text-xs disabled:opacity-50" disabled={locked} type="submit">归档</button>
      </form>

      <DeletePostForm disabled={locked} slug={slug} title={title} />
    </div>
  );
}
