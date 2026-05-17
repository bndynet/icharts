/**
 * Format a Date using dayjs/Moment.js-compatible tokens:
 * YYYY, MM, DD, HH, mm, ss
 */
export function formatDateByPattern(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern
    .replace('YYYY', String(date.getFullYear()))
    .replace('YY', String(date.getFullYear()).slice(-2))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}

export const DATE_STRING_RE =
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([T ]\d{1,2}(:\d{2}(:\d{2})?)?)?Z?$/;
