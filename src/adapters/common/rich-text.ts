import type {
  RichTextInput,
  RichTextSpec,
  RichTextSegment,
  RichTextStyle,
} from '../../types.js';
import { DEFAULT_LABEL_FONT, measureMaxTextWidth } from './text-measure.js';

export interface CompiledRichText {
  text: string;
  plainText: string;
  rich?: Record<string, RichTextStyle>;
  measuredWidthPx?: number;
}

function isRichTextSpec(value: unknown): value is RichTextSpec {
  if (typeof value !== 'object' || value === null) return false;
  if (!('segments' in value)) return false;
  return Array.isArray((value as { segments?: unknown }).segments);
}

function normalizeSegmentStyle(
  segment: RichTextSegment,
  styles?: Record<string, RichTextStyle>,
): RichTextStyle | undefined {
  const referenced =
    typeof segment.style === 'string' ? styles?.[segment.style] : undefined;
  const inline =
    typeof segment.style === 'object' && segment.style !== null
      ? segment.style
      : undefined;

  const out: RichTextStyle = {
    ...(referenced ?? {}),
    ...(inline ?? {}),
  };
  if (out.backgroundImage !== undefined) {
    if (out.backgroundColor === undefined) {
      out.backgroundColor = { image: out.backgroundImage } as Record<string, unknown>;
    }
    delete out.backgroundImage;
  }
  if (segment.width !== undefined) out.width = segment.width;
  if (segment.align !== undefined) out.align = segment.align;
  if (segment.verticalAlign !== undefined) out.verticalAlign = segment.verticalAlign;
  if (Object.keys(out).length === 0) return undefined;

  if (out.overflow === undefined) out.overflow = 'truncate';
  if (out.ellipsis === undefined) out.ellipsis = '…';
  return out;
}

function truncateLineToWidth(
  line: string,
  widthPx: number,
  ellipsis: string,
): string {
  if (widthPx <= 0) return '';
  if (measureMaxTextWidth([line], DEFAULT_LABEL_FONT) <= widthPx) return line;

  let suffix = ellipsis;
  if (suffix && measureMaxTextWidth([suffix], DEFAULT_LABEL_FONT) > widthPx) {
    suffix = '';
  }
  const target = widthPx - measureMaxTextWidth([suffix], DEFAULT_LABEL_FONT);
  if (target <= 0) return suffix;

  let lo = 0;
  let hi = line.length;
  let best = '';
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = line.slice(0, mid);
    if (measureMaxTextWidth([candidate], DEFAULT_LABEL_FONT) <= target) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return `${best}${suffix}`;
}

function applySegmentOverflowDefaults(text: string, style?: RichTextStyle): string {
  if (!style) return text;
  if (style.overflow !== 'truncate') return text;
  if (typeof style.width !== 'number' || !Number.isFinite(style.width)) return text;
  const ellipsis = typeof style.ellipsis === 'string' ? style.ellipsis : '…';
  return text
    .split('\n')
    .map((line) => truncateLineToWidth(line, style.width as number, ellipsis))
    .join('\n');
}

function measureRichSpecWidth(spec: RichTextSpec): number {
  const lineWidths = [0];
  for (const segment of spec.segments) {
    const style = normalizeSegmentStyle(segment, spec.styles);
    const fixed =
      typeof style?.width === 'number' && Number.isFinite(style.width)
        ? style.width
        : undefined;
    const lines = segment.text.split('\n');
    lines.forEach((line, lineIndex) => {
      const lineWidth =
        fixed ?? measureMaxTextWidth([line], DEFAULT_LABEL_FONT);
      if (lineIndex === 0) {
        lineWidths[lineWidths.length - 1] += lineWidth;
      } else {
        lineWidths.push(lineWidth);
      }
    });
  }
  return Math.ceil(Math.max(...lineWidths, 0));
}

export function compileRichText(
  input: RichTextInput,
  keyPrefix: string,
): CompiledRichText {
  if (typeof input === 'string') {
    return {
      text: input,
      plainText: stripRichTextMarkup(input),
    };
  }

  if (!isRichTextSpec(input) || input.segments.length === 0) {
    return { text: '', plainText: '' };
  }

  const rich: Record<string, RichTextStyle> = {};
  const tokens: string[] = [];
  const plain: string[] = [];
  input.segments.forEach((segment, segmentIndex) => {
    const style = normalizeSegmentStyle(segment, input.styles);
    const text = applySegmentOverflowDefaults(segment.text, style);
    plain.push(text);
    if (!style) {
      tokens.push(text);
      return;
    }
    const key = `__ich_${keyPrefix}_${segmentIndex}`;
    rich[key] = style;
    tokens.push(`{${key}|${text}}`);
  });

  return {
    text: tokens.join(''),
    plainText: plain.join(''),
    rich: Object.keys(rich).length > 0 ? rich : undefined,
    measuredWidthPx: measureRichSpecWidth(input),
  };
}

export function mergeCompiledRichStyles(
  labels: ReadonlyArray<CompiledRichText>,
): Record<string, RichTextStyle> {
  const out: Record<string, RichTextStyle> = {};
  for (const label of labels) {
    if (!label.rich) continue;
    Object.assign(out, label.rich);
  }
  return out;
}

export function safeFormatLegendLabel(
  formatLabel: (name: string, index: number) => RichTextInput,
  name: string,
  index: number,
  keyPrefix: string,
): CompiledRichText {
  try {
    const out = formatLabel(name, index);
    if (typeof out === 'string' || isRichTextSpec(out)) {
      return compileRichText(out, keyPrefix);
    }
    return compileRichText(name, keyPrefix);
  } catch {
    return compileRichText(name, keyPrefix);
  }
}

/**
 * Defensive wrapper around `AxisOptions.formatLabel`.
 *
 * Mirrors {@link safeFormatLegendLabel} but accepts `string | number` values
 * (axis ticks). On throw or non-string / non-RichTextSpec return the entry
 * falls back to `String(value)` so a single bad lookup can't blank the whole
 * axis.
 */
export function safeFormatAxisLabel(
  formatLabel: (value: string | number, index: number) => RichTextInput,
  value: string | number,
  index: number,
  keyPrefix: string,
): CompiledRichText {
  try {
    const out = formatLabel(value, index);
    if (typeof out === 'string' || isRichTextSpec(out)) {
      return compileRichText(out, keyPrefix);
    }
    return compileRichText(String(value), keyPrefix);
  } catch {
    return compileRichText(String(value), keyPrefix);
  }
}

export function stripRichTextMarkup(label: string): string {
  if (!label.includes('{') || !label.includes('|')) return label;
  return label.replace(/\{[^|{}]+\|/g, '').replace(/\}/g, '');
}

export function measureCompiledLabelWidth(label: CompiledRichText): number {
  if (label.measuredWidthPx !== undefined) return label.measuredWidthPx;
  return measureMaxTextWidth(label.plainText.split('\n'), DEFAULT_LABEL_FONT);
}
