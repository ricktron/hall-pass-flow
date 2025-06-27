
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { addHallPassRecord, getCurrentlyOutRecords } from "@/lib/supabaseDataManager";
import { DAYS_OF_WEEK } from "@/constants/formOptions";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface UseStudentSignOutProps {
  onSignOut: (studentRecord: StudentRecord) => void;
  onEarlyDismissal: (studentName: string) => void;
}

export const useStudentSignOut = ({ onSignOut, onEarlyDismissal }: UseStudentSignOutProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const checkForDuplicateEntry = async (studentName: string) => {
    const currentlyOut = await getCurrentlyOutRecords();
    return currentlyOut.some(record => record.studentName === studentName);
  };

  const handleSubmit = async (
    firstName: string,
    lastName: string,
    selectedPeriod: string,
    selectedDestination: string
  ) => {
    if (!firstName.trim() || !lastName.trim() || !selectedPeriod || !selectedDestination) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsSubmitting(true);

    try {
      // Create timestamp in Central Time
      const now = new Date();
      const centralTimeOptions: Intl.DateTimeFormatOptions = {
        timeZone: "America/Chicago"
      };
      const centralTime = new Date(now.toLocaleString("en-US", centralTimeOptions));
      
      const studentName = `${firstName.trim()} ${lastName.trim()}`;
      const dayOfWeek = DAYS_OF_WEEK[centralTime.getDay()];
      
      // Infer early dismissal from destination
      const isEarlyDismissal = selectedDestination === 'Early Dismissal';
      
      // Check for duplicate entry only if not early dismissal
      if (!isEarlyDismissal) {
        const isDuplicate = await checkForDuplicateEntry(studentName);
        if (isDuplicate) {
          toast({
            title: "Student Already Out",
            description: `${studentName} is already signed out. See currently out students below.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return { success: false, isDuplicate: true, studentName };
        }
      }
      
      const success = await addHallPassRecord({
        studentName,
        period: selectedPeriod,
        timeOut: centralTime,
        timeIn: null,
        duration: null,
        dayOfWeek,
        destination: selectedDestination,
        earlyDismissal: isEarlyDismissal
      });

      if (success) {
        if (isEarlyDismissal) {
          onEarlyDismissal(studentName);
        } else {
          onSignOut({
            studentName,
            period: selectedPeriod,
            timeOut: centralTime,
            destination: selectedDestination
          });
        }
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit
  };
};
