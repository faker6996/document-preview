// @vitest-environment jsdom
import assert from "node:assert/strict";
import { test } from "vitest";
import { stripActiveContent } from "../src/lib/sanitize";

test("stripActiveContent removes executable content but keeps layout", () => {
  const html = stripActiveContent(
    '<div style="color:red" onclick="steal()"><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="data:text/html,<script>1</script>">y</a><img src="a.png" onerror="x()"><img src="data:image/png;base64,AAAA"><iframe src="//evil"></iframe>Slide</div>',
  );
  assert.ok(!/script|onclick|onerror|javascript:|data:text\/html|iframe/i.test(html), html);
  assert.ok(html.includes('style="color:red"'));
  assert.ok(html.includes('src="a.png"'));
  assert.ok(html.includes('src="data:image/png;base64,AAAA"'));
  assert.ok(html.includes("Slide"));
});
