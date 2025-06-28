import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getCurrentlyOutRecords, getAnalytics, HallPassRecord, markStudentReturn } from "@/lib/supabaseDataManager";
import { formatLocalTime } from "@/lib/timeUtils";
import CurrentlyOutTable from "./CurrentlyOutTable";
import DestinationChart from "./DestinationChart";

interface TeacherViewProps {
  onBack: () => void;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  const [currentlyOut, setCurrentlyOut] = useState<HallPassRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [weeklyStatsExpanded, setWeeklyStatsExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [outRecords, analyticsData] = await Promise.all([
          getCurrentlyOutRecords(),
          getAnalytics()
        ]);
        setCurrentlyOut(outRecords);
        setAnalytics(analyticsData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error fetching teacher view data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkReturn = async (studentName: string, period: string) => {
    try {
      await markStudentReturn(studentName, period);
      // Refresh the data after marking return
      const outRecords = await getCurrentlyOutRecords();
      setCurrentlyOut(outRecords);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error marking student return:", error);
    }
  };

  const formatChartData = () => {
    if (!analytics?.tripsPerPeriod) return [];
    
    return Object.entries(analytics.tripsPerPeriod).map(([period, count]) => ({
      period,
      trips: count
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Classroom</div>
            <div className="text-xl font-bold text-gray-800">Mr. Garnett — B12</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Currently Out Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Currently Out ({currentlyOut.length})
                  <span className="text-sm font-normal text-gray-500">
                    Last Updated: {formatLocalTime(lastUpdated)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CurrentlyOutTable 
                  records={currentlyOut} 
                  onMarkReturn={handleMarkReturn}
                />
              </CardContent>
            </Card>
          </div>

          {/* Weekly Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.averageTripsPerDay || 0}
                  </div>
                  <div className="text-sm text-gray-600">Average Trips per Day (This Week)</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.weeklyAverageDurationFormatted || '00:00:00'}
                  </div>
                  <div className="text-sm text-gray-600">Average Trip Duration (This Week)</div>
                </div>
              </div>
              
              {analytics?.longestTripToday?.duration > 0 && (
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {analytics.longestTripToday.student}
                  </div>
                  <div className="text-sm text-gray-600">
                    Longest trip today: {analytics.longestTripToday.durationFormatted}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW: Top Students This Week */}
          <Card>
            <CardHeader>
              <CardTitle>Top Students This Week</CardTitle>
              <CardDescription>Frequent flyers with most trips</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.topStudentsThisWeek?.slice(0, 5).map((student: any, index: number) => (
                  <div key={student.name} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                    <div>
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <div className="text-sm text-gray-600">
                        {student.count} trips • Avg: {student.averageDurationFormatted}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                  </div>
                ))}
                {(!analytics?.topStudentsThisWeek || analytics.topStudentsThisWeek.length === 0) && (
                  <div className="text-gray-500 text-center py-4">No trips this week</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NEW: Longest Trip This Week */}
          {analytics?.longestTripThisWeek?.student && (
            <Card>
              <CardHeader>
                <CardTitle>Longest Trip This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600 mb-2">
                    {analytics.longestTripThisWeek.student}
                  </div>
                  <div className="text-lg text-gray-700 mb-1">
                    {analytics.longestTripThisWeek.durationFormatted}
                  </div>
                  <div className="text-sm text-gray-600">
                    on {analytics.longestTripThisWeek.dayOfWeek}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trips by Period */}
          <Card>
            <CardHeader>
              <CardTitle>Trips by Period</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* NEW: Quietest Periods */}
          <Card>
            <CardHeader>
              <CardTitle>Periods with Least Activity</CardTitle>
              <CardDescription>Quietest class periods this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.quietestPeriods?.map((period: any, index: number) => (
                  <div key={period.period} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium">{period.period}</span>
                    <span className="text-sm text-gray-600">{period.count} trips</span>
                  </div>
                ))}
                {(!analytics?.quietestPeriods || analytics.quietestPeriods.length === 0) && (
                  <div className="text-gray-500 text-center py-4">No period data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Most Frequent (Today) */}
          <Card>
            <CardHeader>
              <CardTitle>Most Frequent (Today)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.mostFrequentToday?.slice(0, 5).map((student: any, index: number) => (
                  <div key={student.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-sm text-gray-600">{student.count} trips</span>
                  </div>
                ))}
                {(!analytics?.mostFrequentToday || analytics.mostFrequentToday.length === 0) && (
                  <div className="text-gray-500 text-center py-4">No trips today</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Most Frequent (This Week) */}
          <Card>
            <CardHeader>
              <CardTitle>Most Frequent (This Week)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.mostFrequentWeek?.slice(0, 5).map((student: any, index: number) => (
                  <div key={student.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-sm text-gray-600">{student.count} trips</span>
                  </div>
                ))}
                {(!analytics?.mostFrequentWeek || analytics.mostFrequentWeek.length === 0) && (
                  <div className="text-gray-500 text-center py-4">No trips this week</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NEW: Most Common Destination with Pie Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Destination Distribution</CardTitle>
              <CardDescription>Where students go most often this week</CardDescription>
            </CardHeader>
            <CardContent>
              <DestinationChart data={analytics?.destinationDistribution || []} />
            </CardContent>
          </Card>

          {/* NEW: Unreturned Passes */}
          {analytics?.unreturnedPasses?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-red-600">Unreturned Passes</CardTitle>
                <CardDescription>Students who signed out but never returned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.unreturnedPasses.slice(0, 6).map((pass: any, index: number) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="font-medium text-red-800">{pass.studentName}</div>
                      <div className="text-sm text-red-600">Period: {pass.period}</div>
                      <div className="text-sm text-red-600">To: {pass.destination}</div>
                      <div className="text-xs text-red-500 mt-1">
                        Left: {formatLocalTime(pass.timeOut)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NEW: Weekly Stats Expandable Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle 
                className="cursor-pointer flex items-center justify-between"
                onClick={() => setWeeklyStatsExpanded(!weeklyStatsExpanded)}
              >
                Weekly Stats
                {weeklyStatsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {weeklyStatsExpanded && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {analytics?.weeklyStats?.totalTrips || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Trips This Week</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {analytics?.weeklyStats?.averageTripsPerStudent || 0}
                    </div>
                    <div className="text-sm text-gray-600">Average Trips Per Student</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {analytics?.weeklyStats?.studentsWhoNeverLeft || 0}
                    </div>
                    <div className="text-sm text-gray-600">Students Who Never Left</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* NEW: Trends Over Time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Trips Over Time</CardTitle>
              <CardDescription>Daily trip counts this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics?.weeklyTrendData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="trips" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Longest Trips Today */}
          {analytics?.topLongestTripsToday?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Longest Trips Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {analytics.topLongestTripsToday.map((trip: any, index: number) => (
                    <div key={index} className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">
                        {trip.durationFormatted}
                      </div>
                      <div className="text-sm text-gray-600">{trip.student}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Most Common Destination:</span>
                <span className="font-medium">{analytics?.mostCommonDestination || 'None'}</span>
              </div>
              {analytics?.periodWithLongestAverage?.period && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Period with Longest Avg:</span>
                  <span className="font-medium">
                    {analytics.periodWithLongestAverage.period} ({analytics.periodWithLongestAverage.averageDurationFormatted})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherView;
