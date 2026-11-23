"use client";

import { type CSSProperties, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Maximize, Minus, Plus } from "lucide-react";
import { useDocumentPreviewConfig } from "../context";
import { stripActiveContent } from "../lib/sanitize";
import { cn } from "../lib/cn";
import { clampSlideZoom, fitSlideScale, nextSlideZoom, SLIDE_RENDER_HEIGHT, SLIDE_RENDER_WIDTH } from "../lib/slide-viewer";

/**
 * Read-only .pptx preview laid out like PowerPoint's Normal view: numbered slide thumbnails on
 * the left, the current slide centred on a grey stage (fit to window, zoomable), and a status bar.
 * Slides are rendered by pptx-preview; the app chrome uses semantic tokens, only the PowerPoint
 * accent and the slide "paper" are literal.
 */
const POWERPOINT_ACCENT = "#c43e1c";
const SLIDE_PAPER = "#ffffff";
const THUMBNAIL_WIDTH = 168;

type PreviewerInstance = {
  slideCount: number;
  destroy: () => void;
  preview: (file: ArrayBuffer) => Promise<unknown>;
};
type SlideSnapshot = { html: string; background: CSSProperties };
type SlideSize = { width: number; height: number };

function parseStyleString(styleStr: string): CSSProperties {
  const styles: Record<string, string> = {};
  styleStr.split(";").forEach((pair) => {
    const separatorIndex = pair.indexOf(":");
    if (separatorIndex === -1) return;
    const key = pair.substring(0, separatorIndex).trim();
    const value = pair.substring(separatorIndex + 1).trim();
    if (key && value) styles[key.replace(/-./g, (x) => x[1].toUpperCase())] = value;
  });
  return styles as CSSProperties;
}

function readSlideSize(slide: HTMLElement | undefined): SlideSize {
  const width = Number.parseFloat(slide?.style.width ?? "");
  const height = Number.parseFloat(slide?.style.height ?? "");
  return width > 0 && height > 0 ? { width, height } : { width: SLIDE_RENDER_WIDTH, height: SLIDE_RENDER_HEIGHT };
}

