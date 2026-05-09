import type {
  ChartOptions,
  XYChartOptions,
  TitleOptions,
  LegendOptions,
  GridOptions,
  AxisOptions,
  XYData,
  TooltipOptions,
  TooltipContextAxis,
} from '../types.js';
import type { RenderContext } from './index.js';

/**
 * Structural shape consumed by {@link buildLegend} and its grid offset helper.
 *
 * `legend` no longer lives on the base `ChartOptions` — it sits on the
 * subtypes that actually render a legend (`XYChartOptions` for line/bar/area
 * and `PieChartOptions` for pie). Giving the helper an intersection rather
 * than the union of subtypes keeps the call sites concise without re-adding
 * `legend` to charts that ignore it (gauge / sankey / chord).
 */
type WithLegend = ChartOptions & { legend?: LegendOptions };
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import { deepMerge } from '../utils.js';
import { DEFAULT_LABEL_FONT, measureMaxTextWidth } from './text-measure.js';

// ---------------------------------------------------------------------------
// Default font stack
// ---------------------------------------------------------------------------

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", ' +
  '"Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------------------------------------------------------------------------
// Shared ECharts defaults that apply to every chart type
// ---------------------------------------------------------------------------

const CHART_DEFAULT_PADDING = 12;

/**
 * Treat NaN/undefined as "not set" for axis min/max. ECharts accepts numbers,
 * date-parseable strings, or the magic strings `'dataMin'` / `'dataMax'`; a
 * stray NaN (e.g. from a `Date.UTC(undefined, ...)` in user code) would
 * collapse the axis to a single tick, so we skip writing it.
 */
function isAxisBound(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.length > 0;
}

function getChartPadding(options: ChartOptions): number {
  return options.padding ?? CHART_DEFAULT_PADDING;
}

export function getCommonDefaults(): Record<string, unknown> {
  return {
    textStyle: {
      fontSize: 13,
      fontFamily: FONT_FAMILY,
    },
    tooltip: {
      padding: [6, 12],
      textStyle: { fontWeight: 'normal' },
      confine: true,
    },
    toolbox: { show: false },
  };
}

// ---------------------------------------------------------------------------
// Title helpers
// ---------------------------------------------------------------------------

const TITLE_DEFAULT_FONT_SIZE = 14;
const TITLE_DEFAULT_PADDING = 8;
/** Extra gap between the bottom of the title and the top of the plot area. */
const TITLE_CHART_GAP = 8;

function normalizeTitleOptions(title: string | TitleOptions): TitleOptions {
  return typeof title === 'string' ? { text: title } : title;
}

/**
 * Vertical space (px) consumed by the title widget itself, or 0 if no title.
 *
 * Module-private — the only canonical entry point for "how much room does
 * the title need?" is {@link getTitleReserve}, which wraps this number into
 * an {@link EdgeReserves} so callers can compose it with
 * {@link getLegendReserve} using the same edge math. External adapters
 * should reach for `getTitleReserve(options).top` instead.
 */
