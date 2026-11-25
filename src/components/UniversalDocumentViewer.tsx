"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, Download, FileText, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import Papa from "papaparse";
import { useDocumentPreviewConfig } from "../context";
import { formatFileSize } from "../lib/archive-utils";
import {
  type DocumentViewerKind,
  getDocumentPreviewFrame,
  resolveDocumentExtension,
  resolveDocumentViewerKind,
} from "../lib/document-kind";
import { ArchivePreview } from "./ArchivePreview";
import { CodeDocumentPreview } from "./CodeDocumentPreview";
import { ExcelSpreadsheetPreview } from "./ExcelSpreadsheetPreview";
import { HtmlDocumentPreview } from "./HtmlDocumentPreview";
import { IconButton } from "./IconButton";
import { MarkdownPreview } from "./MarkdownPreview";
import { AudioPreview, ImagePreview, VideoPreview } from "./MediaPreview";
import { PdfDocumentPreview } from "./PdfDocumentPreview";
import { PowerPointSlidePreview } from "./PowerPointSlidePreview";

type ViewerKind = DocumentViewerKind;
type TableCell = string | number | boolean | null | undefined;
type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; httpStatus?: number }
  | { status: "ready"; buffer: ArrayBuffer; text: string };
type CopyFeedback = { url: string; status: "copied" | "error" } | null;

const INTERACTIVE_ELEMENT_SELECTOR = "a, button, input, select, textarea, [contenteditable='true']";
const INLINE_URL_RE = /^(?:blob|data):/i;

function isCopyableViewerKind(kind: ViewerKind): boolean {
  return (
    kind === "text" ||
    kind === "xml" ||
    kind === "json" ||
    kind === "csv" ||
    kind === "code" ||
    kind === "markdown" ||
    kind === "html"
  );
}

function isDirectMediaKind(kind: ViewerKind): boolean {
  return kind === "image" || kind === "video" || kind === "audio";
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_ELEMENT_SELECTOR));
}

