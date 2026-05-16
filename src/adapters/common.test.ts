import { describe, it, expect } from 'vitest';
import {
  LEGEND_RESERVE,
  STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM,
  STACKED_TEXT_DEFAULT_VISIBLE_GAP_PX,
  buildLegend,
  compileRichText,
  buildSparkTooltip,
  buildTooltip,
  computeStackedTextOffsets,
  getLegendReserve,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveSankeyOptions } from './sankey.js';
import { resolveChordOptions } from './chord.js';
import { resolveRadarOptions } from './radar.js';
import { deepMerge } from '../utils.js';

const EMPTY = { top: 0, bottom: 0, left: 0, right: 0 };
const SIDE_GAP = 8;

// Title geometry: fontSize + padding*2 + TITLE_CHART_GAP
// Defaults: fontSize=14, padding=8, gap=8 → 14 + 16 + 8 = 38
const DEFAULT_TITLE_HEIGHT = 38;

describe('getLegendReserve', () => {
  it('returns zeros on every edge when the legend is hidden', () => {
    expect(getLegendReserve({}, false)).toEqual(EMPTY);
    // Even with a position set, hidden wins.
    expect(getLegendReserve({ legend: { position: 'right' } }, false)).toEqual(EMPTY);
  });

  it('reserves on the bottom edge by default', () => {
    expect(getLegendReserve({}, true)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE,
    });
  });

  it('reserves on the requested edge for each legend position', () => {
    expect(getLegendReserve({ legend: { position: 'top' } }, true)).toEqual({
      ...EMPTY,
      top: LEGEND_RESERVE,
    });
    expect(getLegendReserve({ legend: { position: 'bottom' } }, true)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE,
    });
    expect(getLegendReserve({ legend: { position: 'left' } }, true)).toEqual({
      ...EMPTY,
      left: LEGEND_RESERVE + SIDE_GAP,
    });
    expect(getLegendReserve({ legend: { position: 'right' } }, true)).toEqual({
      ...EMPTY,
      right: LEGEND_RESERVE + SIDE_GAP,
    });
  });

  it('adds extraGap on top of the legend slot', () => {
    expect(getLegendReserve({}, true, 24)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE + 24,
    });
    expect(getLegendReserve({ legend: { position: 'right' } }, true, 10)).toEqual({
      ...EMPTY,
      right: LEGEND_RESERVE + 10 + SIDE_GAP,
    });
  });

  it('uses legend.height for top/bottom reserve when provided', () => {
    expect(
      getLegendReserve({ legend: { position: 'top', height: 52 } }, true),
    ).toEqual({
      ...EMPTY,
      top: 52,
    });
    expect(
      getLegendReserve({ legend: { position: 'bottom', height: 44 } }, true),
    ).toEqual({
      ...EMPTY,
      bottom: 44,
    });
  });

  it('uses legend.width for left/right reserve when provided', () => {
    expect(
      getLegendReserve({ legend: { position: 'left', width: 96 } }, true),
    ).toEqual({
      ...EMPTY,
      left: 96 + SIDE_GAP,
    });
    expect(
      getLegendReserve({ legend: { position: 'right', width: 80 } }, true),
    ).toEqual({
      ...EMPTY,
      right: 80 + SIDE_GAP,
    });
  });

  it('returns a fresh object on every call (callers may mutate the result)', () => {
    const a = getLegendReserve({}, true);
    const b = getLegendReserve({}, true);
    expect(a).not.toBe(b);
    a.bottom = 999;
    expect(b.bottom).toBe(LEGEND_RESERVE);
  });

  // -------------------------------------------------------------------------
  // Side-legend width math — kicks in when callers pass `names`, which they
  // must for left/right legends so the slot fits the widest label. Without
  // this the 36 px row-height slot was narrower than a single legend entry
  // and the legend overlapped the chart body (pie/doughnut regression).
  // Assertions use `>` / `>=` rather than exact pixels so the canvas vs.
  // char-count fallback paths stay interchangeable across Node/JSDOM/browser.
  // -------------------------------------------------------------------------

  it('ignores names for top/bottom legends (slot height is constant regardless of label width)', () => {
    const short = getLegendReserve({ legend: { position: 'bottom' } }, true, 0, ['A']);
    const longList = getLegendReserve(
      { legend: { position: 'bottom' } },
      true,
      0,
      ['A very very very very very very long label that should not affect height'],
    );
    expect(short.bottom).toBe(LEGEND_RESERVE);
    expect(longList.bottom).toBe(LEGEND_RESERVE);
    expect(short).toEqual(longList);
  });

  it('grows the side-legend slot to fit the widest label when names are provided', () => {
    const long = 'A really really really wide legend label';
    const right = getLegendReserve({ legend: { position: 'right' } }, true, 0, [long]);
    // Each edge except the active one is still zero.
    expect(right.top).toBe(0);
    expect(right.bottom).toBe(0);
    expect(right.left).toBe(0);
    // The active edge must be at LEAST as wide as the floor, and (because
    // we're measuring a long label) strictly wider than the floor.
    expect(right.right).toBeGreaterThan(LEGEND_RESERVE);
  });

  it('side-legend slot is monotonic in label width (longer labels → larger slot)', () => {
    const small = getLegendReserve({ legend: { position: 'left' } }, true, 0, ['A']);
    const big = getLegendReserve(
      { legend: { position: 'left' } },
      true,
      0,
      ['A label that is much wider than a single character'],
    );
    expect(big.left).toBeGreaterThan(small.left);
  });

  it('side-legend slot picks the WIDEST label, not the count', () => {
    const manyShort = getLegendReserve(
      { legend: { position: 'right' } },
      true,
      0,
      Array.from({ length: 20 }, () => 'A'),
    );
    const oneLong = getLegendReserve(
      { legend: { position: 'right' } },
      true,
      0,
      ['One single very wide legend label here'],
    );
    expect(oneLong.right).toBeGreaterThan(manyShort.right);
  });

  it('side-legend slot honours extraGap on top of the width-based reserve', () => {
    const label = 'Premium';
    const noGap = getLegendReserve({ legend: { position: 'right' } }, true, 0, [label]);
    const withGap = getLegendReserve({ legend: { position: 'right' } }, true, 24, [label]);
    expect(withGap.right - noGap.right).toBe(24);
  });

  it('side-legend slot keeps a fixed body gap when names is empty or omitted', () => {
    expect(getLegendReserve({ legend: { position: 'right' } }, true, 0, []).right).toBe(
      LEGEND_RESERVE + SIDE_GAP,
    );
    expect(getLegendReserve({ legend: { position: 'right' } }, true).right).toBe(
      LEGEND_RESERVE + SIDE_GAP,
    );
  });
});

