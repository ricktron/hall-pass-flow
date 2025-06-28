
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap } from "lucide-react";
import StudentView from "@/components/StudentView";
import TeacherView from "@/components/TeacherView";
import MultipleStudentsView from "@/components/MultipleStudentsView";
import { getCurrentlyOutRecords, HallPassRecord } from "@/lib/supabaseDataManager";

const Index = () => {
  const [currentView, setCurrentView] = useState<'select' | 'student' | 'teacher' | 'multiple'>('select');
  const [currentlyOutRecords, setCurrentlyOutRecords] = useState<HallPassRecord[]>([]);

  const loadCurrentlyOut = async () => {
    const records = await getCurrentlyOutRecords();
    setCurrentlyOutRecords(records);
    
    // Auto-switch to multiple students view if there are students out
    if (records.length > 0 && currentView === 'select') {
      setCurrentView('multiple');
    } else if (records.length === 0 && currentView === 'multiple') {
      setCurrentView('select');
    }
  };

  useEffect(() => {
    loadCurrentlyOut();
    const interval = setInterval(loadCurrentlyOut, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [currentView]);

  const handleBackToSelection = () => {
    setCurrentView('select');
  };

  const handleStudentModeClick = () => {
    if (currentlyOutRecords.length > 0) {
      setCurrentView('multiple');
    } else {
      setCurrentView('student');
    }
  };

  if (currentView === 'student') {
    return <StudentView onBack={handleBackToSelection} />;
  }

  if (currentView === 'teacher') {
    return <TeacherView onBack={handleBackToSelection} />;
  }

  if (currentView === 'multiple') {
    return (
      <MultipleStudentsView 
        records={currentlyOutRecords}
        onBack={handleBackToSelection}
        onRefresh={loadCurrentlyOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="font-brittany text-6xl text-gray-800 mb-1 tracking-wide">Mr. Garnett's</h1>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Bathroom Pass System</h1>
          <p className="text-lg text-gray-600">Select your role to continue</p>
          {currentlyOutRecords.length > 0 && (
            <p className="text-lg text-orange-600 font-semibold mt-2">
              {currentlyOutRecords.length} student{currentlyOutRecords.length !== 1 ? 's' : ''} currently out
            </p>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStudentModeClick}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Student</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                {currentlyOutRecords.length > 0 
                  ? "View currently out students or sign out" 
                  : "Sign out for hall pass"
                }
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                {currentlyOutRecords.length > 0 ? "View Current Students" : "Continue as Student"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('teacher')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Teacher</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">View dashboard and manage students</p>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Continue as Teacher
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
