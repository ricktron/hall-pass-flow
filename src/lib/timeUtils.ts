
// Utility functions for consistent time handling throughout the app

/**
 * Calculate elapsed time in seconds from a UTC timestamp
 * @param timeOut UTC timestamp from Supabase
 * @returns Elapsed time in seconds
 */
export const calculateElapsedTime = (timeOut: Date | string): number => {
  try {
    const parsed = typeof timeOut === "string" 
      ? new Date(timeOut) 
      : timeOut;

    const startTime = parsed.getTime();
    const now = Date.now();

    if (isNaN(startTime)) {
      console.warn("Invalid start time:", timeOut);
      return 0;
    }

    const diffMs = now - startTime;
    const elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));

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
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    return Math.max(0, durationMinutes);
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
  const elapsedSeconds = calculateElapsedTime(timeOut);
  const minutes = Math.floor(elapsedSeconds / 60);
  return minutes;
};

/**
 * Format a UTC timestamp for display in local timezone (America/Chicago)
 * @param date UTC date to format
 * @returns Formatted date string in America/Chicago timezone
 */
export const formatLocalTime = (date: Date | string): string => {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    
    return dateObj.toLocaleString("en-US", { 
      timeZone: "America/Chicago",
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

/**
 * Get local timezone boundaries for "today" in America/Chicago
 * @returns Start and end of day in America/Chicago timezone
 */
export const getLocalTodayBounds = () => {
  const now = new Date();
  
  // Create date in Chicago timezone
  const chicagoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  
  const startOfDay = new Date(chicagoNow.getFullYear(), chicagoNow.getMonth(), chicagoNow.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(chicagoNow.getFullYear(), chicagoNow.getMonth(), chicagoNow.getDate(), 23, 59, 59, 999);
  
  // Convert back to UTC for database queries
  // Chicago is UTC-6 (CST) or UTC-5 (CDT), let the system handle DST automatically
  const timezoneOffset = chicagoNow.getTimezoneOffset() * 60 * 1000;
  
  return { 
    startOfDay: new Date(startOfDay.getTime() + timezoneOffset), 
    endOfDay: new Date(endOfDay.getTime() + timezoneOffset) 
  };
};

/**
 * Get start of local week (Monday) in America/Chicago timezone
 * @returns Start of week in America/Chicago timezone
 */
export const getLocalWeekStart = () => {
  const now = new Date();
  
  // Create date in Chicago timezone
  const chicagoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  
  const startOfWeek = new Date(chicagoNow);
  const dayOfWeek = chicagoNow.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(chicagoNow.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Convert back to UTC for database queries
  // Let the system handle DST automatically
  const timezoneOffset = chicagoNow.getTimezoneOffset() * 60 * 1000;
  
  return new Date(startOfWeek.getTime() + timezoneOffset);
};

/**
 * Format duration in a readable format (minutes or HH:MM:SS)
 * @param minutes Duration in minutes
 * @returns Formatted duration string
 */
export const formatDurationReadable = (minutes: number): string => {
  if (minutes >= 90) {
    return "1.5+ hrs";
  }
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format duration in HH:MM:SS format from minutes
 * @param minutes Duration in minutes
 * @returns Formatted HH:MM:SS string
 */
export const formatDurationHMS = (minutes: number): string => {
  if (minutes >= 90) {
    return "1:30:00+";
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const seconds = 0; // We don't track seconds for completed trips
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