describe('buildLegend', () => {
  // The reserve helpers (getLegendReserve / buildGrid) assume a single-row
  // legend slot (LEGEND_RESERVE = 36 px). Default scroll mode keeps that
  // invariant true regardless of series count — ECharts adds pagination
  // arrows instead of wrapping onto rows that would overlap the chart body.
  it('defaults to type: "scroll" so long legends paginate instead of wrapping', () => {
    const legend = buildLegend(['A', 'B', 'C'], {});
    expect(legend.type).toBe('scroll');
  });

  it('honors user-supplied legend.type = "plain" (opt-in wrapping)', () => {
    const legend = buildLegend(['A', 'B', 'C'], { legend: { type: 'plain' } });
    expect(legend.type).toBe('plain');
  });

  it('honors user-supplied legend.type = "scroll" (explicit default)', () => {
    const legend = buildLegend(['A', 'B', 'C'], { legend: { type: 'scroll' } });
    expect(legend.type).toBe('scroll');
  });

  // Adapters end with `deepMerge(eOption, options.echarts ?? {})`, so any
  // user override at echarts.legend.type must win over our default. This
  // is the escape hatch documented in LegendOptions.type for callers who
  // want full ECharts behavior without setting our typed knob.
  it('options.echarts.legend.type overrides the default via the final deepMerge', () => {
    const eOption = { legend: buildLegend(['A', 'B', 'C'], {}) };
    const merged = deepMerge(eOption, { legend: { type: 'plain' } });
    expect((merged.legend as Record<string, unknown>).type).toBe('plain');
  });

  it('keeps default positioning, show flag, and data wiring intact', () => {
    const legend = buildLegend(['A', 'B'], {});
    expect(legend.show).toBe(true);
    expect(legend.data).toEqual(['A', 'B']);
    expect(legend.bottom).toBe(12); // CHART_DEFAULT_PADDING
    expect(legend.left).toBe('center');
    expect(legend.orient).toBe('horizontal');
  });

  it('forwards legend.height and legend.width into ECharts legend block', () => {
    const legend = buildLegend(['A'], {
      legend: { position: 'right', height: 72, width: 140 },
    });
    expect(legend.height).toBe(72);
    expect(legend.width).toBe(140);
  });

  // -------------------------------------------------------------------------
  // `legend.formatLabel` — typed entry point that maps to ECharts native
  // `legend.formatter`. Verified at three layers:
  //   1. buildLegend wires it through and only emits `formatter` when set.
  //   2. The wrapper passes the entry index alongside the name.
  //   3. The wrapper is defensive — bad return / throws fall back to name.
  // The width-measurement integration with getLegendReserve is covered in
  // a dedicated describe block below.
  // -------------------------------------------------------------------------

  it('formatLabel: wires the user function into ECharts legend.formatter', () => {
    const legend = buildLegend(['Pro', 'Free'], {
      legend: { formatLabel: (n) => `★ ${n}` },
    });
    const f = legend.formatter as (name: string) => string;
    expect(typeof f).toBe('function');
    expect(f('Pro')).toBe('★ Pro');
    expect(f('Free')).toBe('★ Free');
  });

  it('formatLabel: compiles RichTextSpec into formatter string + legend.textStyle.rich', () => {
    const legend = buildLegend(['Chrome'], {
      legend: {
        formatLabel: (n) => ({
          segments: [
            { text: n, width: 120 },
            { text: '53 (65.2%)', width: 88, align: 'right' },
          ],
        }),
      },
    });
    const f = legend.formatter as (name: string) => string;
    const out = f('Chrome');
    expect(out).toContain('{__ich_legend_0_0|Chrome}');
    expect(out).toContain('{__ich_legend_0_1|53 (65.2%)}');

    const textStyle = legend.textStyle as Record<string, unknown>;
    const rich = textStyle.rich as Record<string, Record<string, unknown>>;
    expect(rich.__ich_legend_0_0.width).toBe(120);
    expect(rich.__ich_legend_0_1.width).toBe(88);
    expect(rich.__ich_legend_0_1.align).toBe('right');
  });

  it('formatLabel: passes the zero-based entry index alongside the name', () => {
    const seen: Array<[string, number]> = [];
    const legend = buildLegend(['A', 'B', 'C'], {
      legend: {
        formatLabel: (n, i) => {
          seen.push([n, i]);
          return n;
        },
      },
    });
    const f = legend.formatter as (name: string) => string;
    ['A', 'B', 'C'].forEach((n) => f(n));
    expect(seen).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);
  });

  it('formatLabel: omits formatter when not provided (preserves echarts.legend.formatter passthrough)', () => {
    const legend = buildLegend(['A'], {});
    expect(legend.formatter).toBeUndefined();
  });

  it('formatLabel: falls back to the raw name when the user function throws', () => {
    const legend = buildLegend(['A'], {
      legend: {
        formatLabel: () => {
          throw new Error('boom');
        },
      },
    });
    const f = legend.formatter as (name: string) => string;
    expect(f('A')).toBe('A');
  });

  it('formatLabel: falls back to the raw name when the user function returns a non-string', () => {
    const legend = buildLegend(['A'], {
      // Force a non-string return at runtime — type system would catch this,
      // but a real consumer could `return undefined` accidentally from an
      // early-exit lookup. The wrapper must keep the legend usable.
      legend: { formatLabel: (() => undefined) as unknown as (n: string) => string },
    });
    const f = legend.formatter as (name: string) => string;
    expect(f('A')).toBe('A');
  });

  // Names with duplicates: `buildLegend` eagerly pre-compiles each entry once
  // to collect RichTextSpec style maps, then the runtime formatter resolves by
  // name. For duplicate names this means the callback may observe multiple
  // valid indices during pre-compilation. The contract we care about is:
  // "doesn't crash and never feeds an invalid index".
  it('formatLabel: handles duplicate names without crashing', () => {
    const seen: Array<[string, number]> = [];
    const legend = buildLegend(['A', 'A'], {
      legend: {
        formatLabel: (n, i) => {
          seen.push([n, i]);
          return n;
        },
      },
    });
    const f = legend.formatter as (name: string) => string;
    expect(() => f('A')).not.toThrow();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(([name]) => name === 'A')).toBe(true);
    expect(seen.every(([, index]) => index >= 0)).toBe(true);
  });
});