function getTitleHeight(options: ChartOptions): number {
  if (!options.title) return 0;
  const t = normalizeTitleOptions(options.title);
  return (t.fontSize ?? TITLE_DEFAULT_FONT_SIZE) + (t.padding ?? TITLE_DEFAULT_PADDING) * 2 + TITLE_CHART_GAP;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildTitle(options: ChartOptions): Record<string, unknown> | undefined {
  if (!options.title) return undefined;
  const t = normalizeTitleOptions(options.title);
  const fontSize = t.fontSize ?? TITLE_DEFAULT_FONT_SIZE;
  const titlePadding = t.padding ?? TITLE_DEFAULT_PADDING;
  const chartPadding = getChartPadding(options);

  return {
    text: t.text,
    left: t.align ?? 'center',
    top: chartPadding,
    padding: [titlePadding, 0],
    textStyle: { fontSize, fontWeight: 'normal' },
  };
}

export function buildLegend(
  names: string[],
  options: WithLegend,
): Record<string, unknown> {
  const legend: LegendOptions = options.legend ?? {};
  const show = legend.show ?? true;
  const position = legend.position ?? 'bottom';
  const p = getChartPadding(options);

  const positionMap: Record<string, Record<string, unknown>> = {
    top: { top: p, left: 'center', orient: 'horizontal' },
    bottom: { bottom: p, left: 'center', orient: 'horizontal' },
    left: { top: 'center', left: p, orient: 'vertical' },
    right: { top: 'center', right: p, orient: 'vertical' },
  };

  // Default to 'scroll' so a long series list shows paging arrows instead
  // of wrapping onto a second row. The reserve helpers
  // ({@link getLegendReserve} / {@link buildGrid}) assume a one-row slot
  // (LEGEND_RESERVE = 36 px); native ECharts wrapping ('plain') would
  // grow the legend's actual height without growing the reserve, so
  // wrapped rows would land on top of the chart body. Users who want
  // wrapping can opt back in via `options.legend.type = 'plain'` (and
  // are then responsible for adjusting `padding` accordingly).
  return {
    show,
    type: legend.type ?? 'scroll',
    data: names,
    icon: 'roundRect',
    itemGap: 10,
    pageButtonItemGap: 5,
    pageButtonGap: 10,
    pageIconSize: 12,
    ...positionMap[position],
  };
}

export interface BuildGridOverrides {
  /** When the adapter hides the legend (e.g. bar `colorByCategory`), pass `false` so grid padding matches. */
  legendShow?: boolean;
}

export function buildGrid(
  options: XYChartOptions,
  overrides?: BuildGridOverrides,
): Record<string, unknown> {
  const grid: GridOptions = options.grid ?? {};
  const legendArea = getLegendGridAdjustment(options, overrides?.legendShow);
  // Route through getTitleReserve so the grid path and body-centered
  // adapters (radar / pie / gauge) ask the same question of the title
  // widget. `.top` is the title widget height; `padding` is added here
  // because grid edges are absolute pixels (see EdgeReserves docs).
  const titleHeight = getTitleReserve(options).top;
  const p = getChartPadding(options);
  return deepMerge(
    {
      top: p + titleHeight,
      left: p,
      right: p,
      bottom: p,
      borderWidth: 0,
      containLabel: true,
    },
    legendArea,
    grid as Record<string, unknown>,
  );
}

/**
 * Pixel slot reserved for the legend component on the **top / bottom**
 * edges (i.e. the legend's row height + gap to the plot area). Adapters
 * compose this with their own layout — see {@link getLegendReserve} for
 * the helper that turns it into per-edge reserves, and {@link buildGrid}
 * for the XY-chart consumer.
 *
 * Side legends (`legend.position: 'left' | 'right'`) are stacked columns
 * whose width depends on the longest label — a fixed 36 px is far too
 * narrow there. {@link getLegendReserve} computes a width-based reserve
 * for those positions when callers pass the series names; this constant
 * stays the right answer for horizontal legends and serves as the floor
 * when the side legend has no names to measure.
 */
export const LEGEND_RESERVE = 36;

/**
 * Width budget added on top of the widest measured legend label for side
 * legends: swatch (~14 px) + icon-to-text gap (~5 px) + chart-to-legend
 * margin (~10 px). Approximates ECharts' default vertical legend padding
 * closely enough that the body never lands underneath the labels.
 */
const SIDE_LEGEND_NON_TEXT_PX = 30;

/**
 * Pixel reserves at each canvas edge. Empty edges are `0`.
 *
 * The shared "layout currency" returned by both {@link getTitleReserve}
 * (title widget on the top edge) and {@link getLegendReserve} (legend
 * widget on whichever edge `legend.position` selects). Consumed by
 * chart-body positioning math (radar.center + radius, pie.center,
 * gauge.center) and by {@link buildGrid} for grid-based charts. Charts
 * that need both reserves at once compose them edge-by-edge with
 * identical math (see `src/adapters/radar.ts` `getEdgeReserves`).
 *
 * Reserves are padding-free by convention — see {@link getLegendReserve}
 * for the rationale; callers add the chart's outer `padding` when their
 * coordinate system needs it.
 */
export interface EdgeReserves {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const EMPTY_EDGES: EdgeReserves = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });

