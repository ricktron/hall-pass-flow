import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StudentSignOutForm from "./StudentSignOutForm";
import CurrentOutList from "./CurrentOutList";
import SoloStudentView from "./SoloStudentView";
import HaveAGreatDayMessage from "./HaveAGreatDayMessage";
import { getCurrentlyOutRecords, HallPassRecord } from "@/lib/supabaseDataManager";

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
  const [showForm, setShowForm] = useState(true);
  const [showGreatDayMessage, setShowGreatDayMessage] = useState(false);
  const [earlyDismissalStudent, setEarlyDismissalStudent] = useState("");

  const loadCurrentStudents = async () => {
    const records = await getCurrentlyOutRecords();
    const transformedRecords = records.map(record => ({
      ...record,
      destination: record.destination || 'Unknown'
    }));
    setCurrentStudents(transformedRecords);
    return transformedRecords;
  };

  useEffect(() => {
    loadCurrentStudents();
  }, []);

  const handleSignOut = async (studentRecord: StudentRecord) => {
    await loadCurrentStudents();
    setShowForm(false);
  };

  const handleEarlyDismissal = (studentName: string) => {
    setEarlyDismissalStudent(studentName);
    setShowGreatDayMessage(true);
  };

  const handleGreatDayComplete = () => {
    setShowGreatDayMessage(false);
    setEarlyDismissalStudent("");
    setShowForm(true);
    onBack();
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    const updatedStudents = await loadCurrentStudents();
    if (updatedStudents.length === 0) {
      setShowForm(true);
    }
  };

  const handleSignOutAnother = () => {
    setShowForm(true);
  };

  if (showGreatDayMessage) {
    return (
      <HaveAGreatDayMessage
        studentName={earlyDismissalStudent}
        onComplete={handleGreatDayComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            type="button"
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
          {showForm ? (
            <StudentSignOutForm
              onSignOut={handleSignOut}
              onEarlyDismissal={handleEarlyDismissal}
            />
          ) : currentStudents.length === 1 ? (
            <SoloStudentView
              student={currentStudents[0]}
              onStudentReturn={handleStudentReturn}
              onSignOutAnother={handleSignOutAnother}
            />
          ) : currentStudents.length > 1 ? (
            <CurrentOutList
              students={currentStudents}
              onStudentReturn={handleStudentReturn}
              onSignOutAnother={handleSignOutAnother}
            />
          ) : (
            // Fallback: If no students are out, show the form again.
            <StudentSignOutForm
              onSignOut={handleSignOut}
              onEarlyDismissal={handleEarlyDismissal}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;