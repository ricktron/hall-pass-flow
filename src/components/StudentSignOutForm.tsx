
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { getStudentNames, getCurrentlyOutRecords, updateReturnTime } from "@/lib/supabaseDataManager";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import StudentNameInput from "./StudentNameInput";
import PeriodDestinationSelects from "./PeriodDestinationSelects";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState<StudentRecord[]>([]);
  const [showCurrentlyOut, setShowCurrentlyOut] = useState(false);
  const { toast } = useToast();

  const { isSubmitting, handleSubmit } = useStudentSignOut({
    onSignOut,
    onEarlyDismissal
  });

  useEffect(() => {
    const loadStudentNames = async () => {
      const names = await getStudentNames();
      setStudentNames(names);
    };
    loadStudentNames();
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
    setFirstName("");
    setLastName("");
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
    const result = await handleSubmit(firstName, lastName, selectedPeriod, selectedDestination);
    
    if (result.success) {
      resetForm();
      setShowCurrentlyOut(false);
    } else if (result.isDuplicate) {
      // Load and show currently out students
      await loadCurrentlyOutStudents();
      setShowCurrentlyOut(true);
    }
  };

  const isFormValid = firstName.trim() && lastName.trim() && selectedPeriod && selectedDestination;

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
            firstName={firstName}
            lastName={lastName}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            studentNames={studentNames}
            onKeyDown={handleKeyDown}
          />

          <PeriodDestinationSelects
            selectedPeriod={selectedPeriod}
            selectedDestination={selectedDestination}
            onPeriodChange={setSelectedPeriod}
            onDestinationChange={setSelectedDestination}
            onKeyDown={handleKeyDown}
          />

          <Button 
            id="signOutButton"
            className="w-full py-3 text-lg" 
            onClick={handleFormSubmit}
            onKeyDown={(e) => handleKeyDown(e)}
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? "Processing..." : "Sign Out"}
          </Button>
        </CardContent>
      </Card>

      {showCurrentlyOut && currentlyOutStudents.length > 0 && (
        <CurrentlyOutDisplay
          students={currentlyOutStudents}
          onStudentReturn={handleStudentReturn}
          onClose={() => setShowCurrentlyOut(false)}
        />
      )}
    </div>
  );
};

export default StudentSignOutForm;
