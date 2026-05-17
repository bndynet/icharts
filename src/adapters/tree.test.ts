import { describe, it, expect } from 'vitest';
import type { TreeData } from '../types.js';
import { isTreeData } from '../types.js';
import { resolveTreeOptions } from './tree.js';
import { DEFAULT_LABEL_FONT_SIZE } from './common.js';

const sample: TreeData = {
  name: 'root',
  children: [
    {
      name: 'A',
      children: [
        { name: 'A1', value: 10 },
        { name: 'A2', value: 20 },
      ],
    },
    {
      name: 'B',
      children: [{ name: 'B1', value: 7 }],
    },
    { name: 'C', value: 3 },
  ],
};

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

describe('isTreeData', () => {
  it('accepts a minimal root-only tree', () => {
    expect(isTreeData({ name: 'root' } as TreeData)).toBe(true);
  });

  it('accepts a nested tree with children + values', () => {
    expect(isTreeData(sample)).toBe(true);
  });

  it('rejects null / arrays / primitives', () => {
    expect(isTreeData(null as unknown as TreeData)).toBe(false);
    expect(isTreeData([] as unknown as TreeData)).toBe(false);
  });

  it('rejects payloads that look like other built-in chart types', () => {
    // Sankey/network/chord — { nodes, links }
    expect(
      isTreeData({ name: 'X', nodes: [], links: [] } as unknown as TreeData),
    ).toBe(false);
    // XY — { categories, series }
    expect(
      isTreeData({
        name: 'X',
        categories: [],
        series: [],
      } as unknown as TreeData),
    ).toBe(false);
    // Radar — { indicators, series }
    expect(
      isTreeData({
        name: 'X',
        indicators: [],
        series: [],
      } as unknown as TreeData),
    ).toBe(false);
  });

  it('rejects when name is missing or not a string', () => {
    expect(isTreeData({} as unknown as TreeData)).toBe(false);
    expect(isTreeData({ name: 42 } as unknown as TreeData)).toBe(false);
  });
});

