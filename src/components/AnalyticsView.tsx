import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Users, TrendingUp, UserCheck } from "lucide-react";
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
  p90_minutes: number;
}

interface FrequentFlyerData {
  student_name: string;
  passes: number;
  total_minutes: number;
}

interface LongestPassData {
  student_name: string;
  period: string;
  destination: string;
  duration_minutes: number;
  timeout: string;
  timein: string;
}

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [returnRateData, setReturnRateData] = useState<ReturnRateData | null>(null);
  const [avgData, setAvgData] = useState<AvgData | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [destinationData, setDestinationData] = useState<DestinationData[]>([]);
  const [frequentFlyerData, setFrequentFlyerData] = useState<FrequentFlyerData[]>([]);
  const [longestPassData, setLongestPassData] = useState<LongestPassData[]>([]);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    // Use the robust timeFrame handling from the spec
    const effectiveTimeFrame = timeFrame || "Week";

    try {
      // Load summary data
      const { data: summary, error: summaryError } = await supabase
        .from("hp_summary_windows" as any)
        .select("passes, minutes_out AS total_minutes")
        .eq("window", effectiveTimeFrame)
        .maybeSingle();

      if (summaryError) throw summaryError;
      setSummaryData(summary as unknown as SummaryData | null);

      // Load return rate data with computed percentage
      const { data: returnRate, error: returnRateError } = await supabase
        .from("hp_return_rate_windows" as any)
        .select("pct_returned, still_out, total")
        .eq("window", effectiveTimeFrame)
        .maybeSingle();

      if (returnRateError) throw returnRateError;
      
      // Compute percentage client-side (pct_returned is 0-1 range)
      const computed = returnRate ? {
        return_rate_pct: Math.round((returnRate as any).pct_returned * 100.0 * 10) / 10,
        still_out: (returnRate as any).still_out,
        total: (returnRate as any).total
      } : null;
      
      setReturnRateData(computed as unknown as ReturnRateData | null);

      // Load average data
      const { data: avg, error: avgError } = await supabase
        .from("hp_summary_windows" as any)
        .select(`
          CASE WHEN passes = 0 THEN NULL
               ELSE ROUND(minutes_out::numeric / passes, 1) END AS avg_minutes
        `)
        .eq("window", effectiveTimeFrame)
        .maybeSingle();

      if (avgError) {
        // Fallback calculation
        const avgCalc = summary && (summary as any).passes > 0 ? 
          Math.round(((summary as any).total_minutes / (summary as any).passes) * 10) / 10 : null;
        setAvgData({ avg_minutes: avgCalc });
      } else {
        setAvgData(avg as unknown as AvgData | null);
      }

      // Load period data with labels and calculations
      const { data: periods, error: periodError } = await supabase
        .from("hp_by_period_windows" as any)
        .select("period, passes, minutes_out AS total_minutes")
        .eq("window", effectiveTimeFrame)
        .order("passes", { ascending: false })
        .order("period");

      if (periodError) throw periodError;
      
      // Transform periods with labels and calculations on client side
      const transformedPeriods = (periods as unknown as any[] || []).map((row: any) => ({
        period: row.period, // Keep raw period
        period_label: row.period?.toLowerCase().includes('house') ? 'House Small Group' : `Period ${row.period}`,
        passes: row.passes,
        total_minutes: row.total_minutes,
        avg_minutes: row.passes > 0 ? Math.round((row.total_minutes / row.passes) * 10) / 10 : null
      }));
      
      setPeriodData(transformedPeriods);

      // Load destination data
      const { data: destinations, error: destinationError } = await supabase
        .from("hp_by_destination_windows" as any)
        .select("destination, passes, minutes_out AS total_minutes, median_min AS median_minutes, p90_min AS p90_minutes")
        .eq("window", effectiveTimeFrame)
        .order("passes", { ascending: false });

      if (destinationError) throw destinationError;
      setDestinationData(destinations as unknown as DestinationData[]);

      // Load frequent flyer data
      const { data: frequentFlyers, error: frequentFlyerError } = await supabase
        .from("hp_frequent_flyers_windows" as any)
        .select("student_name, passes, minutes_out AS total_minutes")
        .eq("window", effectiveTimeFrame)
        .limit(10);

      if (frequentFlyerError) throw frequentFlyerError;
      setFrequentFlyerData(frequentFlyers as unknown as FrequentFlyerData[]);

      // Load longest pass data
      const { data: longestPasses, error: longestError } = await supabase
        .from("hp_longest_windows" as any)
        .select("student_name, period, destination, duration AS duration_minutes, timeout, timein")
        .eq("window", effectiveTimeFrame)
        .order("duration", { ascending: false })
        .order("timeout", { ascending: false })
        .limit(10);

      if (longestError) throw longestError;
      setLongestPassData(longestPasses as unknown as LongestPassData[]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Windowed stats for passes and minutes</p>
        </div>
        
        {/* Time Frame Toggle */}
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

      {/* Debug Cards - Temporary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Debug: TimeFrame Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono">
              "{timeFrame || "Week"}"
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Debug: Row Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div>Summary: {summaryData ? '1' : '0'}</div>
              <div>Return: {returnRateData ? '1' : '0'}</div>
              <div>Periods: {periodData.length}</div>
              <div>Destinations: {destinationData.length}</div>
              <div>Flyers: {frequentFlyerData.length}</div>
              <div>Longest: {longestPassData.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Total Minutes Out Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.total_minutes ?? 0} min
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
                    <TableHead>P90 Minutes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinationData.map((row, index) => (
                    <TableRow 
                      key={index}
                      className={row.p90_minutes > 12 ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                    >
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes} min</TableCell>
                      <TableCell>{row.median_minutes} min</TableCell>
                      <TableCell>{row.p90_minutes} min</TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequentFlyerData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.total_minutes} min</TableCell>
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
    </div>
  );
};

export default AnalyticsView;