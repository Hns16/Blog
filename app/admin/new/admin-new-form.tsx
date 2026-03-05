"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countNonWhitespaceChars,
  estimateReadingMinutes,
  getWriteErrorMessage,
  toSlug
} from "@/src/lib/admin-write-shared";
import { hasUnsafePreviewInput, renderMarkdownPreview } from "./markdown-preview";

const DRAFT_KEY = "admin_new_post_draft_v1";
const CLEAR_EVENT = "admin-new-clear-draft";
const AUTOSAVE_DELAY_MS = 500;

type Draft = {
  title: string;
  description: string;
  slug: string;
  date: string;
  tags: string;
  content: string;
};

type SaveState = "saved" | "unsaved";

type AdminNewFormProps = {
  defaultDate: string;
  clearOnSuccess: boolean;
};

function emptyDraft(date = ""): Draft {
  return { title: "", description: "", slug: "", date, tags: "", content: "" };
}

function normalizeDraft(value: Draft): string {
  return JSON.stringify(value);
}

function buildMdxTemplate(title: string): string {
  const heading = title.trim() || "文章标题";
  return [
    `# ${heading}`,
    "",
    "这里写开场介绍。",
    "",
    "## 小节标题",
    "",
    "- 要点一",
    "- 要点二",
    "",
    "```ts",
    "// 示例代码",
    "export function demo() {",
    "  return \"hello\";",
    "}",
    "```",
    "",
    "> 这里是一段引用说明。",
    "",
    "---",
    "",
    "## 结尾",
    "",
    "总结与下一步。"
  ].join("\n");
}

