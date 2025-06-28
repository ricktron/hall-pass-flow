
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, AlertTriangle, Trash2 } from "lucide-react";
import { HallPassRecord } from "@/lib/supabaseDataManager";
import { calculateElapsedTime, formatElapsedTime, formatLocalTime, getElapsedMinutes, formatDurationReadable } from "@/lib/timeUtils";

interface CurrentlyOutTableProps {
  records: HallPassRecord[];
  onMarkReturn: (studentName: string, period: string) => void;
  onDeleteRecord?: (recordId: string, studentName: string) => void;
}

const CurrentlyOutTable = ({ records, onMarkReturn, onDeleteRecord }: CurrentlyOutTableProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedColor = (minutes: number) => {
    if (minutes >= 90) return "text-red-600 font-bold"; // Trips longer than 1.5 hours - likely incomplete
    if (minutes < 5) return "text-green-600";
    if (minutes <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getElapsedBadge = (minutes: number) => {
    if (minutes >= 90) return "destructive"; // Trips longer than 1.5 hours
    if (minutes < 5) return "default";
    if (minutes <= 10) return "secondary";
    return "destructive";
  };

  const getRowColor = (minutes: number) => {
    if (minutes >= 90) return "bg-red-100"; // Trips longer than 1.5 hours
    if (minutes < 5) return "";
    if (minutes <= 10) return "bg-yellow-50";
    return "bg-red-50";
  };

  const formatElapsedDisplay = (elapsedMinutes: number, elapsedSeconds: number) => {
    if (elapsedMinutes >= 90) {
      // Show as "1.5+ hrs" for trips longer than 1.5 hours
      return "1.5+ hrs";
    }
    return formatElapsedTime(elapsedSeconds);
  };

  if (records.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Currently Out</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>All students are currently in class!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Currently Out ({records.length})</span>
          {records.some(record => getElapsedMinutes(record.timeOut) > 10) && (
            <Badge variant="destructive" className="flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Attention Needed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Student</th>
                <th className="text-left py-2 px-2">Period</th>
                <th className="text-left py-2 px-2">Destination</th>
                <th className="text-left py-2 px-2">Time Out (Local)</th>
                <th className="text-left py-2 px-2">Elapsed</th>
                <th className="text-left py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records
                .sort((a, b) => getElapsedMinutes(b.timeOut) - getElapsedMinutes(a.timeOut))
                .map((record) => {
                  const elapsedMinutes = getElapsedMinutes(record.timeOut);
                  const elapsedSeconds = calculateElapsedTime(record.timeOut);
                  const isOverLimit = elapsedMinutes > 10;
                  const isLikelyIncomplete = elapsedMinutes >= 90; // Likely incomplete - student forgot to sign back in
                  
                  return (
                    <tr 
                      key={record.id} 
                      className={`border-b hover:bg-gray-50 ${getRowColor(elapsedMinutes)}`}
                    >
                      <td className="py-3 px-2 font-medium">
                        {record.studentName}
                        {(isOverLimit || isLikelyIncomplete) && (
                          <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">Period {record.period}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{record.destination || 'Unknown'}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {formatLocalTime(record.timeOut)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge 
                          variant={getElapsedBadge(elapsedMinutes)}
                          className={getElapsedColor(elapsedMinutes)}
                        >
                          {formatElapsedDisplay(elapsedMinutes, elapsedSeconds)}
                        </Badge>
                        {isLikelyIncomplete && (
                          <div className="text-xs text-red-600 mt-1">
                            Likely incomplete
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isOverLimit ? "destructive" : "outline"}
                            onClick={() => onMarkReturn(record.studentName, record.period)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Mark Returned
                          </Button>
                          {onDeleteRecord && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteRecord(record.id, record.studentName)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentlyOutTable;
