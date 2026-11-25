"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Maximize, Minus, Music, Plus, RotateCw } from "lucide-react";
import { useDocumentPreviewConfig } from "../context";
import { formatFileSize } from "../lib/archive-utils";
import { cn } from "../lib/cn";

const IMAGE_FIT_CLASSES = {
  // Dialog: clamp to the screen minus overlay padding, viewer header and the frame padding.
  dialog: {
    frame: "min-h-60 min-w-[min(22rem,calc(100vw-2rem))] p-4 pb-14",
    image: "max-h-[calc(100dvh-11rem)] max-w-[calc(100vw-5rem)]",
  },
  fullscreen: {
    frame: "h-full w-full p-4 pb-14",
    image: "max-h-[calc(100dvh-5rem)] max-w-full",
  },
  inline: {
    frame: "h-full w-full min-h-87.5 p-6 pb-14",
    image: "max-h-[70vh] max-w-full",
  },
} as const;

const IMAGE_ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function stepImageZoom(current: number, direction: 1 | -1): number {
  const epsilon = 0.005;
  if (direction > 0) return IMAGE_ZOOM_STEPS.find((step) => step > current + epsilon) ?? 4;
  return [...IMAGE_ZOOM_STEPS].reverse().find((step) => step < current - epsilon) ?? 0.25;
}

export function ImagePreview({
  url,
  alt,
  errorMessage,
  loadingMessage,
  fit,
}: {
  url: string;
  alt: string;
  errorMessage: string;
  loadingMessage: string;
  fit: keyof typeof IMAGE_FIT_CLASSES;
}) {
  const { t } = useDocumentPreviewConfig();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const classes = IMAGE_FIT_CLASSES[fit];

  if (status === "error") {
    return (
      <div className={cn("flex items-center justify-center", classes.frame)}>
        <MediaError message={errorMessage} />
      </div>
    );
  }

  const activeScale = zoom ?? 1;
  const transformed = zoom !== null || rotation !== 0;

  return (
    <div className="relative flex h-full w-full flex-col bg-muted/10 select-none">
      <div className={cn("relative flex flex-1 items-center justify-center overflow-auto", classes.frame)}>
        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            {loadingMessage}
          </div>
        ) : null}
        {/* Natural size by default, never upscaled; zoom & rotation available via the bottom toolbar. */}
        <img
          src={url}
          alt={alt}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          style={
            transformed
              ? {
                  transform: `scale(${activeScale}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }
              : undefined
          }
          className={cn(
            "block h-auto w-auto rounded-lg object-contain shadow-md transition-[opacity,transform] duration-150",
            classes.image,
            status === "ready" ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {status === "ready" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/90 px-2 py-1 text-xs text-muted-foreground shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setZoom((z) => stepImageZoom(z ?? 1, -1))}
              aria-label={t("zoomOut")}
              title={t("zoomOut")}
              className="inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-11 text-center tabular-nums text-foreground">{Math.round(activeScale * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => stepImageZoom(z ?? 1, 1))}
              aria-label={t("zoomIn")}
              title={t("zoomIn")}
              className="inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label={t("rotate")}
              title={t("rotate")}
              className="inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
            >
              <RotateCw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(null);
                setRotation(0);
              }}
              disabled={!transformed}
              aria-label={t("resetView")}
              title={t("resetView")}
              className="inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Maximize className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VideoPreview({ url, errorMessage, loadingMessage }: { url: string; errorMessage: string; loadingMessage: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  if (status === "error") {
    return <MediaError message={errorMessage} />;
  }

  return (
    <div className="relative flex h-full min-h-full w-full items-center justify-center bg-black/95 p-3">
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 text-sm text-white/75">
          <Loader2 className="size-5 animate-spin" />
          {loadingMessage}
        </div>
      ) : null}
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={() => setStatus("ready")}
        onCanPlay={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className={cn(
          "max-h-full max-w-full rounded-md outline-hidden transition-opacity duration-150",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function AudioPreview({
  url,
  fileName,
  sizeBytes,
  errorMessage,
}: {
  url: string;
  fileName: string;
  sizeBytes?: number | null;
  errorMessage: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return <MediaError message={errorMessage} />;
  }

  return (
    <div className="flex h-full min-h-full w-full flex-col items-center justify-center gap-5 bg-card px-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
          <Music className="size-7" />
        </div>
        <div className="max-w-md truncate text-sm font-semibold text-foreground" title={fileName}>
          {fileName}
        </div>
        {formatFileSize(sizeBytes) ? <div className="text-xs text-muted-foreground">{formatFileSize(sizeBytes)}</div> : null}
      </div>
      <audio src={url} controls preload="metadata" onError={() => setError(true)} className="w-full max-w-md" />
    </div>
  );
}

function MediaError({ message }: { message: string }) {
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <AlertCircle className="size-6" />
      </div>
      <div className="max-w-xl text-sm text-muted-foreground">{message}</div>
    </div>
  );
}
