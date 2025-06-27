
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateReturnTime } from "@/lib/supabaseDataManager";
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
  onComplete: () => void;
}

const CurrentOutList = ({ students, onStudentReturn, onSignOutAnother, onComplete }: CurrentOutListProps) => {
  const { toast } = useToast();

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
            const elapsedMinutes = Math.floor(
              (new Date().getTime() - student.timeOut.getTime()) / (1000 * 60)
            );
            
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
                      <OutTimer timeOut={student.timeOut} />
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
  );
};

export default CurrentOutList;
