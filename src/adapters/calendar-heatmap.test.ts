import { describe, it, expect } from 'vitest';
import type { CalendarHeatmapData, TooltipContext } from '../types.js';
import { isCalendarHeatmapData } from '../types.js';
import { resolveCalendarHeatmapOptions } from './calendar-heatmap.js';

type TooltipFormatter = (
  params: unknown,
  ticket: string,
  callback: (t: string, h: string) => void,
) => string | undefined;

const sample: CalendarHeatmapData = [
  { date: '2024-01-01', value: 5 },
  { date: '2024-01-02', value: 12 },
  { date: '2024-02-14', value: 30 },
];

describe('isCalendarHeatmapData', () => {
  it('accepts a non-empty array of date/value entries', () => {
    expect(isCalendarHeatmapData(sample)).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(
      isCalendarHeatmapData([] as unknown as CalendarHeatmapData),
    ).toBe(false);
    expect(
      isCalendarHeatmapData(null as unknown as CalendarHeatmapData),
    ).toBe(false);
    expect(
      isCalendarHeatmapData([
        { x: 0, y: 0, value: 1 },
      ] as unknown as CalendarHeatmapData),
    ).toBe(false);
  });
});

describe('calendar heatmap adapter', () => {
  it('emits a calendar coordinate-system heatmap series', () => {
    const option = resolveCalendarHeatmapOptions(sample, {});
    const series = (option.series as Record<string, unknown>[])[0];
    expect(series.type).toBe('heatmap');
    expect(series.coordinateSystem).toBe('calendar');
    expect((series.data as [string, number][])[0]).toEqual(['2024-01-01', 5]);
  });

  it('resolves a full-year range from the data by default', () => {
    const option = resolveCalendarHeatmapOptions(sample, {});
    const calendar = option.calendar as Record<string, unknown>;
    expect(calendar.range).toBe(2024);
  });

  it('honors an explicit range', () => {
    const option = resolveCalendarHeatmapOptions(sample, {
      range: ['2024-01-01', '2024-06-30'],
    });
    const calendar = option.calendar as Record<string, unknown>;
    expect(calendar.range).toEqual(['2024-01-01', '2024-06-30']);
  });

  it('spans [min, max] when the data crosses years', () => {
    const option = resolveCalendarHeatmapOptions(
      [
        { date: '2024-12-30', value: 1 },
        { date: '2025-01-02', value: 2 },
      ],
      {},
    );
    const calendar = option.calendar as Record<string, unknown>;
    expect(calendar.range).toEqual(['2024-12-30', '2025-01-02']);
  });

  it('emits structural calendar label config (no color fields)', () => {
    const option = resolveCalendarHeatmapOptions(sample, {
      dayLabel: { firstDay: 0 },
      showYearLabel: false,
    });
    const calendar = option.calendar as Record<string, unknown>;
    const dayLabel = calendar.dayLabel as Record<string, unknown>;
    expect(dayLabel.firstDay).toBe(0);
    expect((calendar.yearLabel as Record<string, unknown>).show).toBe(false);
    expect(dayLabel.color).toBeUndefined();
  });

  it('hides the visualMap bar by default (cells stay value-colored)', () => {
    const option = resolveCalendarHeatmapOptions(sample, {});
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm.min).toBe(5);
    expect(vm.max).toBe(30);
    expect(vm.orient).toBe('horizontal');
    expect(vm.show).toBe(false);
  });

  it('shows the visualMap above the calendar when opted in', () => {
    const option = resolveCalendarHeatmapOptions(sample, {
      visualMap: { show: true },
    });
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm.show).toBe(true);
    expect(vm.top).toBe(12); // below the (absent) title
    expect(vm.bottom).toBeUndefined();
    const calendar = option.calendar as Record<string, unknown>;
    expect(calendar.top).toBe(56); // 12 + 20 (month labels) + 24 (bar + gap)
  });

  it('reserves gutters + top space for the calendar labels', () => {
    const option = resolveCalendarHeatmapOptions(sample, {});
    const calendar = option.calendar as Record<string, unknown>;
    expect(calendar.left).toBe(60);
    expect(calendar.right).toBe(20);
    expect(calendar.top).toBe(32); // 12 padding + 20 month-label reserve
    expect(calendar.cellSize).toEqual(['auto', 18]);
  });

  it('reserves the title slot on the calendar top edge', () => {
    const noTitle = resolveCalendarHeatmapOptions(sample, {});
    const withTitle = resolveCalendarHeatmapOptions(sample, { title: 'Activity' });
    const noTitleTop = (noTitle.calendar as Record<string, unknown>).top as number;
    const withTitleTop = (withTitle.calendar as Record<string, unknown>).top as number;
    expect(withTitleTop).toBeGreaterThan(noTitleTop);
  });

  it('customHtml receives an item context with date / value / color', async () => {
    let captured: TooltipContext | undefined;
    const option = resolveCalendarHeatmapOptions(sample, {
      tooltip: {
        customHtml: async (ctx) => {
          captured = ctx;
          return 'ok';
        },
      },
    });
    const formatter = (option.tooltip as Record<string, unknown>)
      .formatter as TooltipFormatter;
    formatter(
      { dataIndex: 1, value: ['2024-01-02', 12], marker: 'x', color: '#123456' },
      't0',
      () => {},
    );
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(captured?.kind).toBe('item');
    if (captured?.kind === 'item') {
      expect(captured.name).toBe('2024-01-02');
      expect(captured.value).toBe(12);
      expect(captured.color).toBe('#123456');
    }
  });
});
