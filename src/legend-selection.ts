import type { AnyChartOptions, LegendOptions, LegendSelectionOptions, RichTextInput, RichTextStyle } from './types.js';
import { alpha } from '@bndynet/color-hub';
import { getLegendReserve } from './adapters/common/legend.js';
import { getChartPadding } from './adapters/common/shared.js';
import { getTitleReserve } from './adapters/common/title.js';
import { getTheme, getThemeColors, resolveThemeName } from './themes/index.js';

type LegendChartOptions = AnyChartOptions & { legend?: LegendOptions };

function legendNames(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): string[] => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object' && typeof item.name === 'string') return [item.name];
    return [];
  });
}

function displayLabel(name: string, index: number, legend: LegendOptions): RichTextInput {
  if (!legend.formatLabel) return name;
  try {
    const value = legend.formatLabel(name, index);
    return typeof value === 'string' || Array.isArray(value?.segments) ? value : name;
  } catch {
    return name;
  }
}

function appendLabel(target: HTMLElement, input: RichTextInput): void {
  if (typeof input === 'string') {
    target.textContent = input;
    return;
  }
  for (const segment of input.segments) {
    const span = document.createElement('span');
    span.textContent = segment.text;
    const style: RichTextStyle = {
      ...(typeof segment.style === 'string' ? input.styles?.[segment.style] : segment.style),
    };
    if (segment.width !== undefined) style.width = segment.width;
    if (segment.align !== undefined) style.align = segment.align;
    if (segment.verticalAlign !== undefined) style.verticalAlign = segment.verticalAlign;
    if (style.color) span.style.color = style.color;
    if (style.fontFamily) span.style.fontFamily = style.fontFamily;
    if (style.fontStyle) span.style.fontStyle = style.fontStyle;
    if (style.fontWeight) span.style.fontWeight = String(style.fontWeight);
    if (style.fontSize !== undefined) span.style.fontSize = `${style.fontSize}px`;
    if (style.lineHeight !== undefined) span.style.lineHeight = `${style.lineHeight}px`;
    if (style.width !== undefined) {
      span.style.display = 'inline-block';
      span.style.width = `${style.width}px`;
    }
    if (style.align) span.style.textAlign = style.align;
    if (style.verticalAlign) span.style.verticalAlign = style.verticalAlign;
    if (typeof style.backgroundColor === 'string') span.style.backgroundColor = style.backgroundColor;
    target.appendChild(span);
  }
}

function swatchColors(option: Record<string, unknown>, names: string[], fallback: string[]): string[] {
  const colors = Array.isArray(option.color) ? option.color : fallback;
  const series = Array.isArray(option.series) ? option.series : [];
  const byName = new Map<string, string>();
  series.forEach((entry, seriesIndex) => {
    if (!entry || typeof entry !== 'object') return;
    const item = entry as { name?: unknown; data?: unknown };
    const color = colors[seriesIndex];
    if (typeof item.name === 'string' && typeof color === 'string') {
      byName.set(item.name, color);
    }
    if (!Array.isArray(item.data)) return;
    item.data.forEach((datum, dataIndex) => {
      if (!datum || typeof datum !== 'object' || typeof datum.name !== 'string') return;
      const dataColor = colors[dataIndex];
      if (typeof dataColor === 'string') byName.set(datum.name, dataColor);
    });
  });
  return names.map((name, index) => byName.get(name) ?? colors[index] ?? 'currentColor');
}

/** Per-chart custom highlight state and its accessible HTML legend. */
export class LegendSelectionController {
  private selected = new Set<string>();
  private names: string[] = [];
  private settings: LegendSelectionOptions | undefined;
  private legend: LegendOptions | undefined;
  private panel: HTMLDivElement | null = null;
  private restoredPosition: string | null = null;
  private option: Record<string, unknown> | null = null;
  private nativeVisible = false;
  private activeColor: string | undefined;
  private wasEnabled = false;
  /** Theme the current chart renders with (per-chart `options.theme` wins). */
  private themeName: string | undefined;

  constructor(private readonly container: HTMLElement, options: AnyChartOptions) {
    this.setExplicitSelected(options);
  }

  /** An explicit selected list resets highlights; other updates retain clicks. */
  setExplicitSelected(options: AnyChartOptions): void {
    const selection = (options as LegendChartOptions).legend?.selection;
    if (selection && Object.prototype.hasOwnProperty.call(selection, 'selected')) {
      this.selected = new Set(selection.selected ?? []);
    }
  }

  /** Hide ECharts' legend only when the independent selection feature is enabled. */
  prepare(option: Record<string, unknown>, options: AnyChartOptions): boolean {
    this.option = option;
    this.themeName = resolveThemeName(options.theme);
    this.legend = (options as LegendChartOptions).legend;
    this.settings = this.legend?.selection;
    const block = option.legend;
    const enabled = !!this.settings && !!block && typeof block === 'object' && !Array.isArray(block);
    const changed = enabled !== this.wasEnabled;
    this.wasEnabled = enabled;
    if (!enabled) {
      this.names = [];
      this.nativeVisible = false;
      return changed;
    }
    const native = block as Record<string, unknown>;
    this.nativeVisible = native.show !== false;
    this.names = [...new Set(legendNames(native.data))];
    this.selected = new Set(this.names.filter((name) => this.selected.has(name)));
    if (this.settings?.mode === 'single' && this.selected.size > 1) {
      this.selected = new Set(this.names.filter((name) => this.selected.has(name)).slice(0, 1));
    }
    // A caller may have supplied echarts.legend.selected. In custom mode it
    // must never hide a series or slice, including after a full setOption.
    native.selected = Object.fromEntries(this.names.map((name) => [name, true]));
    native.selectedMode = false;
    native.show = false;
    return changed;
  }

