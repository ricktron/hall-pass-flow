import { supabase } from "@/integrations/supabase/client";
import { calculateDurationMinutes } from "@/lib/timeUtils";

export interface HallPassRecord {
  id: string;
  studentName: string;
  period: string;
  timeOut: Date;
  timeIn: Date | null;
  duration: number | null;
  dayOfWeek: string;
  destination?: string;
  earlyDismissal?: boolean;
}

export const addHallPassRecord = async (record: Omit<HallPassRecord, 'id'>): Promise<boolean> => {
  try {
    // First, check if the student already has an open trip
    const { data: existingRecords, error: checkError } = await supabase
      .from('Hall_Passes')
      .select('*')
      .eq('studentName', record.studentName)
      .is('timeIn', null);

    if (checkError) {
      console.error("Error checking existing records:", checkError);
      return false;
    }

    // If there's an existing open trip, close it first
    if (existingRecords && existingRecords.length > 0) {
      const openRecord = existingRecords[0];
      const timeIn = new Date();
      const duration = calculateDurationMinutes(openRecord.timeOut, timeIn);

      const { error: updateError } = await supabase
        .from('Hall_Passes')
        .update({ 
          timeIn: timeIn.toISOString(), 
          duration: duration 
        })
        .eq('id', openRecord.id);

      if (updateError) {
        console.error("Error closing existing record:", updateError);
        return false;
      }
    }

    // Now create the new record
    const { error } = await supabase
      .from('Hall_Passes')
      .insert([{
        studentName: record.studentName,
        period: record.period,
        timeOut: record.timeOut.toISOString(),
        timeIn: record.timeIn ? record.timeIn.toISOString() : null,
        duration: record.duration,
        dayOfWeek: record.dayOfWeek,
        destination: record.destination,
        earlyDismissal: record.earlyDismissal || false
      }]);

    if (error) {
      console.error("Error adding hall pass record:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error adding hall pass record:", error);
    return false;
  }
};

export const getAllHallPassRecords = async (): Promise<HallPassRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Hall_Passes')
      .select('*')
      .order('timeOut', { ascending: false });

    if (error) {
      console.error("Error fetching hall pass records:", error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      studentName: record.studentName || '',
      period: record.period || '',
      timeOut: new Date(record.timeOut),
      timeIn: record.timeIn ? new Date(record.timeIn) : null,
      duration: record.duration,
      dayOfWeek: record.dayOfWeek || '',
      destination: record.destination,
      earlyDismissal: record.earlyDismissal || false
    }));
  } catch (error) {
    console.error("Error fetching hall pass records:", error);
    return [];
  }
};

export const updateReturnTime = async (studentName: string, period: string): Promise<boolean> => {
  try {
    // Find the most recent record for this student where timeIn is null
    const { data: records, error: fetchError } = await supabase
      .from('Hall_Passes')
      .select('*')
      .eq('studentName', studentName)
      .eq('period', period)
      .is('timeIn', null)
      .order('timeOut', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error finding hall pass record:", fetchError);
      return false;
    }

    if (!records || records.length === 0) {
      console.error("No active hall pass record found");
      return false;
    }

    const record = records[0];
    const timeIn = new Date();
    const duration = calculateDurationMinutes(record.timeOut, timeIn);

    const { error: updateError } = await supabase
      .from('Hall_Passes')
      .update({ 
        timeIn: timeIn.toISOString(), 
        duration: duration
      })
      .eq('id', record.id);

    if (updateError) {
      console.error("Error updating hall pass record:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating return time:", error);
    return false;
  }
};

export const deleteHallPassRecord = async (recordId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('Hall_Passes')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error("Error deleting hall pass record:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error deleting hall pass record:", error);
    return false;
  }
};

export const getCurrentlyOutRecords = async (): Promise<HallPassRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Hall_Passes')
      .select('*')
      .is('timeIn', null)
      .neq('earlyDismissal', true) // Exclude early dismissal records
      .order('timeOut', { ascending: false });

    if (error) {
      console.error("Error fetching currently out records:", error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      studentName: record.studentName || '',
      period: record.period || '',
      timeOut: new Date(record.timeOut),
      timeIn: null,
      duration: null,
      dayOfWeek: record.dayOfWeek || '',
      destination: record.destination,
      earlyDismissal: record.earlyDismissal || false
    }));
  } catch (error) {
    console.error("Error fetching currently out records:", error);
    return [];
  }
};

export const getStudentNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('Hall_Passes')
      .select('studentName')
      .order('studentName');

    if (error) {
      console.error("Error fetching student names:", error);
      return [];
    }

    // Get unique student names
    const uniqueNames = [...new Set((data || []).map(record => record.studentName).filter(Boolean))];
    return uniqueNames;
  } catch (error) {
    console.error("Error fetching student names:", error);
    return [];
  }
};

