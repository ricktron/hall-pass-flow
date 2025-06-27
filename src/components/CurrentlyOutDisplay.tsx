
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, X } from "lucide-react";
import { getElapsedMinutes } from "@/lib/timeUtils";
import OutTimer from "./OutTimer";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface CurrentlyOutDisplayProps {
  students: StudentRecord[];
  onStudentReturn: (studentName: string, period: string) => void;
  onClose: () => void;
}

const CurrentlyOutDisplay = ({ students, onStudentReturn, onClose }: CurrentlyOutDisplayProps) => {
  const getBackgroundColor = (timeOut: Date) => {
    const elapsedMinutes = getElapsedMinutes(timeOut);
    if (elapsedMinutes < 5) return 'bg-green-100 border-green-300';
    if (elapsedMinutes < 10) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Currently Out ({students.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {students.map((student, index) => (
          <div 
            key={`${student.studentName}-${student.period}-${index}`}
            className={`p-4 rounded-lg border-2 ${getBackgroundColor(student.timeOut)}`}
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
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                onClick={() => onStudentReturn(student.studentName, student.period)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Returned
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CurrentlyOutDisplay;
