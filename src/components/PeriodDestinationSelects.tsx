
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PERIODS, DESTINATIONS } from "@/constants/formOptions";

interface PeriodDestinationSelectsProps {
  selectedPeriod: string;
  selectedDestination: string;
  onPeriodChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, nextFieldId?: string) => void;
}

const PeriodDestinationSelects = ({
  selectedPeriod,
  selectedDestination,
  onPeriodChange,
  onDestinationChange,
  onKeyDown
}: PeriodDestinationSelectsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="period">Class Period</Label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger id="period-select" onKeyDown={(e) => onKeyDown?.(e, 'destination-select')}>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((period) => (
              <SelectItem key={period} value={period}>
                Period {period}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="destination">Destination</Label>
        <Select value={selectedDestination} onValueChange={onDestinationChange}>
          <SelectTrigger id="destination-select" onKeyDown={(e) => onKeyDown?.(e, 'signOutButton')}>
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            {DESTINATIONS.map((destination) => (
              <SelectItem key={destination} value={destination}>
                {destination}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default PeriodDestinationSelects;
