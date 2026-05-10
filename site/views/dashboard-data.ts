/**
 * SaaS revenue dashboard — shared demo dataset and derived chart payloads.
 * Edit this file to change numbers, tiers, or graph topology across the page.
 */

export const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

export const tiers = ['Premium', 'Pro', 'Standard', 'Basic', 'Trial'] as const;
export type TierName = (typeof tiers)[number];

/** Pinned tier colors — passed as `options.colorMap` on every named chart. */
export const PIN_COLOR_MAP = { Trial: '#efefef' } as const;

export const monthly: Record<TierName, number[]> = {
  Premium:  [420, 455, 485, 515, 560, 600, 625, 660, 690, 720, 760, 810],
  Pro:      [310, 330, 345, 365, 380, 400, 420, 440, 460, 475, 495, 520],
  Standard: [220, 235, 245, 260, 270, 285, 290, 300, 315, 325, 340, 355],
  Basic:    [150, 160, 165, 170, 180, 190, 195, 205, 215, 220, 225, 235],
  Trial:    [ 90, 100, 105, 110, 118, 125, 135, 142, 150, 158, 165, 175],
};

export function quarterSum(d: number[]): number[] {
  return [0, 1, 2, 3].map((q) => d.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0));
}

export function yearTotal(d: number[]): number {
  return d.reduce((a, b) => a + b, 0);
}

// ── XY / pie derivations ───────────────────────────────────────────────────

export function buildMonthlyTrend() {
  return {
    categories: [...months],
    series: tiers.map((t) => ({ name: t, data: monthly[t] })),
  };
}

export function buildQuarterly() {
  return {
    categories: [...quarters],
    series: tiers.map((t) => ({ name: t, data: quarterSum(monthly[t]) })),
  };
}

export function buildAnnualShare() {
  return tiers.map((t) => ({ name: t, value: yearTotal(monthly[t]) }));
}

export function buildQ4Ranking() {
  return {
    categories: [...tiers],
    series: [{
      name: 'Q4 revenue',
      data: tiers.map((t) => quarterSum(monthly[t])[3]!),
    }],
  };
}

export function buildQ4Mix() {
  return tiers.map((t) => ({ name: t, value: quarterSum(monthly[t])[3]! }));
}

// ── KPI cards ──────────────────────────────────────────────────────────────

const totalARR = tiers.reduce((s, t) => s + yearTotal(monthly[t]), 0);
const arrSpark = months.map((_, i) => tiers.reduce((s, t) => s + monthly[t][i]!, 0));

export const kpis = [
  {
    key: 'arr',
    label: 'Total ARR',
    value: `$${(totalARR / 1000).toFixed(2)}M`,
    delta: 18.2,
    deltaPositiveIsGood: true,
    sparkType: 'area' as const,
    sparkName: 'Total ARR',
    sparkData: arrSpark,
  },
  {
    key: 'customers',
    label: 'Active Customers',
    value: '18,420',
    delta: 9.4,
    deltaPositiveIsGood: true,
    sparkType: 'bar' as const,
    sparkName: 'Active Customers',
    sparkData: [12100, 12600, 13000, 13600, 14200, 14800, 15400, 16000, 16700, 17300, 17900, 18420],
  },
  {
    key: 'churn',
    label: 'Net Churn',
    value: '2.1%',
    delta: -0.6,
    deltaPositiveIsGood: false,
    sparkType: 'line' as const,
    sparkName: 'Net Churn',
    sparkData: [3.2, 3.1, 2.9, 2.8, 2.8, 2.6, 2.5, 2.2, 2.0, 1.1, 0.6, 0.1],
  },
] as const;

export type DashboardKpi = (typeof kpis)[number];

// ── Graph charts ─────────────────────────────────────────────────────────────

/** Tier-level movement — chord chart. */
export const tierMovement = {
  nodes: tiers.map((name) => ({ name, value: yearTotal(monthly[name]) })),
  links: [
    { source: 'Trial',    target: 'Basic',    value: 320 },
    { source: 'Trial',    target: 'Standard', value: 240 },
    { source: 'Basic',    target: 'Standard', value: 180 },
    { source: 'Basic',    target: 'Pro',      value: 95 },
    { source: 'Standard', target: 'Pro',      value: 145 },
    { source: 'Pro',      target: 'Premium',  value: 88 },
    { source: 'Standard', target: 'Premium',  value: 32 },
    { source: 'Premium',  target: 'Pro',      value: 24 },
    { source: 'Pro',      target: 'Standard', value: 38 },
  ],
};

const tierSegments: Record<TierName, { name: string; value: number }[]> = {
  Trial: [
    { name: 'Organic Search', value: 48 },
    { name: 'Paid Ads',       value: 34 },
    { name: 'Referral',       value: 25 },
    { name: 'Direct',         value: 18 },
  ],
  Basic: [
    { name: 'Self-serve', value: 62 },
    { name: 'SMB North',  value: 58 },
    { name: 'SMB South',  value: 55 },
  ],
  Standard: [
    { name: 'West',    value: 72 },
    { name: 'East',    value: 68 },
    { name: 'Growth',  value: 65 },
  ],
  Pro: [
    { name: 'Enterprise Lite', value: 88 },
    { name: 'Enterprise Core', value: 82 },
    { name: 'Partner',         value: 76 },
  ],
  Premium: [
    { name: 'Strategic',    value: 95 },
    { name: 'Key Accounts', value: 88 },
    { name: 'Global',       value: 82 },
  ],
};

function ringLinks(
  names: string[],
  value: number,
): { source: string; target: string; value: number }[] {
  return names.map((source, i) => ({
    source,
    target: names[(i + 1) % names.length]!,
    value,
  }));
}

