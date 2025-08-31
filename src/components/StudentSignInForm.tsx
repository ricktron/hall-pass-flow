import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentNameInput from "./StudentNameInput";
import { getStudentNames, addArrivalRecord } from "@/lib/supabaseDataManager";
import { PERIOD_OPTIONS } from "@/constants/formOptions";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedArrivalReason, setSelectedArrivalReason] = useState("");
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadStudentNames = async () => {
      const names = await getStudentNames();
      setStudentNames(names);
    };
    loadStudentNames();
  }, []);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setSelectedPeriod("");
    setSelectedArrivalReason("");
  };

  const isFormValid = firstName.trim() && lastName.trim() && selectedPeriod && selectedArrivalReason;

  const handleFormSubmit = () => {
    if (isFormValid) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const success = await addArrivalRecord({
        studentName: fullName,
        period: selectedPeriod,
        arrivalReason: selectedArrivalReason
      });

      if (success) {
        toast({
          title: "Sign In Successful",
          description: `${fullName} has been signed in successfully.`,
        });
        resetForm();
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error signing in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

          <div className="space-y-2">
            <Label htmlFor="period">Class Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="period-select" onKeyDown={(e) => handleKeyDown(e, 'arrival-reason-select')}>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {PERIOD_OPTIONS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrival-reason">Coming From</Label>
            <Select value={selectedArrivalReason} onValueChange={setSelectedArrivalReason}>
              <SelectTrigger id="arrival-reason-select" onKeyDown={(e) => handleKeyDown(e, 'signInButton')}>
                <SelectValue placeholder="Select where you're coming from" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {ARRIVAL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="button"
            id="signInButton"
            className="w-full py-3 text-lg" 
            onClick={handleFormSubmit}
            onKeyDown={(e) => handleKeyDown(e)}
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? "Processing..." : "Sign In"}
          </Button>

          <div className="text-center mt-4">
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Back to Sign Out
            </a>
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
              <strong>Period:</strong> {PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label}
              <br />
              <strong>Coming From:</strong> {selectedArrivalReason}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Confirm Sign In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentSignInForm;