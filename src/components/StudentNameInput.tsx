
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentNameInputProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  studentNames: string[];
}

const StudentNameInput = ({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  studentNames
}: StudentNameInputProps) => {
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (firstName.trim().length > 1) {
      const filtered = studentNames.filter(name => 
        name.toLowerCase().includes(firstName.toLowerCase())
      ).slice(0, 5);
      setFilteredNames(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [firstName, studentNames]);

  const handleNameSelect = (fullName: string) => {
    const parts = fullName.split(' ');
    onFirstNameChange(parts[0] || '');
    onLastNameChange(parts.slice(1).join(' ') || '');
    setShowSuggestions(false);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 relative">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          type="text"
          placeholder="Enter first name"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          onFocus={() => firstName.trim().length > 1 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredNames.map((name, index) => (
              <div
                key={index}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleNameSelect(name)}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          type="text"
          placeholder="Enter last name"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default StudentNameInput;
