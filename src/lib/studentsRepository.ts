/**
 * studentsRepository.ts
 * 
 * Centralized data access for student roster.
 * Fetches students (users with role='student') from the users table.
 * Includes fallback strategies if primary query fails due to RLS or role mismatch.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAcademicContext, normalizePeriod } from "@/lib/roster";
import { hpGetRoster, type HpRosterRow } from "@/lib/hpRosterRpc";
import { CURRENT_SCHOOL_YEAR, CURRENT_SEMESTER } from "@/lib/academicContext";

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
 * Helper to map raw DB rows to Student interface.
 */
function mapRowsToStudents(
  rows: Array<{ id: string; first_name: string; last_name: string }>
): Student[] {
  return rows.map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    firstName: row.first_name,
    lastName: row.last_name,
  }));
}

/**
 * Primary query: users where role='student'
 */
async function fetchFromUsersWithRole(): Promise<Student[] | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("role", "student")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[studentsRepository] Primary query (users.role=student) failed:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRowsToStudents(data);
}

/**
 * Maps RPC roster rows to Student format.
 */
function mapRosterRowsToStudents(rosterRows: HpRosterRow[]): Student[] {
  return rosterRows.map((row) => ({
    id: row.student_id,
    name: row.display_name || `${row.first_name} ${row.last_name}`,
    firstName: row.preferred_first_name || row.first_name,
    lastName: row.last_name,
  }));
}

/**
 * Fetches students for a specific period via RPC.
 * This is the preferred method for S2 rosters as it bypasses RLS safely.
 * 
 * @param period - Period code (e.g., "A", "B") - will be normalized
 * @param course - Optional course filter
 * @returns Array of students for the period, or empty array if none found
 */
export async function fetchStudentsForPeriod(
  period: string,
  course?: string | null
): Promise<Student[]> {
  try {
    const context = getAcademicContext();
    const normalizedPeriod = normalizePeriod(period);
    
    const rosterRows = await hpGetRoster(supabase, {
      schoolYear: context.schoolYear,
      semester: context.semester,
      period: normalizedPeriod,
      course: course ?? null
    });
    
    if (!rosterRows || rosterRows.length === 0) {
      return [];
    }
    
    const students = mapRosterRowsToStudents(rosterRows);
    // Sort by last name, then first name
    students.sort((a, b) => {
      const lastCmp = a.lastName.localeCompare(b.lastName);
      return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
    });
    
    // Remove duplicates by ID (defensive)
    const uniqueStudents = Array.from(
      new Map(students.map((s) => [s.id, s])).values()
    );
    
    if (import.meta.env.DEV) {
      console.log(`[studentsRepository] fetchStudentsForPeriod succeeded with ${uniqueStudents.length} students for period ${normalizedPeriod}`);
    }
    
    return uniqueStudents;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error(`[studentsRepository] fetchStudentsForPeriod failed for period ${period}:`, err);
    }
    return [];
  }
}

/**
 * RPC-first strategy: fetch students via hp_get_roster RPC.
 * This is the preferred method for S2 rosters as it bypasses RLS safely.
 * Tries common periods (A, B, D, E, H) to get a representative sample.
 */
async function fetchFromRpc(): Promise<Student[] | null> {
  try {
    const context = getAcademicContext();
    
    if (import.meta.env.DEV) {
      console.log(
        `[studentsRepository] RPC strategy: attempting to fetch students via hp_get_roster`,
        {
          schoolYear: context.schoolYear,
          semester: context.semester,
          periods: ['A', 'B', 'D', 'E', 'H']
        }
      );
    }
    
    // Try common periods to get students (RPC requires period parameter)
    const commonPeriods = ['A', 'B', 'D', 'E', 'H'];
    const allStudents = new Map<string, Student>();
    
    for (const period of commonPeriods) {
      try {
        const rosterRows = await hpGetRoster(supabase, {
          schoolYear: context.schoolYear,
          semester: context.semester,
          period: period,
          course: null // Get all courses for the period (omitted in RPC call)
        });
        
        if (rosterRows && rosterRows.length > 0) {
          // Map RPC results to Student format
          const periodStudents = mapRosterRowsToStudents(rosterRows);
          for (const student of periodStudents) {
            if (!allStudents.has(student.id)) {
              allStudents.set(student.id, student);
            }
          }
          
          if (import.meta.env.DEV) {
            console.log(
              `[studentsRepository] RPC strategy: period ${period} returned ${rosterRows.length} rows, ${periodStudents.length} students (${allStudents.size} unique total)`
            );
          }
        } else {
          if (import.meta.env.DEV) {
            console.log(`[studentsRepository] RPC strategy: period ${period} returned 0 rows`);
          }
        }
      } catch (rpcError) {
        if (import.meta.env.DEV) {
          const error = rpcError as { message?: string };
          console.warn(`[studentsRepository] RPC strategy: period ${period} failed:`, error?.message || String(rpcError));
        }
        // Continue to next period
        continue;
      }
    }
    
    if (allStudents.size > 0) {
      const students = Array.from(allStudents.values());
      // Sort by last name, then first name
      students.sort((a, b) => {
        const lastCmp = a.lastName.localeCompare(b.lastName);
        return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
      });
      
      if (import.meta.env.DEV) {
        console.log(
          `[studentsRepository] RPC strategy succeeded: ${students.length} unique students returned`,
          {
            schoolYear: context.schoolYear,
            semester: context.semester,
            strategy: 'hp_get_roster RPC'
          }
        );
      }
      return students;
    }
    
    if (import.meta.env.DEV) {
      console.warn(
        `[studentsRepository] RPC strategy: no students found across all periods`,
        {
          schoolYear: context.schoolYear,
          semester: context.semester
        }
      );
    }
    return null;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[studentsRepository] RPC strategy exception:", err);
    }
    return null;
  }
}