/**
 * Pixel reserve the title widget occupies on each canvas edge.
 *
 * Returns all-zero {@link EdgeReserves} when no title is set; otherwise
 * places the title widget's pixel height (font + its own padding +
 * gap-to-content) on `top`, with the other edges still zero — `buildTitle`
 * always renders the title at the top of the canvas.
 *
 * The {@link EdgeReserves} shape mirrors {@link getLegendReserve} so
 * adapters that compose title + legend reserves can write a single edge
 * loop instead of branching on which component contributed which slot.
 * Forward-compatible: if `TitleOptions.position` is ever introduced this
 * helper switches edges the same way `getLegendReserve` does today —
 * callers won't need to change.
 *
 * Reserves do NOT include the chart's outer `padding`; that's a uniform
 * offset callers add when their coordinate system needs it (the XY grid
 * path adds `padding + reserve.top`; the percent-center path lets
 * `padding` cancel symmetrically — see the {@link getLegendReserve}
 * docblock for the same rationale).
 *
 * Title visibility is unambiguous (`options.title` defined ↔ shown), so
 * — unlike {@link getLegendReserve} — this helper takes no `show` flag.
 */
export function getTitleReserve(options: ChartOptions): EdgeReserves {
  const h = getTitleHeight(options);
  if (h === 0) return { ...EMPTY_EDGES };
  return { ...EMPTY_EDGES, top: h };
}

/**
 * Pixel reserve the legend occupies on each canvas edge.
 *
 * Returns zeros on every edge when the legend is hidden. Non-zero on
 * exactly one edge — whichever {@link LegendOptions.position} selects —
 * when shown. Charts subtract these reserves from the available canvas
 * when positioning a body that doesn't live on the XY grid (radar
 * polygon, pie/gauge ring) so the body and the legend row don't
 * collide.
 *
 * Reserves do NOT include the chart's outer `padding`; that's a
 * separate uniform offset that callers add when their coordinate
 * system needs it (e.g. {@link buildGrid} adds `padding + reserve`
 * because grid edges are absolute pixels, while radar's percent-based
 * center math doesn't need it because padding cancels symmetrically).
 *
 * @param showLegend pass `legend.show` after applying any adapter-side
 *   default (some charts default the legend off — see pie / radar).
 * @param extraGap optional pixel padding stacked onto the legend's own
 *   edge, for charts whose body extends past its nominal radius (e.g.
 *   radar.axisName labels overflow the polygon by ~15 px).
 * @param names optional series names that will appear in the legend.
 *   When the legend is on `'left'` / `'right'`, the slot width is
 *   computed as `widestLabel + swatch/icon/gap` (≥ {@link LEGEND_RESERVE}),
 *   so vertical legends with long labels don't overlap the chart body.
 *   Omit for the XY grid path (where the legend defaults to the bottom
 *   edge and one row of height is the right reserve regardless of label
 *   width).
 */
export function getLegendReserve(
  options: WithLegend,
  showLegend: boolean,
  extraGap = 0,
  names?: ReadonlyArray<string>,
): EdgeReserves {
  if (!showLegend) return { ...EMPTY_EDGES };
  const position = options.legend?.position ?? 'bottom';
  const isSide = position === 'left' || position === 'right';

  let slot: number;
  if (isSide && names && names.length > 0) {
    // Vertical legend on a side edge — the slot must be at least as wide
    // as the widest label plus swatch / icon / chart-gap. Falling back to
    // a fixed 36 px (the row-height reserve for horizontal legends) lets
    // the legend land on top of the chart body in narrow cards, which is
    // exactly what bit us with the pie / doughnut `position: 'right'`
    // case before this helper became name-aware.
    const widest = measureMaxTextWidth(names, DEFAULT_LABEL_FONT);
    slot =
      Math.max(LEGEND_RESERVE, Math.ceil(widest) + SIDE_LEGEND_NON_TEXT_PX) + extraGap;
  } else {
    slot = LEGEND_RESERVE + extraGap;
  }

  switch (position) {
    case 'top':
      return { ...EMPTY_EDGES, top: slot };
    case 'bottom':
      return { ...EMPTY_EDGES, bottom: slot };
    case 'left':
      return { ...EMPTY_EDGES, left: slot };
    case 'right':
      return { ...EMPTY_EDGES, right: slot };
    default:
      return { ...EMPTY_EDGES };
  }
}

function getLegendGridAdjustment(
  options: XYChartOptions,
  legendShow?: boolean,
): Record<string, unknown> {
  const show = legendShow ?? options.legend?.show ?? true;
  const reserves = getLegendReserve(options, show);
  // Grid bottom/top etc. are absolute pixel coordinates from the
  // canvas edge, so the grid must pull back by `padding + reserve`
  // (the radar/pie path doesn't add `padding` because their percent
  // center math against the full canvas already absorbs it).
  const p = getChartPadding(options);
  const out: Record<string, unknown> = {};
  if (reserves.top > 0) out.top = p + reserves.top;
  if (reserves.bottom > 0) out.bottom = p + reserves.bottom;
  if (reserves.left > 0) out.left = p + reserves.left;
  if (reserves.right > 0) out.right = p + reserves.right;
  return out;
}

