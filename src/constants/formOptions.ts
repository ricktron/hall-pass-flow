
export const PERIODS = ["A", "B", "C", "D", "E", "F", "G", "H", "House Small Group"];

export const PERIOD_OPTIONS = [
  { label: 'A Period', value: 'A' },
  { label: 'B Period', value: 'B' },
  { label: 'C Period', value: 'C' },
  { label: 'D Period', value: 'D' },
  { label: 'E Period', value: 'E' },
  { label: 'F Period', value: 'F' },
  { label: 'G Period', value: 'G' },
  { label: 'H Period', value: 'H' },
  { label: 'House Small Group', value: 'House Small Group' },
];

export const DESTINATION_OPTIONS = [
  { label: "Bathroom", value: "Bathroom" },
  { label: "Locker", value: "Locker" },
  { label: "Counselor", value: "Counselor" },
  { label: "Dean of Students", value: "Dean of Students" },
  { label: "Dean of Academics", value: "Dean of Academics" },
  { label: "Nurse", value: "Nurse" },
  { label: "Testing Center", value: "testing_center" },
  { label: "Football Meeting", value: "Football Meeting" },
  { label: "Early Dismissal", value: "Early Dismissal" },
  { label: "Other", value: "Other" },
];

// Keep DESTINATIONS for backward compatibility
export const DESTINATIONS = DESTINATION_OPTIONS.map(d => d.value);

export const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];
