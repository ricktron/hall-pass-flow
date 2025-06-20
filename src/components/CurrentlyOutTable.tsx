
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, AlertTriangle } from "lucide-react";
import { BathroomRecord } from "@/lib/types";

interface CurrentlyOutTableProps {
  records: BathroomRecord[];
  onMarkReturn: (firstName: string, lastName: string, period: string) => void;
}

const CurrentlyOutTable = ({ records, onMarkReturn }: CurrentlyOutTableProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedMinutes = (timeOut: Date) => {
    return Math.floor((currentTime.getTime() - timeOut.getTime()) / (1000 * 60));
  };

  const getElapsedColor = (minutes: number) => {
    if (minutes < 5) return "text-green-600";
    if (minutes <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getElapsedBadge = (minutes: number) => {
    if (minutes < 5) return "default";
    if (minutes <= 10) return "secondary";
    return "destructive";
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
  };

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
                <th className="text-left py-2 px-2">Time Out</th>
                <th className="text-left py-2 px-2">Elapsed</th>
                <th className="text-left py-2 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {records
                .sort((a, b) => getElapsedMinutes(b.timeOut) - getElapsedMinutes(a.timeOut))
                .map((record) => {
                  const elapsed = getElapsedMinutes(record.timeOut);
                  const isOverLimit = elapsed > 10;
                  
                  return (
                    <tr 
                      key={record.id} 
                      className={`border-b hover:bg-gray-50 ${isOverLimit ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-3 px-2 font-medium">
                        {record.firstName} {record.lastName}
                        {isOverLimit && (
                          <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">Period {record.period}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {record.timeOut.toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge 
                          variant={getElapsedBadge(elapsed)}
                          className={getElapsedColor(elapsed)}
                        >
                          {elapsed} min
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          size="sm"
                          variant={isOverLimit ? "destructive" : "outline"}
                          onClick={() => onMarkReturn(record.firstName, record.lastName, record.period)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Mark Returned
                        </Button>
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
