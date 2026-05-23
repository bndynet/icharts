import type { CreateAsyncTooltipFormatterOptions } from './types.js';

/**
 * Escape minimal HTML entities for safe inline text (errors, placeholders).
 */
export function escapeTooltipHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Stable identity for an ECharts tooltip `params` payload. Used as the
 * default cache / dedupe key inside {@link createAsyncTooltipFormatter}.
 *
 * Two payload shapes ECharts emits:
 *
 *   - **Axis tooltips** (line / bar / area `trigger: 'axis'`): an array of
 *     series entries hovered at the same x-axis column. Keyed by the
 *     shared `axisValue`; falls back to `(seriesIndex, dataIndex)` pairs
 *     when `axisValue` is missing.
 *   - **Item / edge / node tooltips** (pie slice, sankey/chord node or
 *     link, network node, tree node — anything with `trigger: 'item'`):
 *     a single object. Keyed by `(dataType, seriesIndex, dataIndex, name)`.
 *
 * `dataType` is what lets sankey/chord/network distinguish a node hover
 * (`'node'`) from an edge hover (`'edge'`) — both share the same series
 * but resolve to different `customHtml` payloads, so the key has to
 * include it or the first one served would poison the cache.
 */
function defaultTooltipCacheKey(params: unknown): string {
  if (Array.isArray(params)) {
    const first = params[0] as Record<string, unknown> | undefined;
    if (first && first.axisValue !== undefined) {
      return `axis:${String(first.axisValue)}`;
    }
    return (
      'axis:' +
      params
        .map((p) => {
          const r = p as Record<string, unknown> | undefined;
          return `${String(r?.seriesIndex ?? '')}/${String(r?.dataIndex ?? '')}`;
        })
        .join(',')
    );
  }
  const r = (params ?? {}) as Record<string, unknown>;
  return [
    'item',
    String(r.dataType ?? ''),
    String(r.seriesIndex ?? 0),
    String(r.dataIndex ?? 0),
    String(r.name ?? ''),
  ].join('|');
}

/**
 * ECharts tooltip formatter callable + a `dismiss()` hook the engine wires
 * to ECharts' `hideTip` event. See {@link createAsyncTooltipFormatter} for
 * the full lifecycle rationale.
 */
export interface AsyncTooltipFormatter {
  (
    params: unknown,
    asyncTicket: string,
    callback?: (ticket: string, html: string | HTMLElement | HTMLElement[]) => void,
  ): string;
  /**
   * Drop every cached and in-flight tooltip HTML this formatter holds. The
   * engine wires this to ECharts' `hideTip` event so the cache only lives
   * for a single tooltip session — the next hover always re-fetches fresh
   * data, while rapid cursor motion within a single session still dedupes
   * down to one `customHtml` call.
   *
   * Idempotent; safe to invoke when nothing is cached.
   */
  dismiss(): void;
}

/**
 * Build an ECharts tooltip `formatter` that shows synchronous HTML first, then
 * appends content from an async `customHtml` call. Works for **any** chart type:
 * pass your own `formatSync` (e.g. pie item, sankey link, or
 * {@link formatAxisTooltipSyncHtml} for axis charts) and use the same `params`
 * shape ECharts provides.
 *
 * Use with `ChartOptions.echarts.tooltip.formatter` when not using the built-in
 * `tooltip.customHtml` shortcut (axis line/bar/area only).
 *
 * **Cache lifecycle.** ECharts re-invokes the formatter on every mouse move
 * (not just when the hovered data point changes). To prevent `customHtml`
 * from firing — and the placeholder from flickering — on every pixel of
 * cursor motion, the formatter caches resolved HTML by a stable identity
 * derived from `params` (see {@link defaultTooltipCacheKey}). Concurrent
 * invocations for the same key share a single in-flight promise.
 *
 * The cache is cleared on:
 *   - **`hideTip`** — `IChart._apply()` registers a listener that calls
 *     `formatter.dismiss()`, so each new tooltip session re-fetches fresh
 *     data (cache only deduplicates *within* a session).
 *   - **Adapter re-resolve** — every `chart.update()` / `setTheme()` /
 *     `resize()` rebuilds the formatter closure with a fresh empty cache.
 *
 * Pass `cacheKey: false` in {@link CreateAsyncTooltipFormatterOptions} to
 * disable caching entirely when the async result genuinely varies across
 * mouse moves for the same data point.
 *
 * @example
 * ```ts
 * echarts: {
 *   tooltip: {
 *     trigger: 'item',
 *     formatter: createAsyncTooltipFormatter({
 *       formatSync: (p) => {
 *         const x = p as { name: string; value: number };
 *         return `${x.name}: <b>${x.value}</b>`;
 *       },
 *       customHtml: async (p) => {
 *         const x = p as { dataIndex: number };
 *         const r = await fetch(`/meta/${x.dataIndex}`);
 *         return (await r.json()).note;
 *       },
 *     }),
 *   },
 * }
 * ```
 */