describe('compileRichText', () => {
  it('compiles RichTextSpec into formatter text + rich map', () => {
    const compiled = compileRichText(
      {
        segments: [
          { text: 'Name', width: 120 },
          { text: '53 (65.2%)', width: 88, align: 'right' },
        ],
      },
      'test',
    );
    expect(compiled.text).toContain('{__ich_test_0|Name}');
    expect(compiled.text).toContain('{__ich_test_1|53 (65.2%)}');
    expect(compiled.rich?.__ich_test_0?.width).toBe(120);
    expect(compiled.rich?.__ich_test_1?.align).toBe('right');
    expect(compiled.rich?.__ich_test_0?.overflow).toBe('truncate');
    expect(compiled.rich?.__ich_test_0?.ellipsis).toBe('…');
    expect(compiled.measuredWidthPx).toBeGreaterThanOrEqual(208);
  });

  it('preserves explicit overflow/ellipsis from segment style', () => {
    const compiled = compileRichText(
      {
        segments: [
          {
            text: 'Wrapped Label',
            style: { width: 120, overflow: 'break', ellipsis: '~~' },
          },
        ],
      },
      'explicit',
    );
    expect(compiled.rich?.__ich_explicit_0?.overflow).toBe('break');
    expect(compiled.rich?.__ich_explicit_0?.ellipsis).toBe('~~');
  });

  it('truncates width-constrained segments with default overflow behavior', () => {
    const compiled = compileRichText(
      {
        segments: [{ text: 'SuperLongLegendLabel', width: 40 }],
      },
      'truncate_default',
    );
    expect(compiled.text).toContain('{__ich_truncate_default_0|');
    expect(compiled.text).not.toContain('SuperLongLegendLabel');
    expect(compiled.text).toContain('…}');
  });

  it('does not truncate when overflow is explicitly non-truncate', () => {
    const compiled = compileRichText(
      {
        segments: [
          {
            text: 'SuperLongLegendLabel',
            style: { width: 40, overflow: 'break' },
          },
        ],
      },
      'no_truncate',
    );
    expect(compiled.text).toContain('{__ich_no_truncate_0|SuperLongLegendLabel}');
  });
});

describe('buildLegend + buildGrid: title vs top-legend stacking', () => {
  // Regression for "legend at `position: 'top'` overlaps the title": the
  // title widget anchors at `top: chartPadding` and used to share that
  // anchor with the top-legend, so both rendered at the same y.
  // Additionally `buildGrid`'s `deepMerge(base, legendArea, ...)` let
  // `legendArea.top` silently replace the title-only `base.top`, so the
  // chart body slid up under the title when both were present.
  it('top legend shifts below the title when a title is present', () => {
    const noTitle = buildLegend(['A', 'B'], {
      legend: { show: true, position: 'top' },
    });
    const withTitle = buildLegend(['A', 'B'], {
      title: 'Sales',
      legend: { show: true, position: 'top' },
    });
    // Without a title the top legend keeps its bare-padding anchor (12 px).
    expect(noTitle.top).toBe(12);
    // With a title the legend's anchor is pushed below the title widget
    // (12 px padding + 38 px title widget height = 50 px). The shift uses
    // the same `getTitleHeight` math the grid path consumes, so title and
    // grid stay in sync.
    expect(withTitle.top).toBe(12 + DEFAULT_TITLE_HEIGHT);
  });

  it('non-top legend positions ignore the title (unchanged)', () => {
    // Bottom / left / right legends don't share the title's top-edge anchor,
    // so they keep their previous coordinates whether or not a title exists.
    const bottom = buildLegend(['A'], { title: 'X', legend: { show: true, position: 'bottom' } });
    const left = buildLegend(['A'], { title: 'X', legend: { show: true, position: 'left' } });
    const right = buildLegend(['A'], { title: 'X', legend: { show: true, position: 'right' } });
    expect(bottom.bottom).toBe(12);
    expect(bottom.top).toBeUndefined();
    expect(left.left).toBe(12);
    expect(left.top).toBe('center');
    expect(right.right).toBe(12);
    expect(right.top).toBe('center');
  });

  it('grid.top composes title height + top-legend reserve (XY charts)', () => {
    // Truth table for the top edge — every combination of {title, top legend}
    // must be the sum of the active reserves plus padding. Before the fix,
    // the (title + top-legend) cell silently equaled the legend-only cell
    // because `deepMerge` dropped the title slot.
    const data = {
      categories: ['Q1'],
      series: [
        { name: 'A', data: [10] },
        { name: 'B', data: [5] },
      ],
    };
    const noTitleNoLegend = resolveBarOptions(data, { legend: { show: false } })
      .option.grid as Record<string, unknown>;
    const titleOnly = resolveBarOptions(data, { title: 'X', legend: { show: false } })
      .option.grid as Record<string, unknown>;
    const topLegendOnly = resolveBarOptions(data, {
      legend: { show: true, position: 'top' },
    }).option.grid as Record<string, unknown>;
    const both = resolveBarOptions(data, {
      title: 'X',
      legend: { show: true, position: 'top' },
    }).option.grid as Record<string, unknown>;

    expect(noTitleNoLegend.top).toBe(12);
    expect(titleOnly.top).toBe(12 + DEFAULT_TITLE_HEIGHT);
    // padding (12) + LEGEND_RESERVE (36)
    expect(topLegendOnly.top).toBe(12 + 36);
    // padding (12) + title widget height (38) + LEGEND_RESERVE (36)
    expect(both.top).toBe(12 + DEFAULT_TITLE_HEIGHT + 36);
  });

  it('bottom / side legends with a title preserve the title reserve on the top edge', () => {
    // Sanity: the new top-edge composition must not break charts where the
    // legend lives elsewhere — `grid.top` for a title-only chart must equal
    // the title-only case regardless of whether `legend.show` is true.
    const data = {
      categories: ['Q1'],
      series: [{ name: 'A', data: [10] }],
    };
    const bottomLegend = resolveBarOptions(data, {
      title: 'X',
      legend: { show: true, position: 'bottom' },
    }).option.grid as Record<string, unknown>;
    const rightLegend = resolveBarOptions(data, {
      title: 'X',
      legend: { show: true, position: 'right' },
    }).option.grid as Record<string, unknown>;
    expect(bottomLegend.top).toBe(12 + DEFAULT_TITLE_HEIGHT);
    expect(rightLegend.top).toBe(12 + DEFAULT_TITLE_HEIGHT);
  });
});

