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

type TimeFrame = "day" | "week" | "month" | "quarter" | "all";

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
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("week");
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

  const timeFrameOptions: TimeFrame[] = ["day", "week", "month", "quarter", "all"];

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load summary data using CTE pattern
      const { data: summary, error: summaryError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT COALESCE(s.passes, 0) AS passes, COALESCE(s.minutes_out, 0) AS total_minutes
          FROM tf
          LEFT JOIN public.hp_summary_windows s ON s."window" = tf.k
        `
      });

      if (summaryError) throw summaryError;
      const summaryResult = summary?.[0] || { passes: 0, total_minutes: 0 };
      setSummaryData(summaryResult);

      // Load return rate data using CTE pattern
      const { data: returnRate, error: returnRateError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            ROUND(COALESCE(r.pct_returned, 0) * 100.0, 1) AS return_rate_pct,
            COALESCE(r.still_out, 0) AS still_out,
            COALESCE(r.total, 0) AS total
          FROM tf
          LEFT JOIN public.hp_return_rate_windows r ON r."window" = tf.k
        `
      });

      if (returnRateError) throw returnRateError;
      const returnRateResult = returnRate?.[0] || { return_rate_pct: 0, still_out: 0, total: 0 };
      setReturnRateData(returnRateResult);

      // Load average data using CTE pattern
      const { data: avg, error: avgError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            CASE WHEN s.passes IS NULL OR s.passes = 0 THEN NULL
                 ELSE ROUND(s.minutes_out::numeric / s.passes, 1)
            END AS avg_minutes
          FROM tf
          LEFT JOIN public.hp_summary_windows s ON s."window" = tf.k
        `
      });

      if (avgError) throw avgError;
      const avgResult = avg?.[0] || { avg_minutes: null };
      setAvgData(avgResult);

      // Load period data using CTE pattern
      const { data: periods, error: periodError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            p.period,
            CASE WHEN p.period ILIKE 'house%' THEN 'House Small Group'
                 ELSE 'Period ' || p.period END AS period_label,
            p.passes,
            p.minutes_out AS total_minutes,
            ROUND(p.minutes_out::numeric / NULLIF(p.passes,0), 1) AS avg_minutes
          FROM public.hp_by_period_windows p
          JOIN tf ON p."window" = tf.k
          ORDER BY p.passes DESC, period_label
        `
      });

      if (periodError) throw periodError;
      setPeriodData(periods || []);

      // Load destination data using CTE pattern
      const { data: destinations, error: destinationError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            d.destination,
            d.passes,
            d.minutes_out AS total_minutes,
            d.median_min AS median_minutes,
            d.p90_min AS p90_minutes
          FROM public.hp_by_destination_windows d
          JOIN tf ON d."window" = tf.k
          ORDER BY d.passes DESC
        `
      });

      if (destinationError) throw destinationError;
      setDestinationData(destinations || []);

      // Load frequent flyer data using CTE pattern
      const { data: frequentFlyers, error: frequentFlyerError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            f.student_name,
            f.passes,
            f.minutes_out AS total_minutes
          FROM public.hp_frequent_flyers_windows f
          JOIN tf ON f."window" = tf.k
          ORDER BY f.passes DESC, f.minutes_out DESC
          LIMIT 10
        `
      });

      if (frequentFlyerError) throw frequentFlyerError;
      setFrequentFlyerData(frequentFlyers || []);

      // Load longest pass data using CTE pattern
      const { data: longestPasses, error: longestError } = await supabase.rpc('exec_sql' as any, {
        query: `
          WITH tf AS (
            SELECT lower(replace(COALESCE(NULLIF('${timeFrame}',''), 'week'), '"','')) AS k
          )
          SELECT
            l.student_name,
            l.period,
            l.destination,
            l.duration AS duration_minutes,
            l.timeout,
            l.timein
          FROM public.hp_longest_windows l
          JOIN tf ON l."window" = tf.k
          ORDER BY l.duration DESC, l.timeout DESC
          LIMIT 10
        `
      });

      if (longestError) throw longestError;
      setLongestPassData(longestPasses || []);

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
        
        <div className="flex rounded-lg bg-muted p-1">
          {timeFrameOptions.map((option) => (
            <Button
              key={option}
              variant={timeFrame === option ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFrame(option)}
              className="relative"
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
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
              "{timeFrame || "week"}"
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