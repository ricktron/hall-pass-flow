
export interface BathroomRecord {
  id: string;
  firstName: string;
  lastName: string;
  period: string;
  destination: string;
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
