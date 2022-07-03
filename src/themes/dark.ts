import { buildTheme } from './builds';

export const darkTheme = buildTheme({
  baseColor: '#000000',
  color: [
    '#8a3ffc',
    '#33b1ff',
    '#007d79',
    '#ff7eb6',
    '#fa4d56',
    '#fff1f1',
    '#6fdc8c',
    '#4589ff',
    '#d12771',
    '#d2a106',
    '#08bdba',
    '#bae6ff',
    '#ba4e00',
    '#d4bbff',
  ],
  backgroundColor: 'transparent',
  textColor: '#eeeeee',
  textColorMuted: '#aaaaaa',
  cursorLineColor: '#aaaaaa',
  axisLineColor: '#eeeeee',
  shadowColor: 'rgba(255, 255, 255, 0.5)',
});
