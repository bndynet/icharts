export const STACKED_TEXT_DEFAULT_VISIBLE_GAP_PX = 12;
export const STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM = 0.15;

export interface StackedTextOffsetsOptions {
  primaryFontSize: number;
  secondaryFontSize: number;
  visibleGapPx?: number;
  glyphPaddingEm?: number;
  showSecondary?: boolean;
}

export interface StackedTextOffsets {
  primaryOffsetY: number;
  secondaryOffsetY: number;
}

function roundHalfAwayFromZero1(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 10)) / 10;
}

export function computeStackedTextOffsets(
  opts: StackedTextOffsetsOptions,
): StackedTextOffsets {
  const {
    primaryFontSize,
    secondaryFontSize,
    visibleGapPx = STACKED_TEXT_DEFAULT_VISIBLE_GAP_PX,
    glyphPaddingEm = STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM,
    showSecondary = true,
  } = opts;

  const padding = glyphPaddingEm * (primaryFontSize + secondaryFontSize);
  const emBoxGap = Math.max(0, visibleGapPx - padding);

  const primaryOffsetY = showSecondary
    ? roundHalfAwayFromZero1(-(emBoxGap + secondaryFontSize) / 2)
    : 0;
  const secondaryOffsetY = roundHalfAwayFromZero1(
    (primaryFontSize + emBoxGap) / 2,
  );

  return { primaryOffsetY, secondaryOffsetY };
}
