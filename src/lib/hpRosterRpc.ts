/**
 * hpRosterRpc.ts
 * 
 * RPC wrappers for hp_get_roster and hp_get_roster_counts functions.
 * Provides type-safe access to the Supabase RPCs that fetch roster data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type HpRosterRow = {
  student_id: string;
  first_name: string;
  last_name: string;
  preferred_first_name: string | null;
  display_name: string | null;
  period: string;   // "A", "B", etc
  course: string;   // human readable (as returned by RPC)
};

export type HpRosterArgs = {
  schoolYear: string;   // "2025-2026"
  semester: string;     // "S2"
  period: string;       // "A" etc (already normalized)
  course?: string | null;
};

/**
 * Calls the hp_get_roster RPC function.
 * 
 * @param supabase - Supabase client instance
 * @param args - Roster query arguments
 * @returns Array of roster rows
 * @throws Error if RPC call fails
 */
export async function hpGetRoster(
  supabase: SupabaseClient<Database>,
  args: HpRosterArgs
): Promise<HpRosterRow[]> {
  // Build RPC payload - omit p_course if course is null/undefined
  const payload: Record<string, unknown> = {
    p_school_year: args.schoolYear,
    p_semester: args.semester,
    p_period: args.period,
  };
  
  // Only include p_course if course is provided (not null/undefined)
  if (args.course != null) {
    payload.p_course = args.course;
  }
  
  // Debug logging: log inputs after normalization
  console.debug('[hpGetRoster] Calling hp_get_roster RPC with payload:', payload);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("hp_get_roster", payload);
  
  const rowCount = data?.length ?? 0;
  const usedRpc = !error;
  
  // Debug logging: log result
  console.debug(`[hpGetRoster] RPC result: ${usedRpc ? 'success' : 'error'}, count: ${rowCount}`, {
    usedRpc,
    count: rowCount,
    error: error ? { code: error.code, message: error.message } : null
  });
  
  if (error) {
    console.error('[hpGetRoster] RPC error:', error);
    throw error;
  }
  
  return (data ?? []) as HpRosterRow[];
}

/**
 * Calls the hp_get_roster_counts RPC function.
 * 
 * @param supabase - Supabase client instance
 * @param schoolYear - School year (e.g., "2025-2026")
 * @param semester - Semester (e.g., "S2")
 * @returns Record mapping period to student count
 * @throws Error if RPC call fails
 */
export async function hpGetRosterCounts(
  supabase: SupabaseClient<Database>,
  schoolYear: string,
  semester: string
): Promise<Record<string, number>> {
  const payload = {
    p_school_year: schoolYear,
    p_semester: semester,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("hp_get_roster_counts", payload);
  
  if (error) {
    console.error('[hpGetRosterCounts] RPC error:', error);
    throw new Error(`Failed to fetch roster counts: ${error.message}`);
  }
  
  // Convert array of { period, student_count } to Record<string, number>
  const counts: Record<string, number> = {};
  if (data && Array.isArray(data)) {
    for (const row of data) {
      if (row.period && typeof row.student_count === 'number') {
        counts[row.period] = Number(row.student_count);
      }
    }
  }
  
  return counts;
}

