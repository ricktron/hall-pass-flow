/**
 * Time window utilities for analytics queries.
 * Single source of truth for timeframe/window handling.
 */

/** Valid time windows matching the hp_*_windows view contract */
export type TimeWindow = "day" | "week" | "month" | "quarter" | "all";

/** UI display labels */
export type TimeWindowLabel = "Day" | "Week" | "Month" | "Quarter" | "All";

/** All valid time windows in order */
export const TIME_WINDOWS: TimeWindow[] = ["day", "week", "month", "quarter", "all"];

/** Map from display labels to internal keys */
export const TIME_WINDOW_LABELS: TimeWindowLabel[] = ["Day", "Week", "Month", "Quarter", "All"];

/**
 * Normalize a timeframe string input to a valid TimeWindow.
 * Returns "all" as safe default for unrecognized or invalid input.
 */
export function normalizeTimeWindow(input: unknown): TimeWindow {
  if (input == null || typeof input !== "string") return "all";
  
  const normalized = input.toLowerCase().trim();
  
  // Empty string after trim
  if (!normalized) return "all";
  
  // Exact match check
  if (TIME_WINDOWS.includes(normalized as TimeWindow)) {
    return normalized as TimeWindow;
  }
  
  // Handle common variations
  switch (normalized) {
    case "today":
    case "daily":
    case "1d":
      return "day";
    case "weekly":
    case "1w":
    case "7d":
      return "week";
    case "monthly":
    case "1m":
    case "30d":
      return "month";
    case "quarterly":
    case "3m":
    case "90d":
      return "quarter";
    case "lifetime":
    case "total":
    case "forever":
    case "full":
      return "all";
    default:
      // Log warning in dev for debugging
      if (import.meta.env.DEV) {
        console.warn(`[timeWindow] Unrecognized window input "${input}", defaulting to "all"`);
      }
      return "all";
  }
}

/**
 * Convert a TimeWindow to its display label.
 */
export function toLabel(window: TimeWindow): TimeWindowLabel {
  const index = TIME_WINDOWS.indexOf(window);
  return TIME_WINDOW_LABELS[index] ?? "Week";
}

/**
 * Convert a display label to a TimeWindow.
 */
export function fromLabel(label: TimeWindowLabel): TimeWindow {
  const index = TIME_WINDOW_LABELS.indexOf(label);
  return TIME_WINDOWS[index] ?? "week";
}

/**
 * Validate that a window value is correct for the hp_*_windows views.
 * Returns true if valid, false otherwise.
 */
export function isValidTimeWindow(value: unknown): value is TimeWindow {
  return typeof value === "string" && TIME_WINDOWS.includes(value as TimeWindow);
}

/**
 * Dev-mode assertion that logs an error if "all" is incorrectly mapped.
 * Call this after resolving the window to verify correct behavior.
 */
export function assertWindowNotMismapped(
  inputLabel: string,
  resolvedWindow: TimeWindow
): void {
  if (!import.meta.env.DEV) return;
  
  const inputLower = inputLabel.toLowerCase();
  
  // "All" should never map to "quarter"
  if (inputLower === "all" && resolvedWindow === "quarter") {
    console.error(
      `[timeWindow] BUG DETECTED: Input "${inputLabel}" incorrectly mapped to "quarter" instead of "all"`
    );
  }
  
  // "Quarter" should never map to "all"  
  if (inputLower === "quarter" && resolvedWindow === "all") {
    console.error(
      `[timeWindow] BUG DETECTED: Input "${inputLabel}" incorrectly mapped to "all" instead of "quarter"`
    );
  }
}

