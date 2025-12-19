import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserX,
  Search,
  UserCheck,
  XCircle,
  Clock,
} from "lucide-react";

interface UnknownEntry {
  id: string;
  raw_student_name: string;
  period: string | null;
  destination: string | null;
  first_seen_at: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface ResolveResult {
  success: boolean;
  error?: string;
  student_name?: string;
  passes_updated?: number;
}

const UnknownsQueue = () => {
  const { toast } = useToast();
  const [unknowns, setUnknowns] = useState<UnknownEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resolve dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedUnknown, setSelectedUnknown] = useState<UnknownEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const fetchUnknowns = async () => {
    try {
      const { data, error } = await supabase
        .from("hp_unmatched_names")
        .select("id, raw_student_name, period, destination, first_seen_at")
        .order("first_seen_at", { ascending: false });

      if (error) {
        console.error("Error fetching unknowns:", error);
        return;
      }

      setUnknowns(data || []);
    } catch (error) {
      console.error("Error fetching unknowns:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name")
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
      await Promise.all([fetchUnknowns(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const openResolveDialog = (unknown: UnknownEntry) => {
    setSelectedUnknown(unknown);
    setSearchQuery("");
    setSelectedUserId("");
    setResolveDialogOpen(true);
  };

  const closeResolveDialog = () => {
    setResolveDialogOpen(false);
    setSelectedUnknown(null);
    setSearchQuery("");
    setSelectedUserId("");
  };

  const handleResolve = async () => {
    if (!selectedUnknown || !selectedUserId) return;

    setIsResolving(true);

    try {
      const { data, error } = await supabase.rpc("resolve_unknown_signout", {
        p_unknown_id: selectedUnknown.id,
        p_student_id: selectedUserId,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Resolution failed",
          description: error.message,
        });
        setIsResolving(false);
        return;
      }

      const result = data as ResolveResult;

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Resolution failed",
          description: result.error || "Unknown error",
        });
        setIsResolving(false);
        return;
      }

      toast({
        title: "Unknown resolved",
        description: `"${selectedUnknown.raw_student_name}" → ${result.student_name}. Updated ${result.passes_updated} pass${result.passes_updated !== 1 ? "es" : ""}.`,
      });

      // Remove from list and close dialog
      setUnknowns((prev) => prev.filter((u) => u.id !== selectedUnknown.id));
      closeResolveDialog();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Resolution failed",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleDismiss = async (unknown: UnknownEntry) => {
    try {
      const { data, error } = await supabase.rpc("dismiss_unknown", {
        p_unknown_id: unknown.id,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Dismiss failed",
          description: error.message,
        });
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Dismiss failed",
          description: result.error || "Unknown error",
        });
        return;
      }

      toast({
        title: "Entry dismissed",
        description: `"${unknown.raw_student_name}" has been dismissed.`,
      });

      setUnknowns((prev) => prev.filter((u) => u.id !== unknown.id));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Dismiss failed",
        description: "An unexpected error occurred",
      });
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const reverseName = `${user.last_name} ${user.first_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || reverseName.includes(query);
  });

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading unknown students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unknowns.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Unknown Students Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">
            <UserCheck className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-70" />
            <h2 className="text-xl font-semibold mb-2">All clear!</h2>
            <p>There are no unknown students pending resolution.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Unknown Students Queue
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({unknowns.length} pending)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            These students were signed out via teacher override but couldn't be matched to the roster.
            Resolve each entry by selecting the correct student.
          </p>

          <div className="space-y-3">
            {unknowns.map((unknown) => (
              <div
                key={unknown.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200"
              >
                <div className="flex-shrink-0">
                  <UserX className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    "{unknown.raw_student_name}"
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                    {unknown.period && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        Period {unknown.period}
                      </span>
                    )}
                    {unknown.destination && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {unknown.destination}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(unknown.first_seen_at)}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(unknown)}
                    className="text-gray-600"
                    title="Dismiss this entry (mark as invalid)"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openResolveDialog(unknown)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={closeResolveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Unknown Student</DialogTitle>
            <DialogDescription>
              Match "{selectedUnknown?.raw_student_name}" to a student in the roster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search input */}
            <div className="space-y-2">
              <Label htmlFor="student-search">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="student-search"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Student selector */}
            <div className="space-y-2">
              <Label htmlFor="student-select">Select Student</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {filteredUsers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No students found
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.last_name}, {user.first_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>"{selectedUnknown?.raw_student_name}"</strong> will be mapped to{" "}
                  <strong>
                    {(() => {
                      const user = users.find((u) => u.id === selectedUserId);
                      return user ? `${user.first_name} ${user.last_name}` : "";
                    })()}
                  </strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  All associated passes will be updated. A synonym will be created for future matching.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeResolveDialog} disabled={isResolving}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!selectedUserId || isResolving}>
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UnknownsQueue;

