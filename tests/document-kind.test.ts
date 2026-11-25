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

test("resolves the viewer kind from extension, filename and MIME", () => {
  assert.equal(kindOf("scan.JPG"), "image");
  assert.equal(kindOf("upload", null, "image/webp"), "image");
  assert.equal(kindOf("demo.mp4"), "video");
  assert.equal(kindOf("clip", null, "video/webm"), "video");
  assert.equal(kindOf("podcast.mp3"), "audio");
  assert.equal(kindOf("voice", null, "audio/ogg; codecs=opus"), "audio");
  assert.equal(kindOf("report.pdf"), "pdf");
  assert.equal(kindOf("blob", null, "application/pdf"), "pdf");
  assert.equal(kindOf("plan.xlsx"), "xlsx");
  assert.equal(kindOf("data.tsv"), "csv");
  assert.equal(kindOf("deck.pptx"), "pptx");
  assert.equal(kindOf("notes.md"), "markdown");
  assert.equal(kindOf("page.html"), "html");
  assert.equal(kindOf("app.tsx"), "code");
  assert.equal(kindOf("schema.sql"), "code");
  assert.equal(kindOf("config.yaml"), "code");
  assert.equal(kindOf("deploy/Dockerfile"), "code");
  assert.equal(kindOf("notes.txt"), "text");
  assert.equal(kindOf("folder.v1/README"), "text");
  assert.equal(kindOf("bundle.zip"), "archive");
  assert.equal(kindOf("old.doc"), "legacy");
  assert.equal(kindOf("upload", null, "application/msword"), "legacy");
  assert.equal(kindOf("legacy.xls"), "xlsx");
  assert.equal(kindOf("installer.exe"), "unsupported");
});

test("every previewable file gets a frame that never exceeds the screen", () => {
  const files = [
    "a.pdf",
    "a.docx",
    "a.xlsx",
    "a.csv",
    "a.pptx",
    "a.md",
    "a.html",
    "a.ts",
    "a.txt",
    "a.json",
    "a.xml",
    "a.png",
    "a.mp4",
    "a.mp3",
    "a.zip",
  ];
  for (const name of files) {
    assert.ok(canPreviewDocumentFile(name), name);
    const frame = getDocumentPreviewFrame(kindOf(name));
    assert.ok(frame.width === "fit-content" || frame.width.endsWith(", 100%)"), `${name} width ${frame.width}`);
    if (frame.viewportHeight) {
      assert.match(frame.viewportHeight, /^(?:min\(calc\(100dvh - 7rem\), \d+px\)|\d+px)$/, `${name} height`);
    }
  }
});

test("legacy formats open the dialog (message + download) instead of a silent new tab", () => {
  for (const name of ["a.doc", "a.ppt", "a.rtf", "a.odt"]) {
    assert.ok(canPreviewDocumentFile(name), name);
    assert.equal(kindOf(name), "legacy");
  }
  assert.equal(canPreviewDocumentFile("installer.exe"), false);
  assert.equal(canPreviewDocumentFile("upload", null, "video/mp4"), true);
});

test("frames follow the document shape", () => {
  const width = (name: string) => Number(/min\((\d+)px/.exec(getDocumentPreviewFrame(kindOf(name)).width)?.[1]);
  assert.ok(width("a.xlsx") > width("a.pptx"), "tables are widest");
  assert.ok(width("a.pptx") > width("a.pdf"), "slides wider than pages");
  assert.ok(width("a.pdf") > width("a.txt"), "pages wider than text");
  assert.ok(width("a.mp4") > width("a.mp3"), "video wider than audio");
  assert.equal(getDocumentPreviewFrame("image").width, "fit-content");
  assert.equal(getDocumentPreviewFrame("image").viewportHeight, undefined);
  assert.equal(getDocumentPreviewFrame("audio").viewportHeight, "280px");
  assert.equal(getDocumentPreviewFrame("unsupported").viewportHeight, "320px");
});
