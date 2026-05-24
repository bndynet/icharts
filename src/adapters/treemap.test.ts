import { describe, it, expect } from 'vitest';
import type {
  TreemapData,
  TooltipContext,
  TooltipContextItem,
} from '../types.js';
import { isTreemapData } from '../types.js';
import { resolveTreemapOptions } from './treemap.js';

type TooltipFormatter = (
  params: unknown,
  ticket: string,
  callback: (t: string, h: string) => void,
) => string | undefined;

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

const sample: TreemapData = [
  {
    name: 'Flare',
    children: [
      {
        name: 'analytics',
        children: [
          { name: 'cluster', value: 100 },
          { name: 'graph', value: 80 },
        ],
      },
      { name: 'data', value: 60 },
    ],
  },
  { name: 'Other', value: 40 },
];

describe('isTreemapData', () => {
  it('accepts a non-empty array of named items', () => {
    expect(isTreemapData(sample)).toBe(true);
  });

  it('accepts flat-leaves arrays (no children)', () => {
    expect(
      isTreemapData([
        { name: 'A', value: 1 },
        { name: 'B', value: 2 },
      ]),
    ).toBe(true);
  });

  it('accepts internal-only nodes that omit value', () => {
    expect(
      isTreemapData([{ name: 'A', children: [{ name: 'a1', value: 1 }] }]),
    ).toBe(true);
  });

  it('rejects empty arrays and non-array payloads', () => {
    expect(isTreemapData([] as unknown as TreemapData)).toBe(false);
    expect(
      isTreemapData({ categories: [], series: [] } as unknown as TreemapData),
    ).toBe(false);
  });

  it('rejects entries missing the name field', () => {
    expect(
      isTreemapData([{ value: 1 }] as unknown as TreemapData),
    ).toBe(false);
  });
});

