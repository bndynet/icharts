import { registerTheme } from '@bndynet/icharts';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './style.css';

// ── Register custom themes once at app startup ─────────────────────────────
registerTheme({
  name: 'ocean',
  colorMode: 'dark',
  colors: {
    background: '#0c1a2e',
    surface: '#112240',
    surfaceText: '#ccd6f6',
    textPrimary: '#ccd6f6',
    textSecondary: '#8892b0',
    gridLine: '#112240',
    axisLine: '#1d3557',
  },
  palette: [
    '#64ffda',
    '#00b4d8',
    '#48cae4',
    '#90e0ef',
    '#caf0f8',
    '#0096c7',
    '#0077b6',
  ],
});

registerTheme({
  name: 'rose',
  colorMode: 'light',
  colors: {
    background: '#fff1f2',
    textPrimary: '#881337',
    textSecondary: '#be123c',
    gridLine: '#ffe4e6',
    axisLine: '#fda4af',
  },
  palette: [
    '#e11d48',
    '#be123c',
    '#f43f5e',
    '#fb7185',
    '#fda4af',
    '#9f1239',
    '#fecdd3',
  ],
});
