/**
 * hpRosterRpc.ts
 * 
 * RPC wrapper for hp_get_roster function.
 * Provides type-safe access to the Supabase RPC that fetches roster data.
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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("hp_get_roster", payload);
  if (error) throw error;
  return (data ?? []) as HpRosterRow[];
}