describe('treemap adapter', () => {
  it('emits a single treemap series', () => {
    const option = resolveTreemapOptions(sample, {});
    expect((option.series as unknown[]).length).toBe(1);
    const s = getSeries(option);
    expect(s.type).toBe('treemap');
  });

  it('preserves hierarchical shape (name + value + children)', () => {
    const option = resolveTreemapOptions(sample, {});
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect(data.map((d) => d.name)).toEqual(['Flare', 'Other']);
    const flare = data[0];
    const flareChildren = flare.children as Array<Record<string, unknown>>;
    expect(flareChildren.map((c) => c.name)).toEqual(['analytics', 'data']);
    const analytics = flareChildren[0];
    const analyticsChildren = analytics.children as Array<Record<string, unknown>>;
    expect(analyticsChildren.map((c) => c.name)).toEqual(['cluster', 'graph']);
    expect(analyticsChildren[0].value).toBe(100);
  });

  it('paints root-level palette via per-node itemStyle.color', () => {
    const option = resolveTreemapOptions(sample, {
      colors: ['#111111', '#222222'],
    });
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect((data[0].itemStyle as Record<string, unknown>).color).toBe('#111111');
    expect((data[1].itemStyle as Record<string, unknown>).color).toBe('#222222');
    // Palette also published on the top-level option for ECharts'
    // own descendant-tinting / `colorMappingBy: 'index'` defaults.
    expect(option.color).toEqual(['#111111', '#222222']);
  });

  it('lets per-node `color` override the resolved palette', () => {
    const option = resolveTreemapOptions(
      [
        { name: 'A', value: 1, color: '#ff00ff' },
        { name: 'B', value: 2 },
      ],
      { colors: ['#111111', '#222222'] },
    );
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect((data[0].itemStyle as Record<string, unknown>).color).toBe('#ff00ff');
    expect((data[1].itemStyle as Record<string, unknown>).color).toBe('#222222');
  });

  it('honors per-node color on nested descendants', () => {
    const option = resolveTreemapOptions(
      [
        {
          name: 'A',
          children: [{ name: 'a1', value: 1, color: '#abcdef' }],
        },
      ],
      {},
    );
    const root = (getSeries(option).data as Array<Record<string, unknown>>)[0];
    const child = (root.children as Array<Record<string, unknown>>)[0];
    expect((child.itemStyle as Record<string, unknown>).color).toBe('#abcdef');
  });

  it('reserves title space above the chart body via series.top', () => {
    const withTitle = getSeries(
      resolveTreemapOptions(sample, { title: 'Disk Usage', padding: 10 }),
    );
    const noTitle = getSeries(resolveTreemapOptions(sample, { padding: 10 }));
    expect(withTitle.top as number).toBeGreaterThan(noTitle.top as number);
  });

  it('toggles breadcrumb / node label / drilldown defaults via options', () => {
    const defaults = getSeries(resolveTreemapOptions(sample, {}));
    expect((defaults.breadcrumb as Record<string, unknown>).show).toBe(true);
    expect((defaults.label as Record<string, unknown>).show).toBe(true);
    expect(defaults.nodeClick).toBe('zoomToNode');
    expect(defaults.roam).toBe(false);

    const off = getSeries(
      resolveTreemapOptions(sample, {
        showBreadcrumb: false,
        showNodeLabel: false,
        drilldown: false,
        enableRoam: true,
      }),
    );
    expect((off.breadcrumb as Record<string, unknown>).show).toBe(false);
    expect((off.label as Record<string, unknown>).show).toBe(false);
    expect(off.nodeClick).toBe(false);
    expect(off.roam).toBe(true);
  });

  it('reserves room for the breadcrumb so the chart body does not overlap the path', () => {
    const withBreadcrumb = getSeries(
      resolveTreemapOptions(sample, { padding: 12 }),
    );
    const withoutBreadcrumb = getSeries(
      resolveTreemapOptions(sample, { padding: 12, showBreadcrumb: false }),
    );
    expect(withoutBreadcrumb.bottom as number).toBe(12);
    expect(withBreadcrumb.bottom as number).toBeGreaterThan(
      withoutBreadcrumb.bottom as number,
    );
    expect(withBreadcrumb.bottom as number).toBe(12 + 22 + 6);
  });

  it('pins breadcrumb height + bottom offset so the reserve math stays accurate', () => {
    const s = getSeries(resolveTreemapOptions(sample, { padding: 12 }));
    const breadcrumb = s.breadcrumb as Record<string, unknown>;
    expect(breadcrumb.show).toBe(true);
    expect(breadcrumb.height).toBe(22);
    expect(breadcrumb.bottom).toBe(12);
  });

  it('does not emit any color/border fields on breadcrumb (theme owns chip styling)', () => {
    const breadcrumb = getSeries(resolveTreemapOptions(sample, {}))
      .breadcrumb as Record<string, unknown>;
    expect('itemStyle' in breadcrumb).toBe(false);
    expect('emphasis' in breadcrumb).toBe(false);
    expect('textStyle' in breadcrumb).toBe(false);
  });

  it('derives series.name from string title so the breadcrumb root is labelled', () => {
    const s = getSeries(resolveTreemapOptions(sample, { title: 'Disk Usage' }));
    expect(s.name).toBe('Disk Usage');
  });

  it('derives series.name from TitleOptions.text when the title is an object', () => {
    const s = getSeries(
      resolveTreemapOptions(sample, { title: { text: 'My Treemap', align: 'left' } }),
    );
    expect(s.name).toBe('My Treemap');
  });

  it('omits series.name entirely when no title is set (no empty breadcrumb cell label)', () => {
    const s = getSeries(resolveTreemapOptions(sample, {}));
    expect('name' in s).toBe(false);
  });

  it('lets options.echarts.series[0].name override the title-derived root name', () => {
    const s = getSeries(
      resolveTreemapOptions(sample, {
        title: 'Disk Usage',
        echarts: { series: [{ name: 'Custom Root' }] },
      } as Record<string, unknown>),
    );
    // deepMerge replaces the series array, but the override case is
    // documented in the docs — assert the merge behavior so a future
    // contributor changing this doesn't quietly break the contract.
    expect(s.name).toBe('Custom Root');
  });

  it('forwards leafDepth onto the series when set', () => {
    const set = getSeries(resolveTreemapOptions(sample, { leafDepth: 2 }));
    expect(set.leafDepth).toBe(2);
    const unset = getSeries(resolveTreemapOptions(sample, {}));
    expect('leafDepth' in unset).toBe(false);
  });

  it('honors labelFontSize via getLabelFontSize on series.label', () => {
    const s = getSeries(
      resolveTreemapOptions(sample, { labelFontSize: 18 }),
    );
    expect((s.label as Record<string, unknown>).fontSize).toBe(18);
  });

  it('does not emit label.color (theme owns canvas-rendered text)', () => {
    const label = getSeries(resolveTreemapOptions(sample, {}))
      .label as Record<string, unknown>;
    expect('color' in label).toBe(false);
  });

  it('formats default sync tooltip as `marker name: value`', () => {
    const tooltip = resolveTreemapOptions(sample, {}).tooltip as Record<
      string,
      unknown
    >;
    const formatter = tooltip.formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'cluster',
        value: 100,
        marker: '<span/>',
        dataIndex: 0,
      }),
    ).toBe('<span/>cluster: 100');
  });

  it('falls back to `marker name` when value is missing (internal nodes)', () => {
    const formatter = (resolveTreemapOptions(sample, {}).tooltip as Record<
      string,
      unknown
    >).formatter as (params: unknown) => string;
    expect(
      formatter({ name: 'analytics', marker: '<span/>', dataIndex: 0 }),
    ).toBe('<span/>analytics');
  });

  it('routes user-defined tooltip.formatValue through the sync body', () => {
    const formatter = (resolveTreemapOptions(sample, {
      tooltip: { formatValue: (v: string | number) => `${v} MB` },
    }).tooltip as Record<string, unknown>).formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'cluster',
        value: 100,
        marker: '<span/>',
        dataIndex: 0,
      }),
    ).toBe('<span/>cluster: 100 MB');
  });

  it('threads name/value/color into customHtml via TooltipContextItem', async () => {
    let captured: TooltipContext | undefined;
    const option = resolveTreemapOptions(sample, {
      tooltip: {
        customHtml: async (ctx) => {
          captured = ctx;
          return 'ok';
        },
      },
    });
    const tooltip = option.tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as TooltipFormatter;
    formatter(
      {
        name: 'cluster',
        value: 100,
        marker: '<span/>',
        color: '#ff00ff',
        dataIndex: 3,
      },
      't0',
      () => {},
    );
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    expect(captured?.kind).toBe('item');
    const item = captured as TooltipContextItem;
    expect(item.name).toBe('cluster');
    expect(item.value).toBe(100);
    expect(item.color).toBe('#ff00ff');
    expect(item.dataIndex).toBe(3);
  });

  it('merges options.echarts last as escape hatch (top-level field)', () => {
    const option = resolveTreemapOptions(sample, {
      echarts: { backgroundColor: '#fafafa' },
    });
    expect(option.backgroundColor).toBe('#fafafa');
    expect((option.series as unknown[]).length).toBe(1);
  });

  it('palette wins over user echarts.color (matches sibling adapters)', () => {
    const option = resolveTreemapOptions(sample, {
      colors: ['#111111', '#222222'],
      echarts: { color: ['#999999', '#888888'] },
    });
    expect(option.color).toEqual(['#111111', '#222222']);
  });
});