/**
 * Round-robin interleave with a per-ring rotation so no two consecutive
 * nodes share a tier — keeps the network `circular` variant visually
 * varied (otherwise `tiers.flatMap(...)` would arrange all Premium nodes
 * in one arc, all Pro in the next, etc., turning the ring into 5 clean
 * coloured zones). Force layout doesn't care about input order, so this
 * affects the circular variant only.
 */
function interleaveTierSegments(): {
  name: string;
  category: TierName;
  value: number;
}[] {
  const out: { name: string; category: TierName; value: number }[] = [];
  const maxLen = Math.max(...tiers.map((t) => tierSegments[t].length));
  for (let i = 0; i < maxLen; i++) {
    for (let k = 0; k < tiers.length; k++) {
      const tier = tiers[(k + i) % tiers.length]!;
      const seg = tierSegments[tier][i];
      if (seg) out.push({ name: seg.name, category: tier, value: seg.value });
    }
  }
  return out;
}

/** Cohort-level movement — network charts (`category` = tier name). */
export const tierMovementNetwork = {
  categories: [...tiers],
  nodes: interleaveTierSegments(),
  links: [
    ...ringLinks(tierSegments.Trial.map((s) => s.name), 12),
    ...ringLinks(tierSegments.Basic.map((s) => s.name), 28),
    ...ringLinks(tierSegments.Standard.map((s) => s.name), 32),
    ...ringLinks(tierSegments.Pro.map((s) => s.name), 34),
    ...ringLinks(tierSegments.Premium.map((s) => s.name), 30),
    { source: 'Organic Search', target: 'Referral', value: 8 },
    { source: 'Self-serve',     target: 'SMB South', value: 18 },
    { source: 'West',           target: 'Growth',    value: 20 },
    { source: 'Enterprise Lite', target: 'Partner', value: 24 },
    { source: 'Strategic',      target: 'Global',    value: 26 },
    { source: 'Organic Search', target: 'Self-serve',      value: 48 },
    { source: 'Paid Ads',       target: 'SMB North',       value: 44 },
    { source: 'Referral',       target: 'SMB South',       value: 36 },
    { source: 'Organic Search', target: 'West',            value: 40 },
    { source: 'Paid Ads',       target: 'East',            value: 36 },
    { source: 'Direct',         target: 'Growth',          value: 20 },
    { source: 'Self-serve',     target: 'West',            value: 70 },
    { source: 'SMB North',      target: 'East',            value: 60 },
    { source: 'SMB South',      target: 'Growth',          value: 50 },
    { source: 'Self-serve',     target: 'Enterprise Lite', value: 55 },
    { source: 'SMB North',      target: 'Partner',         value: 40 },
    { source: 'West',           target: 'Enterprise Lite', value: 80 },
    { source: 'East',           target: 'Enterprise Core', value: 65 },
    { source: 'Enterprise Lite', target: 'Strategic',    value: 50 },
    { source: 'Enterprise Core', target: 'Key Accounts',   value: 38 },
    { source: 'Growth',         target: 'Global',          value: 32 },
    { source: 'Key Accounts',   target: 'Partner',         value: 24 },
    { source: 'Partner',        target: 'East',            value: 38 },
  ],
};

/** Traffic source → trial → paid tier / churn. */
export const acquisitionSankey = {
  nodes: [
    { name: 'Organic Search' },
    { name: 'Paid Ads' },
    { name: 'Referral' },
    { name: 'Direct' },
    { name: 'Trial Signup' },
    { name: 'Premium' },
    { name: 'Pro' },
    { name: 'Standard' },
    { name: 'Basic' },
    { name: 'Churned' },
  ],
  links: [
    { source: 'Organic Search', target: 'Trial Signup', value: 1850 },
    { source: 'Paid Ads',       target: 'Trial Signup', value: 1320 },
    { source: 'Referral',       target: 'Trial Signup', value: 980 },
    { source: 'Direct',         target: 'Trial Signup', value: 720 },
    { source: 'Trial Signup', target: 'Premium',  value: 420 },
    { source: 'Trial Signup', target: 'Pro',      value: 880 },
    { source: 'Trial Signup', target: 'Standard', value: 1240 },
    { source: 'Trial Signup', target: 'Basic',    value: 1180 },
    { source: 'Trial Signup', target: 'Churned',  value: 1150 },
  ],
};

export const radarFeatureUsage = {
  indicators: [
    { name: 'Reports',    max: 100 },
    { name: 'API',        max: 100 },
    { name: 'Support',    max: 100 },
    { name: 'SLA',        max: 100 },
    { name: 'Analytics',  max: 100 },
    { name: 'Security',   max: 100 },
  ],
  series: [
    { name: 'Premium',  values: [96, 92, 90, 95, 88, 94] },
    { name: 'Pro',      values: [80, 82, 75, 78, 72, 80] },
    { name: 'Standard', values: [60, 65, 60, 55, 55, 65] },
  ],
};

/** Premium vs Pro mixed chart — growth-rate line (right axis). */
export const mixedGrowthRate = [12, 16, 19, 23] as const;

/** Trial signup outcomes — mirrors sankey second stage. */
export const trialOutcomes = [
  { name: 'Premium',  value: 420 },
  { name: 'Pro',      value: 880 },
  { name: 'Standard', value: 1240 },
  { name: 'Basic',    value: 1180 },
  { name: 'Churned',  value: 1150 },
] as const;

export const gaugeCsat = { value: 87, max: 100, label: 'CSAT' } as const;
export const gaugeUptime = { value: 99.8, max: 100, label: 'Uptime' } as const;
