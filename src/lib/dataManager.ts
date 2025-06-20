
import { BathroomRecord, Analytics } from "./types";

const STORAGE_KEY = "bathroom_records";

// Get all records from localStorage
export const getAllRecords = (): Promise<BathroomRecord[]> => {
  return new Promise((resolve) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert string dates back to Date objects
        const records = parsed.map((record: any) => ({
          ...record,
          timeOut: new Date(record.timeOut),
          timeIn: record.timeIn ? new Date(record.timeIn) : null,
        }));
        resolve(records);
      } catch (error) {
        console.error("Error parsing records:", error);
        resolve([]);
      }
    } else {
      resolve([]);
    }
  });
};

// Save records to localStorage
const saveRecords = (records: BathroomRecord[]): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    resolve();
  });
};

// Add a new bathroom record
export const addBathroomRecord = async (record: Omit<BathroomRecord, 'id'>): Promise<void> => {
  const records = await getAllRecords();
  const newRecord: BathroomRecord = {
    ...record,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  };
  records.push(newRecord);
  await saveRecords(records);
};

// Update return time for a student
export const updateReturnTime = async (
  firstName: string,
  lastName: string, 
  period: string, 
  returnTime: Date
): Promise<boolean> => {
  const records = await getAllRecords();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find the most recent record for this student and period today that doesn't have a return time
  const recordIndex = records.findIndex(record => 
    record.firstName === firstName &&
    record.lastName === lastName &&
    record.period === period &&
    !record.timeIn &&
    record.timeOut >= today
  );
  
  if (recordIndex !== -1) {
    records[recordIndex].timeIn = returnTime;
    await saveRecords(records);
    return true;
  }
  
  return false;
};

// Get analytics data
export const getAnalytics = async (): Promise<Analytics> => {
  const records = await getAllRecords();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Filter records for today and this week
  const todayRecords = records.filter(record => record.timeOut >= today);
  const weekRecords = records.filter(record => record.timeOut >= startOfWeek);
  const completedTodayRecords = todayRecords.filter(record => record.timeIn);

  // Calculate most frequent leavers
  const todayFrequency: { [key: string]: number } = {};
  const weekFrequency: { [key: string]: number } = {};
  
  todayRecords.forEach(record => {
    const fullName = `${record.firstName} ${record.lastName}`;
    todayFrequency[fullName] = (todayFrequency[fullName] || 0) + 1;
  });
  
  weekRecords.forEach(record => {
    const fullName = `${record.firstName} ${record.lastName}`;
    weekFrequency[fullName] = (weekFrequency[fullName] || 0) + 1;
  });

  const mostFrequentToday = Object.entries(todayFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const mostFrequentWeek = Object.entries(weekFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Calculate longest trip today
  let longestTrip = 0;
  let longestTripStudent = "";
  
  completedTodayRecords.forEach(record => {
    if (record.timeIn) {
      const duration = record.timeIn.getTime() - record.timeOut.getTime();
      if (duration > longestTrip) {
        longestTrip = duration;
        longestTripStudent = `${record.firstName} ${record.lastName}`;
      }
    }
  });

  // Calculate trips per period
  const tripsPerPeriod: { [key: string]: number } = {};
  todayRecords.forEach(record => {
    tripsPerPeriod[record.period] = (tripsPerPeriod[record.period] || 0) + 1;
  });

  // Calculate average duration
  const durations = completedTodayRecords
    .filter(record => record.timeIn)
    .map(record => record.timeIn!.getTime() - record.timeOut.getTime());
  
  const averageDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60) // Convert to minutes
    : 0;

  return {
    totalTripsToday: todayRecords.length,
    mostFrequentToday,
    mostFrequentWeek,
    longestTripToday: {
      duration: Math.round(longestTrip / (1000 * 60)), // Convert to minutes
      student: longestTripStudent,
    },
    tripsPerPeriod,
    averageDuration,
  };
};
