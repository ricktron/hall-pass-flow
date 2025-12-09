import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, Clock, Users, TrendingUp, Zap, RefreshCw, UserCheck, AlertTriangle, Utensils, Flame, Target, Timer, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

type TimeFrame = "Day" | "Week" | "Month" | "Quarter" | "All";

interface SummaryData {
  passes: number;
}

interface ReturnRateData {
  return_rate_pct: number;
  still_out: number;
  total: number;
}

interface TotalMinutesData {
  total_minutes: number;
}

interface AvgData {
  avg_minutes: number | null;
}

interface PeriodData {
  period: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number | null;
}

interface DestinationData {
  destination: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number | null;
  median_min: number;
  p90_min: number;
}

interface FrequentFlyerData {
  student_name: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number;
}

interface LongestPassData {
  student_name: string;
  period: string;
  destination: string;
  minutes: number;
  timeout: string;
  timein: string;
}

interface HourlyBehaviorData {
  hour: number;
  passes: number;
}

interface DayOfWeekData {
  day: string;
  passes: number;
}

interface HeatmapData {
  period: string;
  day: string;
  passes: number;
}

interface DisruptionScoreData {
  student_name: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number;
}

interface NursePairData {
  student_name: string;
  first_dest: string;
  second_dest: string;
  minutes_between: number;
  prev_time: string;
  curr_time: string;
}

// New card interfaces from RPC
interface BuddyLeavesData {
  student_a: string;
  student_b: string;
  period: string;
  days: number;
  avg_gap_min: number;
  last_seen: string;
}

interface BellEdgeData {
  period: string;
  early_5: number;
  late_10: number;
  total: number;
  early_pct: number;
  late_pct: number;
}

interface LunchFrictionData {
  period: string;
  first_10_min: number;
  total: number;
  share_pct: number;
}

interface StreakData {
  student_name: string;
  period: string;
  max_streak: number;
}

interface OutlierData {
  student_name: string;
  period: string;
  destination: string;
  duration_min: number;
  personal_median: number;
  z_robust: number;
  timeout: string;
  timein: string;
}

interface LongTripData {
  student_name: string;
  long_count: number;
  total: number;
  share_pct: number;
}

interface NurseDetourData {
  type: string;
  student_name: string;
  period: string;
  date: string;
  pattern: string;
  gap_min: number | null;
  duration_min: number | null;
}

