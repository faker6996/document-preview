"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { type DocumentPreviewFile, getDocumentPreviewFrame, resolveDocumentExtension, resolveDocumentViewerKind } from "../lib/document-kind";

const UniversalDocumentViewer = lazy(() => import("./UniversalDocumentViewer").then((module) => ({ default: module.UniversalDocumentViewer })));

/**
 * Modal document preview. The dialog width follows the document kind (A4 page, wide table,
 * slide, image...) and the viewer sizes its content area to match.
 */
export function DocumentPreviewDialog({ file, onClose }: { file: DocumentPreviewFile | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const open = file !== null;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!file || typeof document === "undefined") return null;

  const frame = getDocumentPreviewFrame(
    resolveDocumentViewerKind(resolveDocumentExtension(file.name, file.extension, file.contentType), file.contentType),
  );

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 md:p-6" style={{ overscrollBehavior: "contain" }}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={file.name}
        tabIndex={-1}
        className="relative max-w-none overflow-hidden rounded-2xl border border-border/40 bg-card text-card-foreground shadow-xl outline-hidden md:rounded-3xl"
        style={{ width: frame.width }}
      >
        <Suspense fallback={<div className="h-40 w-[min(32rem,100%)]" />}>
          <UniversalDocumentViewer
            key={file.url}
            fileUrl={file.url}
            fileName={file.name}
            fileExt={file.extension}
            contentType={file.contentType}
            sizeBytes={file.sizeBytes}
            embedded
            seamless
            presentation="dialog"
            onClose={onClose}
          />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}
