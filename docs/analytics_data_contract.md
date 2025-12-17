# Analytics Data Contract

This document defines the contract between the frontend analytics components and the Supabase `hp_*_windows` views.

## Overview

The Teacher Dashboard Analytics queries windowed views that pre-aggregate hall pass data by time window. This design:
- Reduces query complexity and improves performance
- Provides consistent window definitions (day, week, month, quarter, all)
- Avoids timezone issues (views handle CT/America_Chicago conversion)

## Time Windows

The frontend uses these window values:

| UI Label | Window Key | Description |
|----------|------------|-------------|
| Day | `day` | Current calendar day (CT timezone) |
| Week | `week` | Current calendar week (Monday start) |
| Month | `month` | Current calendar month |
| Quarter | `quarter` | Current academic quarter |
| All | `all` | All historical data |

**Important**: The `all` window is distinct from `quarter`. Never map "All" to "quarter" or vice versa.

## Views Queried by Analytics

### Core Analytics Views

| View Name | Required Filters | Key Columns |
|-----------|-----------------|-------------|
| `hp_summary_windows` | `.eq("window", windowKey)` | `passes`, `minutes_out` |
| `hp_return_rate_windows` | `.eq("window", windowKey)` | `pct_returned`, `still_out`, `total` |
| `hp_by_period_windows` | `.eq("window", windowKey)` | `period`, `passes`, `minutes_out` |
| `hp_by_destination_windows` | `.eq("window", windowKey)` | `destination`, `passes`, `minutes_out`, `median_min`, `p90_min` |
| `hp_longest_windows` | `.eq("window", windowKey)` | `student_name`, `period`, `destination`, `duration`, `timeout`, `timein` |
| `hp_behavior_hourly_windows` | `.eq("window", windowKey)` | `hour_24`, `passes` |
| `hp_dayofweek_windows` | `.eq("window", windowKey)` | `dow_short`, `passes` |
| `hp_heatmap_windows` | `.eq("window", windowKey)` | `period`, `day`, `passes` |
| `hp_disruption_windows` | `.eq("window", windowKey)` | `student_name`, `passes`, `minutes_out` |
| `hp_frequent_flyers_bathroom_windows` | `.eq("window", windowKey)` | `student_name`, `passes`, `total_minutes`, `avg_minutes` |
| `hp_streaks_by_period_windows` | (no window filter) | `student_name`, `period`, `cadence`, `start_date`, `end_date`, `streak_len` |

### Grade Analytics Views

| View Name | Required Filters | Key Columns |
|-----------|-----------------|-------------|
| `hp_grade_compare_windows` | `.eq("window", windowKey).eq("scope", scope)` | `student_key`, `term`, `course`, `avg_grade`, `passes`, `total_minutes`, `avg_minutes` |
| `hp_grade_compare_with_grades` | `.eq("window", windowKey).eq("scope", scope)` | Same as above (pre-filtered to rows with grades) |
| `hp_grade_corr_windows` | `.eq("window", windowKey).eq("scope", scope)` | `n`, `corr_grade_vs_passes`, `corr_grade_vs_minutes`, `slope_*`, `r2_*` |
| `hp_grade_outliers_windows` | `.eq("window", windowKey).eq("scope", scope)` | `student_key`, `avg_grade`, `passes`, `total_minutes`, `z_grade`, `z_passes`, `z_minutes`, `risk_score` |

### Non-Windowed Views

| View Name | Purpose |
|-----------|---------|
| `hp_nurse_bathroom_pairs` | Nurse/bathroom trip pairs within 10 minutes |
| `hp_bathroom_trips_current_quarter` | Student drill-down for current quarter trips |

## Filter Columns

### `window` Column
- Type: `text`
- Values: `day`, `week`, `month`, `quarter`, `all`
- Required: Yes, for all windowed views

### `scope` Column (Grade Views Only)
- Type: `text`
- Values: `bathroom`, `all`
- Required: Yes, for grade comparison views

## Frontend Implementation

### Source of Truth: `src/lib/timeWindow.ts`

