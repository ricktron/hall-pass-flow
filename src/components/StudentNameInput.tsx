
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Student } from "@/lib/studentsRepository";

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
}

const StudentNameInput = ({
  students,
  selectedStudent,
  onStudentSelect,
  onKeyDown
}: StudentNameInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input when selectedStudent changes externally
  useEffect(() => {
    if (selectedStudent) {
      setInputValue(selectedStudent.name);
    } else {
      setInputValue("");
    }
  }, [selectedStudent]);

  // Filter students based on input
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      const searchTerm = inputValue.toLowerCase();
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm) ||
        student.firstName.toLowerCase().includes(searchTerm) ||
        student.lastName.toLowerCase().includes(searchTerm)
      ).slice(0, 8);
      setFilteredStudents(filtered);
      // Only show suggestions if we don't have an exact match selected
      const exactMatch = selectedStudent && 
        selectedStudent.name.toLowerCase() === inputValue.toLowerCase();
      setShowSuggestions(filtered.length > 0 && !exactMatch);
    } else {
      setFilteredStudents([]);
      setShowSuggestions(false);
    }
    setHighlightedIndex(-1);
  }, [inputValue, students, selectedStudent]);

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
    // Move to next field
    const nextField = document.getElementById('period-select');
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
    
    // If Enter is pressed and we have a selection, move to next field
    if (e.key === 'Enter' && selectedStudent) {
      e.preventDefault();
      onKeyDown?.(e, 'period-select');
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="studentName">Student Name</Label>
      <Input
        ref={inputRef}
        id="studentName"
        type="text"
        placeholder="Start typing student name..."
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => inputValue.trim().length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={selectedStudent ? "border-green-500 bg-green-50" : ""}
      />
      {selectedStudent && (
        <p className="text-xs text-green-600">
          ✓ {selectedStudent.name} selected
        </p>
      )}
      {!selectedStudent && inputValue.trim().length > 0 && (
        <p className="text-xs text-amber-600">
          Select your name from the list below
        </p>
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
          {filteredStudents.length === 0 && inputValue.trim().length > 0 && (
            <div className="px-3 py-2 text-gray-500 italic">
              No matching students found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentNameInput;
