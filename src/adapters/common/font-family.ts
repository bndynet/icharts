/**
 * Apply a global font family to text-like ECharts option nodes.
 *
 * This is used by:
 * - `core.ts` before the main `setOption` call
 * - adapters that perform additional runtime `setOption(payload)` updates
 *   (e.g. pie's adaptive layout onInit path)
 */
export function applyConfiguredFontFamilyToOption(
  option: unknown,
  fontFamily?: string,
): void {
  const resolved = fontFamily?.trim();
  if (!resolved || !option || typeof option !== 'object') return;

  const root = option as Record<string, unknown>;
  const rootTextStyle =
    root.textStyle && typeof root.textStyle === 'object'
      ? (root.textStyle as Record<string, unknown>)
      : {};
  root.textStyle = { ...rootTextStyle, fontFamily: resolved };

  applyFontToTitleOrLegend(root, 'title', resolved);
  applyFontToTitleOrLegend(root, 'legend', resolved);
  applyFontToTextLikeNodes(root, resolved);
}

function applyFontToTitleOrLegend(
  root: Record<string, unknown>,
  key: 'title' | 'legend',
  fontFamily: string,
): void {
  const target = root[key];
  if (Array.isArray(target)) {
    root[key] = target.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const record = item as Record<string, unknown>;
      const textStyle =
        record.textStyle && typeof record.textStyle === 'object'
          ? (record.textStyle as Record<string, unknown>)
          : {};
      return {
        ...record,
        textStyle: { ...textStyle, fontFamily },
      };
    });
    return;
  }

  if (!target || typeof target !== 'object') return;
  const record = target as Record<string, unknown>;
  const textStyle =
    record.textStyle && typeof record.textStyle === 'object'
      ? (record.textStyle as Record<string, unknown>)
      : {};
  root[key] = {
    ...record,
    textStyle: { ...textStyle, fontFamily },
  };
}

const FONT_TARGET_KEYS = new Set([
  'textStyle',
  'style',
  'label',
  'endLabel',
  'edgeLabel',
  'axisLabel',
  'axisName',
  'nameTextStyle',
  'upperLabel',
  'detail',
  'title',
  'subtextStyle',
]);

function applyFontToTextLikeNodes(node: unknown, fontFamily: string): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) applyFontToTextLikeNodes(item, fontFamily);
    return;
  }

  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== 'object') continue;

    if (FONT_TARGET_KEYS.has(key)) {
      const target = value as Record<string, unknown>;
      if (target.rich && typeof target.rich === 'object') {
        const rich = target.rich as Record<string, unknown>;
        for (const richKey of Object.keys(rich)) {
          const richStyle = rich[richKey];
          if (!richStyle || typeof richStyle !== 'object') continue;
          rich[richKey] = {
            ...(richStyle as Record<string, unknown>),
            fontFamily,
          };
        }
      }
      const existingFontFamily = target.fontFamily;
      if (
        typeof existingFontFamily !== 'string' ||
        existingFontFamily.trim().length === 0
      ) {
        target.fontFamily = fontFamily;
      }
    }

    applyFontToTextLikeNodes(value, fontFamily);
  }
}
