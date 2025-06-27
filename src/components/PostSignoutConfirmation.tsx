
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, UserPlus, GraduationCap } from "lucide-react";
import { formatElapsedTime, getTorontoElapsedTime, updateReturnTime, addHallPassRecord } from "@/lib/supabaseDataManager";
import { useToast } from "@/hooks/use-toast";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface PostSignoutConfirmationProps {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
  onComplete: () => void;
  onSignOutAnother: (students: StudentRecord[]) => void;
}

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const PostSignoutConfirmation = ({ 
  studentName, 
  period, 
  timeOut, 
  destination,
  onComplete,
  onSignOutAnother
}: PostSignoutConfirmationProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [students, setStudents] = useState<StudentRecord[]>([{ studentName, period, timeOut, destination }]);
  const { toast } = useToast();

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
      
      // Remove student from the list
      const updatedStudents = students.filter(s => !(s.studentName === studentName && s.period === period));
      setStudents(updatedStudents);
      
      // If no students left, complete
      if (updatedStudents.length === 0) {
        onComplete();
      }
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const handleEarlyDismissal = async (studentName: string, period: string) => {
    try {
      const now = new Date();
      const dayOfWeek = DAYS_OF_WEEK[now.getDay()];
      
      const success = await addHallPassRecord({
        studentName,
        period,
        timeOut: now,
        timeIn: null,
        duration: null,
        dayOfWeek,
        destination: "Early Dismissal",
        earlyDismissal: true
      });

      if (success) {
        toast({
          title: "Early Dismissal Recorded",
          description: `${studentName} has been marked for early dismissal.`,
        });
        
        // Remove student from the list
        const updatedStudents = students.filter(s => !(s.studentName === studentName && s.period === period));
        setStudents(updatedStudents);
        
        // If no students left, complete
        if (updatedStudents.length === 0) {
          onComplete();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to record early dismissal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong with early dismissal.",
        variant: "destructive",
      });
    }
  };

  const handleAnotherOut = () => {
    onSignOutAnother(students);
  };

  const getElapsedTime = (timeOut: Date) => {
    return getTorontoElapsedTime(timeOut);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Students Currently Out ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Student rows */}
            <div className="space-y-4">
              {students.map((student, index) => {
                const elapsedMs = getElapsedTime(student.timeOut);
                const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                
                return (
                  <div 
                    key={`${student.studentName}-${student.period}-${index}`}
                    className={`p-4 rounded-lg border-2 ${
                      elapsedMinutes > 10 ? 'bg-red-50 border-red-300' :
                      elapsedMinutes > 5 ? 'bg-yellow-50 border-yellow-300' :
                      'bg-green-50 border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="font-bold text-lg">{student.studentName}</div>
                          <div className="text-sm text-gray-600">Period {student.period}</div>
                          <div className="text-sm text-gray-600">{student.destination}</div>
                          <div className={`font-mono text-lg font-bold ${
                            elapsedMinutes > 10 ? 'text-red-600' :
                            elapsedMinutes > 5 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {formatElapsedTime(elapsedMs)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                          onClick={() => handleMarkReturn(student.studentName, student.period)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Returned
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="px-6 py-3"
                          onClick={() => handleEarlyDismissal(student.studentName, student.period)}
                        >
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Early Dismissal
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 py-3"
                onClick={handleAnotherOut}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Another Out
              </Button>
              <Button
                size="lg"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700"
                onClick={onComplete}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostSignoutConfirmation;
