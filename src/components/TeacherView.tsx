import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Clock, TrendingUp, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentlyOutRecords, updateReturnTime, getAnalytics, deleteHallPassRecord } from "@/lib/supabaseDataManager";
import { formatElapsedTime } from "@/lib/timeUtils";
import { HallPassRecord } from "@/lib/supabaseDataManager";
import CurrentlyOutTable from "@/components/CurrentlyOutTable";
import AnalyticsPanel from "@/components/AnalyticsPanel";

interface TeacherViewProps {
  onBack: () => void;
}

interface Analytics {
  totalTripsToday: number;
  mostFrequentToday: { name: string; count: number }[];
  mostFrequentWeek: { name: string; count: number }[];
  longestTripToday: {
    duration: number;
    student: string;
  };
  tripsPerPeriod: { [period: string]: number };
  averageDuration: number;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  const [records, setRecords] = useState<HallPassRecord[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStudent, setFilterStudent] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const currentlyOut = await getCurrentlyOutRecords();
      const analyticsData = await getAnalytics();
      setRecords(currentlyOut);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMarkReturn = async (studentName: string, period: string) => {
    const success = await updateReturnTime(studentName, period);
    if (success) {
      toast({
        title: "Student Marked Returned",
        description: `${studentName} has been marked as returned.`,
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: "Could not mark student as returned.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = async (recordId: string, studentName: string) => {
    const success = await deleteHallPassRecord(recordId);
    if (success) {
      toast({
        title: "Record Deleted",
        description: `Record for ${studentName} has been deleted.`,
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: "Could not delete record.",
        variant: "destructive",
      });
    }
  };

  // Filter currently out students
  const filteredOut = records.filter(record => {
    const periodMatch = filterPeriod === "all" || record.period === filterPeriod;
    const studentMatch = filterStudent === "" || 
      record.studentName.toLowerCase().includes(filterStudent.toLowerCase());
    return periodMatch && studentMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="outline" onClick={onBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
          </div>
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Currently Out</p>
                  <p className="text-2xl font-bold">{records.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Over 10 Min</p>
                  <p className="text-2xl font-bold text-red-600">
                    {records.filter(record => {
                      const elapsed = Date.now() - record.timeOut.getTime();
                      return elapsed > 10 * 60 * 1000;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Trips</p>
                  <p className="text-2xl font-bold">{analytics?.totalTripsToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold">
                    {analytics?.averageDuration ? formatElapsedTime(analytics.averageDuration * 60 * 1000) : '00:00:00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    {["A", "B", "C", "D", "E", "F", "G", "H"].map(period => (
                      <SelectItem key={period} value={period}>Period {period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-48">
                <Input
                  placeholder="Filter by student name..."
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currently Out Table */}
        <CurrentlyOutTable 
          records={filteredOut} 
          onMarkReturn={handleMarkReturn}
          onDeleteRecord={handleDeleteRecord}
        />

        {/* Analytics Panel */}
        {analytics && <AnalyticsPanel analytics={analytics} />}
      </div>
    </div>
  );
};

export default TeacherView;