// Consolidated analytics data interface
interface AnalyticsData {
  summary: SummaryData;
  totalMinutes: TotalMinutesData;
  returnRate: ReturnRateData;
  avg: AvgData;
  byPeriod: PeriodData[];
  byDestination: DestinationData[];
  frequentFlyers: FrequentFlyerData[];
  longestPasses: LongestPassData[];
  hourlyBehavior: HourlyBehaviorData[];
  dayOfWeek: DayOfWeekData[];
  heatmap: HeatmapData[];
  disruptionScores: DisruptionScoreData[];
  nursePairs: NursePairData[];
  buddyLeaves: BuddyLeavesData[];
  bellEdge: BellEdgeData[];
  lunchFriction: LunchFrictionData[];
  streaks: StreakData[];
  outliers: OutlierData[];
  longTrips: LongTripData[];
  nurseDetour: NurseDetourData[];
}

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  // Refresh controls - persist to localStorage with new key, default to false
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem('hp_analytics_auto') === 'true';
  });
  const [refreshNonce, setRefreshNonce] = useState('init');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  // Helper to format destination names
  const formatDestination = (dest: string): string => {
    const lower = dest?.toLowerCase() || '';
    if (['testing_center', 'testing center', 'testingcenter'].includes(lower)) {
      return 'Testing Center';
    }
    // Title case
    return dest?.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) || 'Other';
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tfLower = timeFrame.toLowerCase();

      // Parallel queries to all views
      const [
        summaryRes,
        returnRateRes,
        byPeriodRes,
        byDestinationRes,
        longestPassesRes,
        hourlyBehaviorRes,
        dayOfWeekRes,
        heatmapRes,
        disruptionRes,
        nursePairsRes,
        fullAnalyticsRes
      ] = await Promise.all([
        // KPI: Passes + Total Minutes
        supabase
          .from('hp_summary_windows')
          .select('passes, minutes_out')
          .eq('window', tfLower)
          .maybeSingle(),
        // KPI: Return Rate
        supabase
          .from('hp_return_rate_windows')
          .select('pct_returned, still_out, total')
          .eq('window', tfLower)
          .maybeSingle(),
        // Trips by Period (hide zero rows)
        supabase
          .from('hp_by_period_windows')
          .select('period, passes, minutes_out')
          .eq('window', tfLower)
          .gt('passes', 0)
          .order('passes', { ascending: false }),
        // Trips by Destination (hide zero rows)
        supabase
          .from('hp_by_destination_windows')
          .select('destination, passes, minutes_out, median_min, p90_min')
          .eq('window', tfLower)
          .gt('passes', 0)
          .order('passes', { ascending: false }),
        // Longest Single Trips - BATHROOM ONLY
        supabase
          .from('hp_longest_windows')
          .select('student_name, period, destination, duration, timeout, timein')
          .eq('window', tfLower)
          .or('destination.ilike.%bathroom%,destination.ilike.%restroom%')
          .order('duration', { ascending: false })
          .limit(15),
        // Behavior by Hour
        supabase
          .from('hp_behavior_hourly_windows')
          .select('hour_24, passes')
          .eq('window', tfLower)
          .order('hour_24', { ascending: true }),
        // Passes by Day of Week
        supabase
          .from('hp_dayofweek_windows')
          .select('dow_short, passes')
          .eq('window', tfLower),
        // Weekly Hot Spots Heatmap (hide zero rows)
        supabase
          .from('hp_heatmap_windows')
          .select('period, day, passes')
          .eq('window', tfLower)
          .gt('passes', 0),
        // Disruption Score
        supabase
          .from('hp_disruption_windows')
          .select('student_name, passes, minutes_out')
          .eq('window', tfLower)
          .gt('passes', 0)
          .order('minutes_out', { ascending: false })
          .limit(15),
        // Nurse Detour Pairs
        supabase
          .from('hp_nurse_bathroom_pairs')
          .select('student_name, first_dest, second_dest, minutes_between, prev_time, curr_time')
          .order('minutes_between', { ascending: true })
          .limit(25),
        // Get remaining analytics from RPC for advanced cards
        supabase.rpc('get_full_analytics', { time_frame_arg: timeFrame })
      ]);

      // Build data object
      const passes = summaryRes.data?.passes ?? 0;
      const minutesOutRaw = Number(summaryRes.data?.minutes_out ?? 0);
      
      const summary: SummaryData = { passes };
      const totalMinutes: TotalMinutesData = { 
        total_minutes: Math.round(minutesOutRaw * 10) / 10 
      };
      const returnRate: ReturnRateData = {
        return_rate_pct: Math.round((returnRateRes.data?.pct_returned ?? 0) * 1000) / 10,
        still_out: returnRateRes.data?.still_out ?? 0,
        total: returnRateRes.data?.total ?? 0
      };

      // Calculate avg minutes - round to 1 decimal
      const avgMinutes = passes > 0 
        ? Math.round((minutesOutRaw / passes) * 10) / 10 
        : null;

      const byPeriod: PeriodData[] = (byPeriodRes.data || []).map(row => ({
        period: row.period,
        passes: row.passes,
        total_minutes: Math.round(Number(row.minutes_out) * 10) / 10,
        avg_minutes: row.passes > 0 ? Math.round((Number(row.minutes_out) / row.passes) * 10) / 10 : null
      }));

      const byDestination: DestinationData[] = (byDestinationRes.data || []).map(row => ({
        destination: formatDestination(row.destination),
        passes: row.passes,
        total_minutes: Math.round(Number(row.minutes_out) * 10) / 10,
        avg_minutes: row.passes > 0 ? Math.round((Number(row.minutes_out) / row.passes) * 10) / 10 : null,
        median_min: Math.round(Number(row.median_min ?? 0) * 10) / 10,
        p90_min: Math.round(Number(row.p90_min ?? 0) * 10) / 10
      }));

      const longestPasses: LongestPassData[] = (longestPassesRes.data || []).map(row => ({
        student_name: row.student_name,
        period: row.period,
        destination: 'Bathroom',
        minutes: Math.round(Number(row.duration) * 10) / 10,
        timeout: row.timeout,
        timein: row.timein
      }));

      // Hourly behavior data
      const hourlyBehavior: HourlyBehaviorData[] = (hourlyBehaviorRes.data || []).map(row => ({
        hour: row.hour_24,
        passes: row.passes
      }));

      // Day of week - order Mon-Sun
      const dowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayOfWeek: DayOfWeekData[] = (dayOfWeekRes.data || [])
        .map(row => ({
          day: row.dow_short,
          passes: row.passes
        }))
        .sort((a, b) => dowOrder.indexOf(a.day) - dowOrder.indexOf(b.day));

      // Heatmap data
      const heatmap: HeatmapData[] = (heatmapRes.data || []).map(row => ({
        period: row.period,
        day: row.day,
        passes: row.passes
      }));

      // Disruption scores
      const disruptionScores: DisruptionScoreData[] = (disruptionRes.data || []).map(row => ({
        student_name: row.student_name,
        passes: row.passes,
        total_minutes: Math.round(Number(row.minutes_out) * 10) / 10,
        avg_minutes: row.passes > 0 ? Math.round((Number(row.minutes_out) / row.passes) * 10) / 10 : 0
      }));

      // Nurse pairs
      const nursePairs: NursePairData[] = (nursePairsRes.data || []).map(row => ({
        student_name: row.student_name,
        first_dest: row.first_dest,
        second_dest: row.second_dest,
        minutes_between: Math.round(Number(row.minutes_between) * 10) / 10,
        prev_time: row.prev_time,
        curr_time: row.curr_time
      }));

      // Frequent Flyers - Bathroom only (from RPC since we need custom query)
      const rpcData = fullAnalyticsRes.data as any;
      const frequentFlyers: FrequentFlyerData[] = (rpcData?.frequentFlyers || [])
        .filter((row: any) => {
          // Filter for bathroom-related entries if destination info is available
          return true; // Use all from RPC for now, they're already bathroom-filtered in the function
        })
        .slice(0, 15)
        .map((row: any) => ({
          student_name: row.student_name || '',
          passes: row.passes || 0,
          total_minutes: Math.round(Number(row.total_minutes ?? 0) * 10) / 10,
          avg_minutes: (row.passes && row.passes > 0) 
            ? Math.round((Number(row.total_minutes ?? 0) / row.passes) * 10) / 10 
            : 0
        }));

      setAnalyticsData({
        summary,
        totalMinutes,
        returnRate,
        avg: { avg_minutes: avgMinutes },
        byPeriod,
        byDestination,
        frequentFlyers,
        longestPasses,
        hourlyBehavior,
        dayOfWeek,
        heatmap,
        disruptionScores,
        nursePairs,
        buddyLeaves: rpcData?.buddyLeaves || [],
        bellEdge: rpcData?.bellEdge || [],
        lunchFriction: rpcData?.lunchFriction || [],
        streaks: rpcData?.streaks || [],
        outliers: rpcData?.outliers || [],
        longTrips: rpcData?.longTrips || [],
        nurseDetour: rpcData?.nurseDetour || []
      });

    } catch (err) {
      console.error("Analytics data loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [timeFrame]);

  // Load data when timeFrame or refreshNonce changes (NO auto-load on mount polling)
  useEffect(() => {
    loadData();
  }, [timeFrame, refreshNonce, loadData]);

  // Handle auto-refresh interval with document.hidden check
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        // Skip tick if document is hidden
        if (!document.hidden) {
          setRefreshNonce(Date.now().toString());
        }
      }, 60000); // 60 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Persist auto-refresh to localStorage with new key
  const handleAutoRefreshChange = (checked: boolean) => {
    setAutoRefresh(checked);
    localStorage.setItem('hp_analytics_auto', String(checked));
  };

  const handleManualRefresh = () => {
    setRefreshNonce(Date.now().toString());
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
  };

  const formatReturnRate = (rate: number) => {
    return `${rate}%`;
  };

  // Blue palette for heatmap
  const getHeatmapColor = (passes: number, maxPasses: number): string => {
    if (passes === 0) return 'hsl(214 100% 97%)'; // Very light blue
    const ratio = passes / Math.max(maxPasses, 1);
    // Blue gradient: light to dark
    const colors = [
      'hsl(214 95% 93%)',  // #dbeafe
      'hsl(214 95% 87%)',  // #bfdbfe
      'hsl(213 94% 78%)',  // #93c5fd
      'hsl(213 94% 68%)',  // #60a5fa
      'hsl(217 91% 60%)',  // #3b82f6
      'hsl(221 83% 53%)'   // #2563eb
    ];
    const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
    return colors[index];
  };

  const getHeatmapTextColor = (passes: number, maxPasses: number) => {
    const ratio = passes / Math.max(maxPasses, 1);
    return ratio > 0.6 ? 'text-white' : 'text-foreground';
  };

  // Calculate max passes for heatmap
  const maxHeatmapPasses = analyticsData?.heatmap?.reduce((max, item) => 
    Math.max(max, item.passes || 0), 0) || 1;

  // Blue bar color for charts
  const blueBarColor = "hsl(217 91% 60%)"; // #3b82f6

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Windowed stats for passes and minutes</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Refresh Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={handleAutoRefreshChange}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto refresh</Label>
            </div>
          </div>
          
          {/* Time Frame Chips */}
          <div className="flex rounded-lg bg-muted p-1">
            {timeFrameOptions.map((option) => (
              <Button
                key={option}
                variant={timeFrame === option ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFrame(option)}
                className="relative"
              >
                {option}
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

      {loading && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Passes Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.summary?.passes ?? 0}
            </div>
          </CardContent>
        </Card>

        {/* Total Minutes Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analyticsData?.totalMinutes?.total_minutes ?? 0).toFixed(1)} min
            </div>
          </CardContent>
        </Card>

        {/* Avg Minutes per Trip Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.avg?.avg_minutes !== null 
                ? `${(analyticsData?.avg?.avg_minutes ?? 0).toFixed(1)} min` 
                : "0.0 min"}
            </div>
          </CardContent>
        </Card>

        {/* Return Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.returnRate ? formatReturnRate(analyticsData.returnRate.return_rate_pct) : "0%"}
            </div>
            {analyticsData?.returnRate && analyticsData.returnRate.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Still out: {analyticsData.returnRate.still_out} / {analyticsData.returnRate.total}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trips by Period Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trips by Period
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Only periods with activity are listed.
          </p>
        </CardHeader>
        <CardContent>
          {(analyticsData?.byPeriod?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No period data available
            </div>
          ) : (
            <ChartContainer
              config={{
                passes: {
                  label: "Passes",
                  color: blueBarColor,
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.byPeriod || []}>
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passes" fill={blueBarColor} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
          
          {/* Period Table */}
          {(analyticsData?.byPeriod?.length ?? 0) > 0 && (
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
                  {analyticsData?.byPeriod?.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes?.toFixed(1)} min</TableCell>
                      <TableCell>{row.avg_minutes?.toFixed(1) ?? 'N/A'} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Destinations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
              Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analyticsData?.byDestination?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No destination data available
              </div>
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
                  {analyticsData?.byDestination?.map((row, index) => (
                    <TableRow 
                      key={index}
                      className={row.p90_min > 12 ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                    >
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes?.toFixed(1)} min</TableCell>
                      <TableCell>{row.avg_minutes?.toFixed(1) ?? 'N/A'} min</TableCell>
                      <TableCell>{row.median_min?.toFixed(1)} min</TableCell>
                      <TableCell>{row.p90_min?.toFixed(1)} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Frequent Flyers Table - Bathroom Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Frequent Flyers — Bathroom
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analyticsData?.frequentFlyers?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bathroom passes in this window.
              </div>
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
                  {analyticsData?.frequentFlyers?.slice(0, 15).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes?.toFixed(1)} min</TableCell>
                      <TableCell>{row.avg_minutes?.toFixed(1)} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Longest Single Passes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Longest Bathroom Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(analyticsData?.longestPasses?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bathroom passes in this window.
            </div>
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
                  {analyticsData?.longestPasses?.slice(0, 15).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.minutes?.toFixed(1)} min</TableCell>
                      <TableCell className="text-sm">{formatDateTime(row.timeout)}</TableCell>
                      <TableCell className="text-sm">{row.timein ? formatDateTime(row.timein) : 'Still out'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Behavioral Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Behavior by Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Behavior by Hour
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pass distribution by hour (0-23)
            </p>
          </CardHeader>
          <CardContent>
            {(analyticsData?.hourlyBehavior?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hourly data available
              </div>
            ) : (
              <ChartContainer
                config={{
                  passes: {
                    label: "Passes",
                    color: blueBarColor,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.hourlyBehavior || []}>
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="passes" fill={blueBarColor} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Day of Week Chart Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Passes by Day of Week
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly pass distribution (Mon-Sun)
            </p>
          </CardHeader>
          <CardContent>
            {(analyticsData?.dayOfWeek?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No day-of-week data available
              </div>
            ) : (
              <ChartContainer
                config={{
                  passes: {
                    label: "Passes",
                    color: blueBarColor,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.dayOfWeek || []}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="passes" fill={blueBarColor} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disruption Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Disruption Score
          </CardTitle>
          <CardDescription>
            Students with the highest total and average minutes out
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(analyticsData?.disruptionScores?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No disruption score data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Total Minutes</TableHead>
                  <TableHead>Avg Minutes</TableHead>
                  <TableHead>Passes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsData?.disruptionScores?.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell className="font-bold text-yellow-600 dark:text-yellow-400">
                      {row.total_minutes?.toFixed(1)} min
                    </TableCell>
                    <TableCell>{row.avg_minutes?.toFixed(1)} min</TableCell>
                    <TableCell>{row.passes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Advanced Analytics Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Weekly Hot Spots Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Weekly Hot Spots
            </CardTitle>
            <CardDescription>
              Pass frequency by period and day (Periods A–H, Mon–Fri)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.heatmap && analyticsData.heatmap.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Period</TableHead>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                        <TableHead key={day} className="text-center">{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(period => (
                      <TableRow key={period}>
                        <TableCell className="font-medium">{period}</TableCell>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => {
                          const cellData = analyticsData.heatmap.find(
                            d => d.period === period && d.day === day
                          );
                          const passes = cellData?.passes ?? 0;
                          const colorHex = getHeatmapColor(passes, maxHeatmapPasses);
                          
                          return (
                            <TableCell 
                              key={day} 
                              className={cn(
                                "text-center font-semibold transition-colors duration-300",
                                getHeatmapTextColor(passes, maxHeatmapPasses)
                              )}
                              style={{ backgroundColor: colorHex }}
                            >
                              {passes}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Legend */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Fewer</span>
                  <div className="flex gap-1">
                    {[
                      'hsl(214 100% 97%)',
                      'hsl(214 95% 93%)',
                      'hsl(214 95% 87%)',
                      'hsl(213 94% 78%)',
                      'hsl(213 94% 68%)',
                      'hsl(221 83% 53%)'
                    ].map((color, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-4 rounded-sm border" 
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No heatmap data available for this window
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nurse Detour Pairs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-pink-500" />
              Nurse Detour Detector
            </CardTitle>
            <CardDescription>
              Nurse↔Bathroom pairs within 10 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(analyticsData?.nursePairs?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No nurse detour pairs detected
              </div>
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
                  {analyticsData?.nursePairs?.slice(0, 15).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.first_dest}</TableCell>
                      <TableCell>{row.second_dest}</TableCell>
                      <TableCell className="font-bold text-pink-600">{row.minutes_between} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Pattern Detection Cards */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground">Advanced Pattern Detection</h3>
        
        {/* Row 1: Buddy Leaves & Bell-Edge */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Card 1: Buddy Leaves */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-500" />
                Buddy Leaves
              </CardTitle>
              <CardDescription>
                Student pairs leaving within 2 min on ≥3 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.buddyLeaves?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No buddy patterns detected
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student A</TableHead>
                      <TableHead>Student B</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Avg Gap</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.buddyLeaves?.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.student_a}</TableCell>
                        <TableCell>{row.student_b}</TableCell>
                        <TableCell>{row.period}</TableCell>
                        <TableCell className="font-bold text-purple-600">{row.days}</TableCell>
                        <TableCell>{row.avg_gap_min} min</TableCell>
                        <TableCell className="text-sm">{row.last_seen}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Bell-Edge Leavers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Bell-Edge Leavers
              </CardTitle>
              <CardDescription>
                Passes in first 5 min or last 10 min of period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.bellEdge?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bell-edge data (requires period_meta times)
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>First 5 min</TableHead>
                      <TableHead>Last 10 min</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Early %</TableHead>
                      <TableHead>Late %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.bellEdge?.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.period}</TableCell>
                        <TableCell>{row.early_5}</TableCell>
                        <TableCell>{row.late_10}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.early_pct}%</TableCell>
                        <TableCell className={cn(
                          "font-bold",
                          (row.late_pct ?? 0) > 30 && "text-orange-600"
                        )}>{row.late_pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Lunch Friction & Streak Detector */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Card 3: Lunch-Transition Friction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-green-500" />
                Lunch-Transition Friction
              </CardTitle>
              <CardDescription>
                Passes in first 10 min after lunch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.lunchFriction?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No post-lunch data (set is_after_lunch in period_meta)
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>First 10 min</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.lunchFriction?.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.period}</TableCell>
                        <TableCell>{row.first_10_min}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell className={cn(
                          "font-bold",
                          (row.share_pct ?? 0) > 40 && "text-green-600"
                        )}>{row.share_pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Streak Detector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Streak Detector
              </CardTitle>
              <CardDescription>
                Students with 3+ consecutive days leaving same period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.streaks?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No streaks detected
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Max Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.streaks?.slice(0, 15).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell>{row.period}</TableCell>
                        <TableCell className="font-bold text-red-600">{row.max_streak} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Personal Outliers & Long Trips */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Card 5: Personal Outlier Index */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Personal Outliers
              </CardTitle>
              <CardDescription>
                Passes unusually long for each student (z* ≥ 2)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.outliers?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No personal outliers detected
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Dest</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Median</TableHead>
                      <TableHead>z*</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.outliers?.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell>{row.period}</TableCell>
                        <TableCell className="text-sm">{row.destination}</TableCell>
                        <TableCell>{row.duration_min} min</TableCell>
                        <TableCell className="text-muted-foreground">{row.personal_median} min</TableCell>
                        <TableCell className={cn(
                          "font-bold",
                          row.z_robust >= 3 ? "text-red-600" : "text-blue-600"
                        )}>{row.z_robust}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card 6: Long-Trip Share */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-500" />
                Long-Trip Share
              </CardTitle>
              <CardDescription>
                Students with high % of trips ≥12 min
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(analyticsData?.longTrips?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No long-trip data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Long (≥12m)</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData?.longTrips?.slice(0, 15).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell>{row.long_count}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell className={cn(
                          "font-bold",
                          (row.share_pct ?? 0) > 50 && "text-amber-600"
                        )}>{row.share_pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Card 7: Nurse Detour Details from RPC (full width) */}
        {(analyticsData?.nurseDetour?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-pink-500" />
                Nurse Detour Details
              </CardTitle>
              <CardDescription>
                Detailed nurse↔bathroom patterns and long nurse visits (≥ personal P90)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Gap / Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.nurseDetour?.slice(0, 20).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          row.type === 'NURSE↔BATH' 
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        )}>
                          {row.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell className="text-sm">{row.date}</TableCell>
                      <TableCell>{row.pattern}</TableCell>
                      <TableCell>
                        {row.gap_min !== null ? `${row.gap_min} min gap` : ''}
                        {row.duration_min !== null ? `${row.duration_min} min` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