export function buildXAxis(
  data: XYData,
  options: XYChartOptions,
  isTimeAxis: boolean,
): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.xAxis ?? {};

  const axis: Record<string, unknown> = {
    type: isTimeAxis ? 'time' : 'category',
    boundaryGap: !isTimeAxis,
    splitLine: { show: false },
    splitArea: { show: false },
  };

  if (!isTimeAxis) {
    axis.data = data.categories;
  }

  // min/max apply to value & time axes. Category axes derive their domain
  // from `data`, so ECharts ignores these — passing them through is harmless.
  // Treat NaN the same as unset; ECharts would otherwise collapse the axis
  // to a single tick and stack all data on one pixel position.
  if (isAxisBound(userAxis.min)) axis.min = userAxis.min;
  if (isAxisBound(userAxis.max)) axis.max = userAxis.max;

  if (userAxis.name) {
    axis.name = userAxis.name;
    axis.nameLocation = 'center';
    axis.nameGap = 30;
  }

  if (userAxis.formatLabel) {
    const fn = userAxis.formatLabel;
    axis.axisLabel = {
      formatter: (value: string | number, index: number) => fn(value, index),
    };
  } else if (isTimeAxis && userAxis.dateFormat) {
    const fmt = userAxis.dateFormat;
    axis.axisLabel = {
      formatter: (value: number) => formatDateByPattern(new Date(value), fmt),
    };
  }

  // Axis-pointer cursor label on the x-axis while hovering.
  // Uses cursorFormat if provided, falls back to dateFormat.
  if (isTimeAxis) {
    const cursorFmt = userAxis.cursorFormat ?? userAxis.dateFormat;
    if (cursorFmt) {
      const fmt = cursorFmt;
      axis.axisPointer = {
        label: {
          formatter: (params: { value: number }) =>
            formatDateByPattern(new Date(params.value), fmt),
        },
      };
    }
  }

  return [axis];
}

export function buildYAxis(options: XYChartOptions, count = 1): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.yAxis ?? {};
  const axes: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const axis: Record<string, unknown> = {
      type: 'value',
      splitArea: { show: false },
      nameLocation: 'center',
      nameGap: 60,
    };

    // min/max apply to every value-axis stack. Only the first axis honors
    // user-supplied name / formatter, so we mirror that pattern here.
    // NaN is treated as unset (see buildXAxis for the same reasoning).
    if (i === 0 && isAxisBound(userAxis.min)) axis.min = userAxis.min;
    if (i === 0 && isAxisBound(userAxis.max)) axis.max = userAxis.max;

    if (i === 0 && userAxis.name) {
      axis.name = userAxis.name;
    }

    if (i === 0 && userAxis.formatLabel) {
      const fn = userAxis.formatLabel;
      axis.axisLabel = {
        formatter: (value: string | number, index: number) => fn(value, index),
      };
    }

    if (i > 0) {
      axis.alignTicks = true;
    }

    axes.push(axis);
  }

  return axes;
}

/**
 * Builds the same HTML as icharts’ default axis tooltip for line/bar/area,
 * including `formatValue` and time `dateFormat` when applicable.
 */
export function formatAxisTooltipSyncHtml(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): string {
  const items = Array.isArray(params) ? params : [params];
  if (!items.length) return '';
  const firstItem = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    seriesName?: string;
    marker?: string;
  };
  const rawTs =
    firstItem.axisValue ??
    (Array.isArray(firstItem.value) ? (firstItem.value as [unknown, unknown])[0] : undefined);

  let header: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    header = !isNaN(ts) ? formatDateByPattern(new Date(ts), tooltip.dateFormat) : String(rawTs ?? '');
  } else {
    header = String(firstItem.axisValue ?? '');
  }

  const rows = items
    .map((p: unknown) => {
      const item = p as { marker?: string; seriesName?: string; value?: unknown };
      const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
      const displayVal = tooltip.formatValue
        ? tooltip.formatValue(val as number, item.seriesName ?? '')
        : val;
      return `${item.marker ?? ''}${item.seriesName ?? ''}: ${displayVal}`;
    })
    .join('<br/>');
  return `${header}<br/>${rows}`;
}

