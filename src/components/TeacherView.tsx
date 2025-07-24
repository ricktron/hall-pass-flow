import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BarChart3, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import AnalyticsPanel from "./AnalyticsPanel";
import { getCurrentlyOutRecords, getAnalytics, updateReturnTime } from "@/lib/supabaseDataManager";
import { CLASSROOM_ID } from "@/config/classroom";
import { useToast } from "@/hooks/use-toast";

interface TeacherViewProps {
  onBack: () => void;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentlyOutCount, setCurrentlyOutCount] = useState(0);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalTripsToday: 0,
    mostFrequentToday: [],
    mostFrequentWeek: [],
    longestTripToday: {
      duration: 0,
      student: '',
      durationFormatted: '00:00:00'
    },
    tripsPerPeriod: {},
    averageDuration: 0,
    averageDurationFormatted: '00:00:00'
  });
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
    const analyticsData = await getAnalytics();
    setAnalytics(analyticsData);
  };

  useEffect(() => {
    loadCurrentlyOutCount();
    loadAnalytics();
    const interval = setInterval(() => {
      loadCurrentlyOutCount();
      loadAnalytics();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBackClick = () => {
    onBack();
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      loadCurrentlyOutCount();
      loadAnalytics();
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

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
          <AnalyticsPanel analytics={analytics} />
        )}
      </div>
    </div>
  );
};

export default TeacherView;
