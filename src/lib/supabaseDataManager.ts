
import { supabase } from "@/integrations/supabase/client";

export interface HallPassRecord {
  id: string;
  studentName: string;
  period: string;
  timeOut: Date;
  timeIn: Date | null;
  duration: number | null;
  dayOfWeek: string;
}

export const addHallPassRecord = async (record: Omit<HallPassRecord, 'id'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('Hall_Passes')
      .insert([{
        studentName: record.studentName,
        period: record.period,
        timeOut: record.timeOut.toISOString(),
        timeIn: record.timeIn ? record.timeIn.toISOString() : null,
        duration: record.duration,
        dayOfWeek: record.dayOfWeek
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

    return data.map(record => ({
      id: record.id,
      studentName: record.studentName || '',
      period: record.period || '',
      timeOut: new Date(record.timeOut),
      timeIn: record.timeIn ? new Date(record.timeIn) : null,
      duration: record.duration,
      dayOfWeek: record.dayOfWeek || ''
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
    const timeOut = new Date(record.timeOut);
    const duration = Math.round((timeIn.getTime() - timeOut.getTime()) / (1000 * 60)); // duration in minutes

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

export const getCurrentlyOutRecords = async (): Promise<HallPassRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Hall_Passes')
      .select('*')
      .is('timeIn', null)
      .order('timeOut', { ascending: false });

    if (error) {
      console.error("Error fetching currently out records:", error);
      return [];
    }

    return data.map(record => ({
      id: record.id,
      studentName: record.studentName || '',
      period: record.period || '',
      timeOut: new Date(record.timeOut),
      timeIn: null,
      duration: null,
      dayOfWeek: record.dayOfWeek || ''
    }));
  } catch (error) {
    console.error("Error fetching currently out records:", error);
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

    const tripCount = data.length;
    const totalMinutes = data.reduce((sum, record) => sum + (record.duration || 0), 0);
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

    // Filter records for today and this week
    const todayRecords = allRecords.filter(record => {
      const recordDate = new Date(record.timeOut);
      return recordDate >= today && recordDate <= todayEnd;
    });

    const weekRecords = allRecords.filter(record => {
      const recordDate = new Date(record.timeOut);
      return recordDate >= startOfWeek;
    });

    // Calculate most frequent leavers
    const todayFrequency: { [key: string]: number } = {};
    const weekFrequency: { [key: string]: number } = {};

    todayRecords.forEach(record => {
      todayFrequency[record.studentName] = (todayFrequency[record.studentName] || 0) + 1;
    });

    weekRecords.forEach(record => {
      weekFrequency[record.studentName] = (weekFrequency[record.studentName] || 0) + 1;
    });

    const mostFrequentToday = Object.entries(todayFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostFrequentWeek = Object.entries(weekFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate longest trip today
    const completedTodayRecords = todayRecords.filter(record => record.duration !== null);
    let longestTripToday = { duration: 0, student: '' };
    
    if (completedTodayRecords.length > 0) {
      const longest = completedTodayRecords.reduce((prev, current) => 
        (current.duration || 0) > (prev.duration || 0) ? current : prev
      );
      longestTripToday = {
        duration: longest.duration || 0,
        student: longest.studentName || ''
      };
    }

    // Calculate trips per period
    const tripsPerPeriod: { [key: string]: number } = {};
    todayRecords.forEach(record => {
      tripsPerPeriod[record.period] = (tripsPerPeriod[record.period] || 0) + 1;
    });

    // Calculate average duration
    const completedRecords = allRecords.filter(record => record.duration !== null);
    const averageDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / completedRecords.length
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
