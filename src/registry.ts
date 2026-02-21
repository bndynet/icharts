import type { IChartInstance } from './types.js';

/**
 * Global registry of all live IChart instances.
 * Used by {@link switchTheme} to propagate theme changes to every chart.
 */
export const chartRegistry = new Set<IChartInstance>();
