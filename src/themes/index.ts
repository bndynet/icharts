import * as echarts from 'echarts/core';
import { mergeObjects, removeUndefinedProperties } from '../utils';
import { buildTheme } from './builds';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { ThemeOptions } from './types';

export const themes: any = {
  light: lightTheme,
  dark: darkTheme,
};

export let defaultTheme = 'light';

export const darkThemeNames: string[] = ['dark'];

export function registerTheme(
  themeName: string,
  themeOptions: ThemeOptions,
  isDark?: boolean,
): void {
  themes[themeName] = createTheme(themeOptions, isDark);
  echarts.registerTheme(themeName, themes[themeName]);
  if (isDark) {
    darkThemeNames.push(themeName);
  }
}

export function isDarkTheme(name?: string): boolean {
  return darkThemeNames.includes(name || '');
}

export function setDefaultTheme(name: string): void {
  if (!themes[name]) {
    throw new Error(`The theme ${name} not registered.`);
  }
  defaultTheme = name;
}

function createTheme(options: ThemeOptions, basedOnDark?: boolean) {
  const baseTheme: ThemeOptions = basedOnDark ? darkTheme : lightTheme;
  return mergeObjects(
    baseTheme,
    removeUndefinedProperties(buildTheme(options)),
  );
}

Object.keys(themes).forEach((themeName) => {
  echarts.registerTheme(themeName, themes[themeName]);
});
