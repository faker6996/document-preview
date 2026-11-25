import assert from "node:assert/strict";
import { test } from "vitest";
import {
  canPreviewArchiveEntry,
  formatFileSize,
  getArchiveEntryName,
  isArchiveNoiseEntry,
  MAX_ARCHIVE_PREVIEW_BYTES,
  sortArchiveEntries,
} from "../src/lib/archive-utils";

test("isArchiveNoiseEntry ignores macOS metadata entries", () => {
  assert.equal(isArchiveNoiseEntry("__MACOSX/._report.pdf"), true);
  assert.equal(isArchiveNoiseEntry("docs/.DS_Store"), true);
  assert.equal(isArchiveNoiseEntry("docs/report.pdf"), false);
});

test("canPreviewArchiveEntry allows safe files and blocks directories, nested archives and huge files", () => {
  assert.equal(canPreviewArchiveEntry("docs/report.pdf", false, 1024), true);
  assert.equal(canPreviewArchiveEntry("src/index.ts", false, 512), true);
  assert.equal(canPreviewArchiveEntry("docs/", true, 0), false);
  assert.equal(canPreviewArchiveEntry("nested.zip", false, 1024), false);
  assert.equal(canPreviewArchiveEntry("installer.exe", false, 1024), false);
  assert.equal(canPreviewArchiveEntry("huge.pdf", false, MAX_ARCHIVE_PREVIEW_BYTES + 1), false);
});

test("sortArchiveEntries places directories first and sorts naturally", () => {
  const sorted = sortArchiveEntries([
    { path: "b.txt", name: "b.txt", directory: false, sizeBytes: 1, compressedBytes: 1, modifiedAt: null, previewable: true },
    { path: "dir/", name: "dir", directory: true, sizeBytes: 0, compressedBytes: 0, modifiedAt: null, previewable: false },
    { path: "a10.txt", name: "a10.txt", directory: false, sizeBytes: 1, compressedBytes: 1, modifiedAt: null, previewable: true },
    { path: "a2.txt", name: "a2.txt", directory: false, sizeBytes: 1, compressedBytes: 1, modifiedAt: null, previewable: true },
  ]);
  assert.deepEqual(
    sorted.map((entry) => entry.path),
    ["dir/", "a2.txt", "a10.txt", "b.txt"],
  );
  assert.equal(getArchiveEntryName("docs/2026/report.pdf"), "report.pdf");
  assert.equal(formatFileSize(1536), "1.5 KB");
});
