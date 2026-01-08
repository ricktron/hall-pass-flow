/**
 * roster.ts
 * 
 * Roster service that prefers student_enrollments table for Semester 2 class membership.
 * Falls back to legacy roster logic if enrollments are unavailable or return empty.
 * 
 * This service provides course + period filtering for accurate roster display.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchStudents, type Student } from "@/lib/studentsRepository";

export interface AcademicContext {
  schoolYear: string;
  semester: string;
}

export interface RosterFilter {
  course?: string; // Course code (e.g., "ESS", "ECO"). If not provided, returns all courses for the period.
  period: string; // Period code (e.g., "A", "B", "C")
}

export interface RosterStudent {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface RosterMetadata {
  source: 'enrollments' | 'legacy';
  reason?: string; // Only present when source is 'legacy'
  errorCode?: string; // Only present when fallback due to error
  errorStatus?: number; // Only present when fallback due to error
}

export interface RosterResult {
  students: RosterStudent[];
  metadata: RosterMetadata;
}

/**
 * Gets the current academic context (school year and semester).
 * Defaults to "2025-2026" and "S2" (Semester 2).
 * Can be overridden via environment variables:
 * - VITE_SCHOOL_YEAR or NEXT_PUBLIC_SCHOOL_YEAR or REACT_APP_SCHOOL_YEAR
 * - VITE_SEMESTER or NEXT_PUBLIC_SEMESTER or REACT_APP_SEMESTER
 */
export function getAcademicContext(): AcademicContext {
  // Try VITE_ prefix first (Vite convention)
  const schoolYear = 
    import.meta.env.VITE_SCHOOL_YEAR ||
    import.meta.env.NEXT_PUBLIC_SCHOOL_YEAR ||
    import.meta.env.REACT_APP_SCHOOL_YEAR ||
    "2025-2026";
  
  const semester =
    import.meta.env.VITE_SEMESTER ||
    import.meta.env.NEXT_PUBLIC_SEMESTER ||
    import.meta.env.REACT_APP_SEMESTER ||
    "S2";
  
  return { schoolYear, semester };
}

/**
 * Normalizes a period string by removing trailing " Period" (case-insensitive) and trimming whitespace.
 * 
 * Examples:
 * - "A Period" -> "A"
 * - "B period" -> "B"
 * - "C" -> "C"
 * - "House Small Group" -> "House Small Group"
 * 
 * @param period - Period string that may include " Period" suffix
 * @returns Normalized period string (letter or full name without " Period" suffix)
 */
export function normalizePeriod(period: string): string {
  return period.replace(/\s*Period\s*$/i, "").trim();
}

/**
 * Maps course codes to full course names used in the database.
 * If the course is not a known code, returns it unchanged.
 * 
 * @param course - Course code (e.g., "ESS", "ECO") or full name
 * @returns Full course name as stored in database, or original value if not a code
 */
function mapCourseCode(course: string | undefined | null): string | null {
  if (!course) return null;
  
  const courseMap: Record<string, string> = {
    'ESS': 'Earth and Space',
    'ECO': 'Ecology',
  };
  
  return courseMap[course.toUpperCase()] || course;
}

interface EnrollmentError {
  code?: string;
  status?: number;
  message?: string;
}

/**
 * Fetches students from student_enrollments table via RPC (preferred path).
 * Uses hp_get_roster RPC function which bypasses RLS safely.
 * 
 * Returns null if query fails or table doesn't exist (safe fallback).
 */
