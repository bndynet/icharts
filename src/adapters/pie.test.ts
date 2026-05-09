import { describe, it, expect } from 'vitest';
import type { PieData, PieChartOptions, PieVariant } from '../types.js';
import { isPieData } from '../types.js';
import { resolvePieOptions, __test } from './pie.js';

const { computeEdgeReserves, computePieLayout } = __test;

const sample: PieData = [
  { name: 'Premium',  value: 420 },
  { name: 'Pro',      value: 880 },
  { name: 'Standard', value: 1240 },
  { name: 'Basic',    value: 1180 },
  { name: 'Trial',    value: 175 },
];

// Pie now returns ChartSetupResult — tests access `.option` for the static
// tree and `.onInit` for the pixel-layout hook. The pixel math itself is
// pinned via the `__test` namespace below to avoid spinning up a real
// ECharts instance just to assert geometry.

const optOf = (r: ReturnType<typeof resolvePieOptions>): Record<string, unknown> =>
  r.option as Record<string, unknown>;
const seriesOf = (r: ReturnType<typeof resolvePieOptions>): Record<string, unknown> =>
  (optOf(r).series as Record<string, unknown>[])[0];
const labelOf = (r: ReturnType<typeof resolvePieOptions>): Record<string, unknown> =>
  seriesOf(r).label as Record<string, unknown>;

