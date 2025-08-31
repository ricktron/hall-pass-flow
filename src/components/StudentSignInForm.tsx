import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LogIn } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getStudentNames, addArrivalRecord } from "@/lib/supabaseDataManager";
import { PERIOD_OPTIONS } from "@/constants/formOptions";
import StudentNameInput from "./StudentNameInput";
import { useToast } from "@/hooks/use-toast";

const ARRIVAL_REASONS = [
  "Late School Arrival",
  "Nurse", 
  "Front Office",
  "Counselor",
  "Student Leadership",
  "With Another Teacher",
  "Restroom Break from Another Class",
  "Other"
];

const StudentSignInForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadStudentNames = async () => {
      const names = await getStudentNames();
      setStudentNames(names);
    };
    loadStudentNames();
  }, []);

  const handleSubmit = () => {
    if (isFormValid) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const studentName = `${firstName.trim()} ${lastName.trim()}`;
      
      await addArrivalRecord({
        studentName,
        period: selectedPeriod,
        arrivalReason: selectedReason
      });

      toast({
        title: "Success!",
        description: `${studentName} has been signed in successfully.`,
      });

      // Reset form
      setFirstName("");
      setLastName("");
      setSelectedPeriod("");
      setSelectedReason("");
      setShowConfirmDialog(false);

      // Navigate back to home
      navigate("/");
    } catch (error) {
      console.error("Error signing in student:", error);
      toast({
        title: "Error",
        description: "Failed to sign in student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = firstName.trim() && lastName.trim() && selectedPeriod && selectedReason;

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
          nextField.focus();
          if (nextField.tagName === 'BUTTON' && nextField.getAttribute('role') === 'combobox') {
            nextField.click();
          }
        }
      } else {
        if (isFormValid) {
          handleSubmit();
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <LogIn className="w-5 h-5 mr-2 text-green-600" />
            Student Sign In
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="period-select" className="text-sm font-medium">
                Class Period
              </label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="period-select">
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
            </div>

            <div className="space-y-2">
              <label htmlFor="reason-select" className="text-sm font-medium">
                Coming From
              </label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger id="reason-select">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {ARRIVAL_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="button"
            className="w-full py-3 text-lg" 
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            Sign In
          </Button>

          <div className="text-center">
            <Link 
              to="/" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Back to Sign Out
            </Link>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sign In</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm the following details:
              <br /><br />
              <strong>Student:</strong> {firstName.trim()} {lastName.trim()}
              <br />
              <strong>Period:</strong> {selectedPeriod}
              <br />
              <strong>Coming From:</strong> {selectedReason}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Confirm Sign In"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentSignInForm;