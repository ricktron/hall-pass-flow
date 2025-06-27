// Utility functions for consistent time handling throughout the app

/**
 * Calculate elapsed time in seconds from a UTC timestamp
 * @param timeOut UTC timestamp from Supabase
 * @returns Elapsed time in seconds
 */
export const calculateElapsedTime = (timeOut: Date | string): number => {
  try {
    const startTime = new Date(timeOut).getTime(); // UTC milliseconds
    const now = Date.now(); // Current UTC milliseconds
    
    console.log("calculateElapsedTime:", {
      timeOut,
      startTime,
      now,
      startUTC: new Date(startTime).toISOString(),
      nowUTC: new Date(now).toISOString()
    });
    
    if (isNaN(startTime)) {
      console.warn("Invalid start time:", timeOut);
      return 0;
    }
    
    const diffMs = now - startTime;
    const elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    console.log("Elapsed calculation:", { diffMs, elapsedSeconds });
    
    return elapsedSeconds;
  } catch (error) {
    console.error("Error calculating elapsed time:", error);
    return 0;
  }
};

/**
 * Format elapsed seconds in HH:MM:SS format
 * @param seconds Elapsed time in seconds
 * @returns Formatted time string
 */
export const formatElapsedTime = (seconds: number): string => {
  if (!seconds || seconds < 0) {
    return "00:00:00";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