export function buildAxisTooltipContext(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): TooltipContextAxis {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    dataIndex?: number;
  };
  const rawTs =
    first.axisValue ??
    (Array.isArray(first.value) ? (first.value as [unknown, unknown])[0] : undefined);

  let axisValueLabel: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    axisValueLabel = !isNaN(ts)
      ? formatDateByPattern(new Date(ts), tooltip.dateFormat)
      : String(rawTs ?? '');
  } else {
    axisValueLabel = String(first.axisValue ?? '');
  }

  const series = items.map((p: unknown) => {
    const item = p as { marker?: string; seriesName?: string; value?: unknown };
    const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
    return {
      name: item.seriesName ?? '',
      value: val as number | string,
      marker: item.marker,
    };
  });

  return {
    kind: 'axis',
    axisValueLabel,
    dataIndex: first.dataIndex ?? 0,
    rawAxisValue: first.axisValue,
    series,
  };
}

/**
 * Inputs ECharts passes to a `tooltip.position` callback (the subset
 * we actually need). The full signature is
 * `(point, params, dom, rect, size) => Array | Object`; we only read
 * the cursor `point` and the `size.contentSize` / `size.viewSize`
 * pair, so we narrow it here to avoid leaking `any`s through the
 * helper return type. ECharts is tolerant of extra args in the
 * callback signature — declaring fewer is safe.
 */
interface TooltipPositionSize {
  contentSize: [number, number];
  viewSize: [number, number];
}

/**
 * `tooltip.position` callback type — narrowed from ECharts' broader
 * `Array | Object` return to the `[x, y]` tuple form we always produce.
 */
type TooltipPositionFn = (
  point: [number, number],
  params: unknown,
  dom: unknown,
  rect: unknown,
  size: TooltipPositionSize,
) => [number, number];

/**
 * Build a `tooltip.position` callback that places the tooltip a
 * configurable `gap` pixels away from the cursor — same edge-flip
 * geometry ECharts ships with by default, only with the hardcoded
 * 20 px replaced by `options.tooltip.cursorGap`.
 *
 * Returns `undefined` when the user did not set `cursorGap`, so the
 * resulting tooltip block can include `position: undefined` (ECharts
 * treats undefined as "use the built-in default" — identical to
 * omitting the field). This keeps every chart that doesn't opt in
 * pixel-for-pixel identical to the prior behavior.
 *
 * Edge-flip semantics (verbatim from ECharts' `refixTooltipPosition`):
 *   - Place the tooltip down-right of the cursor by `gap` px.
 *   - If the right edge would overflow the viewport, flip to
 *     down-left (with an extra 2 px buffer ECharts uses to keep the
 *     CSS `float: right` value column from wrapping to a second row).
 *   - If the bottom edge would overflow, flip to up.
 *
 * Why mirror ECharts' geometry instead of inventing our own:
 *   - Users dragging `cursorGap` from `20` → `8` expect the only
 *     change to be the spacing — not "the tooltip suddenly clips off
 *     the right side because we used a simpler positioning rule".
 *   - The 2 px right-edge buffer is invisible until it isn't (HTML
 *     tooltips with `float: right` values are exactly the layout the
 *     library's default theme uses), so dropping it would manifest
 *     as a regression for narrow charts only.
 */
export function resolveTooltipPosition(
  options: ChartOptions,
): TooltipPositionFn | undefined {
  const gap = options.tooltip?.cursorGap;
  if (gap === undefined) return undefined;
  return (point, _params, _dom, _rect, size) => {
    const [px, py] = point;
    const [w, h] = size.contentSize;
    const [vw, vh] = size.viewSize;
    let x = px + gap;
    let y = py + gap;
    // 2 px buffer mirrors ECharts' built-in handling for the CSS
    // `float: right` value column — see ECharts' `refixTooltipPosition`.
    if (x + w + 2 > vw) x = px - w - gap;
    if (y + h > vh) y = py - h - gap;
    return [x, y];
  };
}

