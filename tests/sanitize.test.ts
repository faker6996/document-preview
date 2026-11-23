// @vitest-environment jsdom
import assert from "node:assert/strict";
import { test } from "vitest";
import { stripActiveContent } from "../src/lib/sanitize";

test("stripActiveContent removes executable content but keeps layout", () => {
  const html = stripActiveContent(
    '<div style="color:red" onclick="steal()"><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="a.png" onerror="x()"><iframe src="//evil"></iframe>Slide</div>',
  );
  assert.ok(!/script|onclick|onerror|javascript:|iframe/i.test(html), html);
  assert.ok(html.includes('style="color:red"'));
  assert.ok(html.includes('src="a.png"'));
  assert.ok(html.includes("Slide"));
});
