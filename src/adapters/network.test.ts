import { describe, it, expect } from 'vitest';
import type { NetworkData } from '../types.js';
import { isNetworkData } from '../types.js';
import { resolveNetworkOptions } from './network.js';

const sample: NetworkData = {
  nodes: [
    { name: 'Alice', category: 'Team A', value: 8 },
    { name: 'Bob', category: 'Team A', value: 5 },
    { name: 'Carol', category: 'Team B', value: 12 },
    { name: 'Dan', category: 'Team B' },
  ],
  links: [
    { source: 'Alice', target: 'Bob', value: 3 },
    { source: 'Alice', target: 'Carol', value: 1 },
    { source: 'Carol', target: 'Dan', value: 2 },
  ],
};

const noCategoryData: NetworkData = {
  nodes: [
    { name: 'A' },
    { name: 'B' },
    { name: 'C' },
  ],
  links: [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
  ],
};

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

describe('network adapter', () => {
  describe('resolveNetworkOptions', () => {
    it('builds a single graph series with nodes mapped to category indexes', () => {
      const option = resolveNetworkOptions(sample, {});
      const s = getSeries(option);
      expect(s.type).toBe('graph');
      const data = s.data as Array<Record<string, unknown>>;
      expect(data).toHaveLength(4);
      expect(data[0].name).toBe('Alice');
      expect(data[0].category).toBe(0);
      expect(data[2].category).toBe(1);
    });

    it('emits one categories entry per derived category in input order', () => {
      const option = resolveNetworkOptions(sample, {});
      const s = getSeries(option);
      expect(s.categories).toEqual([{ name: 'Team A' }, { name: 'Team B' }]);
    });

    it('honors an explicit categories list when provided', () => {
      const option = resolveNetworkOptions(
        { ...sample, categories: ['Team B', 'Team A'] },
        {},
      );
      const s = getSeries(option);
      expect(s.categories).toEqual([{ name: 'Team B' }, { name: 'Team A' }]);
      const data = s.data as Array<Record<string, unknown>>;
      expect(data.find((n) => n.name === 'Alice')!.category).toBe(1);
      expect(data.find((n) => n.name === 'Carol')!.category).toBe(0);
    });

    it('translates variant "default" to ECharts layout "force" and applies repulsion / edgeLength / gravity', () => {
      const s = getSeries(resolveNetworkOptions(sample, { repulsion: 200, edgeLength: 80, gravity: 0.2 }));
      // Public variant name → internal ECharts layout name.
      expect(s.layout).toBe('force');
      const force = s.force as Record<string, unknown>;
      expect(force.repulsion).toBe(200);
      expect(force.edgeLength).toBe(80);
      expect(force.gravity).toBe(0.2);
    });

    it('treats `variant: "default"` the same as omitting variant', () => {
      const omitted = getSeries(resolveNetworkOptions(sample, {}));
      const explicit = getSeries(resolveNetworkOptions(sample, { variant: 'default' }));
      expect(omitted.layout).toBe('force');
      expect(explicit.layout).toBe('force');
    });

    it('emits layout: "circular" for variant: "circular"', () => {
      const s = getSeries(resolveNetworkOptions(sample, { variant: 'circular' }));
      expect(s.layout).toBe('circular');
      // Force-tuning fields are not emitted on the circular branch.
      expect(s.force).toBeUndefined();
    });

    // ── Body-aware auto-sizing of the force layout's edgeLength ─────
    // The force adapter sizes springs to the *body* (container − title −
    // legend − padding), not the raw container, so the cluster fills
    // exactly the area outside title/legend without the user having to
    // configure anything. Formula:
    //   edgeLength = min(bodyW, bodyH) / sqrt(nodeCount) * 0.6
    // clamped to [30, 250]. The 0.6 multiplier is calibrated so the
    // canonical 16-node × ~480-px demo with title + legend (body ≈ 394 px)
    // lands on the legacy 60-px default — existing demos render
    // unchanged while sparse graphs and chrome-less cards expand.
    const sparseForceData: NetworkData = {
      nodes: Array.from({ length: 5 }, (_, i) => ({ name: `n${i}` })),
      links: [],
    };

    it('auto-sizes force.edgeLength from body dims so sparse graphs in big cards spread out', () => {
      // 5 nodes, container 1100×460, no title / legend, default padding 12:
      //   bodyH = 460 − 24 = 436, bodyW = 1100 − 24 = 1076, ref = 436
      //   436 / sqrt(5) * 0.6 ≈ 117 → 117 px (≈ 2× the legacy 60).
      const s = getSeries(
        resolveNetworkOptions(sparseForceData, {}, { containerWidth: 1100, containerHeight: 460 }),
      );
      const force = s.force as Record<string, unknown>;
      expect(force.edgeLength).toBeGreaterThan(60);
      expect(force.edgeLength).toBeLessThanOrEqual(250);
    });

    it('honors body insets — title + legend shrink edgeLength because the available body got smaller', () => {
      // Same container, same node count; just adding a title + top legend
      // takes ~50–60 px out of the body height → edgeLength must shrink.
      // (Demonstrates the "fill the area outside title/legend" guarantee:
      // the helper sees the same `containerH − reserves` math the resolver
      // applies to series.top/bottom.)
      const ctx = { containerWidth: 480, containerHeight: 480 };
      const sixteen: NetworkData = {
        nodes: Array.from({ length: 16 }, (_, i) => ({
          name: `n${i}`,
          category: i % 4 === 0 ? 'A' : i % 4 === 1 ? 'B' : i % 4 === 2 ? 'C' : 'D',
        })),
        links: [],
      };

      const noChrome = getSeries(resolveNetworkOptions(sixteen, {}, ctx));
      const withChrome = getSeries(
        resolveNetworkOptions(
          sixteen,
          { title: 'X', legend: { show: true, position: 'top' } },
          ctx,
        ),
      );
      expect((withChrome.force as Record<string, unknown>).edgeLength).toBeLessThan(
        (noChrome.force as Record<string, unknown>).edgeLength as number,
      );
    });

    it('lands on the legacy 60-px default for the canonical 16-node demo (existing forceData looks pixel-identical)', () => {
      // Calibration target: 16 nodes in a body close to 394 px (the
      // canonical forceData demo body, after subtracting title + 5-cat
      // top legend + padding) → 394 / 4 * 0.6 ≈ 59 ≈ 60. To express that
      // deterministically here, plug in a bare body of exactly 400 px
      // (padding=0) so the assertion locks the 0.6 multiplier itself.
      const sixteen: NetworkData = {
        nodes: Array.from({ length: 16 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const s = getSeries(
        resolveNetworkOptions(
          sixteen,
          { padding: 0 },
          { containerWidth: 400, containerHeight: 400 },
        ),
      );
      // 400 / sqrt(16) * 0.6 = 60 — exact legacy static default.
      expect((s.force as Record<string, unknown>).edgeLength).toBe(60);
    });

    it('falls back to the static 60-px default when body dims are unusable (SSR / hidden card / huge reserves)', () => {
      // No ctx at all.
      const s1 = getSeries(resolveNetworkOptions(sparseForceData, {}));
      expect((s1.force as Record<string, unknown>).edgeLength).toBe(60);

      // Ctx present but dims unusable (hidden element / 0×0). Body math
      // would yield ≤ 0 after subtracting padding — helper returns undefined.
      const s2 = getSeries(
        resolveNetworkOptions(sparseForceData, {}, { containerWidth: 0, containerHeight: 460 }),
      );
      expect((s2.force as Record<string, unknown>).edgeLength).toBe(60);

      // Non-finite dims also fall back.
      const s3 = getSeries(
        resolveNetworkOptions(sparseForceData, {}, {
          containerWidth: 800,
          containerHeight: Number.NaN,
        }),
      );
      expect((s3.force as Record<string, unknown>).edgeLength).toBe(60);
    });

    it('shrinks edgeLength as node density grows (more nodes = tighter springs)', () => {
      const sparse: NetworkData = {
        nodes: Array.from({ length: 5 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const dense: NetworkData = {
        nodes: Array.from({ length: 50 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const ctx = { containerWidth: 800, containerHeight: 800 };
      const sSparse = getSeries(resolveNetworkOptions(sparse, {}, ctx));
      const sDense = getSeries(resolveNetworkOptions(dense, {}, ctx));
      expect((sSparse.force as Record<string, unknown>).edgeLength).toBeGreaterThan(
        (sDense.force as Record<string, unknown>).edgeLength as number,
      );
    });

    it('grows edgeLength as the container grows (bigger card = longer springs)', () => {
      const small = { containerWidth: 300, containerHeight: 300 };
      const large = { containerWidth: 1200, containerHeight: 1200 };
      const sSmall = getSeries(resolveNetworkOptions(sparseForceData, {}, small));
      const sLarge = getSeries(resolveNetworkOptions(sparseForceData, {}, large));
      expect((sLarge.force as Record<string, unknown>).edgeLength).toBeGreaterThan(
        (sSmall.force as Record<string, unknown>).edgeLength as number,
      );
    });

    it('clamps edgeLength to [30, 250] so degenerate inputs never produce absurd springs', () => {
      // Tiny container + many nodes → would compute < 30, clamps up.
      const overcrowded: NetworkData = {
        nodes: Array.from({ length: 200 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const sCrowded = getSeries(
        resolveNetworkOptions(overcrowded, {}, { containerWidth: 200, containerHeight: 200 }),
      );
      expect((sCrowded.force as Record<string, unknown>).edgeLength).toBe(30);

      // Huge container + 2 nodes → would compute > 250, clamps down.
      const empty: NetworkData = {
        nodes: [{ name: 'a' }, { name: 'b' }],
        links: [],
      };
      const sEmpty = getSeries(
        resolveNetworkOptions(empty, {}, { containerWidth: 4000, containerHeight: 4000 }),
      );
      expect((sEmpty.force as Record<string, unknown>).edgeLength).toBe(250);
    });

    it('explicit options.edgeLength bypasses auto-sizing entirely', () => {
      const s = getSeries(
        resolveNetworkOptions(
          sparseForceData,
          { edgeLength: 42 },
          { containerWidth: 1200, containerHeight: 800 },
        ),
      );
      expect((s.force as Record<string, unknown>).edgeLength).toBe(42);
    });

    it('does not affect the circular variant (force block is omitted, edgeLength is irrelevant)', () => {
      const s = getSeries(
        resolveNetworkOptions(
          sparseForceData,
          { variant: 'circular' },
          { containerWidth: 1200, containerHeight: 800 },
        ),
      );
      // Circular branch never emits a `force` block, so auto-sizing is a no-op.
      expect(s.force).toBeUndefined();
      expect(s.layout).toBe('circular');
    });

    it('scales node size from value range when no explicit size given', () => {
      const s = getSeries(resolveNetworkOptions(sample, { nodeSizeRange: [10, 50] }));
      const data = s.data as Array<Record<string, unknown>>;
      const alice = data.find((n) => n.name === 'Alice')!;
      const carol = data.find((n) => n.name === 'Carol')!;
      const dan = data.find((n) => n.name === 'Dan')!;
      // Alice: value 8, range [5..12] → ~13/(7) of [10..50] gradient.
      // (Asserting on ECharts' data field name `symbolSize` because that's
      // what the adapter writes into the resolved series; the user-facing
      // option is `nodeSizeRange` but the wire format keeps ECharts' name.)
      expect(typeof alice.symbolSize).toBe('number');
      expect(typeof carol.symbolSize).toBe('number');
      // Carol has the highest value → biggest marker.
      expect(carol.symbolSize).toBeGreaterThan(alice.symbolSize as number);
      // Dan has no value → falls back to default node size.
      expect(dan.symbolSize).toBe(10);
    });

    it('honors per-node size override', () => {
      const data: NetworkData = {
        nodes: [
          { name: 'A', value: 1, size: 99 },
          { name: 'B', value: 100 },
        ],
        links: [],
      };
      const s = getSeries(resolveNetworkOptions(data, {}));
      const nodes = s.data as Array<Record<string, unknown>>;
      // Output is ECharts' `symbolSize` field; input was `node.size`.
      expect(nodes[0].symbolSize).toBe(99);
    });

    // ── Auto-sizing the no-value fallback ───────────────────────────
    // The adapter mirrors gauge.percentage's container-aware sizing: when
    // nodes have no `value` and the user didn't pin `options.nodeSize`,
    // the marker size is derived from the rendered container so sparse
    // graphs in big cards don't render as 10-px dots and dense graphs
    // automatically shrink to keep labels readable.
    const noValueData: NetworkData = {
      nodes: [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D' },
        { name: 'E' },
      ],
      links: [],
    };

    it('auto-sizes the no-value fallback from the rendered container', () => {
      const s = getSeries(
        resolveNetworkOptions(noValueData, {}, { containerWidth: 480, containerHeight: 460 }),
      );
      const nodes = s.data as Array<Record<string, unknown>>;
      // 5 nodes in a 460×480 box → ref=460, ref/sqrt(5)*0.10 ≈ 20.6, rounds to 21.
      // Sanity: bigger than the legacy 10-px static default and under the cap.
      const sizes = nodes.map((n) => n.symbolSize as number);
      for (const sz of sizes) {
        expect(sz).toBeGreaterThan(10);
        expect(sz).toBeLessThanOrEqual(40);
      }
      // Every no-value node sees the same auto-sized fallback.
      expect(new Set(sizes).size).toBe(1);
    });

    it('falls back to the static 10-px default when no RenderContext dims are available (SSR / hidden card)', () => {
      // No ctx at all.
      const s1 = getSeries(resolveNetworkOptions(noValueData, {}));
      const sizes1 = (s1.data as Array<Record<string, unknown>>).map((n) => n.symbolSize as number);
      for (const sz of sizes1) expect(sz).toBe(10);

      // Ctx present but dims unusable (jsdom often reports 0 for hidden elements).
      const s2 = getSeries(
        resolveNetworkOptions(noValueData, {}, { containerWidth: 0, containerHeight: 0 }),
      );
      const sizes2 = (s2.data as Array<Record<string, unknown>>).map((n) => n.symbolSize as number);
      for (const sz of sizes2) expect(sz).toBe(10);

      // Non-finite dims also fall back.
      const s3 = getSeries(
        resolveNetworkOptions(noValueData, {}, {
          containerWidth: Number.NaN,
          containerHeight: 400,
        }),
      );
      const sizes3 = (s3.data as Array<Record<string, unknown>>).map((n) => n.symbolSize as number);
      for (const sz of sizes3) expect(sz).toBe(10);
    });

    it('shrinks markers as node density grows (more nodes = smaller fallback)', () => {
      const sparse: NetworkData = {
        nodes: Array.from({ length: 5 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const dense: NetworkData = {
        nodes: Array.from({ length: 50 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const ctx = { containerWidth: 600, containerHeight: 600 };

      const sSparse = getSeries(resolveNetworkOptions(sparse, {}, ctx));
      const sDense = getSeries(resolveNetworkOptions(dense, {}, ctx));
      const sparseSize = (sSparse.data as Array<Record<string, unknown>>)[0].symbolSize as number;
      const denseSize = (sDense.data as Array<Record<string, unknown>>)[0].symbolSize as number;

      expect(sparseSize).toBeGreaterThan(denseSize);
    });

    it('grows markers as the container grows (bigger card = bigger fallback)', () => {
      const small = { containerWidth: 300, containerHeight: 300 };
      const large = { containerWidth: 1200, containerHeight: 800 };

      const sSmall = getSeries(resolveNetworkOptions(noValueData, {}, small));
      const sLarge = getSeries(resolveNetworkOptions(noValueData, {}, large));
      const smallSize = (sSmall.data as Array<Record<string, unknown>>)[0].symbolSize as number;
      const largeSize = (sLarge.data as Array<Record<string, unknown>>)[0].symbolSize as number;

      expect(largeSize).toBeGreaterThan(smallSize);
    });

    it('clamps the auto-sized marker to a sensible range so degenerate inputs do not produce absurd markers', () => {
      // Tiny container + many nodes → would compute < 8, clamped to 8.
      const overcrowded: NetworkData = {
        nodes: Array.from({ length: 200 }, (_, i) => ({ name: `n${i}` })),
        links: [],
      };
      const sCrowded = getSeries(
        resolveNetworkOptions(overcrowded, {}, { containerWidth: 200, containerHeight: 200 }),
      );
      const crowdedSize = (sCrowded.data as Array<Record<string, unknown>>)[0]
        .symbolSize as number;
      expect(crowdedSize).toBe(8);

      // Huge container + few nodes → would compute > 40, clamped to 40.
      const empty: NetworkData = {
        nodes: [{ name: 'lonely' }],
        links: [],
      };
      const sEmpty = getSeries(
        resolveNetworkOptions(empty, {}, { containerWidth: 4000, containerHeight: 4000 }),
      );
      const emptySize = (sEmpty.data as Array<Record<string, unknown>>)[0].symbolSize as number;
      expect(emptySize).toBe(40);
    });

    it('explicit options.nodeSize bypasses auto-sizing entirely', () => {
      const s = getSeries(
        resolveNetworkOptions(
          noValueData,
          { nodeSize: 7 },
          { containerWidth: 1200, containerHeight: 800 },
        ),
      );
      const nodes = s.data as Array<Record<string, unknown>>;
      // User pinned 7 px — auto-sizing must not "help".
      for (const n of nodes) expect(n.symbolSize).toBe(7);
    });

    it('does not alter the value-driven scaling path (auto-size is no-value-only)', () => {
      // Same shape as the existing "scales from value range" test but with
      // a container present — the value-driven path must ignore ctx.
      const s = getSeries(
        resolveNetworkOptions(
          sample,
          { nodeSizeRange: [10, 50] },
          { containerWidth: 1200, containerHeight: 800 },
        ),
      );
      const data = s.data as Array<Record<string, unknown>>;
      const alice = data.find((n) => n.name === 'Alice')!; // value 8
      const carol = data.find((n) => n.name === 'Carol')!; // highest value
      // Value-bearing nodes scale through nodeSizeRange exactly as before.
      expect(carol.symbolSize).toBeGreaterThan(alice.symbolSize as number);
    });

    it('writes per-node color overrides via itemStyle and keeps them through paintGraphNodes', () => {
      const data: NetworkData = {
        nodes: [
          { name: 'A', color: '#ff0000' },
          { name: 'B' },
        ],
        links: [],
      };
      const option = resolveNetworkOptions(data, {});
      const s = getSeries(option);
      const nodes = s.data as Array<Record<string, unknown>>;
      const palette = option.color as string[];
      // Explicit override survives the no-categories per-node paint pass.
      expect((nodes[0].itemStyle as Record<string, unknown>).color).toBe('#ff0000');
      // Nodes without an explicit color get painted with their palette slot
      // so a category-less graph isn't a single-color blob.
      expect((nodes[1].itemStyle as Record<string, unknown>).color).toBe(palette[1]);
    });

    it('keeps explicit per-node color overrides on a categorized graph', () => {
      const data: NetworkData = {
        nodes: [
          { name: 'A', category: 'X', color: '#ff0000' },
          { name: 'B', category: 'X' },
        ],
        links: [],
      };
      const s = getSeries(resolveNetworkOptions(data, {}));
      const nodes = s.data as Array<Record<string, unknown>>;
      expect((nodes[0].itemStyle as Record<string, unknown>).color).toBe('#ff0000');
      // Non-overridden nodes inherit the category palette via ECharts itself
      // (no per-node paint pass when categories are present), so itemStyle
      // stays undefined.
      expect(nodes[1].itemStyle).toBeUndefined();
    });

    it('shows a category legend by default when categories exist', () => {
      const option = resolveNetworkOptions(sample, {});
      const legend = option.legend as Record<string, unknown>;
      expect(legend.show).toBe(true);
      expect(legend.data).toEqual(['Team A', 'Team B']);
    });

    it('hides the legend by default when no categories are present', () => {
      const option = resolveNetworkOptions(noCategoryData, {});
      const legend = option.legend as Record<string, unknown>;
      expect(legend.show).toBe(false);
    });

    it('honors options.legend.show overrides', () => {
      const off = resolveNetworkOptions(sample, { legend: { show: false } });
      expect((off.legend as Record<string, unknown>).show).toBe(false);
      const on = resolveNetworkOptions(noCategoryData, { legend: { show: true } });
      expect((on.legend as Record<string, unknown>).show).toBe(true);
    });

    it('applies a category palette when categories exist', () => {
      const option = resolveNetworkOptions(sample, {
        colorMap: { 'Team A': '#aa0000', 'Team B': '#00aa00' },
      });
      expect(option.color).toEqual(['#aa0000', '#00aa00']);
    });

    it('falls back to per-node colors when no categories are present', () => {
      const option = resolveNetworkOptions(noCategoryData, {});
      const colors = option.color as string[];
      expect(Array.isArray(colors)).toBe(true);
      expect(colors).toHaveLength(3);
      // paintGraphNodes wrote the resolved palette to each node's itemStyle.
      const s = getSeries(option);
      const nodes = s.data as Array<Record<string, unknown>>;
      expect((nodes[0].itemStyle as Record<string, unknown>).color).toBe(colors[0]);
      expect((nodes[1].itemStyle as Record<string, unknown>).color).toBe(colors[1]);
    });

    it('reserves bottom legend space when the legend is shown', () => {
      const shown = getSeries(
        resolveNetworkOptions(sample, { legend: { show: true, position: 'bottom' } }),
      );
      const hidden = getSeries(
        resolveNetworkOptions(sample, { legend: { show: false } }),
      );
      expect(shown.bottom).toBeGreaterThan(hidden.bottom as number);
    });

    it('shifts series.top down when a title is configured', () => {
      const noTitle = getSeries(resolveNetworkOptions(sample, { legend: { show: false } }));
      const withTitle = getSeries(
        resolveNetworkOptions(sample, { title: 'Hello', legend: { show: false } }),
      );
      expect(withTitle.top).toBeGreaterThan(noTitle.top as number);
    });

    it('defaults roam to true and draggable to (variant === "default")', () => {
      const def = getSeries(resolveNetworkOptions(sample, {}));
      expect(def.roam).toBe(true);
      expect(def.draggable).toBe(true);

      const circular = getSeries(resolveNetworkOptions(sample, { variant: 'circular' }));
      expect(circular.draggable).toBe(false);

      const explicit = getSeries(
        resolveNetworkOptions(sample, { variant: 'circular', draggable: true, roam: false }),
      );
      expect(explicit.draggable).toBe(true);
      expect(explicit.roam).toBe(false);
    });

    it('sets edgeLabel.show based on showLinkLabel', () => {
      const off = getSeries(resolveNetworkOptions(sample, {}));
      const on = getSeries(resolveNetworkOptions(sample, { showLinkLabel: true }));
      expect((off.edgeLabel as Record<string, unknown>).show).toBe(false);
      expect((on.edgeLabel as Record<string, unknown>).show).toBe(true);
    });

    it('defaults edgeCurveness to 0 for the default (force) variant', () => {
      const s = getSeries(resolveNetworkOptions(sample, {}));
      expect((s.lineStyle as Record<string, unknown>).curveness).toBe(0);
    });

    it('defaults edgeCurveness to 0.3 for the circular variant (matches ECharts circular-layout example)', () => {
      const s = getSeries(resolveNetworkOptions(sample, { variant: 'circular' }));
      expect((s.lineStyle as Record<string, unknown>).curveness).toBe(0.3);
    });

    it('honors an explicit edgeCurveness override on either variant', () => {
      const def = getSeries(resolveNetworkOptions(sample, { edgeCurveness: 0.5 }));
      const circ = getSeries(
        resolveNetworkOptions(sample, { variant: 'circular', edgeCurveness: 0 }),
      );
      expect((def.lineStyle as Record<string, unknown>).curveness).toBe(0.5);
      // Explicit `0` defeats the circular default (otherwise the smart
      // default would silently win and the override would be a no-op).
      expect((circ.lineStyle as Record<string, unknown>).curveness).toBe(0);
    });

    // ── Per-link curveness override ─────────────────────────────────
    // Lives on `link.curveness` and writes into `links[i].lineStyle.curveness`,
    // which deep-merges over the series-level curveness. The canonical use
    // case is bidirectional edges: A→B with positive curveness, B→A with the
    // matching negative so the two arcs don't overlap.

    it('writes per-link curveness through links[i].lineStyle.curveness', () => {
      const data: NetworkData = {
        nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        links: [
          { source: 'A', target: 'B', curveness: 0.4 },
          { source: 'B', target: 'C' }, // no override → inherits chart-wide
        ],
      };
      const s = getSeries(resolveNetworkOptions(data, {}));
      const links = s.links as Array<Record<string, unknown>>;

      const ls0 = links[0].lineStyle as Record<string, unknown>;
      expect(ls0.curveness).toBe(0.4);
      // Link without an override doesn't write a `lineStyle` block at all,
      // letting ECharts deep-merge the series-level curveness untouched.
      expect(links[1].lineStyle).toBeUndefined();
    });

    it('per-link curveness wins over chart-level edgeCurveness (link-level beats series-level)', () => {
      const data: NetworkData = {
        nodes: [{ name: 'A' }, { name: 'B' }],
        links: [{ source: 'A', target: 'B', curveness: 0.6 }],
      };
      const s = getSeries(
        resolveNetworkOptions(data, { variant: 'circular', edgeCurveness: 0.3 }),
      );
      // Series-level still emits 0.3 (acts as the fallback for links
      // without an override) — but the targeted link carries its own.
      expect((s.lineStyle as Record<string, unknown>).curveness).toBe(0.3);
      expect(
        ((s.links as Array<Record<string, unknown>>)[0].lineStyle as Record<string, unknown>)
          .curveness,
      ).toBe(0.6);
    });

    it('supports negative curveness so bidirectional edges can curve in opposite directions', () => {
      const data: NetworkData = {
        nodes: [{ name: 'A' }, { name: 'B' }],
        links: [
          { source: 'A', target: 'B', curveness: 0.2 },
          { source: 'B', target: 'A', curveness: -0.2 },
        ],
      };
      const s = getSeries(resolveNetworkOptions(data, {}));
      const links = s.links as Array<Record<string, unknown>>;
      expect((links[0].lineStyle as Record<string, unknown>).curveness).toBe(0.2);
      expect((links[1].lineStyle as Record<string, unknown>).curveness).toBe(-0.2);
    });

    it('treats curveness: 0 as an explicit straight-line override, not "inherit"', () => {
      // Without explicit `0`, a link in the circular variant would inherit
      // the 0.3 default — the user must be able to flatten one arc while
      // leaving the rest curved.
      const data: NetworkData = {
        nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        links: [
          { source: 'A', target: 'B', curveness: 0 }, // explicit straight
          { source: 'B', target: 'C' }, // inherit 0.3
        ],
      };
      const s = getSeries(resolveNetworkOptions(data, { variant: 'circular' }));
      const links = s.links as Array<Record<string, unknown>>;
      expect((links[0].lineStyle as Record<string, unknown>).curveness).toBe(0);
      expect(links[1].lineStyle).toBeUndefined();
    });

    it('defaults to labelLayout.hideOverlap so dense graphs do not drown in text', () => {
      const s = getSeries(resolveNetworkOptions(sample, {}));
      // Default subset mode — ECharts walks every label's bounding box and
      // hides the colliding ones, leaving the most-spread-out subset visible.
      expect(s.labelLayout).toEqual({ hideOverlap: true });
    });

    it('treats showAllLabels: false the same as omitting it (default subset mode)', () => {
      const omitted = getSeries(resolveNetworkOptions(sample, {}));
      const explicit = getSeries(resolveNetworkOptions(sample, { showAllLabels: false }));
      expect(omitted.labelLayout).toEqual({ hideOverlap: true });
      expect(explicit.labelLayout).toEqual({ hideOverlap: true });
    });

    it('omits labelLayout when showAllLabels: true so every node + edge label renders', () => {
      const s = getSeries(resolveNetworkOptions(sample, { showAllLabels: true }));
      // No labelLayout block → ECharts renders every label, accepting overlap
      // as the trade-off the caller explicitly opted into.
      expect(s.labelLayout).toBeUndefined();
    });

    describe('labelMinNodeSize (per-node label gating by resolved size)', () => {
      // `sample` has values 5, 8, 12 (+ Dan: no value). With default
      // nodeSizeRange [10, 30]:
      //   Bob   (val 5)  → 10 px  (size threshold floor)
      //   Alice (val 8)  → ~18.6 px
      //   Carol (val 12) → 30 px  (size threshold ceiling)
      //   Dan   (no val) → 10 px  (defaultSize fallback)
      // Default `labelMinNodeSize: 14` should hide labels for Bob + Dan,
      // keep them for Alice + Carol.

      it('hides labels for nodes below the default 14 px threshold', () => {
        const s = getSeries(resolveNetworkOptions(sample, {}));
        const nodes = s.data as Array<Record<string, unknown>>;
        const byName = Object.fromEntries(nodes.map((n) => [n.name as string, n]));
        // Bob (10 px) and Dan (10 px) lose their label.
        expect(byName.Bob!.label).toEqual({ show: false });
        expect(byName.Dan!.label).toEqual({ show: false });
        // Alice (~18.6 px) and Carol (30 px) keep theirs — no per-node
        // override so they inherit `series.label.show: true`.
        expect(byName.Alice!.label).toBeUndefined();
        expect(byName.Carol!.label).toBeUndefined();
      });

      it('honors a custom labelMinNodeSize threshold', () => {
        // 20 px threshold also drops Alice (~18.6 px); only Carol (30 px) keeps it.
        const s = getSeries(resolveNetworkOptions(sample, { labelMinNodeSize: 20 }));
        const nodes = s.data as Array<Record<string, unknown>>;
        const byName = Object.fromEntries(nodes.map((n) => [n.name as string, n]));
        expect(byName.Bob!.label).toEqual({ show: false });
        expect(byName.Dan!.label).toEqual({ show: false });
        expect(byName.Alice!.label).toEqual({ show: false });
        expect(byName.Carol!.label).toBeUndefined();
      });

      it('treats labelMinNodeSize: 0 as opt-out — no node gets a per-node label override', () => {
        const s = getSeries(resolveNetworkOptions(sample, { labelMinNodeSize: 0 }));
        const nodes = s.data as Array<Record<string, unknown>>;
        // No node should have a `label` field at all when the threshold is off.
        for (const n of nodes) expect(n.label).toBeUndefined();
      });

      it('showAllLabels: true bypasses the size threshold (master "show everything" switch)', () => {
        // Without showAllLabels Bob would lose its label at the default threshold.
        // With showAllLabels: true the threshold must stand down or the flag is
        // a no-op for circular layouts — the exact reason this gate exists.
        const s = getSeries(
          resolveNetworkOptions(sample, { showAllLabels: true }),
        );
        const nodes = s.data as Array<Record<string, unknown>>;
        for (const n of nodes) expect(n.label).toBeUndefined();
      });

      it('does not redundantly write label.show: false when showNodeLabel is already false', () => {
        // `showNodeLabel: false` already kills every label at the series level.
        // Per-node `label.show: false` would be noise; the gate must short-circuit.
        const s = getSeries(
          resolveNetworkOptions(sample, { showNodeLabel: false }),
        );
        const nodes = s.data as Array<Record<string, unknown>>;
        for (const n of nodes) expect(n.label).toBeUndefined();
      });

      it('applies to nodes whose size comes from an explicit per-node `size`, not just value-scaling', () => {
        // Tiny explicit `size` → threshold still fires.
        const data: NetworkData = {
          nodes: [
            { name: 'big', size: 40 },
            { name: 'small', size: 6 },
          ],
          links: [],
        };
        const s = getSeries(resolveNetworkOptions(data, {}));
        const nodes = s.data as Array<Record<string, unknown>>;
        const byName = Object.fromEntries(nodes.map((n) => [n.name as string, n]));
        expect(byName.big!.label).toBeUndefined();
        expect(byName.small!.label).toEqual({ show: false });
      });
    });

    it('reserves circular label-overflow padding on every body edge so labels do not bleed into title / legend', () => {
      // Padding 0 + no title + no legend isolates the label-overflow term.
      const force = getSeries(
        resolveNetworkOptions(sample, {
          padding: 0,
          legend: { show: false },
        }),
      );
      const circular = getSeries(
        resolveNetworkOptions(sample, {
          variant: 'circular',
          padding: 0,
          legend: { show: false },
        }),
      );
      // Force layout: gravity keeps nodes interior, so the body box is flush.
      expect(force.top).toBe(0);
      expect(force.bottom).toBe(0);
      expect(force.left).toBe(0);
      expect(force.right).toBe(0);
      // Circular layout: every edge gets the same label-overflow gap so the
      // ring shrinks symmetrically and rotated labels stay inside the body
      // box. Exact pixel value depends on canvas measureText vs char-count
      // fallback in the test environment, so we only assert symmetry +
      // positivity here. Length-sensitivity is covered by the next test.
      const overflow = circular.top as number;
      expect(overflow).toBeGreaterThan(0);
      expect(circular.bottom).toBe(overflow);
      expect(circular.left).toBe(overflow);
      expect(circular.right).toBe(overflow);
    });

    it('measures the widest node label so circular overflow scales with label length', () => {
      // Same number of nodes, only the names differ — proves the reserve
      // tracks `max(label_text_width)` instead of a fixed magic number.
      // (A fixed reserve was the v1 behavior and was visibly insufficient
      // for typical microservice names like "auth-service".)
      const short = getSeries(
        resolveNetworkOptions(
          { nodes: [{ name: 'A' }, { name: 'B' }], links: [] },
          { variant: 'circular', padding: 0, legend: { show: false } },
        ),
      );
      const long = getSeries(
        resolveNetworkOptions(
          {
            nodes: [
              { name: 'A' },
              { name: 'auth-service-very-long-identifier' },
            ],
            links: [],
          },
          { variant: 'circular', padding: 0, legend: { show: false } },
        ),
      );
      expect(long.top).toBeGreaterThan(short.top as number);
    });

    it('zeroes circular label overflow when showNodeLabel is false (no labels = no overflow)', () => {
      const labeled = getSeries(
        resolveNetworkOptions(
          { nodes: [{ name: 'auth-service' }], links: [] },
          { variant: 'circular', padding: 0, legend: { show: false } },
        ),
      );
      const unlabeled = getSeries(
        resolveNetworkOptions(
          { nodes: [{ name: 'auth-service' }], links: [] },
          {
            variant: 'circular',
            padding: 0,
            legend: { show: false },
            showNodeLabel: false,
          },
        ),
      );
      expect(labeled.top).toBeGreaterThan(0);
      expect(unlabeled.top).toBe(0);
    });

    it('caps circular label overflow so a single huge label cannot eat the ring', () => {
      // 500-char name: a naive `widestLabel + gap` would reserve >3000 px
      // per edge and shrink the ring to a dot. Implementation caps at
      // `NETWORK_CIRCULAR_LABEL_MAX_RESERVE_PX` (200 px today). We only
      // assert the bound, not the exact value.
      const huge = getSeries(
        resolveNetworkOptions(
          { nodes: [{ name: 'X'.repeat(500) }], links: [] },
          { variant: 'circular', padding: 0, legend: { show: false } },
        ),
      );
      expect(huge.top).toBeLessThanOrEqual(200);
      expect(huge.top).toBeGreaterThan(0);
    });

    it('composes circular label-overflow on top of the title + legend reserves (does not replace them)', () => {
      // Bottom legend + circular variant: bottom inset must be
      // (padding + bottom-legend reserve + label-overflow), proving the
      // overflow is additive rather than a max() that would silently swallow
      // either reserve.
      const padding = 12;
      const noLegendCircular = getSeries(
        resolveNetworkOptions(sample, {
          variant: 'circular',
          padding,
          legend: { show: false },
        }),
      );
      const bottomLegendCircular = getSeries(
        resolveNetworkOptions(sample, {
          variant: 'circular',
          padding,
          legend: { show: true, position: 'bottom' },
        }),
      );
      // Adding a bottom legend strictly increases bottom inset (label
      // overflow + padding stay constant, legend reserve is additional).
      expect(bottomLegendCircular.bottom).toBeGreaterThan(noLegendCircular.bottom as number);
      // And bottom > top in that config because top has only padding +
      // overflow while bottom has padding + overflow + legend reserve.
      expect(bottomLegendCircular.bottom).toBeGreaterThan(bottomLegendCircular.top as number);
    });

    it('hides the tooltip when tooltip.enabled is false', () => {
      const off = resolveNetworkOptions(sample, { tooltip: { enabled: false } });
      expect((off.tooltip as Record<string, unknown>).show).toBe(false);
    });

    it('merges options.echarts last and lets the palette win on color', () => {
      const option = resolveNetworkOptions(sample, {
        colorMap: { 'Team A': '#111111', 'Team B': '#222222' },
        echarts: {
          color: ['#999999'],
          // Non-array field — `deepMerge` recurses into objects but
          // REPLACES arrays, so consumers who need to override series
          // shape pass `echarts.series` as the whole replacement.
          backgroundColor: '#fafafa',
        },
      });
      // Resolved category palette wins over user-supplied echarts.color.
      expect(option.color).toEqual(['#111111', '#222222']);
      // Plain object fields from `echarts` survive the merge.
      expect(option.backgroundColor).toBe('#fafafa');
      // Series stays intact from the adapter.
      const s = getSeries(option);
      expect(s.type).toBe('graph');
    });

    it('drops node.category references that are not in the explicit category list', () => {
      const data: NetworkData = {
        nodes: [
          { name: 'A', category: 'Known' },
          { name: 'B', category: 'Stranger' },
        ],
        links: [],
        categories: ['Known'],
      };
      const s = getSeries(resolveNetworkOptions(data, {}));
      const nodes = s.data as Array<Record<string, unknown>>;
      expect(nodes[0].category).toBe(0);
      expect(nodes[1].category).toBeUndefined();
    });
  });

  describe('isNetworkData', () => {
    it('accepts well-formed network data', () => {
      expect(isNetworkData(sample)).toBe(true);
      expect(isNetworkData(noCategoryData)).toBe(true);
    });

    it('rejects pie-shaped data (plain array)', () => {
      expect(
        isNetworkData([{ name: 'A', value: 1 }] as unknown as NetworkData),
      ).toBe(false);
    });

    it('rejects radar-shaped data', () => {
      expect(
        isNetworkData({
          indicators: [{ name: 'A' }],
          series: [{ name: 'X', values: [1] }],
        } as unknown as NetworkData),
      ).toBe(false);
    });

    it('rejects gauge-shaped data', () => {
      expect(
        isNetworkData({ value: 42, max: 100 } as unknown as NetworkData),
      ).toBe(false);
    });

    it('rejects null / undefined / non-object inputs', () => {
      expect(isNetworkData(null as unknown as NetworkData)).toBe(false);
      expect(isNetworkData(undefined as unknown as NetworkData)).toBe(false);
      expect(isNetworkData('graph' as unknown as NetworkData)).toBe(false);
    });
  });
});
