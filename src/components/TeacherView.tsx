import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Users, BarChart3, UserCheck, UserCog, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import AnalyticsView from "./AnalyticsView";
import NameCorrections from "./NameCorrections";
import { CLASSROOM_ID } from "@/config/classroom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchTodaySignouts, recordDaySignout, type DaySignout } from "@/lib/earlyDismissalRepository";

const PERIODS = ["A","B","C","D","E","F","G","H","House Small Group"];

// Dev-only debug flag: set to true to log fetch triggers
const DEBUG = false;

// Diagnostic flag for investigating reload-while-frozen issue
// Set to true ONLY for debugging mount/unmount/render behavior
const DEBUG_DIAG = false;

interface TeacherViewProps {
  onBack: () => void;
}

// Enhanced interface matching the optimized RPC function
interface DashboardData {
  currentlyOutStudents: Array<{
    studentName: string;
    period: string;
    timeOut: string;
    destination: string;
    minutesOut: number;
  }>;
  currentlyOutCount: number;
  todayStats: {
    totalPasses: number;
    byPeriod: Record<string, number>;
    topLeavers: Array<{
      studentName: string;
      totalMinutes: number;
    }>;
    avgDurationMinutes: number;
    longestDurationMinutes: number;
    totalStudentsOut: number;
    returnRate: number;
  };
  lastUpdated: string;
  refreshInterval: number;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  // Diagnostic: track mount/unmount
  React.useEffect(() => {
    if (!DEBUG_DIAG) return;
    console.log('[MOUNT] TeacherView');
    return () => console.log('[UNMOUNT] TeacherView');
  }, []);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'corrections'>('overview');
  const [weeklyTopStudents, setWeeklyTopStudents] = useState<Array<{ studentName: string; totalMinutes: number; tripCount: number }>>([]);
  
  // Early dismissal state
  const [todaySignouts, setTodaySignouts] = useState<DaySignout[]>([]);
  const [signoutDialogOpen, setSignoutDialogOpen] = useState(false);
  const [signoutStudentName, setSignoutStudentName] = useState("");
  const [signoutReason, setSignoutReason] = useState("");
  const [signoutSubmitting, setSignoutSubmitting] = useState(false);