export function createAsyncTooltipFormatter(
  options: CreateAsyncTooltipFormatterOptions,
): AsyncTooltipFormatter {
  const placeholder = options.placeholder ?? 'Loading…';
  const keyFn =
    options.cacheKey === false ? null : options.cacheKey ?? defaultTooltipCacheKey;

  // Per-formatter-instance state. Lives as long as the adapter-built option
  // is held by ECharts — i.e. until the next `setOption` resolve in the
  // adapter pipeline, which constructs a fresh formatter closure with a
  // fresh cache. That self-clears stale data on chart updates.
  const resolved = new Map<string, string>();
  const inflight = new Map<string, Promise<string>>();
  // Bumped on every `dismiss()`. Each in-flight `customHtml` task closes
  // over the generation it started in and only commits its result to
  // `resolved` if the generation hasn't advanced. Without this guard, a
  // slow load that resolves AFTER the user leaves the chart would write
  // its result back into the cache (post-`clear()`), and the next
  // hover would serve that stale HTML instead of re-fetching.
  let generation = 0;

  const wrap = (syncHtml: string, extra: string): string => {
    const extraTrim = extra.trim();
    const syncTrim = syncHtml.trim();
    if (!extraTrim) {
      return syncTrim ? `<div style="line-height:1.55">${syncTrim}</div>` : '';
    }
    if (!syncTrim) {
      return `<div style="line-height:1.55">${extraTrim}</div>`;
    }
    const fragment = `<div class="icharts-tooltip-extra" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(128,128,128,.35);font-size:12px">${extraTrim}</div>`;
    return `<div style="line-height:1.55">${syncTrim}${fragment}</div>`;
  };

  const wrapError = (syncHtml: string, e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    return `<div style="line-height:1.55">${syncHtml}<div style="color:#dc2626;font-size:12px;margin-top:6px">${escapeTooltipHtml(msg)}</div></div>`;
  };

  const formatter = ((params, asyncTicket, callback) => {
    const syncHtml = options.formatSync(params);
    const key = keyFn ? keyFn(params) : null;

    // Already resolved (success or error) for this slice/node/axis column —
    // serve synchronously so ECharts doesn't repaint the placeholder.
    if (key !== null) {
      const cached = resolved.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    if (!callback) {
      // No callback => ECharts won't accept an async result. Return the
      // synchronous body and skip the load entirely. (This branch is also
      // exercised by tests that invoke the formatter without ECharts.)
      return syncHtml;
    }

    // Dedupe concurrent loads for the same key. The first hover starts the
    // fetch; subsequent hovers (different mouse positions, same slice)
    // attach their `callback` to the existing promise instead of firing
    // a second request. Each invocation gets its own asyncTicket from
    // ECharts, so we capture it in the local `then` closure.
    let task = key !== null ? inflight.get(key) : undefined;
    if (!task) {
      // Invoke customHtml synchronously so dedupe is robust no matter how
      // tightly the caller fires repeat invocations — `Promise.resolve(v)`
      // evaluates v on the current tick.
      const myGen = generation;
      task = Promise.resolve(options.customHtml(params))
        .then(
          (extra) => wrap(syncHtml, extra),
          (e: unknown) => wrapError(syncHtml, e),
        )
        .then((html) => {
          // Discard the result if `dismiss()` fired while we were in
          // flight — the user left the chart, the tooltip session ended,
          // and the next hover should re-fetch fresh data rather than
          // pick up this stale resolve.
          if (key !== null && myGen === generation) {
            resolved.set(key, html);
            inflight.delete(key);
          }
          return html;
        });
      if (key !== null) {
        inflight.set(key, task);
      }
    }

    void task.then((html) => {
      callback(asyncTicket, html);
    });

    return `<span style="opacity:.75">${escapeTooltipHtml(placeholder)}</span>`;
  }) as AsyncTooltipFormatter;

  formatter.dismiss = (): void => {
    generation += 1;
    resolved.clear();
    inflight.clear();
  };

  return formatter;
}
