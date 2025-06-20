
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addBathroomRecord, updateReturnTime } from "@/lib/dataManager";

interface StudentViewProps {
  onBack: () => void;
}

const STUDENTS = [
  "Alex Johnson", "Bailey Smith", "Casey Brown", "Drew Wilson", "Ellis Davis",
  "Finley Miller", "Gray Anderson", "Harper Taylor", "Iris Jackson", "Jordan White",
  "Kai Thompson", "Logan Garcia", "Morgan Martinez", "Noah Robinson", "Olive Clark",
  "Parker Lewis", "Quinn Lee", "River Walker", "Sage Hall", "Taylor Young"
];

const PERIODS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const StudentView = ({ onBack }: StudentViewProps) => {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [action, setAction] = useState<"leaving" | "returning" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedPeriod || !action) {
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
          studentName: selectedStudent,
          period: selectedPeriod,
          timeOut: now,
          timeIn: null,
        });
        
        toast({
          title: "Signed Out",
          description: `${selectedStudent} has been signed out successfully.`,
        });
      } else {
        const success = await updateReturnTime(selectedStudent, selectedPeriod, now);
        
        if (success) {
          toast({
            title: "Signed In",
            description: `${selectedStudent} has been signed back in successfully.`,
          });
        } else {
          toast({
            title: "No Record Found",
            description: "No active bathroom pass found for this student and period today.",
            variant: "destructive",
          });
        }
      }

      // Reset form
      setSelectedStudent("");
      setSelectedPeriod("");
      setAction("");
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
              Bathroom Pass
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="student">Student Name</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENTS.map((student) => (
                    <SelectItem key={student} value={student}>
                      {student}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-3">
              <Label>Action</Label>
              <RadioGroup value={action} onValueChange={(value) => setAction(value as "leaving" | "returning")}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="leaving" id="leaving" />
                  <Label htmlFor="leaving" className="flex-1 cursor-pointer">
                    <div className="font-medium">Leaving</div>
                    <div className="text-sm text-gray-500">I'm going to the bathroom</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="returning" id="returning" />
                  <Label htmlFor="returning" className="flex-1 cursor-pointer">
                    <div className="font-medium">Returning</div>
                    <div className="text-sm text-gray-500">I'm back from the bathroom</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              className="w-full py-3 text-lg" 
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedStudent || !selectedPeriod || !action}
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