/**
 * Fallback query: join students table with users table.
 * students.id is FK to users.id, so this finds users who exist in the students table.
 */
async function fetchFromStudentsJoinUsers(): Promise<Student[] | null> {
  // Query students table and join to users via the FK relationship
  const { data, error } = await supabase
    .from("students")
    .select("id, users!students_id_fkey(first_name, last_name)")
    .order("id", { ascending: true });

  if (error) {
    console.error("[studentsRepository] Fallback query (students join users) failed:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Map the joined data - users is embedded as an object
  const students: Student[] = [];
  for (const row of data) {
    const user = row.users as { first_name: string; last_name: string } | null;
    if (user && user.first_name && user.last_name) {
      students.push({
        id: row.id,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
      });
    }
  }

  // Sort by last name, then first name
  students.sort((a, b) => {
    const lastCmp = a.lastName.localeCompare(b.lastName);
    return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
  });

  return students.length > 0 ? students : null;
}

/**
 * Fetches all students from the database.
 * 
 * Strategy (in order):
 * 1. RPC-first: hp_get_roster RPC (preferred for S2, bypasses RLS)
 * 2. Primary: users where role='student'
 * 3. Fallback: students table joined with users (if previous strategies fail or return empty)
 * 
 * Returns sorted by last name, then first name.
 */
export async function fetchStudents(): Promise<Student[]> {
  const context = getAcademicContext();
  
  try {
    // Strategy 1: RPC-first (preferred for S2 rosters)
    if (import.meta.env.DEV) {
      console.log(
        `[studentsRepository] fetchStudents: starting with RPC strategy`,
        {
          schoolYear: context.schoolYear,
          semester: context.semester
        }
      );
    }
    
    const rpcResult = await fetchFromRpc();
    if (rpcResult && rpcResult.length > 0) {
      if (import.meta.env.DEV) {
        console.log(
          `[studentsRepository] fetchStudents: RPC strategy succeeded`,
          {
            strategy: 'hp_get_roster RPC',
            studentCount: rpcResult.length,
            schoolYear: context.schoolYear,
            semester: context.semester
          }
        );
      }
      return rpcResult;
    }
    
    if (import.meta.env.DEV) {
      console.warn(
        "[studentsRepository] fetchStudents: RPC strategy returned no students, attempting primary query",
        {
          schoolYear: context.schoolYear,
          semester: context.semester
        }
      );
    }

    // Strategy 2: Primary query
    const primaryResult = await fetchFromUsersWithRole();
    if (primaryResult && primaryResult.length > 0) {
      if (import.meta.env.DEV) {
        console.log(
          `[studentsRepository] fetchStudents: primary query succeeded`,
          {
            strategy: 'users.role=student',
            studentCount: primaryResult.length
          }
        );
      }
      return primaryResult;
    }

    // Strategy 3: Fallback: students join users
    if (import.meta.env.DEV) {
      console.warn(
        "[studentsRepository] fetchStudents: primary query returned no students, attempting fallback via students table"
      );
    }
    const fallbackResult = await fetchFromStudentsJoinUsers();
    if (fallbackResult && fallbackResult.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(
          `[studentsRepository] fetchStudents: fallback succeeded`,
          {
            strategy: 'students join users',
            studentCount: fallbackResult.length
          }
        );
      }
      return fallbackResult;
    }

    // Only warn if we're in S2 and RPC should have worked
    if (context.semester === 'S2') {
      console.warn(
        "[studentsRepository] fetchStudents: No students found via any query strategy (S2 should use RPC)",
        {
          schoolYear: context.schoolYear,
          semester: context.semester,
          strategiesAttempted: ['hp_get_roster RPC', 'users.role=student', 'students join users']
        }
      );
    } else {
      console.warn(
        "[studentsRepository] fetchStudents: No students found via any query strategy",
        {
          schoolYear: context.schoolYear,
          semester: context.semester
        }
      );
    }
    return [];
  } catch (err) {
    console.error("[studentsRepository] fetchStudents exception:", err);
    return [];
  }
}

