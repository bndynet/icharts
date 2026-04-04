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
 * Build an ECharts tooltip `formatter` that shows synchronous HTML first, then
 * appends content from an async `customHtml` call. Works for **any** chart type:
 * pass your own `formatSync` (e.g. pie item, sankey link, or
 * {@link formatAxisTooltipSyncHtml} for axis charts) and use the same `params`
 * shape ECharts provides.
 *
 * Use with `ChartOptions.echarts.tooltip.formatter` when not using the built-in
 * `tooltip.customHtml` shortcut (axis line/bar/area only).
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
): (
  params: unknown,
  asyncTicket: string,
  callback?: (ticket: string, html: string | HTMLElement | HTMLElement[]) => void,
) => string {
  const placeholder = options.placeholder ?? 'Loading…';

  return (params, asyncTicket, callback) => {
    const syncHtml = options.formatSync(params);
    if (!callback) {
      return syncHtml;
    }

    void Promise.resolve(options.customHtml(params))
      .then((extra) => {
        const fragment = extra.trim()
          ? `<div class="icharts-tooltip-extra" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(128,128,128,.35);font-size:12px">${extra}</div>`
          : '';
        callback(asyncTicket, `<div style="line-height:1.55">${syncHtml}${fragment}</div>`);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        callback(
          asyncTicket,
          `<div style="line-height:1.55">${syncHtml}<div style="color:#dc2626;font-size:12px;margin-top:6px">${escapeTooltipHtml(msg)}</div></div>`,
        );
      });

    return `<span style="opacity:.75">${escapeTooltipHtml(placeholder)}</span>`;
  };
}
