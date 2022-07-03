import { ThemeOptions } from '../types';
import { buildAxisTheme } from './axis';
import { buildBasicTheme } from './basic';
import { buildLegendTheme } from './legend';
import { buildMarkPoint } from './markpoint';
import { buildBarTheme, buildLineTheme, buildPieTheme } from './series';

export function buildTheme(options: ThemeOptions) {
  return {
    base: options,
    ...buildBasicTheme(options),
    ...buildLegendTheme(options),
    ...buildAxisTheme(options),
    ...buildBarTheme(options),
    ...buildLineTheme(options),
    ...buildMarkPoint(options),
    ...buildPieTheme(options),
  };
}
