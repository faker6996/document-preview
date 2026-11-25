"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Eye, File, Folder, Loader2, Search } from "lucide-react";
import type JSZip from "jszip";
import { useDocumentPreviewConfig } from "../context";
import {
  type ArchiveEntry,
  canPreviewArchiveEntry,
  formatFileSize,
  getArchiveEntryName,
  isArchiveNoiseEntry,
  sortArchiveEntries,
} from "../lib/archive-utils";

type SelectedEntry = {
  entry: ArchiveEntry;
  blobUrl: string;
};

type JsZipInternalEntry = JSZip.JSZipObject & {
  _data?: { uncompressedSize?: number; compressedSize?: number };
};

export function ArchivePreview({
  buffer,
  errorMessage,
  renderEntryPreview,
}: {
  buffer: ArrayBuffer;
  errorMessage: string;
  renderEntryPreview: (file: { url: string; name: string; sizeBytes: number }) => ReactNode;
}) {
  const { t } = useDocumentPreviewConfig();
  const archiveRef = useRef<JSZip | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const [extractingPath, setExtractingPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    archiveRef.current = null;
    queueMicrotask(() => {
      if (cancelled) return;
      setEntries(null);
      setError("");
      setQuery("");
      setSelected((prev) => {
        if (prev) URL.revokeObjectURL(prev.blobUrl);
        return null;
      });
    });

    void import("jszip")
      .then(({ default: JSZipLib }) => JSZipLib.loadAsync(buffer))
      .then((zip) => {
        if (cancelled) return;
        archiveRef.current = zip;
        const parsed: ArchiveEntry[] = [];
        zip.forEach((relativePath, file) => {
          if (isArchiveNoiseEntry(relativePath)) return;
          const internal = file as JsZipInternalEntry;
          const sizeBytes = Number(internal._data?.uncompressedSize ?? 0);
          const compressedBytes = Number(internal._data?.compressedSize ?? 0);
          parsed.push({
            path: relativePath,
            name: getArchiveEntryName(relativePath),
            directory: file.dir,
            sizeBytes,
            compressedBytes,
            modifiedAt: file.date ?? null,
            previewable: canPreviewArchiveEntry(relativePath, file.dir, sizeBytes),
          });
        });
        setEntries(sortArchiveEntries(parsed));
      })
      .catch(() => {
        if (!cancelled) setError(errorMessage);
      });

    return () => {
      cancelled = true;
    };
  }, [buffer, errorMessage]);

  useEffect(() => {
    const currentUrl = selected?.blobUrl;
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [selected?.blobUrl]);

  const fileEntries = useMemo(() => (entries ?? []).filter((entry) => !entry.directory), [entries]);
  const totalBytes = useMemo(() => fileEntries.reduce((sum, entry) => sum + entry.sizeBytes, 0), [fileEntries]);
  const filtered = useMemo(() => {
    if (!entries) return [];
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => entry.path.toLowerCase().includes(term));
  }, [entries, query]);

  const extractBlob = async (entry: ArchiveEntry): Promise<Blob | null> => {
    const file = archiveRef.current?.file(entry.path);
    if (!file) return null;
    return file.async("blob");
  };

  const handlePreviewEntry = async (entry: ArchiveEntry) => {
    if (!entry.previewable) return;
    setExtractingPath(entry.path);
    try {
      const blob = await extractBlob(entry);
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      setSelected({ entry, blobUrl });
    } finally {
      setExtractingPath(null);
    }
  };

  const handleDownloadEntry = async (entry: ArchiveEntry) => {
    setExtractingPath(entry.path);
    try {
      const blob = await extractBlob(entry);
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = entry.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } finally {
      setExtractingPath(null);
    }
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

  if (selected) {
    return (
      <div className="flex h-full min-h-full flex-col bg-card">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-surface-1 px-4 py-2 text-xs select-none">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToArchive")}
          </button>
          <div className="min-w-0 flex-1 truncate text-center font-medium text-muted-foreground" title={selected.entry.path}>
            {selected.entry.path}
          </div>
          <a
            href={selected.blobUrl}
            download={selected.entry.name}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="size-3.5" />
            {t("download")}
          </a>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {renderEntryPreview({
            url: selected.blobUrl,
            name: selected.entry.name,
            sizeBytes: selected.entry.sizeBytes,
          })}
        </div>
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className="flex min-h-full items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">{t("archiveEmpty")}</div>;
  }

  return (
    <div className="flex min-h-full flex-col bg-card">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-surface-1 px-4 py-2.5">
        <div className="text-xs font-medium text-muted-foreground tabular-nums">
          {t("archiveSummary", { count: fileEntries.length, size: formatFileSize(totalBytes) || "0 B" })}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchFiles")}
            aria-label={t("searchFiles")}
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">{t("noMatchingFiles")}</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="border-b border-border/60 px-4 py-2">{t("fileName")}</th>
                <th className="w-28 border-b border-border/60 px-4 py-2 text-right">{t("fileSize")}</th>
                <th className="w-24 border-b border-border/60 px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const busy = extractingPath === entry.path;
                return (
                  <tr key={entry.path} className="transition-colors hover:bg-muted/35">
                    <td className="border-b border-border/40 px-4 py-2 align-middle">
                      <div className="flex items-center gap-2.5">
                        {entry.directory ? (
                          <Folder className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <File className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        {entry.previewable ? (
                          <button
                            type="button"
                            onClick={() => void handlePreviewEntry(entry)}
                            disabled={busy}
                            className="truncate text-left font-medium text-foreground underline-offset-2 hover:underline"
                            title={entry.path}
                          >
                            {entry.path}
                          </button>
                        ) : (
                          <span className="truncate text-foreground/85" title={entry.path}>
                            {entry.path}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-border/40 px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                      {entry.directory ? "—" : formatFileSize(entry.sizeBytes) || "0 B"}
                    </td>
                    <td className="border-b border-border/40 px-4 py-2 text-right">
                      {!entry.directory ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          {entry.previewable ? (
                            <button
                              type="button"
                              onClick={() => void handlePreviewEntry(entry)}
                              disabled={busy}
                              aria-label={t("preview")}
                              title={t("preview")}
                              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                            >
                              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDownloadEntry(entry)}
                            disabled={busy}
                            aria-label={t("download")}
                            title={t("download")}
                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
