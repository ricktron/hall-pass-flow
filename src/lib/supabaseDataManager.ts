import { supabase } from "@/integrations/supabase/client";
import { calculateDurationMinutes, getLocalTodayBounds, getLocalWeekStart, formatDurationHMS } from "@/lib/timeUtils";

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
  classroom?: string;
}

export const addHallPassRecord = async (record: Omit<HallPassRecord, 'id'>): Promise<boolean> => {
  try {
    // First, check if the student already has an open trip
    const { data: existingRecords, error: checkError } = await (supabase as any)
      .from('Hall_Passes')
      .select('*')
      .eq('student_name', record.studentName)
      .filter('timein', 'is', null);

    if (checkError) {
      console.error("Error checking existing records:", checkError);
      return false;
    }

    // If there's an existing open trip, close it first
    if (existingRecords && existingRecords.length > 0) {
      const openRecord = existingRecords[0];
      const timeIn = new Date();

      const { error: updateError } = await (supabase as any)
        .from('Hall_Passes')
        .update({ timein: timeIn.toISOString() })
        .eq('pass_id', openRecord.pass_id);

      if (updateError) {
        console.error("Error closing existing record:", updateError);
        return false;
      }
    }

    // Now create the new record
    const payload = {
      student_name: record.studentName,
      period: record.period,
      destination: record.destination,
      timeout: record.timeOut.toISOString()
    };

    const { error } = await (supabase as any)
      .from('Hall_Passes')
      .insert(payload);

    if (error) {
      console.error("Error adding hall pass record:", error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error adding hall pass record:", error);
    return false;
  }
};

export const getAllHallPassRecords = async (): Promise<HallPassRecord[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('Hall_Passes')
      .select('*')
      .order('timeout', { ascending: false });

    if (error) {
      console.error("Error fetching hall pass records:", error);
      return [];
    }

    return (data || []).map((record: any) => ({
      id: record.pass_id,
      studentName: record.student_name || '',
      period: record.period || '',
      timeOut: new Date(record.timeout),
      timeIn: record.timein ? new Date(record.timein) : null,
      duration: record.duration,
      dayOfWeek: record.dayOfWeek || '',
      destination: record.destination,
      earlyDismissal: record.earlyDismissal || false,
      classroom: record.classroom
    }));
  } catch (error) {
    console.error("Error fetching hall pass records:", error);
    return [];
  }
};

export const updateReturnTime = async (studentName: string, period: string): Promise<boolean> => {
  try {
    // Find the most recent record for this student where timeIn is null
    const { data: records, error: fetchError } = await (supabase as any)
      .from('Hall_Passes')
      .select('*')
      .eq('student_name', studentName)
      .eq('period', period)
      .filter('timein', 'is', null)
      .order('timeout', { ascending: false })
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

    const { error } = await (supabase as any)
      .from('Hall_Passes')
      .update({ timein: new Date().toISOString() })
      .eq('pass_id', record.pass_id);

    if (error) {
      console.error("Error updating hall pass record:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating return time:", error);
    return false;
  }
};

// Add markStudentReturn as an alias to updateReturnTime for teacher view
export const markStudentReturn = async (studentName: string, period: string): Promise<boolean> => {
  return updateReturnTime(studentName, period);
};

export const deleteHallPassRecord = async (recordId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('Hall_Passes')
      .delete()
      .eq('pass_id', recordId);

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
    const { data, error } = await (supabase as any).rpc('open_passes');

    if (error) {
      console.error("Error fetching currently out records:", error);
      return [];
    }

    return (data || []).map((record: any) => ({
      id: record.pass_id,
      studentName: record.student_name || '',
      period: record.period || '',
      timeOut: new Date(record.timeout),
      timeIn: null,
      duration: null,
      dayOfWeek: '',
      destination: record.destination || '',
      earlyDismissal: false,
      classroom: ''
    }));
  } catch (error) {
    console.error("Error fetching currently out records:", error);
    return [];
  }
};

export const getStudentNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('Hall_Passes')
      .select('student_name')
      .order('student_name');

    if (error) {
      console.error("Error fetching student names:", error);
      return [];
    }

    // Get unique student names
    const uniqueNames = [...new Set((data || []).map((record: any) => record.student_name).filter(Boolean))] as string[];
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
    const startOfWeek = getLocalWeekStart();

    let query = (supabase as any)
      .from('Hall_Passes')
      .select('*')
      .gte('timeout', startOfWeek.toISOString())
      .not('timein', 'is', null);

    // If studentName is provided, filter by it; otherwise get all students for overall average
    if (studentName) {
      query = query.eq('student_name', studentName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching weekly stats:", error);
      return { tripCount: 0, totalMinutes: 0, averageMinutes: 0 };
    }

    // Filter out trips longer than 90 minutes (likely incomplete - student forgot to sign back in)
    const validTrips = (data || []).filter((record: any) => {
      if (record.timein && record.timeout) {
        const calculatedDuration = calculateDurationMinutes(record.timeout, record.timein);
        return calculatedDuration <= 90; // Ignore trips longer than 1.5 hours
      }
      return Math.abs(record.duration || 0) <= 90;
    });

    const tripCount = validTrips.length;
    const totalMinutes = validTrips.reduce((sum, record: any) => {
      if (record.timein && record.timeout) {
        const calculatedDuration = calculateDurationMinutes(record.timeout, record.timein);
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
    const { startOfDay, endOfDay } = getLocalTodayBounds();
    const startOfWeek = getLocalWeekStart();

    const { data: allRecords, error } = await (supabase as any)
      .from('Hall_Passes')
      .select('*')
      .order('timeout', { ascending: false });

    if (error) {
      console.error("Error fetching analytics data:", error);
      return {
        totalTripsToday: 0,
        mostFrequentToday: [],
        mostFrequentWeek: [],
        longestTripToday: { duration: 0, student: '', durationFormatted: '00:00:00' },
        tripsPerPeriod: {},
        averageDuration: 0,
        averageDurationFormatted: '00:00:00',
        topLongestTripsToday: [],
        mostCommonDestination: '',
        periodWithLongestAverage: { period: '', averageDuration: 0, averageDurationFormatted: '00:00:00' },
        averageTripsPerDay: 0,
        weeklyAverageDuration: 0,
        weeklyAverageDurationFormatted: '00:00:00',
        topStudentsThisWeek: [],
        longestTripThisWeek: { student: '', duration: 0, durationFormatted: '00:00:00', dayOfWeek: '' },
        quietestPeriods: [],
        weeklyStats: { totalTrips: 0, averageTripsPerStudent: 0, studentsWhoNeverLeft: 0 },
        unreturnedPasses: [],
        destinationDistribution: [],
        weeklyTrendData: []
      };
    }

    const records = (allRecords || []) as any[];

    // Filter records using local time boundaries
    const todayRecords = records.filter(record => {
      const recordDate = new Date(record.timeout);
      return recordDate >= startOfDay && recordDate <= endOfDay;
    });

    const weekRecords = records.filter(record => {
      const recordDate = new Date(record.timeout);
      return recordDate >= startOfWeek;
    });

    // Calculate most frequent leavers for today and week
    const todayFrequency: { [key: string]: number } = {};
    const basicWeekFrequency: { [key: string]: number } = {};

    todayRecords.forEach(record => {
      if (record.student_name) {
        todayFrequency[record.student_name] = (todayFrequency[record.student_name] || 0) + 1;
      }
    });

    weekRecords.forEach(record => {
      if (record.student_name) {
        basicWeekFrequency[record.student_name] = (basicWeekFrequency[record.student_name] || 0) + 1;
      }
    });

    const mostFrequentToday = Object.entries(todayFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostFrequentWeek = Object.entries(basicWeekFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate completed trips today (capped at 90 minutes)
    const completedTodayRecords = todayRecords.filter(record => {
      if (!record.timein || !record.timeout) return false;
      const duration = calculateDurationMinutes(record.timeout, record.timein);
      return duration <= 90; // Ignore trips longer than 1.5 hours - likely incomplete
    });
    
    // Get top 5 longest trips today with HH:MM:SS formatting
    const topLongestTripsToday = completedTodayRecords
      .map(record => {
        const durationMinutes = calculateDurationMinutes(record.timeout, record.timein);
        return {
          student: record.student_name || '',
          duration: durationMinutes,
          durationFormatted: formatDurationHMS(durationMinutes)
        };
      })
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    let longestTripToday = { duration: 0, student: '', durationFormatted: '00:00:00' };
    if (topLongestTripsToday.length > 0) {
      longestTripToday = topLongestTripsToday[0];
    }

    // Calculate trips per period
    const tripsPerPeriod: { [key: string]: number } = {};
    todayRecords.forEach(record => {
      if (record.period) {
        tripsPerPeriod[record.period] = (tripsPerPeriod[record.period] || 0) + 1;
      }
    });

    // Calculate average duration for completed records (capped at 90 minutes)
    const completedRecords = records.filter(record => {
      if (!record.timein || !record.timeout) return false;
      const duration = calculateDurationMinutes(record.timeout, record.timein);
      return duration <= 90; // Ignore trips longer than 1.5 hours - likely incomplete
    });
    
    const averageDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, record) => {
          const duration = calculateDurationMinutes(record.timeout, record.timein);
          return sum + duration;
        }, 0) / completedRecords.length
      : 0;

    const averageDurationFormatted = formatDurationHMS(Math.round(averageDuration));

    // Calculate weekly metrics
    const validWeekRecords = weekRecords.filter(record => {
      if (!record.timein || !record.timeout) return false;
      const duration = calculateDurationMinutes(record.timeout, record.timein);
      return duration <= 90; // Cap at 90 minutes
    });

    // Calculate number of school days this week (Monday to Friday, up to today)
    const now = new Date();
    const chicagoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const startOfWeekLocal = new Date(startOfWeek.getTime() - (6 * 60 * 60 * 1000)); // Convert back to local
    
    let schoolDays = 0;
    const currentDate = new Date(startOfWeekLocal);
    
    while (currentDate <= chicagoNow) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        schoolDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const averageTripsPerDay = schoolDays > 0 ? Math.round((weekRecords.length / schoolDays) * 10) / 10 : 0;
    
    const weeklyAverageDuration = validWeekRecords.length > 0 
      ? validWeekRecords.reduce((sum, record) => {
          const duration = calculateDurationMinutes(record.timeout, record.timein);
          return sum + duration;
        }, 0) / validWeekRecords.length
      : 0;

    const weeklyAverageDurationFormatted = formatDurationHMS(Math.round(weeklyAverageDuration));

    // Most common destination
    const destinationCount: { [key: string]: number } = {};
    todayRecords.forEach(record => {
      if (record.destination) {
        destinationCount[record.destination] = (destinationCount[record.destination] || 0) + 1;
      }
    });
    
    const mostCommonDestination = Object.entries(destinationCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    // Period with longest average duration this week
    const periodDurations: { [key: string]: number[] } = {};

    validWeekRecords.forEach(record => {
      if (record.period) {
        if (!periodDurations[record.period]) {
          periodDurations[record.period] = [];
        }
        periodDurations[record.period].push(calculateDurationMinutes(record.timeout, record.timein));
      }
    });

    let periodWithLongestAverage = { period: '', averageDuration: 0, averageDurationFormatted: '00:00:00' };
    Object.entries(periodDurations).forEach(([period, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg > periodWithLongestAverage.averageDuration) {
        periodWithLongestAverage = { 
          period, 
          averageDuration: Math.round(avg),
          averageDurationFormatted: formatDurationHMS(Math.round(avg))
        };
      }
    });

    // NEW ANALYTICS

    // 1. Top Students This Week (Frequent Flyers)
    const detailedWeekFrequency: { [key: string]: { count: number, totalDuration: number, completedTrips: number } } = {};
    
    weekRecords.forEach(record => {
      if (record.student_name) {
        if (!detailedWeekFrequency[record.student_name]) {
          detailedWeekFrequency[record.student_name] = { count: 0, totalDuration: 0, completedTrips: 0 };
        }
        detailedWeekFrequency[record.student_name].count++;
        
        if (record.timein && record.timeout) {
          const duration = calculateDurationMinutes(record.timeout, record.timein);
          if (duration <= 90) {
            detailedWeekFrequency[record.student_name].totalDuration += duration;
            detailedWeekFrequency[record.student_name].completedTrips++;
          }
        }
      }
    });

    const topStudentsThisWeek = Object.entries(detailedWeekFrequency)
      .map(([name, data]) => ({
        name,
        count: data.count,
        averageDuration: data.completedTrips > 0 ? Math.round(data.totalDuration / data.completedTrips) : 0,
        averageDurationFormatted: data.completedTrips > 0 ? formatDurationHMS(Math.round(data.totalDuration / data.completedTrips)) : '00:00:00'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Longest Trip This Week
    let longestTripThisWeek = { student: '', duration: 0, durationFormatted: '00:00:00', dayOfWeek: '' };
    if (validWeekRecords.length > 0) {
      const longest = validWeekRecords
        .map(record => {
          const duration = calculateDurationMinutes(record.timeout, record.timein);
          return {
            student: record.student_name || '',
            duration,
            durationFormatted: formatDurationHMS(duration),
            dayOfWeek: record.dayOfWeek || new Date(record.timeout).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' })
          };
        })
        .sort((a, b) => b.duration - a.duration)[0];
      
      longestTripThisWeek = longest;
    }

    // 3. Quietest Periods
    const periodTripsThisWeek: { [key: string]: number } = {};
    weekRecords.forEach(record => {
      if (record.period) {
        periodTripsThisWeek[record.period] = (periodTripsThisWeek[record.period] || 0) + 1;
      }
    });

    const quietestPeriods = Object.entries(periodTripsThisWeek)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 2);

    // 4. Weekly Stats
    const uniqueStudentsThisWeek = new Set(weekRecords.map(r => r.student_name).filter(Boolean));
    const allUniqueStudents = new Set(records.map(r => r.student_name).filter(Boolean));
    const studentsWhoNeverLeft = allUniqueStudents.size - uniqueStudentsThisWeek.size;

    const weeklyStats = {
      totalTrips: weekRecords.length,
      averageTripsPerStudent: uniqueStudentsThisWeek.size > 0 ? Math.round((weekRecords.length / uniqueStudentsThisWeek.size) * 10) / 10 : 0,
      studentsWhoNeverLeft
    };

    // 5. Unreturned Passes
    const unreturnedPasses = records
      .filter(record => !record.timein && !record.earlyDismissal)
      .map(record => ({
        studentName: record.student_name || '',
        period: record.period || '',
        timeOut: new Date(record.timeout),
        destination: record.destination || ''
      }))
      .sort((a, b) => b.timeOut.getTime() - a.timeOut.getTime());

    // 6. Destination Distribution
    const destinationCounts: { [key: string]: number } = {};
    weekRecords.forEach(record => {
      if (record.destination) {
        destinationCounts[record.destination] = (destinationCounts[record.destination] || 0) + 1;
      }
    });

    const totalDestinationTrips = Object.values(destinationCounts).reduce((sum, count) => sum + count, 0);
    const destinationDistribution = Object.entries(destinationCounts)
      .map(([destination, count]) => ({
        destination,
        count,
        percentage: totalDestinationTrips > 0 ? Math.round((count / totalDestinationTrips) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 7. Weekly Trend Data (simple version - just this week by day)
    const weeklyTrendData: { day: string, trips: number }[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    daysOfWeek.forEach(day => {
      const dayRecords = weekRecords.filter(record => {
        const recordDay = new Date(record.timeout).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });
        return recordDay === day;
      });
      weeklyTrendData.push({ day, trips: dayRecords.length });
    });

    return {
      totalTripsToday: todayRecords.length,
      mostFrequentToday,
      mostFrequentWeek,
      longestTripToday,
      tripsPerPeriod,
      averageDuration: Math.round(averageDuration * 10) / 10,
      averageDurationFormatted,
      topLongestTripsToday,
      mostCommonDestination,
      periodWithLongestAverage,
      averageTripsPerDay,
      weeklyAverageDuration: Math.round(weeklyAverageDuration * 10) / 10,
      weeklyAverageDurationFormatted,
      topStudentsThisWeek,
      longestTripThisWeek,
      quietestPeriods,
      weeklyStats,
      unreturnedPasses,
      destinationDistribution,
      weeklyTrendData
    };
  } catch (error) {
    console.error("Error calculating analytics:", error);
    return {
      totalTripsToday: 0,
      mostFrequentToday: [],
      mostFrequentWeek: [],
      longestTripToday: { duration: 0, student: '', durationFormatted: '00:00:00' },
      tripsPerPeriod: {},
      averageDuration: 0,
      averageDurationFormatted: '00:00:00',
      topLongestTripsToday: [],
      mostCommonDestination: '',
      periodWithLongestAverage: { period: '', averageDuration: 0, averageDurationFormatted: '00:00:00' },
      averageTripsPerDay: 0,
      weeklyAverageDuration: 0,
      weeklyAverageDurationFormatted: '00:00:00',
      topStudentsThisWeek: [],
      longestTripThisWeek: { student: '', duration: 0, durationFormatted: '00:00:00', dayOfWeek: '' },
      quietestPeriods: [],
      weeklyStats: { totalTrips: 0, averageTripsPerStudent: 0, studentsWhoNeverLeft: 0 },
      unreturnedPasses: [],
      destinationDistribution: [],
      weeklyTrendData: []
    };
  }
};