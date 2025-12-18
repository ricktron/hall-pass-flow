import { supabase } from "@/integrations/supabase/client";
import { calculateDurationMinutes, getLocalTodayBounds, getLocalWeekStart, formatDurationHMS } from "@/lib/timeUtils";

/**
 * Record shape for inserting a new hall pass.
 * studentId is REQUIRED - the DB FK constraint will reject nulls.
 */
export interface NewPassInsertRecord {
  /** UUID of the student from users table (FK to bathroom_passes.student_id) - REQUIRED */
  studentId: string;
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

/**
 * Record shape for reading/displaying hall passes.
 * studentId may be absent for legacy records or view queries.
 */
export interface HallPassRecord {
  id: string;
  /** UUID of the student from users table (FK to bathroom_passes.student_id) */
  studentId?: string;
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

export const addHallPassRecord = async (record: NewPassInsertRecord): Promise<boolean> => {
  try {
    // studentId is now required by the type - this is a compile-time guarantee.
    // Runtime check kept for defense-in-depth against JS callers or type bypasses.
    if (!record.studentId) {
      throw new Error('Student ID is required. Please select your name from the student list.');
    }

    // First, check if the student already has an active pass (by student_id for accuracy)
    const { data: existingRecords, error: checkError } = await (supabase as any)
      .from('bathroom_passes')
      .select('id, student_name')
      .eq('student_id', record.studentId)
      .is('timein', null);

    if (checkError) {
      console.error("Error checking existing records:", checkError);
      throw checkError;
    }

    // If there's an existing active pass, block the new submission
    if (existingRecords && existingRecords.length > 0) {
      throw new Error('You already have an active pass');
    }

    // Build the insert payload with required student_id
    const insertPayload: Record<string, unknown> = {
      student_id: record.studentId,
      student_name: record.studentName,
      period: record.period,
      destination: record.destination,
      timeout: new Date().toISOString()
    };

    // Include classroom if provided
    if (record.classroom) {
      insertPayload.classroom = record.classroom;
    }

    // Now create the new record
    const { error } = await (supabase as any)
      .from('bathroom_passes')
      .insert(insertPayload);

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
