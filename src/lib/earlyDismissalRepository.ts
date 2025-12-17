/**
 * earlyDismissalRepository.ts
 * 
 * Data access for early dismissal signouts (hp_day_signouts).
 * Separate from bathroom_passes to not affect Currently Out or analytics.
 */

import { supabase } from "@/integrations/supabase/client";

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

/**
 * Fetches today's early dismissal signouts for a given classroom.
 */
export async function fetchTodaySignouts(classroom: string): Promise<DaySignout[]> {
  try {
    const { data, error } = await supabase
      .from("hp_day_signouts_today")
      .select("id, student_name, reason, created_at")
      .eq("classroom", classroom)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[earlyDismissalRepository] fetchTodaySignouts error:", error.message);
      return [];
    }

    return (data || []) as DaySignout[];
  } catch (err) {
    console.error("[earlyDismissalRepository] fetchTodaySignouts exception:", err);
    return [];
  }
}

/**
 * Records an early dismissal signout for the day.
 */
export async function recordDaySignout(
  classroom: string,
  studentName: string,
  reason?: string,
  recordedBy?: string
): Promise<RecordSignoutResult> {
  try {
    const { data, error } = await supabase.rpc("record_day_signout", {
      p_classroom: classroom,
      p_student_name: studentName,
      p_reason: reason || null,
      p_recorded_by: recordedBy || null,
    });

    if (error) {
      console.error("[earlyDismissalRepository] recordDaySignout error:", error.message);
      return { success: false, error: error.message };
    }

    // data is the JSON result from the function
    const result = data as RecordSignoutResult;
    return result;
  } catch (err) {
    console.error("[earlyDismissalRepository] recordDaySignout exception:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

