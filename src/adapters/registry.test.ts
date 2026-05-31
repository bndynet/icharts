/**
 * Registry introspection + safety surface:
 *   - hasAdapter / listAdapters / unregisterAdapter
 *   - console.warn when a consumer shadows a built-in type
 *   - actionable, value-free errors from resolveEChartsOption
 *
 * Runs in the default node env: importing the registry pulls in every
 * built-in adapter (type-only `echarts` imports), so no `echarts` mock is
 * needed here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  registerAdapter,
  getAdapter,
  hasAdapter,
  listAdapters,
  unregisterAdapter,
  resolveEChartsOption,
  type ChartAdapter,
} from './index.js';
import type { ChartData, ChartOptions } from '../types.js';

const stub: ChartAdapter = {
  validate: () => true,
  resolve: () => ({ option: { series: [] } }),
};

afterEach(() => {
  // Clean up any custom types a test may have left behind.
  unregisterAdapter('custom-registry-x');
  unregisterAdapter('custom-registry-y');
});

describe('registry introspection', () => {
  it('hasAdapter reflects built-in and custom registrations', () => {
    expect(hasAdapter('line')).toBe(true);
    expect(hasAdapter('definitely-not-a-chart')).toBe(false);

    registerAdapter('custom-registry-x', stub);
    expect(hasAdapter('custom-registry-x')).toBe(true);
  });

  it('listAdapters includes built-ins and newly registered types', () => {
    const before = listAdapters();
    expect(before).toContain('line');
    expect(before).toContain('pie');
    expect(before).not.toContain('custom-registry-y');

    registerAdapter('custom-registry-y', stub);
    expect(listAdapters()).toContain('custom-registry-y');
  });

  it('unregisterAdapter removes a type and reports whether it existed', () => {
    registerAdapter('custom-registry-x', stub);
    expect(unregisterAdapter('custom-registry-x')).toBe(true);
    expect(hasAdapter('custom-registry-x')).toBe(false);
    // Second removal: nothing there anymore.
    expect(unregisterAdapter('custom-registry-x')).toBe(false);
  });
});

describe('registry override warning', () => {
  it('warns when overriding a built-in type (override still applies)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = getAdapter('line') as ChartAdapter;
    try {
      registerAdapter('line', stub);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/overrides a built-in/);
      expect(getAdapter('line')).toBe(stub);
    } finally {
      registerAdapter('line', original); // restore (warns again; ignored)
      warn.mockRestore();
    }
  });

  it('does NOT warn when re-registering a custom type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      registerAdapter('custom-registry-x', stub);
      registerAdapter('custom-registry-x', { ...stub });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('resolveEChartsOption errors', () => {
  it('lists registered types when the chart type is unknown', () => {
    expect(() =>
      resolveEChartsOption('nope', {} as ChartData, {} as ChartOptions),
    ).toThrow(/Unsupported chart type: "nope"/);
    expect(() =>
      resolveEChartsOption('nope', {} as ChartData, {} as ChartOptions),
    ).toThrow(/Registered types:.*line/);
  });

  it('describes the received data shape by keys, without echoing values', () => {
    registerAdapter('custom-registry-x', {
      validate: () => false, // force the invalid-data branch
      resolve: () => ({ option: {} }),
    });
    let message = '';
    try {
      resolveEChartsOption(
        'custom-registry-x',
        { secret: 'hunter2', token: 'abc' } as unknown as ChartData,
        {} as ChartOptions,
      );
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/Invalid data for chart type "custom-registry-x"/);
    // Keys are surfaced (actionable) ...
    expect(message).toContain('keys [secret, token]');
    // ... but the values are NOT leaked into the message.
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('abc');
  });
});
