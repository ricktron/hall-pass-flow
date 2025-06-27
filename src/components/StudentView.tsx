
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StudentSignOutForm from "./StudentSignOutForm";
import CurrentOutList from "./CurrentOutList";
import SoloStudentView from "./SoloStudentView";
import HaveAGreatDayMessage from "./HaveAGreatDayMessage";
import { getCurrentlyOutRecords } from "@/lib/supabaseDataManager";

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
  const [showGreatDayMessage, setShowGreatDayMessage] = useState(false);
  const [earlyDismissalStudent, setEarlyDismissalStudent] = useState("");
  const [showForm, setShowForm] = useState(true);

  const loadCurrentStudents = async () => {
    const records = await getCurrentlyOutRecords();
    const studentRecords = records.map(record => ({
      studentName: record.studentName,
      period: record.period,
      timeOut: record.timeOut,
      destination: record.destination || 'Unknown'
    }));
    setCurrentStudents(studentRecords);
    return studentRecords;
  };

  useEffect(() => {
    loadCurrentStudents();
    const interval = setInterval(loadCurrentStudents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async (studentRecord: StudentRecord) => {
    // Reload the current students to get the most up-to-date list
    const updatedStudents = await loadCurrentStudents();
    
    // Always show the appropriate view based on student count
    if (updatedStudents.length === 1) {
      setShowForm(false); // Show solo view
    } else if (updatedStudents.length >= 2) {
      setShowForm(false); // Show list view
    }
  };

  const handleEarlyDismissal = (studentName: string) => {
    setEarlyDismissalStudent(studentName);
    setShowGreatDayMessage(true);
  };

  const handleGreatDayComplete = () => {
    setShowGreatDayMessage(false);
    setEarlyDismissalStudent("");
    setShowForm(true);
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    // Reload students after return to get accurate list
    const updatedStudents = await loadCurrentStudents();
    
    // Adjust view based on remaining students
    if (updatedStudents.length === 0) {
      setShowForm(true);
    } else if (updatedStudents.length === 1) {
      setShowForm(false); // Show solo view
    }
    // If multiple students remain, stay in list view (showForm remains false)
  };

  const handleSignOutAnother = () => {
    setShowForm(true);
  };

  // Show "Have a Great Day" message for early dismissals
  if (showGreatDayMessage) {
    return (
      <HaveAGreatDayMessage 
        studentName={earlyDismissalStudent}
        onComplete={handleGreatDayComplete}
      />
    );
  }

  // Show solo view for single student (when form is not showing and exactly 1 student)
  if (currentStudents.length === 1 && !showForm) {
    return (
      <SoloStudentView
        student={currentStudents[0]}
        onStudentReturn={handleStudentReturn}
        onSignOutAnother={handleSignOutAnother}
      />
    );
  }

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
          {showForm && (
            <StudentSignOutForm 
              onSignOut={handleSignOut} 
              onEarlyDismissal={handleEarlyDismissal}
            />
          )}
          {currentStudents.length >= 2 && !showForm && (
            <CurrentOutList 
              students={currentStudents}
              onStudentReturn={handleStudentReturn}
              onSignOutAnother={handleSignOutAnother}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
