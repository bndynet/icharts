/**
 * Shared canvas-based text measurement primitive.
 */

export const DEFAULT_LABEL_FONT_SIZE = 12;
export const DEFAULT_LABEL_FONT = `${DEFAULT_LABEL_FONT_SIZE}px sans-serif`;

export function buildLabelFont(fontSize: number): string {
  return `${fontSize}px sans-serif`;
}

const FALLBACK_CHAR_PX = 7;

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  if (typeof document === 'undefined') {
    measureCtx = null;
    return null;
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d');
  } catch {
    measureCtx = null;
  }
  return measureCtx ?? null;
}

export function measureTextWidth(text: string, font: string = DEFAULT_LABEL_FONT): number {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  if (ctx) {
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
  }
  return text.length * FALLBACK_CHAR_PX;
}

export function measureMaxTextWidth(
  texts: ReadonlyArray<string>,
  font: string = DEFAULT_LABEL_FONT,
): number {
  let widest = 0;
  for (const text of texts) {
    const w = measureTextWidth(text, font);
    if (w > widest) widest = w;
  }
  return widest;
}
