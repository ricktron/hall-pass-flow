/**
 * Analytics Repository
 * 
 * Centralized data access layer for analytics queries.
 * All analytics queries should go through this module to ensure:
 * - Consistent use of hp_*_windows views
 * - Correct window filtering
 * - Explicit select lists for stability
 * - Proper error handling
 */

import { supabase } from "@/integrations/supabase/client";
import { TimeWindow, normalizeTimeWindow, assertWindowNotMismapped } from "./timeWindow";

// ============================================================================
// Types - Match the view column contracts
// ============================================================================

export interface SummaryData {
  passes: number;
  minutes_out: number;
}

export interface ReturnRateData {
  pct_returned: number;
  still_out: number;
  total: number;
}

export interface PeriodData {
  period: string;
  passes: number;
  minutes_out: number;
}

export interface DestinationData {
  destination: string;
  passes: number;
  minutes_out: number;
  median_min: number;
  p90_min: number;
}

export interface LongestPassData {
  student_name: string;
  period: string;
  destination: string;
  duration: number;
  timeout: string;
  timein: string | null;
}

export interface HourlyBehaviorData {
  hour_24: number;
  passes: number;
}

export interface DayOfWeekData {
  dow_short: string;
  passes: number;
}

export interface HeatmapData {
  period: string;
  day: string;
  passes: number;
}

export interface DisruptionScoreData {
  student_name: string;
  passes: number;
  minutes_out: number;
}

export interface NursePairData {
  student_name: string;
  first_dest: string;
  second_dest: string;
  minutes_between: number;
  prev_time: string;
  curr_time: string;
}

export interface FrequentFlyerData {
  student_name: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number;
}

export interface StreakData {
  student_name: string;
  period: string;
  cadence: string;
  start_date: string;
  end_date: string;
  streak_len: number;
}

export interface GradeCompareData {
  student_key: string;
  term: string | null;
  course: string | null;
  avg_grade: number | null;
  passes: number | null;
  total_minutes: number | null;
  avg_minutes: number | null;
}

export interface GradeCorrData {
  window: string;
  scope: string;
  term: string | null;
  n: number | null;
  corr_grade_vs_passes: number | null;
  corr_grade_vs_minutes: number | null;
  slope_grade_vs_passes: number | null;
  slope_grade_vs_minutes: number | null;
  r2_grade_vs_passes: number | null;
  r2_grade_vs_minutes: number | null;
}

export interface RiskData {
  window: string;
  scope: string;
  term: string | null;
  student_key: string;
  avg_grade: number | null;
  passes: number | null;
  total_minutes: number | null;
  z_grade: number | null;
  z_passes: number | null;
  z_minutes: number | null;
  risk_score: number | null;
}

export interface DrillData {
  student_key: string;
  timeout: string;
  timein: string | null;
  duration: number | string | null;
  destination: string | null;
  period: string | null;
  classroom: string | null;
}

// ============================================================================
// Query Result Type
// ============================================================================

export interface AnalyticsQueryResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Fetch summary stats (passes, minutes_out) for a time window.
 * View: hp_summary_windows
 */
export async function fetchSummary(
  windowInput: string
): Promise<AnalyticsQueryResult<SummaryData>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_summary_windows")
    .select("passes, minutes_out")
    .eq("window", window)
    .maybeSingle();

  if (error) {
    console.error("[analyticsRepository] fetchSummary error:", error.message);
    return { data: null, error: error.message };
  }

  return {
    data: {
      passes: data?.passes ?? 0,
      minutes_out: Number(data?.minutes_out ?? 0),
    },
    error: null,
  };
}

/**
 * Fetch return rate stats for a time window.
 * View: hp_return_rate_windows
 */
export async function fetchReturnRate(
  windowInput: string
): Promise<AnalyticsQueryResult<ReturnRateData>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_return_rate_windows")
    .select("pct_returned, still_out, total")
    .eq("window", window)
    .maybeSingle();

  if (error) {
    console.error("[analyticsRepository] fetchReturnRate error:", error.message);
    return { data: null, error: error.message };
  }

  return {
    data: {
      pct_returned: data?.pct_returned ?? 0,
      still_out: data?.still_out ?? 0,
      total: data?.total ?? 0,
    },
    error: null,
  };
}

