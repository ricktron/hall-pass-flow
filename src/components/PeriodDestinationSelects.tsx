import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PERIOD_OPTIONS } from "@/constants/formOptions";
import { fetchDestinations, type Destination } from "@/lib/destinationsRepository";

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
  const [destinations, setDestinations] = useState<Destination[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchDestinations().then((data) => {
      if (!cancelled) {
        setDestinations(data);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="period">Class Period</Label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger id="period-select" onKeyDown={(e) => onKeyDown?.(e, 'destination-select')}>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
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
            {destinations.map((destination) => (
              <SelectItem key={destination.value} value={destination.value}>
                {destination.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default PeriodDestinationSelects;
