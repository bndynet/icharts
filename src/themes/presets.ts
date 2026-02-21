import type { ChartTheme, ChartThemeColors } from './types.js';

// ---------------------------------------------------------------------------
// Series palettes
// ---------------------------------------------------------------------------
// Palettes are the *only* colors managed by ColorHub (series assignment).
// Light and dark variants use the same hue family but adjust lightness/saturation
// so each palette looks natural against its respective background.

const LIGHT_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
  '#6366f1', // indigo
];

const DARK_PALETTE = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#22d3ee', // cyan-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#818cf8', // indigo-400
];

// ---------------------------------------------------------------------------
// UI color tokens
// ---------------------------------------------------------------------------

const LIGHT_COLORS: ChartThemeColors = {
  // Surfaces
  background:   'transparent',
  surface:      '#ffffff', // axis-pointer callout — same light surface
  surfaceText:  '#111827',

  // Text
  textPrimary:   '#111827',
  textSecondary: '#6b7280',

  // Structure
  gridLine: '#f3f4f6', // barely visible rules
  axisLine: '#d1d5db', // slightly more prominent frame

  // Tooltip — light popup consistent with the light background
  tooltipBackground: '#ffffff',
  tooltipBorderColor: '#e5e7eb',
  tooltipTextColor:   '#111827',
  tooltipTitleColor:  '#6b7280', // slightly muted vs body text

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  danger:  '#ef4444',
  info:    '#3b82f6',
};

const DARK_COLORS: ChartThemeColors = {
  // Surfaces
  background:   'transparent',
  surface:      '#1e293b', // elevated panel, tooltip
  surfaceText:  '#e2e8f0',

  // Text
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',

  // Structure — gridLine shares surface level so grid "frames" the space;
  // axisLine is one step brighter so the axis spine is legible.
  gridLine: '#1e293b',
  axisLine: '#334155',

  // Tooltip — slightly elevated surface to pop above the chart canvas
  tooltipBackground: '#1e293b',
  tooltipBorderColor: '#334155',
  tooltipTextColor:   '#e2e8f0',
  tooltipTitleColor:  '#94a3b8', // muted slate for title vs bright body text

  // Semantic — slightly lighter variants for dark backgrounds
  success: '#4ade80',
  warning: '#fbbf24',
  danger:  '#f87171',
  info:    '#60a5fa',
};

// ---------------------------------------------------------------------------
// Exported themes
// ---------------------------------------------------------------------------

export const lightTheme: ChartTheme = {
  name:      'light',
  colorMode: 'light',
  palette:   LIGHT_PALETTE,
  colors:    LIGHT_COLORS,
};

export const darkTheme: ChartTheme = {
  name:      'dark',
  colorMode: 'dark',
  palette:   DARK_PALETTE,
  colors:    DARK_COLORS,
};

/** All built-in chart themes, in registration order. */
export const chartThemes: ChartTheme[] = [lightTheme, darkTheme];
