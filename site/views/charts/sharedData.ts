/**
 * Demo data shared across multiple chart-type sections.
 * Per-section data lives inside the owning component.
 */

/** "Monthly Financials" series — used by line charts and the `<i-chart>` demo. */
export const xyData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Expenses', data: [620, 732, 701, 734, 1090, 1130] },
  ],
};

/** "Browser Market Share" slices — used by pie demos and Advanced custom-colors demo. */
export const pieData = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
];

/** "Traffic Sources by Year" rings — concentric multi-series pie (POC). */
export const pieConcentricData = {
  series: [
    {
      name: '2024',
      data: [
        { name: 'Search', value: 55 },
        { name: 'Direct', value: 30 },
        { name: 'Social', value: 15 },
      ],
    },
    {
      name: '2025',
      data: [
        { name: 'Search', value: 60 },
        { name: 'Direct', value: 40 },
      ],
    },
    {
      name: '2026',
      data: [
        { name: 'Social', value: 45 },
        { name: 'Direct', value: 30 },
        { name: 'Search', value: 25 },
      ],
    },
  ],
};