function decodeText(buffer: ArrayBuffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function getDownloadUrl(url: string) {
  if (INLINE_URL_RE.test(url)) return url;
  return url.includes("?") ? `${url}&download=true` : `${url}?download=true`;
}

function DataGrid({ rows, emptyMessage }: { rows: TableCell[][]; emptyMessage: string }) {
  if (rows.length === 0) return <div className="p-6 text-sm text-muted-foreground">{emptyMessage}</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? "sticky top-0 z-10 bg-muted/95 font-medium backdrop-blur-xs" : "bg-card"}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="max-w-80 border-b border-r border-border/60 px-3 py-2 align-top text-foreground">
                  <span className="block whitespace-pre-wrap wrap-break-word">{cell == null ? "" : String(cell)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvPreview({ text, emptyMessage }: { text: string; emptyMessage: string }) {
  const rows = useMemo(() => Papa.parse<TableCell[]>(text, { skipEmptyLines: false }).data, [text]);
  return <DataGrid rows={rows} emptyMessage={emptyMessage} />;
}

function DocxPreview({ buffer, errorMessage }: { buffer: ArrayBuffer; errorMessage: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    void import("docx-preview")
      .then(({ renderAsync }) => {
        if (cancelled) return;
        return renderAsync(buffer, host, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
        });
      })
      .catch(() => {
        if (!cancelled) setError(errorMessage);
      });
    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [buffer, errorMessage]);

  return error ? (
    <ViewerMessage message={error} error />
  ) : (
    <div
      ref={hostRef}
      className="min-h-full bg-card px-4 py-6 [&_.docx-wrapper]:bg-card [&_.docx-wrapper]:overflow-visible! [&_.docx-wrapper]:h-auto! [&_.docx-wrapper>section]:mx-auto"
    />
  );
}

export function UniversalDocumentViewer({
  fileUrl,
  fileName,
  fileExt,
  contentType,
  sizeBytes,
  title,
  embedded = false,
  seamless = false,
  showHeader = true,
  fillParent = false,
  presentation = "inline",
  onClose,
}: {
  fileUrl?: string | null;
  fileName: string;
  fileExt?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  title?: string;
  embedded?: boolean;
  seamless?: boolean;
  showHeader?: boolean;
  fillParent?: boolean;
  /** "dialog": size the viewport per document kind (see getDocumentPreviewFrame). Inline usages keep their fixed heights. */
  presentation?: "inline" | "dialog";
  onClose?: () => void;
}) {
  const { t, fetcher, resolveUrl } = useDocumentPreviewConfig();
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);

  const resolvedUrl = useMemo(() => {
    if (!fileUrl) return "";
    if (INLINE_URL_RE.test(fileUrl)) return fileUrl;
    return resolveUrl(fileUrl) || fileUrl;
  }, [fileUrl, resolveUrl]);
  const extension = useMemo(() => resolveDocumentExtension(fileName, fileExt, contentType), [contentType, fileExt, fileName]);
  const kind = useMemo(() => resolveDocumentViewerKind(extension, contentType), [contentType, extension]);
  const canCopyContent = loadState.status === "ready" && isCopyableViewerKind(kind);
  const copyStatus = copyFeedback?.url === resolvedUrl ? copyFeedback.status : "idle";
  const viewportStyle = useMemo((): CSSProperties | undefined => {
    if (isFullscreen) return { height: "100dvh", minHeight: "100dvh" };
    if (presentation === "dialog") {
      const { viewportHeight } = getDocumentPreviewFrame(kind);
      return viewportHeight ? { height: viewportHeight } : undefined;
    }
    if (embedded) return { height: "min(58vh, 700px)", minHeight: "460px" };
    return { height: "78vh", minHeight: "680px" };
  }, [embedded, isFullscreen, kind, presentation]);

  useEffect(() => {
    if (!resolvedUrl || kind === "unsupported" || kind === "legacy" || isDirectMediaKind(kind)) {
      queueMicrotask(() => setLoadState({ status: "idle" }));
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadState({ status: "loading" });
      try {
        const response = INLINE_URL_RE.test(resolvedUrl)
          ? await fetch(resolvedUrl)
          : await fetcher(resolvedUrl, { method: "GET" });
        if (!response.ok) {
          if (!cancelled) setLoadState({ status: "error", httpStatus: response.status });
          return;
        }
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        setLoadState({ status: "ready", buffer, text: decodeText(buffer) });
      } catch {
        if (!cancelled) setLoadState({ status: "error" });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetcher, kind, resolvedUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const showCopyFeedback = (status: NonNullable<CopyFeedback>["status"]) => {
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    setCopyFeedback({ url: resolvedUrl, status });
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimerRef.current = null;
    }, 2000);
  };

  const handleCopy = async () => {
    if (loadState.status !== "ready" || !isCopyableViewerKind(kind)) return;

    try {
      await navigator.clipboard.writeText(loadState.text);
      showCopyFeedback("copied");
    } catch {
      showCopyFeedback("error");
    }
  };

  const handleSelectableContentPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;
    event.currentTarget.focus({ preventScroll: true });
  };

  const handleSelectableContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target) || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return;

    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
    else await frameRef.current?.requestFullscreen();
  };

  const canRender = loadState.status === "ready";
  const headerLabel =
    kind === "unsupported" || kind === "legacy" || kind === "code" || kind === "archive"
      ? extension.toUpperCase() || t("preview")
      : kind.toUpperCase();
  const formattedSize = formatFileSize(sizeBytes);
  const copyLabel =
    copyStatus === "copied" ? t("copied") : copyStatus === "error" ? t("copyFailed") : t("copyContent");
  const copyIcon =
    copyStatus === "copied" ? (
      <Check className="size-4 text-success" />
    ) : copyStatus === "error" ? (
      <AlertCircle className="size-4 text-destructive" />
    ) : (
      <Copy className="size-4" />
    );

  return (
    <div
      ref={frameRef}
      className={[
        "relative group/viewer",
        seamless ? "overflow-hidden bg-card" : "overflow-hidden rounded-lg border border-border/60 bg-card",
        fillParent ? "flex flex-col flex-1 min-h-0 w-full" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="sr-only" aria-live="polite">
        {copyStatus === "idle" ? "" : copyLabel}
      </span>

      {canCopyContent && !showHeader ? (
        <div className="absolute right-4 top-4 z-50 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/viewer:opacity-100 focus-within:opacity-100">
          <IconButton
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-lg border-border bg-background/90 shadow-md transition-transform hover:bg-background active:scale-95"
            onClick={() => void handleCopy()}
            title={copyLabel}
            aria-label={copyLabel}
          >
            {copyIcon}
          </IconButton>
        </div>
      ) : null}

      {showHeader ? (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-2 select-none">
          <div className="flex w-0 min-w-0 flex-1 items-baseline gap-2">
            <div className="truncate text-sm font-semibold text-foreground" title={title || fileName}>
              {title || fileName}
            </div>
            <div className="shrink-0 text-xs uppercase text-muted-foreground">
              {headerLabel}
              {formattedSize ? ` · ${formattedSize}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCopyContent ? (
              <IconButton
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => void handleCopy()}
                title={copyLabel}
                aria-label={copyLabel}
              >
                {copyIcon}
              </IconButton>
            ) : null}
            {resolvedUrl ? (
              <a
                href={getDownloadUrl(resolvedUrl)}
                download={fileName || true}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t("download")}
                title={t("download")}
              >
                <Download className="size-4" />
              </a>
            ) : null}
            <IconButton
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </IconButton>
            {onClose ? (
              <IconButton size="icon" variant="ghost" className="size-8" onClick={onClose} aria-label={t("close")} title={t("close")}>
                <X className="size-4" />
              </IconButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={["relative overflow-auto bg-card thin-scrollbar", fillParent ? "flex-1 min-h-0" : ""].filter(Boolean).join(" ")}
        style={fillParent ? undefined : viewportStyle}
      >
        {!resolvedUrl ? (
          <ViewerMessage message={t("fileUrlUnavailable")} error />
        ) : kind === "legacy" || kind === "unsupported" ? (
          <ViewerMessage
            message={t(kind === "legacy" ? "legacyUnsupported" : "unsupported")}
            action={
              <a
                href={getDownloadUrl(resolvedUrl)}
                download={fileName || true}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="size-4" />
                {t("download")}
              </a>
            }
          />
        ) : kind === "image" ? (
          // Media files are not prefetched (loadState stays "idle"): browser elements load/stream the URL directly.
          <ImagePreview
            key={resolvedUrl}
            url={resolvedUrl}
            alt={fileName || "Image"}
            errorMessage={t("renderFailed")}
            loadingMessage={t("loading")}
            fit={isFullscreen ? "fullscreen" : presentation === "dialog" ? "dialog" : "inline"}
          />
        ) : kind === "video" ? (
          <VideoPreview
            key={resolvedUrl}
            url={resolvedUrl}
            errorMessage={t("mediaPlaybackFailed")}
            loadingMessage={t("loading")}
          />
        ) : kind === "audio" ? (
          <AudioPreview
            key={resolvedUrl}
            url={resolvedUrl}
            fileName={title || fileName}
            sizeBytes={sizeBytes}
            errorMessage={t("mediaPlaybackFailed")}
          />
        ) : loadState.status === "loading" || loadState.status === "idle" ? (
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-card/80 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            {t("loading")}
          </div>
        ) : loadState.status === "error" ? (
          <ViewerMessage
            message={loadState.httpStatus ? t("loadFailed", { status: loadState.httpStatus }) : t("renderFailed")}
            error
          />
        ) : canRender && kind === "pdf" ? (
          <PdfDocumentPreview key={resolvedUrl} buffer={loadState.buffer} fileName={fileName} />
        ) : (
          <div
            className="h-full w-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            tabIndex={0}
            aria-label={title || fileName}
            onPointerDown={handleSelectableContentPointerDown}
            onKeyDown={handleSelectableContentKeyDown}
          >
            {canRender && kind === "docx" ? (
              <DocxPreview key={resolvedUrl} buffer={loadState.buffer} errorMessage={t("renderFailed")} />
            ) : canRender && kind === "xlsx" ? (
              <ExcelSpreadsheetPreview
                key={resolvedUrl}
                buffer={loadState.buffer}
                fileName={fileName}
                errorMessage={t("spreadsheetUnavailable")}
                isFullscreen={isFullscreen}
                // In a dialog the viewport already has the right height for the kind; fill it instead of the fixed 600px.
                fillParent={fillParent || presentation === "dialog"}
              />
            ) : canRender && kind === "csv" ? (
              <CsvPreview text={loadState.text} emptyMessage={t("noRows")} />
            ) : canRender && kind === "pptx" ? (
              <PowerPointSlidePreview key={resolvedUrl} buffer={loadState.buffer} errorMessage={t("renderFailed")} />
            ) : canRender && kind === "markdown" ? (
              <MarkdownPreview key={resolvedUrl} text={loadState.text} />
            ) : canRender && kind === "html" ? (
              <HtmlDocumentPreview key={resolvedUrl} text={loadState.text} title={title || fileName} />
            ) : canRender && kind === "archive" ? (
              <ArchivePreview
                key={resolvedUrl}
                buffer={loadState.buffer}
                errorMessage={t("renderFailed")}
                renderEntryPreview={(entry) => (
                  <UniversalDocumentViewer
                    key={entry.url}
                    fileUrl={entry.url}
                    fileName={entry.name}
                    sizeBytes={entry.sizeBytes}
                    showHeader={false}
                    fillParent
                    seamless
                  />
                )}
              />
            ) : canRender && kind === "text" ? (
              <pre className="min-h-full whitespace-pre-wrap p-5 font-mono text-sm leading-relaxed text-foreground select-text">
                {loadState.text}
              </pre>
            ) : canRender && (kind === "code" || kind === "xml" || kind === "json") ? (
              <CodeDocumentPreview
                key={`${kind}:${extension}:${resolvedUrl}`}
                value={loadState.text}
                extension={extension || kind}
              />
            ) : (
              <ViewerMessage message={t("unavailable")} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewerMessage({ message, error = false, action }: { message: string; error?: boolean; action?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {error ? <AlertCircle className="size-6" /> : <FileText className="size-6" />}
      </div>
      <div className="max-w-xl text-sm text-muted-foreground">{message}</div>
      {action}
    </div>
  );
}