/**
 * Decide ECharts' `tooltip.appendToBody` for a single tooltip block.
 *
 * Two-layer rule, mirroring the resolver pattern we use for colors:
 *
 *   1. **Explicit override wins** — if the user set
 *      `options.tooltip.appendToBody` to a boolean, use that verbatim.
 *      This is the escape hatch for the edge cases documented on
 *      {@link TooltipOptions.appendToBody}.
 *   2. **Auto by container** — otherwise default `true` for light-DOM
 *      containers (the tooltip can escape `overflow: hidden` ancestors
 *      like card / KPI / dialog wrappers) and `false` for shadow-DOM
 *      containers (preserve the `<i-chart>` web component's style
 *      encapsulation and stacking context).
 *
 * `ctx?.inShadowDom` is set once at engine init time from
 * `container.getRootNode() instanceof ShadowRoot` — see `IChart` in
 * `core.ts`. `undefined` ctx is treated as light DOM (the imperative
 * `createChart(divEl, ...)` happy path), so consumers who never touch
 * the web component get the bug-fix behaviour by default.
 *
 * Exported for the same reason `buildLegend` / `buildTooltip` are: any
 * future adapter that hand-rolls its own tooltip block (e.g. pie /
 * sankey / chord, which build tooltips inline because they need
 * trigger-specific formatters) should route the `appendToBody` field
 * through here so the decision stays in one place.
 */
export function resolveAppendToBody(
  options: ChartOptions,
  ctx?: RenderContext,
): boolean {
  const explicit = options.tooltip?.appendToBody;
  if (explicit !== undefined) return explicit;
  return !ctx?.inShadowDom;
}

/**
 * Tooltip config for `variant: 'spark'` line / bar / area charts.
 *
 * Spark charts live in tiny containers (e.g. a 96×48 px KPI card), so two
 * normal tooltip defaults stop being safe:
 *
 *   1. `confine: true` (what {@link buildTooltip} sets) would jam the
 *      tooltip into the same tiny rect as the chart canvas, making the
 *      label unreadable.
 *   2. Without confine, the tooltip extends past the chart container.
 *      Spark charts are almost always rendered inside a card / KPI cell
 *      with `overflow: hidden`, which clips the tooltip's DOM.
 *
 * The `appendToBody` field (defaulted by {@link resolveAppendToBody}) is
 * how we solve (2): in light DOM it lifts the tooltip element to
 * `<body>` so it escapes every `overflow: hidden` ancestor while ECharts
 * still positions it relative to the cursor; inside the `<i-chart>` web
 * component's shadow root it stays off so the tooltip stays inside the
 * shadow root for encapsulation. Either way, with `confine` left off the
 * tooltip can grow to whatever width it needs.
 *
 * Centralized so line + bar (and any future spark-capable adapter) share
 * the exact same tooltip behavior — drift between them would surface as
 * "the line spark tooltip works but the bar spark tooltip is clipped".
 */
/**
 * Default `cursorGap` for spark variants. ECharts' built-in 20 px is a
 * sane default on a 600×400 chart but covers roughly 40 % of a 96×48
 * KPI spark — large enough that the tooltip frequently lands on top of
 * the line it's annotating. 6 px is the smallest value where the
 * tooltip still reads as "next to the cursor" rather than "stuck on
 * the cursor" on typical card sizes (~ 80–160 px wide). Users who
 * want pixel-tight positioning can still pass `cursorGap: 0`
 * explicitly; setting an explicit value (including `0`) overrides
 * this default via the spread in `buildSparkTooltip` below.
 */
const SPARK_DEFAULT_CURSOR_GAP_PX = 6;

export function buildSparkTooltip(
  options: ChartOptions = {},
  ctx?: RenderContext,
): Record<string, unknown> {
  // Inject the spark cursorGap default BEFORE calling
  // `resolveTooltipPosition`. Spread order matters: the user's
  // `options.tooltip` lands on top of our default, so an explicit
  // `cursorGap: 0` (or any other value) still wins.
  const sparkOptions: ChartOptions = {
    ...options,
    tooltip: {
      cursorGap: SPARK_DEFAULT_CURSOR_GAP_PX,
      ...options.tooltip,
    },
  };
  return {
    show: true,
    trigger: 'axis',
    axisPointer: { type: 'none' },
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(sparkOptions),
  };
}

