/**
 * earlyDismissalRepository.ts
 * 
 * Data access for early dismissal signouts (hp_day_signouts).
 * Separate from bathroom_passes to not affect Currently Out or analytics.
 */

import { supabase } from "@/integrations/supabase/client";

export type DaySignoutRow = {
  id: string;
  created_at: string;
  classroom: string;
  period: string | null;
  student_id: string | null;
  student_name: string;
  reason: string | null;
  created_by: string | null;
};

/**
 * Fetches today's early dismissal signouts for a given classroom.
 */
export async function fetchTodaySignouts(classroom: string): Promise<DaySignoutRow[]> {
  try {
    // Type assertion needed because hp_day_signouts_today view may not be in types.ts yet
    const { data, error } = await (supabase
      .from("hp_day_signouts_today" as any)
      .select("*")
      .eq("classroom", classroom) as any);

    if (error) {
      console.error("[earlyDismissalRepository] fetchTodaySignouts error:", error.message);
      return [];
    }

    return (data || []) as DaySignoutRow[];
  } catch (err) {
    console.error("[earlyDismissalRepository] fetchTodaySignouts exception:", err);
    return [];
  }
}

/**
 * Records an early dismissal signout for the day.
 */
export async function recordDaySignout(args: {
  classroom: string;
  student_name: string;
  reason?: string;
  period?: string | null;
  student_id?: string | null;
}): Promise<string> {
  try {
    // Type assertion needed because record_day_signout RPC may not be in types.ts yet
    // Function signature: record_day_signout(p_classroom, p_student_name, p_reason, p_period, p_student_id)
    const { data, error } = await (supabase.rpc as any)("record_day_signout", {
      p_classroom: args.classroom,
      p_student_name: args.student_name,
      p_reason: args.reason || null,
      p_period: args.period || null,
      p_student_id: args.student_id || null,
    });

    if (error) {
      console.error("[earlyDismissalRepository] recordDaySignout error:", error.message);
      throw new Error(error.message);
    }

    // The RPC returns JSON with success, id, student_name, resolved
    const result = data as { success: boolean; id?: string; student_name?: string; resolved?: boolean; error?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to record signout");
    }

    return result.id || "";
  } catch (err) {
    console.error("[earlyDismissalRepository] recordDaySignout exception:", err);
    throw err;
  }
}

// Legacy exports for backward compatibility
export interface DaySignout {
  id: string;
  student_name: string;
  reason: string | null;
  created_at: string;
}

export interface RecordSignoutResult {
  success: boolean;
  id?: string;
  student_name?: string;
  resolved?: boolean;
  error?: string;
}

