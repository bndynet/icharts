import { chartRegistry } from './registry.js';
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
    for (const chart of chartRegistry) {
      chart.update();
    }
  }
}

export function getConfig(): Readonly<IChartsConfig> {
  return currentConfig;
}