describe('tree adapter', () => {
  it('emits a single ECharts tree series wrapping the root in an array', () => {
    const option = resolveTreeOptions(sample, {});
    const s = getSeries(option);
    expect(s.type).toBe('tree');
    expect(Array.isArray(s.data)).toBe(true);
    expect((s.data as unknown[]).length).toBe(1);
    const root = (s.data as Record<string, unknown>[])[0];
    expect(root.name).toBe('root');
    expect(Array.isArray(root.children)).toBe(true);
  });

  it('preserves the input hierarchy (deep copy with value passthrough)', () => {
    const option = resolveTreeOptions(sample, {});
    const root = (getSeries(option).data as Record<string, unknown>[])[0];
    const children = root.children as Record<string, unknown>[];
    expect(children.map((c) => c.name)).toEqual(['A', 'B', 'C']);
    const a = children[0];
    const aKids = a.children as Record<string, unknown>[];
    expect(aKids.map((n) => n.value)).toEqual([10, 20]);
    // Leaf node 'C' carries its value
    expect(children[2].value).toBe(3);
  });

  it('returns a deep copy — does not mutate the input tree', () => {
    const input: TreeData = {
      name: 'r',
      children: [{ name: 'x', value: 1 }],
    };
    const before = JSON.stringify(input);
    resolveTreeOptions(input, { color: '#abcdef' } as never);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('honors node.collapsed', () => {
    const data: TreeData = {
      name: 'root',
      children: [
        {
          name: 'closed',
          collapsed: true,
          children: [{ name: 'hidden' }],
        },
      ],
    };
    const root = (getSeries(resolveTreeOptions(data, {})).data as Record<
      string,
      unknown
    >[])[0];
    const closed = (root.children as Record<string, unknown>[])[0];
    expect(closed.collapsed).toBe(true);
  });

  describe('direction → orient + label position mapping', () => {
    it('defaults to left-to-right (orient: "LR")', () => {
      const s = getSeries(resolveTreeOptions(sample, {}));
      expect(s.orient).toBe('LR');
      const label = s.label as Record<string, unknown>;
      expect(label.position).toBe('left');
      expect(label.align).toBe('right');
      const leaves = s.leaves as Record<string, unknown>;
      const leafLabel = leaves.label as Record<string, unknown>;
      expect(leafLabel.position).toBe('right');
      expect(leafLabel.align).toBe('left');
    });

    it('left-to-right reserves BOTH edges of the active axis (root + leaf labels both grow outward)', () => {
      const s = getSeries(
        resolveTreeOptions(sample, { direction: 'left-to-right', padding: 10 }),
      );
      // Active axis (horizontal) — both root-side (left) AND leaf-side
      // (right) need a label reserve, since parent labels grow left from
      // the root and leaf labels grow right from each leaf. Before this
      // fix the left edge only got `padding`, so the root's label
      // (`Project Hierarchy`, etc.) routinely bled past the canvas edge.
      expect(s.left as number).toBeGreaterThan(10);
      expect(s.right as number).toBeGreaterThan(10);
      // Perpendicular axis (vertical) — labels are vertically centered
      // on each node, so top/bottom only need the chart padding.
      expect(s.top).toBe(10);
      expect(s.bottom).toBe(10);
    });

    it('right-to-left mirrors orient AND reserves both horizontal edges', () => {
      const s = getSeries(
        resolveTreeOptions(sample, { direction: 'right-to-left', padding: 10 }),
      );
      expect(s.orient).toBe('RL');
      expect((s.label as Record<string, unknown>).position).toBe('right');
      expect(
        ((s.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .position,
      ).toBe('left');
      // Both horizontal edges keep their label reserve (mirror of LR).
      expect(s.left as number).toBeGreaterThan(10);
      expect(s.right as number).toBeGreaterThan(10);
      expect(s.top).toBe(10);
      expect(s.bottom).toBe(10);
    });

    it('top-to-bottom rotates labels -90° and reserves widest-label-width on top/bottom (matches ECharts tree-vertical example)', () => {
      const s = getSeries(
        resolveTreeOptions(sample, { direction: 'top-to-bottom', padding: 10 }),
      );
      expect(s.orient).toBe('TB');
      const label = s.label as Record<string, unknown>;
      expect(label.position).toBe('top');
      // After clockwise -90° rotation, `align: 'right'` puts the end of
      // the unrotated text at the BOTTOM of the rendered glyph, so the
      // text grows UPWARD from the node (away from the body, into the
      // top reserve). Verbatim from the ECharts tree-vertical example.
      expect(label.align).toBe('right');
      expect(label.rotate).toBe(-90);
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      expect(leafLabel.position).toBe('bottom');
      expect(leafLabel.align).toBe('left');
      expect(leafLabel.rotate).toBe(-90);
      // Active axis (vertical) — rotated labels' unrotated WIDTH
      // becomes vertical extent, so the top/bottom reserve is the same
      // widest-label calculation horizontal layouts apply on left/right.
      expect(s.top as number).toBeGreaterThan(10);
      expect(s.bottom as number).toBeGreaterThan(10);
      // Perpendicular axis (horizontal) — rotated labels are a thin
      // vertical strip ~font-height wide; reserve only needs
      // half-line-height + gap. Far smaller than the active-axis slot.
      expect(s.left as number).toBeGreaterThan(10);
      expect(s.right as number).toBeGreaterThan(10);
      expect((s.left as number) < (s.top as number)).toBe(true);
    });

    it('bottom-to-top rotates labels +90° (counter-clockwise) so text reads bottom-to-top alongside the tree', () => {
      const s = getSeries(
        resolveTreeOptions(sample, { direction: 'bottom-to-top', padding: 10 }),
      );
      expect(s.orient).toBe('BT');
      const label = s.label as Record<string, unknown>;
      expect(label.position).toBe('bottom');
      // BT uses `rotate: +90` (counter-clockwise) so text flows in the
      // same direction the tree grows — upward-readable text for an
      // upward-growing tree. With `+90`, the unrotated right-end
      // becomes the rotated TOP, so `align: 'right'` puts the rotated
      // top at the anchor and the text extends DOWNWARD from the node
      // into the bottom reserve (parents are at the bottom in BT).
      expect(label.align).toBe('right');
      expect(label.rotate).toBe(90);
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      expect(leafLabel.position).toBe('top');
      // Mirror: `align: 'left'` puts the rotated bottom at the anchor,
      // text extends UPWARD into the top reserve (leaves at the top
      // in BT).
      expect(leafLabel.align).toBe('left');
      expect(leafLabel.rotate).toBe(90);
      // Same dual-axis reserves as TB — bounding box is rotation-sign-
      // agnostic, so ±90° produce identical pixel geometry.
      expect(s.top as number).toBeGreaterThan(10);
      expect(s.bottom as number).toBeGreaterThan(10);
      expect(s.left as number).toBeGreaterThan(10);
      expect(s.right as number).toBeGreaterThan(10);
      expect((s.right as number) < (s.top as number)).toBe(true);
    });

    it('vertical rotation sign tracks the growth direction (TB clockwise, BT counter-clockwise)', () => {
      const tb = getSeries(
        resolveTreeOptions(sample, { direction: 'top-to-bottom' }),
      );
      const bt = getSeries(
        resolveTreeOptions(sample, { direction: 'bottom-to-top' }),
      );
      // Opposite signs — text reading direction mirrors tree direction.
      expect((tb.label as Record<string, unknown>).rotate).toBe(-90);
      expect((bt.label as Record<string, unknown>).rotate).toBe(90);
      expect(
        ((tb.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .rotate,
      ).toBe(-90);
      expect(
        ((bt.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .rotate,
      ).toBe(90);
    });

    it('horizontal layouts (LR/RL) keep labels unrotated', () => {
      const lr = getSeries(resolveTreeOptions(sample, { direction: 'left-to-right' }));
      const rl = getSeries(resolveTreeOptions(sample, { direction: 'right-to-left' }));
      expect((lr.label as Record<string, unknown>).rotate).toBe(0);
      expect(
        ((lr.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .rotate,
      ).toBe(0);
      expect((rl.label as Record<string, unknown>).rotate).toBe(0);
      expect(
        ((rl.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .rotate,
      ).toBe(0);
    });

    // Regression for the original "labels go outside the canvas" bug.
    // Before the per-axis reserve fix, the root-side edge only got the
    // chart `padding` (12 px by default), which was nowhere near enough
    // for typical title-style labels.
    it('root-edge reserve scales with the widest parent name (LR/RL) — root labels never clip', () => {
      const tiny: TreeData = {
        name: 'r',
        children: [{ name: 'x' }],
      };
      const huge: TreeData = {
        // 30-char root name — far wider than the chart padding (12 px).
        name: 'AVeryLongCorporateRootNameForTesting',
        children: [{ name: 'x' }],
      };
      const tinyLeft = getSeries(
        resolveTreeOptions(tiny, { direction: 'left-to-right', padding: 12 }),
      ).left as number;
      const hugeLeft = getSeries(
        resolveTreeOptions(huge, { direction: 'left-to-right', padding: 12 }),
      ).left as number;
      expect(hugeLeft).toBeGreaterThan(tinyLeft);
    });

    it('leaf-edge reserve scales with the widest leaf name', () => {
      const shortLeaves: TreeData = {
        name: 'r',
        children: [{ name: 'a' }, { name: 'b' }],
      };
      const longLeaves: TreeData = {
        name: 'r',
        children: [
          { name: 'AggregateExpressionEvaluator' },
          { name: 'b' },
        ],
      };
      const shortRight = getSeries(
        resolveTreeOptions(shortLeaves, { direction: 'left-to-right', padding: 12 }),
      ).right as number;
      const longRight = getSeries(
        resolveTreeOptions(longLeaves, { direction: 'left-to-right', padding: 12 }),
      ).right as number;
      expect(longRight).toBeGreaterThan(shortRight);
    });

    it('hiding labels collapses the label-driven reserves back to padding', () => {
      const noLabels = getSeries(
        resolveTreeOptions(sample, {
          direction: 'left-to-right',
          padding: 10,
          showNodeLabel: false,
        }),
      );
      // With `showNodeLabel: false` no label can clip, so neither
      // horizontal edge needs a label reserve.
      expect(noLabels.left).toBe(10);
      expect(noLabels.right).toBe(10);
    });

    it('label reserve is capped so a single freakishly long name cannot collapse the chart body', () => {
      const monsterRoot: TreeData = {
        // 200 chars — would shrink the body to nothing without the cap.
        name: 'X'.repeat(200),
        children: [{ name: 'leaf' }],
      };
      const s = getSeries(
        resolveTreeOptions(monsterRoot, {
          direction: 'left-to-right',
          padding: 12,
        }),
      );
      // Cap is 200 px reserve + 12 px padding = 212 px. Add 1 px headroom
      // for the canvas rounding inside `measureMaxTextWidth`.
      expect(s.left as number).toBeLessThanOrEqual(212 + 1);
    });
  });

  describe('title reserve', () => {
    it('adds title widget height to the top inset', () => {
      const baseline = getSeries(
        resolveTreeOptions(sample, { padding: 10 }),
      ).top as number;
      const withTitle = getSeries(
        resolveTreeOptions(sample, { padding: 10, title: 'Hello' }),
      ).top as number;
      expect(withTitle).toBeGreaterThan(baseline);
    });

    it('bottom-to-top still flows the title widget through to the top inset', () => {
      // BT's top edge is the LEAF edge (root is at the bottom), so the
      // top inset competes between the leaf-label reserve and the title
      // widget via `max(reserveFor('top'), titleR)`. We hide labels here
      // to drive the label reserve to 0, isolating the title contribution
      // — otherwise even a tiny tree's clamped MIN_RESERVE (~40 px) would
      // mask the title widget (~38 px) and the test wouldn't tell us
      // whether the title actually flowed through.
      const noTitle = getSeries(
        resolveTreeOptions(sample, {
          direction: 'bottom-to-top',
          padding: 10,
          showNodeLabel: false,
        }),
      ).top as number;
      const withTitle = getSeries(
        resolveTreeOptions(sample, {
          direction: 'bottom-to-top',
          padding: 10,
          showNodeLabel: false,
          title: 'X',
        }),
      ).top as number;
      expect(withTitle).toBeGreaterThan(noTitle);
    });
  });

  describe('color pipeline', () => {
    it('resolves merged.color from every node name in pre-order', () => {
      const option = resolveTreeOptions(sample, {
        colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'],
      });
      // sample has 7 nodes total: root, A, A1, A2, B, B1, C
      expect((option.color as string[]).length).toBe(7);
      expect((option.color as string[])[0]).toBe('#111111');
    });

    it('injects itemStyle.color on each node from the resolved palette', () => {
      const option = resolveTreeOptions(sample, {
        colorMap: { A: '#abcdef' },
      });
      const root = (getSeries(option).data as Record<string, unknown>[])[0];
      const a = (root.children as Record<string, unknown>[])[0];
      const style = a.itemStyle as Record<string, unknown>;
      expect(style.color).toBe('#abcdef');
    });

    it('honors per-node color override (wins over colorMap / colors)', () => {
      const data: TreeData = {
        name: 'root',
        children: [{ name: 'pinned', color: '#ff5722' }],
      };
      const option = resolveTreeOptions(data, {
        colorMap: { pinned: '#0000ff' }, // should lose
      });
      const child = (
        (getSeries(option).data as Record<string, unknown>[])[0]
          .children as Record<string, unknown>[]
      )[0];
      expect((child.itemStyle as Record<string, unknown>).color).toBe('#ff5722');
    });
  });

  describe('options pass-through', () => {
    it('symbolSize comes from options.nodeSize (default 7)', () => {
      expect(getSeries(resolveTreeOptions(sample, {})).symbolSize).toBe(7);
      expect(
        getSeries(resolveTreeOptions(sample, { nodeSize: 14 })).symbolSize,
      ).toBe(14);
    });

    it('defaults to pan-only and lets enablePan/enableZoom compose roam', () => {
      expect(getSeries(resolveTreeOptions(sample, {})).roam).toBe('move');
      expect(
        getSeries(resolveTreeOptions(sample, { enablePan: false, enableZoom: false })).roam,
      ).toBe(false);
      expect(
        getSeries(resolveTreeOptions(sample, { enablePan: true, enableZoom: true })).roam,
      ).toBe(true);
      expect(
        getSeries(resolveTreeOptions(sample, { enablePan: false, enableZoom: true })).roam,
      ).toBe('scale');
    });

    it('expandAndCollapse defaults to true; can be turned off', () => {
      expect(
        getSeries(resolveTreeOptions(sample, {})).expandAndCollapse,
      ).toBe(true);
      expect(
        getSeries(
          resolveTreeOptions(sample, { expandAndCollapse: false }),
        ).expandAndCollapse,
      ).toBe(false);
    });

    it('initialTreeDepth defaults to -1 (fully expanded); can be overridden', () => {
      expect(
        getSeries(resolveTreeOptions(sample, {})).initialTreeDepth,
      ).toBe(-1);
      expect(
        getSeries(resolveTreeOptions(sample, { initialTreeDepth: 2 }))
          .initialTreeDepth,
      ).toBe(2);
    });

    it('maps options.lineStyle to series.edgeShape', () => {
      expect(getSeries(resolveTreeOptions(sample, {})).edgeShape).toBe('polyline');
      expect(
        getSeries(resolveTreeOptions(sample, { lineStyle: 'curve' })).edgeShape,
      ).toBe('curve');
      expect(
        getSeries(resolveTreeOptions(sample, { lineStyle: 'polyline' })).edgeShape,
      ).toBe('polyline');
    });

    it('showNodeLabel toggles the series-level label.show flag', () => {
      const off = getSeries(
        resolveTreeOptions(sample, { showNodeLabel: false }),
      );
      expect((off.label as Record<string, unknown>).show).toBe(false);
      const on = getSeries(resolveTreeOptions(sample, {}));
      expect((on.label as Record<string, unknown>).show).toBe(true);
    });

    it('does NOT set series.label.color or leaves.label.color (theme owns it)', () => {
      const s = getSeries(resolveTreeOptions(sample, {}));
      const label = s.label as Record<string, unknown>;
      expect('color' in label).toBe(false);
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      expect('color' in leafLabel).toBe(false);
    });

    it('parent and leaf labels default to DEFAULT_LABEL_FONT_SIZE (measure-vs-render contract)', () => {
      // If parent and leaf fontSizes drift from the size used to
      // build the canvas measureText font string, the measured label
      // width predicts a different glyph extent than ECharts actually
      // renders — re-introducing the original "labels go outside the
      // canvas" bug. Lock both values to the project-canonical default
      // so a future change has to update the constant and this test
      // in the same commit.
      const s = getSeries(resolveTreeOptions(sample, {}));
      const label = s.label as Record<string, unknown>;
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      expect(label.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
      expect(leafLabel.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
    });

    it('parent and leaf labels propagate ChartOptions.labelFontSize in lockstep', () => {
      // The global knob must move BOTH the parent and leaf fontSize
      // together — otherwise the measure-vs-render contract above
      // silently breaks when a user sizes labels up.
      const s = getSeries(resolveTreeOptions(sample, { labelFontSize: 18 }));
      const label = s.label as Record<string, unknown>;
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      expect(label.fontSize).toBe(18);
      expect(leafLabel.fontSize).toBe(18);
    });
  });

  describe('tooltip', () => {
    it('formats a node hover with marker + name + value', () => {
      const option = resolveTreeOptions(sample, {});
      const fmt = (option.tooltip as Record<string, unknown>)
        .formatter as (p: unknown) => string;
      const html = fmt({ marker: '◆', name: 'A1', value: 10 });
      expect(html).toBe('◆A1: 10');
    });

    it('omits the value clause when undefined (e.g. internal nodes)', () => {
      const option = resolveTreeOptions(sample, {});
      const fmt = (option.tooltip as Record<string, unknown>)
        .formatter as (p: unknown) => string;
      const html = fmt({ marker: '◆', name: 'root' });
      expect(html).toBe('◆root');
    });

    it('applies tooltip.formatValue to the value', () => {
      const option = resolveTreeOptions(sample, {
        tooltip: { formatValue: (v) => `${v} units` },
      });
      const fmt = (option.tooltip as Record<string, unknown>)
        .formatter as (p: unknown) => string;
      expect(fmt({ marker: '◆', name: 'A1', value: 10 })).toBe(
        '◆A1: 10 units',
      );
    });

    it('hides the tooltip when options.tooltip.enabled === false', () => {
      const option = resolveTreeOptions(sample, {
        tooltip: { enabled: false },
      });
      expect((option.tooltip as Record<string, unknown>).show).toBe(false);
    });
  });

  describe('echarts escape hatch', () => {
    it('merges options.echarts into the resolved option', () => {
      const option = resolveTreeOptions(sample, {
        echarts: { backgroundColor: '#fafafa' },
      });
      expect(option.backgroundColor).toBe('#fafafa');
    });

    it('palette wins over user echarts.color (matches sibling adapters)', () => {
      const option = resolveTreeOptions(sample, {
        colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'],
        echarts: { color: ['#999999'] },
      });
      expect((option.color as string[])[0]).toBe('#111111');
    });
  });
});