  const loadDashboardData = async (reason: string = 'unknown') => {
    if (DEBUG) console.log('[TeacherView] fetch reason:', reason);
    if (DEBUG_DIAG) console.log('[SUPABASE] TeacherView.loadDashboardData() | reason:', reason, '| ts:', new Date().toISOString());
    setLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabase.rpc('get_teacher_dashboard_data');
      
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      setDashboardData(data as unknown as DashboardData);
      
      // Load weekly top students (bathroom-only) from hp_frequent_flyers_bathroom_windows view
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('hp_frequent_flyers_bathroom_windows')
        .select('student_name, passes, total_minutes, avg_minutes')
        .eq('window', 'week')
        .order('passes', { ascending: false })
        .limit(5);
      if (!weeklyError && weeklyData) {
        // Map view columns to the expected interface
        setWeeklyTopStudents(weeklyData.map(row => ({
          studentName: row.student_name,
          totalMinutes: Math.round(Number(row.total_minutes)),
          tripCount: row.passes
        })));
      }
      
      // Load today's early dismissal signouts
      const signouts = await fetchTodaySignouts(CLASSROOM_ID);
      setTodaySignouts(signouts);
      
      setLoading(false);
    } catch (error) {
      setErr('Failed to load dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip polling when not on overview tab to prevent background fetches
    // from triggering loading states / re-renders on Analytics or Corrections
    if (activeView !== 'overview') return;

    loadDashboardData('mount');
    // Use dynamic refresh interval from server, fallback to 60s
    const refreshInterval = dashboardData?.refreshInterval || 60000;
    const interval = setInterval(() => {
      loadDashboardData('interval');
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [activeView, dashboardData?.refreshInterval]);

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
      loadDashboardData('student-return');
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Return failed', 
        description: 'An unexpected error occurred' 
      });
    }
  };

  const handleCloseCurrentlyOut = () => {
    // This could be used to hide the currently out display if needed
    // For now, we'll keep it always visible in the teacher view
  };

  const handleRecordEarlyDismissal = async () => {
    if (!signoutStudentName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing student name",
        description: "Please enter a student name.",
      });
      return;
    }

    setSignoutSubmitting(true);
    try {
      const result = await recordDaySignout(
        CLASSROOM_ID,
        signoutStudentName.trim(),
        signoutReason.trim() || undefined,
        "Mr. Garnett"
      );

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Failed to record",
          description: result.error || "Unknown error",
        });
        setSignoutSubmitting(false);
        return;
      }

      toast({
        title: "Early dismissal recorded",
        description: `${result.student_name} has been signed out for the day.`,
      });

      // Reset form and close dialog
      setSignoutStudentName("");
      setSignoutReason("");
      setSignoutDialogOpen(false);

      // Refresh the signouts list
      const signouts = await fetchTodaySignouts(CLASSROOM_ID);
      setTodaySignouts(signouts);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setSignoutSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="text-lg text-gray-600">Loading dashboard data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="text-lg text-red-600">Error: {err}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="text-lg text-gray-600">No data available</div>
          </div>
        </div>
      </div>
    );
  }

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
            <Button
              variant={activeView === 'corrections' ? 'default' : 'outline'}
              onClick={() => setActiveView('corrections')}
              className="flex items-center gap-2"
            >
              <UserCog className="w-4 h-4" />
              Name Corrections
            </Button>
          </div>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard 
                label="Currently Out" 
                value={dashboardData.currentlyOutCount.toString()} 
              />
              <StatCard 
                label="Today's Passes" 
                value={dashboardData.todayStats.totalPasses.toString()} 
              />
              <StatCard 
                label="Return Rate" 
                value={`${dashboardData.todayStats.returnRate}%`} 
              />
              <StatCard 
                label="Avg Duration" 
                value={`${dashboardData.todayStats.avgDurationMinutes}m`} 
              />
            </div>

            {dashboardData.currentlyOutCount === 0 ? (
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
                students={dashboardData.currentlyOutStudents.map(student => ({
                  ...student,
                  timeOut: new Date(student.timeOut)
                }))}
                onStudentReturn={handleStudentReturn}
                onClose={handleCloseCurrentlyOut}
              />
            )}

            {/* This Week's Top Students (Bathroom Only) */}
            {weeklyTopStudents.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>This Week's Most Active Students</CardTitle>
                  <p className="text-sm text-muted-foreground">Bathroom trips only</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weeklyTopStudents.map((student, index) => (
                      <div key={student.studentName} className="flex justify-between items-center p-2 rounded bg-gray-50">
                        <span className="font-medium">#{index + 1} {student.studentName}</span>
                        <span className="text-sm text-gray-600">{student.totalMinutes} min ({student.tripCount} trips)</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Early Dismissals Today */}
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-amber-600" />
                    Signed Out Today
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Early dismissals ({todaySignouts.length} student{todaySignouts.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <Dialog open={signoutDialogOpen} onOpenChange={setSignoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Record
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Record Early Dismissal</DialogTitle>
                      <DialogDescription>
                        Sign a student out for the day. This does not affect Currently Out or analytics.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="signout-name">Student Name</Label>
                        <Input
                          id="signout-name"
                          value={signoutStudentName}
                          onChange={(e) => setSignoutStudentName(e.target.value)}
                          placeholder="First Last"
                          autoFocus
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="signout-reason">Reason (optional)</Label>
                        <Input
                          id="signout-reason"
                          value={signoutReason}
                          onChange={(e) => setSignoutReason(e.target.value)}
                          placeholder="e.g., Doctor's appointment"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSignoutDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleRecordEarlyDismissal}
                        disabled={signoutSubmitting || !signoutStudentName.trim()}
                      >
                        {signoutSubmitting ? "Recording..." : "Record Signout"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {todaySignouts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No early dismissals recorded today.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {todaySignouts.map((signout) => (
                      <div key={signout.id} className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-100">
                        <div>
                          <span className="font-medium">{signout.student_name}</span>
                          {signout.reason && (
                            <span className="text-sm text-gray-600 ml-2">— {signout.reason}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(signout.created_at).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'analytics' && (
          <AnalyticsView />
        )}

        {activeView === 'corrections' && (
          <NameCorrections />
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
