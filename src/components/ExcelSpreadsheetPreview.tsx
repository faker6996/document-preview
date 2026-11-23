"use client";

import "@js-preview/excel/lib/index.css";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useDocumentPreviewConfig } from "../context";
import { cellAddress, EXCEL_UI_FONT, themeCanvasFont } from "../lib/excel-sheet";

/**
 * Read-only .xlsx/.xls preview styled after Microsoft Excel (formula bar, grey headers,
 * green selection, sheet tabs). The grid is rendered by x-spreadsheet (via @js-preview/excel)
 * on a canvas with hard-coded colours, so the canvas palette is remapped on its 2D context;
 * the DOM parts (selection, tabs, scrollbars) are styled with CSS below.
 *
 * Colours are literal on purpose: this is the document "paper", always light like Excel,
 * independent of the app theme.
 */
const EXCEL = {
  accent: "#217346",
  accentSoft: "rgba(33, 115, 70, 0.08)",
  headerBg: "#f3f3f3",
  headerSelectedBg: "rgba(33, 115, 70, 0.16)",
  headerText: "#444444",
  gridLine: "#d9d9d9",
  chromeBg: "#f3f3f3",
  chromeBorder: "#d4d4d4",
  text: "#222222",
  mutedText: "#666666",
  paper: "#ffffff",
  scrollTrack: "#f3f3f3",
  scrollThumb: "#c2c2c2",
  scrollThumbHover: "#a6a6a6",
} as const;

// x-spreadsheet's built-in canvas colours → Excel.
const CANVAS_FILL_MAP = new Map<string, string>([
  ["#f4f5f8", EXCEL.headerBg],
  ["#585757", EXCEL.headerText],
  ["rgba(75, 137, 255, 0.08)", EXCEL.headerSelectedBg],
]);
const CANVAS_STROKE_MAP = new Map<string, string>([
  ["#e6e6e6", EXCEL.gridLine],
  ["#4b89ff", EXCEL.accent],
]);

const THEMED_CONTEXTS = new WeakSet<CanvasRenderingContext2D>();

/** Remap the colours/fonts x-spreadsheet assigns on this canvas context (instance-level, no global patch). */
function applyExcelCanvasTheme(host: HTMLElement) {
  const canvas = host.querySelector("canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx || THEMED_CONTEXTS.has(ctx)) return;

  const proto = CanvasRenderingContext2D.prototype;
  const remap = (property: "fillStyle" | "strokeStyle" | "font", transform: (value: string) => string) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, property);
    if (!descriptor?.set || !descriptor.get) return;
    Object.defineProperty(ctx, property, {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: unknown) {
        descriptor.set!.call(this, typeof value === "string" ? transform(value) : value);
      },
    });
  };

  remap("fillStyle", (value) => CANVAS_FILL_MAP.get(value) ?? value);
  remap("strokeStyle", (value) => CANVAS_STROKE_MAP.get(value) ?? value);
  remap("font", themeCanvasFont);
  THEMED_CONTEXTS.add(ctx);
}

type SelectedCell = { cell?: { text?: unknown } | null; rowIndex: number; columnIndex: number };
type Previewer = { preview(data: ArrayBuffer): Promise<void>; destroy(): void; reload?: () => void };

