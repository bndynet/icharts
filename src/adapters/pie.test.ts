import { describe, it, expect, vi } from 'vitest';
import type { PieData, PieChartOptions, PieVariant } from '../types.js';
import { isPieData } from '../types.js';
import { resolvePieOptions, __test } from './pie.js';
import { DEFAULT_LABEL_FONT_SIZE } from './common/index.js';
import { getThemeColors } from '../themes/index.js';

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
      // ECharts pie maps `option.color[i]` to `series.data[i]` by index, so
      // the palette MUST follow the sorted slice order (the order ECharts
      // actually paints). Sample sorted by value desc:
      //   Standard(1240), Basic(1180), Pro(880), Premium(420), Trial(175)
      // → Pro at index 2, Premium at index 3.
      expect(colors[2]).toBe('#118ab2');
      expect(colors[3]).toBe('#ffd166');
    });

    it('aligns palette index with the painted slice (colorMap pin survives autoSort)', () => {
      // Regression: when `autoSort` reorders the slices, the palette must
      // follow the sort or ECharts paints the wrong slice with the pinned
      // color. Verify by checking that every name in `series.data` lands
      // on the same index as its color in `option.color`.
      const result = resolvePieOptions(sample, {
        colorMap: { Premium: '#ffd166' },
      });
      const series = (optOf(result).series as Record<string, unknown>[])[0];
      const sliceNames = (series.data as Array<{ name: string }>).map((d) => d.name);
      const palette = optOf(result).color as string[];
      const premiumIdx = sliceNames.indexOf('Premium');
      expect(palette[premiumIdx]).toBe('#ffd166');
    });

    it('keeps palette aligned to data order when autoSort is false', () => {
      // With sort off, slice order equals input order, so the palette
      // matches the input order too — no behavior change vs. the sorted
      // case from the user's perspective: the painted slice still gets
      // its pinned color.
      const result = resolvePieOptions(sample, {
        autoSort: false,
        colorMap: { Premium: '#ffd166' },
      });
      const palette = optOf(result).color as string[];
      expect(palette[0]).toBe('#ffd166');
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
      // Premium sorts to index 3 by value desc; palette must pin that index
      // to the colorMap entry (and override `echarts.color`).
      expect((optOf(result).color as string[])[3]).toBe('#aaaaaa');
    });

    it('threads legend.formatLabel into the resolved option', () => {
      // Builds an in-memory value lookup so the formatter can attach the
      // slice's value next to the name — the canonical "show more info"
      // use case the LegendOptions JSDoc documents.
      const valueByName = new Map(sample.map((d) => [d.name, d.value]));
      const result = resolvePieOptions(sample, {
        legend: {
          show: true,
          formatLabel: (name) => `${name} (${valueByName.get(name)})`,
        },
      });
      const legend = optOf(result).legend as Record<string, unknown>;
      const formatter = legend.formatter as (name: string) => string;
      expect(typeof formatter).toBe('function');
      expect(formatter('Pro')).toBe('Pro (880)');
      expect(formatter('Premium')).toBe('Premium (420)');
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

    it('auto-sizes doughnut ring width from container size when innerRadius is omitted', () => {
      const small = layout(
        240,
        240,
        'doughnut',
        { showSliceLabel: false },
        false,
        false,
        [],
      );
      const large = layout(
        520,
        520,
        'doughnut',
        { showSliceLabel: false },
        false,
        false,
        [],
      );
      const smallOuter = small.radius[1] as number;
      const smallInner = small.radius[0] as number;
      const largeOuter = large.radius[1] as number;
      const largeInner = large.radius[0] as number;
      const smallRing = smallOuter - smallInner;
      const largeRing = largeOuter - largeInner;

      // Mirrors gauge-like clamp policy: 240 -> 18 px, 520 -> clamp at 36 px.
      expect(smallRing).toBe(18);
      expect(largeRing).toBe(36);
      expect(largeRing).toBeGreaterThan(smallRing);
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

  describe('labelFontSize propagation', () => {
    it('series.label.fontSize defaults to DEFAULT_LABEL_FONT_SIZE', () => {
      const result = resolvePieOptions(sample, {});
      expect(labelOf(result).fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
    });

    it('series.label.fontSize honors ChartOptions.labelFontSize', () => {
      const result = resolvePieOptions(sample, { labelFontSize: 18 });
      expect(labelOf(result).fontSize).toBe(18);
    });
  });

  describe('centerLabels', () => {
    it('adds a center graphic text layer for multi-line labels', () => {
      const result = resolvePieOptions(sample, {
        variant: 'doughnut',
        centerLabels: ['80%', 'CPU'],
      });
      const series = optOf(result).series as Record<string, unknown>[];
      expect(series).toHaveLength(1);
      const graphic = (optOf(result).graphic as Record<string, unknown>[])[0];
      expect(graphic.type).toBe('text');
      expect(graphic.id).toBe('__ich_pie_center_labels');
      const style = graphic.style as Record<string, unknown>;
      expect(style.text).toBe('{cl0|80%}\n{cl1|CPU}');
      const rich = style.rich as Record<string, Record<string, unknown>>;
      expect(rich.cl0.fontWeight).toBe(700);
      expect(rich.cl0.fontSize).toBeGreaterThan(rich.cl1.fontSize as number);
      const colors = getThemeColors();
      expect(rich.cl0.color).toBe(colors?.textPrimary);
      expect(rich.cl1.color).toBe(colors?.textSecondary);
      expect(rich.cl1.fill).toBe(colors?.textSecondary);
    });

    it('auto-sizes center label fonts from container size', () => {
      const small = resolvePieOptions(
        sample,
        {
          variant: 'doughnut',
          centerLabels: ['80%', 'CPU'],
        },
        { containerWidth: 240, containerHeight: 240 },
      );
      const large = resolvePieOptions(
        sample,
        {
          variant: 'doughnut',
          centerLabels: ['80%', 'CPU'],
        },
        { containerWidth: 520, containerHeight: 520 },
      );

      const smallLabel =
        (((optOf(small).graphic as Record<string, unknown>[])[0].style as Record<
          string,
          unknown
        >).rich as Record<string, Record<string, unknown>>);
      const largeLabel =
        (((optOf(large).graphic as Record<string, unknown>[])[0].style as Record<
          string,
          unknown
        >).rich as Record<string, Record<string, unknown>>);

      expect(largeLabel.cl0.fontSize).toBeGreaterThan(smallLabel.cl0.fontSize as number);
      expect(largeLabel.cl1.fontSize).toBeGreaterThan(smallLabel.cl1.fontSize as number);
    });

    it('accepts RichTextSpec lines and keeps auto-size fallback on missing fontSize', () => {
      const result = resolvePieOptions(sample, {
        variant: 'doughnut',
        centerLabels: [
          { segments: [{ text: '80%', style: { fontWeight: 700 } }] },
          {
            segments: [
              { text: 'C', style: { color: '#a3b3cc' } },
              { text: 'PU', style: { color: '#a3b3cc' } },
            ],
          },
        ],
      });
      const graphic = (optOf(result).graphic as Record<string, unknown>[])[0];
      const style = graphic.style as Record<string, unknown>;
      const rich = style.rich as Record<string, Record<string, unknown>>;
      expect((style.text as string).includes('__ich_pie_center_')).toBe(true);
      expect(rich.__ich_pie_center_0_0.fontSize).toBeTypeOf('number');
      expect(rich.__ich_pie_center_1_0.color).toBe('#a3b3cc');
    });

    it('supports centerLabelOffset for fine-grained calibration', () => {
      const result = resolvePieOptions(sample, {
        variant: 'doughnut',
        centerLabels: ['80%', 'CPU'],
        centerLabelOffset: [12, -8],
      });
      const graphic = (optOf(result).graphic as Record<string, unknown>[])[0];
      expect(graphic.x).toBe(12);
      expect(graphic.y).toBe(-8);
    });

    it('refreshes ResizeObserver callback after theme changes (no stale center-label colors)', () => {
      const resizeCallbacks: Array<() => void> = [];
      const observe = vi.fn();
      const disconnect = vi.fn();
      class MockResizeObserver {
        constructor(cb: () => void) {
          resizeCallbacks.push(cb);
        }
        observe = observe;
        disconnect = disconnect;
      }

      const originalResizeObserver = globalThis.ResizeObserver;
      globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

      try {
        const setOptionCalls: Array<Record<string, unknown>> = [];
        const chart = {
          isDisposed: () => false,
          getWidth: () => 360,
          getHeight: () => 280,
          getDom: () => ({}) as HTMLElement,
          setOption: (payload: Record<string, unknown>) => {
            setOptionCalls.push(payload);
          },
        } as unknown as import('echarts').ECharts;

        resolvePieOptions(sample, {
          theme: 'light',
          variant: 'doughnut',
          centerLabels: ['80%', 'CPU'],
        }).onInit?.(chart);

        resolvePieOptions(sample, {
          theme: 'dark',
          variant: 'doughnut',
          centerLabels: ['80%', 'CPU'],
        }).onInit?.(chart);

        resizeCallbacks[0]?.();

        const lastPayload = setOptionCalls[setOptionCalls.length - 1] as Record<string, unknown>;
        const graphic = (lastPayload.graphic as Record<string, unknown>[])[0];
        const style = graphic.style as Record<string, unknown>;
        const rich = style.rich as Record<string, Record<string, unknown>>;
        expect(rich.cl0.color).toBe('#f1f5f9');
      } finally {
        globalThis.ResizeObserver = originalResizeObserver;
      }
    });
  });
});
