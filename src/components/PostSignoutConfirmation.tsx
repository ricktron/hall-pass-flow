
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateReturnTime, getWeeklyStats, formatDurationMinutes } from "@/lib/supabaseDataManager";

interface PostSignoutConfirmationProps {
  studentName: string;
  period: string;
  timeOut: Date;
  onComplete: () => void;
}

const PostSignoutConfirmation = ({ 
  studentName, 
  period, 
  timeOut, 
  onComplete 
}: PostSignoutConfirmationProps) => {
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isReturned, setIsReturned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({
    tripCount: 0,
    totalMinutes: 0,
    averageMinutes: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    const updateElapsedTime = () => {
      const now = new Date();
      const elapsed = now.getTime() - timeOut.getTime();
      const minutes = Math.floor(elapsed / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [timeOut]);

  useEffect(() => {
    const calculateWeeklyStats = async () => {
      try {
        const stats = await getWeeklyStats(studentName);
        setWeeklyStats(stats);
      } catch (error) {
        console.error("Error calculating weekly stats:", error);
      }
    };

    calculateWeeklyStats();
  }, [studentName]);

  const handleReturn = async () => {
    setIsProcessing(true);
    try {
      const success = await updateReturnTime(studentName, period);
      
      if (success) {
        setIsReturned(true);
        toast({
          title: "Success",
          description: "You are now marked as returned.",
        });
        
        // Auto-return to main screen after 2 seconds
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: "Could not mark return. Please try again.",
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
      setIsProcessing(false);
    }
  };

  const firstName = studentName.split(' ')[0];
  const lastName = studentName.split(' ').slice(1).join(' ');
  const lastInitial = lastName.charAt(0).toUpperCase();

  if (isReturned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardContent className="text-center py-16 px-8">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              You're now marked as returned.
            </h1>
            <p className="text-xl text-gray-600">
              Returning to main screen...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardContent className="text-center py-16 px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-12 leading-tight">
            {firstName} {lastInitial}. has been out for:
          </h1>
          
          <div className="text-8xl md:text-9xl font-mono font-bold text-blue-600 mb-16">
            {elapsedTime}
          </div>
          
          <Button 
            size="lg"
            className="text-2xl py-8 px-16 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200 mb-12"
            onClick={handleReturn}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Returned"}
          </Button>

          <div className="text-sm text-gray-500 space-y-2">
            <p>
              You've been out {weeklyStats.tripCount} times for a total of {formatDurationMinutes(weeklyStats.totalMinutes)} this week.
            </p>
            <p>
              The average time out was {formatDurationMinutes(weeklyStats.averageMinutes)}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostSignoutConfirmation;
