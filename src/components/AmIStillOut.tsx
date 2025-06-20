
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, UserCheck } from "lucide-react";
import { BathroomRecord } from "@/lib/types";
import { getAllRecords, updateReturnTime } from "@/lib/dataManager";
import { useToast } from "@/hooks/use-toast";

interface AmIStillOutProps {
  onBack: () => void;
}

const AmIStillOut = ({ onBack }: AmIStillOutProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentRecord, setCurrentRecord] = useState<BathroomRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both first and last name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const records = await getAllRecords();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find the most recent record for this student today that doesn't have a return time
      const openRecord = records.find(record => 
        record.firstName.toLowerCase() === firstName.toLowerCase() &&
        record.lastName.toLowerCase() === lastName.toLowerCase() &&
        !record.timeIn &&
        record.timeOut >= today
      );

      setCurrentRecord(openRecord || null);
    } catch (error) {
      console.error("Error checking status:", error);
      toast({
        title: "Error",
        description: "Failed to check your status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!currentRecord) return;

    setIsLoading(true);
    try {
      const success = await updateReturnTime(
        currentRecord.firstName,
        currentRecord.lastName,
        currentRecord.period,
        new Date()
      );

      if (success) {
        toast({
          title: "Successfully Returned",
          description: "You have been marked as returned to class.",
        });
        setCurrentRecord(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to mark your return. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking return:", error);
      toast({
        title: "Error",
        description: "Failed to mark your return. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getElapsedMinutes = (timeOut: Date) => {
    return Math.floor((currentTime.getTime() - timeOut.getTime()) / (1000 * 60));
  };

  const getElapsedColor = (minutes: number) => {
    if (minutes < 5) return "text-green-600";
    if (minutes <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Am I Still Out?</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Check Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="text-lg p-4"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  className="text-lg p-4"
                />
              </div>
            </div>
            <Button
              onClick={checkStatus}
              disabled={isLoading}
              className="w-full text-lg py-6"
            >
              {isLoading ? "Checking..." : "Check Status"}
            </Button>
          </CardContent>
        </Card>

        {currentRecord ? (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                You Are Currently Out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <Label className="text-sm text-gray-600">Student</Label>
                  <p className="text-lg font-semibold">
                    {currentRecord.firstName} {currentRecord.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Period</Label>
                  <div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Period {currentRecord.period}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Destination</Label>
                  <p className="text-lg font-semibold">{currentRecord.destination}</p>
                </div>
              </div>

              <div className="text-center py-4 border-t">
                <Label className="text-sm text-gray-600">Time Out</Label>
                <p className="text-lg font-semibold mb-2">
                  {currentRecord.timeOut.toLocaleTimeString()}
                </p>
                <Label className="text-sm text-gray-600">Elapsed Time</Label>
                <div className={`text-2xl font-bold ${getElapsedColor(getElapsedMinutes(currentRecord.timeOut))}`}>
                  {getElapsedMinutes(currentRecord.timeOut)} minutes
                </div>
              </div>

              <Button
                onClick={handleReturn}
                disabled={isLoading}
                className="w-full text-lg py-6 bg-green-600 hover:bg-green-700"
              >
                <UserCheck className="w-5 h-5 mr-2" />
                {isLoading ? "Marking Return..." : "Mark Return"}
              </Button>
            </CardContent>
          </Card>
        ) : firstName && lastName && !isLoading ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-8">
              <UserCheck className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                You're not currently signed out.
              </h3>
              <p className="text-green-600">
                You don't have any active bathroom passes today.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default AmIStillOut;
