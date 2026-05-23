import { describe, it, expect, vi } from 'vitest';
import type { TreeData } from '../types.js';
import { isTreeData } from '../types.js';
import { resolveTreeOptions } from './tree.js';
import { resolveTreeSetup } from './tree.js';
import { DEFAULT_LABEL_FONT_SIZE } from './common/index.js';
import * as iconSymbol from './common/icon-symbol.js';

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

    it('disableLabelRotate forces 0° rotation even on vertical layouts', () => {
      const tb = getSeries(
        resolveTreeOptions(sample, {
          direction: 'top-to-bottom',
          disableLabelRotate: true,
        }),
      );
      const bt = getSeries(
        resolveTreeOptions(sample, {
          direction: 'bottom-to-top',
          disableLabelRotate: true,
        }),
      );
      expect((tb.label as Record<string, unknown>).rotate).toBe(0);
      expect(
        ((tb.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .rotate,
      ).toBe(0);
      expect((bt.label as Record<string, unknown>).rotate).toBe(0);
      expect(
        ((bt.leaves as Record<string, unknown>).label as Record<string, unknown>)
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

    it('formatNodeLabel can customize parent and leaf labels with plain string output', () => {
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeLabel: ({ name, isLeaf, depth }) =>
            `${isLeaf ? 'L' : 'P'}:${depth}:${name}`,
        }),
      );
      const parentFmt = (s.label as Record<string, unknown>)
        .formatter as (params: unknown) => string;
      const leafFmt = ((s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >).formatter as (params: unknown) => string;

      expect(parentFmt({ name: 'A', data: { name: 'A' } })).toBe('P:1:A');
      expect(leafFmt({ name: 'A1', data: { name: 'A1' } })).toBe('L:2:A1');
      expect((s.label as Record<string, unknown>).align).toBe('center');
      expect(
        ((s.leaves as Record<string, unknown>).label as Record<string, unknown>)
          .align,
      ).toBe('center');
    });

    it('formatNodeLabel supports RichTextSpec and injects compiled rich map', () => {
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeLabel: ({ name, isLeaf }) => ({
            segments: [
              {
                text: isLeaf ? 'Leaf ' : 'Parent ',
                style: {
                  width: 56,
                  align: 'right',
                },
              },
              {
                text: name,
                style: 'name',
              },
            ],
            styles: {
              name: { fontWeight: 'bold' },
            },
          }),
        }),
      );
      const parentLabel = s.label as Record<string, unknown>;
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      const parentFmt = parentLabel.formatter as (params: unknown) => string;
      const leafFmt = leafLabel.formatter as (params: unknown) => string;

      const parentText = parentFmt({ name: 'A', data: { name: 'A' } });
      const leafText = leafFmt({ name: 'A1', data: { name: 'A1' } });
      expect(parentText).toMatch(/\{__ich_treeLabel_/);
      expect(leafText).toMatch(/\{__ich_treeLabel_/);

      const parentRich = parentLabel.rich as Record<string, unknown>;
      const leafRich = leafLabel.rich as Record<string, unknown>;
      expect(Object.keys(parentRich).length).toBeGreaterThan(0);
      expect(Object.keys(leafRich).length).toBeGreaterThan(0);
    });

    it('formatNodeIcon replaces node symbol with image for matching nodes', () => {
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ name, isLeaf }) =>
            isLeaf
              ? { image: `https://example.com/${name}.png`, width: 18 }
              : null,
        }),
      );
      const parentLabel = s.label as Record<string, unknown>;
      const leafLabel = (s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >;
      // Icon-only customization does not change default directional alignment.
      expect(parentLabel.align).toBe('right');
      expect(leafLabel.align).toBe('left');
      // Leaf nodes receive image symbols, internal nodes keep defaults.
      const root = (s.data as Record<string, unknown>[])[0];
      const a = (root.children as Record<string, unknown>[])[0];
      const a1 = (a.children as Record<string, unknown>[])[0];
      expect(a.symbol).toBeUndefined();
      expect(a1.symbol).toBe('image://https://example.com/A1.png');
      expect(a1.symbolSize).toBe(18);
    });

    it('formatNodeIcon shape:"circle" without border emits a colored-circle placeholder (NO pattern fill, NO border)', () => {
      // The synchronous output is intentionally a clean colored circle —
      // the real avatar (contain-fit image inside circular clip) is
      // pre-composited and swapped in via the adapter's `onInit` hook
      // as an `image://` symbol. We assert the placeholder contract here:
      //
      //   - `symbol === 'circle'` so SSR / canvas-less environments
      //     show a visible marker rather than nothing;
      //   - `itemStyle.color` is a STRING (the palette color), not the
      //     buggy `{ image }` pattern fill — that path mis-aligns under
      //     a circle shape and crops the avatar;
      //   - **No `borderColor` / `borderWidth` keys** when the user
      //     didn't ask for a border. Border is opt-in: only emitted
      //     when `icon.borderWidth > 0`. This is the "no default
      //     border" contract — see the dedicated override test below
      //     for the present-when-set assertions.
      //   - NO `borderRadius` on the placeholder — it has no effect on
      //     the built-in `circle` symbol and only confused readers.
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ name, isLeaf }) =>
            isLeaf
              ? { image: `https://example.com/${name}.png`, width: 24, shape: 'circle' }
              : null,
        }),
      );
      const root = (s.data as Record<string, unknown>[])[0];
      const a = (root.children as Record<string, unknown>[])[0];
      const a1 = (a.children as Record<string, unknown>[])[0];
      expect(a1.symbol).toBe('circle');
      const style = a1.itemStyle as Record<string, unknown>;
      expect(typeof style.color).toBe('string');
      expect('borderColor' in style).toBe(false);
      expect('borderWidth' in style).toBe(false);
      expect('borderRadius' in style).toBe(false);
      expect(a1.symbolSize).toBe(24);
    });

    it('formatNodeIcon — border is opt-in via borderWidth (works for circle AND square)', () => {
      // Three-rule contract — applies to BOTH `shape: 'circle'` and
      // `shape: 'square'` (the lib normalizes square to ECharts' `rect`
      // symbol when a border is requested, since `image://` symbols
      // can't render `itemStyle.border*` natively):
      //
      //   1. **No `borderWidth` (or `borderWidth: 0`) → no border** at
      //      all. `itemStyle` carries no `borderColor` / `borderWidth`
      //      keys; canvas pipeline skips the stroke; native fallback
      //      omits the rectangular frame. This is the "default zero"
      //      contract: users who want a border must say so explicitly.
      //
      //   2. **`borderWidth > 0` and no `borderColor` → palette ring**.
      //      The stroke color falls back to the same palette token
      //      that drives the placeholder fill, so a single
      //      `borderWidth: 2` opt-in produces the classic
      //      "single-color chip" look without forcing the user to
      //      duplicate the palette.
      //
      //   3. **Both set → user values win**. `borderColor` is honored
      //      verbatim and does NOT change the placeholder fill, so the
      //      chip still reflects node identity (palette) even when the
      //      ring is pinned to a brand color.
      //
      // The same values are stashed in the per-node meta so the async
      // PNG bake (`renderIconDataUrl`) sees the same values and the
      // placeholder → PNG swap is visually continuous.

      // Rule 2 — `borderWidth` set, `borderColor` un-set → ring falls
      // back to palette. Verify against BOTH shapes since the resolver
      // path is shared.
      for (const shape of ['circle', 'square'] as const) {
        const s = getSeries(
          resolveTreeOptions(sample, {
            formatNodeIcon: ({ isLeaf }) =>
              isLeaf
                ? {
                    image: 'https://example.com/x.png',
                    width: 36,
                    shape,
                    borderWidth: 4,
                  }
                : null,
          }),
        );
        const a1 = (
          (
            (s.data as Record<string, unknown>[])[0].children as Record<
              string,
              unknown
            >[]
          )[0].children as Record<string, unknown>[]
        )[0];
        // Square + border now uses the `rect` shape symbol so ECharts
        // honors `itemStyle.border*` (image symbols don't); circle uses
        // `circle`. Both produce the same border contract on the
        // placeholder.
        expect(a1.symbol).toBe(shape === 'circle' ? 'circle' : 'rect');
        const style = a1.itemStyle as Record<string, unknown>;
        expect(style.borderWidth).toBe(4);
        expect(style.borderColor).toBe(style.color); // both = palette
      }

      // Rule 3 — both set → custom `borderColor` wins, fill stays palette.
      const sBoth = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf
              ? {
                  image: 'https://example.com/x.png',
                  width: 32,
                  shape: 'circle',
                  borderColor: '#f43f5e',
                  borderWidth: 3,
                }
              : null,
        }),
      );
      const a1Both = (
        (
          (sBoth.data as Record<string, unknown>[])[0].children as Record<
            string,
            unknown
          >[]
        )[0].children as Record<string, unknown>[]
      )[0];
      const styleBoth = a1Both.itemStyle as Record<string, unknown>;
      expect(styleBoth.borderColor).toBe('#f43f5e');
      expect(styleBoth.borderWidth).toBe(3);
      expect(styleBoth.color).not.toBe('#f43f5e'); // fill still palette

      // Rule 3, but verify `borderColor` ALONE (without `borderWidth`)
      // produces NO border at all. Color without width is silently
      // ignored — there's no border to color. Symbol falls back to
      // the no-border path: plain `image://` for square, `circle` shape
      // placeholder for circle (then async-swap to image).
      const sColorOnly = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf
              ? {
                  image: 'https://example.com/x.png',
                  width: 24,
                  shape: 'square',
                  borderColor: '#f43f5e',
                  // borderWidth deliberately unset
                }
              : null,
        }),
      );
      const a1ColorOnly = (
        (
          (sColorOnly.data as Record<string, unknown>[])[0]
            .children as Record<string, unknown>[]
        )[0].children as Record<string, unknown>[]
      )[0];
      expect(a1ColorOnly.symbol).toBe('image://https://example.com/x.png');
      // No itemStyle.border* keys — color was discarded along with the
      // missing width. (palette-fill itemStyle may still be assigned
      // by the default-color codepath, but it must NOT carry border
      // keys.)
      const styleColorOnly = (a1ColorOnly.itemStyle as
        | Record<string, unknown>
        | undefined);
      if (styleColorOnly) {
        expect('borderColor' in styleColorOnly).toBe(false);
        expect('borderWidth' in styleColorOnly).toBe(false);
      }
    });

    it('formatNodeIcon shape:"square" without border keeps native image symbol (no canvas baking)', () => {
      // The "square + no border" path is the original `formatNodeIcon`
      // contract from before bordered-square support landed: ECharts
      // loads the image natively via `image://`, no canvas pipeline,
      // no per-node meta, no `onInit` swap needed. Critical to keep
      // working unchanged so existing apps that pass `formatNodeIcon`
      // for plain square avatars don't pay for the canvas pipeline.
      //
      // Conversely, `square + borderWidth` MUST go through canvas
      // baking — ECharts' `image://` symbol doesn't render
      // `itemStyle.border*`, so the only way to draw a frame around
      // the image is to bake it into the bitmap. We assert the
      // adapter routes accordingly.
      const sNoBorder = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf ? { image: 'https://example.com/x.png', width: 24 } : null,
        }),
      );
      const a1NoBorder = (
        (
          (sNoBorder.data as Record<string, unknown>[])[0]
            .children as Record<string, unknown>[]
        )[0].children as Record<string, unknown>[]
      )[0];
      // Plain image symbol — same as the old square path.
      expect(a1NoBorder.symbol).toBe('image://https://example.com/x.png');
      expect(a1NoBorder.symbolKeepAspect).toBe(true);

      const sBordered = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf
              ? {
                  image: 'https://example.com/x.png',
                  width: 24,
                  borderWidth: 2,
                }
              : null,
        }),
      );
      const a1Bordered = (
        (
          (sBordered.data as Record<string, unknown>[])[0]
            .children as Record<string, unknown>[]
        )[0].children as Record<string, unknown>[]
      )[0];
      // Switched to `rect` shape symbol — supports `itemStyle.border*`
      // natively for the placeholder until the canvas pipeline swaps
      // in the baked PNG. The `image://` URL is NOT in `symbol` (the
      // image is reached via the meta + async swap, not directly).
      expect(a1Bordered.symbol).toBe('rect');
      const styleBordered = a1Bordered.itemStyle as Record<string, unknown>;
      expect(styleBordered.borderWidth).toBe(2);
      expect(typeof styleBordered.borderColor).toBe('string');
    });

    it('formatNodeIcon shape:"circle" — non-square sizes emit symbolSize tuple', () => {
      // The non-square branch is covered for the regular image-symbol
      // path (`shape !== 'circle'`) — verify the same handling reaches
      // the circular-avatar branch so adapters that pass `width !==
      // height` (e.g. a hexagonal avatar tile someone might build on
      // top of this) get a `[w, h]` symbolSize without falling back to
      // a single scalar.
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf
              ? {
                  image: 'https://example.com/x.png',
                  width: 24,
                  height: 36,
                  shape: 'circle',
                }
              : null,
        }),
      );
      const root = (s.data as Record<string, unknown>[])[0];
      const a1 = ((root.children as Record<string, unknown>[])[0].children as Record<
        string,
        unknown
      >[])[0];
      expect(a1.symbolSize).toEqual([24, 36]);
    });

    it('formatNodeIcon scales label.distance with icon size, leaves default dots untouched', () => {
      // ECharts' default `label.distance` (5 px) is fine for a 7 px dot
      // but reads as cramped under a 36 px avatar. The adapter computes
      // `distance = max(round(maxDim / 3), 8)` and writes it as a
      // per-node label override so the gap scales with the actual icon
      // — without disturbing layouts that don't opt into custom icons.
      //
      // Three behaviors locked in by this test:
      //   1. Big icons (avatars) get a generous gap that scales with size
      //      so the label doesn't visually collide with the symbol.
      //   2. Small custom icons clamp at the 8 px floor so `round(width
      //      * 1/3)` can't dip below the minimum-readable gap.
      //   3. Default-dot nodes (no `formatNodeIcon`) emit no per-node
      //      `label` override at all, so existing trees see zero reflow
      //      after this fix lands.
      //
      // The non-square branch picks `max(width, height)` so a 24x36
      // avatar gets the same generous gap as a 36x36 one — the label
      // visually anchors to the side perpendicular to the symbol's
      // major axis.

      const sBig = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf ? { image: 'https://example.com/x.png', width: 36 } : null,
        }),
      );
      const a1Big = (
        (
          (sBig.data as Record<string, unknown>[])[0].children as Record<
            string,
            unknown
          >[]
        )[0].children as Record<string, unknown>[]
      )[0];
      const a1BigLabel = a1Big.label as Record<string, unknown>;
      expect(a1BigLabel.distance).toBe(12); // round(36 / 3) = 12

      const sSmall = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf ? { image: 'https://example.com/x.png', width: 12 } : null,
        }),
      );
      const a1Small = (
        (
          (sSmall.data as Record<string, unknown>[])[0].children as Record<
            string,
            unknown
          >[]
        )[0].children as Record<string, unknown>[]
      )[0];
      expect((a1Small.label as Record<string, unknown>).distance).toBe(8); // floor

      const sNonSquare = getSeries(
        resolveTreeOptions(sample, {
          formatNodeIcon: ({ isLeaf }) =>
            isLeaf
              ? {
                  image: 'https://example.com/x.png',
                  width: 24,
                  height: 36,
                  shape: 'circle',
                }
              : null,
        }),
      );
      const a1NonSquare = (
        (
          (sNonSquare.data as Record<string, unknown>[])[0]
            .children as Record<string, unknown>[]
        )[0].children as Record<string, unknown>[]
      )[0];
      expect((a1NonSquare.label as Record<string, unknown>).distance).toBe(12); // max(24,36)/3

      // Internal nodes (no icon emitted because formatNodeIcon returned
      // null for non-leaf) must NOT carry a per-node `label` override —
      // we keep the default-dot path 100% untouched.
      const internalParent = (
        (sBig.data as Record<string, unknown>[])[0].children as Record<
          string,
          unknown
        >[]
      )[0];
      expect('label' in internalParent).toBe(false);
    });

    describe('formatNodeIcon — async onInit swap', () => {
      // The synchronous tests above lock in the placeholder. Here we
      // exercise the async upgrade pipeline by mocking
      // `renderIconDataUrl` to deterministically return either
      // a data URL (canvas-friendly host) or `undefined` (CORS-blocked
      // host) and asserting the captured `setOption` payload picks the
      // right strategy for each. Without these tests, regressions in
      // the fallback path (e.g. a future refactor that drops the
      // native-image fallback and silently leaves the colored placeholder
      // when CORS fails — exactly the visual regression that triggered
      // this whole rewrite) wouldn't fail anything.

      const avatarSample: TreeData = {
        name: 'root',
        children: [
          { name: 'A1', value: 1 },
          { name: 'A2', value: 2 },
        ],
      };

      /**
       * Drive the onInit lifecycle once with a mocked `renderIconDataUrl`,
       * returning the payload that the adapter handed to `setOption`.
       * Accepts an explicit `iconExtras` so individual tests can opt in
       * to bordered / square / etc. variants without each one
       * re-implementing the spy + microtask-flush dance.
       */
      async function captureOnInitPayload(
        renderResult: string | undefined,
        iconExtras: Partial<{
          shape: 'circle' | 'square';
          borderWidth: number;
          borderColor: string;
        }> = { shape: 'circle' },
      ): Promise<Record<string, unknown> | undefined> {
        const spy = vi
          .spyOn(iconSymbol, 'renderIconDataUrl')
          .mockResolvedValue(renderResult);
        try {
          const { onInit } = resolveTreeSetup(avatarSample, {
            formatNodeIcon: ({ name }) => ({
              image: `https://example.com/${name}.png`,
              width: 24,
              ...iconExtras,
            }),
          });
          if (!onInit) return undefined;
          let captured: Record<string, unknown> | undefined;
          onInit({
            setOption: (option: Record<string, unknown>) => {
              captured = option;
            },
          } as never);
          // `onInit` fires its swap inside a void IIFE; let the
          // microtask queue drain so the captured payload reflects
          // the post-load state. One macro-task is plenty given our
          // mocked render resolves synchronously.
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          return captured;
        } finally {
          spy.mockRestore();
        }
      }

      it('canvas path success → swaps placeholder for image://<dataUrl> and drops itemStyle', async () => {
        // Canvas success applies regardless of whether a border was
        // requested — the border (if any) is baked into the PNG, so
        // ECharts only needs the flat sprite. We drop the placeholder
        // `itemStyle` so the chart doesn't double-paint over the PNG.
        const fakeDataUrl = 'data:image/png;base64,FAKE';
        const payload = await captureOnInitPayload(fakeDataUrl, {
          shape: 'circle',
          borderWidth: 2, // border baked into PNG
        });
        expect(payload).toBeDefined();
        const series = (payload!.series as Record<string, unknown>[])[0];
        const root = (series.data as Record<string, unknown>[])[0];
        const leaves = root.children as Record<string, unknown>[];
        for (const leaf of leaves) {
          expect(leaf.symbol).toBe(`image://${fakeDataUrl}`);
          expect(leaf.symbolKeepAspect).toBe(true);
          expect('itemStyle' in leaf).toBe(false);
        }
      });

      it('canvas path failure WITH border → falls back to native image symbol + rect frame', async () => {
        // The "graceful degradation, keep the frame" contract: when
        // the user asked for a border (`borderWidth > 0`) and the
        // canvas pipeline fails (CORS-blocked, image 404, no canvas),
        // we still want a visible avatar AND we still want a frame
        // around it. The frame comes from `itemStyle.border*` painted
        // by ECharts on the (now rectangular) image bounding box.
        // Strictly better than a colored dot.
        const payload = await captureOnInitPayload(undefined, {
          shape: 'circle',
          borderWidth: 2,
        });
        expect(payload).toBeDefined();
        const series = (payload!.series as Record<string, unknown>[])[0];
        const root = (series.data as Record<string, unknown>[])[0];
        const leaves = root.children as Record<string, unknown>[];
        for (const leaf of leaves) {
          expect(leaf.symbol).toMatch(/^image:\/\/https:\/\/example\.com\//);
          expect(leaf.symbolKeepAspect).toBe(true);
          const style = leaf.itemStyle as Record<string, unknown>;
          expect(style.color).toBe('transparent');
          expect(typeof style.borderColor).toBe('string');
          expect(style.borderWidth).toBe(2);
        }
      });

      it('canvas path failure WITHOUT border → falls back to native image symbol, NO itemStyle', async () => {
        // The "no default border" contract reaches into the fallback
        // too: when the user didn't ask for a border, the native-image
        // fallback must NOT silently paint a rectangular frame. We
        // strip `itemStyle` entirely so ECharts renders just the raw
        // image — matching the no-border intent end-to-end.
        const payload = await captureOnInitPayload(undefined, {
          shape: 'circle',
          // borderWidth deliberately unset
        });
        expect(payload).toBeDefined();
        const series = (payload!.series as Record<string, unknown>[])[0];
        const root = (series.data as Record<string, unknown>[])[0];
        const leaves = root.children as Record<string, unknown>[];
        for (const leaf of leaves) {
          expect(leaf.symbol).toMatch(/^image:\/\/https:\/\/example\.com\//);
          expect(leaf.symbolKeepAspect).toBe(true);
          // No frame, period. (Specifically: the placeholder
          // `itemStyle.color` from the sync pass is cleared too —
          // there's no ECharts shape underneath the image symbol to
          // tint, so leaving the placeholder fill on would just be
          // dead state in devtools.)
          expect('itemStyle' in leaf).toBe(false);
        }
      });

      it('does NOT wire onInit when no node has a canvas-pipeline icon', () => {
        // Two paths produce zero icon meta entries (and therefore zero
        // async work): (a) plain image-symbol icons (square + no
        // border — ECharts loads natively), (b) no-icon nodes. In both
        // cases `createTreeIconOnInit` returns `undefined` and the
        // engine never schedules an async setOption. This guard
        // prevents regressions where `onInit` is wired unconditionally
        // and every tree pays a `Promise.all` + `setOption` round-trip
        // on every render.
        const noCanvasPath = resolveTreeSetup(avatarSample, {
          formatNodeIcon: ({ name }) => ({
            image: `https://example.com/${name}.png`,
            width: 24, // no shape, no border → plain image:// path
          }),
        });
        expect(noCanvasPath.onInit).toBeUndefined();

        const noIcon = resolveTreeSetup(avatarSample, {});
        expect(noIcon.onInit).toBeUndefined();
      });
    });

    it('tooltip.customHtml does not prepend the built-in sync name row', async () => {
      const option = resolveTreeOptions(sample, {
        tooltip: {
          customHtml: async (ctx) =>
            ctx.kind === 'item' ? `<span id="only">${ctx.name}</span>` : '',
        },
      });
      const formatter = (option.tooltip as Record<string, unknown>)
        .formatter as (
        params: unknown,
        ticket: string,
        cb: (ticket: string, html: string) => void,
      ) => string;
      const callback = vi.fn();
      formatter(
        { name: 'A', dataIndex: 0, marker: '●' },
        't0',
        callback,
      );
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
      const html = callback.mock.calls[0][1] as string;
      expect(html).toContain('id="only"');
      expect(html).toContain('>A<');
      expect(html).not.toContain('●');
      expect(html).not.toContain('icharts-tooltip-extra');
    });

    it('tooltip.appendHtml renders the default name row above the user extras', async () => {
      const option = resolveTreeOptions(sample, {
        tooltip: {
          appendHtml: async (ctx) =>
            ctx.kind === 'item' ? `<span id="ext">extra-${ctx.name}</span>` : '',
        },
      });
      const formatter = (option.tooltip as Record<string, unknown>)
        .formatter as (
        params: unknown,
        ticket: string,
        cb: (ticket: string, html: string) => void,
      ) => string;
      const callback = vi.fn();
      formatter({ name: 'A', dataIndex: 0 }, 't0', callback);
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
      const html = callback.mock.calls[0][1] as string;
      // Default tree name row preserved.
      expect(html).toContain('A');
      // User extras appended.
      expect(html).toContain('id="ext"');
      expect(html).toContain('extra-A');
      // Wired through createAsyncTooltipFormatter's default `wrap`
      // separator (sync vs extra), so the rule shows up.
      expect(html).toContain('icharts-tooltip-extra');
    });

    it('tooltip.customHtml + appendHtml compose: custom body, then appended extras', async () => {
      const option = resolveTreeOptions(sample, {
        tooltip: {
          customHtml: async (ctx) =>
            ctx.kind === 'item' ? `<span id="body">B-${ctx.name}</span>` : '',
          appendHtml: async (ctx) =>
            ctx.kind === 'item' ? `<span id="ext">A-${ctx.name}</span>` : '',
        },
      });
      const formatter = (option.tooltip as Record<string, unknown>)
        .formatter as (
        params: unknown,
        ticket: string,
        cb: (ticket: string, html: string) => void,
      ) => string;
      const callback = vi.fn();
      formatter({ name: 'A', dataIndex: 0 }, 't0', callback);
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
      const html = callback.mock.calls[0][1] as string;
      // Custom body shown.
      expect(html).toContain('id="body"');
      // Appended extras after, separated by the helper's own dashed
      // rule (separate from the wrap separator since customHtml replaced
      // the default sync row).
      expect(html).toContain('id="ext"');
      expect(html).toContain('icharts-tooltip-append');
      expect(html.indexOf('id="body"')).toBeLessThan(html.indexOf('id="ext"'));
    });

    it('formatNodeLabel falls back to raw name when formatter throws', () => {
      const s = getSeries(
        resolveTreeOptions(sample, {
          formatNodeLabel: ({ name }) => {
            if (name === 'A1') throw new Error('boom');
            return `ok:${name}`;
          },
        }),
      );
      const parentFmt = (s.label as Record<string, unknown>)
        .formatter as (params: unknown) => string;
      const leafFmt = ((s.leaves as Record<string, unknown>).label as Record<
        string,
        unknown
      >).formatter as (params: unknown) => string;

      expect(parentFmt({ name: 'A', data: { name: 'A' } })).toBe('ok:A');
      expect(leafFmt({ name: 'A1', data: { name: 'A1' } })).toBe('A1');
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

    it('long rich labels expand active-edge reserve (no clipping regression)', () => {
      const plain = getSeries(
        resolveTreeOptions(sample, {
          direction: 'left-to-right',
          padding: 12,
        }),
      );
      const rich = getSeries(
        resolveTreeOptions(sample, {
          direction: 'left-to-right',
          padding: 12,
          formatNodeLabel: ({ name, isLeaf }) =>
            isLeaf
              ? {
                  segments: [
                    {
                      text: `${name}::LONG_LONG_LONG_SUFFIX`,
                      style: { width: 220 },
                    },
                  ],
                }
              : name,
        }),
      );
      expect((rich.right as number) > (plain.right as number)).toBe(true);
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
