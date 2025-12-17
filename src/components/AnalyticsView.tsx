import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, BarChart4, BarChartBig, Clock, Users, TrendingUp, RefreshCw, Stethoscope, Snowflake, AlertTriangle, Eye, Download, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type TimeFrame = "Day" | "Week" | "Month" | "Quarter" | "All";

interface SummaryData { passes: number; minutes_out?: number }
interface ReturnRateData { return_rate_pct: number; still_out: number; total: number }
interface PeriodData { period: string; passes: number; minutes_out: number }
interface DestinationData {
  destination: string; passes: number; minutes_out: number; median_min: number; p90_min: number
}
interface LongestPassData {
  student_name: string; period: string; destination: string; duration: number; timeout: string; timein: string | null
}
interface HourlyBehaviorData { hour_24: number; passes: number }
interface DayOfWeekData { dow_short: string; passes: number }
interface HeatmapData { period: string; day: string; passes: number }
interface DisruptionScoreData { student_name: string; passes: number; minutes_out: number }
interface NursePairData {
  student_name: string; first_dest: string; second_dest: string; minutes_between: number; prev_time: string; curr_time: string
}
interface FrequentFlyerRow {
  student_name: string; passes: number; total_minutes: number; avg_minutes: number
}
interface StreakRow {
  student_name: string; period: string; cadence: string; start_date: string; end_date: string; streak_len: number
}
interface GradeCompareRow {
  student_key: string;
  term: string | null;
  course: string | null;
  avg_grade: number | null;
  passes: number | null;
  total_minutes: number | null;
  avg_minutes: number | null;
}
interface GradeCorrRow {
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
interface RiskRow {
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
interface DrillRow {
  student_key: string;
  timeout: string;
  timein: string | null;
  duration: number | string | null;
  destination: string | null;
  period: string | null;
  classroom: string | null;
}

const AUTO_KEY = "hp_analytics_auto";
const TF_KEY = "hp_analytics_tf";
const FREEZE_KEY = "hp_analytics_freeze";
const BLUE = "hsl(217 91% 60%)"; // #3b82f6

// Dev-only debug flag: set to true to log fetch triggers
const DEBUG = false;

// Diagnostic flag for investigating reload-while-frozen issue
// Set to true ONLY for debugging mount/unmount/render behavior
const DEBUG_DIAG = false;

// Diagnostic render counter (persists across re-renders, not remounts)
let diagRenderCount = 0;

// Helper: strictly parse boolean from localStorage (never use Boolean() which treats "false" as true)
const parseBoolLS = (key: string, defaultVal: boolean): boolean => {
  if (typeof window === "undefined") return defaultVal;
  const v = localStorage.getItem(key);
  return v === "true" ? true : v === "false" ? false : defaultVal;
};

const AnalyticsView = () => {
  // Diagnostic: track mount/unmount/render
  const diagRenderRef = React.useRef(0);
  React.useEffect(() => {
    if (!DEBUG_DIAG) return;
    diagRenderCount++;
    diagRenderRef.current++;
    console.log('[MOUNT] AnalyticsView | global render count:', diagRenderCount, '| instance render:', diagRenderRef.current);
    return () => console.log('[UNMOUNT] AnalyticsView | global render count:', diagRenderCount, '| instance render:', diagRenderRef.current);
  }, []);

  // Diagnostic: log every render with key state
  if (DEBUG_DIAG) {
    diagRenderRef.current++;
    // Note: This logs on every render, not just mount
  }

  // Persisted timeframe
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TF_KEY) as TimeFrame | null;
      if (saved && ["Day", "Week", "Month", "Quarter", "All"].includes(saved)) return saved;
    }
    return "Week";
  });

  // Persisted freeze toggle - blocks all auto reloads (default OFF)
  const [freezeData, setFreezeData] = useState<boolean>(() => parseBoolLS(FREEZE_KEY, false));

  // Persisted auto-refresh toggle - OFF by default
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => parseBoolLS(AUTO_KEY, false));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState("init");
  const intervalRef = useRef<number | null>(null);

  // Prevent overlapping fetches
  const inFlightRef = useRef(false);

  // Data state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [returnRate, setReturnRate] = useState<ReturnRateData | null>(null);
  const [byPeriod, setByPeriod] = useState<PeriodData[]>([]);
  const [byDestination, setByDestination] = useState<DestinationData[]>([]);
  const [longest, setLongest] = useState<LongestPassData[]>([]);
  const [hourly, setHourly] = useState<HourlyBehaviorData[]>([]);
  const [dow, setDow] = useState<DayOfWeekData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [disruption, setDisruption] = useState<DisruptionScoreData[]>([]);
  const [nursePairs, setNursePairs] = useState<NursePairData[]>([]);
  const [bathroomFlyers, setBathroomFlyers] = useState<FrequentFlyerRow[]>([]);
  const [streaks, setStreaks] = useState<StreakRow[]>([]);
  const [gradeRows, setGradeRows] = useState<GradeCompareRow[]>([]);
  const [gradeTerm, setGradeTerm] = useState<string | null>(null);
  const [gradeScope, setGradeScope] = useState<'bathroom' | 'all'>('bathroom');
  const [corr, setCorr] = useState<GradeCorrRow | null>(null);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  // Filter to show only rows with grades
  const [onlyWithGrades, setOnlyWithGrades] = useState<boolean>(false);

  // Refs to access latest toggle/state values inside callbacks (prevents stale closures)
  // NOTE: Refs must be declared AFTER the state they reference
  const autoRefreshRef = useRef(autoRefresh);
  const freezeDataRef = useRef(freezeData);
  const timeFrameRef = useRef(timeFrame);
  const gradeScopeRef = useRef(gradeScope);
  const gradeTermRef = useRef(gradeTerm);
  const onlyWithGradesRef = useRef(onlyWithGrades);

  useEffect(() => { autoRefreshRef.current = autoRefresh; }, [autoRefresh]);
  useEffect(() => { freezeDataRef.current = freezeData; }, [freezeData]);
  useEffect(() => { timeFrameRef.current = timeFrame; }, [timeFrame]);
  useEffect(() => { gradeScopeRef.current = gradeScope; }, [gradeScope]);
  useEffect(() => { gradeTermRef.current = gradeTerm; }, [gradeTerm]);
  useEffect(() => { onlyWithGradesRef.current = onlyWithGrades; }, [onlyWithGrades]);

  // Drill-down modal state
  const [drillStudent, setDrillStudent] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<DrillRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [showDrill, setShowDrill] = useState(false);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  // Persist localStorage
  useEffect(() => { localStorage.setItem(TF_KEY, timeFrame); }, [timeFrame]);
  useEffect(() => { localStorage.setItem(FREEZE_KEY, String(freezeData)); }, [freezeData]);
  useEffect(() => { localStorage.setItem(AUTO_KEY, String(autoRefresh)); }, [autoRefresh]);

  // Single interval control effect — ONLY ONE interval ever exists.
  // The callback checks ALL conditions before firing, using refs for latest values.
  useEffect(() => {
    // Always clear any existing timer first
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Create one interval that checks conditions every tick (60s)
    intervalRef.current = window.setInterval(() => {
      // Check ALL conditions before triggering a reload
      if (
        autoRefreshRef.current === true &&
        freezeDataRef.current === false &&
        document.hidden === false &&
        inFlightRef.current === false
      ) {
        if (DEBUG) console.log('[AnalyticsView] fetch reason: interval | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
        setNonce(String(Date.now()));
      }
    }, 60000);

    // Cleanup always runs
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty deps: one interval for component lifetime

  // Open student drill-down modal
  const openStudentDrill = async (studentKey: string) => {
    const key = studentKey.toLowerCase();
    setDrillStudent(key);
    setShowDrill(true);
    setDrillLoading(true);
    setDrillRows([]);

    try {
      const { data, error: drillError } = await supabase
        .from('hp_bathroom_trips_current_quarter' as any)
        .select('timeout,timein,duration,destination,period,classroom,student_key')
        .eq('student_key', key)
        .order('timeout', { ascending: false })
        .limit(200);

      if (drillError) {
        setError(`Failed to load trips: ${drillError.message}`);
      } else {
        setDrillRows((data as unknown as DrillRow[]) ?? []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load trips");
    } finally {
      setDrillLoading(false);
    }
  };

  // Export CSV
  const exportDrillCSV = () => {
    if (drillRows.length === 0) return;
    const headers = ['Date', 'Time Out', 'Time In', 'Duration (min)', 'Destination', 'Period', 'Classroom'];
    const rows = drillRows.map(r => [
      r.timeout ? new Date(r.timeout).toLocaleDateString() : '',
      r.timeout ? new Date(r.timeout).toLocaleTimeString() : '',
      r.timein ? new Date(r.timein).toLocaleTimeString() : '',
      r.duration ?? '',
      r.destination ?? '',
      r.period ?? '',
      r.classroom ?? ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bathroom_trips_${drillStudent}_current_quarter.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load function reads from refs to avoid stale closures
  // This function is stable (no deps) - always reads latest values via refs
  const load = useCallback(async () => {
    // Hard guard: do not refresh while frozen (read from ref for latest value)
    if (freezeDataRef.current) {
      if (DEBUG_DIAG) console.log('[DIAG] AnalyticsView.load() BLOCKED by freeze | freezeRef:', freezeDataRef.current);
      return;
    }
    // Prevent overlapping fetches
    if (inFlightRef.current) {
      if (DEBUG_DIAG) console.log('[DIAG] AnalyticsView.load() BLOCKED by inFlight');
      return;
    }
    inFlightRef.current = true;

    // Read current values from refs at call time
    const currentTfKey = timeFrameRef.current.toLowerCase();
    const currentGradeScope = gradeScopeRef.current;
    const currentGradeTerm = gradeTermRef.current;
    const currentOnlyWithGrades = onlyWithGradesRef.current;

    // Diagnostic: log Supabase call initiation
    if (DEBUG_DIAG) {
      console.log('[SUPABASE] AnalyticsView.load() STARTING | timeFrame:', currentTfKey, '| scope:', currentGradeScope, '| term:', currentGradeTerm, '| ts:', new Date().toISOString());
    }

    setLoading(true);
    setError(null);

    try {
      const [
        s, rr, p, d, l, h, w, hm, dz, np, bf
      ] = await Promise.all([
        supabase.from("hp_summary_windows").select("passes, minutes_out").eq("window", currentTfKey).maybeSingle(),
        supabase.from("hp_return_rate_windows").select("pct_returned, still_out, total").eq("window", currentTfKey).maybeSingle(),
        supabase.from("hp_by_period_windows").select("period, passes, minutes_out").eq("window", currentTfKey).gt("passes", 0).order("passes", { ascending: false }),
        supabase.from("hp_by_destination_windows").select("destination, passes, minutes_out, median_min, p90_min").eq("window", currentTfKey).gt("passes", 0).order("passes", { ascending: false }),
        supabase.from("hp_longest_windows").select("student_name, period, destination, duration, timeout, timein").eq("window", currentTfKey).or("destination.ilike.%bathroom%,destination.ilike.%restroom%").order("duration", { ascending: false }).limit(15),
        supabase.from("hp_behavior_hourly_windows").select("hour_24, passes").eq("window", currentTfKey).order("hour_24", { ascending: true }),
        supabase.from("hp_dayofweek_windows").select("dow_short, passes").eq("window", currentTfKey),
        supabase.from("hp_heatmap_windows").select("period, day, passes").eq("window", currentTfKey).gt("passes", 0),
        supabase.from("hp_disruption_windows").select("student_name, passes, minutes_out").eq("window", currentTfKey).gt("passes", 0).order("minutes_out", { ascending: false }).limit(15),
        supabase.from("hp_nurse_bathroom_pairs").select("student_name, first_dest, second_dest, minutes_between, prev_time, curr_time").order("minutes_between", { ascending: true }).limit(25),
        supabase.from("hp_frequent_flyers_bathroom_windows").select("student_name, passes, total_minutes, avg_minutes").eq("window", currentTfKey).order("passes", { ascending: false }).limit(15)
      ]);

      if (s.error) throw s.error;
      if (rr.error) throw rr.error;

      setSummary({ passes: s.data?.passes ?? 0, minutes_out: Number(s.data?.minutes_out ?? 0) });
      setReturnRate({
        return_rate_pct: Math.round(((rr.data?.pct_returned ?? 0) * 1000)) / 10,
        still_out: rr.data?.still_out ?? 0,
        total: rr.data?.total ?? 0
      });
      setByPeriod(p.data ?? []);
      setByDestination(d.data ?? []);
      setLongest(l.data ?? []);
      setHourly(h.data ?? []);
      // order Mon..Sun
      const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      setDow((w.data ?? []).sort((a, b) => order.indexOf(a.dow_short) - order.indexOf(b.dow_short)));
      setHeatmap(hm.data ?? []);
      setDisruption(dz.data ?? []);
      setNursePairs(np.data ?? []);
      setBathroomFlyers(bf.data ?? []);

      // Fetch streaks by period
      const { data: st, error: stErr } = await supabase
        .from('hp_streaks_by_period_windows')
        .select('student_name, period, cadence, start_date, end_date, streak_len')
        .order('streak_len', { ascending: false })
        .limit(20);
      if (stErr) throw stErr;
      setStreaks(st ?? []);

      // Fetch grades vs bathroom passes data
      // When "Has grades only" is ON, use hp_grade_compare_with_grades view
      // When OFF, use hp_grade_compare_windows view
      const gradeViewName = currentOnlyWithGrades
        ? 'hp_grade_compare_with_grades'
        : 'hp_grade_compare_windows';
      let gradeQuery = supabase
        .from(gradeViewName as any)
        .select('student_key, term, course, avg_grade, passes, total_minutes, avg_minutes')
        .eq('window', currentTfKey)
        .eq('scope', currentGradeScope);
      if (currentGradeTerm) gradeQuery = gradeQuery.eq('term', currentGradeTerm);
      const { data: grows, error: gerr } = await gradeQuery
        .order('avg_grade', { ascending: true })
        .limit(1000);
      if (gerr) throw gerr;
      setGradeRows((grows as unknown as GradeCompareRow[]) ?? []);

      // Fetch grade correlation metrics
      const { data: corrRows, error: corrErr } = await supabase
        .from('hp_grade_corr_windows' as any)
        .select('window,scope,term,n,corr_grade_vs_passes,corr_grade_vs_minutes,slope_grade_vs_passes,slope_grade_vs_minutes,r2_grade_vs_passes,r2_grade_vs_minutes')
        .eq('window', currentTfKey)
        .eq('scope', currentGradeScope)
        .limit(1);
      if (corrErr) throw corrErr;
      setCorr((corrRows && corrRows.length > 0) ? (corrRows[0] as unknown as GradeCorrRow) : null);

      // Fetch at-risk students (grade outliers)
      const { data: riskRows, error: riskErr } = await supabase
        .from('hp_grade_outliers_windows' as any)
        .select('window,scope,term,student_key,avg_grade,passes,total_minutes,z_grade,z_passes,z_minutes,risk_score')
        .eq('window', currentTfKey)
        .eq('scope', currentGradeScope)
        .order('risk_score', { ascending: false })
        .limit(15);
      if (riskErr) throw riskErr;
      setRisks((riskRows as unknown as RiskRow[]) ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load analytics data");
      if (DEBUG_DIAG) console.log('[SUPABASE] AnalyticsView.load() ERROR:', e.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
      if (DEBUG_DIAG) console.log('[SUPABASE] AnalyticsView.load() COMPLETE | ts:', new Date().toISOString());
    }
  }, []); // Empty deps: load is stable, reads current values from refs

  // Main load effect - triggers on nonce (interval) or timeFrame change
  // Uses refs for freeze check to avoid stale closures and unnecessary re-runs
  useEffect(() => {
    if (freezeDataRef.current) {
      if (DEBUG) console.log('[AnalyticsView] fetch BLOCKED (frozen) | trigger: nonce/timeFrame | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
      return;
    }
    if (DEBUG) console.log('[AnalyticsView] fetch reason:', nonce === 'init' ? 'mount' : 'nonce/timeFrame-change', '| timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
    void load();
  }, [nonce, timeFrame, load]);

  // Effect for user-initiated parameter changes (gradeScope, gradeTerm, onlyWithGrades)
  // Separate from main load effect to allow independent control
  useEffect(() => {
    if (freezeDataRef.current) {
      if (DEBUG) console.log('[AnalyticsView] fetch BLOCKED (frozen) | trigger: param-change | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
      return;
    }
    if (DEBUG) console.log('[AnalyticsView] fetch reason: param-change | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeScope, gradeTerm, onlyWithGrades]);

  // Manual refresh respects freeze - no refresh when frozen
  const manualRefresh = () => {
    if (freezeDataRef.current) {
      if (DEBUG) console.log('[AnalyticsView] fetch BLOCKED (frozen) | trigger: manual | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
      return;
    }
    if (DEBUG) console.log('[AnalyticsView] fetch reason: manual | timeFrame:', timeFrameRef.current, '| freeze:', freezeDataRef.current, '| auto:', autoRefreshRef.current);
    void load();
  };

  const fmtHour = (h: number) =>
    h === 0 ? "12a" :
      h < 12 ? `${h}a` :
        h === 12 ? "12p" :
          `${h - 12}p`;

  const avgMinutes =
    summary && summary.passes > 0
      ? Math.round(((summary.minutes_out ?? 0) / summary.passes) * 10) / 10
      : 0;

  const heatColor = (passes: number, max: number) => {
    if (passes === 0) return "hsl(214 100% 97%)";
    const stops = [
      "hsl(214 95% 93%)", "hsl(214 95% 87%)", "hsl(213 94% 78%)",
      "hsl(213 94% 68%)", "hsl(217 91% 60%)", "hsl(221 83% 53%)"
    ];
    const idx = Math.min(Math.floor((passes / Math.max(max, 1)) * stops.length), stops.length - 1);
    return stops[idx];
  };
  const maxHeat = heatmap.reduce((m, r) => Math.max(m, r.passes || 0), 0);

  // Diagnostic: render counter log (only when DEBUG_DIAG is true)
  if (DEBUG_DIAG) {
    console.log('[RENDER] AnalyticsView', diagRenderRef.current, { freeze: freezeData, auto: autoRefresh, timeFrame, loading, nonce });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="text-muted-foreground">Windowed stats for passes and minutes</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={manualRefresh} className="gap-2" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>

            <div className="flex items-center gap-2">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-sm">Auto</Label>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch id="freeze" checked={freezeData} onCheckedChange={setFreezeData} />
                    <Label htmlFor="freeze" className="text-sm flex items-center gap-1">
                      <Snowflake className="h-3 w-3" /> Freeze
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>When ON, nothing reloads automatically. Use Refresh to fetch.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex rounded-lg bg-muted p-1">
            {timeFrameOptions.map(tf => (
              <Button
                key={tf}
                variant={timeFrame === tf ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFrame(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {freezeData && (
        <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Snowflake className="h-4 w-4" />
              Data is frozen. Click Refresh to update or turn off Freeze.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Passes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.passes ?? 0}</div></CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Minutes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(summary?.minutes_out ?? 0).toFixed(1)} min</div></CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Minutes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgMinutes.toFixed(1)} min</div></CardContent></Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Return Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returnRate ? `${returnRate.return_rate_pct}%` : "0%"}</div>
            {returnRate && returnRate.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Still out: {returnRate.still_out} / {returnRate.total}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trips by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" />Trips by Period</CardTitle>
          <p className="text-sm text-muted-foreground">Only periods with activity are listed.</p>
        </CardHeader>
        <CardContent>
          {byPeriod.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No period data available</div>
          ) : (
            <>
              <ChartContainer config={{ passes: { label: "Passes", color: BLUE } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPeriod}>
                    <XAxis dataKey="period" /><YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="passes" fill={BLUE} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Passes</TableHead>
                      <TableHead>Total Minutes</TableHead>
                      <TableHead>Avg Minutes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byPeriod.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.period}</TableCell>
                        <TableCell>{r.passes}</TableCell>
                        <TableCell>{Number(r.minutes_out).toFixed(1)} min</TableCell>
                        <TableCell>{(r.passes ? (Number(r.minutes_out) / r.passes) : 0).toFixed(1)} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Destinations + Frequent Flyers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" />Destinations</CardTitle></CardHeader>
          <CardContent>
            {byDestination.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No destination data available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Passes</TableHead>
                    <TableHead>Total Minutes</TableHead>
                    <TableHead>Avg Minutes</TableHead>
                    <TableHead>Median</TableHead>
                    <TableHead>P90</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDestination.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.destination}</TableCell>
                      <TableCell>{r.passes}</TableCell>
                      <TableCell>{Number(r.minutes_out).toFixed(1)} min</TableCell>
                      <TableCell>{(r.passes ? (Number(r.minutes_out) / r.passes) : 0).toFixed(1)} min</TableCell>
                      <TableCell>{Number(r.median_min).toFixed(1)} min</TableCell>
                      <TableCell>{Number(r.p90_min).toFixed(1)} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" />Frequent Flyers — Bathroom</CardTitle>
            <CardDescription>Students with most bathroom trips</CardDescription>
          </CardHeader>
          <CardContent>
            {bathroomFlyers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No bathroom passes in this window</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Passes</TableHead>
                    <TableHead>Total Minutes</TableHead>
                    <TableHead>Avg Minutes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bathroomFlyers.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell>{r.passes}</TableCell>
                      <TableCell>{Number(r.total_minutes).toFixed(1)} min</TableCell>
                      <TableCell>{Number(r.avg_minutes).toFixed(1)} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Longest Bathroom Trips */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" />Longest Bathroom Trips</CardTitle></CardHeader>
        <CardContent>
          {longest.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No bathroom passes in this window.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Duration (min)</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {longest.slice(0, 15).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{Number(r.duration).toFixed(1)} min</TableCell>
                    <TableCell className="text-sm">{new Date(r.timeout).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.timein ? new Date(r.timein).toLocaleString() : "Still out"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hourly + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" />Behavior by Hour</CardTitle>
            <CardDescription>Pass distribution by hour (0–23)</CardDescription>
          </CardHeader>
          <CardContent>
            {hourly.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hourly data available</div>
            ) : (
              <ChartContainer config={{ passes: { label: "Passes", color: BLUE } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly}>
                    <XAxis dataKey="hour_24" tickFormatter={(v) => fmtHour(v as number)} /><YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="passes" fill={BLUE} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" />Passes by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            {dow.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No day-of-week data available</div>
            ) : (
              <ChartContainer config={{ passes: { label: "Passes", color: BLUE } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dow}>
                    <XAxis dataKey="dow_short" /><YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="passes" fill={BLUE} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disruption Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-500" />Disruption Score</CardTitle>
          <CardDescription>Top students by total minutes out</CardDescription>
        </CardHeader>
        <CardContent>
          {disruption.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No disruption data available</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Passes</TableHead>
                  <TableHead>Total Minutes</TableHead>
                  <TableHead>Avg Minutes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disruption.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>{r.passes}</TableCell>
                    <TableCell>{Number(r.minutes_out).toFixed(1)} min</TableCell>
                    <TableCell>{(r.passes ? (Number(r.minutes_out) / r.passes) : 0).toFixed(1)} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Heatmap + Nurse pairs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-blue-600" />Weekly Hot Spots</CardTitle>
            <CardDescription>Pass frequency by period and day</CardDescription>
          </CardHeader>
          <CardContent>
            {heatmap.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No heatmap data available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Period</TableHead>
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => (<TableHead key={d} className="text-center">{d}</TableHead>))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["A", "B", "C", "D", "E", "F", "G", "H"].map(period => (
                    <TableRow key={period}>
                      <TableCell className="font-medium">{period}</TableCell>
                      {["Mon", "Tue", "Wed", "Thu", "Fri"].map(day => {
                        const cell = heatmap.find(x => x.period === period && x.day === day);
                        const p = cell?.passes ?? 0;
                        return (
                          <TableCell key={day} className="text-center font-semibold" style={{ backgroundColor: heatColor(p, maxHeat) }}>
                            {p}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-pink-500" />Nurse Detour Detector</CardTitle>
            <CardDescription>Nurse ↔ Bathroom within 10 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            {nursePairs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No nurse detour pairs detected</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>First</TableHead>
                    <TableHead>Second</TableHead>
                    <TableHead>Gap (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nursePairs.slice(0, 15).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell>{r.first_dest}</TableCell>
                      <TableCell>{r.second_dest}</TableCell>
                      <TableCell className="font-bold text-pink-600">{Number(r.minutes_between).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Streaks by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Streaks by Period (≥3)
          </CardTitle>
          <CardDescription>Consecutive class meetings with at least one pass (period cadence aware)</CardDescription>
        </CardHeader>
        <CardContent>
          {streaks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No streaks detected yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Length</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streaks.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.cadence}</TableCell>
                    <TableCell>{new Date(r.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(r.end_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold">{r.streak_len}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grades vs Bathroom Passes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-blue-600" />
            Grades vs Bathroom Passes
          </CardTitle>
          <CardDescription>Correlate grade averages with pass frequency/duration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Label>Scope</Label>
            <Select value={gradeScope} onValueChange={(v) => setGradeScope(v as 'bathroom' | 'all')}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bathroom">Bathroom</SelectItem>
                <SelectItem value="all">All passes</SelectItem>
              </SelectContent>
            </Select>

            <Label className="ml-4">Term</Label>
            <Input
              placeholder="e.g., Q2 (leave blank for all)"
              value={gradeTerm ?? ''}
              onChange={(e) => setGradeTerm(e.target.value || null)}
              className="w-[200px]"
            />

            <Button variant="outline" onClick={manualRefresh}>
              Refresh
            </Button>

            {/* Filter: only show rows with grades */}
            <div className="flex items-center gap-2 ml-4">
              <Label htmlFor="hp-only-with-grades" className="text-sm">Has grades only</Label>
              <Switch id="hp-only-with-grades" checked={onlyWithGrades} onCheckedChange={setOnlyWithGrades} />
            </div>
          </div>

          {gradeRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {gradeTerm ? `No rows for term ${gradeTerm}.` : 'No grades loaded. Import or map grades_normalized.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Avg Grade</TableHead>
                  <TableHead className="text-right">Passes</TableHead>
                  <TableHead className="text-right">Total Minutes</TableHead>
                  <TableHead className="text-right">Avg Minutes</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.student_key}</TableCell>
                    <TableCell>{r.term ?? '—'}</TableCell>
                    <TableCell>{r.course ?? '—'}</TableCell>
                    <TableCell className="text-right">{r.avg_grade ?? '—'}</TableCell>
                    <TableCell className="text-right">{r.passes ?? 0}</TableCell>
                    <TableCell className="text-right">{r.total_minutes ?? 0}</TableCell>
                    <TableCell className="text-right">{r.avg_minutes ?? 0}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStudentDrill(r.student_key)}
                        className="gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" /> View trips
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grade Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartBig className="h-5 w-5 text-blue-600" />
            Grade Signals
          </CardTitle>
          <CardDescription>Pearson r, slopes, and R² (current timeframe/scope/term)</CardDescription>
        </CardHeader>
        <CardContent>
          {!corr ? (
            <div className="text-center py-8 text-muted-foreground">No grade metrics for this selection.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><div className="text-sm text-muted-foreground">n</div><div className="text-xl font-semibold">{corr.n ?? '—'}</div></div>
              <div><div className="text-sm text-muted-foreground">r (grade vs passes)</div><div className="text-xl font-semibold">{corr.corr_grade_vs_passes?.toFixed(3) ?? '—'}</div></div>
              <div><div className="text-sm text-muted-foreground">r (grade vs minutes)</div><div className="text-xl font-semibold">{corr.corr_grade_vs_minutes?.toFixed(3) ?? '—'}</div></div>
              <div><div className="text-sm text-muted-foreground">slope grade~passes</div><div className="text-xl font-semibold">{corr.slope_grade_vs_passes?.toFixed(3) ?? '—'}</div></div>
              <div><div className="text-sm text-muted-foreground">R² grade~passes</div><div className="text-xl font-semibold">{corr.r2_grade_vs_passes?.toFixed(3) ?? '—'}</div></div>
              <div><div className="text-sm text-muted-foreground">R² grade~minutes</div><div className="text-xl font-semibold">{corr.r2_grade_vs_minutes?.toFixed(3) ?? '—'}</div></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* At-Risk (grades vs bathroom) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            At-Risk (grades vs bathroom)
          </CardTitle>
          <CardDescription>Low grades + high bathroom use (z-score composite)</CardDescription>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No outliers for this selection.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Avg Grade</TableHead>
                  <TableHead className="text-right">Passes</TableHead>
                  <TableHead className="text-right">Total Min</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.student_key}</TableCell>
                    <TableCell className="text-right">{r.avg_grade ?? '—'}</TableCell>
                    <TableCell className="text-right">{r.passes ?? 0}</TableCell>
                    <TableCell className="text-right">{r.total_minutes ?? 0}</TableCell>
                    <TableCell className="text-right">{r.risk_score?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStudentDrill(r.student_key)}
                        className="gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" /> View trips
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Student Drill-Down Modal */}
      <Dialog open={showDrill} onOpenChange={setShowDrill}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Bathroom Trips — Current Quarter</DialogTitle>
                <DialogDescription className="text-sm">
                  America/Chicago window. Only bathroom/restroom/rr destinations.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportDrillCSV}
                  disabled={drillRows.length === 0}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDrill(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {drillStudent && (
              <p className="text-sm text-muted-foreground mt-2">
                Student: <span className="font-medium">{drillStudent}</span>
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4">
            {drillLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading trips...</div>
            ) : drillRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No bathroom trips this quarter for this student.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Duration (min)</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Classroom</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.timeout ? new Date(r.timeout).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{r.timeout ? new Date(r.timeout).toLocaleTimeString() : '—'}</TableCell>
                      <TableCell>{r.timein ? new Date(r.timein).toLocaleTimeString() : '—'}</TableCell>
                      <TableCell>{r.duration != null ? Number(r.duration).toFixed(1) : '—'}</TableCell>
                      <TableCell>{r.destination ?? '—'}</TableCell>
                      <TableCell>{r.period ?? '—'}</TableCell>
                      <TableCell>{r.classroom ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsView;
