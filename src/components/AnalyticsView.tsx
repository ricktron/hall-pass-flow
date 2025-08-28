import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Users, TrendingUp, Flame, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
}

interface ScheduleAnalysisData {
  schedule_type: string;
  total_passes: number;
  instructional_minutes: number;
  passes_per_100_min: number;
}

interface SafeLoaderData {
  ok: number;
}

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeLoaderData, setSafeLoaderData] = useState<SafeLoaderData | null>(null);
  
  // Data states
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [returnRateData, setReturnRateData] = useState<ReturnRateData | null>(null);
  const [avgData, setAvgData] = useState<AvgData | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [destinationData, setDestinationData] = useState<DestinationData[]>([]);
  const [frequentFlyerData, setFrequentFlyerData] = useState<FrequentFlyerData[]>([]);
  const [longestPassData, setLongestPassData] = useState<LongestPassData[]>([]);
  const [behavioralInsightsData, setBehavioralInsightsData] = useState<BehavioralInsightsData[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<DayOfWeekData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [scheduleAnalysisData, setScheduleAnalysisData] = useState<ScheduleAnalysisData[]>([]);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  // Safe loader that must not fail
  const loadSafeData = async () => {
    try {
      const { data: safeData, error: safeError } = await supabase.rpc('exec_sql' as any, {
        query: 'SELECT 1 AS ok;'
      });
      
      if (safeError) throw safeError;
      setSafeLoaderData(safeData?.[0] || { ok: 1 });
    } catch (err) {
      console.error("Safe loader error:", err);
      setSafeLoaderData({ ok: 1 }); // Always succeed
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load summary data using parameterized RPC function
      const { data: summary, error: summaryError } = await supabase.rpc('get_analytics_summary', {
        time_frame_arg: timeFrame
      });

      if (summaryError) throw summaryError;
      const summaryResult = summary?.[0] || { passes: 0, total_minutes: 0 };
      setSummaryData(summaryResult);

      // Load return rate data using parameterized RPC function
      const { data: returnRate, error: returnRateError } = await supabase.rpc('get_analytics_return_rate', {
        time_frame_arg: timeFrame
      });

      if (returnRateError) throw returnRateError;
      const returnRateResult = returnRate?.[0] || { return_rate_pct: 0, still_out: 0, total: 0 };
      setReturnRateData(returnRateResult);

      // Load average data using parameterized RPC function
      const { data: avg, error: avgError } = await supabase.rpc('get_analytics_avg_minutes', {
        time_frame_arg: timeFrame
      });

      if (avgError) throw avgError;
      const avgResult = avg?.[0] || { avg_minutes: null };
      setAvgData(avgResult);

      // Load period data using parameterized RPC function
      const { data: periods, error: periodError } = await supabase.rpc('get_analytics_by_period', {
        time_frame_arg: timeFrame
      });

      if (periodError) throw periodError;
      setPeriodData(periods || []);

      // Load destination data using parameterized RPC function
      const { data: destinations, error: destinationError } = await supabase.rpc('get_analytics_by_destination', {
        time_frame_arg: timeFrame
      });

      if (destinationError) throw destinationError;
      setDestinationData(destinations || []);

      // Load frequent flyer data using parameterized RPC function
      const { data: frequentFlyers, error: frequentFlyerError } = await supabase.rpc('get_analytics_frequent_flyers', {
        time_frame_arg: timeFrame
      });

      if (frequentFlyerError) throw frequentFlyerError;
      setFrequentFlyerData(frequentFlyers || []);

      // Load longest pass data using parameterized RPC function
      const { data: longestPasses, error: longestError } = await supabase.rpc('get_analytics_longest_passes', {
        time_frame_arg: timeFrame
      });

      if (longestError) throw longestError;
      setLongestPassData(longestPasses || []);

      // Load behavioral insights data using parameterized RPC function
      const { data: behavioralInsights, error: behavioralError } = await supabase.rpc('get_behavioral_insights', {
        time_frame_arg: timeFrame
      });

      if (behavioralError) throw behavioralError;
      setBehavioralInsightsData(behavioralInsights || []);

      // Load day of week data using parameterized RPC function
      const { data: dayOfWeek, error: dayOfWeekError } = await supabase.rpc('get_passes_by_day_of_week', {
        time_frame_arg: timeFrame
      });

      if (dayOfWeekError) throw dayOfWeekError;
      setDayOfWeekData(dayOfWeek || []);

      // Load heatmap data using parameterized RPC function
      const { data: heatmap, error: heatmapError } = await supabase.rpc('get_weekly_heatmap_data', {
        time_frame_arg: timeFrame
      });

      if (heatmapError) throw heatmapError;
      setHeatmapData(heatmap || []);

      // Load schedule analysis data using parameterized RPC function
      const { data: scheduleAnalysis, error: scheduleAnalysisError } = await supabase.rpc('get_schedule_type_analysis', {
        time_frame_arg: timeFrame
      });

      if (scheduleAnalysisError) throw scheduleAnalysisError;
      setScheduleAnalysisData(scheduleAnalysis || []);

    } catch (err) {
      console.error("Analytics data loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSafeData();
    loadData();
  }, [timeFrame]);

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

  // Helper functions for heatmap
  const getHeatmapIntensity = (passCount: number, maxCount: number) => {
    if (passCount === 0) return "bg-muted/20";
    const intensity = Math.min(passCount / maxCount, 1);
    if (intensity <= 0.25) return "bg-orange-100 dark:bg-orange-950/30";
    if (intensity <= 0.5) return "bg-orange-200 dark:bg-orange-900/50";
    if (intensity <= 0.75) return "bg-orange-300 dark:bg-orange-800/70";
    return "bg-orange-400 dark:bg-orange-700";
  };

  const getHeatmapValue = (day: string, period: string) => {
    const item = heatmapData.find(d => d.day_of_week === day && d.period === period);
    return item ? item.pass_count : 0;
  };

  const maxHeatmapValue = Math.max(...heatmapData.map(d => d.pass_count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Windowed stats for passes and minutes</p>
        </div>
        
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
              {summaryData?.passes ?? 0}
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
              {returnRateData ? formatReturnRate(returnRateData.return_rate_pct) : "No data"}
            </div>
            {returnRateData && returnRateData.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Still out: {returnRateData.still_out} / {returnRateData.total}
              </p>
            )}
            {returnRateData?.total === 0 && (
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
              {avgData?.avg_minutes !== null ? `${avgData?.avg_minutes ?? 0} min` : "No data"}
            </div>
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
          {periodData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No period data available
            </div>
          ) : (
            <ChartContainer
              config={{
                passes: {
                  label: "Passes",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData}>
                  <XAxis dataKey="period_label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passes" fill="var(--color-passes)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
          
          {/* Period Table */}
          {periodData.length > 0 && (
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
                  {periodData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period_label}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes} min</TableCell>
                      <TableCell>{row.avg_minutes ? `${row.avg_minutes} min` : 'N/A'}</TableCell>
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
            {destinationData.length === 0 ? (
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
                  {destinationData.map((row, index) => (
                    <TableRow 
                      key={index}
                      className={row.q3_minutes > 12 ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                    >
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes} min</TableCell>
                      <TableCell>{row.median_minutes} min</TableCell>
                      <TableCell>{formatIQR(row.q1_minutes, row.q3_minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Frequent Flyers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Frequent Flyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {frequentFlyerData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No passes in this window.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Passes</TableHead>
                    <TableHead>Total Minutes</TableHead>
                    <TableHead>Avg per Trip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequentFlyerData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes} min</TableCell>
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
            <Clock className="h-5 w-5" />
            Longest
          </CardTitle>
        </CardHeader>
        <CardContent>
          {longestPassData.length === 0 ? (
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
                  {longestPassData.slice(0, 10).map((row, index) => (
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
              <Clock className="h-5 w-5" />
              Behavioral Insights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pass patterns by time of day
            </p>
          </CardHeader>
          <CardContent>
            {behavioralInsightsData.length === 0 ? (
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
                  {behavioralInsightsData.map((row, index) => (
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
              <BarChart3 className="h-5 w-5" />
              Passes by Day of Week
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly pass distribution
            </p>
          </CardHeader>
          <CardContent>
            {dayOfWeekData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No day-of-week data available
              </div>
            ) : (
              <ChartContainer
                config={{
                  pass_count: {
                    label: "Passes",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <XAxis dataKey="day_of_week" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pass_count" fill="var(--color-pass_count)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Weekly Hot Spots Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Weekly Hot Spots
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pass frequency by period and day
            </p>
          </CardHeader>
          <CardContent>
            {heatmapData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No heatmap data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-sm font-medium">Period</th>
                      <th className="text-center p-2 text-sm font-medium">Mon</th>
                      <th className="text-center p-2 text-sm font-medium">Tue</th>
                      <th className="text-center p-2 text-sm font-medium">Wed</th>
                      <th className="text-center p-2 text-sm font-medium">Thu</th>
                      <th className="text-center p-2 text-sm font-medium">Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((period) => (
                      <tr key={period}>
                        <td className="p-2 text-sm font-medium">{period}</td>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                          const value = getHeatmapValue(day, period);
                          return (
                            <td
                              key={day}
                              className={`p-2 text-center text-sm border rounded ${getHeatmapIntensity(value, maxHeatmapValue)}`}
                            >
                              {value || ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparing pass rates between schedule types
            </p>
          </CardHeader>
          <CardContent>
            {scheduleAnalysisData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No schedule analysis data available
              </div>
            ) : (
              <div className="space-y-4">
                {scheduleAnalysisData.map((item, index) => (
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
    </div>
  );
};

export default AnalyticsView;