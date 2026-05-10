import { chartRegistry, pruneDetachedCharts } from './registry.js';
import { resetColorMap } from './themes/index.js';

export interface IChartsConfig {
  consistentColors: boolean;
}

let currentConfig: IChartsConfig = {
  consistentColors: false,
};

export function configure(opts: Partial<IChartsConfig>): void {
  const prev = { ...currentConfig };
  currentConfig = { ...currentConfig, ...opts };

  if (prev.consistentColors !== currentConfig.consistentColors) {
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

export function getConfig(): Readonly<IChartsConfig> {
  return currentConfig;
}
