
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, RefreshCw, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HallPassRecord, updateReturnTime } from "@/lib/supabaseDataManager";
import { useToast } from "@/hooks/use-toast";
import { getElapsedMinutes, formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";
import OutTimer from "./OutTimer";

interface MultipleStudentsViewProps {
  records: HallPassRecord[];
  onBack: () => void;
  onRefresh: () => void;
}

const MultipleStudentsView = ({ records, onBack, onRefresh }: MultipleStudentsViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleBackClick = () => {
    navigate("/");
  };

  const handleSignOutAnother = () => {
    navigate("/");
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const getRowColor = (timeOut: Date) => {
    const elapsed = getElapsedMinutes(timeOut);
    if (elapsed < 5) return 'bg-green-50 border-green-200';
    if (elapsed < 10) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // If exactly one student, show large card layout
  if (records.length === 1) {
    const student = records[0];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={handleBackClick}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-800">Student Currently Out</h1>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button 
                onClick={handleSignOutAnother}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" />
                Sign Out Another
              </Button>
            </div>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className={`p-8 rounded-lg border-2 ${getRowColor(student.timeOut)}`}>
                <div className="text-center space-y-6">
                  <div className="text-6xl font-bold text-gray-800">{student.studentName}</div>
                  <div className="space-y-2">
                    <div className="text-2xl text-gray-600">Period {student.period}</div>
                    <div className="text-xl text-gray-600">{student.destination || 'Unknown'}</div>
                  </div>
                  <div className="text-center">
                    <OutTimer timeOut={student.timeOut} className="text-7xl" />
                  </div>
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStudentReturn(student.studentName, student.period)}
                  >
                    Mark Returned
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Multiple students - show compact list layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={handleBackClick}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Students Currently Out</h1>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleSignOutAnother}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              Sign Out Another
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              {records.length} Student{records.length !== 1 ? 's' : ''} Currently Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students are currently out.
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div 
                    key={`${record.studentName}-${record.period}`}
                    className={`p-4 rounded-lg border-2 ${getRowColor(record.timeOut)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold text-gray-800">
                            {record.studentName}
                          </div>
                          <div className="text-sm text-gray-600">
                            Period {record.period}
                          </div>
                          <div className="text-sm text-gray-600">
                            {record.destination || 'Unknown'}
                          </div>
                          <OutTimer timeOut={record.timeOut} />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStudentReturn(record.studentName, record.period)}
                      >
                        Mark Returned
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MultipleStudentsView;
