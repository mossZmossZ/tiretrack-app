# Interactive Dashboard Design

**Date:** 2026-06-15  
**Status:** Approved  
**Scope:** `client/src/pages/admin/Dashboard.jsx`, `server/services/service.service.js`, `server/routes/service.routes.js`

---

## Overview

Upgrade the admin dashboard chart from a static 12-month view to a fully interactive time-series with period filters, clickable drill-down, and a reset control. Stat cards remain unchanged (always show today + this month).

---

## Backend Changes

### 1. `getStats()` — add `dailyRevenue`

**File:** `server/services/service.service.js`

Add a new key `dailyRevenue` to the return value of `getStats()`. It is a plain object keyed by `YYYY-MM-DD` (CE date) containing the summed `total_price` for that day, covering the **last 30 days only** (older days excluded to keep payload small).

```js
// Example shape added to getStats() return
dailyRevenue: {
  "2026-05-16": 4800,
  "2026-05-17": 12300,
  // … up to today
}
```

Computation mirrors `monthlyRevenue` but uses the full date string as key. Filter to `date >= thirtyDaysAgo`.

No other changes to the stats response shape.

### 2. `GET /api/services` — add date-range filter

**File:** `server/routes/service.routes.js` + `server/services/service.service.js`

Add optional query params `from` and `to` (`YYYY-MM-DD`) to the existing `GET /api/services` route. When both are present, return only records where `record.date >= from && record.date <= to`, sorted by date descending.

- If neither param is provided, behavior is unchanged (return all or search by license plate).
- Validation: reject malformed dates with `400 { success: false, error: "Invalid date range" }`.
- No new route needed — extend the existing handler.

---

## Frontend Changes

**File:** `client/src/pages/admin/Dashboard.jsx`

### State

```js
const [filter, setFilter] = useState('1y');        // '1m' | '5m' | '1y' | '3y'
const [selectedPoint, setSelectedPoint] = useState(null); // { label, from, to } | null
const [drillRecords, setDrillRecords] = useState(null);   // null = not fetched | [] = empty | [...] = records
const [drillLoading, setDrillLoading] = useState(false);
```

### Chart Data Computation

All chart data is derived client-side from the initial stats payload. No re-fetch on filter change.

| Filter | Granularity | Source | X-axis label format |
|--------|-------------|--------|---------------------|
| `1m` | Daily | `stats.dailyRevenue` (last 30 days) | `DD MMM` e.g. `15 มิ.ย.` |
| `5m` | Monthly | `stats.monthlyRevenue` (last 5 months) | `MMM YY` e.g. `มิ.ย. 69` |
| `1y` | Monthly | `stats.monthlyRevenue` (last 12 months) | `MMM YY` |
| `3y` | Quarterly | `stats.monthlyRevenue` aggregated to quarters | `Q1 69`, `Q2 69` … |

**Quarterly aggregation:** group months by `Math.ceil(monthIndex / 3)` within each year, sum revenue. Label as `Q1`–`Q4` + 2-digit BE year.

Each data point carries hidden `from` and `to` fields (full CE date strings) used for drill-down fetching.

### Filter Pill UI

Replace the static date badge in the chart card header with a pill group:

```
[ 1M ]  [ 5M ]  [ 1Y ]  [ 3Y ]
```

- Active pill: `bg-primary text-white rounded-lg px-3 py-1 text-xs font-semibold`
- Inactive pill: `border border-border-light text-text-secondary rounded-lg px-3 py-1 text-xs font-semibold hover:bg-surface`
- Changing filter clears `selectedPoint` and `drillRecords` (reset drill-down state)

Chart subtitle updates to match: `"30 วันล่าสุด"` / `"5 เดือนล่าสุด"` / `"12 เดือนล่าสุด"` / `"3 ปีล่าสุด"`

### Chart Interactivity

Add `onClick` to the Recharts `<Area>` (via `activeDot` props and chart `onClick`):

```js
onClick={(data) => handlePointClick(data)}
```

`handlePointClick` sets `selectedPoint` to `{ label, from, to }` for the clicked period and triggers a fetch.

The selected dot renders as a larger filled orange circle (`r: 7`) to persist the selection visually after click.

### Drill-down Fetch

```js
async function handlePointClick({ from, to, label }) {
  setSelectedPoint({ label, from, to });
  setDrillRecords(null);
  setDrillLoading(true);
  try {
    const res = await api.get(`/services?from=${from}&to=${to}`);
    setDrillRecords(res.success ? res.data : []);
  } finally {
    setDrillLoading(false);
  }
}
```

### Records Section

The section below the chart adapts based on state:

| State | Title | Content |
|-------|-------|---------|
| Default (no selection) | `รายการล่าสุด` + count badge | `stats.recentRecords` (last 10, existing table) |
| Loading drill-down | `รายการ: [label]` | 3-row skeleton loader |
| Drill-down loaded | `รายการ: [label]` + count badge + **← รีเซ็ต** button | Full records table for that period |
| Drill-down empty | `รายการ: [label]` + **← รีเซ็ต** button | Empty state: calendar icon + `"ไม่มีรายการในช่วงเวลานี้"` |

**Reset button:** orange ghost style (`border border-primary text-primary text-xs px-3 py-1.5 rounded-lg`). On click: `setSelectedPoint(null); setDrillRecords(null)`. No API call — restores from in-memory `stats.recentRecords`.

Table columns remain identical to current: license plate (with service icon), province, date, tire quantity, price, service type badge.

---

## UX Details

- Recharts built-in animation (`isAnimationActive={true}`) provides smooth transition when chart data changes on filter switch.
- No changes to stat cards — they always reflect today's count and this month's revenue/profit/tires.
- Drill-down records sorted by date descending (newest first), no cap on row count.
- `from`/`to` date range semantics per filter:
  - **1M daily point:** `from = to = YYYY-MM-DD`
  - **5M/1Y monthly point:** `from = YYYY-MM-01`, `to = last day of that month`
  - **3Y quarterly point:** `from = first day of quarter`, `to = last day of quarter`

---

## Out of Scope

- Stat cards updating to reflect the selected period
- Export of drill-down results
- Chart type switching (bar vs area)
