import * as echarts from 'echarts/core';
import { darkTheme } from './dark';
import { lightTheme } from './light';

export const themes: any = {
  light: lightTheme,
  dark: darkTheme,
};

export const defaultTheme = 'light';

export type Theme = typeof lightTheme & typeof darkTheme;

export function registerTheme(themeName: string, theme: Theme): void {
  themes[themeName] = theme;
  echarts.registerTheme(themeName, theme);
}

Object.keys(themes).forEach((themeName) => {
  echarts.registerTheme(themeName, themes[themeName]);
});