```typescript
export type TimeWindow = "day" | "week" | "month" | "quarter" | "all";

// Normalize any input to a valid TimeWindow
export function normalizeTimeWindow(input: string): TimeWindow;

// Dev assertion to catch incorrect "all" -> "quarter" mappings
export function assertWindowNotMismapped(inputLabel: string, resolvedWindow: TimeWindow): void;
```

### Repository Layer: `src/lib/analyticsRepository.ts`

Centralized data access for all analytics queries. Each function:
- Normalizes the window input
- Uses explicit column selects (not `select("*")`)
- Handles errors gracefully with typed return values

## View Column Stability

**WARNING**: Do not rename view columns using `CREATE OR REPLACE VIEW`.

PostgreSQL returns error `42P16: cannot change name of view column` when attempting to rename columns in an existing view.

If column names must change:
1. Option A: Use `ALTER VIEW ... RENAME COLUMN old_name TO new_name`
2. Option B: Create a new view with the new schema, migrate all callers, then drop the old view

## Expected Metrics

For a classroom with historical data, the "All" window should show totals like:
- Passes: Aggregate count of all passes
- Total Minutes: Sum of all pass durations
- Avg Minutes: Total Minutes / Passes
- Return Rate: 100% (if all passes are closed)
- Still Out: 0 (if no active passes)

If "All" shows the same numbers as "Quarter", there's a bug in window mapping.

## Debugging

Enable debug logging in `AnalyticsView.tsx`:
```typescript
const DEBUG = true;        // Log fetch triggers
const DEBUG_DIAG = true;   // Log mount/unmount/Supabase calls
```

Check the browser console for:
- `[AnalyticsView] fetch reason: ...` - What triggered the fetch
- `[SUPABASE] AnalyticsView.load() STARTING | timeFrame: ...` - Actual window being queried
- `[analyticsRepository] fetchX error: ...` - Query-level errors

## Manual Verification Checklist

Before deploying analytics changes, verify in the browser:

### Prerequisites
- A classroom with historical pass data (at least a few passes across different time ranges)

### Steps

1. **Navigate to Teacher Dashboard > Analytics**
   - Verify the page loads without errors
   - KPI cards (Passes, Total Minutes, Avg Minutes, Return Rate) should show non-zero values for a classroom with data

2. **Test Time Window Buttons**
   - Click each window button: Day, Week, Month, Quarter, All
   - **Expected**: Numbers should change between windows (unless all data is in one day)
   - **Critical**: "All" should show the largest totals (or equal to Quarter if all data is recent)
   - **Bug indicator**: If "All" shows the same as "Quarter" but there's older data, window mapping is broken

3. **Test Freeze + Initial Load**
   - Enable "Freeze" toggle
   - Refresh the browser page (Cmd+R / F5)
   - **Expected**: Data still loads once on page mount (freeze only blocks auto-refresh)
   - **Bug indicator**: If page shows empty/loading forever, freeze is blocking initial load

4. **Test Freeze + Manual Refresh**
   - With "Freeze" enabled, click the "Refresh" button
   - **Expected**: Data updates immediately (manual refresh bypasses freeze)
   - **Bug indicator**: If nothing happens, force parameter is not being passed

5. **Test Auto-Refresh**
   - Enable "Auto" toggle, disable "Freeze"
   - Wait 60+ seconds
   - **Expected**: Data refreshes automatically (check loading spinner)

6. **Test Empty State**
   - Select "Day" on a classroom with no passes today
   - **Expected**: Amber "No activity in this timeframe" notice appears
   - **Not expected**: Red error card

7. **Test Error State**
   - Temporarily disconnect network, click Refresh
   - **Expected**: Red error card with error message and Retry button

### View-Specific Checks

- **Trips by Period**: Bar chart shows period distribution
- **Destinations**: Table shows destination breakdown with median/p90 stats
- **Frequent Flyers**: Students sorted by pass count
- **Heatmap**: Only shows data for Week/Month/Quarter/All (Day returns empty, which is expected)

## Changelog

- **v2.1 (2024-12)**: Added manual verification checklist
- **v2 (2024-12)**: Fixed "All" window mapping, added repository layer, improved freeze semantics
- **v1 (2024-11)**: Initial windowed views implementation

