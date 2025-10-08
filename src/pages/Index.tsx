import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap } from "lucide-react";
import StudentView from "@/components/StudentView";
import TeacherView from "@/components/TeacherView";
import MultipleStudentsView from "@/components/MultipleStudentsView";
import PinEntryDialog from "@/components/PinEntryDialog";
import { getCurrentlyOutRecords, HallPassRecord } from "@/lib/supabaseDataManager";
import { CLASSROOM_ID } from "@/config/classroom";

const Index = () => {
  const [currentView, setCurrentView] = useState<'select' | 'student' | 'teacher' | 'multiple'>('select');
  const [currentlyOutRecords, setCurrentlyOutRecords] = useState<HallPassRecord[]>([]);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);

  const loadCurrentlyOut = async () => {
    const records = await getCurrentlyOutRecords();
    setCurrentlyOutRecords(records);
  };

  useEffect(() => {
    loadCurrentlyOut();
    const interval = setInterval(loadCurrentlyOut, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleBackToSelection = () => {
    console.log("handleBackToSelection called - returning to role selector");
    setCurrentView('select');
    setIsTeacherAuthenticated(false);
  };

  const handleStudentModeClick = () => {
    setCurrentView('student');
  };

  const handleTeacherModeClick = () => {
    if (isTeacherAuthenticated) {
      setCurrentView('teacher');
    } else {
      setShowPinDialog(true);
    }
  };

  const handlePinSuccess = () => {
    setIsTeacherAuthenticated(true);
    setShowPinDialog(false);
    setCurrentView('teacher');
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
  };

  // Clear teacher authentication on page reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsTeacherAuthenticated(false);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        onSignOutAnother={handleBackToSelection}
      />
    );
  }

  // Role Selector View (default)
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="font-brittany text-6xl text-gray-800 mb-1 tracking-wide">Mr. Garnett's</h1>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Bathroom Pass Kiosk</h1>
            <p className="text-lg text-gray-600">Select your role to continue</p>
            {currentlyOutRecords.length > 0 && (
              <p className="text-lg text-orange-600 font-semibold mt-2">
                {currentlyOutRecords.length} student{currentlyOutRecords.length !== 1 ? 's' : ''} currently out
              </p>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
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

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleTeacherModeClick}>
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

          <div className="w-full">
            <Button 
              variant="outline" 
              className="w-full py-3 text-lg"
              onClick={() => window.location.href = '/sign-in'}
            >
              Sign In to Class (Late Arrival)
            </Button>
          </div>
        </div>
      </div>

      <PinEntryDialog
        isOpen={showPinDialog}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />
    </>
  );
};

export default Index;
