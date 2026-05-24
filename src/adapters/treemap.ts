import type {
  TreemapData,
  TreemapDataItem,
  TreemapChartOptions,
  TooltipContextItem,
} from '../types.js';
import type { RenderContext } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildAsyncTooltipFormatter,
  getLabelFontSize,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';

/**
 * ECharts treemap breadcrumb default height (px). The breadcrumb sits
 * flush at canvas bottom by default (`breadcrumb.bottom: 0`), so we
 * need to subtract this PLUS a small visual gap from the series'
 * bottom inset — otherwise the rectangle area extends behind the
 * breadcrumb and the two visually overlap.
 */
const BREADCRUMB_HEIGHT_PX = 22;

/**
 * Visual breathing gap (px) between the chart body and the breadcrumb
 * path. Matches the title-to-body gap so all three layout zones
 * (title / body / breadcrumb) feel evenly spaced.
 */
const BREADCRUMB_GAP_PX = 6;

/**
 * Map ECharts treemap tooltip params → unified `TooltipContextItem`. The
 * treemap fires `item`-trigger tooltips per node hover; ECharts populates
 * `params.color` with the painted rectangle fill so consumers receive a
 * real hex (the closure does NOT need a `nameToColor` map — every node
 * carries its own resolved `itemStyle.color`, which ECharts surfaces
 * back as `params.color`).
 */
function treemapParamsToTooltipContext(params: unknown): TooltipContextItem {
  const pr = params as Record<string, unknown>;
  return {
    kind: 'item',
    dataIndex: typeof pr.dataIndex === 'number' ? pr.dataIndex : 0,
    name: String(pr.name ?? ''),
    value: (pr.value as number | string) ?? '',
    marker: typeof pr.marker === 'string' ? pr.marker : undefined,
    color: typeof pr.color === 'string' ? pr.color : undefined,
  };
}

/**
 * Default synchronous tooltip body. Mirrors the per-item pattern used by
 * pie / word-cloud: marker chip + node name + formatted value.
 */
function treemapTooltipSyncHtml(
  params: unknown,
  options: TreemapChartOptions,
): string {
  const pr = params as Record<string, unknown>;
  const marker = (pr.marker as string) ?? '';
  const name = String(pr.name ?? '');
  const value = pr.value;
  if (value === undefined || value === null || value === '') {
    return `${marker}${name}`;
  }
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(value as number, name) : String(value);
  return `${marker}${name}: ${display}`;
}

/**
 * Walk the tree and deep-copy it into the ECharts-shaped node tree.
 *
 * Per-node responsibilities:
 *   - copy `name`, `value`, `children` straight through;
 *   - inject `itemStyle.color` from the resolved palette (root-level
 *     `nameToColor` lookup) OR from `node.color` (per-node override
 *     wins over palette).
 *
 * Returns a plain object ECharts can consume directly. The original
 * `TreemapDataItem` instances are NOT reused, so downstream mutation
 * of the returned tree never leaks back to the caller's input.
 */
function annotateTree(
  node: TreemapDataItem,
  nameToColor: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { name: node.name };
  if (node.value !== undefined) out.value = node.value;

  // Per-node color override > palette lookup keyed on the root-level
  // name. Children inherit from ECharts' built-in tinting (each level
  // gets a lighter shade derived from its ancestor's color) unless the
  // user pins them explicitly via `node.color`.
  const color = node.color ?? nameToColor.get(node.name);
  if (color) out.itemStyle = { color };

  if (node.children && node.children.length > 0) {
    out.children = node.children.map((child) => annotateTree(child, nameToColor));
  }
  return out;
}

/**
 * Resolve a `TreemapData` + `TreemapChartOptions` pair into an ECharts
 * option object. Single-series chart — emits one `{ type: 'treemap' }`
 * series.
 *
 * Layout: body-centered chart (no XY grid). Reserves the title height
 * on `top` via {@link getTitleReserve} (same pattern as pie / gauge /
 * radar / tree). When `showBreadcrumb` is on, ECharts paints the
 * breadcrumb trail inside the chart canvas — its default 25 px height
 * is allocated automatically by ECharts; the adapter doesn't add an
 * extra bottom reserve beyond `padding`.
 *
 * Colors: every ROOT-level node's name flows through {@link resolveColors};
 * the resulting palette is assigned per-node via `itemStyle.color` so
 * `options.colorMap` / `options.colors` / `node.color` overrides reach
 * the rendered rectangles. Child nodes inherit ECharts' built-in
 * descendant-tinting unless individually pinned.
 */
