import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

export type WordCloudVariant =
  | 'default'
  | 'diamond'
  | 'poster'
  | 'compact-diamond';

export interface WordCloudDataItem {
  name: string;
  value: number;
  /**
   * Per-word fixed color override.
   * When provided, wins over palette / colorMap resolution.
   */
  color?: string;
}

/**
 * Word cloud data set.
 *
 * Note: this is structurally similar to `PieData` (`{name, value}[]`).
 * The chart `type` string selects the adapter.
 */
export type WordCloudData = WordCloudDataItem[];

export function isWordCloudData(data: ChartData): data is WordCloudData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0] &&
    'value' in data[0]
  );
}

export interface WordCloudChartOptions extends ChartOptions {
  /**
   * Built-in layout presets.
   * - `default`: balanced general-purpose cloud
   * - `diamond`: denser diamond layout with horizontal labels
   * - `poster`: high-contrast, bold visual style for hero cards
   * - `compact-diamond`: deprecated alias of `diamond`
   */
  variant?: WordCloudVariant;
  /** Text size range in px. Default: `[12, 60]`. */
  sizeRange?: [number, number];
  /**
   * Word cloud silhouette. Built-in presets are from the word-cloud extension.
   * Default: `'circle'`.
   */
  shape?:
    | 'circle'
    | 'cardioid'
    | 'diamond'
    | 'triangle-forward'
    | 'triangle'
    | 'pentagon'
    | 'star';
  /** Rotation range in degrees. Default: `[-90, 90]`. */
  rotationRange?: [number, number];
  /** Rotation step in degrees. Default: `45`. */
  rotationStep?: number;
  /** Grid size in px. Larger values create more gap between words. Default: `8`. */
  gridSize?: number;
  /** Keep `maskImage` aspect ratio. Default: `false`. */
  keepAspect?: boolean;
  /** Allow drawing outside the layout body. Default: `false`. */
  drawOutOfBound?: boolean;
  /** Shrink words to fit when layout is dense. Default: `false`. */
  shrinkToFit?: boolean;
  /** Enable placement animation. Default: `true`. */
  layoutAnimation?: boolean;
  /** Sort data by value descending before layout. Default: `true`. */
  autoSort?: boolean;
  /** Optional mask image for custom cloud shapes. */
  maskImage?: HTMLImageElement | HTMLCanvasElement;
}