/**
 * Fetch trips by period for a time window.
 * View: hp_by_period_windows
 */
export async function fetchByPeriod(
  windowInput: string
): Promise<AnalyticsQueryResult<PeriodData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_by_period_windows")
    .select("period, passes, minutes_out")
    .eq("window", window)
    .gt("passes", 0)
    .order("passes", { ascending: false });

  if (error) {
    console.error("[analyticsRepository] fetchByPeriod error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch trips by destination for a time window.
 * View: hp_by_destination_windows
 */
export async function fetchByDestination(
  windowInput: string
): Promise<AnalyticsQueryResult<DestinationData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_by_destination_windows")
    .select("destination, passes, minutes_out, median_min, p90_min")
    .eq("window", window)
    .gt("passes", 0)
    .order("passes", { ascending: false });

  if (error) {
    console.error("[analyticsRepository] fetchByDestination error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch longest bathroom trips for a time window.
 * View: hp_longest_windows
 */
export async function fetchLongestTrips(
  windowInput: string,
  limit = 15
): Promise<AnalyticsQueryResult<LongestPassData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_longest_windows")
    .select("student_name, period, destination, duration, timeout, timein")
    .eq("window", window)
    .or("destination.ilike.%bathroom%,destination.ilike.%restroom%")
    .order("duration", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchLongestTrips error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch hourly behavior data for a time window.
 * View: hp_behavior_hourly_windows
 */
export async function fetchHourlyBehavior(
  windowInput: string
): Promise<AnalyticsQueryResult<HourlyBehaviorData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_behavior_hourly_windows")
    .select("hour_24, passes")
    .eq("window", window)
    .order("hour_24", { ascending: true });

  if (error) {
    console.error("[analyticsRepository] fetchHourlyBehavior error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch day of week data for a time window.
 * View: hp_dayofweek_windows
 */
export async function fetchDayOfWeek(
  windowInput: string
): Promise<AnalyticsQueryResult<DayOfWeekData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_dayofweek_windows")
    .select("dow_short, passes")
    .eq("window", window);

  if (error) {
    console.error("[analyticsRepository] fetchDayOfWeek error:", error.message);
    return { data: null, error: error.message };
  }

  // Sort Mon-Sun
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sorted = (data ?? []).sort(
    (a, b) => order.indexOf(a.dow_short) - order.indexOf(b.dow_short)
  );

  return { data: sorted, error: null };
}

/**
 * Fetch heatmap data (period x day) for a time window.
 * View: hp_heatmap_windows
 */
export async function fetchHeatmap(
  windowInput: string
): Promise<AnalyticsQueryResult<HeatmapData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_heatmap_windows")
    .select("period, day, passes")
    .eq("window", window)
    .gt("passes", 0);

  if (error) {
    console.error("[analyticsRepository] fetchHeatmap error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch disruption scores (top students by minutes out) for a time window.
 * View: hp_disruption_windows
 */
export async function fetchDisruption(
  windowInput: string,
  limit = 15
): Promise<AnalyticsQueryResult<DisruptionScoreData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_disruption_windows")
    .select("student_name, passes, minutes_out")
    .eq("window", window)
    .gt("passes", 0)
    .order("minutes_out", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchDisruption error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch nurse-bathroom pairs (not windowed, uses hp_nurse_bathroom_pairs).
 * View: hp_nurse_bathroom_pairs
 */
export async function fetchNursePairs(
  limit = 25
): Promise<AnalyticsQueryResult<NursePairData[]>> {
  const { data, error } = await supabase
    .from("hp_nurse_bathroom_pairs")
    .select("student_name, first_dest, second_dest, minutes_between, prev_time, curr_time")
    .order("minutes_between", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchNursePairs error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch bathroom frequent flyers for a time window.
 * View: hp_frequent_flyers_bathroom_windows
 */
export async function fetchBathroomFlyers(
  windowInput: string,
  limit = 15
): Promise<AnalyticsQueryResult<FrequentFlyerData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_frequent_flyers_bathroom_windows")
    .select("student_name, passes, total_minutes, avg_minutes")
    .eq("window", window)
    .order("passes", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchBathroomFlyers error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch streaks by period.
 * View: hp_streaks_by_period_windows
 */
export async function fetchStreaks(
  limit = 20
): Promise<AnalyticsQueryResult<StreakData[]>> {
  const { data, error } = await supabase
    .from("hp_streaks_by_period_windows")
    .select("student_name, period, cadence, start_date, end_date, streak_len")
    .order("streak_len", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchStreaks error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Fetch grade comparison data for a time window.
 * View: hp_grade_compare_windows or hp_grade_compare_with_grades
 */
export async function fetchGradeComparison(
  windowInput: string,
  scope: "bathroom" | "all",
  term: string | null,
  onlyWithGrades: boolean,
  limit = 1000
): Promise<AnalyticsQueryResult<GradeCompareData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const viewName = onlyWithGrades
    ? "hp_grade_compare_with_grades"
    : "hp_grade_compare_windows";

  let query = supabase
    .from(viewName as "hp_grade_compare_windows")
    .select("student_key, term, course, avg_grade, passes, total_minutes, avg_minutes")
    .eq("window", window)
    .eq("scope", scope);

  if (term) {
    query = query.eq("term", term);
  }

  const { data, error } = await query
    .order("avg_grade", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchGradeComparison error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: (data as unknown as GradeCompareData[]) ?? [], error: null };
}

/**
 * Fetch grade correlation metrics for a time window.
 * View: hp_grade_corr_windows
 */
export async function fetchGradeCorrelation(
  windowInput: string,
  scope: "bathroom" | "all"
): Promise<AnalyticsQueryResult<GradeCorrData | null>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_grade_corr_windows" as "hp_grade_compare_windows")
    .select(
      "window,scope,term,n,corr_grade_vs_passes,corr_grade_vs_minutes,slope_grade_vs_passes,slope_grade_vs_minutes,r2_grade_vs_passes,r2_grade_vs_minutes"
    )
    .eq("window", window)
    .eq("scope", scope)
    .limit(1);

  if (error) {
    console.error("[analyticsRepository] fetchGradeCorrelation error:", error.message);
    return { data: null, error: error.message };
  }

  const row = data && data.length > 0 ? (data[0] as unknown as GradeCorrData) : null;
  return { data: row, error: null };
}

/**
 * Fetch at-risk students (grade outliers) for a time window.
 * View: hp_grade_outliers_windows
 */
export async function fetchRiskStudents(
  windowInput: string,
  scope: "bathroom" | "all",
  limit = 15
): Promise<AnalyticsQueryResult<RiskData[]>> {
  const window = normalizeTimeWindow(windowInput);
  assertWindowNotMismapped(windowInput, window);

  const { data, error } = await supabase
    .from("hp_grade_outliers_windows" as "hp_grade_compare_windows")
    .select(
      "window,scope,term,student_key,avg_grade,passes,total_minutes,z_grade,z_passes,z_minutes,risk_score"
    )
    .eq("window", window)
    .eq("scope", scope)
    .order("risk_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchRiskStudents error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: (data as unknown as RiskData[]) ?? [], error: null };
}

/**
 * Fetch student drill-down data for current quarter bathroom trips.
 * View: hp_bathroom_trips_current_quarter
 */
export async function fetchStudentDrill(
  studentKey: string,
  limit = 200
): Promise<AnalyticsQueryResult<DrillData[]>> {
  const key = studentKey.toLowerCase();

  const { data, error } = await supabase
    .from("hp_bathroom_trips_current_quarter" as "hp_grade_compare_windows")
    .select("timeout,timein,duration,destination,period,classroom,student_key")
    .eq("student_key", key)
    .order("timeout", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyticsRepository] fetchStudentDrill error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: (data as unknown as DrillData[]) ?? [], error: null };
}

// ============================================================================
// Bulk Fetch for Initial Load
// ============================================================================

export interface AnalyticsBulkResult {
  summary: SummaryData | null;
  returnRate: ReturnRateData | null;
  byPeriod: PeriodData[];
  byDestination: DestinationData[];
  longest: LongestPassData[];
  hourly: HourlyBehaviorData[];
  dow: DayOfWeekData[];
  heatmap: HeatmapData[];
  disruption: DisruptionScoreData[];
  nursePairs: NursePairData[];
  bathroomFlyers: FrequentFlyerData[];
  streaks: StreakData[];
  errors: string[];
}

/**
 * Fetch all core analytics data in parallel.
 * Returns partial results even if some queries fail.
 */
export async function fetchAllCoreAnalytics(
  windowInput: string
): Promise<AnalyticsBulkResult> {
  const errors: string[] = [];

  const [
    summaryRes,
    returnRateRes,
    byPeriodRes,
    byDestRes,
    longestRes,
    hourlyRes,
    dowRes,
    heatmapRes,
    disruptionRes,
    nursePairsRes,
    flyersRes,
    streaksRes,
  ] = await Promise.all([
    fetchSummary(windowInput),
    fetchReturnRate(windowInput),
    fetchByPeriod(windowInput),
    fetchByDestination(windowInput),
    fetchLongestTrips(windowInput),
    fetchHourlyBehavior(windowInput),
    fetchDayOfWeek(windowInput),
    fetchHeatmap(windowInput),
    fetchDisruption(windowInput),
    fetchNursePairs(),
    fetchBathroomFlyers(windowInput),
    fetchStreaks(),
  ]);

  // Collect errors
  if (summaryRes.error) errors.push(`Summary: ${summaryRes.error}`);
  if (returnRateRes.error) errors.push(`ReturnRate: ${returnRateRes.error}`);
  if (byPeriodRes.error) errors.push(`ByPeriod: ${byPeriodRes.error}`);
  if (byDestRes.error) errors.push(`ByDestination: ${byDestRes.error}`);
  if (longestRes.error) errors.push(`Longest: ${longestRes.error}`);
  if (hourlyRes.error) errors.push(`Hourly: ${hourlyRes.error}`);
  if (dowRes.error) errors.push(`DayOfWeek: ${dowRes.error}`);
  if (heatmapRes.error) errors.push(`Heatmap: ${heatmapRes.error}`);
  if (disruptionRes.error) errors.push(`Disruption: ${disruptionRes.error}`);
  if (nursePairsRes.error) errors.push(`NursePairs: ${nursePairsRes.error}`);
  if (flyersRes.error) errors.push(`BathroomFlyers: ${flyersRes.error}`);
  if (streaksRes.error) errors.push(`Streaks: ${streaksRes.error}`);

  return {
    summary: summaryRes.data,
    returnRate: returnRateRes.data,
    byPeriod: byPeriodRes.data ?? [],
    byDestination: byDestRes.data ?? [],
    longest: longestRes.data ?? [],
    hourly: hourlyRes.data ?? [],
    dow: dowRes.data ?? [],
    heatmap: heatmapRes.data ?? [],
    disruption: disruptionRes.data ?? [],
    nursePairs: nursePairsRes.data ?? [],
    bathroomFlyers: flyersRes.data ?? [],
    streaks: streaksRes.data ?? [],
    errors,
  };
}

export interface AnalyticsGradeResult {
  gradeRows: GradeCompareData[];
  corr: GradeCorrData | null;
  risks: RiskData[];
  errors: string[];
}

/**
 * Fetch grade-related analytics data in parallel.
 */
export async function fetchGradeAnalytics(
  windowInput: string,
  scope: "bathroom" | "all",
  term: string | null,
  onlyWithGrades: boolean
): Promise<AnalyticsGradeResult> {
  const errors: string[] = [];

  const [gradeRes, corrRes, riskRes] = await Promise.all([
    fetchGradeComparison(windowInput, scope, term, onlyWithGrades),
    fetchGradeCorrelation(windowInput, scope),
    fetchRiskStudents(windowInput, scope),
  ]);

  if (gradeRes.error) errors.push(`GradeComparison: ${gradeRes.error}`);
  if (corrRes.error) errors.push(`GradeCorrelation: ${corrRes.error}`);
  if (riskRes.error) errors.push(`RiskStudents: ${riskRes.error}`);

  return {
    gradeRows: gradeRes.data ?? [],
    corr: corrRes.data,
    risks: riskRes.data ?? [],
    errors,
  };
}

