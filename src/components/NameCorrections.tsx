import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Loader2, UserX } from "lucide-react";

interface UnmatchedName {
  raw_student_name: string;
  count: number;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface LinkResult {
  success: boolean;
  updated_count?: number;
  student_name?: string;
  synonym_created?: boolean;
  error?: string;
}

const NameCorrections = () => {
  const { toast } = useToast();
  const [unmatchedNames, setUnmatchedNames] = useState<UnmatchedName[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingName, setLinkingName] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});

  const fetchUnmatchedNames = async () => {
    try {
      const { data, error } = await supabase
        .from("hp_unmatched_names")
        .select("*");

      if (error) {
        console.error("Error fetching unmatched names:", error);
        return;
      }

      // Map view data to UnmatchedName format
      const nameList: UnmatchedName[] = (data || [])
        .filter((row) => row.raw_student_name)
        .map((row) => ({
          raw_student_name: row.raw_student_name!,
          count: row.count || 1,
        }))
        .sort((a, b) => b.count - a.count);

      setUnmatchedNames(nameList);
    } catch (error) {
      console.error("Error fetching unmatched names:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("role", "student")
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUnmatchedNames(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleUserSelect = (rawName: string, userId: string) => {
    setSelectedUsers((prev) => ({ ...prev, [rawName]: userId }));
  };

  const handleLinkName = async (rawName: string) => {
    const userId = selectedUsers[rawName];
    if (!userId) {
      toast({
        variant: "destructive",
        title: "No user selected",
        description: "Please select a user to link this name to.",
      });
      return;
    }

    setLinkingName(rawName);

    try {
      // Type assertion needed because hp_resolve_unknown_name RPC may not be in types.ts yet
      const { data, error } = await (supabase.rpc as any)("hp_resolve_unknown_name", {
        p_raw_input: rawName,
        p_user_id: userId,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Resolve failed",
          description: error.message,
        });
        setLinkingName(null);
        return;
      }

      // The RPC should return a JSON result
      const result = (data as unknown) as LinkResult;

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Resolve failed",
          description: result.error || "Unknown error",
        });
        setLinkingName(null);
        return;
      }

      toast({
        title: "Name resolved successfully",
        description: `Updated ${result.updated_count || 0} records. "${rawName}" now maps to ${result.student_name || "student"}.${result.synonym_created ? " Synonym created for future passes." : ""}`,
      });

      // Refresh the unmatched names list
      await fetchUnmatchedNames();
      
      // Clear selection for this name
      setSelectedUsers((prev) => {
        const updated = { ...prev };
        delete updated[rawName];
        return updated;
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Resolve failed",
        description: "An unexpected error occurred",
      });
    } finally {
      setLinkingName(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading unmatched names...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unmatchedNames.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Name Corrections
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-70" />
            <h2 className="text-xl font-semibold mb-2">All names are matched!</h2>
            <p>There are no unmatched student names that need correction.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Name Corrections
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({unmatchedNames.length} unmatched name{unmatchedNames.length !== 1 ? "s" : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          The following names couldn't be automatically matched to a student.
          Select the correct student from the dropdown to link past records and
          create a synonym for future automatic matching.
        </p>

        <div className="space-y-3">
          {unmatchedNames.map((item) => (
            <div
              key={item.raw_student_name}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex-shrink-0">
                <UserX className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  "{item.raw_student_name}"
                </div>
                <div className="text-xs text-gray-500">
                  {item.count} record{item.count !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex-shrink-0 w-56">
                <Select
                  value={selectedUsers[item.raw_student_name] || ""}
                  onValueChange={(value) =>
                    handleUserSelect(item.raw_student_name, value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.last_name}, {user.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => handleLinkName(item.raw_student_name)}
                disabled={
                  !selectedUsers[item.raw_student_name] ||
                  linkingName === item.raw_student_name
                }
              >
                {linkingName === item.raw_student_name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Link"
                )}
              </Button>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Note:</strong> No students found in the users table. Make
            sure students are imported before linking names.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NameCorrections;

