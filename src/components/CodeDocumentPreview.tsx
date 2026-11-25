"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrismGrammar, resolvePrismLanguage } from "../lib/code-language";

function formatCodeText(value: string, extension?: string | null) {
  const ext = String(extension || "").trim().replace(/^\./, "").toLowerCase();
  if (ext === "json") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return value;
}

export function CodeDocumentPreview({
  value,
  extension,
  showLineNumbers = true,
}: {
  value: string;
  extension?: string | null;
  showLineNumbers?: boolean;
}) {
  const formatted = useMemo(() => formatCodeText(value, extension), [extension, value]);
  const language = useMemo(() => resolvePrismLanguage(extension), [extension]);
  const lineCount = useMemo(() => formatted.split("\n").length, [formatted]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!language) {
      queueMicrotask(() => {
        if (!cancelled) setHighlighted(null);
      });
      return;
    }

    void loadPrismGrammar(language)
      .then((loaded) => {
        if (!loaded || cancelled) return;
        const html = loaded.Prism.highlight(formatted, loaded.grammar, language);
        if (!cancelled) setHighlighted(html);
      })
      .catch(() => {
        if (!cancelled) setHighlighted(null);
      });

    return () => {
      cancelled = true;
    };
  }, [formatted, language]);

  return (
    <div className="doc-code-preview min-h-full overflow-x-auto bg-card font-mono text-[13px] leading-6 text-foreground">
      <style>{CODE_PREVIEW_CSS}</style>
      <div className="flex min-w-max">
        {showLineNumbers ? (
          <div
            aria-hidden="true"
            className="sticky left-0 shrink-0 select-none border-r border-border/50 bg-card px-3 py-4 text-right text-xs leading-6 text-muted-foreground/70 tabular-nums"
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
        ) : null}
        {highlighted ? (
          <pre
            className="m-0 flex-1 whitespace-pre px-5 py-4 font-mono text-[13px] leading-6 text-foreground select-text"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <pre className="m-0 flex-1 whitespace-pre px-5 py-4 font-mono text-[13px] leading-6 text-foreground select-text">
            {formatted}
          </pre>
        )}
      </div>
    </div>
  );
}

const CODE_PREVIEW_CSS = `
.doc-code-preview .token.comment,
.doc-code-preview .token.prolog,
.doc-code-preview .token.doctype,
.doc-code-preview .token.cdata { color: #64748b; font-style: italic; }
.doc-code-preview .token.punctuation { color: #64748b; }
.doc-code-preview .token.property,
.doc-code-preview .token.tag,
.doc-code-preview .token.boolean,
.doc-code-preview .token.number,
.doc-code-preview .token.constant,
.doc-code-preview .token.symbol,
.doc-code-preview .token.deleted { color: #b91c1c; }
.doc-code-preview .token.selector,
.doc-code-preview .token.attr-name,
.doc-code-preview .token.string,
.doc-code-preview .token.char,
.doc-code-preview .token.builtin,
.doc-code-preview .token.inserted { color: #15803d; }
.doc-code-preview .token.operator,
.doc-code-preview .token.entity,
.doc-code-preview .token.url { color: #a16207; }
.doc-code-preview .token.atrule,
.doc-code-preview .token.attr-value,
.doc-code-preview .token.keyword { color: #1d4ed8; }
.doc-code-preview .token.function,
.doc-code-preview .token.class-name { color: #7e22ce; }
.doc-code-preview .token.regex,
.doc-code-preview .token.important,
.doc-code-preview .token.variable { color: #c2410c; }
.doc-code-preview .token.bold { font-weight: 600; }
.doc-code-preview .token.italic { font-style: italic; }

@media (prefers-color-scheme: dark) {
  .doc-code-preview .token.comment,
  .doc-code-preview .token.prolog,
  .doc-code-preview .token.doctype,
  .doc-code-preview .token.cdata { color: #94a3b8; }
  .doc-code-preview .token.punctuation { color: #94a3b8; }
  .doc-code-preview .token.property,
  .doc-code-preview .token.tag,
  .doc-code-preview .token.boolean,
  .doc-code-preview .token.number,
  .doc-code-preview .token.constant,
  .doc-code-preview .token.symbol,
  .doc-code-preview .token.deleted { color: #fca5a5; }
  .doc-code-preview .token.selector,
  .doc-code-preview .token.attr-name,
  .doc-code-preview .token.string,
  .doc-code-preview .token.char,
  .doc-code-preview .token.builtin,
  .doc-code-preview .token.inserted { color: #86efac; }
  .doc-code-preview .token.operator,
  .doc-code-preview .token.entity,
  .doc-code-preview .token.url { color: #fcd34d; }
  .doc-code-preview .token.atrule,
  .doc-code-preview .token.attr-value,
  .doc-code-preview .token.keyword { color: #93c5fd; }
  .doc-code-preview .token.function,
  .doc-code-preview .token.class-name { color: #d8b4fe; }
  .doc-code-preview .token.regex,
  .doc-code-preview .token.important,
  .doc-code-preview .token.variable { color: #fdba74; }
}

.dark .doc-code-preview .token.comment,
.dark .doc-code-preview .token.prolog,
.dark .doc-code-preview .token.doctype,
.dark .doc-code-preview .token.cdata { color: #94a3b8; }
.dark .doc-code-preview .token.punctuation { color: #94a3b8; }
.dark .doc-code-preview .token.property,
.dark .doc-code-preview .token.tag,
.dark .doc-code-preview .token.boolean,
.dark .doc-code-preview .token.number,
.dark .doc-code-preview .token.constant,
.dark .doc-code-preview .token.symbol,
.dark .doc-code-preview .token.deleted { color: #fca5a5; }
.dark .doc-code-preview .token.selector,
.dark .doc-code-preview .token.attr-name,
.dark .doc-code-preview .token.string,
.dark .doc-code-preview .token.char,
.dark .doc-code-preview .token.builtin,
.dark .doc-code-preview .token.inserted { color: #86efac; }
.dark .doc-code-preview .token.operator,
.dark .doc-code-preview .token.entity,
.dark .doc-code-preview .token.url { color: #fcd34d; }
.dark .doc-code-preview .token.atrule,
.dark .doc-code-preview .token.attr-value,
.dark .doc-code-preview .token.keyword { color: #93c5fd; }
.dark .doc-code-preview .token.function,
.dark .doc-code-preview .token.class-name { color: #d8b4fe; }
.dark .doc-code-preview .token.regex,
.dark .doc-code-preview .token.important,
.dark .doc-code-preview .token.variable { color: #fdba74; }
`;
