
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addHallPassRecord } from "@/lib/supabaseDataManager";
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

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const StudentView = ({ onBack }: StudentViewProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [signoutTime, setSignoutTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !selectedPeriod || !selectedDestination) {
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
      const studentName = `${firstName.trim()} ${lastName.trim()}`;
      const dayOfWeek = DAYS_OF_WEEK[now.getDay()];
      
      const success = await addHallPassRecord({
        studentName,
        period: selectedPeriod,
        timeOut: now,
        timeIn: null,
        duration: null,
        dayOfWeek
      });

      if (success) {
        setSignoutTime(now);
        setShowConfirmation(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
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
  };

  // Show confirmation screen after sign-out
  if (showConfirmation && signoutTime) {
    const studentName = `${firstName.trim()} ${lastName.trim()}`;
    return (
      <PostSignoutConfirmation
        studentName={studentName}
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
          <h1 className="text-3xl font-bold text-gray-800">Student Sign Out</h1>
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

            <Button 
              className="w-full py-3 text-lg" 
              onClick={handleSubmit}
              disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !selectedPeriod || !selectedDestination}
            >
              {isSubmitting ? "Processing..." : "Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentView;
