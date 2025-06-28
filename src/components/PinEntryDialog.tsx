
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PinEntryDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const PinEntryDialog = ({ isOpen, onSuccess, onCancel }: PinEntryDialogProps) => {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const TEACHER_PIN = "4311";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (pin === TEACHER_PIN) {
      onSuccess();
      setPin("");
    } else {
      toast({
        title: "Incorrect PIN",
        description: "Please enter the correct teacher PIN.",
        variant: "destructive",
      });
      setPin("");
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    setPin("");
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Teacher Access Required</DialogTitle>
          <DialogDescription>
            Please enter the teacher PIN to access the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={10}
            className="text-center text-xl tracking-widest"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!pin.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? "Verifying..." : "Enter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PinEntryDialog;
