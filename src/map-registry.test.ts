import { describe, it, expect, vi } from 'vitest';

const { registerMapMock } = vi.hoisted(() => ({
  registerMapMock: vi.fn(),
}));

vi.mock('echarts', () => ({
  registerMap: registerMapMock,
}));

import { registerMap } from './map-registry.js';

describe('registerMap', () => {
  it('forwards raw GeoJSON payload to echarts.registerMap', () => {
    const geo = {
      type: 'FeatureCollection',
      features: [],
    };
    registerMap('demo', geo);
    expect(registerMapMock).toHaveBeenCalledWith('demo', geo, undefined);
  });

  it('forwards map source objects unchanged', () => {
    const source = {
      geoJSON: {
        type: 'FeatureCollection',
        features: [],
      },
      specialAreas: {
        test: { left: 0, top: 0, width: 10, height: 10 },
      },
    };
    registerMap('demo-object', source);
    expect(registerMapMock).toHaveBeenCalledWith('demo-object', source, undefined);
  });

  it('forwards specialAreas when provided explicitly', () => {
    const geo = {
      type: 'FeatureCollection',
      features: [],
    };
    const specialAreas = {
      island: { left: 12, top: 8, width: 30, height: 20 },
    };
    registerMap('demo-special', geo, specialAreas);
    expect(registerMapMock).toHaveBeenCalledWith(
      'demo-special',
      geo,
      specialAreas,
    );
  });
});
