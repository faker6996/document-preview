import assert from "node:assert/strict";
import { test } from "vitest";
import { loadPrismGrammar, resolvePrismLanguage } from "../src/lib/code-language";

test("resolvePrismLanguage maps common code and config extensions", () => {
  assert.equal(resolvePrismLanguage("ts"), "typescript");
  assert.equal(resolvePrismLanguage(".tsx"), "tsx");
  assert.equal(resolvePrismLanguage("PY"), "python");
  assert.equal(resolvePrismLanguage("cs"), "csharp");
  assert.equal(resolvePrismLanguage("sql"), "sql");
  assert.equal(resolvePrismLanguage("yml"), "yaml");
  assert.equal(resolvePrismLanguage("dockerfile"), "docker");
  assert.equal(resolvePrismLanguage("html"), "markup");
  assert.equal(resolvePrismLanguage("unknown-ext"), null);
});

test("loadPrismGrammar loads optional Prism grammars on demand", async () => {
  const ts = await loadPrismGrammar("typescript");
  assert.ok(ts?.grammar, "typescript grammar should load");
  const highlighted = ts.Prism.highlight("const count: number = 42;", ts.grammar, "typescript");
  assert.ok(highlighted.includes("token keyword"), highlighted);

  const py = await loadPrismGrammar("python");
  assert.ok(py?.grammar, "python grammar should load");
});
