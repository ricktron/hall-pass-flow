
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateReturnTime, getWeeklyStats } from "@/lib/supabaseDataManager";
import { getElapsedMinutes } from "@/lib/timeUtils";
import OutTimer from "./OutTimer";

interface StudentRecord {
  studentName: string;
  period: string;
  timeOut: Date;
  destination: string;
}

interface SoloStudentViewProps {
  student: StudentRecord;
  onStudentReturn: (studentName: string, period: string) => void;
  onSignOutAnother: () => void;
}

const quotes = [
  "\"Everyone poops.\" – Taro Gomi",
  "\"A throne is only a bench covered in velvet.\" – Napoleon Bonaparte",
  "\"Even the rich must sit on the same porcelain.\" – Anonymous",
  "\"Better to be silent and be thought a fool than to speak and to remove all doubt.\" – Abraham Lincoln",
  "\"Time spent in thought is never wasted.\" – Marcus Aurelius",
  "\"When nature calls, don't put it on hold.\" – Unknown",
  "\"Cleanliness is next to godliness.\" – John Wesley",
  "\"You can't rush genius—or a good bathroom break.\" – Anonymous",
  "\"We all face the same seat in the end.\" – Socrates, probably",
  "\"The smallest room in the house has the biggest role in your day.\" – Oprah Winfrey",
  "\"Restrooms are the great equalizer.\" – Trevor Noah",
  "\"I do some of my best thinking on the toilet.\" – Steve Jobs",
  "\"Prayer and plumbing: both essential for peace.\" – Rev. James Forbes",
  "\"I don't care if you're the Pope—you flush.\" – George Carlin",
  "\"Even in a palace, life is lived one flush at a time.\" – Dalai Lama (inspired)",
  "\"The bathroom is the sanctuary where no one judges.\" – Ellen DeGeneres",
  "\"Blessed are those who wash their hands.\" – Hygiene 24:7",
  "\"Silence is golden. Duct tape is silver. Restrooms are priceless.\" – Anonymous",
  "\"There is nothing noble in being superior... unless you refill the toilet paper roll.\" – Ernest Hemingway (rephrased)",
  "\"To go boldly where all have gone before.\" – Star Trek (adapted)",
  "\"In the restroom, all masks come off.\" – Oscar Wilde (satirical)",
  "\"The bathroom mirror never lies.\" – RuPaul",
  "\"We enter alone. We leave relieved.\" – Ancient Latrine Proverb",
  "\"Relief is a universal language.\" – Morgan Freeman (imagined)",
  "\"When one door closes, another one opens—hopefully not the stall.\" – Michael Scott"
];

const SoloStudentView = ({ student, onStudentReturn, onSignOutAnother }: SoloStudentViewProps) => {
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [overallWeeklyAverage, setOverallWeeklyAverage] = useState(0);
  const { toast } = useToast();
  
  // Random quote selected once per session
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  useEffect(() => {
    const loadWeeklyStats = async () => {
      const stats = await getWeeklyStats(student.studentName);
      setWeeklyAverage(stats.averageMinutes);
    };
    
    const loadOverallWeeklyAverage = async () => {
      // Get overall weekly average for all students
      const stats = await getWeeklyStats(""); // Empty string to get overall stats
      setOverallWeeklyAverage(stats.averageMinutes);
    };
    
    loadWeeklyStats();
    loadOverallWeeklyAverage();
  }, [student.studentName]);

  const handleMarkReturn = async () => {
    const success = await updateReturnTime(student.studentName, student.period);
    if (success) {
      toast({
        title: "Student Returned",
        description: `${student.studentName} has been marked as returned.`,
      });
      onStudentReturn(student.studentName, student.period);
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const elapsedMinutes = getElapsedMinutes(student.timeOut);

  const getBackgroundColor = () => {
    if (elapsedMinutes < 5) return 'bg-green-100 border-green-300';
    if (elapsedMinutes < 10) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Student Currently Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`p-8 rounded-lg border-2 ${getBackgroundColor()}`}>
              <div className="text-center space-y-6">
                {/* Large student name */}
                <div className="text-7xl font-bold text-gray-800">{student.studentName}</div>
                
                {/* Period and destination */}
                <div className="space-y-1">
                  <div className="text-3xl text-gray-600">Period {student.period}</div>
                  <div className="text-2xl text-gray-600">{student.destination}</div>
                </div>
                
                {/* Large timer */}
                <div className="text-center">
                  <OutTimer timeOut={student.timeOut} className="text-8xl font-mono font-bold" />
                </div>
                
                {/* Split average lines */}
                <div className="space-y-1 text-xl text-gray-600">
                  <div>{student.studentName} average time out this week: {weeklyAverage} minutes</div>
                  <div>Average trip this week: {overallWeeklyAverage} minutes</div>
                </div>
                
                {/* Random quote */}
                <div className="mt-6 pt-4 border-t border-gray-300">
                  <div className="text-gray-500 text-sm text-center italic">
                    {quote}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 py-6 text-xl bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkReturn}
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                Returned
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 py-6 text-xl"
                onClick={onSignOutAnother}
              >
                <UserPlus className="w-6 h-6 mr-2" />
                Another Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoloStudentView;
