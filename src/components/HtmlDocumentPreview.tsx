"use client";

import { useMemo, useState } from "react";
import { Code2, Eye } from "lucide-react";
import { useDocumentPreviewConfig } from "../context";
import { cn } from "../lib/cn";
import { stripActiveContent } from "../lib/sanitize";
import { CodeDocumentPreview } from "./CodeDocumentPreview";

/**
 * Renders HTML inside a strict empty-sandbox iframe (`sandbox=""`) after stripping active
 * content, with a toggle to inspect the syntax-highlighted HTML source.
 */
export function HtmlDocumentPreview({ text, title }: { text: string; title: string }) {
  const { t } = useDocumentPreviewConfig();
  const [mode, setMode] = useState<"rendered" | "source">("rendered");
  const safeDoc = useMemo(() => {
    const cleaned = stripActiveContent(text);
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;margin:1.25rem;line-height:1.6;color:#111827;background:#ffffff;}img{max-width:100%;height:auto;}</style></head><body>${cleaned}</body></html>`;
  }, [text]);

  return (
    <div className="flex h-full min-h-full flex-col bg-card">
      <div className="flex shrink-0 items-center justify-end border-b border-border/60 bg-surface-1 px-4 py-1.5 select-none">
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
        <div className="min-h-0 flex-1 overflow-auto">
          <CodeDocumentPreview value={text} extension="html" />
        </div>
      ) : (
        <iframe
          title={title}
          sandbox=""
          srcDoc={safeDoc}
          className="min-h-[420px] w-full flex-1 border-0 bg-white"
        />
      )}
    </div>
  );
}
