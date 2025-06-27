
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateReturnTime, getWeeklyStats } from "@/lib/supabaseDataManager";
import { getElapsedMinutes } from "@/lib/timeUtils";
import OutTimer from "./OutTimer";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface SoloStudentViewProps {
  student: StudentRecord;
  onStudentReturn: (studentName: string, period: string) => void;
  onSignOutAnother: () => void;
}

const SoloStudentView = ({ student, onStudentReturn, onSignOutAnother }: SoloStudentViewProps) => {
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const loadWeeklyStats = async () => {
      const stats = await getWeeklyStats(student.studentName);
      setWeeklyAverage(stats.averageMinutes);
    };
    loadWeeklyStats();
  }, [student.studentName]);

  const handleMarkReturn = async () => {
    const success = await updateReturnTime(student.studentName, student.period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${student.studentName} has been marked as returned.`,
      });
      onStudentReturn(student.studentName, student.period);
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const elapsedMinutes = getElapsedMinutes(student.timeOut);

  const getBackgroundColor = () => {
    if (elapsedMinutes < 5) return 'bg-green-100 border-green-300';
    if (elapsedMinutes < 10) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Student Currently Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`p-8 rounded-lg border-2 ${getBackgroundColor()}`}>
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-gray-800">{student.studentName}</div>
                <div className="text-xl text-gray-600">Period {student.period}</div>
                <div className="text-lg text-gray-600">{student.destination}</div>
                <div className="text-center">
                  <OutTimer timeOut={student.timeOut} className="text-8xl" />
                </div>
                <div className="text-lg text-gray-600 mt-4">
                  {student.studentName} has been out for {elapsedMinutes} minutes. 
                  The weekly average is {weeklyAverage} minutes.
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                size="lg"
                className="flex-1 py-6 text-xl bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkReturn}
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                Returned
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 py-6 text-xl"
                onClick={onSignOutAnother}
              >
                <UserPlus className="w-6 h-6 mr-2" />
                Another Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoloStudentView;
