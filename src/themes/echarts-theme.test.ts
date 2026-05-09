import { describe, it, expect } from 'vitest';
import { buildEChartsTheme } from './echarts-theme.js';
import type { ChartThemeColors } from './types.js';

/**
 * Locks in the contract that adapters rely on: bar/line/pie data labels
 * (including race value labels and line-race endLabels) get their color
 * from the THEME, not from each adapter. Without these series-type
 * defaults, switching to a dark theme would leave race labels rendered
 * in ECharts' built-in near-black default, which is illegible.
 *
 * The adapters intentionally do NOT set `label.color` / `endLabel.color`
 * — see `pie.ts` (`label.position` etc. with no color) for the canonical
 * pattern. Removing the entries below would silently break race mode on
 * any non-light theme.
 */
const COLORS: ChartThemeColors = {
  background: '#0b1220',
  surface: '#1f2937',
  surfaceText: '#e5e7eb',
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  gridLine: '#374151',
  axisLine: '#4b5563',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const PALETTE = ['#60a5fa', '#34d399'];

describe('buildEChartsTheme — data-label colors are themed', () => {
  it('bar.label.color follows textPrimary (covers race value labels + showLabel)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.bar.label.color).toBe(COLORS.textPrimary);
  });

  it('line.label.color follows textPrimary (covers showLabel on line charts)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.line.label.color).toBe(COLORS.textPrimary);
  });

  it('line.endLabel.color follows textPrimary (covers line-race tracking labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.line.endLabel.color).toBe(COLORS.textPrimary);
  });

  it('pie.label.color still follows textPrimary (regression — pre-existing behavior)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.pie.label.color).toBe(COLORS.textPrimary);
  });

  it('changing textPrimary changes every label color in lockstep', () => {
    const a = buildEChartsTheme({ ...COLORS, textPrimary: '#aaaaaa' }, PALETTE);
    const b = buildEChartsTheme({ ...COLORS, textPrimary: '#bbbbbb' }, PALETTE);
    expect(a.bar.label.color).toBe('#aaaaaa');
    expect(a.line.label.color).toBe('#aaaaaa');
    expect(a.line.endLabel.color).toBe('#aaaaaa');
    expect(a.radar.axisName.color).toBe('#aaaaaa');
    expect(b.bar.label.color).toBe('#bbbbbb');
    expect(b.line.label.color).toBe('#bbbbbb');
    expect(b.line.endLabel.color).toBe('#bbbbbb');
    expect(b.radar.axisName.color).toBe('#bbbbbb');
  });

  it('radar.axisName.color follows textPrimary so indicator labels stay legible on dark themes', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.radar.axisName.color).toBe(COLORS.textPrimary);
  });

  it('radar.axisLine + splitLine follow the structural-line tokens', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.radar.axisLine.lineStyle.color).toBe(COLORS.axisLine);
    expect(theme.radar.splitLine.lineStyle.color).toBe(COLORS.gridLine);
  });

  it('radar grid lines stay in lockstep with XY axis grid lines (shared tokens)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    // Spokes / frame line — same `axisLine` token both places.
    expect(theme.radar.axisLine.lineStyle.color).toBe(
      theme.categoryAxis.axisLine.lineStyle.color,
    );
    expect(theme.radar.axisLine.lineStyle.color).toBe(
      theme.valueAxis.axisLine.lineStyle.color,
    );
    // Grid rules / concentric rings — same `gridLine` token both places.
    expect(theme.radar.splitLine.lineStyle.color).toBe(
      theme.categoryAxis.splitLine.lineStyle.color,
    );
    expect(theme.radar.splitLine.lineStyle.color).toBe(
      theme.valueAxis.splitLine.lineStyle.color,
    );
  });
});