export function resolveTreemapOptions(
  data: TreemapData,
  options: TreemapChartOptions,
  _ctx?: RenderContext,
): Record<string, unknown> {
  const rootNames = data.map((d) => d.name);
  const palette = resolveColors(rootNames, options);
  const nameToColor = new Map<string, string>(
    rootNames.map((n, i) => [n, palette[i]] as const),
  );
  const annotated = data.map((root) => annotateTree(root, nameToColor));

  const p = options.padding ?? 12;
  const topReserve = p + getTitleReserve(options).top;
  // Bottom reserve grows when the breadcrumb is shown — push the
  // chart body UP by the breadcrumb's height + visual gap so the
  // rectangle area never overlaps the path chips below it.
  const showBreadcrumb = options.showBreadcrumb ?? true;
  const bottomReserve = showBreadcrumb
    ? p + BREADCRUMB_HEIGHT_PX + BREADCRUMB_GAP_PX
    : p;

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, _ctx),
    position: resolveTooltipPosition(options),
  };
  const asyncFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => treemapTooltipSyncHtml(params, options),
    toContext: treemapParamsToTooltipContext,
  });
  tooltip.formatter =
    asyncFormatter ?? ((params: unknown) => treemapTooltipSyncHtml(params, options));

  const showNodeLabel = options.showNodeLabel ?? true;
  const drilldown = options.drilldown ?? true;
  const enableRoam = options.enableRoam ?? false;

  // ECharts treemap wraps multi-root data in an implicit root and
  // labels that root from `series.name` in the breadcrumb's first
  // cell. With no name set, the first cell renders empty — which
  // looks broken next to the rest of the drill path. Derive the
  // root label from the title text so the breadcrumb agrees with
  // what the user sees above the chart (e.g. title "Disk Usage" →
  // breadcrumb starts with "Disk Usage › Library › Caches").
  // Users who want a different root label can either override
  // `options.echarts.series[0].name` or pass a TitleOptions object
  // with a different `text`.
  const titleText =
    typeof options.title === 'string' ? options.title : options.title?.text;

  const series: Record<string, unknown> = {
    type: 'treemap',
    // Name surfaces as the root cell in the breadcrumb path. Omit
    // entirely (rather than emitting `name: undefined`) so the
    // resolved option stays clean and `options.echarts.series[0].name`
    // overrides keep working.
    ...(titleText ? { name: titleText } : {}),
    // ECharts treemap honors only numeric pixel positions (no
    // percentages) for top/bottom/left/right. Mirror the title /
    // padding reserves the other body-centered adapters use. The
    // bottom inset folds in the breadcrumb height when the path
    // is visible (see `bottomReserve` above) so the chart body
    // never bleeds into the breadcrumb chips.
    top: topReserve,
    bottom: bottomReserve,
    left: p,
    right: p,
    // Click behavior: 'zoomToNode' drills down into the clicked
    // sub-tree (and back via the breadcrumb). `false` disables the
    // entire drill interaction — useful for snapshots / read-only.
    nodeClick: drilldown ? 'zoomToNode' : false,
    roam: enableRoam,
    // Breadcrumb is positioned `p` px above the canvas bottom (matches
    // chart padding); height pinned to BREADCRUMB_HEIGHT_PX so the
    // reserve math above stays accurate even if a future ECharts
    // release changes its default. NO color/border fields here —
    // those live in the theme so a `setTheme()` repaint sweeps the
    // breadcrumb chips along with everything else (see
    // `src/themes/echarts-theme.ts` → `treemap.breadcrumb.*`).
    breadcrumb: showBreadcrumb
      ? { show: true, bottom: p, height: BREADCRUMB_HEIGHT_PX }
      : { show: false },
    label: {
      show: showNodeLabel,
      fontSize: getLabelFontSize(options),
    },
    // Hide the "parent name" upper-label bar by default — it doubles
    // the breadcrumb when on and clutters small charts. Users who
    // want it can flip it via `options.echarts.series[0].upperLabel`.
    upperLabel: { show: false },
    data: annotated,
  };

  if (options.leafDepth !== undefined) {
    series.leafDepth = options.leafDepth;
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    series: [series],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );
  // Palette also published on the top-level option so ECharts can use
  // it for any palette-driven feature we haven't pinned per-node
  // (e.g. user-supplied `colorMappingBy: 'index'`).
  merged.color = palette;
  return merged;
}