describe('buildGrid + side-edge legend width (XY charts)', () => {
  // Regression for the bar/right-legend overlap bug: `buildGrid` used to
  // pass `getLegendReserve(options, show)` without `names`, so for
  // `position: 'left' | 'right'` the right reserve stayed at the bare
  // 36 px floor regardless of how wide the labels actually were. That
  // bug was invisible with the default `seriesName` labels (short, ≤ 36
  // px) but became severe once `legend.formatLabel` started appending
  // values — e.g. "{n|North}{v|  $250}" rendered as "North  $250"
  // overflowed the legend area onto the bars.
  it('reserves bottom row-height for the default bottom legend (single-line slot)', () => {
    const grid = resolveBarOptions(
      {
        categories: ['Q1', 'Q2'],
        series: [
          { name: 'Sales', data: [10, 20] },
          { name: 'Costs', data: [5, 8] },
        ],
      },
      { legend: { show: true } }, // default position = 'bottom'
    ).option.grid as Record<string, unknown>;
    // padding (12) + LEGEND_RESERVE (36) = 48
    expect(grid.bottom).toBe(48);
    // Right edge stays at the bare chart padding when the legend lives
    // on the bottom — no side-edge reserve to add.
    expect(grid.right).toBe(12);
  });

  it('grows grid.right to fit the widest series-name label on a right legend', () => {
    // Bare names — no formatLabel. The right reserve must already widen
    // past the 36 px floor when the label is wider than the floor.
    const grid = resolveBarOptions(
      {
        categories: ['Q1', 'Q2'],
        series: [
          { name: 'A really really wide series name', data: [10, 20] },
        ],
      },
      { legend: { show: true, position: 'right' } },
    ).option.grid as Record<string, unknown>;
    // padding (12) + LEGEND_RESERVE floor (36) = 48 — the reserve must
    // be STRICTLY larger because the label visibly exceeds 36 px.
    expect(grid.right as number).toBeGreaterThan(48);
  });

  it('grows grid.right with legend.formatLabel (the bar rich-text regression)', () => {
    // Same data, same chart, two legend strategies — the formatted side
    // must reserve strictly more right-edge space than the raw side.
    const data = {
      categories: ['Q1', 'Q2'],
      series: [
        { name: 'A', data: [10, 20] },
        { name: 'B', data: [5, 8] },
      ],
    };
    const raw = resolveBarOptions(data, {
      legend: { show: true, position: 'right' },
    }).option.grid as Record<string, unknown>;
    const formatted = resolveBarOptions(data, {
      legend: {
        show: true,
        position: 'right',
        formatLabel: (n) => `${n} — a much wider formatted label with appended value`,
      },
    }).option.grid as Record<string, unknown>;
    expect(formatted.right as number).toBeGreaterThan(raw.right as number);
  });

  it('strips rich-text markup before measuring (bar rich-text demo case)', () => {
    // The bar/rich-text demo formatter returns `{n|name}{v|  $...}`
    // segments. `buildGrid` must measure the visible glyph extent
    // (after stripping `{n|`, `{v|`, `}`) — otherwise the literal style
    // keys would inflate the slot beyond what's actually drawn.
    const data = {
      categories: ['Mon', 'Tue'],
      series: [{ name: 'North', data: [100, 200] }],
    };
    const plain = resolveBarOptions(data, {
      legend: { show: true, position: 'right', formatLabel: (n) => `${n}` },
    }).option.grid as Record<string, unknown>;
    const rich = resolveBarOptions(data, {
      legend: { show: true, position: 'right', formatLabel: (n) => `{n|${n}}` },
    }).option.grid as Record<string, unknown>;
    // The rendered text is identical after stripping, so the right
    // reserve must match — proving we measured the stripped string, not
    // the literal source.
    expect(rich.right).toBe(plain.right);
  });
});

describe('getLegendReserve + formatLabel integration', () => {
  // The whole point of measuring formatted strings (instead of raw names)
  // for side legends is that a label like `(n) => `${n}  ${value(n)}` `
  // visibly extends past the raw name's pixel width — the reserve must
  // grow with it, otherwise the formatted text bleeds into the chart body.
  it('measures the FORMATTED label width on side legends, not the raw name', () => {
    const names = ['A', 'B'];
    const raw = getLegendReserve({ legend: { position: 'right' } }, true, 0, names);
    const formatted = getLegendReserve(
      {
        legend: {
          position: 'right',
          formatLabel: (n) => `${n} — 12,345,678 (87.5%)`,
        },
      },
      true,
      0,
      names,
    );
    expect(formatted.right).toBeGreaterThan(raw.right);
  });

  it('honors RichTextSpec segment width for side-legend reserve math', () => {
    const names = ['Chrome'];
    const plain = getLegendReserve(
      { legend: { position: 'right', formatLabel: () => 'Chrome 53 (65.2%)' } },
      true,
      0,
      names,
    );
    const columns = getLegendReserve(
      {
        legend: {
          position: 'right',
          formatLabel: () => ({
            segments: [
              { text: 'Chrome', width: 120 },
              { text: '53 (65.2%)', width: 88, align: 'right' },
            ],
          }),
        },
      },
      true,
      0,
      names,
    );
    expect(columns.right).toBeGreaterThan(plain.right);
  });

  // Top/bottom legends use a fixed row-height slot. formatLabel must NOT
  // grow that slot regardless of how wide the formatted string is —
  // otherwise the chart layout would jitter every time a value changes.
  it('top/bottom legends ignore formatLabel width (constant row-height slot)', () => {
    const raw = getLegendReserve({ legend: { position: 'bottom' } }, true, 0, ['A']);
    const formatted = getLegendReserve(
      {
        legend: {
          position: 'bottom',
          formatLabel: (n) => `${n} — 12,345,678 (87.5%)`,
        },
      },
      true,
      0,
      ['A'],
    );
    expect(formatted.bottom).toBe(raw.bottom);
  });

  // Rich-text segments (`{key|text}`) are stripped before measurement so
  // the style keys don't inflate the slot past the visible glyph extent.
  // Without the strip, `{n|Pro}{v|  $1,200}` would be measured as if the
  // literal "{n|", "}", "{v|" characters were drawn.
  it('strips rich-text markup before measuring (style keys are invisible)', () => {
    const names = ['Pro'];
    const richA = getLegendReserve(
      { legend: { position: 'right', formatLabel: (n) => `{n|${n}}` } },
      true,
      0,
      names,
    );
    const plain = getLegendReserve(
      { legend: { position: 'right', formatLabel: (n) => n } },
      true,
      0,
      names,
    );
    // After stripping `{n|` and `}` the measured text is identical to plain.
    expect(richA.right).toBe(plain.right);
  });

  // A throwing formatter must not blow up the layout computation either —
  // the reserve helper should keep using the raw name for the entry that
  // failed (matches the buildLegend fallback so the legend and the reserve
  // agree on what gets drawn).
  it('falls back to raw name width when formatLabel throws', () => {
    const names = ['A really wide label'];
    const reserveOk = getLegendReserve(
      { legend: { position: 'right' } },
      true,
      0,
      names,
    );
    const reserveThrowing = getLegendReserve(
      {
        legend: {
          position: 'right',
          formatLabel: () => {
            throw new Error('boom');
          },
        },
      },
      true,
      0,
      names,
    );
    expect(reserveThrowing.right).toBe(reserveOk.right);
  });
});

// ---------------------------------------------------------------------------
// `tooltip.appendToBody` defaults — decided by `resolveAppendToBody` based on
// (1) explicit user override and (2) light-DOM vs. shadow-DOM container.
// Verified at three layers:
//   1. The decision function itself (table of cases).
//   2. The two centralized builders (`buildTooltip`, `buildSparkTooltip`).
//   3. Every adapter (regression guard: a future inline tooltip rewrite
//      could silently drop the wiring).
// ---------------------------------------------------------------------------