export function ExcelSpreadsheetPreview({
  buffer,
  fileName,
  errorMessage,
  isFullscreen = false,
  fillParent = false,
}: {
  buffer: ArrayBuffer;
  fileName?: string;
  errorMessage: string;
  isFullscreen?: boolean;
  fillParent?: boolean;
}) {
  const { t } = useDocumentPreviewConfig();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({ address: "A1", content: "" });
  const expand = isFullscreen || fillParent;

  useEffect(() => {
    let cancelled = false;
    let previewer: Previewer | null = null;
    let rafId = 0;

    // x-spreadsheet sizes its canvas off the host's current layout box, so
    // initializing before the container has settled (e.g. right after a modal
    // mount/animation) can hand it a zero-size box and throw intermittently.
    // Poll layout via rAF instead of a fixed delay, bounded so it can't hang.
    const waitForLayout = (host: HTMLDivElement) =>
      new Promise<void>((resolve) => {
        let attempts = 0;
        const check = () => {
          if (cancelled || (host.clientWidth > 0 && host.clientHeight > 0) || attempts >= 30) {
            resolve();
            return;
          }
          attempts += 1;
          rafId = window.requestAnimationFrame(check);
        };
        check();
      });

    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
      setSelection({ address: "A1", content: "" });
    });

    void waitForLayout(host)
      .then(() => import("@js-preview/excel"))
      .then(async ({ default: jsPreviewExcel }) => {
        if (cancelled || !hostRef.current) return;
        const isXls = Boolean(fileName?.toLowerCase().endsWith(".xls"));
        previewer = jsPreviewExcel.init(hostRef.current, {
          xls: isXls,
          minColLength: 30,
          minRowLength: 100,
          showContextmenu: false,
          cellSelected: ({ cell, rowIndex, columnIndex }: SelectedCell) => {
            const text = cell?.text;
            setSelection({
              address: cellAddress(rowIndex, columnIndex),
              content: text === undefined || text === null ? "" : String(text),
            });
          },
        } as unknown as Parameters<typeof jsPreviewExcel.init>[1]) as unknown as Previewer;
        // The canvas exists right after init; theme it before the workbook is drawn.
        applyExcelCanvasTheme(hostRef.current);
        const previewBuffer = isXls ? buffer : await (await import("../lib/spreadsheet-preview")).prepareSpreadsheetPreview(buffer);
        if (cancelled) return;
        await previewer.preview(previewBuffer);
        if (!cancelled) {
          setLoading(false);
          // x-spreadsheet sizes its internal layout (grid + sheet-tab footer) off
          // the host's height at this exact moment. In fill-parent hosts the flex
          // box can still be a frame or two away from its final size, leaving a
          // gap below the footer. Re-dispatch resize on the next two frames.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!cancelled) window.dispatchEvent(new Event("resize"));
            });
          });
        }
      })
      .catch((err) => {
        console.error("Failed to render Excel preview:", err);
        if (!cancelled) {
          setError(errorMessage);
          setLoading(false);
        }
      });

    const handleResize = () => previewer?.reload?.();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(rafId);
      try {
        previewer?.destroy();
      } catch {}
      host.replaceChildren();
    };
  }, [buffer, fileName, errorMessage]);

  // Resize the canvas when toggling fullscreen.
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <AlertCircle className="size-6" />
        </div>
        <div className="max-w-xl text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  const cssVariables = {
    "--xl-accent": EXCEL.accent,
    "--xl-accent-soft": EXCEL.accentSoft,
    "--xl-chrome-bg": EXCEL.chromeBg,
    "--xl-chrome-border": EXCEL.chromeBorder,
    "--xl-text": EXCEL.text,
    "--xl-muted": EXCEL.mutedText,
    "--xl-paper": EXCEL.paper,
    "--xl-scroll-track": EXCEL.scrollTrack,
    "--xl-scroll-thumb": EXCEL.scrollThumb,
    "--xl-scroll-thumb-hover": EXCEL.scrollThumbHover,
    "--xl-ui-font": EXCEL_UI_FONT,
  } as CSSProperties;

  return (
    <div className={`excel-viewer relative flex w-full flex-col ${expand ? "h-full flex-1" : ""}`} style={cssVariables}>
      <style>{EXCEL_VIEWER_CSS}</style>

      {/* Formula bar: name box + fx + cell content (read-only). */}
      <div className="excel-formula-bar flex h-8 shrink-0 items-stretch">
        <div className="excel-name-box flex w-24 shrink-0 items-center px-2" aria-label={t("cellAddress")} title={t("cellAddress")}>
          {selection.address}
        </div>
        <div className="excel-fx flex w-10 shrink-0 items-center justify-center" aria-hidden="true">
          <span>fx</span>
        </div>
        <div className="excel-formula-content min-w-0 grow truncate px-2 leading-8 select-text" aria-label={t("cellContent")} title={selection.content}>
          {selection.content}
        </div>
      </div>

      <div className={`relative ${expand ? "min-h-0 flex-1" : ""}`}>
        {loading && (
          <div className="excel-loading absolute inset-0 z-60 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        <div ref={hostRef} className="w-full" style={expand ? { height: "100%" } : { height: 600, minHeight: 600 }} />
      </div>
    </div>
  );
}

const EXCEL_VIEWER_CSS = `
.excel-viewer {
  background: var(--xl-paper);
  color: var(--xl-text);
  font-family: var(--xl-ui-font);
}
.excel-viewer .excel-formula-bar {
  background: var(--xl-paper);
  border-bottom: 1px solid var(--xl-chrome-border);
  font-size: 13px;
}
.excel-viewer .excel-name-box {
  border-right: 1px solid var(--xl-chrome-border);
  color: var(--xl-text);
  font-variant-numeric: tabular-nums;
}
.excel-viewer .excel-fx {
  border-right: 1px solid var(--xl-chrome-border);
  color: var(--xl-muted);
  font-family: Cambria, Caladea, Georgia, serif;
  font-style: italic;
  font-size: 14px;
}
.excel-viewer .excel-formula-content { color: var(--xl-text); }
.excel-viewer .excel-loading { background: color-mix(in srgb, var(--xl-paper) 90%, transparent); color: var(--xl-muted); }

.excel-viewer .x-spreadsheet,
.excel-viewer .x-spreadsheet-sheet,
.excel-viewer .x-spreadsheet-table {
  background-color: var(--xl-paper) !important;
  color: var(--xl-text) !important;
  font-family: var(--xl-ui-font) !important;
}
.excel-viewer .x-spreadsheet { position: relative !important; }

/* Selection: Excel green border + soft fill, square fill handle. */
.excel-viewer .x-spreadsheet-selector .x-spreadsheet-selector-area {
  border: 2px solid var(--xl-accent) !important;
  background: var(--xl-accent-soft) !important;
}
.excel-viewer .x-spreadsheet-selector .x-spreadsheet-selector-corner {
  background: var(--xl-accent) !important;
  border: 1px solid var(--xl-paper) !important;
  width: 7px !important;
  height: 7px !important;
}
.excel-viewer .x-spreadsheet-selector .x-spreadsheet-selector-clipboard,
.excel-viewer .x-spreadsheet-selector .x-spreadsheet-selector-autofill {
  border-color: var(--xl-accent) !important;
}

/* Sheet tabs. Kept in normal flow: x-spreadsheet reserves their height below the grid,
   so taking them out of flow leaves an empty strip under the tabs. */
.excel-viewer .x-spreadsheet-bottombar {
  height: 40px !important;
  line-height: 40px !important;
  padding: 0 0 0 8px !important;
  background-color: var(--xl-chrome-bg) !important;
  border-top: 1px solid var(--xl-chrome-border) !important;
  color: var(--xl-text) !important;
  z-index: 40 !important;
}
.excel-viewer .x-spreadsheet-menu > li {
  height: 39px !important;
  line-height: 39px !important;
  padding: 0 16px !important;
  margin: 0 !important;
  border-right: 1px solid var(--xl-chrome-border) !important;
  color: var(--xl-text) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  background: transparent !important;
  border-bottom: 0 !important;
}
.excel-viewer .x-spreadsheet-menu > li:hover {
  background: color-mix(in srgb, var(--xl-chrome-border) 45%, transparent) !important;
}
.excel-viewer .x-spreadsheet-menu > li.active {
  background: var(--xl-paper) !important;
  color: var(--xl-accent) !important;
  font-weight: 600 !important;
  box-shadow: inset 0 -3px 0 var(--xl-accent) !important;
}

/* Scrollbars: thin grey like Excel, always visible. */
.excel-viewer .x-spreadsheet-scrollbar {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  z-index: 50 !important;
  background-color: var(--xl-scroll-track) !important;
  scrollbar-width: thin !important;
  scrollbar-color: var(--xl-scroll-thumb) var(--xl-scroll-track) !important;
}
.excel-viewer .x-spreadsheet-scrollbar.horizontal { height: 14px !important; }
.excel-viewer .x-spreadsheet-scrollbar.vertical { right: 0 !important; width: 14px !important; }
.excel-viewer .x-spreadsheet-scrollbar::-webkit-scrollbar { width: 10px !important; height: 10px !important; display: block !important; }
.excel-viewer .x-spreadsheet-scrollbar::-webkit-scrollbar-track { background: var(--xl-scroll-track) !important; }
.excel-viewer .x-spreadsheet-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--xl-scroll-thumb) !important;
  border-radius: 5px !important;
  border: 2px solid var(--xl-scroll-track) !important;
}
.excel-viewer .x-spreadsheet-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--xl-scroll-thumb-hover) !important; }
`;