export default function AdminNewForm({ defaultDate, clearOnSuccess }: AdminNewFormProps) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultDate));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [checkResult, setCheckResult] = useState<{ ok: boolean; code: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [action, setAction] = useState<"save_draft" | "publish" | "schedule">("publish");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadedRef = useRef(false);
  const slugManuallyEditedRef = useRef(false);
  const slugAutoFilledRef = useRef(false);
  const lastSavedRef = useRef(normalizeDraft(emptyDraft(defaultDate)));

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      const initial = emptyDraft(defaultDate);
      lastSavedRef.current = normalizeDraft(initial);
      loadedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      const nextDraft: Draft = {
        title: typeof parsed.title === "string" ? parsed.title : "",
        description: typeof parsed.description === "string" ? parsed.description : "",
        slug: typeof parsed.slug === "string" ? parsed.slug : "",
        date: typeof parsed.date === "string" && parsed.date ? parsed.date : defaultDate,
        tags: typeof parsed.tags === "string" ? parsed.tags : "",
        content: typeof parsed.content === "string" ? parsed.content : ""
      };
      if (nextDraft.slug.trim()) {
        slugAutoFilledRef.current = true;
      }
      setDraft(nextDraft);
      lastSavedRef.current = normalizeDraft(nextDraft);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
      const fallback = emptyDraft(defaultDate);
      lastSavedRef.current = normalizeDraft(fallback);
    }

    loadedRef.current = true;
  }, [defaultDate]);

  useEffect(() => {
    if (!clearOnSuccess) return;

    const reset = emptyDraft(defaultDate);
    window.localStorage.removeItem(DRAFT_KEY);
    setDraft(reset);
    setSaveState("saved");
    slugManuallyEditedRef.current = false;
    slugAutoFilledRef.current = false;
    lastSavedRef.current = normalizeDraft(reset);
    window.history.replaceState(null, "", "/admin/new");
  }, [clearOnSuccess, defaultDate]);

  useEffect(() => {
    if (!loadedRef.current) return;

    const normalized = normalizeDraft(draft);
    if (normalized === lastSavedRef.current) {
      setSaveState("saved");
      return;
    }

    setSaveState("unsaved");
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, normalized);
      lastSavedRef.current = normalized;
      setSaveState("saved");
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    function handleClearEvent() {
      const reset = emptyDraft(defaultDate);
      window.localStorage.removeItem(DRAFT_KEY);
      setDraft(reset);
      setSaveState("saved");
      slugManuallyEditedRef.current = false;
      slugAutoFilledRef.current = false;
      lastSavedRef.current = normalizeDraft(reset);
    }

    window.addEventListener(CLEAR_EVENT, handleClearEvent);
    return () => window.removeEventListener(CLEAR_EVENT, handleClearEvent);
  }, [defaultDate]);

  useEffect(() => {
    if (saveState !== "unsaved") return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  function onTitleChange(value: string) {
    setDraft((prev) => {
      const next: Draft = { ...prev, title: value };
      const generatedSlug = toSlug(value);
      if (!slugManuallyEditedRef.current && !slugAutoFilledRef.current && !prev.slug && generatedSlug) {
        next.slug = generatedSlug;
        slugAutoFilledRef.current = true;
      }
      return next;
    });
  }

  function onChange(field: keyof Draft, value: string) {
    if (field === "title") {
      onTitleChange(value);
      return;
    }
    if (field === "slug") {
      slugManuallyEditedRef.current = true;
    }
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function insertTemplate() {
    setDraft((prev) => {
      const template = buildMdxTemplate(prev.title);
      const content = prev.content.trim() ? `${prev.content.trimEnd()}\n\n${template}` : template;
      return { ...prev, content };
    });
  }

  const nonWhitespaceChars = useMemo(() => countNonWhitespaceChars(draft.content), [draft.content]);
  const readingMinutes = useMemo(() => estimateReadingMinutes(draft.content), [draft.content]);
  const unsafePreview = useMemo(() => hasUnsafePreviewInput(draft.content), [draft.content]);

  const preview = useMemo(() => {
    try {
      return { ok: true as const, node: renderMarkdownPreview(draft.content) };
    } catch {
      return { ok: false as const, node: null };
    }
  }, [draft.content]);

  async function runPrecheck() {
    if (checking) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const response = await fetch("/api/admin/write-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          action,
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
    <form
      action="/api/write"
      className="space-y-4 p-4 sm:p-5"
      method="post"
      onSubmit={(event) => {
        if (submitting) {
          event.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs ui-muted">
        <span>草稿状态：{saveState === "saved" ? "已保存草稿" : "未保存变更"}</span>
        <span>正文字符数：{nonWhitespaceChars}</span>
        <span>预估阅读：约 {readingMinutes} 分钟</span>
        <button className="btn-secondary px-3 py-1 text-xs" disabled={checking} onClick={runPrecheck} type="button">
          {checking ? "检查中..." : "发布前检查"}
        </button>
      </div>
      {checkResult?.ok && <p className="notice-success">发布前检查通过。</p>}
      {!checkResult?.ok && checkResult?.code && <p className="notice-error">{getWriteErrorMessage(checkResult.code)}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-1">
            <label className="form-label" htmlFor="title">标题</label>
            <input className="form-input" id="title" name="title" onChange={(e) => onChange("title", e.target.value)} required type="text" value={draft.title} />
          </div>

          <div className="space-y-1">
            <label className="form-label" htmlFor="description">描述</label>
            <input className="form-input" id="description" name="description" onChange={(e) => onChange("description", e.target.value)} required type="text" value={draft.description} />
          </div>

          <div className="space-y-1">
            <label className="form-label" htmlFor="slug">Slug（可选）</label>
            <input className="form-input" id="slug" name="slug" onChange={(e) => onChange("slug", e.target.value)} pattern="[a-z0-9-]*" placeholder="my-first-post" type="text" value={draft.slug} />
          </div>

          <div className="space-y-1">
            <label className="form-label" htmlFor="date">日期</label>
            <input className="form-input" id="date" name="date" onChange={(e) => onChange("date", e.target.value)} required type="date" value={draft.date} />
          </div>
          <div className="space-y-1">
            <label className="form-label" htmlFor="scheduledAt">计划发布时间</label>
            <input className="form-input" id="scheduledAt" name="scheduledAt" onChange={(e) => setScheduledAt(e.target.value)} type="datetime-local" value={scheduledAt} />
          </div>

          <div className="space-y-1">
            <label className="form-label" htmlFor="tags">标签（逗号分隔）</label>
            <input className="form-input" id="tags" name="tags" onChange={(e) => onChange("tags", e.target.value)} placeholder="nextjs,mdx" type="text" value={draft.tags} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="form-label" htmlFor="content">正文（Markdown/MDX）</label>
              <button className="btn-secondary px-3 py-1 text-xs" onClick={insertTemplate} type="button">插入 MDX 模板</button>
            </div>
            <textarea className="form-textarea min-h-64" id="content" name="content" onChange={(e) => onChange("content", e.target.value)} required value={draft.content} />
          </div>
        </section>

        <aside className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4">
          <h2 className="mb-3 text-sm font-semibold">实时预览</h2>
          {!draft.content.trim() && <p className="text-sm ui-muted">输入正文后将在这里预览。</p>}
          {draft.content.trim() && unsafePreview && <p className="notice-error">检测到疑似不安全内容，已停止预览渲染。</p>}
          {draft.content.trim() && !unsafePreview && preview.ok && preview.node}
          {draft.content.trim() && !unsafePreview && !preview.ok && <p className="notice-error">渲染失败</p>}
        </aside>
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
  );
}

export function AdminDraftClearButton() {
  function onClear() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CLEAR_EVENT));
    }
  }

  return (
    <button className="btn-secondary" onClick={onClear} type="button">
      清空草稿
    </button>
  );
}
