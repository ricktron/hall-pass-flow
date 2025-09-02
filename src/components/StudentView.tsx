
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StudentSignOutForm from "./StudentSignOutForm";
import CurrentOutList from "./CurrentOutList";
import SoloStudentView from "./SoloStudentView";
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
  // State Management
  const [currentStudents, setCurrentStudents] = useState<StudentRecord[]>([]);
  const [showForm, setShowForm] = useState(true);

  // Data Fetching
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

  // Initial data load
  useEffect(() => {
    loadCurrentStudents();
  }, []);

  // Event Handlers
  const handleSignOut = async (studentRecord: StudentRecord) => {
    // Sign-out operation is completed by StudentSignOutForm before calling this callback
    await loadCurrentStudents();
    setShowForm(false);
  };

  const handleEarlyDismissal = (studentName: string) => {
    // Handle early dismissal - set form back to show for next student
    setShowForm(true);
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    // Reload students after return
    await loadCurrentStudents();
    setShowForm(true);
  };

  const handleSignOutAnother = () => {
    setShowForm(true);
  };

  const handleBackClick = () => {
    onBack();
  };

  // Rendering Logic
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleBackClick}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Student Sign Out</h1>
        </div>

        <div className="space-y-6">
          {showForm ? (
            <StudentSignOutForm onSignOut={handleSignOut} onEarlyDismissal={handleEarlyDismissal} />
          ) : currentStudents.length === 1 ? (
            <SoloStudentView student={currentStudents[0]} onStudentReturn={handleStudentReturn} onSignOutAnother={handleSignOutAnother} />
          ) : currentStudents.length > 1 ? (
            <CurrentOutList students={currentStudents} onStudentReturn={handleStudentReturn} onSignOutAnother={handleSignOutAnother} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