describe('resolveAppendToBody', () => {
  // Auto-detection by container: light-DOM default `true` is what fixes
  // the KPI-card clipping bug; shadow-DOM default `false` is what keeps
  // <i-chart> users from leaking tooltip DOM out of their shadow root.
  it('defaults to true when no ctx is supplied (light-DOM / imperative createChart path)', () => {
    expect(resolveAppendToBody({})).toBe(true);
  });

  it('defaults to true when ctx is supplied but inShadowDom is false / undefined', () => {
    expect(resolveAppendToBody({}, {})).toBe(true);
    expect(resolveAppendToBody({}, { inShadowDom: false })).toBe(true);
  });

  it('defaults to false inside a Shadow DOM container (<i-chart> web component)', () => {
    expect(resolveAppendToBody({}, { inShadowDom: true })).toBe(false);
  });

  // Explicit override is the escape hatch: a consumer with <i-chart> in
  // a Teleport (or any other non-standard host) can force true; a
  // light-DOM consumer who manages stacking-context themselves can
  // force false. The explicit value must beat the auto-detection in
  // BOTH directions.
  it('explicit tooltip.appendToBody: true wins over shadow-DOM default', () => {
    expect(
      resolveAppendToBody({ tooltip: { appendToBody: true } }, { inShadowDom: true }),
    ).toBe(true);
  });

  it('explicit tooltip.appendToBody: false wins over light-DOM default', () => {
    expect(
      resolveAppendToBody({ tooltip: { appendToBody: false } }, { inShadowDom: false }),
    ).toBe(false);
    // Same answer with no ctx — explicit value always wins.
    expect(resolveAppendToBody({ tooltip: { appendToBody: false } })).toBe(false);
  });

  it('treats undefined tooltip.appendToBody as "not set" and falls back to auto', () => {
    expect(
      resolveAppendToBody({ tooltip: {} }, { inShadowDom: true }),
    ).toBe(false);
    expect(
      resolveAppendToBody({ tooltip: {} }, { inShadowDom: false }),
    ).toBe(true);
  });
});

describe('buildSparkTooltip', () => {
  it('keeps the spark tooltip contract (axis trigger, no axis pointer, no confine)', () => {
    const tt = buildSparkTooltip();
    expect(tt.show).toBe(true);
    expect(tt.trigger).toBe('axis');
    expect(tt.axisPointer).toEqual({ type: 'none' });
    // No confine — confining the tooltip to a 96×48 KPI cell would
    // make it unreadable. The clipping fix comes from appendToBody.
    expect(tt.confine).toBeUndefined();
  });

  it('defaults appendToBody: true in light DOM (fixes KPI-card clipping)', () => {
    expect(buildSparkTooltip().appendToBody).toBe(true);
    expect(buildSparkTooltip({}, {}).appendToBody).toBe(true);
  });

  it('defaults appendToBody: false in Shadow DOM (preserves <i-chart> encapsulation)', () => {
    expect(buildSparkTooltip({}, { inShadowDom: true }).appendToBody).toBe(false);
  });

  it('honors explicit tooltip.appendToBody over the container-derived default', () => {
    expect(
      buildSparkTooltip({ tooltip: { appendToBody: false } }).appendToBody,
    ).toBe(false);
    expect(
      buildSparkTooltip({ tooltip: { appendToBody: true } }, { inShadowDom: true })
        .appendToBody,
    ).toBe(true);
  });
});

