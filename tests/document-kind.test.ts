import assert from "node:assert/strict";
import { test } from "vitest";
import {
  canPreviewDocumentFile,
  getDocumentPreviewFrame,
  resolveDocumentExtension,
  resolveDocumentViewerKind,
} from "../src/lib/document-kind";

const kindOf = (name: string, ext?: string | null, mime?: string | null) =>
  resolveDocumentViewerKind(resolveDocumentExtension(name, ext, mime), mime);

test("resolves the viewer kind from extension, then MIME", () => {
  assert.equal(kindOf("scan.JPG"), "image");
  assert.equal(kindOf("upload", null, "image/webp"), "image");
  assert.equal(kindOf("report.pdf"), "pdf");
  assert.equal(kindOf("blob", null, "application/pdf"), "pdf");
  assert.equal(kindOf("plan.xlsx"), "xlsx");
  assert.equal(kindOf("data.tsv"), "csv");
  assert.equal(kindOf("deck.pptx"), "pptx");
  assert.equal(kindOf("notes.md"), "text");
  assert.equal(kindOf("old.doc"), "legacy");
  assert.equal(kindOf("upload", null, "application/msword"), "legacy");
  assert.equal(kindOf("legacy.xls"), "xlsx");
  assert.equal(kindOf("archive.zip"), "unsupported");
});

test("every previewable file gets a frame that never exceeds the screen", () => {
  for (const name of ["a.pdf", "a.docx", "a.xlsx", "a.csv", "a.pptx", "a.txt", "a.json", "a.xml", "a.png"]) {
    assert.ok(canPreviewDocumentFile(name), name);
    const frame = getDocumentPreviewFrame(kindOf(name));
    assert.ok(frame.width === "fit-content" || frame.width.endsWith(", 100%)"), `${name} width ${frame.width}`);
    if (frame.viewportHeight) {
      assert.match(frame.viewportHeight, /^min\(calc\(100dvh - 7rem\), \d+px\)$/, `${name} height`);
    }
  }
});

test("legacy formats open the dialog (message + download) instead of a silent new tab", () => {
  for (const name of ["a.doc", "a.ppt", "a.rtf", "a.odt"]) {
    assert.ok(canPreviewDocumentFile(name), name);
    assert.equal(kindOf(name), "legacy");
  }
  assert.equal(canPreviewDocumentFile("a.zip"), false);
});

test("frames follow the document shape", () => {
  const width = (name: string) => Number(/min\((\d+)px/.exec(getDocumentPreviewFrame(kindOf(name)).width)?.[1]);
  assert.ok(width("a.xlsx") > width("a.pptx"), "tables are widest");
  assert.ok(width("a.pptx") > width("a.pdf"), "slides wider than pages");
  assert.ok(width("a.pdf") > width("a.txt"), "pages wider than text");
  assert.equal(getDocumentPreviewFrame("image").width, "fit-content");
  assert.equal(getDocumentPreviewFrame("image").viewportHeight, undefined);
  assert.equal(getDocumentPreviewFrame("unsupported").viewportHeight, "320px");
});