describe('pie adapter', () => {
  describe('resolvePieOptions — static option', () => {
    it('builds a single pie series with slices sorted by value desc', () => {
      const result = resolvePieOptions(sample, {});
      const series = optOf(result).series as Record<string, unknown>[];
      expect(series).toHaveLength(1);
      expect(series[0].type).toBe('pie');
      const data = series[0].data as Array<{ name: string; value: number }>;
      expect(data.map((d) => d.name)).toEqual(['Standard', 'Basic', 'Pro', 'Premium', 'Trial']);
    });

    it('keeps data order when autoSort is false', () => {
      const result = resolvePieOptions(sample, { autoSort: false });
      const data = seriesOf(result).data as Array<{ name: string }>;
      expect(data.map((d) => d.name)).toEqual(sample.map((d) => d.name));
    });

    it('hides outside slice labels by default when legend is shown', () => {
      const result = resolvePieOptions(sample, { legend: { show: true } });
      expect(labelOf(result).show).toBe(false);
    });

    it('shows outside slice labels by default when legend is hidden', () => {
      const result = resolvePieOptions(sample, {});
      expect(labelOf(result).show).toBe(true);
    });

    it('honors showSliceLabel: true even when legend is shown', () => {
      const result = resolvePieOptions(sample, {
        legend: { show: true },
        showSliceLabel: true,
      });
      expect(labelOf(result).show).toBe(true);
    });

    it('honors showSliceLabel: false even when legend is hidden', () => {
      const result = resolvePieOptions(sample, { showSliceLabel: false });
      expect(labelOf(result).show).toBe(false);
    });

    it('emits the half-doughnut sweep angles', () => {
      const result = resolvePieOptions(sample, { variant: 'half-doughnut' });
      const series = seriesOf(result);
      expect(series.startAngle).toBe(180);
      expect(series.endAngle).toBe(360);
    });

    it('emits roseType: radius for the nightingale variant', () => {
      const result = resolvePieOptions(sample, { variant: 'nightingale' });
      expect(seriesOf(result).roseType).toBe('radius');
    });

    it('exposes an onInit hook for adaptive pixel layout', () => {
      // The hook is what makes layout adapt to real canvas dimensions —
      // without it the static option's centered fallback would be the
      // only thing the chart ever sees.
      const result = resolvePieOptions(sample, {});
      expect(typeof result.onInit).toBe('function');
    });

    it('applies a palette color array sized to the number of slices', () => {
      const result = resolvePieOptions(sample, {});
      const colors = optOf(result).color as string[];
      expect(Array.isArray(colors)).toBe(true);
      expect(colors).toHaveLength(sample.length);
      for (const c of colors) expect(c).toMatch(/^#/);
    });

    it('respects options.colorMap by slice name', () => {
      const result = resolvePieOptions(sample, {
        colorMap: { Premium: '#ffd166', Pro: '#118ab2' },
      });
      const colors = optOf(result).color as string[];
      // Slices are sorted by value desc, but `option.color` follows the
      // original `names` order so consistency with the legend holds.
      expect(colors[0]).toBe('#ffd166');
      expect(colors[1]).toBe('#118ab2');
    });

    it('merges options.echarts last and lets the palette win on color', () => {
      const result = resolvePieOptions(sample, {
        colorMap: { Premium: '#aaaaaa' },
        echarts: {
          color: ['#111111'],
          series: [{ selectedMode: 'single' }],
        },
      });
      expect((optOf(result).series as Record<string, unknown>[])[0].selectedMode).toBe('single');
      expect((optOf(result).color as string[])[0]).toBe('#aaaaaa');
    });
  });

  // -------------------------------------------------------------------------
  // Pixel-layout math (the actual fix for the side-legend overlap regression
  // that motivated this adapter rewrite). Tested via `__test` helpers because
  // a real ECharts instance + canvas is overkill for asserting geometry.
  // -------------------------------------------------------------------------
  describe('pixel-accurate layout', () => {
    const layout = (
      W: number,
      H: number,
      variant: PieVariant = 'default',
      options: PieChartOptions = {},
      showLegend = false,
      showSliceLabel = !showLegend,
      names: ReadonlyArray<string> = sample.map((d) => d.name),
    ) => {
      const reserves = computeEdgeReserves(options, showLegend, showSliceLabel, names, W);
      return computePieLayout(W, H, reserves, variant, options);
    };

    it('centers the pie on the full canvas when no widgets compete for space', () => {
      const { center } = layout(400, 400, 'default', { showSliceLabel: false }, false, false, []);
      expect(center[0]).toBe(200);
      expect(center[1]).toBe(200);
    });

    it('fills the canvas with a sensible radius when there are no reserves', () => {
      const { radius } = layout(400, 400, 'default', { showSliceLabel: false }, false, false, []);
      const outer = radius[1] as number;
      // 200 px is half the canvas; the fill factor leaves a small cushion.
      expect(outer).toBeGreaterThan(120);
      expect(outer).toBeLessThanOrEqual(200);
    });

    it('a right-side legend with wide labels keeps the doughnut clear of the legend (the regression)', () => {
      // The original bug: at narrow card widths, the percent-based math
      // under-shifted the center and the doughnut's right edge overlapped
      // the legend column. With pixel math, the body lives in the area
      // LEFT of the right-legend reserve, period.
      const W = 380;
      const H = 340;
      const { center, radius } = layout(
        W,
        H,
        'doughnut',
        { legend: { show: true, position: 'right' } },
        true,
        false, // legend shown → slice labels off
      );
      const cx = center[0];
      const outer = radius[1] as number;
      const reserves = computeEdgeReserves(
        { legend: { show: true, position: 'right' } },
        true,
        false,
        sample.map((d) => d.name),
      );
      // Right edge of doughnut must sit inside the body area (canvas - right reserve).
      expect(cx + outer).toBeLessThanOrEqual(W - reserves.right);
      // Center is shifted left of canvas midpoint to make room.
      expect(cx).toBeLessThan(W / 2);
    });

    it('mirrors the same shift for every legend position', () => {
      const W = 400;
      const H = 400;
      const top = layout(W, H, 'default', { legend: { show: true, position: 'top' } }, true, false);
      const bottom = layout(W, H, 'default', { legend: { show: true, position: 'bottom' } }, true, false);
      const left = layout(W, H, 'default', { legend: { show: true, position: 'left' } }, true, false);
      const right = layout(W, H, 'default', { legend: { show: true, position: 'right' } }, true, false);

      // top legend → center moves down; bottom legend → center moves up.
      expect(top.center[1]).toBeGreaterThan(H / 2);
      expect(bottom.center[1]).toBeLessThan(H / 2);
      // left legend → center moves right; right legend → center moves left.
      expect(left.center[0]).toBeGreaterThan(W / 2);
      expect(right.center[0]).toBeLessThan(W / 2);
    });

    it('shrinks the radius more on narrower canvases (vs. wider) with the same reserves', () => {
      const narrow = layout(
        300,
        340,
        'doughnut',
        { legend: { show: true, position: 'right' } },
        true,
        false,
      );
      const wide = layout(
        720,
        340,
        'doughnut',
        { legend: { show: true, position: 'right' } },
        true,
        false,
      );
      expect((narrow.radius[1] as number)).toBeLessThan(wide.radius[1] as number);
    });

    it('side legend with wider labels carves out more horizontal reserve than short labels', () => {
      const shortNames = ['A', 'B', 'C'];
      const longNames = ['A really very long legend label 1', 'A really very long legend label 2'];
      const shortReserves = computeEdgeReserves(
        { legend: { show: true, position: 'right' } },
        true,
        false,
        shortNames,
      );
      const longReserves = computeEdgeReserves(
        { legend: { show: true, position: 'right' } },
        true,
        false,
        longNames,
      );
      expect(longReserves.right).toBeGreaterThan(shortReserves.right);
    });

    it('shifts center down when a title is set (no legend, no labels)', () => {
      const noTitle = layout(400, 400, 'default', { showSliceLabel: false }, false, false, []);
      const titled = layout(400, 400, 'default', { title: 'Mix', showSliceLabel: false }, false, false, []);
      expect(titled.center[1]).toBeGreaterThan(noTitle.center[1]);
    });

    it('keeps user-supplied outerRadius even when reserves are present', () => {
      const { radius } = layout(
        400,
        400,
        'doughnut',
        { legend: { show: true, position: 'bottom' }, outerRadius: 80 },
        true,
        false,
      );
      expect(radius[1]).toBe(80);
    });

    it('keeps user-supplied innerRadius on doughnut and half-doughnut', () => {
      const dough = layout(
        400,
        400,
        'doughnut',
        { innerRadius: '40%' },
        false,
        true,
      );
      const half = layout(
        400,
        400,
        'half-doughnut',
        { innerRadius: 50 },
        false,
        true,
      );
      expect(dough.radius[0]).toBe('40%');
      expect(half.radius[0]).toBe(50);
    });

    it('half-doughnut centers the arc bounding rect vertically in the available area', () => {
      // Previously the half-doughnut was glued to the canvas bottom, which
      // looked fine in compact cards but left huge top-whitespace in tall
      // ones (e.g. when a grid row stretched the card to match a taller
      // sibling). Centering the arc's bounding rect (`width: 2r, height: r`)
      // in the available area gives even visual gap above and below.
      const W = 400;
      const H = 400;
      const { center, radius } = layout(
        W,
        H,
        'half-doughnut',
        { showSliceLabel: false },
        false,
        false,
        [],
      );
      const r = radius[1] as number;
      const topWhitespace = center[1] - r; // canvas top → arc top
      const bottomWhitespace = H - center[1]; // arc bottom (diameter) → canvas bottom
      expect(Math.abs(topWhitespace - bottomWhitespace)).toBeLessThanOrEqual(1);
    });

    it('half-doughnut in a tall card uses the extra vertical room evenly', () => {
      // The motivating case: chart-box-lg cards in `dash-row-5-4-3` stretch
      // to match a tall sibling, leaving lots of vertical slack. The arc
      // should sit roughly in the middle, not glued to the bottom.
      const W = 460;
      const H = 800; // tall card with lots of room
      const { center, radius } = layout(
        W,
        H,
        'half-doughnut',
        {},
        true, // legend shown
        false,
        ['Premium', 'Pro', 'Standard', 'Basic', 'Churned'],
      );
      const r = radius[1] as number;
      // Arc bottom (cy) should be well above the canvas bottom, not pinned to it.
      expect(center[1]).toBeLessThan(H - 100);
      // Arc top should be well below the canvas top, not pinned to it.
      expect(center[1] - r).toBeGreaterThan(100);
    });

    it('reserves more bottom space when a horizontal legend wraps to multiple rows', () => {
      // The half-doughnut card in the dashboard exposes this: 5 tier names
      // pack into one row at 720 px wide but wrap to two at 320 px, and the
      // single-row reserve baked into LEGEND_RESERVE used to let the arc's
      // bottom-left corner land on top of the wrapped label.
      // (Width chosen so the row count flips in both browser canvas
      // measurement and Node's char-width fallback — see text-measure.ts.)
      const names = ['Premium', 'Pro', 'Standard', 'Basic', 'Churned'];
      const wide = computeEdgeReserves(
        { legend: { show: true, position: 'bottom' } },
        true,
        false,
        names,
        1200,
      );
      const narrow = computeEdgeReserves(
        { legend: { show: true, position: 'bottom' } },
        true,
        false,
        names,
        320,
      );
      expect(narrow.bottom).toBeGreaterThan(wide.bottom);
    });

    it('half-doughnut clears a multi-row bottom legend', () => {
      const W = 320;
      const H = 360;
      const names = ['Premium', 'Pro', 'Standard', 'Basic', 'Churned'];
      const reserves = computeEdgeReserves(
        { legend: { show: true, position: 'bottom' } },
        true,
        false,
        names,
        W,
      );
      const { center, radius } = computePieLayout(
        W,
        H,
        reserves,
        'half-doughnut',
        {},
      );
      const outer = radius[1] as number;
      const arcBottomY = center[1]; // half-arc bottom is the diameter line
      const legendTopY = H - 12 /* chart padding */ - (reserves.bottom - 12);
      // The arc's diameter line must sit ABOVE the legend's top edge —
      // otherwise the bottom slices visually overlap the labels.
      expect(arcBottomY).toBeLessThanOrEqual(legendTopY);
      // Sanity: the arc still has a real radius and didn't collapse.
      expect(outer).toBeGreaterThan(40);
    });

    it('half-doughnut radius fits inside the canvas (regression for the 2x-2x bug)', () => {
      // Previously the formula multiplied by 2 twice and produced a radius
      // bigger than the canvas itself, pushing the arc above the viewport.
      // The radius must not exceed half the width and must clear the top.
      const W = 640;
      const H = 400;
      const { center, radius } = layout(
        W,
        H,
        'half-doughnut',
        { legend: { show: true, position: 'bottom' } },
        true,
        false,
      );
      const outer = radius[1] as number;
      expect(outer).toBeLessThanOrEqual(W / 2);
      // Top of arc = cy - r must be >= 0 (inside the canvas).
      expect(center[1] - outer).toBeGreaterThanOrEqual(0);
    });

    it('floors the radius at PIE_MIN_RADIUS_PX so the pie never collapses', () => {
      // A very small canvas would otherwise compute a sub-1px radius and
      // visually disappear; the floor keeps a recognisable disc on-screen.
      const { radius } = layout(40, 40, 'default', { showSliceLabel: false }, false, false, []);
      expect(radius[1] as number).toBeGreaterThanOrEqual(20);
    });
  });

  describe('isPieData', () => {
    it('accepts well-formed pie data', () => {
      expect(isPieData(sample)).toBe(true);
    });

    it('rejects XY-shaped data', () => {
      expect(
        isPieData({
          categories: ['A', 'B'],
          series: [{ name: 'S', data: [1, 2] }],
        } as unknown as PieData),
      ).toBe(false);
    });

    it('rejects graph-shaped data', () => {
      expect(
        isPieData({ nodes: [{ name: 'A' }], links: [] } as unknown as PieData),
      ).toBe(false);
    });

    it('rejects gauge-shaped data', () => {
      expect(isPieData({ value: 42, max: 100 } as unknown as PieData)).toBe(false);
    });
  });
});
