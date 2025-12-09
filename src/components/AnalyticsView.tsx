import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, Clock, Users, TrendingUp, Calendar, Zap, RefreshCw, UserCheck, AlertTriangle, Utensils, Flame, Target, Timer, Stethoscope } from "lucide-react";
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
  total_minutes: number;
}

interface ReturnRateData {
  return_rate_pct: number;
  still_out: number;
  total: number;
}

interface AvgData {
  avg_minutes: number | null;
}

interface PeriodData {
  period_label: string;
  passes: number;
  total_minutes: number;
  avg_minutes: number | null;
}

interface DestinationData {
  destination: string;
  passes: number;
  total_minutes: number;
  median_minutes: number;
  q1_minutes: number;
  q3_minutes: number;
}

interface FrequentFlyerData {
  student_name: string;
  passes: number;
  total_minutes: number;
  avg_minutes_per_trip: number;
}

interface LongestPassData {
  student_name: string;
  period: string;
  destination: string;
  duration_minutes: number;
  timeout: string;
  timein: string;
}

interface BehavioralInsightsData {
  insight_type: string;
  pass_count: number;
  avg_duration: number;
}

interface DayOfWeekData {
  day_of_week: string;
  pass_count: number;
}

interface HeatmapData {
  day_of_week: string;
  period: string;
  pass_count: number;
  bucket: number;
  color_hex: string;
}

interface ScheduleAnalysisData {
  schedule_type: string;
  total_passes: number;
  instructional_minutes: number;
  passes_per_100_min: number;
}

interface DisruptionScoreData {
  student_name: string;
  disruption_score: number;
}

// New card interfaces
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
  returnRate: ReturnRateData;
  avg: AvgData;
  byPeriod: PeriodData[];
  byDestination: DestinationData[];
  frequentFlyers: FrequentFlyerData[];
  longestPasses: LongestPassData[];
  behavioralInsights: BehavioralInsightsData[];
  dayOfWeek: DayOfWeekData[];
  heatmap: HeatmapData[];
  scheduleAnalysis: ScheduleAnalysisData[];
  disruptionScores: DisruptionScoreData[];
  buddyLeaves: BuddyLeavesData[];
  bellEdge: BellEdgeData[];
  lunchFriction: LunchFrictionData[];
  streaks: StreakData[];
  outliers: OutlierData[];
  longTrips: LongTripData[];
  nurseDetour: NurseDetourData[];
}

