/** Pure helpers for the PowerPoint-style slide preview (components/PowerPointSlidePreview.tsx). */

/** Render port handed to pptx-preview; it keeps the deck's own aspect ratio inside it. */
export const SLIDE_RENDER_WIDTH = 960;
export const SLIDE_RENDER_HEIGHT = 540;

/** Breathing room around the slide on the stage, per side (px). */
const STAGE_PADDING = 32;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
// PowerPoint-like zoom presets.
const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export type Size = { width: number; height: number };

export function clampSlideZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Largest scale that shows the whole slide inside the stage (never 0 while the stage is measuring). */
export function fitSlideScale(slide: Size, stage: Size): number {
  if (slide.width <= 0 || slide.height <= 0 || stage.width <= 0 || stage.height <= 0) return 1;
  const scale = Math.min(
    (stage.width - STAGE_PADDING * 2) / slide.width,
    (stage.height - STAGE_PADDING * 2) / slide.height,
  );
  return clampSlideZoom(scale);
}

/** Next preset above (+1) or below (-1) the current zoom. */
export function nextSlideZoom(current: number, direction: 1 | -1): number {
  const epsilon = 0.005;
  if (direction > 0) return ZOOM_STEPS.find((step) => step > current + epsilon) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((step) => step < current - epsilon) ?? MIN_ZOOM;
}