export const getWeeklyStats = async (studentName: string): Promise<{
  tripCount: number;
  totalMinutes: number;
  averageMinutes: number;
}> => {
  try {
    // Get start of current week (Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('Hall_Passes')
      .select('*')
      .eq('studentName', studentName)
      .gte('timeOut', startOfWeek.toISOString())
      .not('timeIn', 'is', null)
      .not('duration', 'is', null);

    if (error) {
      console.error("Error fetching weekly stats:", error);
      return { tripCount: 0, totalMinutes: 0, averageMinutes: 0 };
    }

    const tripCount = (data || []).length;
    // Use normalized duration calculation
    const totalMinutes = (data || []).reduce((sum, record) => {
      if (record.timeIn && record.timeOut) {
        const calculatedDuration = calculateDurationMinutes(record.timeOut, record.timeIn!);
        return sum + calculatedDuration;
      }
      return sum + Math.abs(record.duration || 0);
    }, 0);
    const averageMinutes = tripCount > 0 ? Math.round(totalMinutes / tripCount) : 0;

    return { tripCount, totalMinutes, averageMinutes };
  } catch (error) {
    console.error("Error calculating weekly stats:", error);
    return { tripCount: 0, totalMinutes: 0, averageMinutes: 0 };
  }
};

export const getAnalytics = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get start of current week
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);

    const { data: allRecords, error } = await supabase
      .from('Hall_Passes')
      .select('*')
      .order('timeOut', { ascending: false });

    if (error) {
      console.error("Error fetching analytics data:", error);
      return {
        totalTripsToday: 0,
        mostFrequentToday: [],
        mostFrequentWeek: [],
        longestTripToday: { duration: 0, student: '' },
        tripsPerPeriod: {},
        averageDuration: 0
      };
    }

    const records = allRecords || [];

    // Filter records for today and this week
    const todayRecords = records.filter(record => {
      const recordDate = new Date(record.timeOut);
      return recordDate >= today && recordDate <= todayEnd;
    });

    const weekRecords = records.filter(record => {
      const recordDate = new Date(record.timeOut);
      return recordDate >= startOfWeek;
    });

    // Calculate most frequent leavers
    const todayFrequency: { [key: string]: number } = {};
    const weekFrequency: { [key: string]: number } = {};

    todayRecords.forEach(record => {
      if (record.studentName) {
        todayFrequency[record.studentName] = (todayFrequency[record.studentName] || 0) + 1;
      }
    });

    weekRecords.forEach(record => {
      if (record.studentName) {
        weekFrequency[record.studentName] = (weekFrequency[record.studentName] || 0) + 1;
      }
    });

    const mostFrequentToday = Object.entries(todayFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostFrequentWeek = Object.entries(weekFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate longest trip today using normalized duration calculation
    const completedTodayRecords = todayRecords.filter(record => record.duration !== null && record.timeIn && record.timeOut);
    let longestTripToday = { duration: 0, student: '' };
    
    if (completedTodayRecords.length > 0) {
      const longest = completedTodayRecords.reduce((prev, current) => {
        const currentDuration = calculateDurationMinutes(current.timeOut, current.timeIn!);
        const prevDuration = calculateDurationMinutes(prev.timeOut, prev.timeIn!);
        return currentDuration > prevDuration ? current : prev;
      });
      longestTripToday = {
        duration: calculateDurationMinutes(longest.timeOut, longest.timeIn!),
        student: longest.studentName || ''
      };
    }

    // Calculate trips per period
    const tripsPerPeriod: { [key: string]: number } = {};
    todayRecords.forEach(record => {
      if (record.period) {
        tripsPerPeriod[record.period] = (tripsPerPeriod[record.period] || 0) + 1;
      }
    });

    // Calculate average duration for completed records using normalized calculation
    const completedRecords = records.filter(record => record.timeIn && record.timeOut);
    const averageDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, record) => {
          const duration = calculateDurationMinutes(record.timeOut, record.timeIn!);
          return sum + duration;
        }, 0) / completedRecords.length
      : 0;

    return {
      totalTripsToday: todayRecords.length,
      mostFrequentToday,
      mostFrequentWeek,
      longestTripToday,
      tripsPerPeriod,
      averageDuration
    };
  } catch (error) {
    console.error("Error calculating analytics:", error);
    return {
      totalTripsToday: 0,
      mostFrequentToday: [],
      mostFrequentWeek: [],
      longestTripToday: { duration: 0, student: '' },
      tripsPerPeriod: {},
      averageDuration: 0
    };
  }
};