async function fetchFromEnrollments(
  context: AcademicContext,
  filter: RosterFilter
): Promise<{ students: RosterStudent[] | null; error?: EnrollmentError }> {
  try {
    // Normalize period before querying (RPC will also normalize, but we do it here for logging)
    const normalizedPeriod = normalizePeriod(filter.period);
    
    // Map course code to full name if needed (e.g., "ESS" -> "Earth and Space")
    const mappedCourse = mapCourseCode(filter.course);
    
    // Log the query parameters for debugging
    if (import.meta.env.DEV) {
      console.log(
        `[roster] Calling hp_get_roster RPC with:`,
        {
          school_year: context.schoolYear,
          semester: context.semester,
          period: filter.period,
          normalized_period: normalizedPeriod,
          course: filter.course || null,
          mapped_course: mappedCourse
        }
      );
    }
    
    // Call RPC function (RLS-safe, works for anon role)
    // Pass normalized period for consistency (RPC also normalizes internally)
    const { data: rosterRows, error: rpcError } = await supabase.rpc('hp_get_roster', {
      p_school_year: context.schoolYear,
      p_semester: context.semester,
      p_period: normalizedPeriod, // Pass normalized period for consistency
      p_course: mappedCourse
    });
    
    if (rpcError) {
      // RPC error - log details and fallback
      const errorCode = rpcError.code || "unknown";
      const errorStatus = (rpcError as EnrollmentError).status;
      
      if (import.meta.env.DEV) {
        console.error(
          `[roster] hp_get_roster RPC failed for ${context.schoolYear}/${context.semester}/${normalizedPeriod}:`,
          rpcError.message,
          `| Code: ${errorCode}, Status: ${errorStatus || "unknown"}`,
          `| Error details:`,
          rpcError
        );
      }
      return { 
        students: null, 
        error: { code: errorCode, status: errorStatus, message: rpcError.message } 
      };
    }
    
    if (!rosterRows || rosterRows.length === 0) {
      // No enrollments found for this filter - fallback
      if (import.meta.env.DEV) {
        console.warn(
          `[roster] No enrollments found for ${context.schoolYear}/${context.semester}/${normalizedPeriod}${filter.course ? `/${filter.course}` : ""} - falling back to legacy roster`
        );
      }
      return { students: null };
    }
    
    // Map RPC results to RosterStudent format
    // RPC returns: student_id, first_name, last_name, preferred_first_name, display_name, period, course
    const rosterStudents: RosterStudent[] = rosterRows
      .map((row: {
        student_id: string;
        first_name: string;
        last_name: string;
        preferred_first_name: string;
        display_name: string;
        period: string;
        course: string;
      }) => ({
        id: row.student_id,
        // Use display_name from RPC (which includes preferred_first_name logic)
        name: row.display_name,
        // Use preferred_first_name for firstName (nickname if available, else first_name)
        firstName: row.preferred_first_name,
        lastName: row.last_name,
        // Email not returned by RPC for privacy, but we can fetch it if needed later
        email: undefined,
      }))
      .sort((a, b) => {
        const lastCmp = a.lastName.localeCompare(b.lastName);
        return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
      });
    
    // Remove duplicates by ID (defensive)
    const uniqueStudents = Array.from(
      new Map(rosterStudents.map((s) => [s.id, s])).values()
    );
    
    if (import.meta.env.DEV) {
      console.log(
        `[roster] Fetched ${uniqueStudents.length} students from hp_get_roster RPC for`,
        { ...context, ...filter, row_count: rosterRows.length }
      );
    }
    
    return { students: uniqueStudents };
  } catch (err) {
    // Unexpected error - fallback
    if (import.meta.env.DEV) {
      console.error("[roster] Exception in fetchFromEnrollments:", err);
    }
    return { students: null };
  }
}

/**
 * Converts legacy Student[] to RosterStudent[] format.
 */
function convertLegacyStudents(students: Student[]): RosterStudent[] {
  return students.map((s) => ({
    id: s.id,
    name: s.name,
    firstName: s.firstName,
    lastName: s.lastName,
  }));
}

/**
 * Fetches roster students for a given course and period with metadata.
 * 
 * Preferred path: student_enrollments table (filtered by school_year, semester, course, period)
 * Fallback path: legacy fetchStudents() (all students, no filtering)
 * 
 * If course is not provided, returns all students enrolled in the period across all courses.
 * 
 * @param filter - Course (optional) and period (required) filter
 * @returns Roster result with students array and metadata about the source
 */
export async function fetchRosterStudentsWithMeta(
  filter: RosterFilter
): Promise<RosterResult> {
  const context = getAcademicContext();
  
  // Normalize period at entry point for defense in depth
  const normalizedFilter: RosterFilter = {
    ...filter,
    period: normalizePeriod(filter.period)
  };
  
  // Try preferred path: student_enrollments
  const enrollmentResult = await fetchFromEnrollments(context, normalizedFilter);
  
  if (enrollmentResult.students && enrollmentResult.students.length > 0) {
    return {
      students: enrollmentResult.students,
      metadata: { source: 'enrollments' }
    };
  }
  
  // Fallback: legacy roster logic
  const reason = enrollmentResult.error 
    ? `RLS or query error (${enrollmentResult.error.code || 'unknown'})`
    : 'No enrollments found for this period';
  
  if (import.meta.env.DEV) {
    console.warn(
      "[roster] Using fallback roster (legacy fetchStudents). Reason:",
      reason
    );
  }
  
  try {
    const legacyStudents = await fetchStudents();
    const converted = convertLegacyStudents(legacyStudents);
    
    // If course filter was provided, we can't filter legacy students by course,
    // so we return all students (period filter is handled at UI level if needed)
    if (import.meta.env.DEV && normalizedFilter.course) {
      console.warn(
        "[roster] Course filter",
        normalizedFilter.course,
        "ignored in fallback mode (legacy roster doesn't support course filtering)"
      );
    }
    
    return {
      students: converted,
      metadata: {
        source: 'legacy',
        reason,
        errorCode: enrollmentResult.error?.code,
        errorStatus: enrollmentResult.error?.status
      }
    };
  } catch (err) {
    console.error("[roster] Fallback roster fetch failed:", err);
    return {
      students: [],
      metadata: {
        source: 'legacy',
        reason: 'Fallback fetch failed'
      }
    };
  }
}

/**
 * Fetches roster students for a given course and period.
 * 
 * Preferred path: student_enrollments table (filtered by school_year, semester, course, period)
 * Fallback path: legacy fetchStudents() (all students, no filtering)
 * 
 * If course is not provided, returns all students enrolled in the period across all courses.
 * 
 * @param filter - Course (optional) and period (required) filter
 * @returns Array of roster students with id, name, and optional email
 */
export async function fetchRosterStudents(
  filter: RosterFilter
): Promise<RosterStudent[]> {
  // Normalize period at entry point (fetchRosterStudentsWithMeta also normalizes, but this ensures consistency)
  const normalizedFilter: RosterFilter = {
    ...filter,
    period: normalizePeriod(filter.period)
  };
  const result = await fetchRosterStudentsWithMeta(normalizedFilter);
  return result.students;
}

