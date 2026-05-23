import { describe, it, expect, beforeEach } from 'vitest';
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
    });
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
