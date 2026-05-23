import { describe, it, expect, vi } from 'vitest';
import { createAsyncTooltipFormatter, escapeTooltipHtml } from './async-tooltip.js';

// ---------------------------------------------------------------------------
// Helper: drain microtasks. The formatter's async work is started inside a
// `Promise.resolve().then(...)` chain, so a single `await Promise.resolve()`
// is not enough — we need to flush the chain end-to-end.
// ---------------------------------------------------------------------------
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

describe('escapeTooltipHtml', () => {
  it('escapes minimal HTML entities', () => {
    expect(escapeTooltipHtml('<a "b" & c>')).toBe(
      '&lt;a &quot;b&quot; &amp; c&gt;',
    );
  });
});

describe('createAsyncTooltipFormatter', () => {
  it('renders customHtml alone when formatSync is empty (no separator row)', async () => {
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => '',
      customHtml: async () => '<b>ONLY</b>',
    });
    const callback = vi.fn();
    formatter({ name: 'A' }, 't0', callback);
    await flushAsync();
    const html = callback.mock.calls[0][1] as string;
    expect(html).toContain('<b>ONLY</b>');
    expect(html).not.toContain('icharts-tooltip-extra');
  });

  it('returns the synchronous body immediately and resolves async HTML via the callback', async () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const callback = vi.fn();
    const placeholder = formatter(
      { seriesIndex: 0, dataIndex: 0, name: 'Premium' },
      't0',
      callback,
    );

    expect(placeholder).toContain('Loading');
    await flushAsync();
    expect(callback).toHaveBeenCalledTimes(1);
    const [ticket, html] = callback.mock.calls[0];
    expect(ticket).toBe('t0');
    expect(html).toContain('SYNC');
    expect(html).toContain('EXTRA');
  });

  it('serves cached HTML synchronously on repeat hovers over the same slice', async () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const params = { seriesIndex: 0, dataIndex: 0, name: 'Premium' };

    const callback1 = vi.fn();
    formatter(params, 't0', callback1);
    await flushAsync();
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(customHtml).toHaveBeenCalledTimes(1);
    const [, cachedHtml] = callback1.mock.calls[0];

    // Mousemove inside the same slice — ECharts re-invokes the formatter with
    // a fresh ticket. Should NOT refire customHtml; should return the cached
    // HTML synchronously (no placeholder).
    const callback2 = vi.fn();
    const result = formatter(params, 't1', callback2);
    expect(result).toBe(cachedHtml);
    expect(result).not.toContain('Loading');
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();
  });

  it('re-fires customHtml when the user hovers a different slice', async () => {
    const customHtml = vi.fn(async (p: unknown) => {
      const r = p as { name: string };
      return `EXTRA(${r.name})`;
    });
    const formatter = createAsyncTooltipFormatter({
      formatSync: (p) => `SYNC(${(p as { name: string }).name})`,
      customHtml,
    });

    formatter({ seriesIndex: 0, dataIndex: 0, name: 'A' }, 't0', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(1);

    formatter({ seriesIndex: 0, dataIndex: 1, name: 'B' }, 't1', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(2);

    // Going back to A is cached.
    formatter({ seriesIndex: 0, dataIndex: 0, name: 'A' }, 't2', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent invocations for the same key while the load is in flight', async () => {
    let resolveExtra!: (s: string) => void;
    const customHtml = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveExtra = resolve;
        }),
    );
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const params = { seriesIndex: 0, dataIndex: 0, name: 'Premium' };
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cb3 = vi.fn();

    formatter(params, 't0', cb1);
    formatter(params, 't1', cb2);
    formatter(params, 't2', cb3);

    // Synchronous chain has only kicked off one customHtml call.
    expect(customHtml).toHaveBeenCalledTimes(1);

    resolveExtra('EXTRA');
    await flushAsync();

    // All three callbacks fired with their own ticket but the same HTML.
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(cb1.mock.calls[0][0]).toBe('t0');
    expect(cb2.mock.calls[0][0]).toBe('t1');
    expect(cb3.mock.calls[0][0]).toBe('t2');
    expect(cb1.mock.calls[0][1]).toBe(cb2.mock.calls[0][1]);
    expect(cb2.mock.calls[0][1]).toBe(cb3.mock.calls[0][1]);
  });

  it('caches errors so failed loads do not retry on every mousemove', async () => {
    const customHtml = vi.fn(async () => {
      throw new Error('boom');
    });
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const params = { seriesIndex: 0, dataIndex: 0, name: 'Premium' };

    const cb1 = vi.fn();
    formatter(params, 't0', cb1);
    await flushAsync();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb1.mock.calls[0][1]).toContain('boom');
    expect(customHtml).toHaveBeenCalledTimes(1);

    const cb2 = vi.fn();
    const synced = formatter(params, 't1', cb2);
    expect(synced).toContain('boom');
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();
  });

  it('keys axis-trigger payloads by axisValue', async () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    formatter(
      [{ axisValue: '2024-01-01', seriesIndex: 0, dataIndex: 0 }],
      't0',
      vi.fn(),
    );
    await flushAsync();

    // Same axis column, different series — still one load.
    formatter(
      [
        { axisValue: '2024-01-01', seriesIndex: 0, dataIndex: 0 },
        { axisValue: '2024-01-01', seriesIndex: 1, dataIndex: 0 },
      ],
      't1',
      vi.fn(),
    );
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(1);

    // Different axis column — fires again.
    formatter(
      [{ axisValue: '2024-01-02', seriesIndex: 0, dataIndex: 1 }],
      't2',
      vi.fn(),
    );
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(2);
  });

  it('honors a custom cacheKey extractor', async () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
      cacheKey: (p) => String((p as { groupId: string }).groupId),
    });

    formatter({ groupId: 'g1', dataIndex: 0 }, 't0', vi.fn());
    formatter({ groupId: 'g1', dataIndex: 9 }, 't1', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(1);

    formatter({ groupId: 'g2', dataIndex: 0 }, 't2', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(2);
  });

  it('disables caching when cacheKey is false', async () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
      cacheKey: false,
    });

    const params = { seriesIndex: 0, dataIndex: 0, name: 'Premium' };
    formatter(params, 't0', vi.fn());
    formatter(params, 't1', vi.fn());
    formatter(params, 't2', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(3);
  });

  it('distinguishes node vs edge hovers in sankey/chord by dataType', async () => {
    const customHtml = vi.fn(async (p: unknown) => {
      const r = p as { dataType: string };
      return `EXTRA(${r.dataType})`;
    });
    const formatter = createAsyncTooltipFormatter({
      formatSync: (p) => `SYNC(${(p as { dataType: string }).dataType})`,
      customHtml,
    });

    formatter({ dataType: 'node', seriesIndex: 0, dataIndex: 0, name: 'A' }, 't0', vi.fn());
    formatter({ dataType: 'edge', seriesIndex: 0, dataIndex: 0, name: 'A' }, 't1', vi.fn());
    await flushAsync();
    expect(customHtml).toHaveBeenCalledTimes(2);
  });

  it('returns the sync body and skips the load when ECharts omits the callback', () => {
    const customHtml = vi.fn(async () => 'EXTRA');
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const result = formatter(
      { seriesIndex: 0, dataIndex: 0, name: 'Premium' },
      't0',
      undefined,
    );
    expect(result).toBe('SYNC');
    expect(customHtml).not.toHaveBeenCalled();
  });

  describe('dismiss()', () => {
    it('clears resolved cache so the next hover re-fires customHtml', async () => {
      const customHtml = vi.fn(async () => 'EXTRA');
      const formatter = createAsyncTooltipFormatter({
        formatSync: () => 'SYNC',
        customHtml,
      });

      const params = { seriesIndex: 0, dataIndex: 0, name: 'Premium' };
      formatter(params, 't0', vi.fn());
      await flushAsync();
      expect(customHtml).toHaveBeenCalledTimes(1);

      // Mouse moves around inside same slice → cached.
      formatter(params, 't1', vi.fn());
      await flushAsync();
      expect(customHtml).toHaveBeenCalledTimes(1);

      // ECharts fires hideTip → engine calls formatter.dismiss().
      formatter.dismiss();

      // Re-hover the same slice → fresh load (new tooltip session).
      const cb = vi.fn();
      const placeholder = formatter(params, 't2', cb);
      expect(placeholder).toContain('Loading');
      await flushAsync();
      expect(customHtml).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('discards in-flight results that resolve after dismiss (no stale-cache poisoning)', async () => {
      // Repro for a race: user hovers → load starts (slow) → user leaves
      // BEFORE load returns → load eventually resolves. Without the
      // generation guard, the `.then(html => resolved.set(key, html))`
      // would write the now-stale HTML back into the cache after
      // dismiss() cleared it, and the next hover would serve that stale
      // value instead of re-fetching.
      const pending: Array<(s: string) => void> = [];
      const customHtml = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            pending.push(resolve);
          }),
      );
      const formatter = createAsyncTooltipFormatter({
        formatSync: () => 'SYNC',
        customHtml,
      });

      const params = { seriesIndex: 0, dataIndex: 0, name: 'A' };
      formatter(params, 't0', vi.fn());
      expect(customHtml).toHaveBeenCalledTimes(1);

      // User leaves the chart BEFORE the load returns.
      formatter.dismiss();

      // Now the slow load resolves. Without the generation guard this
      // would write 'STALE' back into the resolved cache.
      pending[0]?.('STALE');
      await flushAsync();

      // Next hover must NOT see a synchronous cache hit, must fire a
      // brand-new customHtml call.
      const cb = vi.fn();
      const placeholder = formatter(params, 't1', cb);
      expect(placeholder).toContain('Loading');
      expect(customHtml).toHaveBeenCalledTimes(2);

      pending[1]?.('FRESH');
      await flushAsync();
      expect(cb.mock.calls[0][1]).toContain('FRESH');
      expect(cb.mock.calls[0][1]).not.toContain('STALE');
    });

    it('is idempotent and safe to call when nothing is cached', () => {
      const formatter = createAsyncTooltipFormatter({
        formatSync: () => 'SYNC',
        customHtml: async () => 'EXTRA',
      });
      expect(() => formatter.dismiss()).not.toThrow();
      expect(() => formatter.dismiss()).not.toThrow();
    });

    it('clears every cached key in one call (whole-session semantics)', async () => {
      const customHtml = vi.fn(async (p: unknown) => `EXTRA(${(p as { name: string }).name})`);
      const formatter = createAsyncTooltipFormatter({
        formatSync: (p) => `SYNC(${(p as { name: string }).name})`,
        customHtml,
      });

      formatter({ seriesIndex: 0, dataIndex: 0, name: 'A' }, 't0', vi.fn());
      formatter({ seriesIndex: 0, dataIndex: 1, name: 'B' }, 't1', vi.fn());
      await flushAsync();
      expect(customHtml).toHaveBeenCalledTimes(2);

      formatter.dismiss();

      // Both slices re-fetched in the next session.
      formatter({ seriesIndex: 0, dataIndex: 0, name: 'A' }, 't2', vi.fn());
      formatter({ seriesIndex: 0, dataIndex: 1, name: 'B' }, 't3', vi.fn());
      await flushAsync();
      expect(customHtml).toHaveBeenCalledTimes(4);
    });
  });

  it('escapes thrown error messages before rendering them inline', async () => {
    const customHtml = vi.fn(async () => {
      throw new Error('<script>alert(1)</script>');
    });
    const formatter = createAsyncTooltipFormatter({
      formatSync: () => 'SYNC',
      customHtml,
    });

    const cb = vi.fn();
    formatter({ seriesIndex: 0, dataIndex: 0, name: 'X' }, 't0', cb);
    await flushAsync();
    const html = cb.mock.calls[0][1] as string;
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
