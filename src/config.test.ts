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
    });
    expect(getConfig()).toEqual({
      consistentColors: true,
      fontFamily: 'Inter, sans-serif',
    });

    resetConfiguration();
    expect(getConfig()).toEqual({
      consistentColors: false,
      fontFamily: undefined,
    });
  });
});
