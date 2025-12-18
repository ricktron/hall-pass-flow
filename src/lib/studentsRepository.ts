/**
 * studentsRepository.ts
 * 
 * Centralized data access for student roster.
 * Fetches students (users with role='student') from the users table.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Student {
  /** The UUID from users table - required for bathroom_passes.student_id FK */
  id: string;
  /** Display name: "First Last" */
  name: string;
  /** First name only (for autocomplete matching) */
  firstName: string;
  /** Last name only */
  lastName: string;
}

/**
 * Fetches all students (users with role='student') from the database.
 * Returns sorted by last name, then first name.
 */
export async function fetchStudents(): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("role", "student")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.error("[studentsRepository] fetchStudents error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn("[studentsRepository] No students found in users table");
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      firstName: row.first_name,
      lastName: row.last_name,
    }));
  } catch (err) {
    console.error("[studentsRepository] fetchStudents exception:", err);
    return [];
  }
}

