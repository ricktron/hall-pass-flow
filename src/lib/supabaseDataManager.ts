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

export const addArrivalRecord = async (data: {
  studentName: string;
  period: string;
  arrivalReason: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('classroom_arrivals')
      .insert({
        student_name: data.studentName,
        period: data.period,
        arrival_reason: data.arrivalReason,
        time_in: new Date().toISOString()
      });

    if (error) {
      console.error("Error adding arrival record:", error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error adding arrival record:", error);
    throw error;
  }
};

export const addHallPassRecord = async (record: Omit<HallPassRecord, 'id'>): Promise<boolean> => {
  try {
    // First, check if the student already has an open trip
    const { data: existingRecords, error: checkError } = await (supabase as any)
      .from('Hall_Passes_api')
      .select('id, studentName')
      .eq('studentName', record.studentName)
      .filter('timeIn', 'is', null);

    if (checkError) {
      console.error("Error checking existing records:", checkError);
      throw checkError;
    }

    // If there's an existing open trip, close it first
    if (existingRecords && existingRecords.length > 0) {
      const openRecord = existingRecords[0];

      const { error: updateError } = await (supabase as any)
        .from('bathroom_passes')
        .update({ timein: new Date().toISOString() })
        .eq('id', openRecord.id);

      if (updateError) {
        console.error("Error closing existing record:", updateError);
        throw updateError;
      }
    }

    // Now create the new record
    const { error } = await (supabase as any)
      .from('bathroom_passes')
      .insert({
        student_name: record.studentName,
        period: record.period,
        destination: record.destination,
        timeout: new Date().toISOString()
      });

    if (error) {
      console.error("Error adding hall pass record:", error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error adding hall pass record:", error);
    throw error;
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
    // Find the most recent record for this student where timeIn is null using Hall_Passes_api
    const { data: records, error: fetchError } = await (supabase as any)
      .from('Hall_Passes_api')
      .select('id, studentName, period')
      .eq('studentName', studentName)
      .eq('period', period)
      .filter('timeIn', 'is', null)
      .order('timeOut', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error finding hall pass record:", fetchError);
      throw fetchError;
    }

    if (!records || records.length === 0) {
      console.error("No active hall pass record found");
      return false;
    }

    const record = records[0];

    const { error } = await (supabase as any)
      .from('bathroom_passes')
      .update({ timein: new Date().toISOString() })
      .eq('id', record.id);

    if (error) {
      console.error("Error updating hall pass record:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error updating return time:", error);
    throw error;
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
    const { data, error } = await (supabase as any)
      .from('Hall_Passes_api')
      .select('id, studentName, period, destination, timeOut, timeIn, duration, needsReview')
      .filter('timeIn', 'is', null)
      .order('timeOut', { ascending: false });

    if (error) {
      console.error("Error fetching currently out records:", error);
      throw error;
    }

    return (data || []).map((record: any) => ({
      id: record.id,
      studentName: record.studentName || '',
      period: record.period || '',
      timeOut: new Date(record.timeOut),
      timeIn: null,
      duration: null,
      dayOfWeek: '',
      destination: record.destination || '',
      earlyDismissal: false,
      classroom: ''
    }));
  } catch (error) {
    console.error("Error fetching currently out records:", error);
    throw error;
  }
};

export const getStudentNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('Hall_Passes')
      .select('studentName')
      .order('studentName');

    if (error) {
      console.error("Error fetching student names:", error);
      return [];
    }

    // Get unique student names
    const uniqueNames = [...new Set((data || []).map((record: any) => record.studentName).filter(Boolean))] as string[];
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
