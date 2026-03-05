"use client";

import { Fragment, type ReactNode } from "react";

const UNSAFE_PREVIEW_PATTERNS = [
  /<\s*script\b/i,
  /\bon[a-z]+\s*=/i,
  /\bjavascript:/i
];

function sanitizeHref(rawHref: string): string | null {
  const value = rawHref.trim();
  if (!value) return null;
  const lowered = value.toLowerCase();
  if (lowered.startsWith("javascript:")) return null;
  if (lowered.startsWith("data:")) return null;
  return value;
}

export function hasUnsafePreviewInput(markdown: string): boolean {
  return UNSAFE_PREVIEW_PATTERNS.some((pattern) => pattern.test(markdown));
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokenRe = /(\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs" key={`${match.index}-code`}>
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const safeHref = sanitizeHref(linkMatch[2]);
        if (!safeHref) {
          parts.push(linkMatch[1]);
          last = match.index + token.length;
          continue;
        }
        parts.push(
          <a className="underline" href={safeHref} key={`${match.index}-link`} rel="noreferrer" target="_blank">
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

export function renderMarkdownPreview(markdown: string): ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i >= lines.length) {
        throw new Error("Unclosed code block");
      }
      nodes.push(
        <pre className="overflow-x-auto rounded border p-3 text-xs" key={`code-${i}`}>
          {language ? <div className="mb-2 text-[11px] ui-muted">{language}</div> : null}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      nodes.push(<hr className="my-4 border-[color:var(--border)]" key={`hr-${i}`} />);
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      const className = level === 1 ? "text-xl font-bold" : level === 2 ? "text-lg font-semibold" : "text-base font-semibold";
      nodes.push(
        <p className={className} key={`h-${i}`}>
          {content}
        </p>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      nodes.push(
        <blockquote className="border-l-4 border-[color:var(--border)] pl-3 text-sm ui-muted" key={`q-${i}`}>
          {quoteLines.map((quoteLine, index) => (
            <Fragment key={`q-line-${index}`}>{index > 0 ? <br /> : null}{renderInline(quoteLine)}</Fragment>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ul className="list-disc space-y-1 pl-5" key={`ul-${i}`}>
          {items.map((item, index) => (
            <li key={`li-${index}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ol className="list-decimal space-y-1 pl-5" key={`ol-${i}`}>
          {items.map((item, index) => (
            <li key={`oli-${index}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      const currentTrimmed = current.trim();
      if (
        !currentTrimmed ||
        currentTrimmed.startsWith("```") ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(currentTrimmed) ||
        /^(#{1,6})\s+/.test(currentTrimmed) ||
        currentTrimmed.startsWith(">") ||
        /^[-*+]\s+/.test(currentTrimmed) ||
        /^\d+\.\s+/.test(currentTrimmed)
      ) {
        break;
      }
      paragraph.push(currentTrimmed);
      i += 1;
    }

    nodes.push(
      <p className="leading-7" key={`p-${i}`}>
        {renderInline(paragraph.join(" "))}
      </p>
    );
  }

  return <div className="space-y-3 text-sm">{nodes}</div>;
}