describe('buildTooltip', () => {
  // buildTooltip keeps `confine: true` (its tooltip stays inside the
  // chart canvas regardless of where the DOM is mounted). The new
  // `appendToBody` field is orthogonal and routed through the same
  // helper so all chart types behave consistently — see the
  // adapter-wiring describe below for the user-visible guard.
  it('defaults to appendToBody: true with confine: true in light DOM', () => {
    const tt = buildTooltip({}, 'axis');
    expect(tt.appendToBody).toBe(true);
    expect(tt.confine).toBe(true);
  });

  it('defaults appendToBody: false inside Shadow DOM (still confined)', () => {
    const tt = buildTooltip({}, 'axis', undefined, false, { inShadowDom: true });
    expect(tt.appendToBody).toBe(false);
    expect(tt.confine).toBe(true);
  });

  it('honors explicit tooltip.appendToBody over the container-derived default', () => {
    const off = buildTooltip(
      { tooltip: { appendToBody: false } },
      'axis',
      undefined,
      false,
      { inShadowDom: false },
    );
    expect(off.appendToBody).toBe(false);

    const on = buildTooltip(
      { tooltip: { appendToBody: true } },
      'axis',
      undefined,
      false,
      { inShadowDom: true },
    );
    expect(on.appendToBody).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Adapter-level regression guard.
//
// `appendToBody` must reach the resolved option for every chart type the
// library ships. The two failure modes we're guarding against:
//
//   1. A future refactor inlines a tooltip object somewhere and forgets
//      to route through `resolveAppendToBody` / `buildTooltip` /
//      `buildSparkTooltip` — the field silently disappears and the
//      KPI-card-clipping bug returns.
//   2. The adapter accepts `ctx` from the registry but stops threading
//      it into its tooltip block — the <i-chart> Shadow DOM path leaks
//      tooltip DOM out of the shadow root again.
//
// We assert all three states (default, in-shadow-DOM, explicit override)
// for each adapter so either regression is caught at the surface that
// users actually see.
// ---------------------------------------------------------------------------

describe('Tooltip appendToBody wiring across adapters', () => {
  const xyData = {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'ARR', data: [1, 2, 3] }],
  };
  const pieData = [
    { name: 'A', value: 1 },
    { name: 'B', value: 2 },
  ];
  const graphData = {
    nodes: [{ name: 'A' }, { name: 'B' }],
    links: [{ source: 'A', target: 'B', value: 1 }],
  };
  const radarData = {
    indicators: [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }],
    series: [{ name: 'S', values: [1, 2, 3] }],
  };

  type TooltipOf = (overrides?: { ctx?: { inShadowDom?: boolean }; appendToBody?: boolean }) =>
    Record<string, unknown>;

  // Each entry knows how to materialize one tooltip for a given chart
  // type. Keeps the assertion loop short and makes the matrix obvious
  // when a new chart type is added.
  const adapters: Array<{ name: string; tooltipOf: TooltipOf }> = [
    {
      name: 'line (default)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveLineOptions(
          xyData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'line (spark)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveLineOptions(
          xyData,
          appendToBody === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'area (default)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveAreaOptions(
          xyData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'area (spark)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveAreaOptions(
          xyData,
          appendToBody === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { appendToBody } },
          ctx,
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'bar (default)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveBarOptions(
          xyData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'bar (spark)',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveBarOptions(
          xyData,
          appendToBody === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'pie',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolvePieOptions(
          pieData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'sankey',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveSankeyOptions(
          graphData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'chord',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveChordOptions(
          graphData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'radar',
      tooltipOf: ({ ctx, appendToBody } = {}) =>
        resolveRadarOptions(
          radarData,
          appendToBody === undefined ? {} : { tooltip: { appendToBody } },
          ctx,
        ).tooltip as Record<string, unknown>,
    },
  ];

  for (const { name, tooltipOf } of adapters) {
    describe(name, () => {
      it('defaults appendToBody: true in light DOM (no ctx)', () => {
        expect(tooltipOf().appendToBody).toBe(true);
      });

      it('defaults appendToBody: false inside Shadow DOM', () => {
        expect(tooltipOf({ ctx: { inShadowDom: true } }).appendToBody).toBe(false);
      });

      it('explicit tooltip.appendToBody beats the Shadow-DOM default', () => {
        expect(
          tooltipOf({ ctx: { inShadowDom: true }, appendToBody: true }).appendToBody,
        ).toBe(true);
      });

      it('explicit tooltip.appendToBody: false beats the light-DOM default', () => {
        expect(tooltipOf({ appendToBody: false }).appendToBody).toBe(false);
      });
    });
  }
});

describe('resolveTooltipPosition', () => {
  // The helper has one job: emit `undefined` when the user did not opt
  // in (so ECharts' built-in 20 px default keeps existing charts
  // pixel-identical), and otherwise emit a position callback that
  // reproduces ECharts' own edge-flip math with `cursorGap` substituted
  // for the hardcoded 20.
  //
  // Test fixtures use the exact `size` shape ECharts passes at runtime
  // (`{ contentSize, viewSize }`) — narrowing it in the helper would
  // hide regressions where ECharts changes the callback contract.
  it('returns undefined when cursorGap is not set (preserves ECharts 20 px default)', () => {
    expect(resolveTooltipPosition({})).toBeUndefined();
    expect(resolveTooltipPosition({ tooltip: {} })).toBeUndefined();
    // Explicitly undefined cursorGap is treated the same as omitted.
    expect(
      resolveTooltipPosition({ tooltip: { cursorGap: undefined } }),
    ).toBeUndefined();
  });

  it('returns a function when cursorGap is set (even at 0)', () => {
    expect(typeof resolveTooltipPosition({ tooltip: { cursorGap: 8 } })).toBe(
      'function',
    );
    // 0 is meaningful (tooltip glued to cursor) — must produce a fn,
    // not undefined.
    expect(typeof resolveTooltipPosition({ tooltip: { cursorGap: 0 } })).toBe(
      'function',
    );
  });

  // Geometry tests use a 100×60 tooltip on a 400×300 viewport so the
  // overflow boundary numbers are unambiguous.
  const SIZE = { contentSize: [100, 60] as [number, number], viewSize: [400, 300] as [number, number] };

  it('places the tooltip down-right of the cursor by `gap` px in the no-overflow case', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 8 } })!;
    // Cursor at [50, 50] → expect [58, 58] (px+gap, py+gap).
    expect(pos([50, 50], null, null, null, SIZE)).toEqual([58, 58]);
  });

  it('honors cursorGap: 0 — tooltip sits right at the cursor', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 0 } })!;
    expect(pos([50, 50], null, null, null, SIZE)).toEqual([50, 50]);
  });

  it('flips horizontally when the right edge would overflow (with the +2 buffer ECharts uses)', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 8 } })!;
    // Cursor at [300, 50]: px+gap+w+2 = 300+8+100+2 = 410 > 400.
    // Expect flip: x = 300 - 100 - 8 = 192. y unchanged: 50+8 = 58.
    expect(pos([300, 50], null, null, null, SIZE)).toEqual([192, 58]);
  });

  it('flips vertically when the bottom edge would overflow', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 8 } })!;
    // Cursor at [50, 250]: py+gap+h = 250+8+60 = 318 > 300.
    // Expect flip: y = 250 - 60 - 8 = 182. x unchanged: 50+8 = 58.
    expect(pos([50, 250], null, null, null, SIZE)).toEqual([58, 182]);
  });

  it('flips both axes when the cursor is near the bottom-right corner', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 8 } })!;
    // Cursor at [300, 250]: both overflows trigger.
    expect(pos([300, 250], null, null, null, SIZE)).toEqual([192, 182]);
  });

  it('respects the +2 buffer boundary exactly — ECharts parity check', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 8 } })!;
    // x + w + 2 == vw → 290 + 8 + 100 + 2 = 400 (NOT > 400), so NO flip.
    expect(pos([290, 50], null, null, null, SIZE)).toEqual([298, 58]);
    // One pixel later → flip triggers.
    expect(pos([291, 50], null, null, null, SIZE)).toEqual([183, 58]);
  });

  it('scales with cursorGap — larger gap produces larger offset and earlier flip threshold', () => {
    const pos = resolveTooltipPosition({ tooltip: { cursorGap: 20 } })!;
    expect(pos([50, 50], null, null, null, SIZE)).toEqual([70, 70]);
    // With gap=20: flip when px + 20 + 100 + 2 > 400 → px > 278.
    expect(pos([279, 50], null, null, null, SIZE)).toEqual([159, 70]);
  });
});

describe('buildSparkTooltip — cursorGap wiring', () => {
  // Spark variants get a built-in 6 px default — 20 px (ECharts'
  // default) is too much on a 96×48 KPI card and frequently obscures
  // the line the tooltip is annotating. Tested at three values:
  //   - default (no user override)              → position is a fn
  //   - user override to a different number     → fn with their gap
  //   - user override to 0 (tight-to-cursor)    → fn (not undefined,
  //                                                because 0 is a
  //                                                meaningful gap)
  //
  // The geometry is exercised in the `resolveTooltipPosition` block
  // above — here we only assert the spark builder routes through it.
  it('defaults to a position function (6 px) — spark-specific override of ECharts 20 px', () => {
    const tt = buildSparkTooltip();
    expect(typeof tt.position).toBe('function');
    const fn = tt.position as (
      point: [number, number],
      p: unknown,
      d: unknown,
      r: unknown,
      s: { contentSize: [number, number]; viewSize: [number, number] },
    ) => [number, number];
    const SIZE = {
      contentSize: [100, 60] as [number, number],
      viewSize: [400, 300] as [number, number],
    };
    // Cursor at [50, 50] + 6 px gap → [56, 56]. If the default ever
    // changes, this assertion fails loudly with the new expected
    // coordinates — that's the contract we want.
    expect(fn([50, 50], null, null, null, SIZE)).toEqual([56, 56]);
  });

  it('explicit cursorGap overrides the spark default', () => {
    const tt = buildSparkTooltip({ tooltip: { cursorGap: 12 } });
    expect(typeof tt.position).toBe('function');
    const fn = tt.position as (
      point: [number, number],
      p: unknown,
      d: unknown,
      r: unknown,
      s: { contentSize: [number, number]; viewSize: [number, number] },
    ) => [number, number];
    const SIZE = {
      contentSize: [100, 60] as [number, number],
      viewSize: [400, 300] as [number, number],
    };
    expect(fn([50, 50], null, null, null, SIZE)).toEqual([62, 62]);
  });

  it('explicit cursorGap: 0 wins over the spark default (tooltip glued to cursor)', () => {
    // Regression guard: a naive `cursorGap = options.tooltip?.cursorGap ?? 6`
    // would treat 0 as falsy and silently fall back to 6.
    const tt = buildSparkTooltip({ tooltip: { cursorGap: 0 } });
    expect(typeof tt.position).toBe('function');
    const fn = tt.position as (
      point: [number, number],
      p: unknown,
      d: unknown,
      r: unknown,
      s: { contentSize: [number, number]; viewSize: [number, number] },
    ) => [number, number];
    const SIZE = {
      contentSize: [100, 60] as [number, number],
      viewSize: [400, 300] as [number, number],
    };
    expect(fn([50, 50], null, null, null, SIZE)).toEqual([50, 50]);
  });
});

