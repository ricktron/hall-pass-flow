
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateReturnTime } from "@/lib/supabaseDataManager";
import { calculateElapsedTime } from "@/lib/timeUtils";
import OutTimer from "./OutTimer";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface CurrentOutListProps {
  students: StudentRecord[];
  onStudentReturn: (studentName: string, period: string) => void;
  onSignOutAnother: () => void;
}

const CurrentOutList = ({ students, onStudentReturn, onSignOutAnother }: CurrentOutListProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update current time every second for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      onStudentReturn(studentName, period);
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const getBackgroundColor = (timeOut: Date) => {
    const elapsedSeconds = calculateElapsedTime(timeOut.toISOString());
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 5) return 'bg-green-100 border-green-300';
    if (elapsedMinutes < 10) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getCurrentAverage = () => {
    if (students.length === 0) return 0;
    
    const totalMinutes = students.reduce((sum, student) => {
      const elapsedSeconds = calculateElapsedTime(student.timeOut.toISOString());
      const elapsed = Math.floor(elapsedSeconds / 60);
      return sum + elapsed;
    }, 0);
    
    const average = Math.round(totalMinutes / students.length);
    return average;
  };

  const formatStudentName = (fullName: string) => {
    if (!fullName || fullName.trim() === '') {
      return 'Unknown Student';
    }
    
    const trimmedName = fullName.trim();
    
    // Always return full name unless it's extremely long
    if (trimmedName.length <= 30) {
      return trimmedName;
    }
    
    // Only abbreviate if really necessary
    const parts = trimmedName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    
    return trimmedName;
  };

  if (students.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Students Currently Out ({students.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {students.map((student, index) => {
            const studentName = formatStudentName(student.studentName);
            
            return (
              <div 
                key={`${student.studentName}-${student.period}-${index}`}
                className={`p-4 rounded-lg border-2 ${getBackgroundColor(student.timeOut)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="font-bold text-lg">{studentName}</div>
                      <div className="text-sm text-gray-600">Period {student.period}</div>
                      <div className="text-sm text-gray-600">{student.destination}</div>
                      <OutTimer timeOut={student.timeOut} />
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                    onClick={() => handleMarkReturn(student.studentName, student.period)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Returned
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {students.length > 1 && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-700">
              Current Average Time Out: {getCurrentAverage()} minutes
              <div className="text-sm text-gray-500 mt-1">
                (Real-time average of students currently out)
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 py-3"
            onClick={onSignOutAnother}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Another Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentOutList;
