import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Users, TrendingUp, Flame, Calendar, Zap } from "lucide-react";
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
}

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
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

  const loadData = async () => {
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
  };

  useEffect(() => {
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

  // Helper function for heatmap color coding
  const getHeatmapColor = (count: number | undefined) => {
    if (!count || count === 0) return '';
    if (count >= 3) return 'bg-orange-400 text-white';
    if (count === 2) return 'bg-orange-300';
    if (count === 1) return 'bg-orange-200';
    return '';
  };

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
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.byPeriod || []}>
                  <XAxis dataKey="period_label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passes" fill="var(--color-passes)" />
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
                    <TableHead>Median Minutes</TableHead>
                    <TableHead>Typical Duration (IQR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.byDestination?.map((row, index) => (
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

        {/* Frequent Flyers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Frequent Flyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analyticsData?.frequentFlyers?.length ?? 0) === 0 ? (
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
                  {analyticsData?.frequentFlyers?.slice(0, 10).map((row, index) => (
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
            <Clock className="h-5 w-5" />
            Longest
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
              <Clock className="h-5 w-5" />
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
              <BarChart3 className="h-5 w-5" />
              Passes by Day of Week
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly pass distribution
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
                  pass_count: {
                    label: "Passes",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.dayOfWeek || []}>
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
              <Flame className="w-5 h-5 mr-2 text-orange-500" />
              Weekly Hot Spots
            </CardTitle>
            <CardDescription>
              Pass frequency by period and day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.heatmap && analyticsData.heatmap.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Period</TableHead>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                      <TableHead key={day} className="text-center">{day.substring(0, 3)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(period => (
                    <TableRow key={period}>
                      <TableCell className="font-medium">{period}</TableCell>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                        const cellData = analyticsData.heatmap.find(d => d.period === period && d.day_of_week.trim() === day);
                        const isPlanning = planningPeriods.includes(period);
                        const meetsOnDay = weeklyMeetingPattern[period]?.includes(day);
                        const isGreyedOut = isPlanning || !meetsOnDay;
                        
                        return (
                          <TableCell 
                            key={day} 
                            className={cn(
                              "text-center font-semibold",
                              isGreyedOut ? 'bg-slate-100 dark:bg-slate-800' : getHeatmapColor(cellData?.pass_count),
                              "transition-colors duration-300"
                            )}
                          >
                            {!isGreyedOut ? cellData?.pass_count || null : null}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No heatmap data available
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
    </div>
  );
};

export default AnalyticsView;