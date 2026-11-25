import { resolveDocumentExtension, resolveDocumentViewerKind } from "./document-kind";

export type ArchiveEntry = {
  path: string;
  name: string;
  directory: boolean;
  sizeBytes: number;
  compressedBytes: number;
  modifiedAt: Date | null;
  previewable: boolean;
};

/** Maximum uncompressed size (25 MB) allowed for inline preview of a single file inside a ZIP. */
export const MAX_ARCHIVE_PREVIEW_BYTES = 25 * 1024 * 1024;

/** Ignore macOS archive metadata entries (__MACOSX/..., .DS_Store). */
export function isArchiveNoiseEntry(path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  if (!normalized) return true;
  const segments = normalized.split("/");
  return segments[0] === "__MACOSX" || segments.some((segment) => segment === ".DS_Store");
}

export function getArchiveEntryName(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed;
}

/** Whether a single ZIP entry can safely be previewed inline (blocks nested archives & huge files). */
export function canPreviewArchiveEntry(path: string, directory: boolean, sizeBytes: number): boolean {
  if (directory || sizeBytes > MAX_ARCHIVE_PREVIEW_BYTES) return false;
  const kind = resolveDocumentViewerKind(resolveDocumentExtension(path));
  return kind !== "unsupported" && kind !== "legacy" && kind !== "archive";
}

export function sortArchiveEntries(entries: ArchiveEntry[]): ArchiveEntry[] {
  return [...entries].sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1;
    return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
