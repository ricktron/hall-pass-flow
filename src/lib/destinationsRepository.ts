/**
 * destinationsRepository.ts
 * 
 * Centralized data access for hall pass destinations.
 * Fetches from DB (hall_pass_destinations) as single source of truth.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Destination {
  /** The value stored in bathroom_passes.destination */
  value: string;
  /** Display label for UI */
  label: string;
}

/**
 * Fetches active destinations from the database, ordered by sort_order.
 * Falls back to hardcoded list if DB query fails.
 */
export async function fetchDestinations(): Promise<Destination[]> {
  try {
    const { data, error } = await supabase
      .from("hall_pass_destinations")
      .select("key, label, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[destinationsRepository] fetchDestinations error:", error.message);
      return getFallbackDestinations();
    }

    if (!data || data.length === 0) {
      console.warn("[destinationsRepository] No destinations found in DB, using fallback");
      return getFallbackDestinations();
    }

    // Use label as the stored value for backward compatibility with existing data
    // Exception: testing_center is stored as "testing_center" not "Testing Center"
    return data.map((row) => ({
      value: row.key === "testing_center" ? "testing_center" : row.label,
      label: row.label,
    }));
  } catch (err) {
    console.error("[destinationsRepository] fetchDestinations exception:", err);
    return getFallbackDestinations();
  }
}

/**
 * Fallback destinations in case DB query fails.
 * Matches the existing hardcoded list to maintain backward compatibility.
 */
function getFallbackDestinations(): Destination[] {
  return [
    { value: "Bathroom", label: "Bathroom" },
    { value: "Locker", label: "Locker" },
    { value: "Counselor", label: "Counselor" },
    { value: "Dean of Students", label: "Dean of Students" },
    { value: "Dean of Academics", label: "Dean of Academics" },
    { value: "Nurse", label: "Nurse" },
    { value: "testing_center", label: "Testing Center" },
    { value: "College Visit", label: "College Visit" },
    { value: "Football Meeting", label: "Football Meeting" },
    { value: "Early Dismissal", label: "Early Dismissal" },
    { value: "Other", label: "Other" },
  ];
}

