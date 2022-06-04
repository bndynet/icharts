import * as echarts from 'echarts';
import { get, merge, transform } from 'lodash-es';
import { Position } from './types';

export function mergeObjects(...objs: unknown[]) {
  return merge({}, ...objs);
}

export function mergeObjectsTo(source: unknown, ...objs: unknown[]) {
  return merge(source, ...objs);
}

export function getValueByPath(
  obj: unknown,
  path: string,
  defaultValue?: unknown,
) {
  return get(obj, path, defaultValue);
}

export function getHTMLElementSize(dom: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: dom.getBoundingClientRect().width,
    height: dom.getBoundingClientRect().height,
  };
}

export function setValueToObject(
  obj: any,
  value: any,
  ...keys: string[]
): void {
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!Object.keys(cur).includes(k)) {
      cur[k] = {};
    }
    // last key should be set the value
    if (i === keys.length - 1) {
      cur[k] = value;
    }
    cur = cur[k];
  }

  return obj;
}

export function setValueToObjectIfValueDefined(
  obj: any,
  value: any,
  ...keys: string[]
): void {
  if (typeof value !== 'undefined') {
    setValueToObject(obj, value, ...keys);
  }
}

export function appendValueToObject(
  obj: any,
  value: any,
  ...keys: string[]
): void {
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!Object.keys(cur).includes(k)) {
      // last key should be set the value []
      cur[k] = i === keys.length - 1 ? [] : {};
    }
    cur = cur[k];
  }
  cur.push(value);

  return obj;
}

export function setDefaultValueToObject(
  obj: any,
  value: any,
  defaultValue: any,
  ...keys: string[]
): void {
  setValueToObject(
    obj,
    typeof value === 'undefined' || value === null ? defaultValue : value,
    ...keys,
  );
}

export function clearUndefinedProperties(obj: object): object {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => value !== undefined),
  );
}

export function getValueByIndex<T>(
  source: Array<T> | T | undefined,
  index: number,
): T | undefined {
  if (source) {
    if (Array.isArray(source) && index < source.length) {
      return source[index];
    }

    if (index === 0) {
      return source as T;
    }
  }

  return undefined;
}

export function isUndefined(val: any): boolean {
  return typeof val === 'undefined';
}

export function isNumber(val: any): boolean {
  return !isNaN(val);
}

export function getLinearGradientColor(
  colors: string[],
  from?: Position,
  to?: Position,
): any {
  let args: any[] = [0, 0, 0, 1]; // from top to bottom
  if (from === Position.Left && to === Position.Right) {
    args = [0, 0, 1, 0];
  } else if (from === Position.Right && to === Position.Left) {
    args = [1, 0, 0, 0];
  } else if (from === Position.Top && to === Position.Bottom) {
    args = [0, 0, 0, 1];
  } else if (from === Position.Bottom && to === Position.Top) {
    args = [0, 1, 0, 0];
  } else if (from === Position.TopLeft && to === Position.BottomRight) {
    args = [0, 0, 1, 1];
  } else if (from === Position.BottomLeft && to === Position.TopRight) {
    args = [0, 1, 1, 0];
  } else if (from === Position.TopRight && to === Position.BottomLeft) {
    args = [1, 0, 0, 1];
  } else if (from === Position.BottomRight && to === Position.TopLeft) {
    args = [1, 1, 0, 0];
  }

  const offsets = [];
  const step = 1 / (colors.length - 1);
  for (let i = 0; i < colors.length; i++) {
    offsets.push({
      offset: i === colors.length - 1 ? 1 : i * step,
      color: colors[i],
    });
  }

  args.push(offsets);

  return new (echarts.graphic.LinearGradient as any)(...args);
}

export function removeUndefinedProperties(obj: object): any {
  return transform(obj, (result, value: any, key) => {
    if (typeof value === 'object') {
      value = removeUndefinedProperties(value); // Recursive call for nested objects
    }
    if (typeof value !== 'undefined') {
      result[key] = value;
    }
  });
}

export function formatNumber(value?: number | string): string {
  if (typeof value === 'undefined' || value === null) {
    return '';
  }
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
