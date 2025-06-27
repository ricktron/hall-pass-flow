
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StudentSignOutForm from "./StudentSignOutForm";
import CurrentOutList from "./CurrentOutList";

interface StudentViewProps {
  onBack: () => void;
}

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

const StudentView = ({ onBack }: StudentViewProps) => {
  const [currentStudents, setCurrentStudents] = useState<StudentRecord[]>([]);

  const handleSignOut = (studentRecord: StudentRecord) => {
    setCurrentStudents(prev => [...prev, studentRecord]);
  };

  const handleStudentReturn = (studentName: string, period: string) => {
    setCurrentStudents(prev => 
      prev.filter(s => !(s.studentName === studentName && s.period === period))
    );
  };

  const handleSignOutAnother = () => {
    // Form is already visible, just focus remains on form
  };

  const handleComplete = () => {
    setCurrentStudents([]);
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
          <h1 className="text-3xl font-bold text-gray-800">Student Sign Out</h1>
        </div>

        <div className="space-y-6">
          <StudentSignOutForm onSignOut={handleSignOut} />
          <CurrentOutList 
            students={currentStudents}
            onStudentReturn={handleStudentReturn}
            onSignOutAnother={handleSignOutAnother}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentView;
