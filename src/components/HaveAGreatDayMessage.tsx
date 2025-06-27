
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface HaveAGreatDayMessageProps {
  studentName: string;
  onComplete: () => void;
}

const HaveAGreatDayMessage = ({ studentName, onComplete }: HaveAGreatDayMessageProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="shadow-2xl max-w-2xl w-full">
        <CardContent className="text-center py-16 px-8">
          <div className="text-6xl font-bold text-green-600 mb-6 animate-pulse">
            HAVE A GREAT DAY!
          </div>
          <div className="text-2xl text-gray-700 mb-4">
            {studentName}
          </div>
          <div className="text-lg text-gray-600">
            Enjoy your early dismissal
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HaveAGreatDayMessage;
