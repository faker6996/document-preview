"use client";

import { useEffect, useState } from "react";
import { Code2, Eye, Loader2 } from "lucide-react";
import { useDocumentPreviewConfig } from "../context";
import { cn } from "../lib/cn";
import { stripActiveContent } from "../lib/sanitize";
import { CodeDocumentPreview } from "./CodeDocumentPreview";

function decorateMarkdownHtml(html: string): string {
  if (!html || typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}

export function MarkdownPreview({ text }: { text: string }) {
  const { t } = useDocumentPreviewConfig();
  const [mode, setMode] = useState<"rendered" | "source">("rendered");
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("marked")
      .then(({ marked }) => {
        if (cancelled) return;
        const parsed = marked.parse(text, { gfm: true, async: false });
        const safeHtml = decorateMarkdownHtml(stripActiveContent(typeof parsed === "string" ? parsed : ""));
        if (!cancelled) setHtml(safeHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml("");
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className="flex min-h-full flex-col bg-card">
      <div className="sticky top-0 z-10 flex items-center justify-end border-b border-border/60 bg-surface-1/95 px-4 py-1.5 backdrop-blur-xs select-none">
        <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("rendered")}
            aria-pressed={mode === "rendered"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium transition-colors",
              mode === "rendered" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="size-3.5" />
            {t("renderedView")}
          </button>
          <button
            type="button"
            onClick={() => setMode("source")}
            aria-pressed={mode === "source"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-medium transition-colors",
              mode === "source" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Code2 className="size-3.5" />
            {t("sourceView")}
          </button>
        </div>
      </div>

      {mode === "source" ? (
        <div className="flex-1">
          <CodeDocumentPreview value={text} extension="md" />
        </div>
      ) : html === null ? (
        <div className="flex flex-1 items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          {t("loading")}
        </div>
      ) : (
        <article className="doc-markdown mx-auto w-full max-w-3xl px-6 py-7 text-sm leading-7 text-foreground select-text">
          <style>{MARKDOWN_CSS}</style>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      )}
    </div>
  );
}

const MARKDOWN_CSS = `
.doc-markdown h1, .doc-markdown h2, .doc-markdown h3, .doc-markdown h4, .doc-markdown h5, .doc-markdown h6 {
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.5em;
  margin-bottom: 0.6em;
}
.doc-markdown h1 { font-size: 1.75rem; padding-bottom: 0.35em; border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); }
.doc-markdown h2 { font-size: 1.35rem; padding-bottom: 0.25em; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.doc-markdown h3 { font-size: 1.125rem; }
.doc-markdown h4 { font-size: 1rem; }
.doc-markdown :first-child { margin-top: 0; }
.doc-markdown p { margin: 0.75em 0; }
.doc-markdown ul, .doc-markdown ol { margin: 0.75em 0; padding-left: 1.6em; }
.doc-markdown ul { list-style-type: disc; }
.doc-markdown ol { list-style-type: decimal; }
.doc-markdown li { margin: 0.25em 0; }
.doc-markdown blockquote {
  margin: 1em 0;
  padding: 0.25em 1em;
  border-left: 3px solid color-mix(in srgb, currentColor 25%, transparent);
  opacity: 0.85;
}
.doc-markdown code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  padding: 0.15em 0.35em;
  border-radius: 0.25rem;
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.doc-markdown pre {
  margin: 1em 0;
  padding: 0.9rem 1.1rem;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: color-mix(in srgb, currentColor 6%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
.doc-markdown pre code { background: transparent; padding: 0; font-size: 0.82rem; line-height: 1.6; }
.doc-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.875rem;
  display: block;
  overflow-x: auto;
}
.doc-markdown th, .doc-markdown td {
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  padding: 0.45rem 0.75rem;
  text-align: left;
}
.doc-markdown th {
  font-weight: 600;
  background: color-mix(in srgb, currentColor 6%, transparent);
}
.doc-markdown hr {
  border: 0;
  border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  margin: 1.5em 0;
}
.doc-markdown a { text-decoration: underline; text-underline-offset: 2px; }
.doc-markdown img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.75em 0; }
.doc-markdown input[type="checkbox"] { margin-right: 0.45em; pointer-events: none; }
`;
