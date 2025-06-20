
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserCheck } from "lucide-react";
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
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isLoading, setIsLoading] = useState(false);
  const [hasReturned, setHasReturned] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentRecord && !hasReturned) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - currentRecord.timeOut.getTime();
        const minutes = Math.floor(elapsed / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRecord, hasReturned]);

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

      const openRecord = records.find(record => 
        record.firstName.toLowerCase() === firstName.toLowerCase() &&
        record.lastName.toLowerCase() === lastName.toLowerCase() &&
        !record.timeIn &&
        record.timeOut >= today
      );

      setCurrentRecord(openRecord || null);
      setHasReturned(false);
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
        setHasReturned(true);
        toast({
          title: "Successfully Returned",
          description: "You are now marked as returned.",
        });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {!currentRecord && !hasReturned ? (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Check Your Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
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
        ) : hasReturned ? (
          <Card className="bg-green-50 border-green-200 shadow-lg">
            <CardContent className="text-center py-12">
              <UserCheck className="w-24 h-24 mx-auto mb-6 text-green-600" />
              <h2 className="text-3xl font-bold text-green-800 mb-4">
                You are now marked as returned.
              </h2>
              <Button
                onClick={() => {
                  setCurrentRecord(null);
                  setHasReturned(false);
                  setFirstName("");
                  setLastName("");
                }}
                className="text-lg py-4 px-8"
              >
                Check Another Status
              </Button>
            </CardContent>
          </Card>
        ) : currentRecord ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-8">
                {currentRecord.firstName} {currentRecord.lastName.charAt(0)} has been out for:
              </h2>
              <div className="text-6xl font-mono font-bold text-blue-600 mb-12">
                {elapsedTime}
              </div>
              <Button
                onClick={handleReturn}
                disabled={isLoading}
                size="lg"
                className="text-2xl py-8 px-16 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Processing..." : "Returned"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-50 border-gray-200 shadow-lg">
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold text-gray-600 mb-4">
                You're not currently signed out.
              </h2>
              <Button
                onClick={() => {
                  setFirstName("");
                  setLastName("");
                }}
                className="text-lg py-4 px-8"
              >
                Check Another Status
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AmIStillOut;