describe('buildTooltip — cursorGap wiring', () => {
  it('emits position: undefined when cursorGap is not set', () => {
    expect(buildTooltip({}, 'axis').position).toBeUndefined();
  });

  it('emits position as a function when cursorGap is set', () => {
    const tt = buildTooltip({ tooltip: { cursorGap: 4 } }, 'axis');
    expect(typeof tt.position).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Adapter-level regression guard — cursorGap, twin to the appendToBody one.
//
// Same failure modes we care about: an adapter that resolves its tooltip
// inline (pie / sankey / chord / radar) silently dropping the `position`
// field, or stopping the threading at some point in the pipeline. We
// assert across every chart type so a future refactor that breaks one
// adapter fails one focused test, not the whole `position` contract.
// ---------------------------------------------------------------------------

describe('Tooltip cursorGap wiring across adapters', () => {
  const xyData = {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'ARR', data: [1, 2, 3] }],
  };
  const pieData = [
    { name: 'A', value: 1 },
    { name: 'B', value: 2 },
  ];
  const graphData = {
    nodes: [{ name: 'A' }, { name: 'B' }],
    links: [{ source: 'A', target: 'B', value: 1 }],
  };
  const radarData = {
    indicators: [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }],
    series: [{ name: 'S', values: [1, 2, 3] }],
  };

  type TooltipOf = (cursorGap?: number) => Record<string, unknown>;

  // `defaultGap` semantics:
  //   - undefined → adapter has NO library-level default; tooltip.position
  //     should be undefined when the user doesn't set `cursorGap`
  //     (ECharts' built-in 20 px takes over).
  //   - number    → adapter has a built-in default (currently only the
  //     spark variants — 6 px); tooltip.position is a callback baked
  //     with that gap, observable via the position math.
  const adapters: Array<{ name: string; tooltipOf: TooltipOf; defaultGap: number | undefined }> = [
    {
      name: 'line (default)',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveLineOptions(
          xyData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'line (spark)',
      defaultGap: 6,
      tooltipOf: (cursorGap) =>
        resolveLineOptions(
          xyData,
          cursorGap === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'area (default)',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveAreaOptions(
          xyData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'area (spark)',
      defaultGap: 6,
      tooltipOf: (cursorGap) =>
        resolveAreaOptions(
          xyData,
          cursorGap === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { cursorGap } },
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'bar (default)',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveBarOptions(
          xyData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'bar (spark)',
      defaultGap: 6,
      tooltipOf: (cursorGap) =>
        resolveBarOptions(
          xyData,
          cursorGap === undefined
            ? { variant: 'spark' }
            : { variant: 'spark', tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'pie',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolvePieOptions(
          pieData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'sankey',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveSankeyOptions(
          graphData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).tooltip as Record<string, unknown>,
    },
    {
      name: 'chord',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveChordOptions(
          graphData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).option.tooltip as Record<string, unknown>,
    },
    {
      name: 'radar',
      defaultGap: undefined,
      tooltipOf: (cursorGap) =>
        resolveRadarOptions(
          radarData,
          cursorGap === undefined ? {} : { tooltip: { cursorGap } },
        ).tooltip as Record<string, unknown>,
    },
  ];

  // Shared fixture for all geometry checks below — 100×60 tooltip on a
  // 400×300 viewport, cursor at [50, 50]. With a gap of N, the expected
  // result is [50+N, 50+N] (no overflow → no flip).
  const SIZE = {
    contentSize: [100, 60] as [number, number],
    viewSize: [400, 300] as [number, number],
  };
  type PositionFn = (
    point: [number, number],
    p: unknown,
    d: unknown,
    r: unknown,
    s: { contentSize: [number, number]; viewSize: [number, number] },
  ) => [number, number];

  for (const { name, tooltipOf, defaultGap } of adapters) {
    describe(name, () => {
      if (defaultGap === undefined) {
        // Non-spark charts: no library default — tooltip.position is
        // undefined unless the user opts in, so ECharts' built-in
        // 20 px gap stays in effect (zero visual regression).
        it('keeps position undefined when cursorGap is not set (preserves ECharts 20 px default)', () => {
          expect(tooltipOf().position).toBeUndefined();
        });
      } else {
        // Spark variants: library injects a 6 px default into the
        // tooltip pipeline. The adapter must forward the resolved
        // position callback or the KPI-card use-case regresses.
        it(`defaults position to a ${defaultGap} px callback (spark default)`, () => {
          const tt = tooltipOf();
          expect(typeof tt.position).toBe('function');
          const fn = tt.position as PositionFn;
          expect(fn([50, 50], null, null, null, SIZE)).toEqual([
            50 + defaultGap,
            50 + defaultGap,
          ]);
        });
      }

      it('routes an explicit cursorGap into the resolved tooltip position', () => {
        const tt = tooltipOf(8);
        expect(typeof tt.position).toBe('function');
        const fn = tt.position as PositionFn;
        expect(fn([50, 50], null, null, null, SIZE)).toEqual([58, 58]);
      });
    });
  }
});

describe('getTitleReserve', () => {
  it('returns zeros on every edge when no title is set', () => {
    expect(getTitleReserve({})).toEqual(EMPTY);
    expect(getTitleReserve({ title: undefined })).toEqual(EMPTY);
  });

  it('reserves the title widget height on the top edge for a string title', () => {
    expect(getTitleReserve({ title: 'Sales' })).toEqual({
      ...EMPTY,
      top: DEFAULT_TITLE_HEIGHT,
    });
  });

  it('reserves on top for an object title with default sizing', () => {
    expect(getTitleReserve({ title: { text: 'Sales' } })).toEqual({
      ...EMPTY,
      top: DEFAULT_TITLE_HEIGHT,
    });
  });

  it('reflects custom fontSize and padding in the top reserve', () => {
    // 18 + 12*2 + 8 = 50
    expect(getTitleReserve({ title: { text: 'Sales', fontSize: 18, padding: 12 } })).toEqual({
      ...EMPTY,
      top: 50,
    });
  });

  it('does not include chart padding (padding-free, mirrors getLegendReserve)', () => {
    // chart padding is irrelevant — title reserve is the widget height only.
    const a = getTitleReserve({ title: 'Sales', padding: 0 });
    const b = getTitleReserve({ title: 'Sales', padding: 24 });
    expect(a).toEqual(b);
  });

  it('returns a fresh object on every call (callers may mutate the result)', () => {
    const a = getTitleReserve({ title: 'Sales' });
    const b = getTitleReserve({ title: 'Sales' });
    expect(a).not.toBe(b);
    a.top = 999;
    expect(b.top).toBe(DEFAULT_TITLE_HEIGHT);
  });

  it('exposes a shape symmetric with getLegendReserve so adapters can compose them', () => {
    // This is a structural assertion, not a value test — both helpers must
    // return the same EdgeReserves shape so charts that combine them
    // (radar today, others later) can use a single edge loop.
    const title = getTitleReserve({ title: 'Sales' });
    const legend = getLegendReserve({ legend: { position: 'bottom' } }, true);
    expect(Object.keys(title).sort()).toEqual(Object.keys(legend).sort());
  });
});

describe('computeStackedTextOffsets', () => {
  // Re-implement the formula here so the tests assert "the helper does
  // what the docblock says it does", not "the helper returns whatever
  // it returned yesterday."
  const expectedFor = (
    primaryFs: number,
    secondaryFs: number,
    visibleGapPx = STACKED_TEXT_DEFAULT_VISIBLE_GAP_PX,
    glyphPaddingEm = STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM,
  ): { primaryOffsetY: number; secondaryOffsetY: number } => {
    const padding = glyphPaddingEm * (primaryFs + secondaryFs);
    const emBoxGap = Math.max(0, visibleGapPx - padding);
    const sign = (n: number) => (n < 0 ? -1 : 1);
    const round1 = (n: number) => (sign(n) * Math.round(Math.abs(n) * 10)) / 10;
    return {
      primaryOffsetY: round1(-(emBoxGap + secondaryFs) / 2),
      secondaryOffsetY: round1((primaryFs + emBoxGap) / 2),
    };
  };

  it('centers the em-box of the (primary + secondary) block on the anchor', () => {
    // Block bounding box is [primary_y - primary_fs/2, secondary_y + secondary_fs/2].
    // Top and bottom must equal in magnitude (mirror around 0).
    const primaryFs = 43;
    const secondaryFs = 17;
    const { primaryOffsetY, secondaryOffsetY } = computeStackedTextOffsets({
      primaryFontSize: primaryFs,
      secondaryFontSize: secondaryFs,
    });
    const top = primaryOffsetY - primaryFs / 2;
    const bottom = secondaryOffsetY + secondaryFs / 2;
    expect(top + bottom).toBeCloseTo(0, 1);
  });

  it('produces a constant ~12 px visible glyph gap across the auto-sized font range', () => {
    // Visible gap = em-box gap + padding (the padding the helper just
    // subtracted), so the rendered gap should track the configured target.
    const cases: Array<{ primary: number; secondary: number; expected: number }> = [
      { primary: 18, secondary: 10, expected: 12 },
      { primary: 27, secondary: 11, expected: 12 },
      { primary: 43, secondary: 17, expected: 12 },
      // Very large fonts: em-box gap clamps to 0 (padding > visibleGapPx),
      // so visible gap floors at the padding amount.
      { primary: 72, secondary: 28, expected: 15 },
    ];
    for (const { primary, secondary, expected } of cases) {
      const { primaryOffsetY, secondaryOffsetY } = computeStackedTextOffsets({
        primaryFontSize: primary,
        secondaryFontSize: secondary,
      });
      const emBoxGap = secondaryOffsetY - primaryOffsetY - (primary + secondary) / 2;
      const visibleGap =
        emBoxGap + STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM * (primary + secondary);
      expect(visibleGap).toBeCloseTo(expected, 0);
    }
  });

  it('matches the documented closed-form math at the demo card font sizes', () => {
    // 43 / 17 → padding 9 → em_gap 3 → primary -10, secondary 23.
    const result = computeStackedTextOffsets({
      primaryFontSize: 43,
      secondaryFontSize: 17,
    });
    expect(result).toEqual(expectedFor(43, 17));
    expect(result).toEqual({ primaryOffsetY: -10, secondaryOffsetY: 23 });
  });

  it('honors a custom visibleGapPx target', () => {
    const result = computeStackedTextOffsets({
      primaryFontSize: 32,
      secondaryFontSize: 12,
      visibleGapPx: 6,
    });
    expect(result).toEqual(expectedFor(32, 12, 6));
    // padding = 0.15 × 44 = 6.6 → em_gap = max(0, 6 - 6.6) = 0.
    // primary = -(0 + 12)/2 = -6.   secondary = (32 + 0)/2 = 16.
    expect(result).toEqual({ primaryOffsetY: -6, secondaryOffsetY: 16 });
  });

  it('honors a custom glyphPaddingEm (e.g. tighter-line font)', () => {
    const result = computeStackedTextOffsets({
      primaryFontSize: 40,
      secondaryFontSize: 16,
      glyphPaddingEm: 0.05,
    });
    expect(result).toEqual(expectedFor(40, 16, undefined, 0.05));
    // padding = 0.05 × 56 = 2.8 → em_gap = 12 - 2.8 = 9.2.
    // primary = -(9.2 + 16)/2 = -12.6.   secondary = (40 + 9.2)/2 = 24.6.
    expect(result.primaryOffsetY).toBe(-12.6);
    expect(result.secondaryOffsetY).toBe(24.6);
  });

  it('keeps the primary at the anchor when showSecondary is false', () => {
    const result = computeStackedTextOffsets({
      primaryFontSize: 43,
      secondaryFontSize: 17,
      showSecondary: false,
    });
    expect(result.primaryOffsetY).toBe(0);
    // Secondary offset is still computed — callers that emit both
    // elements unconditionally with the secondary hidden get a stable
    // value rather than NaN / undefined.
    expect(result.secondaryOffsetY).toBe(23);
  });

  it('rounds half away from zero so symmetric inputs stay symmetric', () => {
    // Half-integer offsets must reflect across 0, not be biased by
    // JS Math.round's round-toward-+∞ behavior on .5.
    const result = computeStackedTextOffsets({
      primaryFontSize: 36,
      secondaryFontSize: 14,
    });
    // padding = 0.15 × 50 = 7.5 → em_gap = 4.5.
    // primary = -(4.5 + 14)/2 = -9.25 → -9.3 (not -9.2).
    // secondary = (36 + 4.5)/2 = 20.25 → 20.3.
    expect(result.primaryOffsetY).toBe(-9.3);
    expect(result.secondaryOffsetY).toBe(20.3);
  });
});
