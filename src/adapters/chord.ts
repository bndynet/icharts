import * as echarts from 'echarts';
import type { ChordData, ChartOptions } from '../types.js';
import { deepMerge } from '../utils.js';
import { buildTitle, getTitleHeight } from './common.js';
import { resolveSeriesColors, getThemeColors } from '../themes/index.js';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const ARC_GAP = 0.05;
const ARC_WIDTH = 14;
const RIBBON_OPACITY = 0.45;
const f = (n: number) => n.toFixed(2);

// ---------------------------------------------------------------------------
// Internal element types
// ---------------------------------------------------------------------------

type ArcEl = {
  kind: 'arc';
  name: string;
  a1: number;
  a2: number;
  color: string;
};

type RibEl = {
  kind: 'rib';
  src: string;
  tgt: string;
  sa: number; sb: number;
  ta: number; tb: number;
  value: number;
  color: string;
};

type El = ArcEl | RibEl;

// ---------------------------------------------------------------------------
// Public setup types
// ---------------------------------------------------------------------------

export interface ChordGeom {
  cx: number;
  cy: number;
  r: number;
}

export interface ChordRibbon {
  sa: number; sb: number;
  ta: number; tb: number;
  color: string;
}

type RenderFn = (
  params: Record<string, unknown>,
  api: Record<string, unknown>,
) => unknown;

/**
 * Everything initChordChart needs.  Returned alongside the ECharts option.
 */
export interface ChordSetup {
  hover: { idx: number };
  geom: ChordGeom;
  ribbons: (ChordRibbon | null)[];
  renderItem: RenderFn;
  /**
   * Original series data array (never mutated).
   * redraw() spreads each item into a fresh object so ECharts sees a new
   * array reference, which guarantees renderItem is re-invoked for every item.
   * The items themselves are content-identical so dataIndex values stay stable.
   */
  seriesData: { name: string; value: number }[];
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

export function buildChordChart(
  data: ChordData,
  options: ChartOptions,
): { option: Record<string, unknown>; setup: ChordSetup } {
  const p = options.padding ?? 12;
  const top = p + getTitleHeight(options);

  // Resolve node colours — resolveSeriesColors also syncs the active theme,
  // so getThemeColors() returns the correct tokens immediately after.
  const names = data.nodes.map((n) => n.name);
  const palette = resolveSeriesColors(names, options.colors, options.colorMap);
  const labelColor = getThemeColors()?.textPrimary ?? '#555';
  const nodeColor: Record<string, string> = {};
  data.nodes.forEach((n, i) => { nodeColor[n.name] = n.color ?? palette[i]; });

  // Compute layout
  const { arcs, ribbons } = computeLayout(data, nodeColor);
  // Ribbons first: their z2 is lower (5), arcs are on top (10).
  const elements: El[] = [...ribbons, ...arcs];

  const geom: ChordGeom = { cx: 0, cy: 0, r: 0 };
  const hover = { idx: -1 };

  const seriesData = elements.map((el) => ({
    name: el.kind === 'rib' ? `${el.src} → ${el.tgt}` : el.name,
    value: el.kind === 'rib' ? el.value : 0,
  }));

  const fmt = options.tooltip?.formatValue;

  /**
   * renderItem reads hover.idx directly through the closure.
   * It is re-called by ECharts whenever initChordChart triggers a redraw via
   * setOption({ series: [{ renderItem: newWrap }] }).  The data array is
   * never mutated, so dataIndex values are always stable.
   */
  const renderItem: RenderFn = (params, api) => {
    const dataIdx = params['dataIndex'] as number;
    const el = elements[dataIdx];
    const W = (api['getWidth'] as () => number)();
    const H = (api['getHeight'] as () => number)();
    const cx = W / 2;
    const usableH = H - top - p;
    const cy = top + usableH / 2;
    const R = Math.max(
      ARC_WIDTH + 10,
      Math.min(usableH / 2 - 14, W / 2 - 60),
    );
    const r = R - ARC_WIDTH;

    geom.cx = cx;
    geom.cy = cy;
    geom.r = r;

    const anyHovered = hover.idx !== -1;
    const isHoveredRib = anyHovered && el.kind === 'rib' && dataIdx === hover.idx;

    if (el.kind === 'arc') {
      const dim = anyHovered ? 0.15 : 1;
      return {
        type: 'group',
        silent: true,
        children: [
          {
            type: 'path',
            z2: 10,
            shape: { pathData: arcPath(el.a1, el.a2, cx, cy, r, R) },
            style: { fill: el.color, stroke: 'none', opacity: dim },
          },
          labelEl(el.name, el.a1, el.a2, cx, cy, R, dim, labelColor),
        ],
      };
    }

    // Ribbon — z2 is intentionally fixed at 5 for ALL ribbons (hovered or not).
    // Changing z2 on hover brings the highlighted ribbon to the front, which
    // blocks mouseover events from reaching ribbons below it in overlap areas.
    // Keeping z2 constant ensures every ribbon remains hittable near its arc.
    const ribOpacity = anyHovered
      ? (isHoveredRib ? 0.92 : 0.05)
      : RIBBON_OPACITY;

    return {
      type: 'path',
      z2: 5,
      shape: { pathData: ribbonPath(el.sa, el.sb, el.ta, el.tb, cx, cy, r) },
      style: {
        fill: el.color,
        opacity: ribOpacity,
        stroke: isHoveredRib ? 'rgba(255,255,255,0.85)' : 'none',
        lineWidth: isHoveredRib ? 2 : 0,
      },
    };
  };

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: {
      trigger: 'item',
      confine: true,
      show: options.tooltip?.enabled !== false,
      formatter: (params: Record<string, unknown>) => {
        const el = elements[params['dataIndex'] as number];
        if (!el || el.kind !== 'rib') return '';
        const label = `${el.src} → ${el.tgt}`;
        const v = fmt ? fmt(el.value, label) : el.value;
        return `${label}: <strong>${v}</strong>`;
      },
    },
    series: [
      {
        type: 'custom',
        coordinateSystem: 'none',
        data: seriesData,
        renderItem,
      },
    ],
  };

