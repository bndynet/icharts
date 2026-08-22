import { chartRegistry, pruneDetachedCharts } from './registry.js';
import {
  resetColorMap,
  registerTheme,
  switchTheme,
  type ChartThemeConfig,
} from './themes/index.js';
import type { ChartStatusMessages, ChartStatusRenderer, IChartInstance } from './types.js';

interface StatusRendererConfigTarget extends IChartInstance {
  refreshStatusRenderer?: () => void;
}

export interface IChartsConfig {
  consistentColors: boolean;
  fontFamily?: string;
  theme?: ChartThemeConfig;
  /** Default loading / empty / error renderer used by charts without an override. */
  statusRenderer?: ChartStatusRenderer;
  /** Default messages used by the built-in status views. */
  statusMessages?: ChartStatusMessages;
}

const DEFAULT_CONFIG: Readonly<IChartsConfig> = {
  consistentColors: false,
  fontFamily: undefined,
  theme: undefined,
  statusRenderer: undefined,
  statusMessages: undefined,
};

let currentConfig: IChartsConfig = { ...DEFAULT_CONFIG };

export function configure(opts: Partial<IChartsConfig>): void {
  const prev = { ...currentConfig };
  currentConfig = { ...currentConfig, ...opts };
  if (opts.statusMessages) {
    currentConfig.statusMessages = {
      ...prev.statusMessages,
      ...opts.statusMessages,
    };
  }

  if (opts.theme) {
    const shouldRegister =
      !prev.theme ||
      prev.theme.name !== opts.theme.name ||
      prev.theme.colorMode !== opts.theme.colorMode ||
      prev.theme.colors !== opts.theme.colors ||
      prev.theme.palette !== opts.theme.palette;
    if (shouldRegister) {
      registerTheme(opts.theme);
    }
    switchTheme(opts.theme.name);
  }

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

  const statusMessagesChanged =
    prev.statusMessages?.loading !== currentConfig.statusMessages?.loading ||
    prev.statusMessages?.empty !== currentConfig.statusMessages?.empty ||
    prev.statusMessages?.error !== currentConfig.statusMessages?.error;
  if (prev.statusRenderer !== currentConfig.statusRenderer || statusMessagesChanged) {
    for (const chart of chartRegistry) {
      (chart as StatusRendererConfigTarget).refreshStatusRenderer?.();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ichartconfigchange'));
    }
  }
}

/** Reset configure() state back to library defaults. */
export function resetConfiguration(): void {
  switchTheme('light');
  configure({ ...DEFAULT_CONFIG });
}

export function getConfig(): Readonly<IChartsConfig> {
  return currentConfig;
}
