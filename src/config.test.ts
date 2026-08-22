import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configure, getConfig, resetConfiguration } from './config.js';

describe('configuration reset', () => {
  beforeEach(() => {
    resetConfiguration();
  });

  it('restores configure() fields to defaults', () => {
    configure({
      consistentColors: true,
      fontFamily: 'Inter, sans-serif',
      theme: {
        name: 'config-test-theme',
        palette: ['#123456', '#abcdef'],
      },
      statusRenderer: undefined,
      statusMessages: undefined,
    });
    expect(getConfig()).toEqual({
      consistentColors: true,
      fontFamily: 'Inter, sans-serif',
      theme: {
        name: 'config-test-theme',
        palette: ['#123456', '#abcdef'],
      },
    });

    resetConfiguration();
    expect(getConfig()).toEqual({
      consistentColors: false,
      fontFamily: undefined,
      theme: undefined,
      statusRenderer: undefined,
      statusMessages: undefined,
    });
  });

  it('stores and resets a global status renderer', () => {
    const renderer = vi.fn();
    configure({ statusRenderer: renderer });
    expect(getConfig().statusRenderer).toBe(renderer);

    resetConfiguration();
    expect(getConfig().statusRenderer).toBeUndefined();
  });

  it('merges global status message overrides and clears them on reset', () => {
    configure({ statusMessages: { loading: '正在加载…' } });
    configure({ statusMessages: { error: '加载失败' } });

    expect(getConfig().statusMessages).toEqual({
      loading: '正在加载…',
      error: '加载失败',
    });

    resetConfiguration();
    expect(getConfig().statusMessages).toBeUndefined();
  });

  it('stores configured global theme object', () => {
    configure({
      theme: {
        name: 'config-theme-only',
        colorMode: 'dark',
        colors: { textPrimary: '#f8fafc' },
        palette: ['#60a5fa', '#34d399'],
      },
    });

    expect(getConfig().theme).toEqual({
      name: 'config-theme-only',
      colorMode: 'dark',
      colors: { textPrimary: '#f8fafc' },
      palette: ['#60a5fa', '#34d399'],
    });
  });
});
