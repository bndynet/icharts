import type { RenderContext } from '../index.js';
import { DEFAULT_LABEL_FONT, measureMaxTextWidth } from './text-measure.js';

const RACE_FRAME_FALLBACK_MS = 500;
const RACE_FRAME_MIN_MS = 80;
const RACE_FRAME_MAX_MS = 3000;

export function resolveRaceFrameDuration(
  explicit: number | undefined,
  ctx: RenderContext | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const observed = ctx?.observedFrameMs;
  if (observed !== undefined && Number.isFinite(observed)) {
    return Math.max(RACE_FRAME_MIN_MS, Math.min(RACE_FRAME_MAX_MS, observed));
  }
  return RACE_FRAME_FALLBACK_MS;
}

const RACE_LABEL_FONT = DEFAULT_LABEL_FONT;
const RACE_LABEL_GAP_PX = 8;
const RACE_LABEL_PAD_PX = 8;
const RACE_LABEL_MIN_PX = 32;

export function resolveRaceLabelHeadroom(
  labels: ReadonlyArray<string>,
  ctx: RenderContext | undefined,
): number {
  const widest = measureMaxTextWidth(labels, RACE_LABEL_FONT);
  const suggested = Math.max(
    RACE_LABEL_MIN_PX,
    widest + RACE_LABEL_GAP_PX + RACE_LABEL_PAD_PX,
  );
  return Math.max(suggested, ctx?.maxRaceGridRight ?? 0);
}
