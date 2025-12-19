
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { getCurrentlyOutRecords, updateReturnTime } from "@/lib/supabaseDataManager";
import { fetchStudents, type Student } from "@/lib/studentsRepository";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import StudentNameInput, { type SelectedStudent } from "./StudentNameInput";
import PeriodDestinationSelects from "./PeriodDestinationSelects";
import UnknownOverrideDialog from "./UnknownOverrideDialog";
import { useStudentSignOut } from "@/hooks/useStudentSignOut";
import { useToast } from "@/hooks/use-toast";

interface StudentSignOutFormProps {
  onSignOut: (studentRecord: {
    studentName: string;
    period: string;
    timeOut: Date;
    destination: string;
  }) => void;
  onEarlyDismissal: (studentName: string) => void;
}

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

const StudentSignOutForm = ({ onSignOut, onEarlyDismissal }: StudentSignOutFormProps) => {
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState<StudentRecord[]>([]);
  const [showCurrentlyOut, setShowCurrentlyOut] = useState(false);
  
  // Unknown override state
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideRawName, setOverrideRawName] = useState("");
  
  const { toast } = useToast();

  const { isSubmitting, handleSubmit } = useStudentSignOut({
    onSignOut,
    onEarlyDismissal
  });

  useEffect(() => {
    const loadStudents = async () => {
      const studentList = await fetchStudents();
      setStudents(studentList);
    };
    loadStudents();
  }, []);

  const loadCurrentlyOutStudents = async () => {
    const records = await getCurrentlyOutRecords();
    const studentRecords = records.map(record => ({
      studentName: record.studentName,
      period: record.period,
      timeOut: record.timeOut,
      destination: record.destination || 'Unknown'
    }));
    setCurrentlyOutStudents(studentRecords);
    return studentRecords;
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setSelectedPeriod("");
    setSelectedDestination("");
  };

  const handleStudentReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });
      // Refresh the currently out list
      await loadCurrentlyOutStudents();
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async () => {
    // Guard: require student selection
    if (!selectedStudent) {
      toast({
        title: "Pick your name first",
        description: "Please select your name from the list before signing out.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDestination) {
      toast({
        title: "Select a destination",
        description: "Please select where you are going.",
        variant: "destructive",
      });
      return;
    }

    const result = await handleSubmit(
      selectedStudent.id,
      selectedStudent.name,
      selectedPeriod,
      selectedDestination
    );
    
    if (result.success) {
      resetForm();
      setShowCurrentlyOut(false);
    } else if (result.isDuplicate) {
      // Load and show currently out students
      await loadCurrentlyOutStudents();
      setShowCurrentlyOut(true);
    }
  };

  const handleTeacherOverride = (rawName: string) => {
    setOverrideRawName(rawName);
    setShowOverrideDialog(true);
  };

  const handleOverrideSuccess = (data: { studentName: string; period: string; destination: string }) => {
    setShowOverrideDialog(false);
    setOverrideRawName("");
    
    // Trigger the same callback as normal sign-out
    onSignOut({
      studentName: data.studentName,
      period: data.period,
      timeOut: new Date(),
      destination: data.destination,
    });
    
    // Reset the form
    resetForm();
  };

  const handleOverrideCancel = () => {
    setShowOverrideDialog(false);
    setOverrideRawName("");
  };

  const isFormValid = selectedStudent !== null && selectedPeriod && selectedDestination;

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
          nextField.focus();
          // For select elements, trigger them to open
          if (nextField.tagName === 'BUTTON' && nextField.getAttribute('role') === 'combobox') {
            nextField.click();
          }
        }
      } else {
        // This is the submit button
        if (isFormValid) {
          handleFormSubmit();
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Hall Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StudentNameInput
            students={students}
            selectedStudent={selectedStudent}
            onStudentSelect={setSelectedStudent}
            onKeyDown={handleKeyDown}
            onTeacherOverride={handleTeacherOverride}
          />

          <PeriodDestinationSelects
            selectedPeriod={selectedPeriod}
            selectedDestination={selectedDestination}
            onPeriodChange={setSelectedPeriod}
            onDestinationChange={setSelectedDestination}
            onKeyDown={handleKeyDown}
          />

          <Button 
            type="button"
            id="signOutButton"
            className="w-full py-3 text-lg" 
            onClick={handleFormSubmit}
            onKeyDown={(e) => handleKeyDown(e)}
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? "Processing..." : "Sign Out"}
          </Button>

          <div className="text-center mt-4">
            <a 
              href="/sign-in" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Arriving late? Sign in instead.
            </a>
          </div>
        </CardContent>
      </Card>

      {showCurrentlyOut && currentlyOutStudents.length > 0 && (
        <CurrentlyOutDisplay
          students={currentlyOutStudents}
          onStudentReturn={handleStudentReturn}
          onClose={() => setShowCurrentlyOut(false)}
        />
      )}

      {/* Unknown Override Dialog */}
      <UnknownOverrideDialog
        isOpen={showOverrideDialog}
        rawName={overrideRawName}
        initialPeriod={selectedPeriod}
        initialDestination={selectedDestination}
        onSuccess={handleOverrideSuccess}
        onCancel={handleOverrideCancel}
      />
    </div>
  );
};

export default StudentSignOutForm;