  const option = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);

  const setup: ChordSetup = {
    hover,
    geom,
    ribbons: elements.map((el) =>
      el.kind === 'rib'
        ? { sa: el.sa, sb: el.sb, ta: el.ta, tb: el.tb, color: el.color }
        : null,
    ),
    renderItem,
    seriesData,
  };

  return { option, setup };
}

// ---------------------------------------------------------------------------
// Post-init interactivity hook
// ---------------------------------------------------------------------------

/**
 * Attaches hover behaviour to a chord chart instance.
 *
 * Why a new renderItem wrapper on each redraw (instead of changing data):
 * - Providing a different function reference to `setOption({ series:[{renderItem}] })`
 *   forces ECharts to schedule a new render pass and re-call renderItem for
 *   every data item.
 * - The data array is NEVER touched, so `params.dataIndex` always maps
 *   1-to-1 with the original elements array — no index drift.
 * - Inside the wrapper we call the original renderItem which reads hover.idx
 *   (already updated before the setOption call) to compute per-element opacity.
 */
export function initChordChart(
  instance: echarts.ECharts,
  { hover, renderItem: origRenderItem, seriesData }: ChordSetup,
): void {
  type P = { componentType?: string; dataIndex?: number; name?: string };

  const redraw = () => {
    // Two techniques combined to guarantee ECharts re-invokes renderItem:
    // 1. New renderItem wrapper reference  → ECharts sees the function changed.
    // 2. Spread seriesData into a fresh array  → ECharts detects a data change.
    //    Content is identical (no _t mutation) so dataIndex values stay stable.
    instance.setOption({
      series: [{
        type: 'custom',
        coordinateSystem: 'none',
        data: seriesData.map((d) => ({ ...d })),
        renderItem: (p: unknown, a: unknown) =>
          origRenderItem(
            p as Record<string, unknown>,
            a as Record<string, unknown>,
          ),
      }],
    });
  };

  instance.on('mouseover', (p: P) => {
    if (
      p.componentType === 'series' &&
      p.dataIndex !== undefined &&
      (p.name ?? '').includes('→') &&
      hover.idx !== p.dataIndex
    ) {
      hover.idx = p.dataIndex;
      redraw();
    }
  });

  // Only clear when the ribbon that is currently highlighted leaves.
  instance.on('mouseout', (p: P) => {
    if (
      p.componentType === 'series' &&
      p.dataIndex !== undefined &&
      p.dataIndex === hover.idx
    ) {
      hover.idx = -1;
      redraw();
    }
  });
}

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------

