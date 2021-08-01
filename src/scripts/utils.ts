import { get, merge } from 'lodash-es';

export function mergeObjects(...objs: unknown[]) {
  return merge({}, ...objs);
}

export function mergeObjectsTo(source: unknown, ...objs: unknown[]) {
  return merge(source, ...objs);
}

export function getValueByPath(obj: unknown, path: string, defaultValue?: unknown) {
  return get(obj, path, defaultValue);
}

export function getHTMLElementSize(dom: HTMLElement): { width: number; height: number } {
  return {
    width: dom.getBoundingClientRect().width,
    height: dom.getBoundingClientRect().height,
  };
}

export function setValueToObject(obj: any, value: any, ...keys: string[]): void {
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!Object.keys(cur).includes(k)) {
      // last key should be set the value
      cur[k] = i === keys.length - 1 ? value : {};
    }
    cur = cur[k];
  }

  return obj;
}

export function setValueToObjectIfValueNotUndefined(obj: any, value: any, ...keys: string[]): void {
  if (typeof value !== 'undefined') {
    setValueToObject(obj, value, ...keys);
  }
}

export function clearUndefinedProperties(obj: object): object {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => value !== undefined));
}

export function getValueByIndex(source: Array<any> | any, index: number): any {
  if (Array.isArray(source) && index < source.length) {
    return source[index];
  }

  if (index === 0) {
    return source;
  }

  return null;
}

export function isUndefined(val: any): boolean {
  return typeof val === 'undefined';
}