export function buildTooltip(
  options: ChartOptions,
  trigger: 'axis' | 'item' = 'axis',
  pointerType?: 'cross' | 'shadow' | 'line' | 'none',
  isTimeAxis = false,
  ctx?: RenderContext,
): Record<string, unknown> {
  const tooltip = options.tooltip ?? {};
  const result: Record<string, unknown> = {
    trigger,
    padding: [6, 12],
    textStyle: { fontWeight: 'normal' },
    confine: true,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };

  if (pointerType) {
    result.axisPointer = { type: pointerType };
  }

  if (tooltip.enabled === false) {
    result.show = false;
  }

  // Async extra — delegates to chart-agnostic createAsyncTooltipFormatter.
  if (tooltip.customHtml && trigger === 'axis') {
    const customHtml = tooltip.customHtml;
    result.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => formatAxisTooltipSyncHtml(params, tooltip, isTimeAxis),
      customHtml: (params) =>
        Promise.resolve(customHtml(buildAxisTooltipContext(params, tooltip, isTimeAxis))),
      placeholder: tooltip.placeholder,
    });
    return result;
  }

  if (tooltip.formatValue) {
    const fn = tooltip.formatValue;
    result.valueFormatter = (value: number | string) =>
      fn(value as number, '');
  }

  // For time axes, apply a date format to the tooltip header.
  // When dateFormat is provided it is used directly; otherwise ECharts
  // auto-selects a format based on data granularity.
  if (isTimeAxis && tooltip.dateFormat) {
    result.formatter = (params: unknown) => formatAxisTooltipSyncHtml(params, tooltip, true);
  }

  return result;
}

/**
 * Format a Date using dayjs/Moment.js-compatible tokens:
 * YYYY, MM, DD, HH, mm, ss
 */
function formatDateByPattern(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern
    .replace('YYYY', String(date.getFullYear()))
    .replace('YY', String(date.getFullYear()).slice(-2))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}


/**
 * Loosely matches common date/datetime string patterns:
 *   YYYY-MM-DD, YYYY/MM/DD, YYYY-MM, YYYY/MM
 *   optionally followed by T HH:mm or HH:mm:ss etc.
 */
const DATE_STRING_RE =
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([T ]\d{1,2}(:\d{2}(:\d{2})?)?)?Z?$/;

/**
 * Detect whether XY categories represent time values.
 * Accepts:
 *  - Unix timestamps: 10-digit (seconds) or 13-digit (milliseconds) numbers
 *  - Date strings: ISO 8601 and common variants (e.g. "2024-01-15", "2024/06/01 08:30")
 */
/**
 * Detect whether `categories` should be plotted on an ECharts time axis
 * (`type: 'time'`) rather than a category axis.
 *
 * Heuristic — every entry must look time-like AND at least one entry must
 * unambiguously anchor the array as a timestamp series:
 *
 *   - **strings**: matches {@link DATE_STRING_RE} (ISO-ish date format).
 *   - **numbers**: either `0` (the unix epoch, freely accepted) or
 *     `|v| >= 1e8` (≈ April 1973 in ms; ≈ year 5138 in seconds — safely
 *     outside the range of categorical IDs / small enums).
 *   - **anchor**: at least one entry must be a date string OR have
 *     `|v| >= 1e9` so a lone `[0]` doesn't masquerade as time.
 *
 * Tradeoff vs. the previous "string length === 10 || 13" rule: that check
 * silently fell over for sub-second-magnitude timestamps (e.g. `Date.UTC(1968,…)`
 * is 11 digits, `Date.UTC(1970,0,1)` is exactly `0`). Streaming series that
 * crossed the epoch flipped the axis from `time` to `category` mid-stream
 * and collapsed every point onto one pixel column. The magnitude-based
 * check above accepts the full plausible timestamp range.
 *
 * When in doubt, users should set `xAxis.dateFormat` — line/area adapters
 * treat that as an explicit opt-in even when the heuristic would miss.
 */
export function isTimeCategories(categories: (string | number)[]): boolean {
  if (categories.length === 0) return false;
  let hasRealTimestamp = false;
  const everyValid = categories.every((v) => {
    if (typeof v === 'number') {
      if (v === 0) return true; // free pass; needs another entry to anchor
      const abs = Math.abs(v);
      if (abs < 1e8) return false;
      if (abs >= 1e9) hasRealTimestamp = true;
      return true;
    }
    if (typeof v === 'string') {
      const ok = DATE_STRING_RE.test(v.trim());
      if (ok) hasRealTimestamp = true;
      return ok;
    }
    return false;
  });
  return everyValid && hasRealTimestamp;
}
