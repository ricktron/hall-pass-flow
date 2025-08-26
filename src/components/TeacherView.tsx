import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BarChart3, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import AnalyticsView from "./AnalyticsView";
import { getCurrentlyOutRecords } from "@/lib/supabaseDataManager";
import { CLASSROOM_ID } from "@/config/classroom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { centralTodayBoundsISO, fmtHMS } from "@/utils/time";

type PassRow = {
  id: string | number;
  period: string;
  studentName: string;
  timeOut: string;   // ISO
  timeIn: string | null; // ISO or null
};

const PERIODS = ["A","B","C","D","E","F","G","H","House Small Group"];

interface TeacherViewProps {
  onBack: () => void;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentlyOutCount, setCurrentlyOutCount] = useState(0);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState([]);
  const [{ startISO, endISO }] = useState(centralTodayBoundsISO());
  const [rows, setRows] = useState<PassRow[]>([]);
  const [openRows, setOpenRows] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');

  const loadCurrentlyOutCount = async () => {
    const records = await getCurrentlyOutRecords();
    setCurrentlyOutCount(records.length);
    setCurrentlyOutStudents(records.map(record => ({
      studentName: record.studentName,
      period: record.period,
      timeOut: record.timeOut,
      destination: record.destination || 'Unknown'
    })));
  };

  const loadAnalytics = async () => {
    let alive = true;

    setLoading(true);
    setErr(null);

    // Today's rows (based on timeOut)
    const { data: today, error: e1 } = await supabase
      .from("Hall_Passes")
      .select("id, period, studentName, timeOut, timeIn")
      .gte("timeOut", startISO)
      .lt("timeOut", endISO);

    if (e1) { if (alive) { setErr(e1.message); setLoading(false); } return; }

    // Still-out rows older than 30 minutes
    const thirtyAgoISO = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: opens, error: e2 } = await supabase
      .from("Hall_Passes")
      .select("id, period, studentName, timeOut, timeIn")
      .is("timeIn", null)
      .lt("timeOut", thirtyAgoISO);

    if (e2) { if (alive) { setErr(e2.message); setLoading(false); } return; }

    if (alive) {
      setRows((today ?? []) as PassRow[]);
      setOpenRows((opens ?? []) as PassRow[]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentlyOutCount();
    loadAnalytics();
    const interval = setInterval(() => {
      loadCurrentlyOutCount();
      loadAnalytics();
    }, 60000); // 60s refresh for analytics
    return () => clearInterval(interval);
  }, [startISO, endISO]);

  const handleBackClick = () => {
    onBack();
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    try {
      // Find the most recent record for this student where timeIn is null
      const { data: records, error: fetchError } = await supabase
        .from('Hall_Passes')
        .select('*')
        .eq('studentName', studentName)
        .eq('period', period)
        .is('timeIn', null)
        .order('timeOut', { ascending: false })
        .limit(1);

      if (fetchError) {
        toast({ 
          variant: 'destructive', 
          title: 'Return failed', 
          description: `${fetchError.code ?? ''} ${fetchError.message}`.trim() 
        });
        return;
      }

      if (!records || records.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'Return failed', 
          description: 'No active hall pass record found' 
        });
        return;
      }

      const { error } = await supabase
        .from('Hall_Passes')
        .update({ timeIn: new Date().toISOString() })
        .eq('id', records[0].id);

      if (error) {
        toast({ 
          variant: 'destructive', 
          title: 'Return failed', 
          description: `${error.code ?? ''} ${error.message}`.trim() 
        });
        return;
      }

      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      loadCurrentlyOutCount();
      loadAnalytics();
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Return failed', 
        description: 'An unexpected error occurred' 
      });
    }
  };

  const byPeriod = useMemo(() => {
    const map: Record<string, number> = Object.fromEntries(PERIODS.map(p => [p, 0]));
    for (const r of rows) {
      map[r.period] = (map[r.period] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const topLeavers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.studentName, (counts.get(r.studentName) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [rows]);

  const { totalTrips, longestMs, avgMs } = useMemo(() => {
    const finished = rows.filter(r => !!r.timeIn);
    const durs = finished.map(r => new Date(r.timeIn as string).getTime() - new Date(r.timeOut).getTime());
    const total = rows.length;
    const longest = durs.length ? Math.max(...durs) : 0;
    const avg = durs.length ? durs.reduce((a,b)=>a+b,0) / durs.length : 0;
    return { totalTrips: total, longestMs: longest, avgMs: avg };
  }, [rows]);

  const handleCloseCurrentlyOut = () => {
    // This could be used to hide the currently out display if needed
    // For now, we'll keep it always visible in the teacher view
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleBackClick}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-lg text-gray-600">Mr. Garnett — {CLASSROOM_ID}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeView === 'overview' ? 'default' : 'outline'}
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Overview
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveView('analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
          </div>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            {currentlyOutCount === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="py-16">
                  <div className="text-center">
                    <UserCheck className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-70" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      All students are currently in class.
                    </h2>
                    <p className="text-lg text-gray-600">
                      No hall passes are currently active.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <CurrentlyOutDisplay 
                students={currentlyOutStudents}
                onStudentReturn={handleStudentReturn}
                onClose={handleCloseCurrentlyOut}
              />
            )}
          </div>
        )}

        {activeView === 'analytics' && (
          <AnalyticsView />
        )}
      </div>
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-4">
        <div className="text-sm opacity-70 mb-1">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const widthPct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm font-medium">{label === 'House Small Group' ? label : `Period ${label}`}</div>
      <div className="flex-1 h-3 rounded bg-muted">
        <div className="h-3 rounded bg-primary transition-all duration-300" style={{ width: `${widthPct}%` }} />
      </div>
      <div className="w-8 text-right text-sm font-semibold">{value}</div>
    </div>
  );
}

export default TeacherView;
