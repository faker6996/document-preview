import assert from "node:assert/strict";
import { test } from "vitest";
import { clampSlideZoom, fitSlideScale, nextSlideZoom } from "../src/lib/slide-viewer";

test("fitSlideScale fits the whole slide inside the stage with padding", () => {
  // 16:9 slide in a wide stage: height is the limit.
  assert.equal(fitSlideScale({ width: 960, height: 540 }, { width: 1400, height: 604 }), (604 - 64) / 540);
  // 4:3 slide in a narrow stage: width is the limit.
  assert.equal(fitSlideScale({ width: 720, height: 540 }, { width: 424, height: 900 }), (424 - 64) / 720);
  // Stage not measured yet: neutral scale, never 0.
  assert.equal(fitSlideScale({ width: 960, height: 540 }, { width: 0, height: 0 }), 1);
  // Tiny stage clamps to the minimum zoom.
  assert.equal(fitSlideScale({ width: 960, height: 540 }, { width: 70, height: 70 }), 0.1);
});

test("nextSlideZoom walks PowerPoint-like presets from any current zoom", () => {
  assert.equal(nextSlideZoom(1, 1), 1.25);
  assert.equal(nextSlideZoom(1, -1), 0.75);
  assert.equal(nextSlideZoom(0.81, 1), 1);
  assert.equal(nextSlideZoom(0.81, -1), 0.75);
  assert.equal(nextSlideZoom(4, 1), 4);
  assert.equal(nextSlideZoom(0.1, -1), 0.1);
  assert.equal(clampSlideZoom(9), 4);
});
