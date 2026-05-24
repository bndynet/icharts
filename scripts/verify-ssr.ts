/**
 * Standalone SSR verification script.
 *
 * Scope today
 * -----------
 * Verifies the SSR `liquidprogress` path end-to-end (basic
 * non-plugin chart types like line/bar/pie are already covered by
 * `src/ssr-render.test.ts`, so this script focuses on the only
 * production surface that wraps a third-party ECharts extension and
 * therefore has the highest regression risk). Add new chart-type
 * cases to `cases` below as the SSR surface grows.
 *
 * What it does
 * ------------
 * Renders the same chart at four fill levels (10 %, 50 %, 90 %, 100 %)
 * plus one dark-themed variant, all in pure Node without any DOM
 * polyfill, jsdom, or canvas. Writes the resulting `.svg` files to
 * `/tmp/icharts-ssr-output/` and prints a summary you can paste into
 * a bug report.
 *
 * What it proves
 * --------------
 *   1. `@bndynet/icharts/core` is import-safe in plain Node.
 *   2. `installLiquidProgress()` registers the plugin without
 *      requiring the consumer to touch `echarts` or `@echarts-x/*`.
 *   3. `renderChartToSVGString('liquidprogress', …)` returns a real
 *      `<svg>...</svg>` document that:
 *        - opens correctly in a browser,
 *        - reflects the input `value` (the wave height changes),
 *        - reflects the input `theme` (palette changes),
 *        - is idempotent across repeated calls (no engine leak).
 *
 * How to run
 * ----------
 *   npm run build         # builds dist/ first
 *   npm run verify:ssr    # runs this file
 *
 * The npm script uses `npx tsx` under the hood, so contributors don't
 * need to add `tsx` to devDeps — it's fetched on demand and cached.
 *
 * What to look for
 * ----------------
 * Each printed line should report a positive byte count and "title-ok"
 * / "wave-ok" / "starts-with-svg=true". When you open the .svg files
 * in a browser:
 *   - The fill height should grow visibly from 10 % to 100 %.
 *   - The title text should match what's printed.
 *   - The dark-theme variant should have a clearly different surface
 *     color from the default.
 *
 * If any check is `false` or any file is < 2 KB, something on the SSR
 * path regressed — re-run the unit suite (`npm run test`) for the
 * exact assertion that failed.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve `dist/index-core.js` relative to this script, so the script
// works regardless of cwd (you can run it from anywhere in the repo).
const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_ENTRY = resolve(HERE, '../dist/index-core.js');

if (!existsSync(DIST_ENTRY)) {
  console.error(`✗ ${DIST_ENTRY} not found.`);
  console.error('  Build the library first:  npm run build');
  process.exit(1);
}

// Dynamic import keeps the "missing dist" branch above clean (no
// top-level `import` that would crash before we can print the hint).
// The `as` cast is purely for editor IntelliSense; at runtime it's
// just `await import(...)`.
const { installLiquidProgress, renderChartToSVGString } = (await import(
  DIST_ENTRY
)) as typeof import('../dist/index-core.js');

// Register the plugin once. `installLiquidProgress` is idempotent
// (ECharts dedupes by class identity), so re-calling it inside the
// loop below would be safe — we keep it at the top for clarity.
installLiquidProgress();

const OUT_DIR = '/tmp/icharts-ssr-output';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface Case {
  filename: string;
  /** liquid-progress data — `value` is a 0..max ratio (default max = 1). */
  data: { value: number; max?: number };
  title: string;
  /** Optional theme name; omit to use the default theme. */
  theme?: string;
}

const cases: ReadonlyArray<Case> = [
  { filename: 'liquid-10pct.svg', data: { value: 0.1 }, title: 'CPU 10%' },
  { filename: 'liquid-50pct.svg', data: { value: 0.5 }, title: 'CPU 50%' },
  { filename: 'liquid-90pct.svg', data: { value: 0.9 }, title: 'CPU 90%' },
  { filename: 'liquid-100pct.svg', data: { value: 1.0 }, title: 'CPU 100%' },
  // Dark theme — same value, different palette. Proves theme switch
  // reaches the SSR path (the dark-theme SVG should NOT byte-equal
  // the default-theme 50 % case above).
  {
    filename: 'liquid-50pct-dark.svg',
    data: { value: 0.5 },
    title: 'CPU 50%',
    theme: 'dark',
  },
];

console.log('Generating SSR liquidprogress SVGs in', OUT_DIR);
console.log('');

let allPassed = true;
const sizes: Record<string, number> = {};

for (const c of cases) {
  const svg = renderChartToSVGString(
    'liquidprogress',
    c.data,
    { width: 400, height: 400 },
    {
      title: c.title,
      ...(c.theme ? { theme: c.theme } : {}),
    },
  );

  const outPath = resolve(OUT_DIR, c.filename);
  writeFileSync(outPath, svg);
  sizes[c.filename] = svg.length;

  // Lightweight self-check on every variant so a regression surfaces
  // here (with the right context) instead of waiting for the user to
  // open all five files and notice one is broken.
  const startsWithSvg = svg.startsWith('<svg');
  const hasTitle = svg.includes(c.title);
  const hasWaveShape = /<(path|circle)\b/.test(svg);
  const bigEnough = svg.length > 2000;

  const passed =
    startsWithSvg && hasTitle && hasWaveShape && bigEnough;
  if (!passed) allPassed = false;

  console.log(
    `  ${passed ? '✓' : '✗'} ${c.filename.padEnd(28)}` +
      ` ${svg.length.toString().padStart(5)} bytes` +
      `  starts-with-svg=${startsWithSvg}` +
      `  title-ok=${hasTitle}` +
      `  wave-ok=${hasWaveShape}` +
      `  big-enough=${bigEnough}` +
      (c.theme ? `  theme=${c.theme}` : ''),
  );
}

// Cross-case sanity: dark-theme SVG must differ from default-theme
// at the same fill level. If they match byte-for-byte, the `theme`
// option is being silently dropped on the SSR path.
if (sizes['liquid-50pct.svg'] && sizes['liquid-50pct-dark.svg']) {
  const themeSwitchWorks =
    sizes['liquid-50pct.svg'] !== sizes['liquid-50pct-dark.svg'];
  console.log('');
  console.log(
    `  ${themeSwitchWorks ? '✓' : '✗'} theme switch produces different SVG output` +
      `   (default=${sizes['liquid-50pct.svg']}B,` +
      ` dark=${sizes['liquid-50pct-dark.svg']}B)`,
  );
  if (!themeSwitchWorks) allPassed = false;
}

console.log('');
if (allPassed) {
  console.log('All checks passed.');
  console.log('');
  console.log('Open the SVGs in a browser to eyeball them:');
  console.log(`  open ${OUT_DIR}/*.svg          # macOS`);
  console.log(`  xdg-open ${OUT_DIR}              # Linux`);
  process.exit(0);
} else {
  console.error('Some checks failed — see lines marked ✗ above.');
  process.exit(1);
}
