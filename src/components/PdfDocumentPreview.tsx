"use client";

import { lazy, Suspense, useMemo } from "react";
import { useDocumentPreviewConfig } from "../context";

const EmbedPdfViewer = lazy(() => import("@embedpdf/react-pdf-viewer").then((module) => ({ default: module.PDFViewer })));

export function PdfDocumentPreview({ buffer, fileName }: { buffer: ArrayBuffer; fileName: string }) {
  const { pdfWasmUrl } = useDocumentPreviewConfig();
  const config = useMemo(
    () => ({
      ...(pdfWasmUrl ? { wasmUrl: pdfWasmUrl } : {}),
      fontFallback: null,
      fonts: {
        ui: null,
        signature: null,
      },
      stamp: {
        libraries: [],
        manifests: [],
        defaultLibrary: false as const,
      },
      documentManager: {
        initialDocuments: [{ buffer, name: fileName }],
      },
      tabBar: "never" as const,
      theme: { preference: "system" as const },
    }),
    [buffer, fileName, pdfWasmUrl],
  );

  return (
    <Suspense fallback={null}>
      <EmbedPdfViewer className="h-full min-h-full w-full" config={config} style={{ height: "100%", width: "100%" }} />
    </Suspense>
  );
}
