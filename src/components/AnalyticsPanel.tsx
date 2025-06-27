import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Users, BarChart3 } from "lucide-react";
import { formatElapsedTime } from "@/lib/timeUtils";

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

interface AnalyticsPanelProps {
  analytics: Analytics;
}

const AnalyticsPanel = ({ analytics }: AnalyticsPanelProps) => {
  const periods = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const maxTrips = Math.max(...periods.map(p => analytics.tripsPerPeriod[p] || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Most Frequent Leavers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Most Frequent Leavers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Today</h4>
              {analytics.mostFrequentToday.length > 0 ? (
                <div className="space-y-2">
                  {analytics.mostFrequentToday.map((student, index) => (
                    <div key={student.name} className="flex justify-between items-center">
                      <span className="text-sm">
                        {index + 1}. {student.name}
                      </span>
                      <Badge variant="secondary">{student.count} trips</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No trips today</p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">This Week</h4>
              {analytics.mostFrequentWeek.length > 0 ? (
                <div className="space-y-2">
                  {analytics.mostFrequentWeek.slice(0, 3).map((student, index) => (
                    <div key={student.name} className="flex justify-between items-center">
                      <span className="text-sm">
                        {index + 1}. {student.name}
                      </span>
                      <Badge variant="outline">{student.count} trips</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No trips this week</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trips by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Trips by Period (Today)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {periods.map(period => {
              const count = analytics.tripsPerPeriod[period] || 0;
              const percentage = maxTrips > 0 ? (count / maxTrips) * 100 : 0;
              
              return (
                <div key={period} className="flex items-center space-x-3">
                  <div className="w-12 text-sm font-medium">Period {period}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-8 text-sm text-gray-600">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Additional Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatElapsedTime(analytics.longestTripToday.duration * 60 * 1000)}
              </div>
              <div className="text-sm text-gray-600">Longest Trip Today</div>
              {analytics.longestTripToday.student && (
                <div className="text-xs text-gray-500 mt-1">
                  {analytics.longestTripToday.student}
                </div>
              )}
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatElapsedTime(analytics.averageDuration * 60 * 1000)}
              </div>
              <div className="text-sm text-gray-600">Average Duration</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.totalTripsToday}
              </div>
              <div className="text-sm text-gray-600">Total Trips Today</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPanel;
