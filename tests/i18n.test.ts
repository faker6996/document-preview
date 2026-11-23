import assert from "node:assert/strict";
import { test } from "vitest";
import { DOCUMENT_PREVIEW_MESSAGES, formatMessage, resolveMessages } from "../src/i18n";

test("every locale has exactly the same keys as English", () => {
  const keys = Object.keys(DOCUMENT_PREVIEW_MESSAGES.en).sort();
  for (const [locale, messages] of Object.entries(DOCUMENT_PREVIEW_MESSAGES)) {
    assert.deepEqual(Object.keys(messages).sort(), keys, locale);
  }
});

test("resolveMessages picks the language, falls back to English and applies overrides", () => {
  assert.equal(resolveMessages("vi-VN").download, DOCUMENT_PREVIEW_MESSAGES.vi.download);
  assert.equal(resolveMessages("fr").download, DOCUMENT_PREVIEW_MESSAGES.en.download);
  assert.equal(resolveMessages(undefined).download, DOCUMENT_PREVIEW_MESSAGES.en.download);
  assert.equal(resolveMessages("en", { download: "Get file" }).download, "Get file");
});

test("formatMessage fills {placeholders} and leaves unknown ones", () => {
  assert.equal(formatMessage("Slide {current} of {total}", { current: 2, total: 9 }), "Slide 2 of 9");
  assert.equal(formatMessage("Slide {current}", {}), "Slide {current}");
});
