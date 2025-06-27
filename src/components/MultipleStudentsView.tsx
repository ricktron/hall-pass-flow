
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HallPassRecord, updateReturnTime } from "@/lib/supabaseDataManager";
import { calculateElapsedTime, formatElapsedTime, getElapsedMinutes } from "@/lib/timeUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MultipleStudentsViewProps {
  records: HallPassRecord[];
  onBack: () => void;
  onRefresh: () => void;
}

const DESTINATION_COLORS = {
  "Bathroom": "bg-orange-100 border-orange-300",
  "Nurse": "bg-red-100 border-red-300",
  "Counselor": "bg-blue-100 border-blue-300",
  "Dean of Students": "bg-purple-100 border-purple-300",
  "Dean of Academics": "bg-green-100 border-green-300",
  "Locker": "bg-gray-100 border-gray-300",
  "Football Meeting": "bg-yellow-100 border-yellow-300",
  "Other": "bg-pink-100 border-pink-300"
};

const MultipleStudentsView = ({ records, onBack, onRefresh }: MultipleStudentsViewProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [currentAverage, setCurrentAverage] = useState(0);
  const { toast } = useToast();

  // Update current time every second for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate real-time average of students currently out
  useEffect(() => {
    if (records.length > 0) {
      const now = new Date();
      const totalMinutes = records.reduce((sum, record) => {
        const elapsedMs = calculateElapsedTime(record.timeOut, now);
        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
        return sum + elapsedMinutes;
      }, 0);
      const average = Math.round(totalMinutes / records.length);
      setCurrentAverage(average);
    } else {
      setCurrentAverage(0);
    }
  }, [records, currentTime]);

  // Load historical weekly average from completed trips
  const loadWeeklyAverage = async () => {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      console.log("Loading weekly average for completed trips since:", oneWeekAgo);
      
      const { data: pastTrips, error } = await supabase
        .from('Hall_Passes')
        .select('timeOut, timeIn, duration')
        .gte('timeOut', oneWeekAgo)
        .not('timeIn', 'is', null)
        .not('duration', 'is', null)
        .gt('duration', 0)
        .eq('earlyDismissal', false);

      if (error) {
        console.error("Error fetching past trips:", error);
        return;
      }

      console.log("Past trips found:", pastTrips?.length || 0);

      if (!pastTrips || pastTrips.length === 0) {
        setWeeklyAverage(0);
        return;
      }

      const durations = pastTrips.map(trip => {
        const durationMinutes = Math.abs(Number(trip.duration) || 0);
        return Math.max(0, Math.round(durationMinutes));
      });

      console.log("Trip durations (minutes):", durations);

      const average = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      console.log("Calculated weekly average:", average, "minutes");
      setWeeklyAverage(average);
    } catch (error) {
      console.error("Error calculating weekly average:", error);
      setWeeklyAverage(0);
    }
  };

  useEffect(() => {
    loadWeeklyAverage();
  }, [records]);

  const getDurationColor = (minutes: number) => {
    if (minutes < 5) return "text-green-600";
    if (minutes <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getRowColor = (minutes: number, destination: string) => {
    const destinationColor = DESTINATION_COLORS[destination as keyof typeof DESTINATION_COLORS] || "bg-gray-100 border-gray-300";
    
    if (minutes > 10) return `${destinationColor} border-l-4 border-l-red-500`;
    if (minutes > 5) return `${destinationColor} border-l-4 border-l-yellow-500`;
    return `${destinationColor} border-l-4 border-l-green-500`;
  };

  const handleMarkReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      onRefresh();
      loadWeeklyAverage();
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const formatStudentName = (fullName: string) => {
    if (!fullName || fullName.trim() === '') {
      return 'Unknown Student';
    }
    
    const trimmedName = fullName.trim();
    
    if (trimmedName.length <= 15 || !trimmedName.includes(' ')) {
      return trimmedName;
    }
    
    const parts = trimmedName.split(' ');
    
    if (parts.length === 2 && trimmedName.length <= 25) {
      return trimmedName;
    }
    
    if (trimmedName.length > 25) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    
    return trimmedName;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Students Currently Out</h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {records.length} Student{records.length !== 1 ? 's' : ''} Currently Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {records.map((record) => {
              const elapsedMs = calculateElapsedTime(record.timeOut, currentTime);
              const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
              const studentName = formatStudentName(record.studentName);
              
              return (
                <div 
                  key={record.id}
                  className={`p-4 rounded-lg border-2 ${getRowColor(elapsedMinutes, record.destination || 'Other')}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="font-bold text-lg">{studentName}</div>
                        <div className="text-sm text-gray-600">
                          Period {record.period}
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.destination || 'Unknown'}
                        </div>
                        <div className={`font-mono text-lg font-bold ${getDurationColor(elapsedMinutes)}`}>
                          {formatElapsedTime(elapsedMs)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                      onClick={() => handleMarkReturn(record.studentName, record.period)}
                    >
                      Returned
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {records.length > 0 && (
              <div className="text-center p-4 bg-gray-50 rounded-lg mt-6">
                <div className="text-lg font-semibold text-gray-700">
                  Current Average Time Out: {currentAverage} minutes
                  <div className="text-sm text-gray-500 mt-1">
                    (Real-time average of students currently out)
                  </div>
                  {weeklyAverage > 0 && (
                    <div className="text-sm text-gray-500 mt-2">
                      Weekly average from completed trips: {weeklyAverage} minutes
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MultipleStudentsView;
