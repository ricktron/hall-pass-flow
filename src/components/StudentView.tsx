
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addBathroomRecord, updateReturnTime } from "@/lib/dataManager";
import PostSignoutConfirmation from "./PostSignoutConfirmation";

interface StudentViewProps {
  onBack: () => void;
}

const PERIODS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const DESTINATIONS = [
  "Bathroom",
  "Locker", 
  "Counselor",
  "Dean of Students",
  "Dean of Academics",
  "Nurse",
  "Early Dismissal",
  "Football Meeting",
  "Other"
];

const StudentView = ({ onBack }: StudentViewProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [action, setAction] = useState<"leaving" | "returning" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [signoutTime, setSignoutTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !selectedPeriod || !selectedDestination || !action) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      
      if (action === "leaving") {
        await addBathroomRecord({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          period: selectedPeriod,
          destination: selectedDestination,
          timeOut: now,
          timeIn: null,
        });
        
        // Store signout time and show confirmation screen
        setSignoutTime(now);
        setShowConfirmation(true);
      } else {
        const success = await updateReturnTime(firstName.trim(), lastName.trim(), selectedPeriod, now);
        
        if (success) {
          toast({
            title: "Signed In",
            description: `${firstName} ${lastName} has been signed back in successfully.`,
          });
        } else {
          toast({
            title: "No Record Found",
            description: "No active pass found for this student and period today.",
            variant: "destructive",
          });
        }
      }

      // Reset form if not showing confirmation
      if (action === "returning") {
        setFirstName("");
        setLastName("");
        setSelectedPeriod("");
        setSelectedDestination("");
        setAction("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationComplete = () => {
    setShowConfirmation(false);
    setSignoutTime(null);
    // Reset form
    setFirstName("");
    setLastName("");
    setSelectedPeriod("");
    setSelectedDestination("");
    setAction("");
  };

  // Show confirmation screen after sign-out
  if (showConfirmation && signoutTime) {
    return (
      <PostSignoutConfirmation
        firstName={firstName}
        lastName={lastName}
        period={selectedPeriod}
        timeOut={signoutTime}
        onComplete={handleConfirmationComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Student Sign In/Out</h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Hall Pass
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Class Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((period) => (
                    <SelectItem key={period} value={period}>
                      Period {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATIONS.map((destination) => (
                    <SelectItem key={destination} value={destination}>
                      {destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Action</Label>
              <RadioGroup value={action} onValueChange={(value) => setAction(value as "leaving" | "returning")}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="leaving" id="leaving" />
                  <Label htmlFor="leaving" className="flex-1 cursor-pointer">
                    <div className="font-medium">Leaving</div>
                    <div className="text-sm text-gray-500">I'm leaving the classroom</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="returning" id="returning" />
                  <Label htmlFor="returning" className="flex-1 cursor-pointer">
                    <div className="font-medium">Returning</div>
                    <div className="text-sm text-gray-500">I'm back to the classroom</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              className="w-full py-3 text-lg" 
              onClick={handleSubmit}
              disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !selectedPeriod || !selectedDestination || !action}
            >
              {isSubmitting ? "Processing..." : "Submit"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentView;