  render(options: AnyChartOptions): void {
    const legend = this.legend;
    const native = this.option?.legend as { data?: unknown } | undefined;
    const visible = !!this.settings && this.nativeVisible && this.names.length > 0 && !!native;
    if (!visible || !legend || typeof document === 'undefined' || typeof this.container.appendChild !== 'function') {
      this.removePanel();
      return;
    }
    this.removePanel();
    if (typeof getComputedStyle === 'function' && getComputedStyle(this.container).position === 'static') {
      this.restoredPosition = this.container.style.position;
      this.container.style.position = 'relative';
    }

    const panel = document.createElement('div');
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Chart legend selection');
    panel.className = 'icharts-legend-selection';
    const position = legend.position ?? 'bottom';
    const side = position === 'left' || position === 'right';
    const padding = getChartPadding(options);
    const titleTop = getTitleReserve(options).top;
    const reserve = getLegendReserve(options as LegendChartOptions, true, 0, this.names);
    Object.assign(panel.style, {
      position: 'absolute',
      zIndex: '10',
      display: 'flex',
      flexDirection: side ? 'column' : 'row',
      alignItems: side ? 'stretch' : 'center',
      justifyContent: side ? 'center' : 'flex-start',
      gap: '4px',
      boxSizing: 'border-box',
      pointerEvents: 'auto',
      overflowX: side ? 'hidden' : 'auto',
      overflowY: side ? 'auto' : 'hidden',
      scrollbarWidth: 'thin',
      whiteSpace: 'nowrap',
      fontFamily: 'inherit',
    });
    if (side) {
      panel.style[position] = `${padding}px`;
      panel.style.top = `${padding + titleTop}px`;
      panel.style.bottom = `${padding}px`;
      panel.style.width = `${Math.max(0, reserve[position] - 8)}px`;
    } else {
      panel.style.left = `${padding}px`;
      panel.style.right = `${padding}px`;
      panel.style.height = `${Math.max(0, reserve[position])}px`;
      panel.style[position] = `${position === 'top' ? padding + titleTop : padding}px`;
      panel.style.justifyContent = 'center';
    }

    const colors = getThemeColors(this.themeName);
    this.activeColor = colors.info;
    const palette = getTheme(this.themeName).palette ?? [];
    const swatches = swatchColors(this.option ?? {}, this.names, palette);
    this.names.forEach((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-pressed', String(this.selected.has(name)));
      button.title = name;
      Object.assign(button.style, {
        display: 'inline-flex',
        alignItems: 'center',
        flex: side ? '0 0 auto' : '0 0 auto',
        gap: '5px',
        minWidth: '0',
        maxWidth: '100%',
        padding: '2px 5px',
        border: '1px solid transparent',
        borderRadius: '4px',
        background: 'transparent',
        color: colors?.textPrimary ?? 'inherit',
        font: 'inherit',
        fontSize: '12px',
        lineHeight: '18px',
        cursor: 'pointer',
      });
      const icon = document.createElement('span');
      Object.assign(icon.style, {
        display: 'inline-block',
        flex: '0 0 auto',
        width: '10px',
        height: '10px',
        borderRadius: '3px',
        backgroundColor: swatches[index] ?? colors?.info ?? 'currentColor',
      });
      const label = document.createElement('span');
      appendLabel(label, displayLabel(name, index, legend));
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      button.append(icon, label);
      this.paint(button);
      button.addEventListener('click', () => {
        if (this.settings?.mode === 'single') {
          this.selected = this.selected.has(name) ? new Set() : new Set([name]);
        } else if (this.selected.has(name)) {
          this.selected.delete(name);
        } else {
          this.selected.add(name);
        }
        for (const item of panel.querySelectorAll('button')) this.paint(item);
        try {
          this.settings?.onChange?.({
            name,
            active: this.selected.has(name),
            selected: this.names.filter((entry) => this.selected.has(entry)),
          });
        } catch {
          // Consumer callbacks cannot break the chart's click handling.
        }
      });
      panel.appendChild(button);
    });
    this.container.appendChild(panel);
    this.panel = panel;
  }

  dispose(): void {
    this.removePanel();
  }

  private paint(button: HTMLButtonElement): void {
    const active = this.selected.has(button.getAttribute('aria-label') ?? '');
    const info = this.activeColor;
    button.setAttribute('aria-pressed', String(active));
    button.style.background = active && info ? alpha(info, 0.18) : 'transparent';
    button.style.borderColor = active && info ? alpha(info, 0.4) : 'transparent';
  }

  private removePanel(): void {
    this.panel?.remove();
    this.panel = null;
    if (this.restoredPosition !== null) {
      this.container.style.position = this.restoredPosition;
      this.restoredPosition = null;
    }
  }
}
