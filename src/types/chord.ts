import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

export interface ChordNode {
  name: string;
  /** Optional fixed color for this node's arc and outgoing ribbons */
  color?: string;
  /**
   * Relative weight of the node arc.
   * When omitted the arc size is derived from the sum of connected link values.
   */
  value?: number;
}

export interface ChordLink {
  source: string;
  target: string;
  value: number;
}

export interface ChordData {
  nodes: ChordNode[];
  links: ChordLink[];
}

/**
 * ChordData and SankeyData share the same runtime shape ({ nodes, links }).
 * The chart type — not the data shape — determines which adapter is used.
 * This guard validates the structural contract for ChordData.
 */
export function isChordData(data: ChartData): data is ChordData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'nodes' in data &&
    'links' in data &&
    Array.isArray((data as ChordData).nodes) &&
    Array.isArray((data as ChordData).links)
  );
}

/**
 * Chord-chart-specific options.
 *
 * No chord-specific knobs today (chord has no variants and no extra fields
 * beyond {@link ChartOptions}); kept as a named subtype so consumers and
 * adapters can express intent and we have a stable home for future
 * chord-only knobs.
 */
export type ChordChartOptions = ChartOptions;
