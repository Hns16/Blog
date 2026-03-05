"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countNonWhitespaceChars,
  estimateReadingMinutes,
  getWriteErrorMessage
} from "@/src/lib/admin-write-shared";

type EditDraft = {
  title: string;
  description: string;
  slug: string;
  date: string;
  tags: string;
  content: string;
};

type AdminEditFormProps = {
  originalSlug: string;
  errorCode?: string;
  initialDraft: EditDraft;
  postDetails?: {
    status: string;
    publishedRevisionId: string | null;
    latestDraftRevisionId: string | null;
    revisions: Array<{
      revisionId: string;
      status: string;
      createdAt: string;
      publishedAt: string | null;
    }>;
  } | null;
};

function normalizeDraft(value: EditDraft): string {
  return JSON.stringify(value);
}

export default function AdminEditForm({ originalSlug, errorCode, initialDraft, postDetails }: AdminEditFormProps) {
  const [draft, setDraft] = useState<EditDraft>(initialDraft);
  const [saveState, setSaveState] = useState<"saved" | "unsaved">("saved");
  const [checkResult, setCheckResult] = useState<{ ok: boolean; code: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [action, setAction] = useState<"save_draft" | "publish" | "schedule">("publish");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const initialRef = useRef(normalizeDraft(initialDraft));

  useEffect(() => {
    const snapshot = normalizeDraft(draft);
    setSaveState(snapshot === initialRef.current ? "saved" : "unsaved");
  }, [draft]);

  useEffect(() => {
    if (saveState !== "unsaved") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  function onChange(field: keyof EditDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  const errorMessage = getWriteErrorMessage(errorCode);
  const nonWhitespaceChars = useMemo(() => countNonWhitespaceChars(draft.content), [draft.content]);
  const readingMinutes = useMemo(() => estimateReadingMinutes(draft.content), [draft.content]);

  async function runPrecheck() {
    if (checking) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const response = await fetch("/api/admin/write-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "update",
          action,
          originalSlug,
          title: draft.title,
          description: draft.description,
          slug: draft.slug,
          date: draft.date,
          content: draft.content,
          scheduledAt
        })
      });
      const data = (await response.json()) as { ok?: boolean; code?: string | null };
      setCheckResult({ ok: Boolean(data.ok), code: data.code ?? null });
    } catch {
      setCheckResult({ ok: false, code: "publish_failed" });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      {errorMessage && <p className="notice-error">{errorMessage}</p>}
      <div className="ui-card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs ui-muted">
        <span>保存状态：{saveState === "saved" ? "已保存变更" : "未保存变更"}</span>
        <span>正文字符数：{nonWhitespaceChars}</span>
        <span>预估阅读：约 {readingMinutes} 分钟</span>
        <button className="btn-secondary px-3 py-1 text-xs" disabled={checking} onClick={runPrecheck} type="button">
          {checking ? "检查中..." : "发布前检查"}
        </button>
      </div>
      {checkResult?.ok && <p className="notice-success">发布前检查通过。</p>}
      {!checkResult?.ok && checkResult?.code && <p className="notice-error">{getWriteErrorMessage(checkResult.code)}</p>}

      <form
        action="/api/admin/update-post"
        className="ui-card space-y-4"
        method="post"
        onSubmit={(event) => {
          if (submitting) {
            event.preventDefault();
            return;
          }
          setSubmitting(true);
        }}
      >
        <input name="originalSlug" type="hidden" value={originalSlug} />

        <div className="space-y-1">
          <label className="form-label" htmlFor="title">标题</label>
          <input className="form-input" id="title" name="title" onChange={(event) => onChange("title", event.target.value)} required type="text" value={draft.title} />
        </div>

        <div className="space-y-1">
          <label className="form-label" htmlFor="description">描述</label>
          <input className="form-input" id="description" name="description" onChange={(event) => onChange("description", event.target.value)} required type="text" value={draft.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="form-label" htmlFor="slug">Slug</label>
            <input className="form-input" id="slug" name="slug" onChange={(event) => onChange("slug", event.target.value)} pattern="[a-z0-9-]*" required type="text" value={draft.slug} />
          </div>
          <div className="space-y-1">
            <label className="form-label" htmlFor="date">日期</label>
            <input className="form-input" id="date" name="date" onChange={(event) => onChange("date", event.target.value)} required type="date" value={draft.date} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="form-label" htmlFor="tags">标签（逗号分隔）</label>
          <input className="form-input" id="tags" name="tags" onChange={(event) => onChange("tags", event.target.value)} type="text" value={draft.tags} />
        </div>

        <div className="space-y-1">
          <label className="form-label" htmlFor="content">正文（Markdown/MDX）</label>
          <textarea className="form-textarea min-h-64" id="content" name="content" onChange={(event) => onChange("content", event.target.value)} required value={draft.content} />
        </div>
        <div className="space-y-1">
          <label className="form-label" htmlFor="scheduledAt">计划发布时间</label>
          <input className="form-input" id="scheduledAt" name="scheduledAt" onChange={(event) => setScheduledAt(event.target.value)} type="datetime-local" value={scheduledAt} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary disabled:opacity-50" disabled={submitting} name="action" onClick={() => setAction("save_draft")} type="submit" value="save_draft">
            {submitting ? "处理中..." : "保存草稿"}
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={submitting} name="action" onClick={() => setAction("publish")} type="submit" value="publish">
            {submitting ? "处理中..." : "立即发布"}
          </button>
          <button className="btn-secondary disabled:opacity-50" disabled={submitting} name="action" onClick={() => setAction("schedule")} type="submit" value="schedule">
            {submitting ? "处理中..." : "计划发布"}
          </button>
        </div>
      </form>

      {postDetails && (
        <div className="ui-card space-y-3">
          <p className="text-sm ui-muted">published revision: {postDetails.publishedRevisionId ?? "-"}</p>
          <p className="text-sm ui-muted">latest draft revision: {postDetails.latestDraftRevisionId ?? "-"}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">历史版本回滚</p>
            {postDetails.revisions.map((revision) => (
              <form
                action="/api/admin/update-post"
                className="flex flex-wrap items-center gap-2"
                key={revision.revisionId}
                method="post"
                onSubmit={(event) => {
                  if (submitting) {
                    event.preventDefault();
                    return;
                  }
                  setSubmitting(true);
                }}
              >
                <input name="originalSlug" type="hidden" value={originalSlug} />
                <input name="action" type="hidden" value="rollback" />
                <input name="targetRevisionId" type="hidden" value={revision.revisionId} />
                <span className="text-xs ui-muted">{revision.revisionId} ({revision.status})</span>
                <button className="btn-secondary px-2 py-1 text-xs disabled:opacity-50" disabled={submitting} type="submit">
                  {submitting ? "处理中..." : "回滚并发布"}
                </button>
              </form>
            ))}
            <form
              action="/api/admin/update-post"
              className="pt-2"
              method="post"
              onSubmit={(event) => {
                if (submitting) {
                  event.preventDefault();
                  return;
                }
                setSubmitting(true);
              }}
            >
              <input name="originalSlug" type="hidden" value={originalSlug} />
              <input name="action" type="hidden" value="archive" />
              <button className="btn-secondary disabled:opacity-50" disabled={submitting} type="submit">
                {submitting ? "处理中..." : "归档"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
