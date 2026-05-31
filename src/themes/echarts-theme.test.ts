import { describe, it, expect } from 'vitest';
import { buildEChartsTheme } from './echarts-theme.js';
import type { ChartThemeColors } from './types.js';
import { DEFAULT_LABEL_FONT_SIZE } from '../adapters/common/text-measure.js';

/**
 * Locks in the contract that adapters rely on: every chart family's
 * canvas-rendered text (data labels, node labels, axis names) draws its
 * color from the THEME, not from the adapter. Without these series-type
 * defaults, switching to a dark theme would leave the text rendered in
 * ECharts' built-in near-black default, which is illegible.
 *
 * The adapters intentionally do NOT set `label.color` / `endLabel.color` /
 * `edgeLabel.color` — see `pie.ts` / `network.ts` (`label.position` etc.
 * with no color) for the canonical pattern. Removing the entries below
 * would silently break the corresponding chart type on any non-light theme.
 *
 * AGENTS.md "Layout rule #6" documents the full two-sided contract;
 * any new chart that emits canvas-rendered text MUST add a matching
 * assertion here when wiring its `<seriesType>.<field>.color` into
 * `echarts-theme.ts`.
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

  it('map.label.color follows textPrimary (map region labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.label.color).toBe(COLORS.textPrimary);
  });

  it('map.label has a `surface`-colored text halo for readability on filled regions', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.label.textBorderColor).toBe(COLORS.surface);
    expect(theme.map.label.textBorderWidth).toBe(2);
  });

  it('map.emphasis.label keeps the same halo on hover', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.emphasis.label.color).toBe(COLORS.textPrimary);
    expect(theme.map.emphasis.label.textBorderColor).toBe(COLORS.surface);
    expect(theme.map.emphasis.label.textBorderWidth).toBe(2);
  });

  it('map.itemStyle.areaColor follows surface (region fallback fill)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.itemStyle.areaColor).toBe(COLORS.surface);
  });

  it('map.itemStyle.borderColor follows axisLine (region borders)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.itemStyle.borderColor).toBe(COLORS.axisLine);
    expect(theme.map.itemStyle.borderWidth).toBe(1);
  });

  it('visualMap.textStyle.color follows textPrimary (map value legend text)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.visualMap.textStyle.color).toBe(COLORS.textPrimary);
  });

  it('graph.label.color follows textPrimary (network node labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.graph.label.color).toBe(COLORS.textPrimary);
  });

  it('graph.edgeLabel.color follows textPrimary (network link labels when showLinkLabel)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.graph.edgeLabel.color).toBe(COLORS.textPrimary);
  });

  it('sankey.label has a `surface`-colored text halo (so vertical-variant labels stay readable on palette-colored nodes; harmless on horizontal where labels sit beside the node)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.sankey.label.textBorderColor).toBe(COLORS.surface);
    expect(theme.sankey.label.textBorderWidth).toBe(2);
  });

  it('sankey.label.color follows textPrimary (sankey node labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.sankey.label.color).toBe(COLORS.textPrimary);
  });

  it('chord.label.color follows textPrimary (chord node labels around the ring)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.chord.label.color).toBe(COLORS.textPrimary);
  });

  it('tree.label.color follows textPrimary (tree node labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.tree.label.color).toBe(COLORS.textPrimary);
  });

  it('treemap.label.color follows textPrimary (treemap rectangle labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.label.color).toBe(COLORS.textPrimary);
  });

  it('treemap.label has a `surface`-colored text halo (so dark text stays readable on mid-tone palette rectangles)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.label.textBorderColor).toBe(COLORS.surface);
    expect(theme.treemap.label.textBorderWidth).toBe(2);
  });

  it('treemap.upperLabel has the same `surface`-colored halo as label (drilled-in parent bar reads on the same palette colors)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.upperLabel.textBorderColor).toBe(COLORS.surface);
    expect(theme.treemap.upperLabel.textBorderWidth).toBe(2);
  });

  it('treemap.upperLabel.color follows textPrimary (parent-name bar when enabled)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.upperLabel.color).toBe(COLORS.textPrimary);
  });

  it('treemap.itemStyle.borderColor follows itemDivider when defined', () => {
    const colors: ChartThemeColors = { ...COLORS, itemDivider: '#abcdef' };
    const theme = buildEChartsTheme(colors, PALETTE);
    expect(theme.treemap.itemStyle.borderColor).toBe('#abcdef');
  });

  it('treemap.itemStyle.borderColor falls back to surface when itemDivider is omitted', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.itemStyle.borderColor).toBe(COLORS.surface);
  });

  it('treemap.breadcrumb resting fill follows gridLine (subtle elevation above the card — using surface would match card-bg and hide the chip)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.itemStyle.color).toBe(COLORS.gridLine);
  });

  it('treemap.breadcrumb resting border follows axisLine (one tier above the fill)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.itemStyle.borderColor).toBe(COLORS.axisLine);
  });

  it('treemap.breadcrumb resting text color follows textPrimary (readable on gridLine)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.itemStyle.textStyle.color).toBe(
      COLORS.textPrimary,
    );
  });

  it('treemap.breadcrumb emphasis fill follows axisLine (overrides ECharts hardcoded orange #e6a23c hover default)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.emphasis.itemStyle.color).toBe(
      COLORS.axisLine,
    );
  });

  it('treemap.breadcrumb emphasis border follows textSecondary (one tier above the hover fill)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.emphasis.itemStyle.borderColor).toBe(
      COLORS.textSecondary,
    );
  });

  it('treemap.breadcrumb emphasis text color follows textPrimary (stays readable on hover)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.breadcrumb.emphasis.itemStyle.textStyle.color).toBe(
      COLORS.textPrimary,
    );
  });

  it('custom.label.color follows textPrimary (wordcloud + liquidprogress labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.custom.label.color).toBe(COLORS.textPrimary);
  });

  it('tree.lineStyle.color follows axisLine (connector branches stay visible on dark themes)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.tree.lineStyle.color).toBe(COLORS.axisLine);
  });

  it('changing textPrimary changes every label color in lockstep', () => {
    const a = buildEChartsTheme({ ...COLORS, textPrimary: '#aaaaaa' }, PALETTE);
    const b = buildEChartsTheme({ ...COLORS, textPrimary: '#bbbbbb' }, PALETTE);
    expect(a.bar.label.color).toBe('#aaaaaa');
    expect(a.line.label.color).toBe('#aaaaaa');
    expect(a.line.endLabel.color).toBe('#aaaaaa');
    expect(a.visualMap.textStyle.color).toBe('#aaaaaa');
    expect(a.map.label.color).toBe('#aaaaaa');
    expect(a.map.itemStyle.areaColor).toBe(COLORS.surface);
    expect(a.map.itemStyle.borderColor).toBe(COLORS.axisLine);
    expect(a.radar.axisName.color).toBe('#aaaaaa');
    expect(a.graph.label.color).toBe('#aaaaaa');
    expect(a.graph.edgeLabel.color).toBe('#aaaaaa');
    expect(a.sankey.label.color).toBe('#aaaaaa');
    expect(a.chord.label.color).toBe('#aaaaaa');
    expect(a.tree.label.color).toBe('#aaaaaa');
    expect(a.treemap.label.color).toBe('#aaaaaa');
    expect(a.treemap.upperLabel.color).toBe('#aaaaaa');
    expect(a.treemap.breadcrumb.itemStyle.textStyle.color).toBe('#aaaaaa');
    expect(a.treemap.breadcrumb.emphasis.itemStyle.textStyle.color).toBe('#aaaaaa');
    expect(a.custom.label.color).toBe('#aaaaaa');
    expect(b.bar.label.color).toBe('#bbbbbb');
    expect(b.line.label.color).toBe('#bbbbbb');
    expect(b.line.endLabel.color).toBe('#bbbbbb');
    expect(b.visualMap.textStyle.color).toBe('#bbbbbb');
    expect(b.map.label.color).toBe('#bbbbbb');
    expect(b.map.itemStyle.areaColor).toBe(COLORS.surface);
    expect(b.map.itemStyle.borderColor).toBe(COLORS.axisLine);
    expect(b.radar.axisName.color).toBe('#bbbbbb');
    expect(b.graph.label.color).toBe('#bbbbbb');
    expect(b.graph.edgeLabel.color).toBe('#bbbbbb');
    expect(b.sankey.label.color).toBe('#bbbbbb');
    expect(b.chord.label.color).toBe('#bbbbbb');
    expect(b.tree.label.color).toBe('#bbbbbb');
    expect(b.treemap.label.color).toBe('#bbbbbb');
    expect(b.treemap.upperLabel.color).toBe('#bbbbbb');
    expect(b.treemap.breadcrumb.itemStyle.textStyle.color).toBe('#bbbbbb');
    expect(b.treemap.breadcrumb.emphasis.itemStyle.textStyle.color).toBe('#bbbbbb');
    expect(b.custom.label.color).toBe('#bbbbbb');
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

  // ---------------------------------------------------------------------
  // Label fontSize fallbacks
  //
  // Every `<seriesType>.label.fontSize` (and `<seriesType>.edgeLabel.fontSize`)
  // ships the canonical `DEFAULT_LABEL_FONT_SIZE` so an adapter that
  // forgets to emit `fontSize` still renders at the project-canonical
  // 12 px rather than ECharts' built-in per-series-type default. This is
  // the *fallback* layer of the two-sided contract — adapter overrides
  // (driven by `ChartOptions.labelFontSize` via `getLabelFontSize(...)`)
  // win at the series level. See `echarts-theme.ts` docblock + AGENTS.md
  // "Layout rule #6".
  // ---------------------------------------------------------------------

  it('bar.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.bar.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('line.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.line.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('line.endLabel.fontSize falls back to DEFAULT_LABEL_FONT_SIZE (covers race tracking labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.line.endLabel.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('pie.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.pie.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('map.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.map.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('graph.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE (network node labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.graph.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('graph.edgeLabel.fontSize falls back to DEFAULT_LABEL_FONT_SIZE (network link labels)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.graph.edgeLabel.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('sankey.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.sankey.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('chord.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.chord.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('tree.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.tree.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('treemap.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('treemap.upperLabel.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.treemap.upperLabel.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('custom.label.fontSize falls back to DEFAULT_LABEL_FONT_SIZE', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.custom.label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
  });

  it('every themed label.fontSize entry agrees on DEFAULT_LABEL_FONT_SIZE (lockstep regression)', () => {
    const theme = buildEChartsTheme(COLORS, PALETTE);
    const sizes = [
      theme.bar.label.fontSize,
      theme.line.label.fontSize,
      theme.line.endLabel.fontSize,
      theme.pie.label.fontSize,
      theme.map.label.fontSize,
      theme.graph.label.fontSize,
      theme.graph.edgeLabel.fontSize,
      theme.sankey.label.fontSize,
      theme.chord.label.fontSize,
      theme.tree.label.fontSize,
      theme.treemap.label.fontSize,
      theme.treemap.upperLabel.fontSize,
      theme.custom.label.fontSize,
    ];
    for (const size of sizes) {
      expect(size).toBe(DEFAULT_LABEL_FONT_SIZE);
    }
  });

  // ---------------------------------------------------------------------
  // itemDivider — the dedicated knob for pie-slice / future sunburst /
  // treemap / sankey-node "fake-gap" strokes. Decoupled from `surface`
  // (which is the tooltip surface) so themes whose card background
  // differs from their tooltip background can drive each independently.
  //
  // Contract:
  //   - When the theme defines `itemDivider`, pie.itemStyle.borderColor
  //     follows it verbatim.
  //   - When omitted, falls back to `surface` so every theme that
  //     existed before this token shipped keeps its previous behaviour.
  //
  // This is the structural counterpart to the label-color contract
  // above (AGENTS.md "Layout rule #6"): adapters MUST NOT set
  // `series.itemStyle.borderColor` from the active palette; the theme
  // owns it so a single `setTheme(...)` repaints every pie at once.
  // ---------------------------------------------------------------------

  it('pie.itemStyle.borderColor follows itemDivider when defined', () => {
    const colors: ChartThemeColors = { ...COLORS, itemDivider: '#ff00ff' };
    const theme = buildEChartsTheme(colors, PALETTE);
    expect(theme.pie.itemStyle.borderColor).toBe('#ff00ff');
  });

  it('pie.itemStyle.borderColor falls back to surface when itemDivider is omitted', () => {
    // `COLORS` deliberately omits `itemDivider` — passing it directly
    // exercises the fallback path that any custom theme written
    // against the older type would hit. The meta-assertion below pins
    // that fact so the test fails fast if a future maintainer adds
    // `itemDivider` to the shared fixture and silently invalidates
    // this branch of the contract.
    expect((COLORS as { itemDivider?: string }).itemDivider).toBeUndefined();
    const theme = buildEChartsTheme(COLORS, PALETTE);
    expect(theme.pie.itemStyle.borderColor).toBe(COLORS.surface);
  });

  it('changing itemDivider repaints pie.itemStyle.borderColor without touching surface-driven surfaces', () => {
    const a = buildEChartsTheme({ ...COLORS, itemDivider: '#111111' }, PALETTE);
    const b = buildEChartsTheme({ ...COLORS, itemDivider: '#222222' }, PALETTE);
    expect(a.pie.itemStyle.borderColor).toBe('#111111');
    expect(b.pie.itemStyle.borderColor).toBe('#222222');
    // `surface`-driven surfaces (tooltip bg + axis-pointer callout bg)
    // must NOT have moved — they read `surface`, not `itemDivider`.
    expect(a.tooltip.backgroundColor).toBe(b.tooltip.backgroundColor);
    expect(a.tooltip.axisPointer.label.backgroundColor).toBe(
      b.tooltip.axisPointer.label.backgroundColor,
    );
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