export function PowerPointSlidePreview({ buffer, errorMessage }: { buffer: ArrayBuffer; errorMessage: string }) {
  const { t } = useDocumentPreviewConfig();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [error, setError] = useState("");
  const [slides, setSlides] = useState<SlideSnapshot[]>([]);
  const [slideSize, setSlideSize] = useState<SlideSize | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stageSize, setStageSize] = useState<SlideSize>({ width: 0, height: 0 });
  // null = fit to window (PowerPoint's default); a number = explicit zoom.
  const [zoom, setZoom] = useState<number | null>(null);
  const slideCount = slides.length;

  useEffect(() => {
    let cancelled = false;
    let previewer: PreviewerInstance | null = null;
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();

    void import("pptx-preview")
      .then(async ({ init }) => {
        if (cancelled || !hostRef.current) return;
        previewer = init(hostRef.current, { width: SLIDE_RENDER_WIDTH, height: SLIDE_RENDER_HEIGHT, mode: "list" }) as unknown as PreviewerInstance;
        await previewer.preview(buffer);
        if (cancelled) return;

        const wrappers = Array.from(host.querySelectorAll<HTMLElement>(".pptx-preview-slide-wrapper"));
        // pptx-preview sets each slide's render size inline (it keeps the deck's own ratio: 16:9, 4:3, A4...).
        // Read the inline style, not offsetWidth/Height: inactive slides are display:none and measure 0.
        setSlideSize(readSlideSize(wrappers[0]));
        setSlides(
          wrappers.map((slide) => ({
            // Re-injected as thumbnails: drop anything executable, keep layout styles.
            html: stripActiveContent(slide.innerHTML),
            background: parseStyleString(
              (slide.getAttribute("style") || "")
                .split(";")
                .filter((part) => part.trim().startsWith("background"))
                .join(";"),
            ),
          })),
        );
        setCurrentSlide(0);
      })
      .catch(() => {
        if (!cancelled) setError(errorMessage);
      });

    return () => {
      cancelled = true;
      previewer?.destroy();
      host.replaceChildren();
    };
  }, [buffer, errorMessage]);

  // Show only the current slide of the rendered list.
  useEffect(() => {
    hostRef.current?.querySelectorAll(".pptx-preview-slide-wrapper").forEach((slide, index) => {
      slide.classList.toggle("active-slide", index === currentSlide);
    });
    thumbnailRefs.current[currentSlide]?.scrollIntoView({ block: "nearest" });
  }, [currentSlide, slideCount]);

  // Track the stage so "fit to window" follows dialog/fullscreen resizes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ width, height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const fitScale = useMemo(() => (slideSize ? fitSlideScale(slideSize, stageSize) : 1), [slideSize, stageSize]);
  const scale = zoom ?? fitScale;
  const size = slideSize ?? { width: SLIDE_RENDER_WIDTH, height: SLIDE_RENDER_HEIGHT };
  const ready = slideSize !== null && slideCount > 0;

  const goTo = useCallback(
    (index: number) => setCurrentSlide(Math.max(0, Math.min(slideCount - 1, index))),
    [slideCount],
  );
  const zoomBy = (direction: 1 | -1) => setZoom(clampSlideZoom(nextSlideZoom(scale, direction)));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keyActions: Record<string, () => void> = {
      ArrowRight: () => goTo(currentSlide + 1),
      ArrowDown: () => goTo(currentSlide + 1),
      PageDown: () => goTo(currentSlide + 1),
      ArrowLeft: () => goTo(currentSlide - 1),
      ArrowUp: () => goTo(currentSlide - 1),
      PageUp: () => goTo(currentSlide - 1),
      Home: () => goTo(0),
      End: () => goTo(slideCount - 1),
    };
    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

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

  const thumbnailHeight = Math.round((THUMBNAIL_WIDTH * size.height) / size.width);
  const thumbnailScale = THUMBNAIL_WIDTH / size.width;

  return (
    <div
      className="ppt-viewer flex h-full w-full flex-col overflow-hidden bg-muted outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      style={{ "--ppt-accent": POWERPOINT_ACCENT, "--ppt-paper": SLIDE_PAPER } as CSSProperties}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <style>{PPT_VIEWER_CSS}</style>

      <div className="flex min-h-0 flex-1">
        {/* Slide thumbnails pane */}
        <nav
          aria-label={t("slideList")}
          className="hidden w-56 shrink-0 overflow-y-auto border-r border-border bg-surface-1 py-3 pl-2 pr-3 thin-scrollbar sm:block"
        >
          <ol className="space-y-3">
            {slides.map((slide, index) => {
              const active = index === currentSlide;
              return (
                <li key={index} className="flex items-start gap-1.5">
                  <span className={cn("w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums", active ? "ppt-accent-text font-semibold" : "text-muted-foreground")}>
                    {index + 1}
                  </span>
                  <button
                    ref={(element) => {
                      thumbnailRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={t("slideThumbnail", { index: index + 1 })}
                    aria-current={active ? "true" : undefined}
                    className={cn("ppt-thumbnail relative shrink-0 overflow-hidden outline-1 outline-border", active && "is-active")}
                    style={{ width: THUMBNAIL_WIDTH, height: thumbnailHeight }}
                  >
                    <div
                      className="pointer-events-none absolute left-0 top-0 origin-top-left"
                      style={{ width: size.width, height: size.height, transform: `scale(${thumbnailScale})` }}
                    >
                      <div className="relative h-full w-full" style={slide.background} dangerouslySetInnerHTML={{ __html: slide.html }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Stage: current slide centred, fit to window by default */}
        <div ref={stageRef} className="relative flex min-w-0 flex-1 overflow-auto thin-scrollbar">
          {!ready ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              {t("loading")}
            </div>
          ) : null}
          <div
            className={cn("ppt-slide relative m-auto shrink-0", !ready && "invisible")}
            style={{ width: size.width * scale, height: size.height * scale }}
          >
            <div
              ref={hostRef}
              className="ppt-host absolute left-0 top-0 origin-top-left"
              style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-1 px-3 text-xs text-muted-foreground select-none">
        <span className="tabular-nums">
          {ready ? t("slidePosition", { current: currentSlide + 1, total: slideCount }) : ""}
        </span>
        <div className="flex items-center gap-1">
          <StatusButton label={t("previousSlide")} disabled={!ready || currentSlide === 0} onClick={() => goTo(currentSlide - 1)}>
            <ChevronLeft className="size-4" />
          </StatusButton>
          <StatusButton label={t("nextSlide")} disabled={!ready || currentSlide >= slideCount - 1} onClick={() => goTo(currentSlide + 1)}>
            <ChevronRight className="size-4" />
          </StatusButton>
        </div>
        <div className="flex items-center gap-1">
          <StatusButton label={t("zoomOut")} disabled={!ready} onClick={() => zoomBy(-1)}>
            <Minus className="size-3.5" />
          </StatusButton>
          <span className="w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <StatusButton label={t("zoomIn")} disabled={!ready} onClick={() => zoomBy(1)}>
            <Plus className="size-3.5" />
          </StatusButton>
          <StatusButton label={t("fitToWindow")} disabled={!ready} pressed={zoom === null} onClick={() => setZoom(null)}>
            <Maximize className="size-3.5" />
          </StatusButton>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        pressed && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const PPT_VIEWER_CSS = `
.ppt-viewer .ppt-accent-text { color: var(--ppt-accent); }
.ppt-viewer .ppt-thumbnail {
  background: var(--ppt-paper);
  transition: outline-color 120ms ease;
}
.ppt-viewer .ppt-thumbnail:hover { outline: 2px solid color-mix(in srgb, var(--ppt-accent) 40%, transparent); }
.ppt-viewer .ppt-thumbnail.is-active { outline: 3px solid var(--ppt-accent); outline-offset: 0; }
.ppt-viewer .ppt-thumbnail:focus-visible { outline: 3px solid var(--ppt-accent); outline-offset: 2px; }
.ppt-viewer .ppt-slide {
  background: var(--ppt-paper);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.12);
}
/* pptx-preview chrome: hide its own controls/black wrapper, show only the active slide. */
.ppt-viewer .pptx-preview-wrapper-next,
.ppt-viewer .pptx-preview-wrapper-pagination { display: none !important; }
.ppt-viewer .pptx-preview-wrapper {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  background: transparent !important;
  margin: 0 !important;
}
.ppt-viewer .pptx-preview-slide-wrapper { display: none !important; margin: 0 !important; }
.ppt-viewer .pptx-preview-slide-wrapper.active-slide { display: block !important; }
`;
