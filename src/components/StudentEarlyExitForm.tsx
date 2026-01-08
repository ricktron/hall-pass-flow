import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchRosterStudents, type RosterStudent } from "@/lib/roster";
import StudentNameInput, { type SelectedStudent, type StudentNameInputRef } from "./StudentNameInput";
import PeriodDestinationSelects from "./PeriodDestinationSelects";
import { useToast } from "@/hooks/use-toast";
import { PERIOD_OPTIONS } from "@/constants/formOptions";
import { recordDaySignout } from "@/lib/earlyDismissalRepository";
import { CLASSROOM_ID } from "@/config/classroom";

const StudentEarlyExitForm = () => {
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ref for auto-focusing student name input
  const studentNameInputRef = useRef<StudentNameInputRef>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load roster when period changes (or on mount if period is already selected)
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedPeriod) {
        // If no period selected, don't load roster yet
        setStudents([]);
        return;
      }
      
      // House Small Group doesn't use roster - directory search is used instead
      if (selectedPeriod === "House Small Group") {
        setStudents([]);
        setRosterLoading(false);
        return;
      }
      
      setRosterLoading(true);
      try {
        // fetchRosterStudents calls hp_get_roster RPC internally
        const studentList = await fetchRosterStudents({
          period: selectedPeriod,
          // Course is optional - if not provided, returns all students for the period
        });
        setStudents(studentList);
      } catch (error) {
        console.error("Failed to load roster:", error);
        setStudents([]);
      } finally {
        setRosterLoading(false);
      }
    };
    loadStudents();
  }, [selectedPeriod]);

  // Clear selected student when period changes
  useEffect(() => {
    if (selectedPeriod) {
      setSelectedStudent(null);
      setSelectedDestination("");
    }
  }, [selectedPeriod]);

  // Auto-focus student name input when period is selected and roster is loaded (or House Small Group)
  useEffect(() => {
    if (selectedPeriod && !rosterLoading) {
      // For House Small Group, focus immediately (no roster to load)
      // For normal periods, wait for roster to load
      if (selectedPeriod === "House Small Group" || students.length > 0) {
        // Small delay to ensure the input is rendered and enabled
        const timer = setTimeout(() => {
          if (studentNameInputRef.current) {
            studentNameInputRef.current.focus();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedPeriod, rosterLoading, students.length]);

  const handleFormSubmit = async () => {
    // Guard: require student selection
    if (!selectedStudent) {
      toast({
        title: "Pick your name first",
        description: "Please select your name from the list before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPeriod) {
      toast({
        title: "Select a period",
        description: "Please select your class period.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await recordDaySignout({
        classroom: CLASSROOM_ID,
        student_name: selectedStudent.name,
        reason: selectedDestination || undefined,
        period: selectedPeriod,
        student_id: selectedStudent.id,
      });

      toast({
        title: "Early Exit Recorded",
        description: `${selectedStudent.name} has been recorded as leaving early.`,
      });

      // Navigate back to home
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedStudent !== null && selectedPeriod;

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
            <LogOut className="w-5 h-5 mr-2 text-amber-600" />
            Leaving Class Early (No Return)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {rosterLoading && selectedPeriod && (
            <div className="text-sm text-gray-500">Loading roster...</div>
          )}
          
          <PeriodDestinationSelects
            selectedPeriod={selectedPeriod}
            selectedDestination={selectedDestination}
            onPeriodChange={setSelectedPeriod}
            onDestinationChange={setSelectedDestination}
            onKeyDown={handleKeyDown}
          />

          <StudentNameInput
            ref={studentNameInputRef}
            students={students.map(s => ({ id: s.id, name: s.name, firstName: s.firstName, lastName: s.lastName }))}
            selectedStudent={selectedStudent}
            onStudentSelect={setSelectedStudent}
            onKeyDown={handleKeyDown}
            disabled={!selectedPeriod}
            period={selectedPeriod}
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This records that you are leaving class early and will not be returning. 
              This does not create an active hall pass.
            </p>
          </div>

          <Button 
            type="button"
            id="submitButton"
            className="w-full py-3 text-lg" 
            onClick={handleFormSubmit}
            onKeyDown={(e) => handleKeyDown(e)}
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? "Processing..." : "Record Early Exit"}
          </Button>

          <div className="text-center mt-4">
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Back to Home
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentEarlyExitForm;

