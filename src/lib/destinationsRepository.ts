/**
 * destinationsRepository.ts
 * 
 * Centralized data access for hall pass destinations.
 * Fetches from DB (hall_pass_destinations) as single source of truth.
 */

import { supabase } from "@/integrations/supabase/client";

export type DestinationOption = {
  key: string;
  label: string;
  sort_order?: number | null;
};

/**
 * Fetches active destinations from the database, ordered by sort_order.
 * Falls back to hardcoded list if DB query fails.
 */
export async function fetchActiveDestinations(): Promise<DestinationOption[]> {
  try {
    // Query with type assertion to include sort_order (may not be in types.ts yet)
    const { data, error } = await (supabase
      .from("hall_pass_destinations")
      .select("key, label, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false }) as any);

    if (error) {
      console.error("[destinationsRepository] fetchActiveDestinations error:", error.message);
      return getFallbackDestinations();
    }

    if (!data || data.length === 0) {
      console.warn("[destinationsRepository] No destinations found in DB, using fallback");
      return getFallbackDestinations();
    }

    // Type assertion for data with sort_order
    const typedData = data as Array<{ key: string; label: string; sort_order?: number | null }>;
    
    return typedData.map((row) => ({
      key: row.key,
      label: row.label,
      sort_order: row.sort_order ?? null,
    })).sort((a, b) => {
      const aOrder = a.sort_order ?? 999;
      const bOrder = b.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.label.localeCompare(b.label);
    });
  } catch (err) {
    console.error("[destinationsRepository] fetchActiveDestinations exception:", err);
    return getFallbackDestinations();
  }
}

/**
 * Fallback destinations in case DB query fails.
 * Matches the existing hardcoded list to maintain backward compatibility.
 */
function getFallbackDestinations(): DestinationOption[] {
  return [
    { key: "bathroom", label: "Bathroom", sort_order: 1 },
    { key: "locker", label: "Locker", sort_order: 2 },
    { key: "counselor", label: "Counselor", sort_order: 3 },
    { key: "dean_students", label: "Dean of Students", sort_order: 4 },
    { key: "dean_academics", label: "Dean of Academics", sort_order: 5 },
    { key: "nurse", label: "Nurse", sort_order: 6 },
    { key: "testing_center", label: "Testing Center", sort_order: 7 },
    { key: "college_visit", label: "College Visit", sort_order: 8 },
    { key: "football_meeting", label: "Football Meeting", sort_order: 9 },
    { key: "early_dismissal", label: "Early Dismissal", sort_order: 95 },
    { key: "other", label: "Other", sort_order: 90 },
  ];
}

// Legacy export for backward compatibility
export interface Destination {
  value: string;
  label: string;
}

/**
 * @deprecated Use fetchActiveDestinations() instead. This function is kept for backward compatibility.
 */
export async function fetchDestinations(): Promise<Destination[]> {
  const options = await fetchActiveDestinations();
  return options.map((opt) => ({
    value: opt.key === "testing_center" ? "testing_center" : opt.label,
    label: opt.label,
  }));
}

