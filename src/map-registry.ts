import * as echarts from 'echarts';

export interface MapGeoJsonSource {
  type: string;
  features: unknown[];
  [key: string]: unknown;
}

export interface MapSvgSource {
  svg: string;
}

export interface MapSourceObject {
  geoJSON?: MapGeoJsonSource;
  geoJson?: MapGeoJsonSource;
  svg?: string;
  [key: string]: unknown;
}

/**
 * Register a map resource for the built-in `map` chart type.
 *
 * Accepts either:
 * - raw GeoJSON (`FeatureCollection`) object,
 * - `{ geoJSON | geoJson, specialAreas? }`,
 * - `{ svg }` (ECharts SVG map mode).
 */
export function registerMap(
  name: string,
  source: MapGeoJsonSource | MapSvgSource | MapSourceObject,
  specialAreas?: Record<string, { left: number; top: number; width: number; height: number }>,
): void {
  const register = echarts.registerMap as unknown as (
    mapName: string,
    mapSource: unknown,
    mapSpecialAreas?: unknown,
  ) => void;
  if ('type' in source && 'features' in source) {
    register(name, source, specialAreas);
    return;
  }
  register(name, source, specialAreas);
}
