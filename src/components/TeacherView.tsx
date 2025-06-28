
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Clock, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurrentlyOutDisplay from "./CurrentlyOutDisplay";
import AnalyticsPanel from "./AnalyticsPanel";
import { getCurrentlyOutRecords } from "@/lib/supabaseDataManager";
import { CLASSROOM_ID } from "@/config/classroom";

interface TeacherViewProps {
  onBack: () => void;
}

const TeacherView = ({ onBack }: TeacherViewProps) => {
  const navigate = useNavigate();
  const [currentlyOutCount, setCurrentlyOutCount] = useState(0);
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');

  const loadCurrentlyOutCount = async () => {
    const records = await getCurrentlyOutRecords();
    setCurrentlyOutCount(records.length);
  };

  useEffect(() => {
    loadCurrentlyOutCount();
    const interval = setInterval(loadCurrentlyOutCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBackClick = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={handleBackClick}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-lg text-gray-600">Mr. Garnett — {CLASSROOM_ID}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeView === 'overview' ? 'default' : 'outline'}
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Overview
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveView('analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
          </div>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Currently Out</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentlyOutCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Students away from class
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classroom</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{CLASSROOM_ID}</div>
                  <p className="text-xs text-muted-foreground">
                    Active room ID
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <p className="text-xs text-muted-foreground">
                    System operational
                  </p>
                </CardContent>
              </Card>
            </div>

            <CurrentlyOutDisplay />
          </div>
        )}

        {activeView === 'analytics' && (
          <AnalyticsPanel />
        )}
      </div>
    </div>
  );
};

export default TeacherView;
