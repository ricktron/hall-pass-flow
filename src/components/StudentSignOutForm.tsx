
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { getCurrentlyOutRecords, updateReturnTime } from "@/lib/supabaseDataManager";
import { fetchRosterStudents, type RosterStudent } from "@/lib/roster";
import { fetchActiveDestinations, type DestinationOption } from "@/lib/destinationsRepository";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import StudentNameInput, { type SelectedStudent, type StudentNameInputRef } from "./StudentNameInput";
import UnknownOverrideDialog from "./UnknownOverrideDialog";
import { useStudentSignOut } from "@/hooks/useStudentSignOut";
import { useToast } from "@/hooks/use-toast";
import { PERIOD_OPTIONS } from "@/constants/formOptions";

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

const STUDENT_SIGN_OUT_STORAGE_KEY = "hp:lastSelectedPeriod";

const StudentSignOutForm = ({ onSignOut, onEarlyDismissal }: StudentSignOutFormProps) => {
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState<StudentRecord[]>([]);
  const [showCurrentlyOut, setShowCurrentlyOut] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  
  // Unknown override state
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideRawName, setOverrideRawName] = useState("");
  
  // Ref for auto-focusing student name input
  const studentNameInputRef = useRef<StudentNameInputRef>(null);
  
  const { toast } = useToast();

  const { isSubmitting, handleSubmit } = useStudentSignOut({
    onSignOut,
    onEarlyDismissal
  });

  // Load destinations on mount
  useEffect(() => {
    let cancelled = false;
    fetchActiveDestinations().then((data) => {
      if (!cancelled) {
        setDestinations(data);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Load last selected period from localStorage on mount
  useEffect(() => {
    try {
      const savedPeriod = localStorage.getItem(STUDENT_SIGN_OUT_STORAGE_KEY);
      if (savedPeriod) {
        // Validate that the saved period is in the valid options
        const isValidPeriod = PERIOD_OPTIONS.some(opt => opt.value === savedPeriod);
        if (isValidPeriod) {
          setSelectedPeriod(savedPeriod);
        }
      }
    } catch (error) {
      // localStorage may not be available (e.g., in private mode)
      console.warn("Could not load saved period from localStorage:", error);
    }
  }, []);

  // Save period to localStorage when it changes
  useEffect(() => {
    if (selectedPeriod) {
      try {
        localStorage.setItem(STUDENT_SIGN_OUT_STORAGE_KEY, selectedPeriod);
      } catch (error) {
        console.warn("Could not save period to localStorage:", error);
      }
    }
  }, [selectedPeriod]);

  // Load roster when period changes (or on mount if period is already selected)
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedPeriod) {
        // If no period selected, don't load roster yet
        setStudents([]);
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

  // Auto-focus student name input when period is selected and roster is loaded
  useEffect(() => {
    if (selectedPeriod && !rosterLoading && students.length > 0) {
      // Small delay to ensure the input is rendered and enabled
      const timer = setTimeout(() => {
        if (studentNameInputRef.current) {
          studentNameInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPeriod, rosterLoading, students.length]);

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
          {rosterLoading && selectedPeriod && (
            <div className="text-sm text-gray-500">Loading roster...</div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="period">Class Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="period-select" onKeyDown={(e) => handleKeyDown(e, 'studentName')}>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedPeriod && (
              <p className="text-xs text-gray-500">Select your period to load the roster.</p>
            )}
          </div>

          <StudentNameInput
            ref={studentNameInputRef}
            students={students.map(s => ({ id: s.id, name: s.name, firstName: s.firstName, lastName: s.lastName }))}
            selectedStudent={selectedStudent}
            onStudentSelect={setSelectedStudent}
            onKeyDown={handleKeyDown}
            onTeacherOverride={handleTeacherOverride}
            disabled={!selectedPeriod}
            period={selectedPeriod}
          />

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Select 
              value={selectedDestination} 
              onValueChange={setSelectedDestination}
              disabled={!selectedPeriod}
            >
              <SelectTrigger 
                id="destination-select" 
                onKeyDown={(e) => handleKeyDown(e, 'signOutButton')}
                className={!selectedPeriod ? "bg-gray-100 cursor-not-allowed" : ""}
              >
                <SelectValue placeholder={!selectedPeriod ? "Select a period first..." : "Select destination"} />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((destination) => (
                  <SelectItem key={destination.key} value={destination.key === "testing_center" ? "testing_center" : destination.label}>
                    {destination.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