// localStorage key for auto-refresh preference
const AUTO_KEY = 'hp_analytics_auto';

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Bathroom-only frequent flyers data
  const [bathroomFlyers, setBathroomFlyers] = useState<FrequentFlyerData[]>([]);

  // Refresh controls - OFF by default, persisted to localStorage
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTO_KEY) === 'true';
    }
    return false;
  });
  const [refreshNonce, setRefreshNonce] = useState('init');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Teaching and Meeting Schedules
  const planningPeriods = ['B', 'E', 'F'];
  const weeklyMeetingPattern: { [key: string]: string[] } = {
    'A': ['Monday', 'Tuesday', 'Thursday'],
    'C': ['Monday', 'Tuesday', 'Thursday'],
    'D': ['Monday', 'Tuesday', 'Thursday'],
    'G': ['Monday', 'Wednesday', 'Friday'],
    'H': ['Monday', 'Wednesday', 'Friday']
  };

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Single API call to get all analytics data
      const { data, error: analyticsError } = await supabase.rpc('get_full_analytics', {
        time_frame_arg: timeFrame
      });

      if (analyticsError) throw analyticsError;

      // The data is already in the correct format from our backend function
      setAnalyticsData(data as unknown as AnalyticsData);

    } catch (err) {
      console.error("Analytics data loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [timeFrame]);

  // Load bathroom-only frequent flyers using quotes-safe timeframe
  const loadBathroomFlyers = useCallback(async () => {
    try {
      // Normalize timeframe: quotes-safe, lowercase
      const normalizedFrame = timeFrame.toLowerCase().replace(/"/g, '');

      // Calculate time boundaries based on timeframe
      const now = new Date();
      let startTime: Date;

      switch (normalizedFrame) {
        case 'day':
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case 'month':
          startTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startTime = new Date(now.getFullYear(), quarterStart, 1);
          break;
        default: // 'all'
          startTime = new Date(2000, 0, 1);
      }

      // Query bathroom-only passes grouped by student
      const { data, error: queryError } = await supabase
        .from('bathroom_passes')
        .select('student_name, duration_min')
        .gte('timeout', startTime.toISOString())
        .or('destination.ilike.%bathroom%,destination.ilike.%restroom%')
        .not('student_name', 'is', null);

      if (queryError) throw queryError;

      // Aggregate by student
      const studentMap = new Map<string, { passes: number; totalMinutes: number }>();

      (data || []).forEach((row: { student_name: string; duration_min: number | null }) => {
        const existing = studentMap.get(row.student_name) || { passes: 0, totalMinutes: 0 };
        studentMap.set(row.student_name, {
          passes: existing.passes + 1,
          totalMinutes: existing.totalMinutes + (row.duration_min || 0)
        });
      });

      // Convert to array and sort
      const flyers: FrequentFlyerData[] = Array.from(studentMap.entries())
        .map(([student_name, stats]) => ({
          student_name,
          passes: stats.passes,
          total_minutes: stats.totalMinutes,
          avg_minutes_per_trip: stats.passes > 0
            ? Math.round((stats.totalMinutes / stats.passes) * 10) / 10
            : 0
        }))
        .sort((a, b) => b.passes - a.passes || b.total_minutes - a.total_minutes)
        .slice(0, 15);

      setBathroomFlyers(flyers);
    } catch (err) {
      console.error("Bathroom flyers loading error:", err);
    }
  }, [timeFrame]);

  // Refetch all data function for auto-refresh
  const refetchAll = useCallback(() => {
    loadData();
    loadBathroomFlyers();
  }, [loadData, loadBathroomFlyers]);

  // Load data when timeFrame or refreshNonce changes
  useEffect(() => {
    loadData();
    loadBathroomFlyers();
  }, [timeFrame, refreshNonce, loadData, loadBathroomFlyers]);

  // Persist auto-refresh preference to localStorage
  useEffect(() => {
    localStorage.setItem(AUTO_KEY, autoRefresh ? 'true' : 'false');
  }, [autoRefresh]);

  // Handle auto-refresh interval - only poll when ON and tab is visible
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          refetchAll();
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
  }, [autoRefresh, refetchAll]);

  const handleManualRefresh = () => {
    setRefreshNonce(Date.now().toString());
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatReturnRate = (rate: number) => {
    return `${rate}%`;
  };

  const formatIQR = (q1: number, q3: number) => {
    if (q1 === 0 && q3 === 0) return "No data";
    return `${Math.round(q1)}-${Math.round(q3)} min`;
  };

  // Helper function for heatmap text color based on bucket
  const getHeatmapTextColor = (bucket: number) => {
    // Buckets 4 and 5 are dark enough to need white text
    return bucket >= 4 ? 'text-white' : 'text-foreground';
  };

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
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto</Label>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Return Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.returnRate ? formatReturnRate(analyticsData.returnRate.return_rate_pct) : "No data"}
            </div>
            {analyticsData?.returnRate && analyticsData.returnRate.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Still out: {analyticsData.returnRate.still_out} / {analyticsData.returnRate.total}
              </p>
            )}
            {analyticsData?.returnRate?.total === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No data in this window
              </p>
            )}
          </CardContent>
        </Card>

        {/* Avg Minutes per Trip Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Minutes per Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.avg?.avg_minutes !== null ? `${analyticsData?.avg?.avg_minutes ?? 0} min` : "No data"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trips by Period Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Trips by Period
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Only periods with activity are listed.
          </p>
        </CardHeader>
        <CardContent>
          {(analyticsData?.byPeriod?.filter(r => r.passes > 0)?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No period data available
            </div>
          ) : (
            <ChartContainer
              config={{
                passes: {
                  label: "Passes",
                  color: "#2563eb", // Blue gradient primary
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.byPeriod?.filter(r => r.passes > 0) || []}>
                  <XAxis dataKey="period_label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passes" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}

          {/* Period Table - hide zero-pass rows */}
          {(analyticsData?.byPeriod?.filter(r => r.passes > 0)?.length ?? 0) > 0 && (
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
                  {analyticsData?.byPeriod?.filter(row => row.passes > 0).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period_label}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes ? `${row.total_minutes.toFixed(1)} min` : 'N/A'}</TableCell>
                      <TableCell>{row.avg_minutes ? `${row.avg_minutes.toFixed(1)} min` : 'N/A'}</TableCell>
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
              <TrendingUp className="h-5 w-5 text-blue-600" />
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
                    <TableHead>Median Minutes</TableHead>
                    <TableHead>Typical Duration (IQR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.byDestination?.filter(row => row.passes > 0).map((row, index) => (
                    <TableRow
                      key={index}
                      className={row.q3_minutes > 12 ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                    >
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{Number(row.total_minutes).toFixed(1)} min</TableCell>
                      <TableCell>{Number(row.median_minutes).toFixed(1)} min</TableCell>
                      <TableCell>{formatIQR(row.q1_minutes, row.q3_minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Frequent Flyers — Bathroom Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Frequent Flyers — Bathroom
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Students with most bathroom/restroom trips
            </p>
          </CardHeader>
          <CardContent>
            {bathroomFlyers.length === 0 ? (
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
                  {bathroomFlyers.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{Number(row.total_minutes).toFixed(1)} min</TableCell>
                      <TableCell>{row.avg_minutes_per_trip} min</TableCell>
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
            <Clock className="h-5 w-5 text-blue-600" />
            Longest Passes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(analyticsData?.longestPasses?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No passes in this window.
            </div>
          ) : (
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Duration (min)</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.longestPasses?.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.destination}</TableCell>
                      <TableCell>{row.duration_minutes} min</TableCell>
                      <TableCell className="text-sm">{formatDateTime(row.timeout)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(row.timein)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Behavioral Insights Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Behavioral Insights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pass patterns by time of day
            </p>
          </CardHeader>
          <CardContent>
            {(analyticsData?.behavioralInsights?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No behavioral data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time Period</TableHead>
                    <TableHead>Pass Count</TableHead>
                    <TableHead>Avg Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.behavioralInsights?.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.insight_type}</TableCell>
                      <TableCell>{row.pass_count}</TableCell>
                      <TableCell>{row.avg_duration} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Day of Week Chart Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Passes by Day of Week
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly pass distribution
            </p>
          </CardHeader>
          <CardContent>
            {(analyticsData?.dayOfWeek?.filter(d => d.pass_count > 0)?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No day-of-week data available
              </div>
            ) : (
              <ChartContainer
                config={{
                  pass_count: {
                    label: "Passes",
                    color: "#2563eb", // Blue gradient
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.dayOfWeek?.filter(d => d.pass_count > 0) || []}>
                    <XAxis dataKey="day_of_week" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pass_count" fill="#60a5fa" />
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
            Students with the highest classroom disruption impact
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
                  <TableHead>Disruption Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsData?.disruptionScores?.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell className="font-bold text-yellow-600 dark:text-yellow-400">
                      {row.disruption_score}
                    </TableCell>
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
                            d => d.period === period && d.day_of_week === day
                          );
                          const colorHex = cellData?.color_hex || '#f5f8ff';
                          const bucket = cellData?.bucket ?? 0;
                          
                          return (
                            <TableCell 
                              key={day} 
                              className={cn(
                                "text-center font-semibold transition-colors duration-300",
                                getHeatmapTextColor(bucket)
                              )}
                              style={{ backgroundColor: colorHex }}
                            >
                              {cellData?.pass_count ?? 0}
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
                    {['#f5f8ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'].map((color, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-4 rounded-sm border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>More passes</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No heatmap data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Schedule Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparing pass rates between schedule types
            </p>
          </CardHeader>
          <CardContent>
            {(analyticsData?.scheduleAnalysis?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No schedule analysis data available
              </div>
            ) : (
              <div className="space-y-4">
                {analyticsData?.scheduleAnalysis?.map((item, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.schedule_type}</h4>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {item.passes_per_100_min}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          passes per 100 min
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Total Passes:</span> {item.total_passes}
                      </div>
                      <div>
                        <span className="font-medium">Instructional Minutes:</span> {item.instructional_minutes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Analytics Cards Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-foreground">Advanced Insights</h3>
        
        {/* Row 1: Buddy Leaves & Bell-Edge Leavers */}
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

        {/* Card 7: Nurse Detour Detector (full width) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-pink-500" />
              Nurse Detour Detector
            </CardTitle>
            <CardDescription>
              Nurse↔Bathroom pairs within 10 min, or unusually long nurse visits (≥ personal P90)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(analyticsData?.nurseDetour?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No nurse detours detected
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsView;