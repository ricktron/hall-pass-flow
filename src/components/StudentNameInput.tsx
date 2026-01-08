
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { Student } from "@/lib/studentsRepository";
import { supabase } from "@/integrations/supabase/client";

export interface SelectedStudent {
  id: string;
  name: string;
}

interface StudentNameInputProps {
  /** List of students with IDs from the roster */
  students: Student[];
  /** Currently selected student (null if none selected) */
  selectedStudent: SelectedStudent | null;
  /** Called when a student is selected from the dropdown */
  onStudentSelect: (student: SelectedStudent | null) => void;
  onKeyDown?: (e: React.KeyboardEvent, nextFieldId?: string) => void;
  /** Called when teacher override is requested (student not in list) */
  onTeacherOverride?: (rawName: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Current period - used to determine if directory search should be used (House Small Group) */
  period?: string;
}

export interface StudentNameInputRef {
  focus: () => void;
}

/**
 * Tokenizes a name for order-agnostic matching.
 * Normalizes: lowercase, removes punctuation, splits on whitespace and comma.
 * Supports: "first last", "last first", "last, first"
 */
function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[''.-]/g, '') // Remove apostrophes, periods, hyphens
    .split(/[\s,]+/) // Split on whitespace and commas
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

/**
 * Token-based matching: checks if all input tokens match the start of any student token.
 * Order-agnostic: "smith john" matches "John Smith"
 */
function matchesTokens(studentTokens: string[], inputTokens: string[]): boolean {
  if (inputTokens.length === 0) return false;
  
  // Each input token must match the start of at least one student token
  return inputTokens.every(inputToken => 
    studentTokens.some(studentToken => 
      studentToken.startsWith(inputToken)
    )
  );
}

/**
 * Scores how well input tokens match student tokens.
 * Higher score = better match.
 */
function scoreMatch(studentTokens: string[], inputTokens: string[]): number {
  let score = 0;
  for (const inputToken of inputTokens) {
    for (const studentToken of studentTokens) {
      if (studentToken === inputToken) {
        score += 10; // Exact match
      } else if (studentToken.startsWith(inputToken)) {
        score += inputToken.length; // Partial match by length
      }
    }
  }
  return score;
}

