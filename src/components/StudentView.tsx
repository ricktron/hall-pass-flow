
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentSignOutForm from "./StudentSignOutForm";
import CurrentOutList from "./CurrentOutList";
import SoloStudentView from "./SoloStudentView";
import HaveAGreatDayMessage from "./HaveAGreatDayMessage";
import PostSignoutConfirmation from "./PostSignoutConfirmation";
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
  const navigate = useNavigate();
  const [currentStudents, setCurrentStudents] = useState<StudentRecord[]>([]);
  const [showGreatDayMessage, setShowGreatDayMessage] = useState(false);
  const [earlyDismissalStudent, setEarlyDismissalStudent] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [signedOutStudent, setSignedOutStudent] = useState<StudentRecord | null>(null);

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
    // Sign-out operation is completed by StudentSignOutForm before calling this callback
    
    // Set the signed out student to show PostSignoutConfirmation
    setSignedOutStudent(studentRecord);
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
    setSignedOutStudent(null);
  };

  const handlePostSignoutComplete = () => {
    setSignedOutStudent(null);
    // Determine view based on current students count
    if (currentStudents.length <= 1) {
      setShowForm(true);
    } else {
      setShowForm(false); // Show CurrentOutList for multiple students
    }
  };

  const handlePostSignoutAnother = (students: StudentRecord[]) => {
    setSignedOutStudent(null);
    setShowForm(true);
  };

  const handleBackClick = () => {
    onBack();
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

  // Show PostSignoutConfirmation after a student signs out
  if (signedOutStudent) {
    return (
      <PostSignoutConfirmation
        studentName={signedOutStudent.studentName}
        period={signedOutStudent.period}
        timeOut={signedOutStudent.timeOut}
        destination={signedOutStudent.destination}
        onComplete={handlePostSignoutComplete}
        onSignOutAnother={handlePostSignoutAnother}
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
