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

interface EnrollmentError {
  code?: string;
  status?: number;
  message?: string;
}

/**
 * Fetches students from student_enrollments table (preferred path).
 * Queries enrollments filtered by school_year, semester, course (optional), and period.
 * Then fetches user details (id, name, email) for the enrolled students.
 * 
 * Returns null if query fails or table doesn't exist (safe fallback).
 */
async function fetchFromEnrollments(
  context: AcademicContext,
  filter: RosterFilter
): Promise<{ students: RosterStudent[] | null; error?: EnrollmentError }> {
  try {
    // Build query for student_enrollments
    // Note: student_enrollments may not be in generated types yet, so we use type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("student_enrollments")
      .select("student_id")
      .eq("school_year", context.schoolYear)
      .eq("semester", context.semester)
      .eq("period", filter.period);
    
    // Add course filter if provided
    if (filter.course) {
      query = query.eq("course", filter.course);
    }
    
    const { data: enrollments, error: enrollError } = await query;
    
    if (enrollError) {
      // RLS blocked, table doesn't exist, or other error - fallback
      const errorCode = enrollError.code || "unknown";
      const errorStatus = (enrollError as EnrollmentError).status;
      const isRLSBlocked = errorCode === "PGRST301" || errorStatus === 401 || errorStatus === 403;
      
      if (import.meta.env.DEV) {
        console.warn(
          `[roster] student_enrollments query failed for ${context.schoolYear}/${context.semester}/${filter.period}:`,
          enrollError.message,
          `| Code: ${errorCode}, Status: ${errorStatus || "unknown"}`,
          `| ${isRLSBlocked ? "RLS blocked - check authenticated role" : "Other error - falling back"}`
        );
      }
      return { 
        students: null, 
        error: { code: errorCode, status: errorStatus, message: enrollError.message } 
      };
    }
    
    if (!enrollments || enrollments.length === 0) {
      // No enrollments found for this filter - fallback
      if (import.meta.env.DEV) {
        console.warn(
          `[roster] No enrollments found for ${context.schoolYear}/${context.semester}/${filter.period}${filter.course ? `/${filter.course}` : ""} - falling back to legacy roster`
        );
      }
      return { students: null };
    }
    
    // Extract unique student IDs
    const studentIds = [...new Set(
      (enrollments as Array<{ student_id: string }>).map((e) => e.student_id)
    )] as string[];
    
    if (studentIds.length === 0) {
      return { students: null };
    }
    
    // Fetch user details for enrolled students
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", studentIds)
      .eq("role", "student");
    
    if (usersError) {
      if (import.meta.env.DEV) {
        console.warn("[roster] Failed to fetch user details:", usersError.message);
      }
      return { 
        students: null, 
        error: { code: usersError.code, message: usersError.message } 
      };
    }
    
    if (!users || users.length === 0) {
      return { students: null };
    }
    
    // Map to RosterStudent format, sorted by name
    const rosterStudents: RosterStudent[] = users
      .map((user) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
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
        `[roster] Fetched ${uniqueStudents.length} students from student_enrollments for`,
        { ...context, ...filter }
      );
    }
    
    return { students: uniqueStudents };
  } catch (err) {
    // Unexpected error - fallback
    if (import.meta.env.DEV) {
      console.warn("[roster] Exception in fetchFromEnrollments:", err);
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
  
  // Try preferred path: student_enrollments
  const enrollmentResult = await fetchFromEnrollments(context, filter);
  
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
    if (import.meta.env.DEV && filter.course) {
      console.warn(
        "[roster] Course filter",
        filter.course,
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
  const result = await fetchRosterStudentsWithMeta(filter);
  return result.students;
}

