"use client";

import { useState } from "react";

type DeletePostFormProps = {
  slug: string;
  title: string;
  disabled?: boolean;
};

export default function DeletePostForm({ slug, title, disabled = false }: DeletePostFormProps) {
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (disabled || submitting) {
      event.preventDefault();
      return;
    }
    if (!window.confirm(`确认删除《${title}》吗？（slug: ${slug}）`)) {
      event.preventDefault();
      return;
    }
    setSubmitting(true);
  }

  return (
    <form action="/api/admin/delete-post" method="post" onSubmit={onSubmit}>
      <input name="slug" type="hidden" value={slug} />
      <button className="btn-danger disabled:opacity-50" disabled={disabled || submitting} type="submit">
        {submitting ? "处理中..." : "删除"}
      </button>
    </form>
  );
}
