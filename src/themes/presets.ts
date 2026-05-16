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
  // White card background is the dominant business-app default (Element
  // Plus / Tailwind / Ant Design ship `#ffffff` panels), so a white 1 px
  // pie-slice border reads as a true gap. Numerically equals `surface`
  // here, but the two tokens are semantically independent — themes whose
  // tooltip surface differs from their card background (see `dash-scifi`)
  // override one without touching the other.
  itemDivider: '#ffffff',

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

  // Structure — same visual hierarchy as the light theme, walked one
  // step up the slate scale per token so each rule stays visible
  // against a slate-800 surface:
  //   surface  (#1e293b, slate-800)
  //   gridLine (#334155, slate-700) — subtle but legible rules
  //   axisLine (#475569, slate-600) — clearly more prominent frame
  // Earlier versions used `gridLine: '#1e293b'` (= surface), which made
  // every XY splitLine and radar ring disappear on the default dark
  // dashboard background.
  gridLine: '#334155',
  axisLine: '#475569',
  // Matches the slate-800 panel color most dark dashboards put behind
  // their cards, so a 1 px pie-slice border reads as a true gap. Same
  // value as `surface` here purely by coincidence (both happen to map
  // to slate-800 in the canonical dark theme) — the two tokens are
  // semantically independent (see ChartThemeColors.itemDivider).
  itemDivider: '#1e293b',

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
