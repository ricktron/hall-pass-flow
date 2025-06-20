
export interface BathroomRecord {
  id: string;
  studentName: string;
  period: string;
  timeOut: Date;
  timeIn: Date | null;
}

export interface Analytics {
  totalTripsToday: number;
  mostFrequentToday: { name: string; count: number }[];
  mostFrequentWeek: { name: string; count: number }[];
  longestTripToday: {
    duration: number; // in minutes
    student: string;
  };
  tripsPerPeriod: { [period: string]: number };
  averageDuration: number; // in minutes
}