function computeLayout(
  data: ChordData,
  nodeColor: Record<string, string>,
): { arcs: ArcEl[]; ribbons: RibEl[] } {
  const total: Record<string, number> = {};
  data.nodes.forEach((n) => (total[n.name] = 0));
  data.links.forEach((l) => {
    total[l.source] = (total[l.source] ?? 0) + l.value;
    total[l.target] = (total[l.target] ?? 0) + l.value;
  });

  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  if (sum === 0) return { arcs: [], ribbons: [] };

  const scale = (2 * Math.PI - ARC_GAP * data.nodes.length) / sum;

  const nodeA1: Record<string, number> = {};
  let angle = -Math.PI / 2;
  data.nodes.forEach((n) => {
    nodeA1[n.name] = angle;
    angle += total[n.name] * scale + ARC_GAP;
  });

  const arcs: ArcEl[] = data.nodes.map((n) => ({
    kind: 'arc',
    name: n.name,
    a1: nodeA1[n.name],
    a2: nodeA1[n.name] + total[n.name] * scale,
    color: nodeColor[n.name],
  }));

  const cursor: Record<string, number> = { ...nodeA1 };
  const ribbonEls: RibEl[] = data.links.map((l) => {
    const len = l.value * scale;
    const sa = cursor[l.source]; cursor[l.source] += len;
    const ta = cursor[l.target]; cursor[l.target] += len;
    return {
      kind: 'rib',
      src: l.source, tgt: l.target,
      sa, sb: sa + len, ta, tb: ta + len,
      value: l.value,
      color: nodeColor[l.source],
    };
  });

  return { arcs, ribbons: ribbonEls };
}

// ---------------------------------------------------------------------------
// SVG path builders
// ---------------------------------------------------------------------------

function arcPath(
  a1: number, a2: number,
  cx: number, cy: number,
  r: number, R: number,
): string {
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  const pt = (radius: number, a: number) =>
    `${f(cx + radius * Math.cos(a))} ${f(cy + radius * Math.sin(a))}`;
  return (
    `M ${pt(R, a1)} A ${f(R)} ${f(R)} 0 ${lg} 1 ${pt(R, a2)} ` +
    `L ${pt(r, a2)} A ${f(r)} ${f(r)} 0 ${lg} 0 ${pt(r, a1)} Z`
  );
}

function ribbonPath(
  sa: number, sb: number,
  ta: number, tb: number,
  cx: number, cy: number,
  r: number,
): string {
  const ls = sb - sa > Math.PI ? 1 : 0;
  const lt = tb - ta > Math.PI ? 1 : 0;
  const pt = (a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  return (
    `M ${pt(sa)} A ${f(r)} ${f(r)} 0 ${ls} 1 ${pt(sb)} ` +
    `Q ${f(cx)} ${f(cy)} ${pt(tb)} ` +
    `A ${f(r)} ${f(r)} 0 ${lt} 0 ${pt(ta)} ` +
    `Q ${f(cx)} ${f(cy)} ${pt(sa)} Z`
  );
}

// ---------------------------------------------------------------------------
// Label element
// ---------------------------------------------------------------------------

function labelEl(
  name: string, a1: number, a2: number,
  cx: number, cy: number, R: number,
  opacity: number,
  color: string,
): Record<string, unknown> {
  const mid = (a1 + a2) / 2;
  const lr = R + 10;
  return {
    type: 'text',
    z2: 20,
    style: {
      text: name,
      x: cx + lr * Math.cos(mid),
      y: cy + lr * Math.sin(mid),
      textAlign: Math.cos(mid) >= 0 ? 'left' : 'right',
      textVerticalAlign: 'middle',
      fontSize: 12,
      fill: color,
      opacity,
    },
  };
}