const StudentNameInput = forwardRef<StudentNameInputRef, StudentNameInputProps>(({
  students,
  selectedStudent,
  onStudentSelect,
  onKeyDown,
  onTeacherOverride,
  disabled = false,
  period = ""
}, ref) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [directorySearchResults, setDirectorySearchResults] = useState<Student[]>([]);
  const [directorySearchLoading, setDirectorySearchLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if we should use directory search (House Small Group)
  const useDirectorySearch = period === "House Small Group";

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Pre-compute tokenized names for efficient matching
  const studentTokensMap = useRef<Map<string, string[]>>(new Map());
  
  useEffect(() => {
    studentTokensMap.current.clear();
    for (const student of students) {
      studentTokensMap.current.set(student.id, tokenizeName(student.name));
    }
  }, [students]);

  // Update input when selectedStudent changes externally
  useEffect(() => {
    if (selectedStudent) {
      setInputValue(selectedStudent.name);
    } else {
      setInputValue("");
    }
  }, [selectedStudent]);

  // Directory search function for House Small Group
  const performDirectorySearch = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setDirectorySearchResults([]);
      return;
    }

    setDirectorySearchLoading(true);
    try {
      // Query users table for students matching the search term
      // Search in first_name and last_name
      const searchLower = searchTerm.toLowerCase();
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("role", "student")
        .or(`first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%`)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(20);

      if (error) {
        console.error("[StudentNameInput] Directory search error:", error);
        setDirectorySearchResults([]);
        return;
      }

      // Map results to Student format
      const searchResults: Student[] = (data || []).map((row) => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        firstName: row.first_name,
        lastName: row.last_name,
      }));

      setDirectorySearchResults(searchResults);
    } catch (err) {
      console.error("[StudentNameInput] Directory search exception:", err);
      setDirectorySearchResults([]);
    } finally {
      setDirectorySearchLoading(false);
    }
  }, []);

  // Debounced directory search for House Small Group
  useEffect(() => {
    if (!useDirectorySearch) {
      setDirectorySearchResults([]);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce directory search (250ms)
    debounceTimerRef.current = setTimeout(() => {
      performDirectorySearch(inputValue);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, useDirectorySearch, performDirectorySearch]);

  // Filter students based on input using token-based matching (for normal periods)
  useEffect(() => {
    if (useDirectorySearch) {
      // For House Small Group, use directory search results
      setFilteredStudents(directorySearchResults);
      const exactMatch = selectedStudent && 
        selectedStudent.name.toLowerCase() === inputValue.toLowerCase();
      setShowSuggestions(directorySearchResults.length > 0 && !exactMatch && inputValue.trim().length >= 2);
      return;
    }

    // Normal period: use roster-based filtering
    if (inputValue.trim().length > 0) {
      const inputTokens = tokenizeName(inputValue);
      
      // Filter students whose tokens match input tokens
      const matches = students
        .filter(student => {
          const studentTokens = studentTokensMap.current.get(student.id) || tokenizeName(student.name);
          return matchesTokens(studentTokens, inputTokens);
        })
        .map(student => {
          const studentTokens = studentTokensMap.current.get(student.id) || tokenizeName(student.name);
          return {
            student,
            score: scoreMatch(studentTokens, inputTokens)
          };
        })
        .sort((a, b) => b.score - a.score) // Best matches first
        .slice(0, 8)
        .map(m => m.student);
      
      setFilteredStudents(matches);
      // Only show suggestions if we don't have an exact match selected
      const exactMatch = selectedStudent && 
        selectedStudent.name.toLowerCase() === inputValue.toLowerCase();
      setShowSuggestions(matches.length > 0 && !exactMatch);
    } else {
      setFilteredStudents([]);
      setShowSuggestions(false);
    }
    setHighlightedIndex(-1);
  }, [inputValue, students, selectedStudent, useDirectorySearch, directorySearchResults]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Clear selection if user is typing something different
    if (selectedStudent && value !== selectedStudent.name) {
      onStudentSelect(null);
    }
  };

  const handleStudentSelect = (student: Student) => {
    onStudentSelect({ id: student.id, name: student.name });
    setInputValue(student.name);
    setShowSuggestions(false);
    // Move to next field (destination)
    const nextField = document.getElementById('destination-select');
    if (nextField) {
      nextField.focus();
      if (nextField.getAttribute('role') === 'combobox') {
        nextField.click();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredStudents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredStudents.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        handleStudentSelect(filteredStudents[highlightedIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    
    // If Enter is pressed and we have a selection, move to next field (destination)
    if (e.key === 'Enter' && selectedStudent) {
      e.preventDefault();
      onKeyDown?.(e, 'destination-select');
    }
  };

  const handleTeacherOverrideClick = () => {
    if (onTeacherOverride && inputValue.trim().length > 0) {
      onTeacherOverride(inputValue.trim());
    }
  };

  // Determine if we should show "not in list" state
  const trimmedInput = inputValue.trim();
  const showNotInList = !selectedStudent && 
    trimmedInput.length >= 3 && 
    filteredStudents.length === 0;

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="studentName">Student Name</Label>
      <Input
        ref={inputRef}
        id="studentName"
        type="text"
        placeholder={disabled ? "Select a period first..." : useDirectorySearch ? "Type at least 2 characters to search..." : "Start typing student name..."}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => !disabled && inputValue.trim().length > 0 && !showNotInList && setShowSuggestions(filteredStudents.length > 0)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        disabled={disabled}
        className={disabled ? "bg-gray-100 cursor-not-allowed" : selectedStudent ? "border-green-500 bg-green-50" : showNotInList ? "border-amber-500 bg-amber-50" : ""}
      />
      {useDirectorySearch && directorySearchLoading && inputValue.trim().length >= 2 && (
        <p className="text-xs text-gray-500">Searching...</p>
      )}
      {selectedStudent && (
        <p className="text-xs text-green-600">
          ✓ {selectedStudent.name} selected
        </p>
      )}
      {!selectedStudent && trimmedInput.length > 0 && !showNotInList && !useDirectorySearch && (
        <p className="text-xs text-amber-600">
          Select your name from the list below
        </p>
      )}
      {useDirectorySearch && trimmedInput.length > 0 && trimmedInput.length < 2 && (
        <p className="text-xs text-gray-500">
          Type at least 2 characters to search for students
        </p>
      )}
      
      {/* Not in list state */}
      {showNotInList && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Not in list, talk to Garnett.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              If your name isn't appearing, ask your teacher for help.
            </p>
          </div>
          {onTeacherOverride && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTeacherOverrideClick}
              className="flex-shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
            >
              Teacher Override
            </Button>
          )}
        </div>
      )}
      
      {showSuggestions && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
          {filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightedIndex 
                  ? "bg-blue-100" 
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleStudentSelect(student)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="font-medium">{student.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

StudentNameInput.displayName = "StudentNameInput";

export default StudentNameInput;
