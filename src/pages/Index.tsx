
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap } from "lucide-react";
import StudentView from "@/components/StudentView";
import TeacherView from "@/components/TeacherView";

const Index = () => {
  const [currentView, setCurrentView] = useState<'select' | 'student' | 'teacher'>('select');

  const handleBackToSelection = () => {
    setCurrentView('select');
  };

  if (currentView === 'student') {
    return <StudentView onBack={handleBackToSelection} />;
  }

  if (currentView === 'teacher') {
    return <TeacherView onBack={handleBackToSelection} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Bathroom Pass System</h1>
          <p className="text-lg text-gray-600">Select your role to continue</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('student')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Student</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">Sign in or out for bathroom breaks</p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Continue as Student
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
