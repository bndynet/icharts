import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

export type SankeyVariant = 'default' | 'vertical';

export interface SankeyNode {
  name: string;
  /** Optional fixed color for this specific node */
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function isSankeyData(data: ChartData): data is SankeyData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'nodes' in data &&
    'links' in data &&
    Array.isArray((data as SankeyData).nodes) &&
    Array.isArray((data as SankeyData).links)
  );
}

export interface SankeyChartOptions extends ChartOptions {
  variant?: SankeyVariant;
}
