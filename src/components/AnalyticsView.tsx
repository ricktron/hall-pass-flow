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
  minutes_out: number;
}

interface ReturnRateData {
  pct_returned: number;
  still_out: number;
  total: number;
}

interface PeriodData {
  period: string;
  passes: number;
  minutes_out: number;
}

interface DestinationData {
  destination: string;
  passes: number;
  minutes_out: number;
  median_min: number;
  p90_min: number;
}

interface FrequentFlyerData {
  student_name: string;
  passes: number;
  minutes_out: number;
}

interface LongestPassData {
  student_name: string;
  period: string;
  destination: string;
  duration: number;
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
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [destinationData, setDestinationData] = useState<DestinationData[]>([]);
  const [frequentFlyerData, setFrequentFlyerData] = useState<FrequentFlyerData[]>([]);
  const [longestPassData, setLongestPassData] = useState<LongestPassData[]>([]);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load summary data
      const { data: summary, error: summaryError } = await supabase
        .from("hp_summary_windows" as any)
        .select("passes, minutes_out")
        .eq("window", timeFrame)
        .maybeSingle();

      if (summaryError) throw summaryError;
      setSummaryData(summary as unknown as SummaryData | null);

      // Load return rate data
      const { data: returnRate, error: returnRateError } = await supabase
        .from("hp_return_rate_windows" as any)
        .select("pct_returned, still_out, total")
        .eq("window", timeFrame)
        .maybeSingle();

      if (returnRateError) throw returnRateError;
      setReturnRateData(returnRate as unknown as ReturnRateData | null);

      // Load period data
      const { data: periods, error: periodError } = await supabase
        .from("hp_by_period_windows" as any)
        .select("period, passes, minutes_out")
        .eq("window", timeFrame)
        .order("passes", { ascending: false })
        .order("period");

      if (periodError) throw periodError;
      setPeriodData((periods as unknown as PeriodData[]) || []);

      // Load destination data
      const { data: destinations, error: destinationError } = await supabase
        .from("hp_by_destination_windows" as any)
        .select("destination, passes, minutes_out, median_min, p90_min")
        .eq("window", timeFrame)
        .order("passes", { ascending: false });

      if (destinationError) throw destinationError;
      setDestinationData((destinations as unknown as DestinationData[]) || []);

      // Load frequent flyer data
      const { data: frequentFlyers, error: frequentFlyerError } = await supabase
        .from("hp_frequent_flyers_windows" as any)
        .select("student_name, passes, minutes_out")
        .eq("window", timeFrame)
        .limit(10);

      if (frequentFlyerError) throw frequentFlyerError;
      setFrequentFlyerData((frequentFlyers as unknown as FrequentFlyerData[]) || []);

      // Load longest pass data
      const { data: longestPasses, error: longestError } = await supabase
        .from("hp_longest_windows" as any)
        .select("student_name, period, destination, duration, timeout, timein")
        .eq("window", timeFrame)
        .order("duration", { ascending: false })
        .order("timeout", { ascending: false })
        .limit(10);

      if (longestError) throw longestError;
      setLongestPassData((longestPasses as unknown as LongestPassData[]) || []);

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
    return `${rate.toFixed(1)}%`;
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

        {/* Minutes Out Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Minutes Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.minutes_out ?? 0} min
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
              {returnRateData ? formatReturnRate(returnRateData.pct_returned) : "No data"}
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
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passes" fill="var(--color-passes)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
              By Destination
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
                    <TableHead>Minutes</TableHead>
                    <TableHead>Median</TableHead>
                    <TableHead>P90</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinationData.map((row, index) => (
                    <TableRow 
                      key={index}
                      className={row.p90_min > 12 ? "bg-orange-50" : ""}
                    >
                      <TableCell className="font-medium">{row.destination}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.minutes_out} min</TableCell>
                      <TableCell>{row.median_min} min</TableCell>
                      <TableCell>{row.p90_min} min</TableCell>
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
                    <TableHead>Minutes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequentFlyerData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell>{row.passes}</TableCell>
                      <TableCell>{row.minutes_out} min</TableCell>
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
            Longest Single Passes
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
                  <TableHead>Duration</TableHead>
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
                    <TableCell>{row.duration} min</TableCell>
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