import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PERIOD_OPTIONS, DESTINATION_OPTIONS } from "@/constants/formOptions";
import { CLASSROOM_ID } from "@/config/classroom";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

interface UnknownOverrideDialogProps {
  isOpen: boolean;
  rawName: string;
  /** Pre-selected period from the form (optional) */
  initialPeriod?: string;
  /** Pre-selected destination from the form (optional) */
  initialDestination?: string;
  onSuccess: (data: { studentName: string; period: string; destination: string }) => void;
  onCancel: () => void;
}

interface CreateUnknownResult {
  success: boolean;
  error?: string;
  unknown_id?: string;
  pass_id?: string;
  student_name?: string;
}

const UnknownOverrideDialog = ({
  isOpen,
  rawName,
  initialPeriod = "",
  initialDestination = "",
  onSuccess,
  onCancel,
}: UnknownOverrideDialogProps) => {
  const [pin, setPin] = useState("");
  const [period, setPeriod] = useState(initialPeriod);
  const [destination, setDestination] = useState(initialDestination);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPeriod(initialPeriod);
      setDestination(initialDestination);
    }
  }, [isOpen, initialPeriod, initialDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin.trim()) {
      toast({
        title: "PIN Required",
        description: "Please enter the teacher PIN.",
        variant: "destructive",
      });
      return;
    }

    if (!period) {
      toast({
        title: "Period Required",
        description: "Please select a period.",
        variant: "destructive",
      });
      return;
    }

    if (!destination) {
      toast({
        title: "Destination Required",
        description: "Please select a destination.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_unknown_signout", {
        p_pin: pin,
        p_raw_name: rawName,
        p_period: period,
        p_destination: destination,
        p_classroom: CLASSROOM_ID,
      });

      if (error) {
        console.error("Unknown signout error:", error);
        toast({
          title: "Override Failed",
          description: error.message || "Unable to process override. Please try again.",
          variant: "destructive",
        });
        setPin("");
        setIsLoading(false);
        return;
      }

      const result = data as CreateUnknownResult;

      if (!result.success) {
        toast({
          title: result.error === "Invalid PIN" ? "Incorrect PIN" : "Override Failed",
          description: result.error || "Unable to process override. Please try again.",
          variant: "destructive",
        });
        setPin("");
        setIsLoading(false);
        return;
      }

      // Success!
      toast({
        title: "Pass Created",
        description: `${result.student_name} has been signed out. Please resolve this name in the Teacher Dashboard later.`,
      });

      onSuccess({
        studentName: result.student_name || rawName,
        period,
        destination,
      });
    } catch (error) {
      console.error("Unknown signout error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPin("");
    setPeriod("");
    setDestination("");
    onCancel();
  };

  // Filter out Early Dismissal from destinations for override flow
  const filteredDestinations = DESTINATION_OPTIONS.filter(
    (d) => d.value !== "Early Dismissal"
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Teacher Override
          </DialogTitle>
          <DialogDescription>
            Create a hall pass for a student not in the roster. This requires teacher PIN verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show the student name being overridden */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Student: "{rawName}"
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This name was not found in the roster. It will be added to the resolution queue.
                </p>
              </div>
            </div>
          </div>

          {/* Period selection */}
          <div className="space-y-2">
            <Label htmlFor="override-period">Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="override-period">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination selection */}
          <div className="space-y-2">
            <Label htmlFor="override-destination">Destination</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger id="override-destination">
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                {filteredDestinations.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN entry */}
          <div className="space-y-2">
            <Label htmlFor="override-pin">Teacher PIN</Label>
            <Input
              id="override-pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={10}
              className="text-center text-xl tracking-widest"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !pin.trim() || !period || !destination}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Create Pass"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnknownOverrideDialog;

