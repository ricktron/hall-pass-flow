import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, Clock, Users, TrendingUp, RefreshCw, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

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

const AUTO_KEY = "hp_analytics_auto";
const TF_KEY   = "hp_analytics_tf";
const BLUE = "hsl(217 91% 60%)"; // #3b82f6

const AnalyticsView = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TF_KEY) as TimeFrame | null;
      if (saved && ["Day","Week","Month","Quarter","All"].includes(saved)) return saved;
    }
    return "Week";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_KEY) === "true";
  });
  const [nonce, setNonce] = useState("init");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timeFrameOptions: TimeFrame[] = ["Day", "Week", "Month", "Quarter", "All"];

  const tfKey = timeFrame.toLowerCase();

  const loadBathroomFrequentFlyers = useCallback(async () => {
    const { data: flyers, error: flyersErr } = await supabase
      .from("hp_frequent_flyers_bathroom_windows")
      .select("student_name, passes, total_minutes, avg_minutes")
      .eq("window", tfKey)
      .order("passes", { ascending: false })
      .limit(15);

    if (flyersErr) throw flyersErr;

    setBathroomFlyers(flyers ?? []);
  }, [tfKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        s, rr, p, d, l, h, w, hm, dz, np
      ] = await Promise.all([
        supabase.from("hp_summary_windows").select("passes, minutes_out").eq("window", tfKey).maybeSingle(),
        supabase.from("hp_return_rate_windows").select("pct_returned, still_out, total").eq("window", tfKey).maybeSingle(),
        supabase.from("hp_by_period_windows").select("period, passes, minutes_out").eq("window", tfKey).gt("passes", 0).order("passes", { ascending: false }),
        supabase.from("hp_by_destination_windows").select("destination, passes, minutes_out, median_min, p90_min").eq("window", tfKey).gt("passes", 0).order("passes", { ascending: false }),
        supabase.from("hp_longest_windows").select("student_name, period, destination, duration, timeout, timein").eq("window", tfKey).or("destination.ilike.%bathroom%,destination.ilike.%restroom%").order("duration", { ascending: false }).limit(15),
        supabase.from("hp_behavior_hourly_windows").select("hour_24, passes").eq("window", tfKey).order("hour_24", { ascending: true }),
        supabase.from("hp_dayofweek_windows").select("dow_short, passes").eq("window", tfKey),
        supabase.from("hp_heatmap_windows").select("period, day, passes").eq("window", tfKey).gt("passes", 0),
        supabase.from("hp_disruption_windows").select("student_name, passes, minutes_out").eq("window", tfKey).gt("passes", 0).order("minutes_out", { ascending: false }).limit(15),
        supabase.from("hp_nurse_bathroom_pairs").select("student_name, first_dest, second_dest, minutes_between, prev_time, curr_time").order("minutes_between", { ascending: true }).limit(25)
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
      const order = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      setDow((w.data ?? []).sort((a,b)=> order.indexOf(a.dow_short)-order.indexOf(b.dow_short)));
      setHeatmap(hm.data ?? []);
      setDisruption(dz.data ?? []);
      setNursePairs(np.data ?? []);

      await loadBathroomFrequentFlyers();

      // Fetch streaks by period
      const st = await supabase
        .from("hp_streaks_by_period_windows")
        .select("student_name, period, cadence, start_date, end_date, streak_len")
        .order("streak_len", { ascending: false })
        .limit(20);
      if (st.error) throw st.error;
      setStreaks(st.data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [tfKey, loadBathroomFrequentFlyers]);

  // load on timeframe or manual refresh
  useEffect(() => { load(); }, [load, nonce]);

  // persist toggle
  useEffect(() => { localStorage.setItem(AUTO_KEY, autoRefresh ? "true" : "false"); }, [autoRefresh]);

  // persist timeframe selection
  useEffect(() => { localStorage.setItem(TF_KEY, timeFrame); }, [timeFrame]);

  // interval only when ON and tab visible
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      if (!document.hidden) setNonce(String(Date.now()));
    }, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const manualRefresh = () => setNonce(String(Date.now()));

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
      "hsl(214 95% 93%)","hsl(214 95% 87%)","hsl(213 94% 78%)",
      "hsl(213 94% 68%)","hsl(217 91% 60%)","hsl(221 83% 53%)"
    ];
    const idx = Math.min(Math.floor((passes / Math.max(max, 1)) * stops.length), stops.length - 1);
    return stops[idx];
  };
  const maxHeat = heatmap.reduce((m, r) => Math.max(m, r.passes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="text-muted-foreground">Windowed stats for passes and minutes</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={manualRefresh} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-sm">Auto refresh</Label>
            </div>
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
            <CardDescription>Students with most bathroom/restroom trips</CardDescription>
          </CardHeader>
          <CardContent>
            {bathroomFlyers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No bathroom passes in this window.</div>
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
                      <TableCell>{r.total_minutes.toFixed(1)} min</TableCell>
                      <TableCell>{r.avg_minutes.toFixed(1)} min</TableCell>
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
                    {["Mon","Tue","Wed","Thu","Fri"].map(d => (<TableHead key={d} className="text-center">{d}</TableHead>))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["A","B","C","D","E","F","G","H"].map(period => (
                    <TableRow key={period}>
                      <TableCell className="font-medium">{period}</TableCell>
                      {["Mon","Tue","Wed","Thu","Fri"].map(day => {
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
          <CardDescription>Consecutive class meetings with at least one pass (per period cadence)</CardDescription>
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
    </div>
  );
};

export default AnalyticsView;
