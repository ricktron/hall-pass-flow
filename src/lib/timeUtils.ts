
// Utility functions for consistent time handling throughout the app

/**
 * Calculate elapsed time in milliseconds from a UTC timestamp
 * @param timeOut UTC timestamp from Supabase
 * @param timeIn Optional UTC timestamp for return time, defaults to now
 * @returns Elapsed time in milliseconds
 */
export const calculateElapsedTime = (timeOut: Date | string, timeIn?: Date | string | null): number => {
  try {
    // Convert timeOut to UTC timestamp (milliseconds)
    const startTime = new Date(timeOut).getTime(); // This automatically handles UTC conversion
    
    // Use current UTC time or provided timeIn
    const endTime = timeIn ? new Date(timeIn).getTime() : Date.now();
    
    console.log("calculateElapsedTime UTC debug:", {
      timeOut,
      timeIn,
      startTimeMs: startTime,
      endTimeMs: endTime,
      startTimeUTC: new Date(startTime).toISOString(),
      endTimeUTC: new Date(endTime).toISOString(),
      isValidStart: !isNaN(startTime),
      isValidEnd: !isNaN(endTime)
    });
    
    if (isNaN(startTime) || isNaN(endTime)) {
      console.warn("Invalid date provided to calculateElapsedTime", { timeOut, timeIn });
      return 0;
    }
    
    // Calculate elapsed time in milliseconds
    const elapsed = endTime - startTime;
    console.log("Raw calculated elapsed time (UTC):", elapsed, "ms");
    
    // If we get a negative result, something is wrong with the data
    if (elapsed < 0) {
      console.warn("Negative elapsed time detected:", {
        timeOut: new Date(startTime).toISOString(),
        now: new Date(endTime).toISOString(),
        difference: elapsed
      });
      return 0;
    }
    
    return elapsed;
  } catch (error) {
    console.error("Error calculating elapsed time:", error);
    return 0;
  }
};

/**
 * Format elapsed time in HH:MM:SS format
 * @param milliseconds Elapsed time in milliseconds
 * @returns Formatted time string
 */
export const formatElapsedTime = (milliseconds: number): string => {
  if (!milliseconds || milliseconds < 0) {
    return "00:00:00";
  }
  
  try {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    console.log("formatElapsedTime:", { milliseconds, totalSeconds, hours, minutes, seconds, formatted });
    
    return formatted;
  } catch (error) {
    console.error("Error formatting elapsed time:", error);
    return "00:00:00";
  }
};

/**
 * Calculate duration in minutes for completed trips
 * @param timeOut UTC timestamp when student left
 * @param timeIn UTC timestamp when student returned
 * @returns Duration in minutes (rounded)
 */
export const calculateDurationMinutes = (timeOut: Date | string, timeIn: Date | string): number => {
  try {
    const startTime = new Date(timeOut);
    const endTime = new Date(timeIn);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.warn("Invalid date provided to calculateDurationMinutes", { timeOut, timeIn });
      return 0;
    }
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    return Math.max(0, Math.round(durationMinutes)); // Ensure never negative and rounded
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
};

/**
 * Get elapsed time in minutes for current active trips
 * @param timeOut UTC timestamp when student left
 * @returns Elapsed time in minutes
 */
export const getElapsedMinutes = (timeOut: Date | string): number => {
  const elapsedMs = calculateElapsedTime(timeOut);
  const minutes = Math.floor(elapsedMs / (1000 * 60));
  return minutes;
};

/**
 * Format a UTC timestamp for display in local timezone
 * @param date UTC date to format
 * @returns Formatted date string in local timezone
 */
export const formatLocalTime = (date: Date | string): string => {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    
    return dateObj.toLocaleString("en-US", { 
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting local time:", error);
    return "Invalid Date";
  }
};
