import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Users, GraduationCap, Calendar, BookOpen, MapPin, Settings } from 'lucide-react';

interface RosterEntry {
  Email: string;
  First: string;
  Last: string;
  Class: string;
  Period: string;
}

interface StudentReport {
  'Student ID (System)': string;
  'First Name': string;
  'Last Name': string;
  'Middle Name': string;
  'Grade Level': string;
  'User Name': string;
}

interface CurrentStudent {
  id: string;
  first_name: string;
  last_name: string;
  sis_id: string | null;
}

interface ProcessedData {
  users: any[];
  students: any[];
  academic_terms: any[];
  courses: any[];
  rosters: any[];
  locations: any[];
  settings: any[];
}

interface StudentDataProcessorProps {
  sourceData?: {
    roster: RosterEntry[];
    student_report: StudentReport[];
    current_students: CurrentStudent[];
  };
}

const StudentDataProcessor: React.FC<StudentDataProcessorProps> = ({ sourceData }) => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const processStudentData = () => {
    setIsProcessing(true);

    if (!sourceData) {
      console.error('No source data provided');
      setIsProcessing(false);
      return;
    }

    try {
      // Create maps for efficient lookups
      const sisMap = new Map();
      sourceData.student_report.forEach(student => {
        const key = `${student['First Name'].toLowerCase()}_${student['Last Name'].toLowerCase()}`;
        sisMap.set(key, {
          sis_id: student['Student ID (System)'],
          grade_level: student['Grade Level'],
          email: student['User Name'].includes('@') ? student['User Name'] : `${student['User Name']}@student.nchstx.org`
        });
      });

      const rosterMap = new Map();
      sourceData.roster.forEach(entry => {
        rosterMap.set(entry.Email, {
          first_name: entry.First,
          last_name: entry.Last,
          class_code: entry.Class,
          period: entry.Period,
          email: entry.Email
        });
      });

      // Process students and create clean dataset
      const users: any[] = [];
      const students: any[] = [];
      const courseSet = new Set<string>();

      sourceData.roster.forEach(entry => {
        const key = `${entry.First.toLowerCase()}_${entry.Last.toLowerCase()}`;
        const sisData = sisMap.get(key);
        
        const userId = generateUUID();
        const user = {
          id: userId,
          first_name: entry.First,
          last_name: entry.Last,
          email: entry.Email,
          role: 'student'
        };

        const student = {
          id: userId,
          sis_id: sisData?.sis_id || null,
          grade_level: sisData?.grade_level || '12'
        };

        users.push(user);
        students.push(student);
        courseSet.add(entry.Class);
      });

      // Create academic terms
      const academic_terms = [{
        id: 1,
        name: "Fall 2025",
        start_date: "2025-08-15",
        end_date: "2025-12-20"
      }];

      // Create courses
      const courses = Array.from(courseSet).map((classCode, index) => ({
        course_id: index + 1,
        course_code: classCode,
        course_name: classCode === 'ESS' ? 'Environmental Systems Science' : 
                    classCode === 'ECO' ? 'Economics' : classCode
      }));

      const courseMap = new Map();
      courses.forEach(course => {
        courseMap.set(course.course_code, course.course_id);
      });

      // Create rosters
      const rosters = sourceData.roster.map(entry => {
        const user = users.find(u => u.email === entry.Email);
        return {
          student_id: user?.id,
          course_id: courseMap.get(entry.Class),
          period_code: entry.Period,
          academic_term_id: 1
        };
      });

      // Create locations (boilerplate)
      const locations = [
        { id: 1, name: 'Main Office', type: 'office' },
        { id: 2, name: 'Library', type: 'library' },
        { id: 3, name: 'Main Restroom', type: 'restroom' }
      ];

      // Create settings (boilerplate)
      const settings = [
        { key: 'max_active_passes_per_student', value: '1' },
        { key: 'default_pass_duration_minutes', value: '10' }
      ];

      setProcessedData({
        users,
        students,
        academic_terms,
        courses,
        rosters,
        locations,
        settings
      });

    } catch (error) {
      console.error('Error processing data:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadAllCSVs = () => {
    if (!processedData) return;

    downloadCSV(processedData.users, 'users.csv');
    setTimeout(() => downloadCSV(processedData.students, 'students.csv'), 100);
    setTimeout(() => downloadCSV(processedData.academic_terms, 'academic_terms.csv'), 200);
    setTimeout(() => downloadCSV(processedData.courses, 'courses.csv'), 300);
    setTimeout(() => downloadCSV(processedData.rosters, 'rosters.csv'), 400);
    setTimeout(() => downloadCSV(processedData.locations, 'locations.csv'), 500);
    setTimeout(() => downloadCSV(processedData.settings, 'settings.csv'), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Student Data Processor
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform student roster data into structured CSV files for database import
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users Table</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedData?.users.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Student user accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedData?.students.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Student records with SIS IDs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedData?.courses.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique course offerings
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Button 
            onClick={processStudentData}
            disabled={isProcessing}
            size="lg"
            className="w-full max-w-md"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing Data...' : 'Process Student Data'}
          </Button>

          {processedData && (
            <Button 
              onClick={downloadAllCSVs}
              variant="outline"
              size="lg"
              className="w-full max-w-md"
            >
              <Download className="mr-2 h-4 w-4" />
              Download All CSV Files
            </Button>
          )}
        </div>

        {processedData && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(processedData).map(([tableName, data]) => (
              <Card key={tableName} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {tableName.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{data.length} rows</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 p-0 h-auto"
                    onClick={() => downloadCSV(data, `${tableName}.csv`)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDataProcessor;