import { chartRegistry, pruneDetachedCharts } from './registry.js';
import { resetColorMap } from './themes/index.js';

export interface IChartsConfig {
  consistentColors: boolean;
  fontFamily?: string;
}

const DEFAULT_CONFIG: Readonly<IChartsConfig> = {
  consistentColors: false,
  fontFamily: undefined,
};

let currentConfig: IChartsConfig = { ...DEFAULT_CONFIG };

export function configure(opts: Partial<IChartsConfig>): void {
  const prev = { ...currentConfig };
  currentConfig = { ...currentConfig, ...opts };

  const shouldRerender =
    prev.consistentColors !== currentConfig.consistentColors ||
    prev.fontFamily !== currentConfig.fontFamily;

  if (shouldRerender) {
    if (currentConfig.consistentColors) {
      resetColorMap();
    }
    // Same defensive prune as switchTheme — re-rendering a detached chart
    // is wasted work and (with consistentColors: true) writes its series
    // names into the freshly-cleared colorMap, recreating the cross-page
    // palette drift this rebuild is meant to fix. See registry.ts.
    pruneDetachedCharts();
    for (const chart of chartRegistry) {
      chart.update();
    }
  }
}

/** Reset configure() state back to library defaults. */
export function resetConfiguration(): void {
  configure({ ...DEFAULT_CONFIG });
}

export function getConfig(): Readonly<IChartsConfig> {
  return currentConfig;
}
