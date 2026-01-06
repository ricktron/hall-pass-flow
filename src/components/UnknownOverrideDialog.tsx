import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PERIOD_OPTIONS, DESTINATION_OPTIONS } from "@/constants/formOptions";
import { CLASSROOM_ID } from "@/config/classroom";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { fetchRosterStudents, type RosterStudent } from "@/lib/roster";
import { fetchStudents, type Student } from "@/lib/studentsRepository";
import { addHallPassRecord } from "@/lib/supabaseDataManager";
import { DAYS_OF_WEEK } from "@/constants/formOptions";

interface UnknownOverrideDialogProps {
  isOpen: boolean;
  rawName: string;
  /** Pre-selected period from the form (optional) */
  initialPeriod?: string;
  /** Pre-selected destination from the form (optional) */
  initialDestination?: string;
  onSuccess: (data: { studentName: string; period: string; destination: string }) => void;
  onCancel: () => void;
}

interface SelectedRosterStudent {
  id: string;
  name: string;
}

const UnknownOverrideDialog = ({
  isOpen,
  rawName,
  initialPeriod = "",
  initialDestination = "",
  onSuccess,
  onCancel,
}: UnknownOverrideDialogProps) => {
  const [pin, setPin] = useState("");
  const [period, setPeriod] = useState(initialPeriod);
  const [destination, setDestination] = useState(initialDestination);
  const [isLoading, setIsLoading] = useState(false);
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SelectedRosterStudent | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<RosterStudent[]>([]);
  const [searchMode, setSearchMode] = useState<'periodRoster' | 'allStudents'>('periodRoster');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allStudentsLoading, setAllStudentsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPeriod(initialPeriod);
      setDestination(initialDestination);
      setSelectedStudent(null);
      setSearchInput(rawName);
      setSearchMode('periodRoster');
      setAllStudents([]);
    }
  }, [isOpen, initialPeriod, initialDestination, rawName]);

  // Reset selected student when switching search modes
  useEffect(() => {
    setSelectedStudent(null);
    setSearchInput(rawName);
  }, [searchMode, rawName]);

  // Load roster when period changes
  useEffect(() => {
    const loadRoster = async () => {
      if (!period) {
        setRosterStudents([]);
        return;
      }
      
      setRosterLoading(true);
      try {
        const students = await fetchRosterStudents({
          period,
          // Course is optional - returns all students for the period
        });
        setRosterStudents(students);
      } catch (error) {
        console.error("Failed to load roster for override:", error);
        setRosterStudents([]);
      } finally {
        setRosterLoading(false);
      }
    };
    
    if (isOpen && period) {
      loadRoster();
    }
  }, [period, isOpen]);

  // Load all students when switching to allStudents mode (lazy load)
  const loadAllStudents = useCallback(async () => {
    setAllStudentsLoading(true);
    try {
      const students = await fetchStudents();
      setAllStudents(students);
    } catch (error) {
      console.error("Failed to load all students:", error);
      setAllStudents([]);
      toast({
        title: "Error",
        description: "Failed to load student list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAllStudentsLoading(false);
    }
  }, [toast]);

  // Load all students when switching to allStudents mode
  useEffect(() => {
    if (searchMode === 'allStudents' && isOpen && allStudents.length === 0) {
      loadAllStudents();
    }
  }, [searchMode, isOpen, allStudents.length, loadAllStudents]);

  // Filter students based on search input and current mode
  useEffect(() => {
    const studentsToFilter = searchMode === 'periodRoster' 
      ? rosterStudents 
      : allStudents.map(s => ({ id: s.id, name: s.name, firstName: s.firstName, lastName: s.lastName }));
    
    if (!searchInput.trim()) {
      setFilteredStudents(studentsToFilter);
      return;
    }
    
    const searchLower = searchInput.toLowerCase();
    const filtered = studentsToFilter.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.firstName.toLowerCase().includes(searchLower) ||
      s.lastName.toLowerCase().includes(searchLower)
    );
    setFilteredStudents(filtered);
  }, [searchInput, rosterStudents, allStudents, searchMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Hard guard: require student selection from roster
    if (!selectedStudent || !selectedStudent.id) {
      toast({
        title: "Student Selection Required",
        description: "Please select a student from the roster. If the student is not in the list, they may need to be added to enrollments first.",
        variant: "destructive",
      });
      return;
    }

    if (!pin.trim()) {
      toast({
        title: "PIN Required",
        description: "Please enter the teacher PIN.",
        variant: "destructive",
      });
      return;
    }

    if (!period) {
      toast({
        title: "Period Required",
        description: "Please select a period.",
        variant: "destructive",
      });
      return;
    }

    if (!destination) {
      toast({
        title: "Destination Required",
        description: "Please select a destination.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the roster-selected student (real UUID, no placeholder)
      const now = new Date();
      const centralTimeOptions: Intl.DateTimeFormatOptions = {
        timeZone: "America/Chicago"
      };
      const centralTime = new Date(now.toLocaleString("en-US", centralTimeOptions));
      const dayOfWeek = DAYS_OF_WEEK[centralTime.getDay()];
      
      const success = await addHallPassRecord({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        period,
        timeOut: centralTime,
        timeIn: null,
        duration: null,
        dayOfWeek,
        destination,
        earlyDismissal: false,
        classroom: CLASSROOM_ID,
      });

      if (!success) {
        toast({
          title: "Override Failed",
          description: "Unable to create pass. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Success!
      toast({
        title: "Pass Created",
        description: `${selectedStudent.name} has been signed out via teacher override.`,
      });

      onSuccess({
        studentName: selectedStudent.name,
        period,
        destination,
      });
    } catch (error) {
      console.error("Override signout error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPin("");
    setPeriod("");
    setDestination("");
    onCancel();
  };

  // Filter out Early Dismissal from destinations for override flow
  const filteredDestinations = DESTINATION_OPTIONS.filter(
    (d) => d.value !== "Early Dismissal"
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Teacher Override
          </DialogTitle>
          <DialogDescription>
            Select a student from the roster and verify with teacher PIN to create a hall pass.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show the original typed name */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Original input: "{rawName}"
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Please select the correct student from the roster below.
                </p>
              </div>
            </div>
          </div>

          {/* Period selection */}
          <div className="space-y-2">
            <Label htmlFor="override-period">Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="override-period">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student selection from roster */}
          {period && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="override-student">
                  {searchMode === 'periodRoster' 
                    ? 'Select Student from Period Roster' 
                    : 'Select Student (All Students)'}
                </Label>
                {searchMode === 'periodRoster' && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600"
                    onClick={() => setSearchMode('allStudents')}
                  >
                    Search all students (override)
                  </Button>
                )}
                {searchMode === 'allStudents' && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-gray-600"
                    onClick={() => setSearchMode('periodRoster')}
                  >
                    Back to period roster
                  </Button>
                )}
              </div>

              {searchMode === 'allStudents' && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    If this student just transferred, update enrollments later.
                  </p>
                </div>
              )}

              {(searchMode === 'periodRoster' && rosterLoading) || (searchMode === 'allStudents' && allStudentsLoading) ? (
                <div className="text-sm text-gray-500">Loading students...</div>
              ) : (
                <>
                  <Input
                    id="override-student"
                    type="text"
                    placeholder="Search student name..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className={selectedStudent ? "border-green-500 bg-green-50" : ""}
                  />
                  {selectedStudent && (
                    <p className="text-xs text-green-600">
                      ✓ Selected: {selectedStudent.name}
                    </p>
                  )}
                  {!selectedStudent && searchInput.trim() && filteredStudents.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md mt-1">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setSelectedStudent({ id: student.id, name: student.name });
                            setSearchInput(student.name);
                          }}
                        >
                          {student.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {!selectedStudent && searchInput.trim() && filteredStudents.length === 0 && 
                   !rosterLoading && !allStudentsLoading && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-600">
                        No students found matching "{searchInput}".
                      </p>
                      {searchMode === 'periodRoster' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setSearchMode('allStudents')}
                        >
                          Search all students (override)
                        </Button>
                      )}
                    </div>
                  )}
                  {!selectedStudent && !searchInput.trim() && searchMode === 'periodRoster' && 
                   rosterStudents.length === 0 && !rosterLoading && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-600">
                        No students found in this period's roster.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSearchMode('allStudents')}
                      >
                        Search all students (override)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Destination selection */}
          <div className="space-y-2">
            <Label htmlFor="override-destination">Destination</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger id="override-destination">
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                {filteredDestinations.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN entry */}
          <div className="space-y-2">
            <Label htmlFor="override-pin">Teacher PIN</Label>
            <Input
              id="override-pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={10}
              className="text-center text-xl tracking-widest"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedStudent || !pin.trim() || !period || !destination}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Create Pass"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnknownOverrideDialog;

